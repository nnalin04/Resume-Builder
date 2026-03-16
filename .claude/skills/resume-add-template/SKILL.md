---
name: resume-add-template
description: Add a new React resume template to the frontend. Use when the user says "add a new template", "create a template that looks like this", "build a new resume layout", or shares a reference image/HTML for a new template design.
argument-hint: "[template_name] [description_or_reference]"
allowed-tools: Bash, Read, Write, Edit, WebFetch
---

# Add New Resume Template

You are adding a new React resume template to the AI Resume Builder frontend.

## Arguments
- `$0` — Template name (slug, e.g. `minimal`, `executive`, `sidebar`)
- `$1` — Description, reference HTML, or image description to base the design on

## Critical Rules — Read Before Writing Any Code

These are hard-won lessons from past failures. Violate them and the template will break.

### Typography
- **NEVER use `pt` units.** Always `px` (or React number = px). html2canvas and `window.print()` both misinterpret `pt`.
- **NEVER hardcode font sizes.** Every `fontSize` must go through the `f()` helper so font size modes work.
- Use Inter/Arial for sans-serif templates. Georgia/Times for serif/classic layouts.

### Font Scale System (mandatory)
Every template MUST accept and use the font multiplier:
```tsx
import type { FontSize } from '../utils/fontScales';
import { FONT_MULT } from '../utils/fontScales';

interface Props { data: ResumeData; fontSize?: FontSize; }

export default function TemplateXxx({ data, fontSize = 'small' }: Props) {
  const fm = FONT_MULT[fontSize];
  const f = (px: number) => Math.round(px * fm * 10) / 10;
```
Sub-components must also receive `fm: number` and define their own `f()`.

### Overflow Prevention (mandatory on root div)
```tsx
wordBreak: 'break-word' as const,
overflowWrap: 'break-word' as const,
```
And on bullet text spans:
```tsx
overflowWrap: 'break-word' as const,
minWidth: 0,
```
And on company+date flex rows:
```tsx
flexWrap: 'wrap',
gap: '0 8px',
// date span must have:
flexShrink: 0,
```

### Fixed Page Dimensions
```tsx
width: '794px',   // A4 width in px — NEVER change
height: '1123px', // A4 height in px — NEVER change
overflow: 'hidden',
```

### TypeScript
This project uses `verbatimModuleSyntax: true`. ALL type-only imports must use `import type`:
```tsx
import type { ResumeData } from '../types/resumeTypes';
import type { FontSize } from '../utils/fontScales';
// Runtime values (functions, constants) use normal import:
import { FONT_MULT } from '../utils/fontScales';
```

### Contact Icons
Use Bootstrap SVG icons from `../components/ContactIcons`, NOT emoji:
```tsx
import { IconGeoAlt, IconTelephone, IconEnvelope, IconLinkedin, IconGithub } from '../components/ContactIcons';
```

## Step 1 — Check Existing Templates for Pattern Reference

```bash
ls "/Users/nishitnalinsrivastava/dev/AI Agent/Resume Builder/frontend/src/templates/"
```

Read `TemplateClean.tsx` as the canonical reference for the correct pattern:
```bash
cat "/Users/nishitnalinsrivastava/dev/AI Agent/Resume Builder/frontend/src/templates/TemplateClean.tsx"
```

## Step 2 — Check the ResumeData Type

```bash
cat "/Users/nishitnalinsrivastava/dev/AI Agent/Resume Builder/frontend/src/types/resumeTypes.ts"
```

Available fields: `personalInfo` (name, location, phone, email, linkedin, github), `summary`, `experiences[]`, `projects[]`, `education[]`, `skills` (comma-separated string).

## Step 3 — Create the Template File

Create `/Users/nishitnalinsrivastava/dev/AI Agent/Resume Builder/frontend/src/templates/Template$0.tsx`

Structure:
1. Imports (type-only for interfaces, normal for values)
2. Sub-components (SectionTitle, BulletLines, etc.) — each accepts `fm: number`
3. Main component with `fm` + `f()` derived from `fontSize` prop
4. Root div: 794×1123px, overflow hidden, wordBreak/overflowWrap set
5. All font sizes via `f(px)` — never hardcoded strings

## Step 4 — Register the Template

### 4a. Add to TemplateId type
Edit `/Users/nishitnalinsrivastava/dev/AI Agent/Resume Builder/frontend/src/types/resumeTypes.ts`:
```ts
// Add '$0' to the union:
export type TemplateId = 'classic' | 'modern' | 'professional' | 'twocolumn' | 'clean' | '$0';
```

### 4b. Wire into Dashboard
Edit `/Users/nishitnalinsrivastava/dev/AI Agent/Resume Builder/frontend/src/pages/Dashboard.tsx`:

Add import:
```tsx
import Template$0 from '../templates/Template$0';
```

Add to TEMPLATES array:
```tsx
{ id: '$0', label: '<display_label>' },
```

Add to PreviewComponent map:
```tsx
$0: Template$0,
```

## Step 5 — Verify No TypeScript Errors

```bash
cd "/Users/nishitnalinsrivastava/dev/AI Agent/Resume Builder/frontend" && npx tsc --noEmit 2>&1 | head -30
```

Fix any errors before finishing. Common issues:
- Missing `as const` on string literal CSS values (e.g., `textTransform: 'uppercase' as const`)
- `import` instead of `import type` for interfaces
- Missing `fm` prop on sub-components

## Step 6 — Report to User

Tell the user:
1. Template name and how to select it in the UI (Template selector in header)
2. Design decisions made (colors, layout, font choices)
3. Any data fields not used (e.g., if the layout has no projects section)
4. The template works at all three font sizes (Small/Medium/Large)
