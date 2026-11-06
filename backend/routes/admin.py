"""
Admin-only routes. Every endpoint requires the 'admin' role verified from the database.
"""

import re
from pathlib import Path
from typing import Literal

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from database import meetings_collection, users_collection, password_resets_collection
from dependencies import require_admin
from routes.meetings import parse_mom_sections

router = APIRouter(prefix="/admin")


class RoleUpdate(BaseModel):
    role: Literal["user", "admin"]


class UserStatusUpdate(BaseModel):
    is_active: bool


# ---------------------------------------------------------------------------
# GET /api/admin/stats
# ---------------------------------------------------------------------------

@router.get("/stats")
def admin_stats(admin: dict = Depends(require_admin)):
    total_users = users_collection.count_documents({})
    active_users = users_collection.count_documents({"is_active": {"$ne": False}})
    admin_users = users_collection.count_documents({"role": "admin"})

    total_meetings = meetings_collection.count_documents({})
    processing_meetings = meetings_collection.count_documents({"status": "processing"})
    failed_meetings = meetings_collection.count_documents({"status": "failed"})
    completed_meetings = meetings_collection.count_documents(
        {"status": {"$nin": ["processing", "failed"]}}
    )

    return {
        "total_users": total_users,
        "active_users": active_users,
        "admin_users": admin_users,
        "total_meetings": total_meetings,
        "completed_meetings": completed_meetings,
        "processed_meetings": completed_meetings,
        "processing_meetings": processing_meetings,
        "failed_meetings": failed_meetings,
    }


# ---------------------------------------------------------------------------
# GET /api/admin/users
# ---------------------------------------------------------------------------

@router.get("/users")
def admin_list_users(
    q: str = Query("", description="Email or name search substring"),
    role: str = Query("", description="Filter by role: user or admin"),
    status: str = Query("", description="Filter by status: active or inactive"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin: dict = Depends(require_admin),
):
    flt: dict = {}
    if q.strip():
        escaped = re.escape(q.strip())
        flt["$or"] = [
            {"email": {"$regex": escaped, "$options": "i"}},
            {"name": {"$regex": escaped, "$options": "i"}},
        ]

    if role in ("user", "admin"):
        flt["role"] = role

    if status == "active":
        flt["is_active"] = {"$ne": False}
    elif status == "inactive":
        flt["is_active"] = False

    skip = (page - 1) * limit
    total = users_collection.count_documents(flt)

    # Pre-aggregate meeting counts by user_id
    meeting_counts: dict[str, int] = {}
    for row in meetings_collection.aggregate(
        [{"$group": {"_id": "$user_id", "count": {"$sum": 1}}}]
    ):
        if row["_id"]:
            meeting_counts[str(row["_id"])] = row["count"]

    users = []
    for u in (
        users_collection
        .find(flt, {"password": 0})
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    ):
        uid = str(u["_id"])
        users.append({
            "id": uid,
            "email": u.get("email", ""),
            "name": u.get("name", ""),
            "role": u.get("role", "user"),
            "is_active": u.get("is_active", True),
            "meeting_count": meeting_counts.get(uid, 0),
            "last_login_at": u.get("last_login_at"),
            "created_at": u.get("created_at"),
        })

    return {"users": users, "total": total, "page": page, "limit": limit}


# ---------------------------------------------------------------------------
# GET /api/admin/users/{user_id}
# ---------------------------------------------------------------------------

@router.get("/users/{user_id}")
def admin_get_user_details(
    user_id: str,
    admin: dict = Depends(require_admin),
):
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    u = users_collection.find_one({"_id": oid}, {"password": 0})
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    user_meetings = []
    for m in (
        meetings_collection
        .find({"user_id": user_id}, {"transcript": 0, "mom": 0})
        .sort("created_at", -1)
        .limit(10)
    ):
        user_meetings.append({
            "id": str(m["_id"]),
            "filename": m.get("filename", "Untitled"),
            "status": m.get("status", "processed"),
            "duration_seconds": m.get("duration_seconds", 0),
            "created_at": m.get("created_at"),
        })

    total_user_meetings = meetings_collection.count_documents({"user_id": user_id})

    return {
        "id": str(u["_id"]),
        "email": u.get("email", ""),
        "name": u.get("name", ""),
        "role": u.get("role", "user"),
        "is_active": u.get("is_active", True),
        "last_login_at": u.get("last_login_at"),
        "created_at": u.get("created_at"),
        "meeting_count": total_user_meetings,
        "recent_meetings": user_meetings,
    }


# ---------------------------------------------------------------------------
# PATCH /api/admin/users/{user_id}/role
# ---------------------------------------------------------------------------

@router.patch("/users/{user_id}/role")
def admin_update_role(
    user_id: str,
    data: RoleUpdate,
    admin: dict = Depends(require_admin),
):
    if user_id == str(admin["_id"]):
        raise HTTPException(
            status_code=400,
            detail="You cannot change your own role.",
        )

    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    result = users_collection.update_one(
        {"_id": oid},
        {"$set": {"role": data.role}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": f"User role updated to '{data.role}'."}


# ---------------------------------------------------------------------------
# PATCH /api/admin/users/{user_id}/status
# ---------------------------------------------------------------------------

@router.patch("/users/{user_id}/status")
def admin_update_user_status(
    user_id: str,
    data: UserStatusUpdate,
    admin: dict = Depends(require_admin),
):
    if user_id == str(admin["_id"]):
        raise HTTPException(
            status_code=400,
            detail="You cannot deactivate your own admin account.",
        )

    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    result = users_collection.update_one(
        {"_id": oid},
        {"$set": {"is_active": data.is_active}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    state_str = "activated" if data.is_active else "deactivated"
    return {"message": f"User account has been {state_str}.", "is_active": data.is_active}


# ---------------------------------------------------------------------------
# DELETE /api/admin/users/{user_id}
# ---------------------------------------------------------------------------

@router.delete("/users/{user_id}")
def admin_delete_user(
    user_id: str,
    admin: dict = Depends(require_admin),
):
    if user_id == str(admin["_id"]):
        raise HTTPException(
            status_code=400,
            detail="You cannot delete your own account through the admin panel.",
        )

    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    user = users_collection.find_one({"_id": oid}, {"_id": 1})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    for m in meetings_collection.find({"user_id": user_id}, {"saved_path": 1, "audio_path": 1}):
        for key in ("saved_path", "audio_path"):
            p = m.get(key)
            if p:
                try:
                    Path(p).unlink(missing_ok=True)
                except Exception:
                    pass

    meetings_collection.delete_many({"user_id": user_id})
    password_resets_collection.delete_many({"user_id": user_id})
    users_collection.delete_one({"_id": oid})

    return {"message": "User account and associated meetings have been deleted."}


# ---------------------------------------------------------------------------
# GET /api/admin/meetings
# ---------------------------------------------------------------------------

@router.get("/meetings")
def admin_list_meetings(
    q: str = Query("", description="Filename search"),
    status: str = Query("", description="Filter by status: processed, processing, failed"),
    user_id: str = Query("", description="Filter by owner user_id"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin: dict = Depends(require_admin),
):
    flt: dict = {}
    if q.strip():
        flt["filename"] = {"$regex": re.escape(q.strip()), "$options": "i"}

    if status and status.lower() not in ("all", ""):
        flt["status"] = status.lower()

    if user_id.strip():
        flt["user_id"] = user_id.strip()

    skip = (page - 1) * limit
    total = meetings_collection.count_documents(flt)

    # Map user IDs to email/name for display
    user_map: dict[str, dict[str, str]] = {}
    for u in users_collection.find({}, {"email": 1, "name": 1}):
        user_map[str(u["_id"])] = {
            "email": u.get("email", ""),
            "name": u.get("name", ""),
        }

    meetings = []
    for m in (
        meetings_collection
        .find(flt, {"transcript": 0})
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    ):
        uid = m.get("user_id")
        owner_info = user_map.get(str(uid), {}) if uid else {}
        mom_sections = parse_mom_sections(m.get("mom", ""))

        meetings.append({
            "id": str(m["_id"]),
            "filename": m.get("filename", "Untitled recording"),
            "user_id": uid,
            "owner_email": owner_info.get("email") or ("Unassigned (Legacy)" if not uid else "Deleted user"),
            "owner_name": owner_info.get("name") or "",
            "duration_seconds": m.get("duration_seconds", 0),
            "processing_time_seconds": m.get("processing_time_seconds", 0),
            "status": m.get("status", "processed"),
            "processing_stage": m.get("processing_stage", "Completed"),
            "error_message": m.get("error_message"),
            "decision_count": len(mom_sections["decisions"]),
            "action_item_count": len(mom_sections["actions"]),
            "created_at": m.get("created_at"),
        })

    return {
        "meetings": meetings,
        "total": total,
        "page": page,
        "limit": limit,
    }


# ---------------------------------------------------------------------------
# DELETE /api/admin/meetings/{meeting_id}
# ---------------------------------------------------------------------------

@router.delete("/meetings/{meeting_id}")
def admin_delete_meeting(
    meeting_id: str,
    admin: dict = Depends(require_admin),
):
    try:
        oid = ObjectId(meeting_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid meeting ID")

    meeting = meetings_collection.find_one({"_id": oid})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    for path_key in ("saved_path", "audio_path"):
        path_str = meeting.get(path_key)
        if path_str:
            try:
                Path(path_str).unlink(missing_ok=True)
            except Exception:
                pass

    meetings_collection.delete_one({"_id": oid})
    return {"message": "Meeting deleted by administrator."}
