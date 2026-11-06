"""
FastAPI dependency functions for authentication and authorisation.
"""

from bson import ObjectId

import jwt
from fastapi import Depends, HTTPException, Query, Request
from fastapi.security import OAuth2PasswordBearer

import config
import database

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def _decode_user(token: str) -> dict:
    credentials_exc = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            config.SECRET_KEY,
            algorithms=[config.ALGORITHM],
        )
        user_id: str = payload.get("sub")
        if not user_id:
            raise credentials_exc
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError:
        raise credentials_exc

    try:
        object_id = ObjectId(user_id)
    except Exception:
        raise credentials_exc

    user = database.users_collection.find_one({"_id": object_id})
    if not user:
        raise credentials_exc

    if user.get("is_active", True) is False:
        raise HTTPException(
            status_code=403,
            detail="Your account has been deactivated. Please contact an administrator.",
        )

    invalidated_at = user.get("tokens_invalidated_at")
    token_iat = payload.get("iat")
    if invalidated_at and token_iat and token_iat <= invalidated_at:
        raise HTTPException(
            status_code=401,
            detail="Session is no longer valid. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_dict = {k: v for k, v in user.items() if k != "password"}
    user_dict["_id"] = str(user["_id"])
    return user_dict


def get_current_user(token: str | None = Depends(oauth2_scheme)) -> dict:
    """Decode the JWT from Bearer header and return the user document."""
    if not token:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _decode_user(token)


def get_current_user_optional_query(
    request: Request,
    token: str | None = Query(None),
) -> dict:
    """Decode JWT from either Authorization header or query parameter (e.g. for audio streaming)."""
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
    if not token:
        raise HTTPException(
            status_code=401,
            detail="Authentication token required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _decode_user(token)


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """Require the authenticated user to have the 'admin' role.

    Raises HTTP 403 otherwise.
    """
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
