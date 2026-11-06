"""
MeetingMind pipeline benchmark (measurement only - no production code is touched).

Measures, for real recordings:
  * upload time (HTTP multipart upload to the running backend, loopback)
  * FFmpeg audio extraction
  * Whisper Base transcription
  * FLAN-T5 Base summarisation (+ rule-based MoM)
  * end-to-end processing time reported by the live API

Usage (backend must be running on 127.0.0.1:8001, MongoDB running):
    .\\venv\\Scripts\\python.exe benchmark_pipeline.py file1.mp4 [file2.wav ...]

A temporary user is registered for the run; that user and its meetings are removed
afterwards. No other database records are touched.
"""

import json
import subprocess
import sys
import time
from pathlib import Path

import requests

import database
from services.summarization import generate_mom, generate_summary
from services.transcription import transcribe_audio_with_segments

BASE = "http://127.0.0.1:8001"
EMAIL = "bench_tmp_user@meetingmind.local"
PASSWORD = "Password123"


def stage_timings(path: Path) -> dict:
    out = {}
    audio = path
    if path.suffix.lower() != ".wav":
        audio = path.with_name(path.stem + "_bench_audio.wav")
        t = time.perf_counter()
        subprocess.run(
            ["ffmpeg", "-y", "-i", str(path), "-vn", "-ac", "1", "-ar", "16000",
             "-c:a", "pcm_s16le", str(audio)],
            check=True, capture_output=True,
        )
        out["ffmpeg_s"] = round(time.perf_counter() - t, 2)
    else:
        out["ffmpeg_s"] = 0.0
    dur = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(audio)],
        capture_output=True, text=True,
    ).stdout.strip()
    out["audio_duration_s"] = round(float(dur), 1) if dur else None
    t = time.perf_counter()
    transcript, _ = transcribe_audio_with_segments(str(audio))
    out["whisper_s"] = round(time.perf_counter() - t, 2)
    t = time.perf_counter()
    generate_summary(transcript)
    out["flan_t5_summary_s"] = round(time.perf_counter() - t, 2)
    t = time.perf_counter()
    generate_mom(transcript)
    out["mom_rules_s"] = round(time.perf_counter() - t, 2)
    out["transcript_words"] = len(transcript.split())
    if audio != path:
        audio.unlink(missing_ok=True)
    return out


def api_run(path: Path, headers: dict) -> dict:
    size_mb = round(path.stat().st_size / 1_048_576, 2)
    t = time.perf_counter()
    with open(path, "rb") as fh:
        r = requests.post(
            f"{BASE}/api/upload?background=true",
            files={"file": (path.name, fh)},
            headers=headers,
            timeout=300,
        )
    upload_s = round(time.perf_counter() - t, 2)
    r.raise_for_status()
    mid = r.json().get("meeting_id") or r.json().get("id")
    t = time.perf_counter()
    status = None
    while time.perf_counter() - t < 900:
        m = requests.get(f"{BASE}/api/meetings/{mid}", headers=headers, timeout=30).json()
        status = m.get("status")
        if status in ("processed", "failed"):
            break
        time.sleep(1)
    return {
        "file": path.name,
        "size_mb": size_mb,
        "upload_http_s": upload_s,
        "wait_for_processing_s": round(time.perf_counter() - t, 2),
        "final_status": status,
        "processing_time_seconds_reported": m.get("processing_time_seconds"),
    }


def main(files):
    requests.post(f"{BASE}/api/auth/register",
                  json={"email": EMAIL, "password": PASSWORD, "name": "Bench Temp"})
    tok = requests.post(f"{BASE}/api/auth/login",
                        json={"email": EMAIL, "password": PASSWORD}).json()["access_token"]
    headers = {"Authorization": f"Bearer {tok}"}
    results = []
    try:
        for f in files:
            p = Path(f)
            print(f"== {p.name}", flush=True)
            row = {"api": api_run(p, headers), "stages": stage_timings(p)}
            print(json.dumps(row, indent=2), flush=True)
            results.append(row)
    finally:
        u = database.users_collection.find_one({"email": EMAIL})
        if u:
            database.meetings_collection.delete_many({"user_id": str(u["_id"])})
            database.users_collection.delete_one({"_id": u["_id"]})
    Path("benchmark_results.json").write_text(json.dumps(results, indent=2))


if __name__ == "__main__":
    main(sys.argv[1:])
