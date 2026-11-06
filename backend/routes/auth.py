"""
Authentication routes: register, login, logout, me, profile, change-password,
forgot-password, reset-password.
"""

import hashlib
import logging
import re
import secrets
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage

import jwt
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from pwdlib import PasswordHash

import config
from config import SECRET_KEY, ALGORITHM, TOKEN_EXPIRE_HOURS, RESET_TOKEN_EXPIRE_MINUTES
from database import users_collection, password_resets_collection
from dependencies import get_current_user
from rate_limit import check_rate_limit

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth")
password_hash = PasswordHash.recommended()


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str = ""


class LoginRequest(BaseModel):
    email: str
    password: str


class UpdateProfileRequest(BaseModel):
    name: str = ""


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$")


def _validate_email(email: str) -> bool:
    """Structural email validation."""
    if not email or len(email) > 254:
        return False
    return bool(_EMAIL_RE.match(email))


def _validate_password_strength(password: str) -> str | None:
    """Return an error message if password is weak, or None if valid."""
    if len(password) < 8:
        return "Password must be at least 8 characters long."
    if len(password) > 128:
        return "Password must not exceed 128 characters."
    if not any(ch.isalpha() for ch in password):
        return "Password must contain at least one letter."
    if not any(ch.isdigit() for ch in password):
        return "Password must contain at least one number."
    return None


def _hash_reset_token(raw_token: str) -> str:
    """Return SHA-256 hex digest of a raw password reset token."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def _make_token(user: dict) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user["_id"]),
        "email": user["email"],
        "role": user.get("role", "user"),
        "iat": int(now.timestamp()),
        "jti": secrets.token_hex(12),
        "exp": now + timedelta(hours=TOKEN_EXPIRE_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _safe_user(user: dict) -> dict:
    """Return a user dict without sensitive fields."""
    return {
        "id": str(user["_id"]),
        "email": user.get("email", ""),
        "name": user.get("name", ""),
        "role": user.get("role", "user"),
        "is_active": user.get("is_active", True),
        "created_at": user.get("created_at"),
    }


def _send_reset_email(to_email: str, user_name: str, reset_url: str) -> bool:
    """Send password reset email via configured SMTP server.
    Never logs the reset URL or token.
    """
    if not config.is_smtp_configured():
        return False

    msg = EmailMessage()
    msg["Subject"] = "Reset your MeetingMind password"
    msg["From"] = config.SMTP_FROM
    msg["To"] = to_email

    greeting = f"Hello {user_name}," if user_name else "Hello,"
    plain_body = (
        f"{greeting}\n\n"
        f"We received a request to reset the password for your MeetingMind account.\n\n"
        f"Use the secure link below to set a new password (valid for {RESET_TOKEN_EXPIRE_MINUTES} minutes):\n"
        f"{reset_url}\n\n"
        f"If you did not request a password reset, you can safely ignore this email.\n\n"
        f"— MeetingMind Security"
    )
    msg.set_content(plain_body)

    try:
        with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=10) as server:
            if config.SMTP_USE_TLS:
                server.starttls()
            server.login(config.SMTP_USER, config.SMTP_PASSWORD)
            server.send_message(msg)
        return True
    except Exception:
        logger.warning("Failed to dispatch password reset email via SMTP.")
        return False


# ---------------------------------------------------------------------------
# POST /api/auth/register
# ---------------------------------------------------------------------------

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_user(data: RegisterRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(f"register:{client_ip}", max_attempts=10, window_seconds=60.0)

    name = data.name.strip()
    if len(name) < 2:
        raise HTTPException(
            status_code=422,
            detail="Please enter your full name (at least 2 characters).",
        )

    email = data.email.strip().lower()
    if not _validate_email(email):
        raise HTTPException(status_code=422, detail="Please enter a valid email address.")

    pwd_err = _validate_password_strength(data.password)
    if pwd_err:
        raise HTTPException(status_code=422, detail=pwd_err)

    if users_collection.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    hashed_password = password_hash.hash(data.password)

    user_doc = {
        "email": email,
        "password": hashed_password,
        "name": name,
        "role": "user",
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
    }

    result = users_collection.insert_one(user_doc)

    return {
        "message": "Account created successfully.",
        "user_id": str(result.inserted_id),
        "email": email,
        "name": name,
    }


# ---------------------------------------------------------------------------
# POST /api/auth/login
# ---------------------------------------------------------------------------

@router.post("/login")
def login_user(data: LoginRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(f"login:{client_ip}", max_attempts=10, window_seconds=60.0)

    _invalid = HTTPException(status_code=401, detail="Invalid email or password.")

    email = data.email.strip().lower()
    if not email or not data.password:
        raise _invalid

    user = users_collection.find_one({"email": email})
    if not user:
        raise _invalid

    if not password_hash.verify(data.password, user["password"]):
        raise _invalid

    if user.get("is_active", True) is False:
        raise HTTPException(
            status_code=403,
            detail="Your account has been deactivated. Please contact an administrator.",
        )

    # Clear any prior logout invalidation timestamp so the newly issued token is active
    users_collection.update_one(
        {"_id": user["_id"]},
        {"$unset": {"tokens_invalidated_at": ""}, "$set": {"last_login_at": datetime.now(timezone.utc)}},
    )

    token = _make_token(user)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": str(user["_id"]),
        "email": user["email"],
        "name": user.get("name", ""),
        "role": user.get("role", "user"),
    }


# ---------------------------------------------------------------------------
# POST /api/auth/logout
# ---------------------------------------------------------------------------

@router.post("/logout")
def logout_user(user: dict = Depends(get_current_user)):
    """Invalidate all tokens issued at or before the current second for this user."""
    now_ts = int(datetime.now(timezone.utc).timestamp())
    users_collection.update_one(
        {"_id": ObjectId(user["_id"])},
        {"$set": {"tokens_invalidated_at": now_ts}},
    )
    return {"message": "Signed out successfully."}


# ---------------------------------------------------------------------------
# GET /api/auth/me
# ---------------------------------------------------------------------------

@router.get("/me")
def get_me(user: dict = Depends(get_current_user)):
    return _safe_user(user)


# ---------------------------------------------------------------------------
# PATCH /api/auth/profile
# ---------------------------------------------------------------------------

@router.patch("/profile")
def update_profile(
    data: UpdateProfileRequest,
    user: dict = Depends(get_current_user),
):
    name = data.name.strip()
    if len(name) < 2:
        raise HTTPException(
            status_code=422,
            detail="Name must be at least 2 characters long.",
        )

    users_collection.update_one(
        {"_id": ObjectId(user["_id"])},
        {"$set": {"name": name}},
    )
    updated = users_collection.find_one({"_id": ObjectId(user["_id"])})
    return _safe_user(updated)


# ---------------------------------------------------------------------------
# POST /api/auth/change-password
# ---------------------------------------------------------------------------

@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    user: dict = Depends(get_current_user),
):
    check_rate_limit(f"pwd:{user['_id']}", max_attempts=5, window_seconds=60.0)

    pwd_err = _validate_password_strength(data.new_password)
    if pwd_err:
        raise HTTPException(status_code=422, detail=pwd_err)

    db_user = users_collection.find_one({"_id": ObjectId(user["_id"])})
    if not db_user or not password_hash.verify(data.current_password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Current password is incorrect.")

    if data.current_password == data.new_password:
        raise HTTPException(
            status_code=422,
            detail="New password must be different from your current password.",
        )

    new_hash = password_hash.hash(data.new_password)
    users_collection.update_one(
        {"_id": ObjectId(user["_id"])},
        {"$set": {"password": new_hash}},
    )

    return {"message": "Password updated successfully."}


# ---------------------------------------------------------------------------
# POST /api/auth/forgot-password
# ---------------------------------------------------------------------------

@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, request: Request):
    """Initiate password reset workflow.
    Always returns a generic confirmation message to prevent account enumeration.
    Never exposes reset tokens in responses or logs.
    """
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(f"forgot:{client_ip}", max_attempts=5, window_seconds=60.0)

    email = data.email.strip().lower()
    if not _validate_email(email):
        raise HTTPException(status_code=422, detail="Please enter a valid email address.")

    generic_message = (
        "If an account is registered with that email address, "
        "password reset instructions have been processed."
    )
    smtp_ready = config.is_smtp_configured()

    user = users_collection.find_one({"email": email})
    if user and user.get("is_active", True) is not False:
        # Invalidate any existing unused tokens for this user
        password_resets_collection.update_many(
            {"user_id": str(user["_id"]), "used": False},
            {"$set": {"used": True}},
        )

        raw_token = secrets.token_urlsafe(32)
        token_hash = _hash_reset_token(raw_token)
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)

        password_resets_collection.insert_one({
            "user_id": str(user["_id"]),
            "email": email,
            "token_hash": token_hash,
            "used": False,
            "created_at": now,
            "expires_at": expires_at,
        })

        reset_url = f"{config.FRONTEND_URL}/reset-password?token={raw_token}"
        if smtp_ready:
            _send_reset_email(email, user.get("name", ""), reset_url)

    return {
        "message": generic_message,
        "smtp_configured": smtp_ready,
    }


# ---------------------------------------------------------------------------
# GET /api/auth/reset-password/verify
# ---------------------------------------------------------------------------

@router.get("/reset-password/verify")
def verify_reset_token(token: str = Query(..., min_length=16)):
    """Verify whether a password reset token is valid, unused, and non-expired."""
    token_hash = _hash_reset_token(token.strip())
    record = password_resets_collection.find_one({"token_hash": token_hash, "used": False})

    if not record:
        raise HTTPException(
            status_code=400,
            detail="This password reset link is invalid or has already been used.",
        )

    expires_at = record.get("expires_at")
    now = datetime.now(timezone.utc)
    if expires_at:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if now > expires_at:
            raise HTTPException(
                status_code=400,
                detail="This password reset link has expired. Please request a new one.",
            )

    return {"valid": True}


# ---------------------------------------------------------------------------
# POST /api/auth/reset-password
# ---------------------------------------------------------------------------

@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, request: Request):
    """Consume a valid, single-use reset token and update the user's password."""
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(f"reset:{client_ip}", max_attempts=5, window_seconds=60.0)

    raw_token = data.token.strip()
    if len(raw_token) < 16:
        raise HTTPException(
            status_code=400,
            detail="Invalid password reset token.",
        )

    pwd_err = _validate_password_strength(data.new_password)
    if pwd_err:
        raise HTTPException(status_code=422, detail=pwd_err)

    token_hash = _hash_reset_token(raw_token)
    record = password_resets_collection.find_one({"token_hash": token_hash, "used": False})
    if not record:
        raise HTTPException(
            status_code=400,
            detail="This password reset link is invalid or has already been used.",
        )

    now = datetime.now(timezone.utc)
    expires_at = record.get("expires_at")
    if expires_at:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if now > expires_at:
            password_resets_collection.update_one(
                {"_id": record["_id"]},
                {"$set": {"used": True}},
            )
            raise HTTPException(
                status_code=400,
                detail="This password reset link has expired. Please request a new one.",
            )

    try:
        user_oid = ObjectId(record["user_id"])
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user reference.")

    user = users_collection.find_one({"_id": user_oid})
    if not user:
        raise HTTPException(status_code=404, detail="User account no longer exists.")

    # Mark token used first (single-use atomic update)
    res = password_resets_collection.update_one(
        {"_id": record["_id"], "used": False},
        {"$set": {"used": True, "used_at": now}},
    )
    if res.modified_count == 0:
        raise HTTPException(
            status_code=400,
            detail="This password reset link has already been used.",
        )

    new_hash = password_hash.hash(data.new_password)
    users_collection.update_one(
        {"_id": user_oid},
        {
            "$set": {
                "password": new_hash,
                "tokens_invalidated_at": int(now.timestamp()),
            }
        },
    )

    return {"message": "Your password has been reset successfully. You can now sign in."}
