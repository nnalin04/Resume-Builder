---
name: resume-frontend
description: Work on the React resume builder frontend — fix bugs, update layouts, change styles, modify the editor forms, or improve the preview. Use when user says "fix the preview", "update the dashboard", "change the layout", "the form is broken", or any frontend UI work on the resume builder.
argument-hint: "[what_to_fix_or_change]"
allowed-tools: Bash, Read, Write, Edit, WebFetch
---

# Resume Builder Frontend Development

You are working on the React + Vite + TypeScript frontend for the AI Resume Builder.

## Project Location
`/Users/nishitnalinsrivastava/dev/AI Agent/Resume Builder/frontend/`

## Key Files Map

| File | Purpose |
|------|---------|
| `src/pages/Dashboard.tsx` | Main UI — template selector, font size controls, editor panels, PDF export button, preview panel |
| `src/templates/Template*.tsx` | 5 resume templates: Classic, Modern, Professional, TwoColumn, Clean |
| `src/components/ContactIcons.tsx` | Bootstrap SVG icons for contact row (geo-alt, telephone, envelope, linkedin, github) |
| `src/utils/fontScales.ts` | Font size multipliers: `{ small: 1.0, medium: 1.15, large: 1.32 }` |
| `src/utils/pdfExport.ts` | PDF export via `window.print()` with isolated @media print stylesheet |
| `src/hooks/useResumeState.ts` | Resume data state — personalInfo, summary, experiences, projects, education, skills |
| `src/types/resumeTypes.ts` | TypeScript types — `ResumeData`, `TemplateId`, `Experience`, `Project`, `Education` |
| `src/components/*Form.tsx` | Editor form components for each resume section |

## Architecture Overview

### Preview Panel
The preview uses `transform: scale(0.88)` with a placeholder div sized to `794 * 0.88 × 1123 * 0.88` so scroll works correctly. NEVER use CSS `zoom` — it causes horizontal clipping.

```tsx
<div style={{ width: RESUME_W * 0.88, height: RESUME_H * 0.88, flexShrink: 0 }}>
  <div style={{ transform: 'scale(0.88)', transformOrigin: 'top left', width: RESUME_W, height: RESUME_H, overflow: 'hidden' }}>
    <PreviewComponent data={resume.resumeData} fontSize={fontSize} />
  </div>
</div>
```

### Font Size System
Templates receive `fontSize?: FontSize` prop. They compute:
```tsx
const fm = FONT_MULT[fontSize ?? 'small'];
const f = (px: number) => Math.round(px * fm * 10) / 10;
```
Every font size in templates goes through `f()`. Sub-components receive `fm: number` prop.

### PDF Export
Uses `window.print()` — NEVER html2canvas or html2pdf.js (they fail on this codebase).
The `exportToPDF()` in `pdfExport.ts` clones `#resume-preview`, puts it in an isolated wrapper, and triggers print. Works perfectly with exact colors and working links.

### Template Pattern
All templates follow this exact structure:
```tsx
import type { ResumeData } from '../types/resumeTypes';
import type { FontSize } from '../utils/fontScales';
import { FONT_MULT } from '../utils/fontScales';
import { IconGeoAlt, ... } from '../components/ContactIcons';

interface Props { data: ResumeData; fontSize?: FontSize; }

function SubComponent({ ..., fm }: { ...; fm: number }) {
  const f = (px: number) => Math.round(px * fm * 10) / 10;
  // use f() for all font sizes
}

export default function TemplateXxx({ data, fontSize = 'small' }: Props) {
  const fm = FONT_MULT[fontSize];
  const f = (px: number) => Math.round(px * fm * 10) / 10;
  return (
    <div id="resume-preview" style={{
      width: '794px', height: '1123px', overflow: 'hidden',
      wordBreak: 'break-word', overflowWrap: 'break-word',
      // ...
    }}>
```

## Critical Rules

### TypeScript
`verbatimModuleSyntax: true` is set. Use `import type` for ALL interfaces/types:
```tsx
import type { ResumeData } from '../types/resumeTypes';  // ✓
import { ResumeData } from '../types/resumeTypes';        // ✗ BREAKS BUILD
```

### CSS Units
- ALWAYS `px` (or React numbers). NEVER `pt` — breaks print and html2canvas
- React accepts `fontSize: 12` (number) as 12px — no need for `'12px'` string

### CSS `as const` for string literals
TypeScript requires `as const` on CSS string values in inline styles:
```tsx
textTransform: 'uppercase' as const,   // ✓
flexDirection: 'column' as const,      // ✓
whiteSpace: 'nowrap' as const,         // ✓
```

### Overflow Prevention
Required on template root and bullet text spans:
```tsx
wordBreak: 'break-word' as const,
overflowWrap: 'break-word' as const,
// On bullet text span:
minWidth: 0,
```

### Skill tags / inline-flex alignment
Skill tags must use `display: 'inline-flex', alignItems: 'center', lineHeight: 1` — NOT `inline-block`. Otherwise text sits at center-bottom.

### Blank white screen diagnosis
If the app shows a blank screen, check for:
1. `import { SomeInterface }` instead of `import type { SomeInterface }`
2. TypeScript compile error — run `npx tsc --noEmit`
3. Vite dev server errors — check terminal output

## Step 1 — Read Relevant Files First

Always read the files you're about to change before editing:
```bash
cat "/Users/nishitnalinsrivastava/dev/AI Agent/Resume Builder/frontend/src/pages/Dashboard.tsx"
```

## Step 2 — Make Changes

Use Edit for targeted changes, Write only for new files or complete rewrites.

## Step 3 — Type Check

```bash
cd "/Users/nishitnalinsrivastava/dev/AI Agent/Resume Builder/frontend" && npx tsc --noEmit 2>&1 | head -40
```

Fix all errors before reporting done.

## Step 4 — Report

Tell the user exactly what changed and where. Reference file paths and line numbers.
