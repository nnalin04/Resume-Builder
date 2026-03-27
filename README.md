# AI Resume Builder

**Live app:** [resume-builder-black-nu.vercel.app](https://resume-builder-black-nu.vercel.app)

An AI-powered resume builder SaaS for job seekers. Upload an existing resume or build from scratch, optimize it against a job description, and download a polished PDF — all in minutes. Built to run on zero-cost cloud infrastructure.

---

## Features

### Resume Editor
- **10 professional templates** — Classic, Modern, Professional, Two Column, Clean, Minimal, Executive, Tech, Finance, Creative — each with a live A4 preview that updates as you type
- **Onboarding wizard** — first-time users pick a template, optionally upload an existing PDF, and enter a target role; the editor pre-fills from there
- **Section forms** — Personal Info, Professional Summary, Work Experience, Projects, Education, Certifications
- **Skill categories** — toggle between a flat comma-separated list and a structured categorized view (Languages, Frameworks, Databases, DevOps, Architecture); empty categories are hidden in the preview automatically
- **Font size control** — Small / Medium / Large scaling applied uniformly across all templates without breaking layout
- **Paginated live preview** — the right panel renders the resume at exact A4 dimensions, paginated with accurate page breaks

### AI Capabilities
- **PDF parsing** — upload a PDF resume; pdfplumber + PyMuPDF extract the raw text, then Gemini 3.1 Flash parses it into structured sections (contact, summary, experience, education, skills, projects, certifications)
- **ATS optimization** — paste a job description; the AI rewrites bullets, strengthens action verbs, and embeds relevant keywords to improve ATS keyword coverage
- **ATS score** — keyword overlap score between your resume and a job description, with gap analysis
- **AI coaching chat** — conversational interface per resume for iterating on bullet points, the summary, or career narrative
- **Stateless AI rewrite** — rewrite any text snippet without a saved resume context
- **Cover letter generator** — generate a tailored cover letter from a saved resume + job description in three tones (Professional, Enthusiastic, Concise)

### Export
- **PDF download** — rendered via `window.print()` from the live React template; produces pixel-perfect output with clickable LinkedIn/GitHub/email links; filename includes the candidate's name and today's date (e.g. `Jane_Doe_Resume_2026-03-27.pdf`)
- **DOCX export** — always free; generated server-side with `python-docx`

### Resume Versioning
- **Save named versions** — snapshot the current resume state with a label (e.g. "Fintech v2")
- **Restore any version** — roll back to a previous snapshot at any time
- **Persisted across sessions** — backend resume ID stored in `localStorage` so the Save Version button stays active after a page refresh

### Authentication & Accounts
- **Email / password** registration and login
- **Google OAuth** — one-click sign-in via Google
- **Email verification** — OTP-based verification flow
- **Password reset** — secure token-based reset via email
- **Profile page** — edit name, contact details, social links; upload a profile photo

### Freemium & Payments
- **3 free PDF downloads per month** — no credit card required
- **DOCX always free**
- **Payment via Cashfree (UPI / cards)** — plans for Indian job seekers:

| Plan | Price | Access |
|------|-------|--------|
| Starter | ₹49 | 7-day unlimited |
| Single Download | ₹199 | One PDF |
| Basic Monthly | ₹399/mo | Monthly subscription |
| Pro Monthly | ₹649/mo | Pro monthly subscription |
| Lifetime | ₹999 | Unlimited forever |

### Reliability & Observability
- **Sentry** error monitoring (frontend + backend)
- **Rate limiting** on all API endpoints via `slowapi`
- **Security headers** middleware on every response
- **Request / response logging** with structured JSON logs
- **Health endpoint** at `/health` with DB connectivity check
- **Docker healthcheck** on the backend container

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion, React Router |
| Backend | FastAPI (Python), SQLAlchemy, Alembic, SQLite |
| AI | Gemini 3.1 Flash via Google AI REST API (direct `httpx` calls) |
| PDF parsing | pdfplumber, PyMuPDF |
| PDF export | `window.print()` (frontend) + reportlab (backend fallback) |
| DOCX export | python-docx |
| Auth | python-jose (JWT), bcrypt, Google OAuth 2.0 |
| Payments | Cashfree |
| Monitoring | Sentry |
| Frontend hosting | Vercel |
| Backend hosting | Oracle Cloud Free ARM (Docker Compose) |

---

## Architecture

```
Browser
  └── React SPA (Vercel CDN)
        │
        │  HTTPS  (via Vercel reverse-proxy /api/* → Oracle)
        ▼
  FastAPI backend  (Docker, Oracle Cloud ARM)
        ├── SQLite (persisted Docker volume)
        ├── Google AI REST API  (Gemini 3.1 Flash)
        └── Cashfree API  (payments)
```

The Vercel deployment includes an `api/[...path].js` catch-all that proxies every `/api/*` request to the Oracle Cloud backend, so the frontend and API share the same origin.

---

## Project Structure

```
.
├── frontend/                  # React + Vite SPA
│   └── src/
│       ├── pages/             # LandingPage, Dashboard (editor), CoverLetterPage, ProfilePage, ...
│       ├── templates/         # 10 resume templates (Classic, Modern, Professional, ...)
│       ├── components/        # OnboardingWizard, PaginatedPreview, section forms, ...
│       ├── hooks/             # useResumeState — resume data + localStorage state
│       ├── utils/             # skillUtils, fontScales, pdfExport, sectionMappers, ...
│       ├── api/client.ts      # Typed API wrapper
│       └── contexts/          # AuthContext
├── backend/                   # FastAPI application
│   ├── main.py                # All routes (auth, resume, AI, export, payments)
│   ├── models.py              # SQLAlchemy models
│   ├── resume_parser_ai.py    # PDF text → structured JSON (local heuristic parser)
│   ├── gemini_service.py      # Gemini 3.1 Flash integration
│   ├── resume_generator.py    # AI optimization + ATS bullet rewriting
│   ├── ats_scorer.py          # Keyword overlap scoring
│   ├── pdf_generator.py       # reportlab PDF export (3 templates)
│   ├── docx_generator.py      # DOCX export
│   ├── auth.py                # JWT, bcrypt, Google OAuth exchange
│   ├── payment.py             # Cashfree order creation + webhook
│   └── alembic/               # DB migrations
├── api/[...path].js           # Vercel proxy → Oracle backend
├── docker-compose.yml
└── vercel.json
```

---

## Local Development

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+
- A Google AI API key (for Gemini)

### Quick start

```bash
# Clone
git clone https://github.com/nnalin04/Resume-Builder.git
cd Resume-Builder

# Backend
cd backend
python3 -m venv venv && source venv/activate
pip install -r requirements.txt
cp .env.example .env          # fill in GEMINI_API_KEY and SECRET_KEY at minimum
uvicorn main:app --port 8000 --reload

# Frontend (separate terminal)
cd frontend
npm install
cp .env.example .env.local    # set VITE_API_BASE_URL=http://localhost:8000
npm run dev
```

Or use the convenience script from the repo root:

```bash
./run_app.sh                  # starts both backend + Vite dev server
```

### Environment variables

**Backend (`backend/.env`):**

| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | Yes | JWT signing secret |
| `GEMINI_API_KEY` | Yes | Google AI API key |
| `CASHFREE_APP_ID` | Payments | Cashfree app ID |
| `CASHFREE_SECRET_KEY` | Payments | Cashfree secret |
| `CASHFREE_ENV` | Payments | `SANDBOX` or `PRODUCTION` |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | Email features | SMTP credentials for password reset |
| `SENTRY_DSN` | Optional | Sentry error monitoring |
| `BACKEND_SECRET` | Optional | Internal proxy auth header |

**Frontend (`frontend/.env.local`):**

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Backend URL (e.g. `http://localhost:8000`) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID |

---

## Deployment

### Frontend — Vercel
Push to `main`. Vercel auto-deploys. No configuration needed beyond setting `VITE_API_BASE_URL` and `VITE_GOOGLE_CLIENT_ID` in the Vercel project environment variables.

### Backend — Oracle Cloud ARM

```bash
ssh -i ~/.ssh/oracle_vm.key ubuntu@<your-oracle-ip>
cd ~/Resume-Builder
git pull origin main
docker compose up -d backend
```

The backend runs behind the Vercel proxy — no separate domain or SSL certificate required on the Oracle instance.

---

## API Reference

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/register` | POST | — | Email + password registration |
| `/api/auth/login` | POST | — | Email + password login |
| `/api/auth/google` | POST | — | Google OAuth code exchange |
| `/api/auth/me` | GET / PUT | JWT | Get / update current user |
| `/api/auth/forgot-password` | POST | — | Send password reset email |
| `/api/auth/reset-password` | POST | — | Consume reset token |
| `/api/resumes` | GET | JWT | List user's resumes |
| `/api/upload-resume` | POST | JWT | Upload PDF, create resume record |
| `/api/parse-resume/{id}` | POST | JWT | Parse uploaded PDF → structured JSON |
| `/api/resume/{id}` | GET | JWT | Fetch resume + chat history |
| `/api/resume/{id}/sections` | PUT | JWT | Save edited sections |
| `/api/resume/{id}/versions` | POST / GET | JWT | Save / list named versions |
| `/api/resume/{id}/versions/{vid}/restore` | POST | JWT | Restore a version |
| `/api/ats-score` | POST | JWT | ATS keyword gap analysis |
| `/api/clarify` | POST | JWT | Get AI clarifying questions |
| `/api/generate-resume` | POST | JWT | AI-optimize resume against JD |
| `/api/chat` | POST | JWT | AI coaching chat |
| `/api/ai/rewrite` | POST | JWT | Stateless AI text rewrite |
| `/api/export/{id}` | GET | JWT | Export PDF or DOCX (freemium gated) |
| `/api/export/generate` | POST | JWT | Generate PDF from raw sections |
| `/api/export/generate-docx` | POST | JWT | Generate DOCX (always free) |
| `/api/cover-letter/generate` | POST | JWT | Generate cover letter |
| `/api/record-download` | POST | JWT | Record frontend PDF download (freemium gate) |
| `/api/payments/plans` | GET | — | List pricing plans |
| `/api/payments/create-order` | POST | JWT | Create Cashfree payment order |
| `/api/payments/verify` | POST | JWT | Verify + activate after payment |
| `/api/payments/webhook` | POST | — | Cashfree webhook handler |
| `/health` | GET | — | Health check |
