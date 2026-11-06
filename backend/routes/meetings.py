"""
Meeting routes: list, get, update (rename/edit notes), audio stream, delete,
dashboard stats, action items, analytics.

All endpoints require authentication. User endpoints are strictly scoped to the
authenticated user's own meetings.
"""

import re
from datetime import datetime
from pathlib import Path
from typing import Literal

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel

from database import meetings_collection
from dependencies import get_current_user, get_current_user_optional_query

router = APIRouter()


class ActionItemUpdateRequest(BaseModel):
    task: str
    status: Literal["Completed", "Pending"]


class MeetingUpdateRequest(BaseModel):
    filename: str | None = None
    summary: str | None = None
    mom: str | None = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _user_filter(user: dict) -> dict:
    """Return a MongoDB filter strictly scoped to the authenticated user's ID."""
    return {"user_id": str(user["_id"])}


def _access_filter(user: dict, object_id: ObjectId) -> dict:
    """Return filter for a specific meeting. Owners can access their own meetings;
    admins can inspect any meeting for administrative oversight.
    """
    if user.get("role") == "admin":
        return {"_id": object_id}
    return {"_id": object_id, "user_id": str(user["_id"])}


def _format_ts(seconds: float) -> str:
    total_secs = max(0, int(round(seconds)))
    hrs = total_secs // 3600
    mins = (total_secs % 3600) // 60
    secs = total_secs % 60
    if hrs > 0:
        return f"{hrs:02d}:{mins:02d}:{secs:02d}"
    return f"{mins:02d}:{secs:02d}"


def _build_fallback_segments(transcript: str, duration_seconds: float) -> list[dict]:
    """Generate estimated timestamped segments for older meetings that were stored
    before segment-level metadata was persisted.
    """
    if not transcript or not transcript.strip():
        return []
    sentences = [
        s.strip()
        for s in re.split(r"(?<=[.!?])\s+", transcript.strip())
        if s.strip()
    ]
    if not sentences:
        return []

    total_words = max(1, sum(len(s.split()) for s in sentences))
    total_dur = float(duration_seconds) if duration_seconds and duration_seconds > 0 else total_words * 0.42
    cursor_sec = 0.0
    segments: list[dict] = []

    for idx, sent in enumerate(sentences):
        w_count = max(1, len(sent.split()))
        seg_dur = max(1.5, (w_count / total_words) * total_dur)
        start_s = round(cursor_sec, 2)
        end_s = round(min(total_dur, cursor_sec + seg_dur), 2)
        cursor_sec = end_s
        segments.append({
            "index": idx + 1,
            "start": start_s,
            "end": end_s,
            "timestamp": f"{_format_ts(start_s)} - {_format_ts(end_s)}",
            "speaker": f"Segment {idx + 1}",
            "text": sent,
        })

    return segments


def parse_mom_sections(mom_text: str) -> dict[str, list[str]]:
    """Parse structured Minutes of Meeting text into clean section arrays."""
    sections: dict[str, list[str]] = {
        "discussion": [],
        "decisions": [],
        "actions": [],
        "deadlines": [],
    }
    if not isinstance(mom_text, str) or not mom_text.strip():
        return sections

    current = ""
    invalid_markers = {"none identified.", "none identified", "not mentioned", "not mentioned."}

    for raw_line in mom_text.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        lower = line.lower().rstrip(":")
        if lower == "discussion":
            current = "discussion"
            continue
        if lower == "decisions":
            current = "decisions"
            continue
        if lower == "action items":
            current = "actions"
            continue
        if lower == "deadlines":
            current = "deadlines"
            continue

        if line.startswith("-") and current in sections:
            item = line.lstrip("-").strip()
            if item and item.lower() not in invalid_markers:
                sections[current].append(item)

    return sections


def _infer_owner_and_deadline(task_text: str, deadlines: list[str]) -> tuple[str, str]:
    """Extract responsible person and deadline ONLY when explicitly stated in the task."""
    lower = task_text.lower().strip()
    owner = "Not specified"

    # Check explicit named subject before an obligation modal (e.g. "Maya will...", "Alex must...")
    named_match = re.match(
        r"^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:will|must|should|needs\s+to|has\s+to|is\s+going\s+to|is\s+responsible\s+for)\b",
        task_text.strip(),
    )
    excluded_subjects = {
        "We", "They", "He", "She", "It", "You", "This", "That", "There",
        "Everyone", "Participants", "Someone", "All", "Each",
    }
    if named_match and named_match.group(1) not in excluded_subjects:
        owner = named_match.group(1)
    elif lower.startswith(("i will ", "i'll ", "i am going to ", "i need to ")):
        owner = "Speaker (Self)"
    elif "moderator" in lower:
        owner = "Moderator"
    elif "project manager" in lower:
        owner = "Project Manager"
    elif "design lead" in lower or "design team" in lower:
        owner = "Design Team"
    elif "engineering team" in lower or "devops" in lower:
        owner = "Engineering Team"

    deadline_match = re.search(
        r"\b((?:by|before|until|on)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today|tonight|end\s+of\s+(?:day|week|month)|next\s+\w+|\w+\s+\d{1,2}(?:st|nd|rd|th)?|\d{1,2}:\d{2}\s*(?:am|pm)?)(?:\s+at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?|tomorrow(?:\s+(?:morning|afternoon|evening))?|today(?:\s+at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?)\b",
        task_text,
        re.IGNORECASE,
    )
    if deadline_match:
        raw_dl = deadline_match.group(1).strip()
        deadline = raw_dl[0].upper() + raw_dl[1:]
    else:
        deadline = "Not specified"

    return owner, deadline


# ---------------------------------------------------------------------------
# GET /api/meetings
# ---------------------------------------------------------------------------

@router.get("/meetings")
def get_meetings(
    q: str = Query("", description="Search filename, summary, or transcript"),
    status: str = Query("", description="Filter by status: processed, processing, failed"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user: dict = Depends(get_current_user),
):
    flt: dict = _user_filter(user)

    if status and status.lower() not in ("all", ""):
        flt["status"] = status.lower()

    if q.strip():
        escaped = re.escape(q.strip())
        flt["$or"] = [
            {"filename": {"$regex": escaped, "$options": "i"}},
            {"summary": {"$regex": escaped, "$options": "i"}},
            {"transcript": {"$regex": escaped, "$options": "i"}},
        ]

    skip = (page - 1) * limit
    total = meetings_collection.count_documents(flt)

    meetings = []
    for meeting in (
        meetings_collection
        .find(flt, {"transcript": 0, "transcript_segments": 0})
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    ):
        mom_sections = parse_mom_sections(meeting.get("mom", ""))
        summary_text = meeting.get("summary", "") or ""
        summary_preview = (
            summary_text[:180] + "..." if len(summary_text) > 180 else summary_text
        )

        meetings.append({
            "id": str(meeting["_id"]),
            "filename": meeting.get("filename", "Untitled recording"),
            "duration_seconds": meeting.get("duration_seconds", 0),
            "processing_time_seconds": meeting.get("processing_time_seconds", 0),
            "status": meeting.get("status", "processed"),
            "processing_stage": meeting.get("processing_stage", "Completed"),
            "error_message": meeting.get("error_message"),
            "summary_preview": summary_preview,
            "decision_count": len(mom_sections["decisions"]),
            "action_item_count": len(mom_sections["actions"]),
            "created_at": meeting.get("created_at"),
        })

    return {
        "meetings": meetings,
        "total": total,
        "page": page,
        "limit": limit,
    }


# ---------------------------------------------------------------------------
# GET /api/meetings/{meeting_id}
# ---------------------------------------------------------------------------

@router.get("/meetings/{meeting_id}")
def get_meeting(
    meeting_id: str,
    user: dict = Depends(get_current_user),
):
    try:
        object_id = ObjectId(meeting_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid meeting ID")

    meeting = meetings_collection.find_one(_access_filter(user, object_id))
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    audio_path = meeting.get("audio_path") or meeting.get("saved_path")
    has_audio = bool(audio_path and Path(audio_path).is_file())
    mom_text = meeting.get("mom", "") or ""
    mom_sections = parse_mom_sections(mom_text)
    status_map = meeting.get("action_item_status_map", {}) or {}
    transcript = meeting.get("transcript", "") or ""
    duration_seconds = meeting.get("duration_seconds", 0) or 0

    segments = meeting.get("transcript_segments")
    if not segments and transcript and not transcript.lower().startswith("no audible speech"):
        segments = _build_fallback_segments(transcript, duration_seconds)
    elif segments:
        normalized_segments = []
        for idx, seg in enumerate(segments):
            seg_copy = dict(seg)
            spk = str(seg_copy.get("speaker") or "")
            if not spk or re.match(r"^speaker\s+\d+$", spk, re.IGNORECASE):
                seg_copy["speaker"] = f"Segment {seg_copy.get('index') or (idx + 1)}"
            normalized_segments.append(seg_copy)
        segments = normalized_segments

    return {
        "id": str(meeting["_id"]),
        "user_id": meeting.get("user_id"),
        "filename": meeting.get("filename", "Untitled recording"),
        "duration_seconds": duration_seconds,
        "processing_time_seconds": meeting.get("processing_time_seconds", 0),
        "transcript": transcript,
        "transcript_segments": segments or [],
        "summary": meeting.get("summary", ""),
        "mom": mom_text,
        "mom_sections": mom_sections,
        "action_item_status_map": status_map,
        "has_audio": has_audio,
        "audio_url": f"/api/meetings/{meeting_id}/audio" if has_audio else None,
        "status": meeting.get("status", "processed"),
        "processing_stage": meeting.get("processing_stage", "Completed"),
        "error_message": meeting.get("error_message"),
        "created_at": meeting.get("created_at"),
    }


# ---------------------------------------------------------------------------
# PATCH /api/meetings/{meeting_id} (Edit title, summary, or MoM)
# ---------------------------------------------------------------------------

@router.patch("/meetings/{meeting_id}")
def update_meeting(
    meeting_id: str,
    data: MeetingUpdateRequest,
    user: dict = Depends(get_current_user),
):
    try:
        object_id = ObjectId(meeting_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid meeting ID")

    meeting = meetings_collection.find_one(_access_filter(user, object_id))
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    updates: dict = {}
    if data.filename is not None:
        cleaned_title = data.filename.strip()
        if len(cleaned_title) < 2 or len(cleaned_title) > 160:
            raise HTTPException(status_code=422, detail="Title must be between 2 and 160 characters.")
        updates["filename"] = cleaned_title

    if data.summary is not None:
        updates["summary"] = data.summary.strip()

    if data.mom is not None:
        updates["mom"] = data.mom.strip()

    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided for update.")

    meetings_collection.update_one({"_id": object_id}, {"$set": updates})
    updated = meetings_collection.find_one({"_id": object_id})
    mom_text = (updated or {}).get("mom", "") or ""

    return {
        "message": "Meeting updated successfully.",
        "filename": (updated or {}).get("filename", ""),
        "summary": (updated or {}).get("summary", ""),
        "mom": mom_text,
        "mom_sections": parse_mom_sections(mom_text),
    }


# ---------------------------------------------------------------------------
# GET /api/meetings/{meeting_id}/audio
# ---------------------------------------------------------------------------

@router.get("/meetings/{meeting_id}/audio")
def get_meeting_audio(
    meeting_id: str,
    user: dict = Depends(get_current_user_optional_query),
):
    try:
        object_id = ObjectId(meeting_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid meeting ID")

    meeting = meetings_collection.find_one(_access_filter(user, object_id))
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    audio_path_str = meeting.get("audio_path") or meeting.get("saved_path")
    if not audio_path_str:
        raise HTTPException(status_code=404, detail="Audio file not recorded for this meeting")

    audio_file = Path(audio_path_str)
    if not audio_file.is_file():
        raise HTTPException(status_code=404, detail="Audio file not found on disk")

    suffix = audio_file.suffix.lower()
    media_types = {
        ".wav": "audio/wav",
        ".mp3": "audio/mpeg",
        ".ogg": "audio/ogg",
        ".m4a": "audio/mp4",
        ".mp4": "video/mp4",
        ".webm": "audio/webm",
        ".flac": "audio/flac",
    }
    media_type = media_types.get(suffix, "application/octet-stream")

    return FileResponse(
        path=str(audio_file),
        media_type=media_type,
        filename=f"meeting_{meeting_id}{suffix}",
    )


# ---------------------------------------------------------------------------
# DELETE /api/meetings/{meeting_id}
# ---------------------------------------------------------------------------

@router.delete("/meetings/{meeting_id}")
def delete_meeting(
    meeting_id: str,
    user: dict = Depends(get_current_user),
):
    try:
        object_id = ObjectId(meeting_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid meeting ID")

    meeting = meetings_collection.find_one(_access_filter(user, object_id))
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    for path_key in ("saved_path", "audio_path"):
        path_str = meeting.get(path_key)
        if path_str:
            try:
                Path(path_str).unlink(missing_ok=True)
            except Exception:
                pass

    meetings_collection.delete_one({"_id": object_id})
    return {"message": "Meeting deleted successfully."}


# ---------------------------------------------------------------------------
# GET /api/dashboard/stats
# ---------------------------------------------------------------------------

@router.get("/dashboard/stats")
def get_dashboard_stats(user: dict = Depends(get_current_user)):
    flt = _user_filter(user)

    total_meetings = 0
    processed_meetings = 0
    processing_meetings = 0
    failed_meetings = 0
    total_duration = 0.0
    duration_count = 0

    total_action_items = 0
    completed_action_items = 0
    pending_action_items = 0

    recent_summaries = []

    cursor = meetings_collection.find(
        flt,
        {
            "filename": 1,
            "duration_seconds": 1,
            "status": 1,
            "processing_stage": 1,
            "error_message": 1,
            "summary": 1,
            "mom": 1,
            "action_item_status_map": 1,
            "created_at": 1,
        },
    ).sort("created_at", -1)

    for m in cursor:
        total_meetings += 1
        st = (m.get("status") or "processed").lower()
        if st == "processing":
            processing_meetings += 1
        elif st == "failed":
            failed_meetings += 1
        else:
            processed_meetings += 1

        dur = m.get("duration_seconds")
        if isinstance(dur, (int, float)) and dur > 0:
            total_duration += dur
            duration_count += 1

        mom_sections = parse_mom_sections(m.get("mom", ""))
        status_map = m.get("action_item_status_map", {}) or {}

        for task in mom_sections["actions"]:
            total_action_items += 1
            if status_map.get(task, "Pending") == "Completed":
                completed_action_items += 1
            else:
                pending_action_items += 1

        if len(recent_summaries) < 5:
            recent_summaries.append({
                "id": str(m["_id"]),
                "filename": m.get("filename", "Untitled recording"),
                "status": m.get("status", "processed"),
                "processing_stage": m.get("processing_stage", "Completed"),
                "error_message": m.get("error_message"),
                "duration_seconds": m.get("duration_seconds", 0),
                "summary": m.get("summary", ""),
                "decision_count": len(mom_sections["decisions"]),
                "action_item_count": len(mom_sections["actions"]),
                "created_at": m.get("created_at"),
            })

    average_duration_seconds = (
        round(total_duration / duration_count) if duration_count else 0
    )
    completion_rate = (
        round((completed_action_items / total_action_items) * 100)
        if total_action_items
        else 0
    )

    return {
        "total_meetings": total_meetings,
        "processed_meetings": processed_meetings,
        "processing_meetings": processing_meetings,
        "failed_meetings": failed_meetings,
        "average_duration_seconds": average_duration_seconds,
        "action_items": total_action_items,
        "completed_action_items": completed_action_items,
        "pending_action_items": pending_action_items,
        "completion_rate": completion_rate,
        "recent_summaries": recent_summaries,
    }


# ---------------------------------------------------------------------------
# GET /api/action-items
# ---------------------------------------------------------------------------

@router.get("/action-items")
def get_action_items(user: dict = Depends(get_current_user)):
    flt = _user_filter(user)
    action_items = []

    for m in meetings_collection.find(
        flt, {"filename": 1, "mom": 1, "created_at": 1, "action_item_status_map": 1}
    ).sort("created_at", -1):
        mom_sections = parse_mom_sections(m.get("mom", ""))
        status_map = m.get("action_item_status_map", {}) or {}
        deadlines = mom_sections["deadlines"]

        for idx, task in enumerate(mom_sections["actions"]):
            cur_status = status_map.get(task, "Pending")
            owner, deadline = _infer_owner_and_deadline(task, deadlines)
            priority = (
                "High"
                if any(w in task.lower() for w in ("must", "urgent", "immediately", "deadline", "today"))
                else "Medium"
            )
            action_items.append({
                "id": f"{m['_id']}_{idx}",
                "task": task,
                "owner": owner,
                "deadline": deadline,
                "status": cur_status,
                "priority": priority,
                "meeting_id": str(m["_id"]),
                "meeting": m.get("filename", "Unknown meeting"),
                "created_at": m.get("created_at"),
            })

    return {"action_items": action_items, "total": len(action_items)}


# ---------------------------------------------------------------------------
# PATCH /api/action-items/{meeting_id}
# ---------------------------------------------------------------------------

@router.patch("/action-items/{meeting_id}")
def update_action_item_status(
    meeting_id: str,
    data: ActionItemUpdateRequest,
    user: dict = Depends(get_current_user),
):
    try:
        obj_id = ObjectId(meeting_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid meeting ID")

    meeting = meetings_collection.find_one(_access_filter(user, obj_id))
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    status_map = meeting.get("action_item_status_map", {}) or {}
    status_map[data.task] = data.status

    meetings_collection.update_one(
        {"_id": obj_id},
        {"$set": {"action_item_status_map": status_map}},
    )
    return {"message": "Status updated successfully", "status": data.status}


# ---------------------------------------------------------------------------
# GET /api/analytics
# ---------------------------------------------------------------------------

@router.get("/analytics")
def get_analytics(user: dict = Depends(get_current_user)):
    flt = _user_filter(user)
    meetings_by_month: dict[str, int] = {}
    actions_by_month: dict[str, int] = {}
    decisions_by_month: dict[str, int] = {}

    for m in meetings_collection.find(flt, {"created_at": 1, "mom": 1}):
        created_at = m.get("created_at")
        if not isinstance(created_at, datetime):
            continue
        month_key = created_at.strftime("%Y-%m")
        meetings_by_month[month_key] = meetings_by_month.get(month_key, 0) + 1

        mom_sections = parse_mom_sections(m.get("mom", ""))
        actions_by_month[month_key] = (
            actions_by_month.get(month_key, 0) + len(mom_sections["actions"])
        )
        decisions_by_month[month_key] = (
            decisions_by_month.get(month_key, 0) + len(mom_sections["decisions"])
        )

    return {
        "meetings": meetings_by_month,
        "actions": actions_by_month,
        "decisions": decisions_by_month,
    }
