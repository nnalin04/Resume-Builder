---
name: resume-html-export
description: Export the current resume data as a standalone, self-contained HTML file — no React, no dependencies, just a single HTML file that opens in any browser and prints perfectly to PDF. Use when user says "export as HTML", "save as HTML file", "generate a standalone HTML resume", or "create an HTML version".
argument-hint: "[resume_id_or_data_file] [template: classic|modern|clean?] [output_path?]"
allowed-tools: Bash, Read, Write
---

# Resume HTML Export

Generate a standalone single-file HTML resume from the resume builder data. The output must:
- Open in any browser with no dependencies
- Print perfectly to a single A4 PDF via browser print dialog
- Match the visual style of the chosen React template
- Embed all styles inline (no external CSS, no Google Fonts CDN required — use system fonts fallback)

## Arguments
- `$0` — Resume ID (fetch from backend) OR path to a JSON data file
- `$1` — Template style: `classic` (default), `modern`, or `clean`
- `$2` — Output path (default: `/Users/nishitnalinsrivastava/dev/AI Agent/Resume Builder/output/resume_export.html`)

## Step 1 — Get Resume Data

### Option A: From backend (if $0 is a numeric ID)
```bash
RESUME_ID=$0
curl -s http://localhost:8000/api/resume/$RESUME_ID \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
s = d.get('parsed_sections', {})
print(json.dumps(s, indent=2))
" > /tmp/resume_data_$RESUME_ID.json
cat /tmp/resume_data_$RESUME_ID.json
```

### Option B: From the React frontend state (current browser data)
Read the pre-populated data from the frontend hook:
```bash
cat "/Users/nishitnalinsrivastava/dev/AI Agent/Resume Builder/frontend/src/hooks/useResumeState.ts"
```
Extract the initial data values to use in the HTML.

## Step 2 — Choose Template Style

### `classic` style (default)
- Font: Inter, Arial, sans-serif
- Accent color: `#3A6FA8`
- Section headers: uppercase, accent color, with full-width border-bottom line + extending right
- Bullets: `–` dash in accent color
- Skills: pill tags with `#eef4fb` background, `#b8cfe8` border
- Header: centered name, gradient rule, centered summary

### `modern` style
- Font: Inter, Arial, sans-serif
- Accent: `#2563EB`
- Section headers: blue left-bar accent + horizontal rule extending right
- Bullets: `•` blue dot
- Skills: `#eff6ff` pill tags
- Header: left-aligned name, contact row inline

### `clean` style
- Font: Inter, Arial, sans-serif
- Accent: `#3A6FA8`
- Same as classic but with more compact spacing
- Matches the TemplateClean React template style exactly

## Step 3 — Generate the HTML

Key rules for the HTML output:

### CSS Units
- Use `pt` for font sizes in `@media print` (print-accurate)
- Use `px` for screen layout
- Set `body { font-size: 8.2pt }` and use relative sizing within

### Print Rules (critical for single-page PDF)
```css
@media print {
  body { margin: 0; }
  .page { width: 100%; padding: 8mm 11mm 7mm 11mm; }
  @page { size: A4; margin: 0; }
}
```

### Page Dimensions
```css
.page {
  width: 210mm;
  margin: 0 auto;
  padding: 9mm 12mm 8mm 12mm;
}
```

### Skill Tags
```css
.tag {
  display: inline-flex;
  align-items: center;
  line-height: 1;              /* critical — prevents text sitting at bottom */
  background: #eef4fb;
  border: 1px solid #b8cfe8;
  border-radius: 3px;
  padding: 1.5px 6px;
  font-size: 7.6pt;
  color: #3A6FA8;
}
```

### Section Header with extending line
```css
.sec-hdr {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
}
.sec-hdr span {
  font-size: 8.5pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #3A6FA8;
  white-space: nowrap;
}
.sec-hdr::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #d0d0d0;
}
```

### Bullet Lines
```css
ul { list-style: none; padding: 0; margin: 0; }
ul li {
  position: relative;
  padding-left: 11px;
  font-size: 8pt;
  margin-bottom: 1.8px;
  line-height: 1.36;
}
ul li::before {
  content: "–";
  position: absolute;
  left: 0;
  color: #3A6FA8;
  font-weight: 600;
  line-height: 1.36;
}
```

### Links
```css
a { color: #3A6FA8; text-decoration: none; }
```

## Step 4 — Write the HTML File

Output path: `$2` or default `output/resume_export.html`

The file must be fully self-contained — no `<link>` tags to external resources except optionally Google Fonts (with a system font fallback in case offline).

Structure:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>[Name] — Resume</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
  <style>
    /* All styles inline */
  </style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <!-- Skills -->
  <!-- Experience -->
  <!-- Projects -->
  <!-- Education -->
</div>
</body>
</html>
```

## Step 5 — Open in Browser

```bash
open "$2"
```

Or if default:
```bash
open "/Users/nishitnalinsrivastava/dev/AI Agent/Resume Builder/output/resume_export.html"
```

## Step 6 — Report to User

Tell the user:
1. **Output path** — full path to the HTML file
2. **How to print to PDF** — "Open in browser → File → Print → Save as PDF → set paper to A4, no margins"
3. **Template used** and any data fields that were included/excluded
4. Offer `/resume-generate` if they want the Python/reportlab backend PDF instead

## Rules

- **Never use inline `style=""` attributes for layout** — use CSS classes for maintainability
- **Always test that skill tags have `display: inline-flex; align-items: center; line-height: 1`** — otherwise tag text sits at bottom-center
- **Never hardcode personal data** — always read from `$0` argument or ask the user
- **The HTML must be printable to a single A4 page** — verify content fits or warn the user
