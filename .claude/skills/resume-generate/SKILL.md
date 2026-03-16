---
name: resume-generate
description: Full resume generation pipeline — upload a PDF resume, optionally provide a job description, and produce an ATS-optimized PDF. Use when user says "generate my resume", "create resume from PDF", "optimize my resume for this job", or pastes/uploads a PDF path and a job description.
argument-hint: "[pdf_path] [job_description_or_file?] [template: classic|modern|technical?]"
allowed-tools: Bash, Read, Write
---

# Resume Generation Pipeline

You are running the full AI Resume Builder pipeline. Given a PDF resume (and optionally a job description), produce an ATS-optimized PDF output.

## Arguments
- `$0` — Path to the PDF resume file
- `$1` — (Optional) Job description text, path to a JD file, or target role description
- `$2` — (Optional) PDF template: `classic` (default), `modern`, or `technical`

## Backend Check

First, verify the backend is running AND is on the latest code:

```bash
curl -s http://localhost:8000/ 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print('Backend:', d.get('status','?'))" 2>/dev/null || echo "OFFLINE"
```

If offline, start it:
```bash
cd "/Users/nishitnalinsrivastava/dev/AI Agent/Resume Builder/backend" && source venv/bin/activate && uvicorn main:app --port 8000 &
sleep 3
```

If you have made recent code changes, restart the backend to ensure fresh code is loaded:
```bash
pkill -f "uvicorn main:app" && sleep 1
cd "/Users/nishitnalinsrivastava/dev/AI Agent/Resume Builder/backend" && source venv/bin/activate && uvicorn main:app --port 8000 &
sleep 3
```

## Step 1 — Upload the PDF

```bash
curl -s -X POST http://localhost:8000/api/upload-resume \
  -F "file=@$0" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('resume_id:', d.get('resume_id'))
print('chars:', d.get('extracted_length'))
print()
print(d.get('preview','')[:300])
"
```

Note the `resume_id`. Use it in all subsequent steps.

## Step 2 — Parse Resume Sections (with fallback)

```bash
RESUME_ID=<id_from_step1>
PARSE_RESULT=$(curl -s -X POST http://localhost:8000/api/parse-resume/$RESUME_ID)
echo $PARSE_RESULT | python3 -c "
import sys, json
d = json.load(sys.stdin)
s = d.get('sections', {})
c = s.get('contact', {})
exp_count = len(s.get('experience', []))
print(f'name={c.get(\"name\",\"\")} exp={exp_count}')
"
```

**CRITICAL — Verify parse succeeded.** If `name` is empty or `exp=0`, the parse failed silently. Run the local fallback:

```bash
# Fallback: run parser directly in Python and PUT the result
cd "/Users/nishitnalinsrivastava/dev/AI Agent/Resume Builder/backend" && source venv/bin/activate && python3 -c "
import asyncio, json
from resume_parser_ai import parse_resume_with_ai
import sqlite3

conn = sqlite3.connect('resume_builder.db')
cur = conn.cursor()
cur.execute('SELECT original_text FROM resumes WHERE id=$RESUME_ID')
text = cur.fetchone()[0]
conn.close()

result = asyncio.run(parse_resume_with_ai(text))
print(json.dumps(result))
" | python3 -c "
import sys, json
sections = json.load(sys.stdin)
import urllib.request, urllib.parse
data = json.dumps({'sections': sections}).encode()
req = urllib.request.Request('http://localhost:8000/api/resume/$RESUME_ID/sections',
    data=data, headers={'Content-Type': 'application/json'}, method='PUT')
resp = urllib.request.urlopen(req)
print('Fallback parse saved:', json.loads(resp.read()).get('message'))
"
```

## Step 3 — Validate Parsed Sections Before Continuing

```bash
curl -s http://localhost:8000/api/resume/$RESUME_ID | python3 -c "
import sys, json
d = json.load(sys.stdin)
s = d.get('parsed_sections', {})
c = s.get('contact', {})
exp = s.get('experience', [])
skills = s.get('skills', {})
all_skills = [sk for cat in skills.values() for sk in cat]

print('=== PARSED SECTIONS ===')
print(f'Name:     {c.get(\"name\",\"[MISSING]\")}')
print(f'Email:    {c.get(\"email\",\"[MISSING]\")}')
print(f'LinkedIn: {c.get(\"linkedin\",\"[not found]\")!r}')
print(f'GitHub:   {c.get(\"github\",\"[not found]\")!r}')
print(f'Roles:    {len(exp)}')
for job in exp:
    print(f'  • {job.get(\"title\")} @ {job.get(\"company\")} ({job.get(\"start_date\")}–{job.get(\"end_date\")})')
print(f'Skills:   {all_skills}')
print(f'Projects: {len(s.get(\"projects\",[]))}')
print(f'Certs:    {len(s.get(\"certifications\",[]))}')
"
```

### Contact URL check — STOP and ask user if needed

If `linkedin` or `github` contains plain text (e.g., `"Linkedin"`, `"Github"`) rather than a proper URL
(e.g., `"linkedin.com/in/username"`), **stop and ask the user**:

> "Your resume PDF contains 'Linkedin' and 'Github' as text but no actual URLs.
> What are your LinkedIn and GitHub profile URLs so I can include them correctly?"

Do NOT guess or fabricate profile URLs. Wait for the user's answer before proceeding.

## Step 4 — Ask Clarifying Questions

```bash
curl -s -X POST http://localhost:8000/api/clarify \
  -H "Content-Type: application/json" \
  -d "{\"resume_id\": $RESUME_ID, \"requirements_prompt\": \"$1\", \"job_description\": \"$1\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('questions',''))"
```

Show the questions to the user. Incorporate any answers into the requirements prompt for Step 5.

## Step 5 — Generate Optimized Resume

```bash
TEMPLATE="${2:-classic}"
curl -s -X POST http://localhost:8000/api/generate-resume \
  -H "Content-Type: application/json" \
  -d "{
    \"resume_id\": $RESUME_ID,
    \"job_description\": \"$1\",
    \"requirements_prompt\": \"$1\",
    \"template\": \"$TEMPLATE\"
  }" | python3 -c "
import sys, json
d = json.load(sys.stdin)
if 'detail' in d:
    print('ERROR:', d['detail'])
else:
    print('Generated ID:', d.get('generated_id'))
    print('ATS Score:   ', d.get('ats_score', 0))
    s = d.get('sections', {})
    print('Summary:', s.get('summary','')[:200])
"
```

## Step 6 — Audit the Generated Output

Before exporting, always run this audit and surface issues to the user:

```bash
curl -s http://localhost:8000/api/resume/$RESUME_ID | python3 -c "
import sys, json, re, sqlite3

conn = sqlite3.connect('/Users/nishitnalinsrivastava/dev/AI Agent/Resume Builder/backend/resume_builder.db')
cur = conn.cursor()
cur.execute('SELECT optimized_sections FROM generated_resumes WHERE resume_id=$RESUME_ID ORDER BY id DESC LIMIT 1')
row = cur.fetchone()
conn.close()

if not row:
    print('No generated resume found.')
    sys.exit()

g = json.loads(row[0])

# 1. Unquantified bullets
print('=== Unquantified bullets (need metrics) ===')
found = False
for exp in g.get('experience', []):
    for b in exp.get('bullets', []):
        if not re.search(r'\d', b):
            print(f'  [{exp[\"company\"]}] {b[:100]}')
            found = True
if not found:
    print('  All bullets quantified ✓')

# 2. Summary quality check
summary = g.get('summary', '')
print()
print('=== Summary ===')
print(summary)
if 'as a ' in summary.lower() and ' at ' in summary.lower():
    print()
    print('  WARNING: Summary leads with job title+company. Should lead with career identity instead.')
    print('  e.g. \"Backend engineer with 5+ years...\" not \"5+ years as Associate Engineer at Deutsche Bank...\"')

# 3. Skills that were not in the original resume
import sqlite3 as sq
conn2 = sq.connect('/Users/nishitnalinsrivastava/dev/AI Agent/Resume Builder/backend/resume_builder.db')
cur2 = conn2.cursor()
cur2.execute('SELECT parsed_sections FROM resumes WHERE id=$RESUME_ID')
orig = json.loads(cur2.fetchone()[0])
conn2.close()

orig_skills = {s.lower() for cat in orig.get('skills',{}).values() for s in cat}
gen_skills  = {s.lower() for cat in g.get('skills',{}).values()  for s in cat}
added = gen_skills - orig_skills
if added:
    print()
    print(f'=== Skills added that were NOT in original resume ===')
    print(f'  {added}')
    print('  Verify these with the user before keeping them.')
"
```

**If the audit shows issues, surface them to the user and fix before exporting.**

## Step 7 — Export PDF

```bash
OUT="/Users/nishitnalinsrivastava/dev/AI Agent/Resume Builder/output"
curl -s "http://localhost:8000/api/export/$RESUME_ID?format=pdf&template=$TEMPLATE" \
  -o "$OUT/resume_${RESUME_ID}_${TEMPLATE}.pdf"
curl -s "http://localhost:8000/api/export/$RESUME_ID?format=markdown" \
  -o "$OUT/resume_${RESUME_ID}.md"
echo "PDF:      $OUT/resume_${RESUME_ID}_${TEMPLATE}.pdf"
echo "Markdown: $OUT/resume_${RESUME_ID}.md"
open "$OUT/resume_${RESUME_ID}_${TEMPLATE}.pdf"
```

## Output to User

After completing all steps, tell the user:
1. **PDF path** — full path to the generated file
2. **What changed** — summarize actual improvements made
3. **Remaining issues** — unquantified bullets, missing contact fields, etc.
4. **Next steps** — offer `/resume-ats <id> <jd>` for keyword scoring or `/resume-coach <id>` for coaching

## Rules — Never Do These

- **Never fabricate LinkedIn/GitHub URLs** — ask the user if not present as proper URLs
- **Never add skills not present in the original resume or job description** — only add if explicitly mentioned in the JD or confirmed by the user
- **Never export without running the audit in Step 6 first**
- **Never assume the parse succeeded** — always verify name and experience count are non-empty

## Templates

| Template | Style | Best for |
|----------|-------|---------|
| `classic` | Times-Roman, traditional | Finance, law, academia |
| `modern` | Helvetica, minimal, blue accents | Tech startups, product |
| `technical` | Skills-first, green accents | Engineering, DevOps |
