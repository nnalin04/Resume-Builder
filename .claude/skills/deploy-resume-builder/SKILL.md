---
name: deploy-resume-builder
description: >
  Full deployment reference for AI Resume Builder. Use when someone asks how to deploy,
  what env vars are needed, how to restart the backend, or how to push to Vercel.
  Contains Oracle SSH steps, Docker commands, Vercel env setup, and all required secrets.
---

# AI Resume Builder — Deployment Reference

## Architecture

```
User → Vercel (frontend + serverless proxy)  →  Oracle Cloud ARM (FastAPI backend)
         resume-builder-black-nu.vercel.app        80.225.223.142:8000
```

- **Frontend**: React + Vite — auto-deploys to Vercel on every `git push origin main`
- **Backend**: FastAPI in Docker — runs on Oracle Cloud Free ARM, must be manually restarted after changes
- **Proxy**: `api/[...path].js` — Vercel serverless function that injects `X-Backend-Secret` and forwards to Oracle
- **Database**: SQLite at `/app/data/resume_builder.db` (persisted via Docker volume `db_data`)

---

## Vercel Environment Variables

Set these in: **Vercel Dashboard → Project → Settings → Environment Variables**

| Variable | Value | Purpose |
|----------|-------|---------|
| `ORACLE_BACKEND_URL` | `http://80.225.223.142:8000` | Oracle backend IP — never expose to browser |
| `BACKEND_SECRET` | *(see oracle-setup.sh line 8)* | Shared secret injected by proxy into every backend request |

> The `BACKEND_SECRET` value is in `oracle-setup.sh` (line 8). It must match `BACKEND_SECRET` in `backend/.env` on Oracle.

---

## Oracle Backend — SSH & Deploy

### SSH Command
```bash
ssh -i ~/.ssh/id_rsa ubuntu@80.225.223.142
# or if using a key alias:
ssh ubuntu@80.225.223.142
```

> If you don't have the SSH key locally, use the Oracle Cloud Console → Instance → Launch Cloud Shell.

### First-time setup (run once on Oracle)
```bash
git clone https://github.com/nnalin04/Resume-Builder.git
cd Resume-Builder
bash oracle-setup.sh
```

### Normal deploy (after a `git push`)
```bash
ssh ubuntu@80.225.223.142
cd ~/Resume-Builder
git pull origin main
docker compose up -d backend        # restart with new code (no rebuild)
```

### Deploy with dependency changes (when `requirements.txt` changed)
```bash
ssh ubuntu@80.225.223.142
cd ~/Resume-Builder
git pull origin main
docker compose build backend        # rebuild image
docker compose up -d backend        # restart with new image
```

### Check backend is healthy
```bash
curl http://localhost:8000/           # should return {"status":"ok",...}
curl http://localhost:8000/health     # should return 200
docker compose logs backend --tail=50
```

### Verify secret enforcement
```bash
# Should return 403 (no secret)
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/auth/me

# Should return 401 (secret correct, but unauthenticated — proves backend is live)
curl -s -o /dev/null -w "%{http_code}" \
  -H "X-Backend-Secret: $(grep BACKEND_SECRET backend/.env | cut -d= -f2)" \
  http://localhost:8000/api/auth/me
```

---

## Frontend — Vercel Deploy

**Automatic**: Every `git push origin main` triggers a Vercel build and deploy.

**Manual** (if needed):
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod
```

**Build command** (in vercel.json): `cd frontend && npm install && npm run build`
**Output dir**: `frontend/dist`

---

## Backend `.env` — All Required Variables

Reference file: `backend/.env.example`

| Variable | Required | Notes |
|----------|----------|-------|
| `GEMINI_API_KEY` | Yes | From Google AI Studio — free tier 1,500 req/day |
| `JWT_SECRET_KEY` | Yes | 64-char hex — generate with `openssl rand -hex 32` |
| `BACKEND_SECRET` | Yes | Must match `BACKEND_SECRET` in Vercel env vars |
| `FRONTEND_ORIGIN` | Yes | `https://resume-builder-black-nu.vercel.app` in prod |
| `FRONTEND_URL` | Yes | Same as above — used for password reset links |
| `DATABASE_URL` | Set by Docker | `sqlite:////app/data/resume_builder.db` |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth — from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth |
| `GOOGLE_REDIRECT_URI` | Optional | `https://resume-builder-black-nu.vercel.app/auth/google/callback` |
| `CASHFREE_APP_ID` | Optional | Payments — from Cashfree dashboard |
| `CASHFREE_SECRET_KEY` | Optional | Payments |
| `CASHFREE_ENV` | Optional | `sandbox` or `production` |
| `CASHFREE_WEBHOOK_URL` | Optional | `https://resume-builder-black-nu.vercel.app/api/payments/webhook` |
| `SMTP_HOST` | Optional | Password reset emails — e.g. `smtp.gmail.com` |
| `SMTP_PORT` | Optional | `587` for Gmail TLS |
| `SMTP_USER` | Optional | Gmail address |
| `SMTP_PASS` | Optional | Gmail App Password (not account password) |
| `SMTP_FROM` | Optional | `Resume Builder <you@gmail.com>` |

> **SMTP note**: Without SMTP configured, the backend logs the reset link to console (`docker compose logs backend`). Safe for dev, but set SMTP for production.

---

## After Deploying — Smoke Test Checklist

Run these from your local machine to confirm everything works end-to-end:

```bash
# 1. Frontend loads
curl -s -o /dev/null -w "%{http_code}" https://resume-builder-black-nu.vercel.app
# → 200

# 2. Vercel proxy reaches backend
curl -s -o /dev/null -w "%{http_code}" https://resume-builder-black-nu.vercel.app/api/auth/me
# → 401 (unauthenticated — not 404 or 502)

# 3. Direct Oracle hit is blocked
curl -s -o /dev/null -w "%{http_code}" http://80.225.223.142:8000/api/auth/me
# → 403 (secret missing)

# 4. Health check
curl https://resume-builder-black-nu.vercel.app/api/../health 2>/dev/null || \
  curl http://80.225.223.142:8000/health
# → {"status":"ok"}
```

---

## Docker Commands Reference

```bash
# View running containers
docker compose ps

# View backend logs (live)
docker compose logs backend -f

# Restart backend
docker compose restart backend

# Full rebuild + restart
docker compose build backend && docker compose up -d backend

# Check database
docker compose exec backend sqlite3 /app/data/resume_builder.db ".tables"

# Shell into backend container
docker compose exec backend bash
```

---

## URLs

| Service | URL |
|---------|-----|
| Live frontend | https://resume-builder-black-nu.vercel.app |
| Vercel dashboard | https://vercel.com/dashboard |
| Oracle backend (direct, blocked) | http://80.225.223.142:8000 |
| Backend health | http://80.225.223.142:8000/health |
| Backend API docs | http://80.225.223.142:8000/docs *(only with secret header)* |
| GitHub repo | https://github.com/nnalin04/Resume-Builder |
