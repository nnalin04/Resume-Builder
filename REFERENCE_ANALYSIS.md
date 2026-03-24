# Resume Builder Reference Analysis

Analyzed 6 open-source resume builder repositories for patterns in PDF extraction, preview/overflow handling, and notable architecture decisions. Research conducted March 2026. All repos cloned at HEAD with `--depth=1`.

---

## Repo 1: Reactive-Resume (AmruthPillai)

**Stack:** React + Vite + TypeScript (monorepo, single-app architecture). Backend uses oRPC + Drizzle ORM + PostgreSQL. PDF generation via headless Puppeteer.

### A. PDF Extraction

Reactive-Resume does **not** parse uploaded PDFs on import. Instead, it supports:
- **JSON Resume import** (official schema)
- **LinkedIn data export** import
- **Manual entry** via forms

There is no PDF-to-structured-data pipeline. The resume data lives in a PostgreSQL DB with a rich Zod-validated schema.

**Relevant file:** `src/schema/resume/data.ts`

The data model is the most elaborate of all repos analyzed. Key characteristics:
- Every section item has a `hidden: boolean` field (for tailoring without deleting)
- Rich text fields store HTML strings (via Tiptap editor)
- Supports `customFields` on the basics schema
- Experience items can have multiple `roles` (for promotions at same company)
- Has `pageLayoutSchema` that stores per-page column assignments

```typescript
// src/schema/resume/data.ts (abridged)
export const basicsSchema = z.object({
  name: z.string(),
  headline: z.string(),
  email: z.string(),
  phone: z.string(),
  location: z.string(),
  website: urlSchema,
  customFields: z.array(customFieldSchema),
});

export const experienceItemSchema = baseItemSchema.extend({
  company: z.string().min(1),
  position: z.string(),
  roles: z.array(roleItemSchema).optional(), // Multiple roles at same company
  description: z.string(), // HTML-formatted
  // ... period, location, website
});
```

### B. PDF Preview & Overflow

**The most sophisticated approach of all repos analyzed.**

**Preview rendering:** React components rendered in the browser DOM. Templates are plain HTML/CSS, not canvas or PDF libraries.

**Page dimensions:** `src/schema/page.ts`
```typescript
export const pageDimensionsAsPixels = {
  a4: { width: 794, height: 1123 },
  letter: { width: 816, height: 1056 },
  "free-form": { width: 794, height: 1123 }, // used as minimum height
};
```

**Overflow handling in preview:** `src/components/resume/preview.tsx` + `src/components/resume/preview.module.css`

The page div uses `min-height` (not fixed `height`):
```css
/* preview.module.css */
.page {
  width: var(--page-width);
  min-height: var(--page-height);   /* KEY: min-height, not height */
  font-family: var(--page-body-font-family);
  font-size: calc(var(--page-body-font-size) * 1pt);
  /* ...rest of styles */
}
```

When content exceeds page height, `PageContainer` detects it via `ResizeObserver` and shows a warning:
```tsx
// src/components/resume/preview.tsx
{metadata.page.format !== "free-form" && pageHeight > maxPageHeight && (
  <Alert className="max-w-sm text-yellow-600">
    <WarningIcon />
    <AlertTitle>The content is too tall for this page...</AlertTitle>
    <AlertDescription>Learn more about how to fit content on a page</AlertDescription>
  </Alert>
)}
```

**Multi-page support:** Managed by `metadata.layout.pages[]` — an array where each entry describes the section layout for that page (sidebar columns, main columns, full-width sections). Users manually drag sections to new pages in the editor. The preview renders one `<PageContainer>` per array entry.

**PDF export:** Uses **puppeteer-core** connecting to an external Chromium instance via `PRINTER_ENDPOINT` env var.

File: `src/integrations/orpc/services/printer.ts`

The export pipeline is highly sophisticated:
1. Navigates to a token-secured `/printer/{id}` route
2. Sets `emulateMediaType("print")`
3. Injects JS to modify the DOM: adjusts `--page-height` CSS variable, adds `breakBefore: "page"` to each `[data-page-index]` element, applies padding for templates that use print margins
4. Calls `page.pdf()` with exact pixel dimensions, `tagged: true`, `waitForFonts: true`, `printBackground: true`

Key snippet from printer service:
```typescript
// For A4/Letter: force a page break before each page
for (const el of pageElements) {
  const element = el as HTMLElement;
  const index = parseInt(element.getAttribute("data-page-index") ?? "0", 10);
  if (index > 0) {
    element.style.breakBefore = "page";
    element.style.pageBreakBefore = "always";
  }
  element.style.breakInside = "auto";
}

const pdfBuffer = await page.pdf({
  width: `${pageDimensionsAsPixels[format].width}px`,
  height: `${pdfHeight}px`,
  tagged: true,
  waitForFonts: true,
  printBackground: true,
  margin: { bottom: 0, top: 0, right: 0, left: 0 },
});
```

**Free-form mode:** Measures actual `offsetHeight` of all page elements and generates a PDF with that exact height — useful for very long resumes.

### C. Notable Patterns

- **AI tailoring** (`src/utils/resume/tailor.ts`): Converts LLM output to **JSON Patch (RFC 6902)** operations applied to resume data. Prevents hallucination by sanitizing text (smart quotes, em-dashes) and validating indices before applying.
- **CSS custom properties architecture:** Typography, colors, spacing, and page dimensions all flow through CSS variables (`--page-primary-color`, `--page-body-font-size`, etc.), making templates completely style-independent.
- **Custom CSS injection:** Users can write their own CSS scoped to `.resume-preview-container` with sanitization layer.
- **Template system:** 13 named templates (Pokémon-themed: Azurill, Bronzor, Gengar, etc.), each a single TSX file receiving `pageIndex` and `pageLayout` props. Layout (sidebar/main split) is data-driven, not hardcoded.
- **Screenshot generation:** Also uses Puppeteer — takes a `webp` screenshot of the first page for dashboard thumbnails, with 6-hour TTL and stale-check-on-update logic.
- **Prompt injection defense:** `src/integrations/orpc/services/printer.ts` has explicit sanitization of LLM output, and the improver service blocks fields like `years`, `company`, `institution` from AI modification via `_BLOCKED_FIELD_NAMES`.
- **MCP server:** Has a `/mcp` route exposing resume operations as MCP tools for Claude integration.

---

## Repo 2: open-resume (xitanggg)

**Stack:** Next.js 13 App Router + TypeScript. No backend — fully client-side. Uses `@react-pdf/renderer` for PDF generation. Uses `pdfjs-dist` for PDF parsing.

### A. PDF Extraction

**Library:** `pdfjs-dist` (Mozilla PDF.js) — runs entirely in the browser. No server-side parsing.

**Entry point:** `src/app/lib/parse-resume-from-pdf/index.ts`

**4-step pipeline:**
```typescript
export const parseResumeFromPdf = async (fileUrl: string) => {
  const textItems = await readPdf(fileUrl);          // Step 1: Extract text items with x,y coords
  const lines = groupTextItemsIntoLines(textItems);  // Step 2: Group by y-position
  const sections = groupLinesIntoSections(lines);    // Step 3: Detect section boundaries
  const resume = extractResumeFromSections(sections); // Step 4: Extract fields
};
```

**Step 1 — `readPdf`:** (`src/app/lib/parse-resume-from-pdf/read-pdf.ts`)
- Uses `pdfjs.getDocument(fileUrl).promise` → iterates pages
- Extracts `TextItem` objects with: `text`, `x`, `y`, `fontName`, `width`, `height`, `hasEOL`, `isBold`
- Resolves actual font names via `page.commonObjs.get(pdfFontName)` (handles loaded vs original font names)
- Fixes soft-hyphen artifacts: `text.replace(/-­‐/g, "-")`

**Step 3 — Section detection:** (`src/app/lib/parse-resume-from-pdf/group-lines-into-sections.ts`)

Heuristics for identifying section title lines:
```typescript
const isSectionTitle = (line: Line, lineNumber: number) => {
  // Primary: single-item line that is BOLD + ALL UPPERCASE
  if (isBold(textItem) && hasLetterAndIsAllUpperCase(textItem)) return true;

  // Fallback: ≤2 words + starts with capital + matches keyword list
  const SECTION_TITLE_KEYWORDS = [
    "experience", "education", "project", "skill",
    "job", "course", "extracurricular", "objective",
    "summary", "award", "honor"
  ];
};
```

**Step 4 — Field extraction using Feature Scoring System:** (`src/app/lib/parse-resume-from-pdf/extract-resume-from-sections/lib/feature-scoring-system.ts`)

The most interesting design pattern: each field (name, email, phone, location, URL) has a `FeatureSet[]` — an array of `[hasFeature, score, returnMatchingText]` tuples. The system scores every text item in the section and returns the highest-scoring one.

```typescript
const NAME_FEATURE_SETS: FeatureSet[] = [
  [matchOnlyLetterSpaceOrPeriod, 3, true],
  [isBold, 2],
  [hasLetterAndIsAllUpperCase, 2],
  [hasAt, -4],         // penalize if looks like email
  [hasNumber, -4],     // penalize if looks like phone
  [hasComma, -4],      // penalize if looks like location
  [hasSlash, -4],      // penalize if looks like URL
  [has4OrMoreWords, -2], // penalize if looks like summary
];
```

**Data schema:** (`src/app/lib/redux/types.ts`)
```typescript
interface Resume {
  profile: ResumeProfile;        // name, email, phone, url, summary, location
  workExperiences: ResumeWorkExperience[]; // company, jobTitle, date, descriptions[]
  educations: ResumeEducation[];  // school, degree, date, gpa, descriptions[]
  projects: ResumeProject[];      // project, date, descriptions[]
  skills: ResumeSkills;           // featuredSkills[], descriptions[]
  custom: ResumeCustom;           // descriptions[]
}
```

**No AI used for parsing** — pure rule-based heuristics. Explicitly documented to only work for single-column English resumes.

### B. PDF Preview & Overflow

**Unique dual-mode approach:**

For **preview**: `@react-pdf/renderer` components rendered as DOM elements (not inside `PDFViewer`). The `Page` and `View` etc. components render as HTML divs, which is fast but generates console errors about incorrect HTML element casing.

For **export**: `usePDF({ document })` hook from `@react-pdf/renderer` generates a real PDF blob → downloads via `<a href={instance.url} download>`.

**Iframe isolation:** `src/app/components/Resume/ResumeIFrame.tsx`
- Uses `react-frame-component` to render the resume inside an `<iframe>`
- The iframe body width is set to the exact page width in `pt` units: `body style='overflow: hidden; width: ${width}pt;'`
- This isolates styles completely from the main page
- The outer div sets `maxWidth` and `maxHeight` to `width * scale` × `height * scale` to prevent layout bleed from `transform: scale()`

```typescript
// The inner/outer pattern (identical to our CLAUDE.md lesson #8)
<div style={{ maxWidth: `${width * scale}px`, maxHeight: `${height * scale}px` }}>
  <div
    style={{
      width: `${width}px`,
      height: `${height}px`,
      transform: `scale(${scale})`,
    }}
    className="origin-top-left bg-white shadow-lg"
  >
    <Frame style={{ width: "100%", height: "100%" }} initialContent={iframeInitialContent}>
      {children}
    </Frame>
  </div>
</div>
```

**Dimensions (from `src/app/lib/constants.ts`):**
```typescript
export const PX_PER_PT = 4 / 3;
export const LETTER_WIDTH_PT = 612;  // → 816px
export const LETTER_HEIGHT_PT = 792; // → 1056px
export const A4_WIDTH_PT = 595;      // → 793px
export const A4_HEIGHT_PT = 842;     // → 1123px
```

**Multi-page overflow:** `@react-pdf/renderer` handles this automatically. When the PDF document is actually rendered as PDF (via `usePDF`), react-pdf handles page flow natively. The preview DOM mode is only approximate — long resumes may appear truncated in preview but correct in the downloaded PDF.

**Styles:** All in `pt` units (react-pdf requirement). Spacing system mirrors Tailwind (`spacing[4] = "12pt"`). No `px` units used in PDF styles.

### C. Notable Patterns

- **No server at all** — Dockerfile is just for Next.js SSR. Everything that matters runs client-side.
- **Autoscale checkbox:** The `ResumeControlBarCSR` has a "Autoscale" toggle that recalculates scale on window resize using a custom `useSetDefaultScale` hook.
- **Font preloading in iframe:** The iframe `initialContent` injects `<link rel="preload">` tags for all font families before rendering.
- **Parser test suite:** `extract-resume-from-sections.test.ts` tests the parsing pipeline against real resume text samples.
- **Hyphenation callback:** `useRegisterReactPDFHyphenationCallback` registers a no-op hyphenation function to disable automatic hyphenation in PDF output.

---

## Repo 3: resume-lm (olyaiy)

**Stack:** Next.js 14 App Router + TypeScript + Supabase + Stripe. Uses `@react-pdf/renderer` for PDF generation. Uses `react-pdf` (pdf.js wrapper) for PDF display/preview. AI via Vercel AI SDK supporting multiple providers (Anthropic, Google, OpenAI, OpenRouter).

### A. PDF Extraction

resume-lm does **not** extract data from uploaded PDFs. Users build resumes from scratch or via AI generation. The project accepts PDF uploads only for AI to read and suggest improvements (via the chat interface), not to parse into structured data.

The AI chat route (`src/app/api/chat/route.ts`) uses the Vercel AI SDK with tool-calling to modify resume sections. It supports: Anthropic Claude, Google Gemini, OpenAI GPT, and OpenRouter models.

**Data schema** (inferred from `resume-pdf-document.tsx`):
```typescript
interface Resume {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  location: string;
  website: string;
  linkedin_url: string;
  github_url: string;
  skills: Array<{ category: string; items: string[] }>;
  work_experience: Array<{
    position: string;
    company: string;
    location: string;
    date: string;
    description: string[];  // bullet points
  }>;
  projects: Array<{
    name: string;
    date: string;
    url: string;
    github_url: string;
    technologies: string[];
    description: string[];
  }>;
  education: Array<{
    school: string;
    degree: string;
    field: string;
    date: string;
    achievements: string[];
  }>;
  document_settings: {
    document_font_size: number;
    document_line_height: number;
    document_margin_vertical: number;
    document_margin_horizontal: number;
    header_name_size: number;
    // ... 15+ spacing/typography controls
    show_ubc_footer: boolean;
  };
}
```

### B. PDF Preview & Overflow

**Two-library strategy:**
1. **`@react-pdf/renderer`** generates the actual PDF blob client-side
2. **`react-pdf`** (PDF.js wrapper) displays the generated PDF as a `<canvas>` in the browser

**`ResumePDFDocument`** (`src/components/resume/editor/preview/resume-pdf-document.tsx`):
- Builds a react-pdf/renderer `Document > Page` tree
- Page size: `LETTER` only
- All styles via `StyleSheet.create()` using `pt` units
- Markdown bold parsing: `**text**` → `<Text fontFamily="Helvetica-Bold">`
- Settings-driven styles via `createResumeStyles(resume.document_settings)` factory

**`ResumePreview`** (`src/components/resume/editor/preview/resume-preview.tsx`):
- Calls `pdf(<ResumePDFDocument />).toBlob()` to generate PDF → `URL.createObjectURL()`
- Displays with `react-pdf`'s `<Document>` and `<Page>` components
- `pdfjs.GlobalWorkerOptions.workerSrc` set to `pdfjs-dist/build/pdf.worker.min.mjs`
- **Multi-page supported natively** — `numPages` from `onLoadSuccess` → renders `Array(numPages)` of `<Page>` components
- **PDF caching:** `Map<hash, { url, timestamp }>` with 30-minute TTL and 5-minute cleanup interval. Cache key is a fast integer hash of contact info + section content + settings.
- **Debounced updates:** `useDebouncedValue(containerWidth, 100)` prevents thrashing
- **Text layer delayed:** Disables text selection layer during PDF regeneration, re-enables 1 second after `onLoadSuccess`

```typescript
// Multi-page rendering
{Array.from(new Array(numPages), (_, index) => (
  <Page
    key={`page_${index + 1}`}
    pageNumber={index + 1}
    className="mb-4 shadow-xl"
    width={getPixelWidth()}
    renderAnnotationLayer={true}
    renderTextLayer={shouldRenderTextLayer}
  />
))}
```

**Overflow:** Handled by `@react-pdf/renderer` — content that doesn't fit on one page automatically flows to the next page in the actual PDF. The preview accurately reflects this because it renders the real PDF via pdf.js.

### C. Notable Patterns

- **Dual resume concept:** "Base resume" (purple-tinted) vs "Tailored resume" (pink-tinted) with visual distinction.
- **Document settings granularity:** 15+ per-document settings including `skills_margin_top`, `experience_item_spacing`, `footer_width` — effectively a CSS-in-JSON approach specific to the single template.
- **AI model routing:** User can bring their own API key and select provider/model. The chat system prompts adjust based on Pro vs free tier.
- **Tool-calling for resume editing:** AI uses structured tool calls to update specific resume fields rather than returning free-form text.

---

## Repo 4: Resume-Matcher (srbhr)

**Stack:** FastAPI (Python) backend + Next.js 14 frontend. PDF parsing uses `markitdown` → LLM. PDF export uses **Playwright** (Python, async). LLM routing via **LiteLLM** (supports 100+ providers).

### A. PDF Extraction

**Most sophisticated parsing pipeline of all repos analyzed.**

**Step 1 — Document to Markdown:** `apps/backend/app/services/parser.py`
```python
async def parse_document(content: bytes, filename: str) -> str:
    """Convert PDF/DOCX to Markdown using markitdown."""
    md = MarkItDown()
    result = md.convert(str(tmp_path))
    return result.text_content
```
- Library: `markitdown[docx]==0.1.4` (Microsoft's open-source converter)
- Handles both PDF and DOCX in one code path
- Writes to temp file, converts, cleans up

**Step 2 — Markdown to Structured JSON via LLM:**
```python
async def parse_resume_to_json(markdown_text: str) -> dict[str, Any]:
    prompt = PARSE_RESUME_PROMPT.format(
        schema=RESUME_SCHEMA_EXAMPLE,
        resume_text=markdown_text,
    )
    result = await complete_json(
        prompt=prompt,
        system_prompt="You are a JSON extraction engine. Output only valid JSON, no explanations.",
    )
    result = restore_dates_from_markdown(result, markdown_text)
    validated = ResumeData.model_validate(result)
    return validated.model_dump()
```

**Date correction post-processing:** LLMs frequently drop months from dates (e.g., "Jun 2020 - Aug 2021" → "2020 - 2021"). The `restore_dates_from_markdown` function extracts full dates from the raw markdown using regex and patches year-only entries in the parsed JSON.

**Output schema:**
```json
{
  "personalInfo": { "name", "title", "email", "phone", "location", "website", "linkedin", "github" },
  "summary": "string",
  "workExperience": [{ "id", "title", "company", "location", "years", "description": [] }],
  "education": [{ "id", "institution", "degree", "years", "description" }],
  "personalProjects": [{ "id", "name", "role", "years", "description": [] }],
  "additional": { "technicalSkills": [], "languages": [], "certificationsTraining": [], "awards": [] },
  "customSections": { "<key>": { "sectionType": "text|itemList|stringList", ... } }
}
```

**`customSections` design:** Non-standard sections (publications, volunteer work, etc.) are captured into typed custom sections rather than discarded. Three types: `text` (single block), `itemList` (structured entries), `stringList` (array of strings).

**LLM Provider:** LiteLLM router (`apps/backend/app/llm.py`) supporting OpenAI, Anthropic, Google, Ollama, and any OpenAI-compatible endpoint. Users configure provider + API key in settings.

### B. PDF Preview & Overflow

**Most sophisticated pagination implementation of all repos analyzed.**

**PDF export:** `apps/backend/app/pdf.py` — uses **Playwright** (Python) with headless Chromium.
```python
async def render_resume_pdf(
    url: str,
    page_size: str = "A4",
    selector: str = ".resume-print",
    margins: Optional[dict] = None,
) -> bytes:
    # Navigates to print route, waits for fonts, generates PDF
    await page.goto(url, wait_until="networkidle")
    await page.wait_for_selector(selector)
    await page.evaluate("document.fonts.ready")
    return await page.pdf(format=pdf_format, print_background=True, margin=pdf_margins)
```

Note: Margins are applied via Playwright's PDF margins (not CSS padding) specifically so they appear on **every page**, not just the first.

**Frontend preview:** `apps/frontend/components/preview/paginated-preview.tsx` + `use-pagination.ts`

The most production-quality overflow solution:

**Architecture:**
1. A **hidden measurement div** (`opacity: 0; pointer-events: none; position: absolute; left: -9999`) renders the full resume content at actual width
2. `usePagination` hook uses `ResizeObserver` + `MutationObserver` on this div
3. `document.fonts.ready` is awaited before measuring (font-load-safe)
4. Queries `'.resume-item, [data-no-break]'` elements to find breakable boundaries
5. Queries `'.resume-section-title'` to prevent orphaned headers
6. Calculates break points: moves break before any item that straddles a page boundary (only if doing so uses ≥50% of current page)
7. Renders N `<PageContainer>` components, each with `contentOffset` and `contentEnd` props

**`PageContainer`** clips content using `overflow: hidden` and a negative `top: -contentOffset` translation:
```tsx
// Content positioned based on page offset
<div
  className="absolute overflow-hidden"
  style={{ top: marginTopPx, left: marginLeftPx, width: contentWidth, height: actualContentHeight }}
>
  <div
    className="absolute left-0 right-0"
    style={{ top: -contentOffset, width: contentWidth }}
  >
    {children}
  </div>
</div>
```

**Orphan prevention for section headers:**
```typescript
sectionTitles.forEach((title) => {
  const firstContent =
    section.querySelector('.resume-item') ||
    section.querySelector('.resume-items > *:first-child') ||
    title.nextElementSibling;

  // Create unbreakable zone from title top to first content bottom
  itemBounds.push({
    top: titleRect.top - containerRect.top,
    bottom: firstContentRect.bottom - containerRect.top,
    element: title,
  });
});
```

### C. Notable Patterns

- **Diff-based AI tailoring:** Instead of replacing entire resume sections, generates `JSON Patch`-style diffs (`path`, `action`, `original`, `value`, `reason`). The `original` field enables verification that the LLM referenced actual content. Blocked path prefixes prevent AI from modifying dates, company names, or personal info.
- **Prompt injection defense:** `_INJECTION_PATTERNS` regex list sanitizes user input before it enters prompts. Blocked field names (`years`, `company`, `institution`) cannot be AI-modified.
- **3-tier tailoring:** `nudge` (minimal rephrasing only), `keywords` (weave in keywords), `full` (comprehensive tailoring with truthfulness rules).
- **Multilingual output:** All AI prompts include `output_language` parameter; LLM generates content in the target language.
- **4 templates:** `swiss-single`, `swiss-two-column`, `modern`, `modern-two-column` — all CSS-variable-driven with `TemplateSettings` passed as query params to the print route.
- **Cover letter + outreach message generation:** Dedicated prompts for 100-150 word cover letters and 70-100 word cold outreach messages with specific anti-patterns enforced ("don't open with 'I'm reaching out'", "no em-dashes").
- **LiteLLM routing:** Single `complete_json()` function that works with any configured provider.

---

## Repo 5: AI-Resume-Analyzer (deepakpadhi986)

**Stack:** Python + Streamlit (single-file app). No JavaScript frontend.

### A. PDF Extraction

**Libraries:**
- `pdfminer3==2018.12.3.0` — raw PDF text extraction
- `pyresparser==1.0.6` — NLP-based resume field extraction
- `spacy==2.3.5` with `en_core_web_sm` model

**PDF reading function (`App/App.py`):**
```python
def pdf_reader(file):
    resource_manager = PDFResourceManager()
    fake_file_handle = io.StringIO()
    converter = TextConverter(resource_manager, fake_file_handle, laparams=LAParams())
    page_interpreter = PDFPageInterpreter(resource_manager, converter)
    with open(file, 'rb') as fh:
        for page in PDFPage.get_pages(fh, caching=True, check_extractable=True):
            page_interpreter.process_page(page)
    text = fake_file_handle.getvalue()
    return text
```

**`pyresparser` uses:**
- spaCy `en_core_web_sm` NLP model for NER (Named Entity Recognition)
- A custom spaCy model trained for resume entities
- `Matcher` API for pattern-based extraction
- Output fields: `name`, `email`, `mobile_number`, `skills`, `degree`, `no_of_pages`

**`pyresparser/resume_parser.py` key flow:**
```python
class ResumeParser:
    def __get_basic_details(self):
        cust_ent = utils.extract_entities_wih_custom_model(self.__custom_nlp)
        name = utils.extract_name(self.__nlp, matcher=self.__matcher)
        email = utils.extract_email(self.__text)
        mobile = utils.extract_mobile_number(self.__text, self.__custom_regex)
        skills = utils.extract_skills(self.__nlp, self.__noun_chunks, self.__skills_file)
        entities = utils.extract_entity_sections_grad(self.__text_raw)
```

**ATS/Skill scoring (App/App.py):** Rule-based keyword matching — no ML at runtime.
```python
resume_score = 0
if 'Objective' in resume_text: resume_score += 6
if 'Declaration' in resume_text: resume_score += 6
if 'Hobbies' in resume_text: resume_score += 6
if 'Achievements' in resume_text: resume_score += 13
if 'Projects' in resume_text: resume_score += 19
# ... etc (max score ~100, accumulated additively)
```

Field classification uses hardcoded keyword lists:
```python
ds_keyword = ['tensorflow','keras','pytorch','machine learning','deep Learning','flask','streamlit']
web_keyword = ['react', 'django', 'node jS', 'react js', 'php', 'laravel', ...]
android_keyword = ['android','android development','flutter','kotlin','xml','kivy']
```

### B. PDF Preview & Overflow

Uses a Streamlit `iframe` to display the uploaded PDF:
```python
def show_pdf(file_path):
    with open(file_path, "rb") as f:
        base64_pdf = base64.b64encode(f.read()).decode('utf-8')
    pdf_display = f'<iframe src="data:application/pdf;base64,{base64_pdf}" width="700" height="1000" type="application/pdf"></iframe>'
    st.markdown(pdf_display, unsafe_allow_html=True)
```

No resume editor, no preview rendering, no overflow management. The iframe simply shows the user's uploaded PDF at a fixed 700×1000px size.

### C. Notable Patterns

- **Simplest architecture** of all repos — good reference for what a minimal working ATS analyzer looks like.
- **Course recommendation engine** based on detected skill category (DS, web, android, iOS, UX).
- **MySQL analytics dashboard** for admin — tracks all analyses, geo-data, skill distributions.
- **Resume scoring is additive section presence** — not keyword match against JD. Scores presence of sections like "Objective", "Achievements", "Projects" regardless of content quality.

---

## Repo 6: atsresume (sauravhathi)

**Stack:** Next.js 13 App Router + JavaScript (no TypeScript). No backend. `window.print()` for PDF export.

### A. PDF Extraction

**No PDF parsing whatsoever.** Users manually type all resume data into forms. This is a pure resume builder, not an analyzer.

Default resume data pre-populated via `src/components/utility/DefaultResumeData.jsx`.

### B. PDF Preview & Overflow

**Most similar to our current project.**

**Preview rendering:** Plain React components in DOM. Two-column CSS grid layout.

**A4 size management:** `src/components/preview/components/A4PageWrapper.jsx`
```jsx
const A4PageWrapper = ({children}) => {
  const alertA4Size = () => {
    const preview = document.querySelector(".preview");
    const previewHeight = preview.offsetHeight;
    if (previewHeight > 1122) {
      alert("A4 size exceeded");  // Primitive overflow notification
    }
  };
  return (
    <div className="w-8.5in" onLoad={alertA4Size}>
      {children}
    </div>
  );
};
```

**Overflow strategy:** None. Content simply overflows visually — the `alertA4Size` function fires an `alert()` dialog but does not clip, paginate, or manage overflow. The preview div has `md:overflow-y-scroll md:h-screen`.

**PDF export:** `src/components/utility/WinPrint.js` — trivially calls `window.print()`.

**Print CSS** (`src/styles/globals.css`):
```css
@media print {
  .exclude-print { display: none; }
  .rm-padding-print { padding: 0; }

  @page {
    size: A4;
    margin: 10mm;    /* Applied to every page */
  }

  .preview {
    overflow-y: visible !important;   /* KEY: allows content to flow to next page */
  }
}
```

**Critical difference from our project:** In print mode, `overflow-y: visible !important` is set on the preview div. This means content that overflows the visual preview automatically flows to a second printed page. Our project uses `overflow: hidden` which clips the content.

### C. Notable Patterns

- **Drag-and-drop section reordering:** Uses `react-beautiful-dnd` for dragging sections within the resume preview.
- **Watermark in print:** `preview::after` content adds a URL watermark at fixed position during print.
- **Inline editing:** Resume sections use `contentEditable` via the `editable` CSS class (`hover:bg-gray-100 hover:cursor-text outline-none`).
- **Profile picture support** with FileReader for local image loading.

---

## Consolidated Recommendations for Our Project

### Fix: Multi-page overflow (Priority 1 — the clipping bug)

Our current issue: `overflow: hidden` on the 794×1123px div clips content that exceeds one page.

**Option A (Simplest — ~30 min):** Switch to `window.print()` with `overflow-y: visible` in print CSS.

Adopted from atsresume's `globals.css`:
```css
@media print {
  @page {
    size: A4;
    margin: 0;        /* We control margins in templates via padding */
  }

  #resume-preview {
    overflow-y: visible !important;
    height: auto !important;
    /* Browser's print engine handles page breaks automatically */
  }
}
```
The template div changes from `height: 1123px` to `min-height: 1123px` (matching Reactive-Resume's approach). On screen, it still shows the A4 preview size. On print, content overflows to a second page naturally.

**Tradeoffs:** Simple, but no preview of what page 2 looks like. Users won't see multi-page layout until printing.

**Option B (Production quality — 2-4 hours):** Implement measurement-based pagination like Resume-Matcher.

Core algorithm from `apps/frontend/components/preview/use-pagination.ts`:
```typescript
// 1. Render full content in hidden div (off-screen, actual width)
// 2. Await document.fonts.ready
// 3. Measure .resume-item and section title elements
// 4. Calculate page breaks respecting item boundaries
// 5. Render N PageContainer components with contentOffset/contentEnd

// Each PageContainer clips content with:
<div style={{ height: actualContentHeight, overflow: 'hidden' }}>
  <div style={{ marginTop: -contentOffset }}>
    {children}
  </div>
</div>
```

For our templates, mark each experience/education/project entry with a `data-no-break` attribute, and section headings with a class that triggers the orphan-prevention logic.

**Option C (Best PDF quality, complex — 1-2 days):** Migrate to `@react-pdf/renderer` like open-resume and resume-lm.

React-pdf handles pagination natively. Export becomes `usePDF({ document }).url` — no `window.print()` needed. Multi-page is automatic. Tradeoff: requires rewriting all 5 templates as react-pdf components using `pt` units.

**Recommendation:** Implement Option A immediately (unblocks users), then plan Option B for the next sprint.

**Exact change for Option A:**

In `frontend/src/utils/pdfExport.ts` or wherever the print stylesheet is injected, add:
```css
@media print {
  @page { size: A4; margin: 0; }

  /* Allow content to flow past 1123px during print */
  .resume-template-root {    /* or whatever the root class is */
    height: auto !important;
    overflow: visible !important;
    min-height: 1123px;
  }
}
```

In each template, change the root div style from `height: 1123px, overflow: 'hidden'` to `minHeight: 1123px` (no fixed height, no overflow hidden). The visual 794×1123px box for the screen preview is maintained by the outer container, not the template div itself.

---

### Improvements: PDF Extraction

**Current approach:** Our backend uses a Gemini LLM prompt to parse PDF text. This is conceptually similar to Resume-Matcher's approach but may drop dates.

**Adopt from Resume-Matcher:**

1. **Date restoration post-processing** (`apps/backend/app/services/parser.py::restore_dates_from_markdown`): After LLM parsing, extract all month-inclusive dates from the raw markdown using regex and patch year-only entries. This is a quick, robust fix for a common LLM parsing failure mode.

2. **`customSections` schema**: Instead of losing non-standard sections (publications, awards, volunteer work), capture them into typed custom sections. Our current schema discards anything that doesn't fit the fixed fields.

3. **markitdown as pre-processor**: Replace `PyPDF2`/`pdfplumber` with `markitdown` for PDF → Markdown conversion. It handles more PDF layouts and works for DOCX too.

4. **Adopt open-resume's feature scoring for rule-based fallback**: When LLM parsing fails or is too expensive, the feature-scoring approach (scoring each text item as potential name/email/phone with positive/negative feature weights) is the most robust non-AI approach available.

---

### Improvements: ATS Scoring

**Current approach:** spaCy keyword overlap scoring.

**Adopt from Resume-Matcher's LLM approach:**

Instead of (or in addition to) simple keyword overlap, use a structured LLM prompt to extract job requirements:
```
Extract job requirements as JSON:
{
  "required_skills": ["Python", "AWS"],
  "preferred_skills": ["Kubernetes"],
  "experience_requirements": ["5+ years"],
  "experience_years": 5,
  "seniority_level": "senior",
  "keywords": ["microservices", "agile"]
}
```

Then score against these structured categories separately. This produces much more actionable gap analysis than raw keyword overlap.

**Adopt from Resume-Matcher's prompt injection defense**: Before passing user-submitted job descriptions to LLMs, sanitize injection patterns:
```python
_INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?previous\s+instructions",
    r"disregard\s+(all\s+)?above",
    r"system\s*:",
    # ...
]
```

---

### Improvements: Template System

**Current situation:** 5 templates as standalone React components with hard-coded styles.

**Adopt from Reactive-Resume:**

1. **CSS custom properties for theming**: Move colors, font sizes, and spacing out of inline styles into CSS variables (`--page-primary-color`, `--page-body-font-size`, etc.). Templates reference variables; the editor modifies variables. This enables live theming without prop drilling.

2. **`hidden: boolean` on every section item**: Allows tailoring (hiding items for a specific job) without deleting data. Currently our data schema has no way to hide individual bullets.

3. **JSON Patch for AI modifications**: Instead of replacing entire resume sections when the AI rewrites something, generate RFC 6902 patch operations. This enables undo, diff view, and safer AI edits. Resume-Matcher's diff preview modal is the best UX implementation of this pattern.

**Adopt from Resume-Matcher's template settings** passed as URL query params to the print route:
```
/print/resume/123?template=modern&fontSize=3&headerFont=serif&accentColor=blue
```
This enables shareable print configurations and decouples template settings from stored data.

---

### Other Worth Adopting

1. **PDF caching with hash keys (resume-lm):** Generate a fast hash of the resume content. Cache the generated PDF blob URL with a 30-minute TTL. Skip regeneration when resume hasn't changed. For `@react-pdf/renderer` this prevents the 200-500ms PDF rebuild on every keystroke.

2. **Screenshot generation for dashboard thumbnails (Reactive-Resume):** Use Puppeteer/Playwright to generate a `webp` screenshot of the first resume page for dashboard cards. Cache with 6-hour TTL + stale-on-update logic. Much better UX than generic icons.

3. **Drag-and-drop section reordering (atsresume):** `react-beautiful-dnd` for reordering sections within the resume. Low complexity, high user value.

4. **Orphan prevention CSS class convention (Resume-Matcher):** Add CSS classes `resume-item` (on each job/project/education entry) and `resume-section-title` (on section headings) to enable pagination algorithms to respect natural content boundaries.

5. **`document.fonts.ready` before measuring (Resume-Matcher):** In any pagination or measurement code, always `await document.fonts.ready` before measuring element heights. Web fonts load asynchronously; measuring before they load gives wrong dimensions.

6. **`waitForFonts: true` in Puppeteer PDF (Reactive-Resume):** `page.pdf({ waitForFonts: true })` ensures fonts are fully loaded before PDF generation. Without this, PDFs can have fallback fonts.

7. **`content-visibility: auto` for off-screen pages (Reactive-Resume):** From `preview.module.css`:
   ```css
   .page:not(:first-child) {
     content-visibility: auto;
     contain-intrinsic-size: var(--page-width) var(--page-height);
   }
   ```
   Defers rendering of non-visible pages, improving initial load performance for multi-page resumes.

8. **Multilingual AI output (Resume-Matcher):** Every AI prompt includes an `output_language` parameter. For international users this is a significant differentiator — the AI generates the resume content in the user's language while keeping the data structure consistent.
