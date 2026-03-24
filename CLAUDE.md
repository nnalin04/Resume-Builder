# AI Resume Builder — Claude Code Instructions

## Project Overview
AI Resume Builder SaaS — production-ready with auth, freemium payments (Cashfree), multi-user support.
Skill-driven workflows managed through Claude skills.

## Production Stack
| Component | Tech | Notes |
|-----------|------|-------|
| Backend | FastAPI (Python) | JWT auth, Cashfree payments, freemium |
| Frontend | React + Vite | React Router, auth context, pricing page |
| Database | SQLite → PostgreSQL | Add user_id to all resume rows |
| AI | Gemini 2.5 Flash | Free tier covers ~1,000 req/day |
| PDF | reportlab (backend) / window.print() (frontend) | |
| Payments | Cashfree (1.6% promo — sign up before March 31, 2026!) | |
| Hosting | Oracle Cloud Free ARM + Cloudflare Pages | |

## Backend
- **FastAPI** on `http://localhost:8000` (Python, SQLite, reportlab)
- **Start**: `./run_app.sh` — starts backend + Vite frontend
- **Backend only**: `cd backend && source venv/bin/activate && uvicorn main:app --port 8000`
- **Health check**: `curl http://localhost:8000/`
- **Install deps**: `cd backend && pip install -r requirements.txt`

## Available Skills

| Skill | Trigger | Description |
|-------|---------|-------------|
| `/resume-generate` | Upload PDF + optional JD | Full pipeline: parse → ATS-optimize → export PDF |
| `/resume-update` | Resume ID + changes | Edit sections → re-optimize → re-export PDF |
| `/resume-ats` | Resume ID + job description | ATS keyword score + gap analysis + fix recommendations |
| `/resume-coach` | Resume ID | Interactive coaching chat — bullets, summary, career narrative |

## Skill-First Workflow

Always use skills for resume operations. Never call the backend API directly unless debugging.

**Typical flow:**
1. `/resume-generate sample_resume.pdf "Senior Backend Engineer at fintech"` → get initial PDF
2. `/resume-ats 1 "job description text"` → check keyword coverage
3. `/resume-update 1 "add Kafka and Redis to skills, rewrite summary for fintech"` → apply fixes
4. `/resume-coach 1 "Senior Backend Engineer JD"` → get bullet coaching

## API Reference (for skill development)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/upload-resume` | POST (multipart) | Upload PDF |
| `/api/parse-resume/{id}` | POST | Parse PDF → structured JSON |
| `/api/resume/{id}` | GET | Full resume + chat history |
| `/api/resume/{id}/sections` | PUT | Save edited sections |
| `/api/ats-score` | POST | ATS keyword analysis |
| `/api/clarify` | POST | Get clarifying questions |
| `/api/generate-resume` | POST | ATS-optimize resume |
| `/api/chat` | POST | Resume coaching chat |
| `/api/export/{id}` | GET | Export PDF/MD/JSON |
| `/api/resumes` | GET | List all resumes |

## Resume Data Schema

```json
{
  "contact":        { "name", "email", "phone", "location", "linkedin", "github", "website" },
  "summary":        "string",
  "experience":     [{ "company", "title", "location", "start_date", "end_date", "bullets": [] }],
  "education":      [{ "institution", "degree", "field", "graduation_date", "gpa" }],
  "skills":         { "languages": [], "frameworks": [], "tools": [], "databases": [], "other": [] },
  "projects":       [{ "name", "description", "tech_stack": [], "link" }],
  "certifications": [{ "name", "issuer", "date" }]
}
```

## PDF Templates
- `classic` — Times-Roman, navy headers (finance/law/academia)
- `modern` — Helvetica, blue accents (tech/product)
- `technical` — Helvetica, skills-first, green accents (engineering/DevOps)

## Key Files
- `backend/main.py` — all FastAPI routes (auth + payments + resume + export)
- `backend/auth.py` — JWT creation/verification, password hashing, Google OAuth exchange
- `backend/payment.py` — Cashfree order creation, verification, webhook handler
- `backend/models.py` — User, Resume, GeneratedResume, Payment, Subscription models
- `backend/resume_parser_ai.py` — PDF text → structured JSON sections
- `backend/resume_generator.py` — ATS optimization + bullet strengthening
- `backend/pdf_generator.py` — reportlab PDF export (3 templates)
- `backend/ats_scorer.py` — spaCy keyword overlap scoring
- `backend/.env` — all secrets (NEVER commit to git)

## Auth Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/register` | POST | Email/password registration |
| `/api/auth/login` | POST | Email/password login |
| `/api/auth/google` | POST | Google OAuth code exchange |
| `/api/auth/me` | GET | Get current user (Bearer token) |

## Payment Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/payments/plans` | GET | List pricing plans |
| `/api/payments/create-order` | POST | Create Cashfree payment order |
| `/api/payments/verify?order_id=X` | POST | Verify + activate after payment |
| `/api/payments/webhook` | POST | Cashfree webhook handler |

## Freemium Logic
- **Free tier**: 1 PDF download per user (tracked in `users.free_downloads_used`)
- **After free download**: `/api/export/{id}?format=pdf` returns HTTP 402 with `{ code: "PAYMENT_REQUIRED" }`
- **Frontend**: catches 402 and redirects to `/pricing`
- **Plans**: ₹199 one-time, ₹399/mo basic, ₹649/mo pro
- **URGENT**: Sign up for Cashfree before **March 31, 2026** for 1.6% promotional rate

## Frontend Architecture (React + Vite)
Key files:
- `frontend/src/App.tsx` — BrowserRouter, AuthProvider, all routes
- `frontend/src/contexts/AuthContext.tsx` — user state, login/logout, token management
- `frontend/src/api/client.ts` — typed API wrapper (auth + payments + resumes)
- `frontend/src/pages/LoginPage.tsx` — email/password + Google OAuth login
- `frontend/src/pages/RegisterPage.tsx` — registration
- `frontend/src/pages/PricingPage.tsx` — plan selection + Cashfree checkout
- `frontend/src/pages/PaymentSuccessPage.tsx` — post-payment verification
- `frontend/src/pages/GoogleCallbackPage.tsx` — OAuth redirect handler
- `frontend/src/pages/Dashboard.tsx` — main editor (auth-aware, shows upgrade CTA)

---

## Frontend Architecture (React + Vite)

The React frontend lives in `frontend/`. Key files:
- `frontend/src/pages/Dashboard.tsx` — main UI, template selector, font size controls, PDF export
- `frontend/src/templates/` — 5 resume templates: Classic, Modern, Professional, TwoColumn, Clean
- `frontend/src/components/ContactIcons.tsx` — shared Bootstrap SVG icons (geo-alt, telephone, envelope, linkedin, github)
- `frontend/src/utils/fontScales.ts` — font size multipliers (small=1.0, medium=1.15, large=1.32)
- `frontend/src/utils/pdfExport.ts` — PDF export via `window.print()` with isolated print stylesheet
- `frontend/src/hooks/useResumeState.ts` — resume data state management
- `frontend/src/types/resumeTypes.ts` — TypeScript interfaces (`ResumeData`, `TemplateId`, etc.)

### Templates
All 5 templates follow the same pattern:
- Props: `{ data: ResumeData; fontSize?: FontSize }`
- Font scaling via `fm = FONT_MULT[fontSize]` and `f = (px) => Math.round(px * fm * 10) / 10`
- Sub-components (BulletLines, SectionTitle, etc.) receive `fm: number` as prop
- Root div always has `width: 794px, height: 1123px, overflow: hidden` for A4 compliance
- Root div has `wordBreak: 'break-word', overflowWrap: 'break-word'` to prevent text overflow
- Flex rows with company+date have `flexWrap: 'wrap', gap: '0 8px'` and date span has `flexShrink: 0`

### TemplateId values
`'classic' | 'modern' | 'professional' | 'twocolumn' | 'clean'`

---

## 🔒 LOCKED FEATURES — DO NOT MODIFY

These features are **confirmed working in production**. Do not touch the implementation
files or flow listed here without explicit user instruction. If a future change accidentally
breaks one of these, revert to the commit hash shown.

### PDF Download (locked at commit `a4ad0d2`)
**Status: WORKING** — all 10 templates, clickable LinkedIn/GitHub/email links, freemium gate.

**How it works:**
1. User clicks "Download PDF"
2. `handleExport` in `Dashboard.tsx`:
   - If logged in: calls `api.recordDownload()` (freemium gate — returns 402 if limit hit → navigate to `/pricing`)
   - Calls `refreshUser()` to update download counter in UI
   - Calls `resume.clearDraft()`
   - Calls `window.print()`
3. `@media print` CSS in `index.css` hides `body *` via `visibility: hidden`, then shows only `#resume-print-area`
4. `#resume-print-area` div (at bottom of Dashboard JSX, normally `display: none`) renders `<PreviewComponent>` at 100% scale — no clipping, no transforms
5. Browser print dialog opens — user clicks "Save as PDF"
6. `a[href]::after { content: none }` prevents Chrome from appending raw URLs after links

**Files involved — do not change the core flow:**
- `frontend/src/pages/Dashboard.tsx` — `handleExport`, `#resume-print-area` div
- `frontend/src/index.css` — `#resume-print-area` + `@media print` rules
- `backend/main.py` — `/api/record-download` endpoint
- `backend/main.py` — `_is_free_tier`, `_check_download_access` (compare naive UTC datetimes only)

**Why `window.print()` and NOT backend PDF:**
- Backend `pdf_generator.py` only supports 3 templates (classic/modern/technical); frontend has 10
- Backend reportlab renders contact links as plain text; templates have `<a>` tags
- `window.print()` prints the exact rendered React template — pixel-perfect, all templates, clickable links

**Why `#resume-print-area` and NOT printing PaginatedPreview:**
- PaginatedPreview clips each page via `overflow: hidden` + `translateY(-offset)` — incompatible with print
- The dedicated `#resume-print-area` renders the full template without clipping; browser paginates naturally

### PDF Upload (working, minor UI gaps acceptable)
**Status: WORKING** — file accepted, text extracted, AI parses into structured data, all major sections mapped (experience, skills, education, projects, certifications, customSections).
Minor gap: some view details in the parsed result display are missing — acceptable for now.

---

## Lessons Learned — Roadblocks & Solutions

### 1. TypeScript `verbatimModuleSyntax: true`
**Problem:** All type-only imports must use `import type`. Using `import { SomeType }` for interfaces/types causes esbuild errors.
**Rule:** Always `import type { Foo }` for interfaces, types, and enums. Only use value imports for runtime values (functions, constants, classes).

### 2. PDF Export — window.print() with dedicated #resume-print-area (WORKING — DO NOT CHANGE)
**Problem (html2pdf.js):** Measures `scrollHeight` not CSS `height: 1123px` → always creates a second blank page.
**Problem (html2canvas):** `windowWidth` option causes some child elements to collapse to 0px → `createPattern` error. Also misinterprets `pt` units at wrong DPI → text renders below background boxes. JPEG output desaturates blues.
**Problem (backend reportlab):** Only knows 3 templates; renders contact links as plain text — NOT `<a>` tags.
**Problem (printing PaginatedPreview directly):** PaginatedPreview clips each page via `overflow:hidden` + `translateY` — print removes clipping and the output is garbage.

**Working solution (commit `a4ad0d2`):**
- Add a `<div id="resume-print-area" style={{ display: 'none' }}>` at the bottom of Dashboard JSX
- It renders `<PreviewComponent data={resume.resumeData} fontSize={fontSize} />` — the full template, no clipping
- `@media print`: `body * { visibility: hidden }` then show only `#resume-print-area` at `position: fixed; top:0; left:0`
- `a[href]::after { content: none !important }` stops Chrome adding raw URLs after links
- Call `window.print()` from `handleExport` AFTER `api.recordDownload()` + `refreshUser()`

### 3. CSS Units — Never use `pt` in templates
**Problem:** html2canvas misinterprets `pt` units (wrong DPI ratio), causing text to render below its background box. Even after switching to `window.print()`, `pt` units can cause misalignment.
**Rule:** All font sizes in React templates must use `px` (or numbers, which React treats as px). Never use `pt`, `em`, or `rem` in template inline styles.

### 4. CSS `transform: scale()` does not affect layout dimensions
**Problem:** When using `transform: scale(0.88)` on the preview, the element's layout box stays at the original 794×1123px. The scroll container measured 1123px height (full size) not the visually scaled 988px, so the page appeared clipped.
**Solution:** Wrap the scaled element in a placeholder div with explicit dimensions = `width * scale` × `height * scale`. This gives the scroll container the correct dimensions to measure.

### 5. CSS `zoom` causes horizontal overflow — do NOT use for font scaling
**Problem:** Applying `zoom: 1.25` to a 794px template makes its layout box 992px. With `overflow: hidden` on the 794px container, the right 198px is clipped. Text appears to "go out of the right page".
**Solution:** Use a font multiplier (`FONT_MULT`) passed as a prop to templates. Templates apply `f = (px) => px * fm` to every font size value. This changes actual text sizes without touching layout dimensions or container sizes.

### 6. React accepts numbers for `fontSize` (px)
**Fact:** `style={{ fontSize: 12 }}` is valid React — treated as 12px. No need for `'12px'` string. Use this for computed font sizes: `fontSize: f(10.9)` instead of `fontSize: f(10.9) + 'px'`.

### 7. Skill tags / inline-flex text alignment
**Problem:** Skill tag text appeared at center-bottom of pill instead of centered.
**Cause:** Parent container had `lineHeight: 2` which pushed inline-block children to bottom.
**Solution:** Use `display: 'inline-flex', alignItems: 'center', lineHeight: 1` on each tag span.

### 8. Preview scroll with `transform: scale`
**Pattern that works:**
```tsx
{/* Outer placeholder — gives scroll container correct dimensions */}
<div style={{ width: RESUME_W * scale, height: RESUME_H * scale, flexShrink: 0 }}>
  {/* Inner transform — visually scales the resume */}
  <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: RESUME_W, height: RESUME_H, overflow: 'hidden' }}>
    <PreviewComponent />
  </div>
</div>
```

### 9. Blank white screen — React render errors
**Diagnosis:** Add an `ErrorBoundary` class component wrapping `<App>` to catch and display render errors in the browser.
**Common causes in this project:**
- `import { SomeInterface }` instead of `import type { SomeInterface }` (verbatimModuleSyntax)
- Unused `import React` in functional components (React 19 doesn't need it)
- Tailwind CSS classes in Dashboard breaking layout (switched to full inline styles)

### 10. Font size "Small/Medium/Large" — what it means
**User expectation:** "Font size" means the actual typographic scale of text inside the resume, NOT the preview zoom level.
**Implementation:** Pass `fontSize: FontSize` prop to each template. Templates use a multiplier (`FONT_MULT = { small: 1.0, medium: 1.15, large: 1.32 }`) applied via `f(px)` helper to every font size value. Preview zoom is always fixed at 0.88.

### 11. Contact icons — use Bootstrap Icons SVGs, not emoji
**Problem:** Emoji icons (📍📞✉) look inconsistent and unprofessional in resumes.
**Solution:** Use inline SVG paths from Bootstrap Icons (`icons.getbootstrap.com`). Store in `src/components/ContactIcons.tsx` as React components accepting `size` and `color` props. Icons used: `geo-alt`, `telephone`, `envelope`, `linkedin`, `github`.

### 12. Preventing text overflow at larger font sizes
**Required on template root div:**
```tsx
wordBreak: 'break-word',
overflowWrap: 'break-word',
```
**Required on bullet text spans:**
```tsx
overflowWrap: 'break-word',
minWidth: 0,  // critical in flex children
```
**Required on company+date flex rows:**
```tsx
flexWrap: 'wrap',
gap: '0 8px',
// date span:
flexShrink: 0,
```

---

## Agents (`.claude/agents/`)

| Agent | When to use |
|-------|-------------|
| `architect` | Designing new feature architecture (payments, auth flows, DB schema) |
| `reviewer` | Review PRs / changed files for correctness |
| `security-engineer` | OWASP review of auth, payments, API security |
| `planner` | Planning complex multi-file features |
| `devops-engineer` | Docker, deployment, Oracle Cloud, Cloudflare setup |
| `build-error-resolver` | Fix pip/npm build failures |
| `qa-tester` | Write + run test cases |

## Commands (`.claude/commands/`)

| Command | Purpose |
|---------|---------|
| `/code-review` | Spawn reviewer on changed files |
| `/plan` | Plan a complex feature |
| `/deploy` | Guided deployment checklist |
| `/health-check` | Verify all services are healthy |
| `/quality-gate` | Full quality check before merge |
| `/verify` | Verify build + tests pass |
| `/build-fix` | Fix build errors incrementally |

## Skills (`.claude/skills/`)

### Resume Skills
| Skill | Trigger |
|-------|---------|
| `/resume-generate` | Upload PDF + optional JD → ATS-optimized PDF |
| `/resume-update` | Edit sections → re-optimize |
| `/resume-ats` | ATS score + gap analysis |
| `/resume-coach` | Interactive coaching chat |
| `/resume-add-template` | Add a new React template |
| `/resume-frontend` | Frontend UI work |
| `/resume-html-export` | Export standalone HTML resume |

### Engineering Workflow
| Skill | Purpose |
|-------|---------|
| `/api-design` | Design REST API contracts before writing code |
| `/api-docs` | Generate OpenAPI 3.0 spec from existing routes |
| `/backend-patterns` | FastAPI/Python patterns and anti-patterns |
| `/python-patterns` | Python idioms, async patterns, error handling |
| `/python-testing` | pytest test writing patterns |
| `/tdd-workflow` | Test-driven development coaching |
| `/test-coverage` | Audit + improve test coverage |
| `/database-migrations` | Safe DB migration patterns (SQLite → Postgres) |
| `/docker-patterns` | Docker Compose for Oracle Cloud ARM deployment |
| `/deployment-patterns` | Blue/green, rolling deploy strategies |
| `/deploy-check` | Pre-deploy checklist — GO/NO-GO decision |
| `/commit-push` | Stage, commit, push with clean message |
| `/performance-analysis` | Identify and fix backend/frontend bottlenecks |
| `/verification-loop` | Verify build + tests pass iteratively |

### Security
| Skill | Purpose |
|-------|---------|
| `/security-audit` | OWASP API Top 10 audit (auth, payments, JWT) |
| `/security-review` | Focused security review of changed code |
| `/security-scan` | Automated scan for common vulnerabilities |
| `/env-audit` | Audit .env files for missing/placeholder secrets |

### AI & Product
| Skill | Purpose |
|-------|---------|
| `/ai-first-engineering` | AI-first dev principles for resume AI features |
| `/agentic-engineering` | Eval-first, cost-aware model routing |
| `/prd` | Generate or refine a PRD |
| `/ui-review` | Review React UI for UX issues |

### Project Management
| Skill | Purpose |
|-------|---------|
| `/pm` | Single entry point that routes all work |
| `/project-status` | Current project health snapshot |
| `/standup` | Generate standup report |
| `/task-board` | View + update task board |
| `/qa-report` | Generate QA test report |
| `/release-notes` | Generate release notes from commits |
| `/retrospective` | Process learnings into memory/patterns |
| `/rollback` | Guided rollback procedure |
| `/service-logs` | Tail + analyze backend logs |
| `/bug-report` | Guided bug documentation + triage |

### Meta (Skill/Agent Management)
| Skill | Purpose |
|-------|---------|
| `/skill-builder` | Create or improve a skill |
| `/improve` | Targeted rewrite of one skill or agent |
| `/build-agent` | Create a new agent for a missing role |
| `/split-skill` | Split an oversized skill (>200 lines) |
| `/memory` | Store/query cross-session memory |
| `/code-review` | Spawn reviewer agent on changed files |
| `/e2e-testing` | E2E test writing patterns |
