# AI Resume Builder — Claude Code Instructions

## Project Overview
Skill-driven AI Resume Builder. All resume workflows are managed through Claude skills.

## Backend
- **FastAPI** on `http://localhost:8000` (Python, SQLite, reportlab, spaCy)
- **Start**: `./run_app.sh` — starts backend + Next.js frontend
- **Backend only**: `cd backend && source venv/bin/activate && uvicorn main:app --port 8000`
- **Health check**: `curl http://localhost:8000/`

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
- `backend/resume_parser_ai.py` — PDF text → structured JSON sections
- `backend/resume_generator.py` — ATS optimization + bullet strengthening
- `backend/pdf_generator.py` — reportlab PDF export (3 templates)
- `backend/ats_scorer.py` — spaCy keyword overlap scoring
- `backend/main.py` — all FastAPI routes

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

## Lessons Learned — Roadblocks & Solutions

### 1. TypeScript `verbatimModuleSyntax: true`
**Problem:** All type-only imports must use `import type`. Using `import { SomeType }` for interfaces/types causes esbuild errors.
**Rule:** Always `import type { Foo }` for interfaces, types, and enums. Only use value imports for runtime values (functions, constants, classes).

### 2. PDF Export — Never use html2canvas / html2pdf.js
**Problem (html2pdf.js):** Measures `scrollHeight` not CSS `height: 1123px` → always creates a second blank page.
**Problem (html2canvas):** `windowWidth` option causes some child elements to collapse to 0px → `createPattern` error. Also misinterprets `pt` units at wrong DPI → text renders below background boxes. JPEG output desaturates blues.
**Solution:** Use `window.print()` with a `@media print` stylesheet that isolates `#resume-preview` in a fixed-position wrapper. This uses the native browser renderer — perfect colors, working links, exact layout, single page.

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
