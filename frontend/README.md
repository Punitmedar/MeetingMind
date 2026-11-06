# MeetingMind

MeetingMind is a productivity application that transforms meeting audio and video recordings into searchable transcripts, clear executive summaries, structured Minutes of Meeting, decisions, and actionable tasks.

## Getting Started

### Frontend Development

```sh
cd frontend
npm install
npm run dev
```

### Frontend Production Build & Preview

```sh
cd frontend
npm run build
npm run preview
```

### Backend Server

```sh
cd backend
.\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8001
```

## Technology Stack

- **Frontend**: React, TypeScript, Vite, TanStack Start, Tailwind CSS, shadcn/ui
- **Backend**: FastAPI, Python, MongoDB, PyJWT, Argon2
- **Processing**: FFmpeg, OpenAI Whisper Base, Google FLAN-T5 Base
