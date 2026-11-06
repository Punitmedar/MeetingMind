"""
In-memory rate limiter helper.
"""

import time
from collections import defaultdict
from fastapi import HTTPException

_attempts: dict[str, list[float]] = defaultdict(list)


def check_rate_limit(key: str, max_attempts: int = 10, window_seconds: float = 60.0) -> None:
    """Enforce a sliding-window rate limit by key.
    
    Raises HTTP 429 if max_attempts is reached within window_seconds.
    """
    now = time.monotonic()
    valid_attempts = [t for t in _attempts[key] if now - t < window_seconds]
    _attempts[key] = valid_attempts
    if len(valid_attempts) >= max_attempts:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please wait before trying again.",
        )
    _attempts[key].append(now)
