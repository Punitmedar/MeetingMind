"""
Speech-to-text transcription service using OpenAI Whisper Base.
Loaded once at startup and reused across requests.
Returns both full deduplicated transcript text and timestamped segments.
"""

import os
import re
import torch
import whisper

# Use GPU if CUDA is available, otherwise optimize CPU thread count
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
if DEVICE == "cpu":
    cpu_cores = os.cpu_count() or 4
    torch.set_num_threads(max(2, min(cpu_cores, 8)))

model = whisper.load_model("base", device=DEVICE)


def _format_timestamp(seconds: float) -> str:
    """Format seconds as MM:SS or HH:MM:SS."""
    total_secs = max(0, int(round(seconds)))
    hrs = total_secs // 3600
    mins = (total_secs % 3600) // 60
    secs = total_secs % 60
    if hrs > 0:
        return f"{hrs:02d}:{mins:02d}:{secs:02d}"
    return f"{mins:02d}:{secs:02d}"


def _deduplicate_repetitions(text: str) -> str:
    """Remove consecutive duplicate sentences or phrases caused by silence/noise."""
    if not text:
        return ""
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    cleaned: list[str] = []
    prev_norm = ""
    for s in sentences:
        s_clean = s.strip()
        if not s_clean:
            continue
        norm = " ".join(s_clean.lower().split())
        if norm == prev_norm:
            continue
        prev_norm = norm
        cleaned.append(s_clean)
    return " ".join(cleaned).strip()


def transcribe_audio_with_segments(audio_path: str) -> tuple[str, list[dict]]:
    """Transcribe meeting audio using OpenAI Whisper Base and return
    (deduplicated_text, timestamped_segments).
    """
    with torch.inference_mode():
        result = model.transcribe(
            audio_path,
            language="en",
            fp16=(DEVICE == "cuda"),
            condition_on_previous_text=False,
            temperature=0.0,
            compression_ratio_threshold=2.4,
            no_speech_threshold=0.6,
        )

    raw_text = (result.get("text") or "").strip()
    cleaned_text = _deduplicate_repetitions(raw_text)

    raw_segments = result.get("segments") or []
    segments: list[dict] = []
    prev_norm = ""

    for seg in raw_segments:
        seg_text = (seg.get("text") or "").strip()
        if not seg_text:
            continue
        norm = " ".join(seg_text.lower().split())
        if norm == prev_norm:
            continue
        prev_norm = norm

        start_sec = round(float(seg.get("start") or 0.0), 2)
        end_sec = round(float(seg.get("end") or start_sec), 2)
        seg_idx = len(segments) + 1

        segments.append({
            "index": seg_idx,
            "start": start_sec,
            "end": end_sec,
            "timestamp": f"{_format_timestamp(start_sec)} - {_format_timestamp(end_sec)}",
            "speaker": f"Segment {seg_idx}",
            "text": seg_text,
        })

    return cleaned_text, segments


def transcribe_audio(audio_path: str) -> str:
    """Backwards-compatible wrapper returning the full transcript string."""
    text, _ = transcribe_audio_with_segments(audio_path)
    return text
