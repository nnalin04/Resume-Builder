# AI Resume Builder — v1.1 Improvement Plan

Based on `GAP_ANALYSIS.md`. Each item has a checkbox — check it off when shipped.

**Deployment:** Always from `main` branch. `v1.0.0` tag = baseline before this sprint.

---

## Phase 1 — Quick Wins
> All single-file copy/placeholder changes. Zero risk. ~1 hour total.

- [x] **1.1** Fix chat tip #7 contradiction — `backend/resume_generator.py:434`
  - Change "Skills section at the bottom" → "For tech roles, skills above experience; for non-tech, experience first"

- [x] **1.2** ATS checklist copy update — `backend/resume_generator.py:415`
  - Remove "all 3 templates are ATS-safe" (app now has 10, two are multi-column)

- [x] **1.3** Remove "Seeking a role" from summary fallback — `backend/resume_generator.py:219`
  - Objective language → forward-looking positioning statement

- [x] **1.4** Skills version number placeholder — `frontend/src/pages/Dashboard.tsx`
  - Update skills input placeholder to show "Python 3.11, React 18, TypeScript 5..."

- [x] **1.5** DOCX button label — `frontend/src/pages/Dashboard.tsx`
  - Add "Recommended for ATS portals" label next to DOCX export button

- [x] **1.6** Project link placeholder — `frontend/src/components/ProjectsForm.tsx`
  - Change placeholder to "GitHub repo or live demo URL"

- [x] **1.7** Skills count hint — `frontend/src/pages/Dashboard.tsx`
  - Show live count badge "(12 skills)" next to the Skills section header

---

## Phase 2 — Frontend Features
> New UI elements. Frontend only, no backend changes. Each is independent.

- [x] **2.1** Multi-column ATS warning banner — `frontend/src/pages/Dashboard.tsx`
  - Show amber warning when TwoColumn or Professional template is selected
  - Text: "This template may fail ATS parsing. Use single-column for job portal submissions."

- [x] **2.2** Resume page count indicator — `frontend/src/pages/Dashboard.tsx`
  - Surface the existing `previewPageCount` state as a badge in the preview header
  - Green ≤ 2 pages, amber = 3, red ≥ 4

- [x] **2.3** Biodata warning in PersonalInfo form — `frontend/src/components/PersonalInfoForm.tsx`
  - Add info note: "For GCCs/MNCs: city + state only. No DOB, father's name, marital status, or photo."

- [x] **2.4** Summary word count display — `frontend/src/components/SummaryForm.tsx`
  - Live word counter below textarea, turns amber above 80 words

- [x] **2.5** Bullet metric coverage badge per role — `frontend/src/components/ExperienceForm.tsx`
  - Per-role badge: "3/5 bullets have metrics" (regex: `\d+[%$kKmMx]`)
  - Green ≥ 50%, amber < 50%

- [x] **2.6** Custom section heading guidance — `frontend/src/pages/Dashboard.tsx`
  - Added Custom Sections sidebar panel with ATS heading guidance note
  - Shows sections imported from PDF; guidance on standard ATS labels

- [x] **2.7** ATS score visual breakdown — `frontend/src/pages/Dashboard.tsx`
  - Progress bar (green/amber/red) + separate rows for Required vs Preferred skills
  - Added `atsRequiredMatched`/`atsPreferredMatched` state; data from API

- [x] **2.8** Education date range (start → end year) — `EducationForm.tsx` + `resumeTypes.ts` + 5 templates
  - Replace single "Year" field with "From" + "To (or Expected)" side-by-side inputs
  - Update `Education` type to add `start_year?: string`; update all 5 templates that render `edu.year`
  - Also update Certification date placeholder to hint at range format

- [x] **2.9** Reduce sidebar form input font size — all `*Form.tsx` components
  - Current `text-sm` (14px) is too large for the sidebar — reduce to 12px for better readability

---

## Phase 3 — Cross-Stack Features
> Mix of backend logic + frontend display. Each is independently shippable.

- [ ] **3.1** Tech stack field on projects ⚠ _touches all 10 templates_
  - `frontend/src/types/resumeTypes.ts` — add `techStack?: string` to `Project`
  - `frontend/src/components/ProjectsForm.tsx` — add Tech Stack input field
  - `frontend/src/templates/Template*.tsx` — render tech stack in all 10 templates (conditional, optional field)
  - `frontend/src/pages/Dashboard.tsx` — pass `techStack` through `resumeDataToSections` mapper
  - _Note: field is optional so existing resumes render identically_

- [ ] **3.2** Declining technology detection
  - `backend/resume_generator.py` — add `DECLINING_TECH` set + `detect_declining_tech()` helper
  - `backend/main.py` — add `declining_technologies` field to ATS score API response
  - `frontend/src/pages/Dashboard.tsx` — show amber warning if any declining tech detected

- [ ] **3.3** Bullet `[ADD METRIC]` placeholders — `backend/resume_generator.py`
  - In `_strengthen_bullet()`: if bullet has no numeric metric, append `[ADD METRIC]`
  - Update Gemini prompt in `backend/gemini_service.py` to do the same

- [ ] **3.4** Clarifying questions — project link check — `backend/resume_generator.py`
  - In `generate_clarifying_questions()`: if any project has no link, ask for GitHub/demo URL

---

## Phase 4 — Per-Job Tailoring Workflow
> Highest-ROI feature (219% more interviews per Jobscan). Largest effort.

- [ ] **4.1** Backend: duplicate resume endpoint
  - `backend/models.py` — add `job_label: Optional[str]` column (nullable, backward-compat)
  - `backend/main.py` — add `POST /api/resumes/{id}/duplicate` endpoint
  - Accepts `job_title` + `company` in request body, deep-copies resume sections, returns new ID

- [ ] **4.2** Frontend: duplicate button + job label display
  - `frontend/src/api/client.ts` — add `duplicateResume()` API method
  - `frontend/src/pages/Dashboard.tsx` — add "Duplicate for New Application" button + modal
  - Resume list — show `job_label` tag on each resume card
  - _Depends on 4.1_

- [ ] **4.3** Separate GitHub vs Live Demo link fields on projects ⚠ _batch with 3.1 to avoid touching templates twice_
  - `frontend/src/types/resumeTypes.ts` — add `demoLink?: string` to `Project`
  - `frontend/src/components/ProjectsForm.tsx` — split into "GitHub / Repo URL" + "Live Demo URL"
  - All 10 templates — render two conditional link icons
  - `frontend/src/pages/Dashboard.tsx` — pass `demoLink` through mapper

---

## Summary

| Phase | Items | Effort | Layer |
|-------|-------|--------|-------|
| 1 — Quick Wins | 7 | ~1 hr | Backend + Frontend (single files) |
| 2 — Frontend Features | 7 | ~1 day | Frontend only |
| 3 — Cross-Stack | 4 | ~1 day | Backend + Frontend |
| 4 — Per-Job Tailoring | 3 | ~2 days | Full-stack |

**Total: 21 items across 4 phases**

---

## Notes

- **Locked features — do not touch:** PDF download flow (`window.print()`), `#resume-print-area` div, `handleExport` in Dashboard, `@media print` CSS, PDF upload parsing
- **Template changes (3.1, 4.3):** Batch together — both touch all 10 templates, do in one pass
- **Database changes (4.1):** Use `ALTER TABLE ... ADD COLUMN ... DEFAULT NULL` for SQLite compatibility
- **v1.0.0 tag:** Baseline before this sprint. `git diff v1.0.0..HEAD` shows all changes made.
