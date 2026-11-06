# MeetingMind — AI-Powered Meeting Intelligence Workspace

**MeetingMind** is a full-stack web application that converts audio and video meeting recordings into searchable time-stamped transcripts, factual executive summaries, structured Minutes of Meeting (MoM), confirmed decisions, and trackable action items.

---

## 1. Key Features

- **Media Upload & Audio Extraction**: Accepts video (`.mp4`, `.mov`, `.mkv`, `.avi`, `.webm`) and audio (`.mp3`, `.wav`, `.m4a`, `.aac`, `.ogg`, `.flac`) recordings up to 500 MB and extracts normalized 16 kHz mono WAV audio via FFmpeg.
- **Time-Stamped Speech Transcription**: Transcribes spoken audio using OpenAI Whisper (`base`) into time-stamped segments with interactive click-to-seek audio playback.
- **Grounded Summarization & Minutes of Meeting**: Uses Google FLAN-T5 (`google/flan-t5-base`) with transcript-grounded extraction to generate factual executive summaries, discussion points, confirmed decisions (filtered from open suggestions), action items, and target deadlines without hallucinating owners or dates.
- **Action Item Tracking**: Extracts tasks from meeting minutes and allows users to filter and toggle task status (`Pending` / `Completed`) from both the Meeting Workspace and the dedicated Action Items view.
- **Analytics & Insights**: Visualizes meeting volume, processing completion rates, decisions captured, and action-item completion progress.
- **Authentication & Role-Based Governance**: Full JWT authentication (`HS256`), Argon2 password hashing (`pwdlib`), session invalidation on logout/password change, single-use SHA-256 hashed password reset tokens, strict per-user data isolation, and an Admin Governance Panel for managing users and platform recordings.
- **Multi-Format Export**: Download complete meeting reports in Markdown (`.md`), Plain Text (`.txt`), or JSON (`.json`).

---

## 2. System Architecture & Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, TanStack Start / Router, Tailwind CSS v4, Lucide Icons, Recharts |
| **Backend API** | Python, FastAPI, Uvicorn, Pydantic |
| **AI & Media Pipeline** | OpenAI Whisper (`base`), Hugging Face Transformers (`google/flan-t5-base`), PyTorch, FFmpeg |
| **Database** | MongoDB (`pymongo`) — `users`, `meetings`, `password_resets` collections |
| **Security** | PyJWT (`HS256`), `pwdlib` (Argon2), SHA-256 single-use reset tokens, sliding-window rate limiting |

---

## 3. Project Structure

```text
C:\MEETINGIQ
├── backend/
│   ├── main.py                  # FastAPI entry point, CORS, and health check (/api/health)
│   ├── config.py                # Environment configuration loader
│   ├── database.py              # MongoDB client, collections, and index initialization
│   ├── dependencies.py          # JWT authentication and admin RBAC dependencies
│   ├── rate_limit.py            # Sliding-window rate limiter
│   ├── create_admin.py          # Interactive CLI script to bootstrap/promote an admin user
│   ├── requirements.txt         # Python dependencies
│   ├── .env.example             # Example backend environment configuration
│   ├── routes/
│   │   ├── auth.py              # Registration, login, logout, profile, password reset
│   │   ├── upload.py            # Media upload, FFmpeg extraction, and background AI pipeline
│   │   ├── meetings.py          # Meetings CRUD, audio streaming, stats, analytics, action items
│   │   └── admin.py             # Admin statistics, user management, and meeting oversight
│   └── services/
│       ├── transcription.py     # Whisper base speech-to-text with segment timestamps
│       └── summarization.py     # FLAN-T5 executive summary and structured MoM generation
└── frontend/
    ├── package.json             # Frontend scripts and dependencies
    ├── .env.example             # Example frontend environment configuration
    └── src/
        ├── styles.css           # Lavender & white design system and dark theme variables
        ├── lib/api.ts           # Typed API client and authentication helpers
        ├── components/
        │   ├── app-shell.tsx    # Responsive sidebar, top navbar, and layout shell
        │   ├── auth-pages.tsx   # Login, Register, Forgot Password, and Reset Password views
        │   ├── product-pages.tsx# Dashboard, Meetings, Upload, Details, Tasks, Analytics, Settings
        │   ├── admin-pages.tsx  # Admin Dashboard, User Management, and Meeting Management
        │   ├── analytics-chart.tsx
        │   ├── meeting-ui.tsx
        │   └── metric-card.tsx
        └── routes/              # File-based TanStack Router routes
```

---

## 4. Prerequisites

1. **Python 3.10+** (with virtual environment at `C:\MEETINGIQ\backend\venv`)
2. **Node.js 20+** and **npm**
3. **MongoDB Community Server** running locally on `mongodb://127.0.0.1:27017`
4. **FFmpeg** installed and available on the system `PATH` (`ffmpeg -version`)

---

## 5. Environment Configuration

### Backend (`C:\MEETINGIQ\backend\.env`)
Copy `C:\MEETINGIQ\backend\.env.example` to `C:\MEETINGIQ\backend\.env` and configure:

```env
SECRET_KEY=replace-with-a-strong-random-secret-key
MONGO_URI=mongodb://127.0.0.1:27017
ALLOWED_ORIGINS=http://localhost:8080,http://127.0.0.1:8080,http://127.0.0.1:8787,http://localhost:8787
MAX_UPLOAD_BYTES=524288000

# Optional: Outgoing SMTP configuration for password reset emails
FRONTEND_URL=http://localhost:8080
RESET_TOKEN_EXPIRE_MINUTES=30
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=MeetingMind <your-email@gmail.com>
SMTP_USE_TLS=true
```

### Frontend (`C:\MEETINGIQ\frontend\.env`)
Copy `C:\MEETINGIQ\frontend\.env.example` to `C:\MEETINGIQ\frontend\.env` (optional if using the default `http://127.0.0.1:8001` backend):

```env
VITE_API_URL=http://127.0.0.1:8001
```

---

## 6. Installation & Startup Instructions

### Step 1: Ensure MongoDB is Running
Ensure the local MongoDB service is active on port `27017`.

### Step 2: Start the FastAPI Backend Server
```powershell
cd C:\MEETINGIQ\backend
.\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8001
```
- Backend API Base URL: `http://127.0.0.1:8001`
- Health Check Endpoint: `http://127.0.0.1:8001/api/health`
- Interactive Swagger Docs: `http://127.0.0.1:8001/docs`

### Step 3: Start the Frontend Application
For development (`http://localhost:8080`):
```powershell
cd C:\MEETINGIQ\frontend
npm install
npm run dev
```

For production build and preview (`http://127.0.0.1:8787`):
```powershell
cd C:\MEETINGIQ\frontend
npm run build
npm run preview
```

### Optional: Create or Promote an Administrator Account
```powershell
cd C:\MEETINGIQ\backend
.\venv\Scripts\python.exe create_admin.py
```
