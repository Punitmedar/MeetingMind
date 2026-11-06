"""
MeetingMind Configuration
Reads settings from a .env file using python-dotenv.
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Secret key (required)
# ---------------------------------------------------------------------------

SECRET_KEY: str = os.getenv("SECRET_KEY", "")

_DEFAULT_SECRET = "change-this-to-a-long-random-secret"

if not SECRET_KEY:
    raise ValueError(
        "SECRET_KEY is not set. "
        "Create a .env file and set SECRET_KEY to a long random string."
    )

# In production (non-dev) environments, disallow the placeholder value.
# We detect "development" loosely: if ENV is unset or "development" we allow it.
_env = os.getenv("ENV", "development").lower()
if _env not in ("development", "dev", "test") and SECRET_KEY == _DEFAULT_SECRET:
    raise ValueError(
        "SECRET_KEY must not be the default placeholder in production. "
        "Set a strong random value in your environment."
    )

# ---------------------------------------------------------------------------
# MongoDB
# ---------------------------------------------------------------------------

MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017")

# ---------------------------------------------------------------------------
# CORS allowed origins (comma-separated in env var)
# ---------------------------------------------------------------------------

_raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
	"http://localhost:8080,"
	"http://127.0.0.1:8080,"
	"http://localhost:8081,"
	"http://127.0.0.1:8081,"
	"http://127.0.0.1:8787,"
    	"http://localhost:8787,"
    	"http://localhost:5173,"
    	"http://127.0.0.1:5173,"
    	"http://localhost:3000,"
    	"http://127.0.0.1:3000",
)
ALLOWED_ORIGINS: list[str] = [o.strip() for o in _raw_origins.split(",") if o.strip()]

# ---------------------------------------------------------------------------
# Upload size limit
# ---------------------------------------------------------------------------

MAX_UPLOAD_BYTES: int = int(os.getenv("MAX_UPLOAD_BYTES", 524_288_000))

# ---------------------------------------------------------------------------
# JWT & Password Reset settings
# ---------------------------------------------------------------------------

ALGORITHM: str = "HS256"
TOKEN_EXPIRE_HOURS: int = 8
RESET_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("RESET_TOKEN_EXPIRE_MINUTES", 30))

# ---------------------------------------------------------------------------
# Email / SMTP settings (for password reset delivery)
# ---------------------------------------------------------------------------

FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:8080").rstrip("/")
SMTP_HOST: str = os.getenv("SMTP_HOST", "").strip()
SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER: str = os.getenv("SMTP_USER", "").strip()
SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "").strip()
SMTP_FROM: str = os.getenv("SMTP_FROM", SMTP_USER or "noreply@meetingmind.local").strip()
SMTP_USE_TLS: bool = os.getenv("SMTP_USE_TLS", "true").lower() in ("1", "true", "yes")


def is_smtp_configured() -> bool:
    """Return True if SMTP credentials are provided in environment variables."""
    return bool(SMTP_HOST and SMTP_USER and SMTP_PASSWORD)
