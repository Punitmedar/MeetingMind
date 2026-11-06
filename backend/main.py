"""MeetingMind FastAPI entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import config
from routes.upload import router as upload_router
from routes.meetings import router as meetings_router
from routes.auth import router as auth_router
from routes.admin import router as admin_router

app = FastAPI(title="MeetingMind API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok", "message": "MeetingMind backend is running"}


app.include_router(upload_router, prefix="/api")
app.include_router(meetings_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
