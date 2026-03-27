## GAP ANALYSIS — Resume Builder vs Best-Practice Resume Guide

---

### SECTION 1: What the app already does well

- **ATS keyword scoring** via `/api/ats-score` with Gemini-powered structured extraction that separates required vs preferred skills (2x weight for required)
- **Weak verb detection and replacement** — `WEAK_TO_STRONG` map in `resume_generator.py` replaces "worked on", "helped", "responsible for", etc. with stronger action verbs
- **Skill categories with toggle** — users can switch between flat list and categorized view (Languages / Frameworks / Tools / Databases / Other)
- **Clickable links in PDF** — `window.print()` approach with `a[href]::after { content: none }` correctly preserves clickable LinkedIn, GitHub, email links in the exported PDF
- **DOCX export** — `exportToDOCX` utility exists and is imported in Dashboard.tsx, giving users the Word format the guide recommends for maximum ATS parsing accuracy
- **Gemini-powered resume optimization** — `generate_optimized_resume` tries Gemini first with rule-engine fallback; injects JD keywords, regenerates summary, strengthens bullets
- **Clarifying questions for missing metrics** — `generate_clarifying_questions` detects when fewer than 50% of bullets contain numbers and asks the user for quantified data
- **Summary generation and coaching** — summary section with AI rewrite; chat coaching handles "improve summary" intent
- **Certifications section** — structured certifications with name, issuer, date
- **Custom sections** — `CustomSection` type allows arbitrary section headings and items (useful for publications, awards, open-source)
- **Hidden sections toggle** — items have `hidden` field; users can hide individual entries without deleting them
- **10 templates** — Classic, Modern, Professional, Two-Column, Clean, Minimal, Executive, Tech, Finance, Creative; covers finance, tech, and creative domains
- **Font size control** — Small/Medium/Large multipliers applied consistently via `FONT_MULT` without breaking layout
- **Onboarding wizard** — guides new users through initial setup
- **ATS tips in chat** — `_chat_ats()` provides an ATS checklist; `_chat_tips()` provides top-10 resume tips
- **Personal info includes LinkedIn and GitHub** — both fields present in `PersonalInfo` type, rendered as clickable links in all templates
- **Bootstrap icons for contact info** — professional SVG icons instead of emoji in rendered output

---

### SECTION 2: Critical gaps (high impact, missing entirely)

---

**GAP:** ATS parsing warning for multi-column templates (TwoColumn, Professional)

**Why it matters:** The guide states multi-column layouts cause parsing failures in over 70% of ATS systems — the single most damaging structural choice a candidate can make.

**How to add it:** In `Dashboard.tsx`, when `templateId === 'twocolumn' || templateId === 'professional'`, render a yellow warning banner above the preview panel: *"⚠ This template uses a multi-column layout. Many ATS systems (including those used by large companies) may misread or skip your content. Use for human-reviewed applications only — switch to a single-column template when applying via an online portal."* No backend changes needed.

---

**GAP:** Real-time bullet quality indicator (metric coverage per role)

**Why it matters:** The guide's core claim is that every bullet must contain a quantified outcome — percentage, dollar amount, scale figure, or time saved — and that this single factor separates a 6/10 resume from a 9/10 resume.

**How to add it:** In `ExperienceForm` (or wherever bullets are edited), parse each bullet line in real-time with a simple regex (`/\d+[%$kKmM]?|\d{2,}/`). Show a per-role badge like "3/5 bullets have metrics ✓" or "0/4 bullets have metrics ✗" directly beneath each experience entry. No backend required — pure frontend regex.

---

**GAP:** Per-job tailoring workflow

**Why it matters:** Jobscan data cited in the guide shows tailoring a resume to each job description boosts interview invitations by 219%; one version sent everywhere is the single most costly mistake candidates make.

**How to add it:** Add a "Duplicate for New Application" button in the dashboard that clones the current resume (calls `POST /api/resumes` with copied sections), then prompts the user to enter a target job title/company. Display a label on each resume card in the resume list showing which job it was tailored for. This is a backend + frontend change but is the single highest-ROI feature missing.

---

**GAP:** Biodata / personal info warnings for modern hiring

**Why it matters:** The guide explicitly calls out that DOB, father's name, marital status, and photos are "biodata-era elements considered outdated for product companies and MNCs" — candidates still include them out of habit, hurting their applications.

**How to add it:** In `PersonalInfoForm`, add a dismissible info box: *"For product companies and GCCs: include city/state only. Remove date of birth, father's name, marital status, and photo — these are not expected and can introduce unconscious bias."* Single-file change, no backend.

---

**GAP:** Tech stack as a first-class field on projects

**Why it matters:** The guide requires each project to list the tech stack "prominently" alongside a descriptive title and clickable links — recruiters scan projects for specific technologies, not just prose descriptions.

**How to add it:** Add a `techStack: string` field to the `Project` interface in `resumeTypes.ts`. Update `ProjectsForm` to add a "Tech Stack" input (comma-separated). Update all 10 templates to render the tech stack as a styled tag row directly under the project title (similar to the existing skill tag style). The backend `resume_parser_ai.py` already parses `tech_stack` from uploaded PDFs — the frontend just needs to display it.

---

**GAP:** Resume page count indicator and length guidance

**Why it matters:** The guide is explicit: 1 page for <5 years, 1–2 pages for seniors; 3-page resumes are academic CVs only. Users have no way to know how many pages their content fills without downloading the PDF.

**How to add it:** `PaginatedPreview` already paginates the content. Expose its page count in the preview header: *"2 pages"* with a color-coded badge (green ≤2, yellow = 3, red ≥4). A single prop passed up from `PaginatedPreview` to `Dashboard` is sufficient.

---

**GAP:** Skills version number guidance

**Why it matters:** The guide calls version numbers "the most commonly missed signal on Java resumes" — "Java 17" vs "Java" is the difference between looking current and looking like a legacy-maintenance candidate. This applies equally to Python 3.11, React 18, Node.js 22, etc.

**How to add it:** Add placeholder text in the skills input field: *"Include version numbers where relevant — e.g. Python 3.11, React 18, Node.js 22, PostgreSQL 16"*. Add a tooltip icon next to "Technical Skills" with the same guidance. Single-file UI change.

---

**GAP:** .docx export surfaced and labeled for ATS use

**Why it matters:** Jobscan testing confirms some ATS systems parse Word files more reliably than PDFs; having DOCX available is meaningless if users don't know to use it for portal submissions.

**How to add it:** The `exportToDOCX` function already exists and is imported. Ensure the DOCX button is visible in the export panel (verify it renders in the UI, not just imported). Add a label next to it: *"Recommended for ATS portals"* and next to the PDF button: *"Best for email / direct referrals"*.

---

**GAP:** Declining technology detection warning

**Why it matters:** The guide explicitly lists technologies that hurt a modern resume: Struts, Ant, SVN, SOAP, Spring MVC listed separately from Spring Boot — seeing them tells a senior technical reviewer the candidate is maintenance-mode, not growth-mode.

**How to add it:** In the skills section, run a simple client-side check against a small denylist (`['struts', 'ant', 'svn', 'soap', 'spring mvc', 'ejb', 'jsp']`). If a match is found, show an inline warning: *"⚠ [Technology] is considered legacy — only include if the target role specifically requires it."* Frontend-only change.

---

**GAP:** Standard section heading enforcement for custom sections

**Why it matters:** The guide states ATS systems skip entire sections when headings use non-standard labels like "My Journey" or "Career Highlights" — custom sections are the likeliest place users will write creative labels.

**How to add it:** In `CustomSection` form, add a helper text: *"Use standard labels ATS systems recognise: Volunteer Work, Publications, Awards, Open Source, Languages, Interests. Avoid creative alternatives."* Optionally add a dropdown of suggested headings.

---

### SECTION 3: Enhancement opportunities (existing features that could be better)

---

**FEATURE:** ATS score display

**Current state:** Returns a 0–100 score with matched/missing keyword lists, and required vs preferred breakdown from Gemini.

**Improvement:** Render the score as a visual dial or progress bar with color coding (red <50, yellow 50–70, green >70). Break out "Required skills matched: 6/8" and "Preferred skills matched: 4/7" as separate rows so users immediately see which gaps are blocking vs nice-to-have. The data already exists in the API response (`required_matched`, `required_missing`, `preferred_matched`, `preferred_missing`).

---

**FEATURE:** Summary generation (rule-engine fallback)

**Current state:** Generates a template-based summary: "[X]+ years of experience as [title] at [company], specialising in [langs] and [frameworks]. Seeking a [role] role in [industry]..."

**Improvement:** The guide requires the summary to (a) be under 80 words, (b) lead with role identity + years + primary stack, and (c) anchor with one quantified proof point. The fallback summary never includes a metric. Add a word count check and, if the resume has any quantified bullets, extract the most impressive metric and append it to the summary. Also: the rule engine places "Seeking a [role] role" which reads as an objective statement — the guide explicitly says objective statements are outdated. Change to a positioning statement ending.

---

**FEATURE:** Chat tips content

**Current state:** `_chat_tips()` tip #7 says "Skills section at the bottom — ATS reads top-to-bottom; experience first."

**Improvement:** This directly contradicts the guide, which states "Technical skills section belongs above work experience for backend developers" and that this structure "generates 34% more positive responses." Update tip #7 to: "For tech roles, put your skills section above experience; for non-tech roles, experience comes first."

---

**FEATURE:** Bullet strengthening (rule-engine fallback)

**Current state:** Replaces weak verb phrases at the start of each bullet (e.g., "worked on" → "Engineered"). Adds a period. Does not add metrics.

**Improvement:** After verb replacement, check if the bullet contains a number. If not, append a coaching hint in the chat response: *"Add a metric to this bullet — how many users affected, % performance gain, or $ cost saved?"* The Gemini prompt for `optimize_resume` should explicitly instruct the model to add plausible metric placeholders (e.g., "~X%", "N+ users") marked with `[ADD METRIC]` for the user to fill in.

---

**FEATURE:** Project section display

**Current state:** Projects show `name`, `description`, and `link` only. No tech stack field. Link is a single field with no label.

**Improvement:** (1) Add the `techStack` field described in Section 2. (2) Rename the single `link` field to two fields: `githubUrl` and `liveUrl`, or keep one field but add a label ("GitHub / Live Demo"). The guide specifically says recruiters look for deployed links and GitHub repos as separate signals. (3) Add a word-count or line-count limit hint: "2–4 bullet points recommended."

---

**FEATURE:** Clarifying questions logic

**Current state:** Checks: quantified bullets <50%, missing summary, target role <30 chars, skills <5, no certifications.

**Improvement:** Add two more checks aligned to the guide: (a) if any project has no link, ask "Do you have a GitHub or live demo link for [project name]?"; (b) if the summary exceeds 80 words or is absent, specifically ask for one quantified proof point to anchor it.

---

**FEATURE:** Section ordering guidance

**Current state:** The section order in the editor sidebar (personal → summary → skills → experience → projects → education → certifications) is fixed and matches the guide's recommended order for tech resumes. However, there is no explanation of why this order matters.

**Improvement:** Add a collapsed "Why this order?" tooltip or info icon next to the section nav that explains the guide's logic: "Skills above experience increases recruiter response by 34% for tech roles. Contact and summary are always first because eye-tracking shows 70% of initial scan time is spent on the top third of the page."

---

### SECTION 4: Prioritized build list

| Priority | Feature | Impact | Effort | Notes |
|----------|---------|--------|--------|-------|
| 1 | Per-job tailoring workflow (duplicate resume + job label) | High | M | 219% more interviews per Jobscan; biggest conversion driver |
| 2 | ATS warning banner for multi-column templates | High | S | 70% parse failure rate; single-file frontend change |
| 3 | Real-time bullet metric coverage indicator | High | S | Core quality signal; pure frontend regex, no backend |
| 4 | Surface DOCX export with "Recommended for ATS portals" label | High | S | Feature already built; just needs UI label |
| 5 | Tech stack field on projects | High | M | Required for credible project entries; needs type + form + 10 template changes |
| 6 | Resume page count indicator in preview | Med | S | Users have no visibility into length; PaginatedPreview already has page data |
| 7 | Fix chat tip #7 (skills order contradiction) | High | S | 1-line copy fix but directly contradicts guide's 34% stat |
| 8 | Biodata warning in PersonalInfo form | Med | S | Stops candidates from self-sabotaging for GCC/MNC applications |
| 9 | Skills version number guidance (placeholder + tooltip) | Med | S | Most commonly missed signal per guide; no-code change |
| 10 | ATS score visual breakdown (required vs preferred dial) | Med | S | Data already returned by API; frontend rendering only |
| 11 | Summary quality improvement (80-word limit, remove "Seeking") | Med | M | Fallback path only; Gemini path already better |
| 12 | Declining technology detection warning | Med | S | Denylist of ~7 terms; frontend-only |
| 13 | Standard section heading guidance for custom sections | Med | S | Prevents ATS from skipping custom sections |
| 14 | Bullet strengthening → prompt for metric if none found | Med | M | Requires Gemini prompt update + chat UX change |
| 15 | Gemini bullet prompt: add `[ADD METRIC]` placeholders | High | M | Transforms AI output from duty-list to achievement-list |
| 16 | Project section: separate GitHub vs live demo link fields | Low | M | Nice UX improvement but not blocking |
| 17 | Section ordering "why this order?" tooltip | Low | S | Educational; doesn't change behavior |
| 18 | Clarifying questions: add project link check | Low | S | Small improvement to existing feature |

---

### SECTION 5: Quick wins (can be shipped in < 1 hour each)

1. **Fix chat tip #7** — change "Skills section at the bottom" to "For tech roles, skills go above experience (34% more recruiter responses); for non-tech roles, experience comes first." (`backend/resume_generator.py:426`)

2. **Multi-column ATS warning banner** — add a conditional `<div>` in `Dashboard.tsx` when `templateId === 'twocolumn' || templateId === 'professional'` with a yellow warning about ATS parsing failures.

3. **Skills placeholder text** — update the placeholder/label in the skills input to read: *"Tip: include version numbers — e.g. Python 3.11, React 18, PostgreSQL 16"*

4. **DOCX button label** — add `(ATS-safe)` or `"Best for job portals"` next to the DOCX export button, and `"Best for email referrals"` next to PDF.

5. **Biodata warning in PersonalInfo** — add a `<small>` note in `PersonalInfoForm`: *"For product companies & GCCs: city + state only. Do not add date of birth, father's name, or marital status."*

6. **Summary word count** — add a live character/word counter below the summary textarea showing current word count with a "(aim for under 80 words)" hint. Single-file change.

7. **Project link placeholder** — change the `link` input placeholder from "https://..." to "GitHub repo or live demo URL" to prompt users that deployed links are expected.

8. **ATS checklist update** — in `_chat_ats()` (`resume_generator.py:413`), the checklist says "✅ Use a single-column layout (done — all 3 templates are ATS-safe)" which is outdated (there are now 10 templates, 2 of which are multi-column). Update to: "⚠ If using Two-Column or Professional templates, switch to single-column before submitting to ATS portals."

9. **Skills count hint** — add a note below the skills section: *"Aim for 15–25 skills across 4–6 categories. Fewer than 10 reduces keyword match probability."*

10. **Remove "Seeking a role" from summary fallback** — change `resume_generator.py:219` from `f". Seeking a {display_role} role in {target_industry}"` to `f", targeting {display_role} opportunities in {target_industry}"` — objective-statement language hurts modern resumes.
