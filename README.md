# HostelDesk — AI Hostel Complaint Management System

A clean, full-stack complaint management platform for college hostels, with an
AI assistant that troubleshoots issues and drafts complaints. Students raise
complaints, wardens resolve them, admins watch the analytics.

| Layer | Stack |
| --- | --- |
| Frontend | React 19 · Vite · TypeScript · Tailwind CSS v4 · React Router · Axios · Recharts |
| Backend | FastAPI · SQLAlchemy 2.x · Alembic · Pydantic v2 · JWT (access + refresh) · bcrypt |
| AI | NVIDIA-hosted model via OpenAI-compatible API (`integrate.api.nvidia.com/v1`) — **key lives only in the backend `.env`, never sent to the frontend** |
| Data | SQLite by default (file-based, zero-config) · PostgreSQL-ready via `DATABASE_URL` |
| Deployment | Docker Compose (backend container + nginx-served frontend) |

## Roles & workflow

| Role | Can do |
| --- | --- |
| **Student** | Raise complaints (with photos), track their own, comment, rate resolved ones, close them, chat with the AI assistant |
| **Warden** | See unassigned + assigned complaints, assign, acknowledge → start → resolve, comment |
| **Admin** | Everything, plus user management and analytics dashboard |

Complaint lifecycle: `open → acknowledged → in_progress → resolved → closed`
(forward-only; students close their own resolved complaints).

Categories: Plumbing, Electrical, WiFi/Internet, Mess/Food, Housekeeping,
Security, Other. SLA deadlines are set per priority
(urgent 4h · high 24h · medium 72h · low 7 days); breaches are flagged.

## Quickstart (Docker)

```bash
cp backend/.env.example backend/.env   # set SECRET_KEY; add NVIDIA_API_KEY for the AI
docker compose up --build
# Frontend: http://localhost:8080
# Backend:  http://localhost:8000  (docs at /docs)
```

Seed demo data (users + 12 sample complaints) once the backend is up:

```bash
docker compose exec backend python seed.py
```

## Local development

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
python seed.py
uvicorn app.main:app --reload        # http://127.0.0.1:8000

# Frontend
cd frontend
npm install
npm run dev                          # http://localhost:5173 (proxies /api → backend)
```

## Seed logins

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@hosteldesk.io` | `Admin@12345` |
| Warden | `warden@hosteldesk.io` | `Warden@12345` |
| Student | `student@hosteldesk.io` | `Student@12345` |

## Environment variables

| Var | Purpose |
| --- | --- |
| `SECRET_KEY` | JWT signing secret — set a long random string in production |
| `DATABASE_URL` | SQLite file by default; use a `postgresql+psycopg2://…` URL for Postgres |
| `NVIDIA_API_KEY` | NVIDIA API key — **empty means the AI chat runs in offline fallback mode** (keyword troubleshooting + complaint drafting) |
| `NVIDIA_MODEL` | Model id for the NVIDIA API (default `meta/llama-3.1-70b-instruct`) |
| `FRONTEND_ORIGIN` | CORS origin for the API |
| `SEED_*` | Credentials created by `seed.py` |

## Notes

- `package-lock.json` is intentionally gitignored; the frontend Dockerfile uses
  `npm install` (not `npm ci`) so builds work without it.
- Uploaded photos are served from `/uploads` (persistent volume in compose).
