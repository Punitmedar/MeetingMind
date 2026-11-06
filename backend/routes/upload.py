"""
File upload and retry routes: receives an audio/video file, extracts audio via FFmpeg,
runs Whisper transcription with timestamped segments, and generates a grounded summary
and Minutes of Meeting using FLAN-T5 Base.
Supports both synchronous and background processing, plus in-place safe retry without
creating duplicate MongoDB records.
"""

import asyncio
import logging
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from bson import ObjectId
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile

import config
from database import meetings_collection
from dependencies import get_current_user
from rate_limit import check_rate_limit
from services.transcription import transcribe_audio_with_segments
from services.summarization import generate_summary, generate_mom

logger = logging.getLogger(__name__)

router = APIRouter()

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {
    ".mp3", ".mp4", ".wav", ".m4a", ".aac", ".webm",
    ".ogg", ".flac", ".avi", ".mov", ".mkv",
}

# Thread pool for CPU/GPU-bound ML and FFmpeg work
executor = ThreadPoolExecutor(max_workers=2)


def _sanitize_filename(original: str) -> str:
    """Return a collision-safe, path-traversal-free filename."""
    p = Path(original or "recording.wav")
    stem = p.stem
    suffix = p.suffix.lower()

    stem = stem.replace("/", "").replace("\\", "").replace("..", "")
    stem = "".join(ch for ch in stem if ch.isalnum() or ch in (" ", "-", "_", ".")).strip()
    stem = (stem or "recording")[:80]

    return f"{uuid4().hex}_{stem}{suffix}"


def _update_stage(meeting_oid: ObjectId, stage: str, **extra_fields) -> None:
    """Update processing stage and any extra fields on the meeting document."""
    meetings_collection.update_one(
        {"_id": meeting_oid},
        {"$set": {"processing_stage": stage, **extra_fields}},
    )


def _run_pipeline_sync(
    meeting_oid: ObjectId,
    file_path: Path,
    suffix: str,
    start_total_time: float,
    cleanup_on_failure: bool = False,
) -> dict:
    """Execute FFmpeg extraction, Whisper transcription, and FLAN-T5 summarization."""
    audio_path = file_path
    try:
        # 1. Audio extraction (skip conversion if already .wav)
        _update_stage(
            meeting_oid,
            "Extracting audio with FFmpeg",
            status="processing",
            error_message=None,
        )
        audio_extract_start = time.perf_counter()

        if suffix != ".wav":
            audio_path = UPLOAD_DIR / f"{file_path.stem}_audio.wav"
            try:
                subprocess.run(
                    [
                        "ffmpeg",
                        "-y",
                        "-i", str(file_path),
                        "-vn",
                        "-ac", "1",
                        "-ar", "16000",
                        "-c:a", "pcm_s16le",
                        str(audio_path),
                    ],
                    check=True,
                    capture_output=True,
                    text=True,
                )
            except subprocess.CalledProcessError as exc:
                err_msg = (
                    "Audio extraction failed. The uploaded file may be corrupted or contain no valid audio track."
                )
                _update_stage(
                    meeting_oid,
                    "Failed",
                    status="failed",
                    error_message=err_msg,
                )
                if cleanup_on_failure:
                    file_path.unlink(missing_ok=True)
                    audio_path.unlink(missing_ok=True)
                raise ValueError(err_msg) from exc

        audio_extract_duration = time.perf_counter() - audio_extract_start
        logger.info("Audio extraction completed in %.2fs", audio_extract_duration)

        # 2. Probe duration
        duration_seconds: float = 0.0
        try:
            duration_result = subprocess.run(
                [
                    "ffprobe",
                    "-v", "error",
                    "-show_entries", "format=duration",
                    "-of", "default=noprint_wrappers=1:nokey=1",
                    str(audio_path),
                ],
                check=True,
                capture_output=True,
                text=True,
            )
            duration_seconds = round(float(duration_result.stdout.strip()), 2)
        except Exception:
            duration_seconds = 0.0

        # 3. Transcribe with OpenAI Whisper Base (including timestamped segments)
        _update_stage(
            meeting_oid,
            "Transcribing speech with OpenAI Whisper",
            audio_path=str(audio_path),
            duration_seconds=duration_seconds,
        )
        t_start = time.perf_counter()
        transcript, transcript_segments = transcribe_audio_with_segments(str(audio_path))
        transcribe_duration = time.perf_counter() - t_start
        logger.info("Transcription completed in %.2fs", transcribe_duration)

        if not transcript or not transcript.strip():
            transcript = "No audible speech was detected in this recording."
            transcript_segments = []

        # 4. Generate Grounded Summary & Minutes of Meeting with FLAN-T5 Base
        _update_stage(
            meeting_oid,
            "Generating summary & Minutes of Meeting with FLAN-T5",
            transcript=transcript,
            transcript_segments=transcript_segments,
        )
        s_start = time.perf_counter()
        summary = generate_summary(transcript)
        mom = generate_mom(transcript)
        summarize_duration = time.perf_counter() - s_start
        logger.info("Summarization and MoM completed in %.2fs", summarize_duration)

        total_processing_time = round(time.perf_counter() - start_total_time, 2)

        # 5. Mark processed in MongoDB
        meetings_collection.update_one(
            {"_id": meeting_oid},
            {
                "$set": {
                    "audio_path": str(audio_path),
                    "duration_seconds": duration_seconds,
                    "processing_time_seconds": total_processing_time,
                    "transcript": transcript,
                    "transcript_segments": transcript_segments,
                    "summary": summary,
                    "mom": mom,
                    "status": "processed",
                    "processing_stage": "Completed",
                    "error_message": None,
                }
            },
        )

        return {
            "audio_path": str(audio_path),
            "duration_seconds": duration_seconds,
            "processing_time_seconds": total_processing_time,
            "status": "processed",
        }

    except ValueError:
        raise
    except Exception as exc:
        logger.exception("Processing pipeline error for meeting %s", meeting_oid)
        err_msg = f"Processing failed during AI analysis: {exc}"
        _update_stage(
            meeting_oid,
            "Failed",
            status="failed",
            error_message=err_msg,
        )
        raise RuntimeError(err_msg) from exc


@router.post("/upload")
async def upload_meeting(
    file: UploadFile = File(...),
    background: bool = Query(False, description="Run AI pipeline asynchronously and poll status"),
    user: dict = Depends(get_current_user),
):
    check_rate_limit(f"upload:{user['_id']}", max_attempts=10, window_seconds=300.0)

    start_total_time = time.perf_counter()
    original_filename = file.filename or "recording.wav"
    logger.info("Upload started for user %s: file=%s", user["_id"], original_filename)

    # 1. Validate extension
    suffix = Path(original_filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file format '{suffix}'. Supported: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # 2. Save uploaded file with size validation
    safe_name = _sanitize_filename(original_filename)
    file_path = UPLOAD_DIR / safe_name

    total_bytes = 0
    chunk_size = 1024 * 1024  # 1 MB

    try:
        with file_path.open("wb") as buffer:
            while True:
                chunk = await file.read(chunk_size)
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > config.MAX_UPLOAD_BYTES:
                    buffer.close()
                    file_path.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=413,
                        detail="File exceeds the maximum allowed size of 500 MB.",
                    )
                buffer.write(chunk)
    except HTTPException:
        raise
    except Exception as exc:
        file_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {exc}") from exc

    if total_bytes == 0:
        file_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    # 3. Create initial MongoDB document in 'processing' status
    meeting_document = {
        "user_id": str(user["_id"]),
        "filename": original_filename,
        "saved_path": str(file_path),
        "audio_path": str(file_path) if suffix == ".wav" else None,
        "duration_seconds": 0.0,
        "processing_time_seconds": 0.0,
        "transcript": "",
        "transcript_segments": [],
        "summary": "",
        "mom": "",
        "action_item_status_map": {},
        "status": "processing",
        "processing_stage": "Extracting audio with FFmpeg",
        "error_message": None,
        "created_at": datetime.now(timezone.utc),
    }

    insert_res = meetings_collection.insert_one(meeting_document)
    meeting_oid = insert_res.inserted_id
    meeting_id = str(meeting_oid)

    loop = asyncio.get_running_loop()

    # 4a. If background mode requested by UI, schedule on thread pool and return immediately
    if background:
        loop.run_in_executor(
            executor,
            _run_pipeline_sync,
            meeting_oid,
            file_path,
            suffix,
            start_total_time,
        )
        return {
            "message": "File uploaded. Processing started.",
            "meeting_id": meeting_id,
            "filename": original_filename,
            "saved_path": str(file_path),
            "status": "processing",
            "processing_stage": "Extracting audio with FFmpeg",
        }

    # 4b. Default synchronous execution (awaits full completion in thread pool)
    try:
        result_meta = await loop.run_in_executor(
            executor,
            _run_pipeline_sync,
            meeting_oid,
            file_path,
            suffix,
            start_total_time,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Processing failed. Transcription or summarization encountered an error.",
        ) from exc

    return {
        "message": "Meeting processed successfully.",
        "meeting_id": meeting_id,
        "filename": original_filename,
        "saved_path": str(file_path),
        "audio_path": result_meta["audio_path"],
        "duration_seconds": result_meta["duration_seconds"],
        "processing_time_seconds": result_meta["processing_time_seconds"],
        "status": "processed",
        "processing_stage": "Completed",
    }


@router.post("/meetings/{meeting_id}/retry")
async def retry_meeting_processing(
    meeting_id: str,
    background: bool = Query(False, description="Run retry asynchronously"),
    user: dict = Depends(get_current_user),
):
    """Safely retry AI processing on an existing meeting record in-place without
    creating duplicate database documents.
    """
    try:
        meeting_oid = ObjectId(meeting_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid meeting ID")

    flt = {"_id": meeting_oid} if user.get("role") == "admin" else {"_id": meeting_oid, "user_id": str(user["_id"])}
    meeting = meetings_collection.find_one(flt)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if meeting.get("status") == "processing":
        raise HTTPException(status_code=409, detail="This meeting is already being processed.")

    source_path_str = meeting.get("saved_path") or meeting.get("audio_path")
    if not source_path_str or not Path(source_path_str).is_file():
        raise HTTPException(
            status_code=400,
            detail="Original recording file is no longer on disk and cannot be reprocessed.",
        )

    file_path = Path(source_path_str)
    suffix = file_path.suffix.lower()
    start_total_time = time.perf_counter()
    loop = asyncio.get_running_loop()

    if background:
        _update_stage(
            meeting_oid,
            "Extracting audio with FFmpeg",
            status="processing",
            error_message=None,
        )
        loop.run_in_executor(
            executor,
            _run_pipeline_sync,
            meeting_oid,
            file_path,
            suffix,
            start_total_time,
        )
        return {
            "message": "Meeting reprocessing started.",
            "meeting_id": meeting_id,
            "status": "processing",
            "processing_stage": "Extracting audio with FFmpeg",
        }

    try:
        result_meta = await loop.run_in_executor(
            executor,
            _run_pipeline_sync,
            meeting_oid,
            file_path,
            suffix,
            start_total_time,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Retry processing failed: {exc}",
        ) from exc

    return {
        "message": "Meeting reprocessed successfully.",
        "meeting_id": meeting_id,
        "duration_seconds": result_meta["duration_seconds"],
        "processing_time_seconds": result_meta["processing_time_seconds"],
        "status": "processed",
        "processing_stage": "Completed",
    }
