---
name: resume-update
description: Update an existing parsed resume with new information, section edits, or job-specific changes, then re-export as PDF. Use when user says "update my resume", "change my summary", "add a new job", "add skills", "update resume ID X with...", or provides edits for specific resume sections.
argument-hint: "[resume_id] [what_to_change]"
allowed-tools: Bash, Read, Write
---

# Resume Update Pipeline

You are updating an existing resume in the AI Resume Builder. Fetch the current sections, apply the requested changes, save back, re-optimize, and re-export as PDF.

## Arguments
- `$0` — Resume ID (integer). If not provided, list available resumes.
- `$1` — Description of changes (e.g. "add Python and FastAPI to skills", "rewrite summary for ML Engineer role", "add new job at Google as Senior SWE from 2024 to present")

## Step 1 — List Resumes (if no ID given)

If `$0` is missing or "list":
```bash
curl -s http://localhost:8000/api/resumes \
  | python3 -c "
import sys, json
resumes = json.load(sys.stdin)
for r in resumes:
    parsed = '✓' if r.get('has_parsed_sections') else '✗'
    print(f\"  ID {r['id']}: {r['filename']} [{parsed} parsed] — {r['created_at'][:10]}\")
"
```

Ask the user which resume to update.

## Step 2 — Fetch Current Resume Sections

```bash
RESUME_ID=$0
curl -s http://localhost:8000/api/resume/$RESUME_ID \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
s = d.get('parsed_sections', {})
print(json.dumps(s, indent=2))
" > /tmp/current_resume_$RESUME_ID.json
cat /tmp/current_resume_$RESUME_ID.json
```

Read and display the current sections so you understand what exists.

## Step 3 — Apply Changes

Based on `$1` (the change description), modify the JSON sections. Common change patterns:

### Adding/updating skills
```python
# Add new skills to the appropriate category
sections["skills"]["languages"].append("Python")
sections["skills"]["frameworks"].append("FastAPI")
sections["skills"]["tools"].append("Docker")
```

### Rewriting summary
```python
sections["summary"] = "New summary text tailored to target role..."
```

### Adding a new job
```python
sections["experience"].insert(0, {
    "company": "Company Name",
    "title": "Job Title",
    "location": "City, State",
    "start_date": "Jan 2024",
    "end_date": "Present",
    "bullets": [
        "Bullet 1 with strong action verb and quantified impact",
        "Bullet 2 describing key achievement"
    ]
})
```

### Strengthening bullets
Apply these verb replacements:
- "worked on" → "Engineered"
- "helped" → "Enabled"
- "was responsible for" → "Owned"
- "built" → "Engineered"
- "created" → "Built"
- Add quantified metrics: "reducing latency by ~30%", "serving 10K+ daily users"

### Adding certifications
```python
sections["certifications"].append({
    "name": "AWS Solutions Architect",
    "issuer": "Amazon Web Services",
    "date": "2024"
})
```

## Step 4 — Save Updated Sections

```bash
curl -s -X PUT http://localhost:8000/api/resume/$RESUME_ID/sections \
  -H "Content-Type: application/json" \
  -d "{\"sections\": <updated_sections_json>}" \
  | python3 -c "import sys,json; print('Saved:', json.load(sys.stdin).get('message',''))"
```

## Step 5 — Re-Generate Optimized Resume

```bash
curl -s -X POST http://localhost:8000/api/generate-resume \
  -H "Content-Type: application/json" \
  -d "{
    \"resume_id\": $RESUME_ID,
    \"job_description\": \"\",
    \"requirements_prompt\": \"$1\",
    \"template\": \"classic\"
  }" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'Generated. ATS Score: {d.get(\"ats_score\",0):.0f}%')
print(f'Summary: {d.get(\"sections\",{}).get(\"summary\",\"\")[:120]}')
"
```

## Step 6 — Export Updated PDF

```bash
curl -s "http://localhost:8000/api/export/$RESUME_ID?format=pdf&template=classic" \
  -o "/Users/nishitnalinsrivastava/dev/AI Agent/Resume Builder/resume_updated_${RESUME_ID}.pdf"
echo "Updated PDF saved: resume_updated_${RESUME_ID}.pdf"
open "/Users/nishitnalinsrivastava/dev/AI Agent/Resume Builder/resume_updated_${RESUME_ID}.pdf"
```

## Output to User

After completing updates, tell the user:
1. **What changed** — summarize each modification made (e.g. "Added 3 skills", "Rewrote summary for ML Engineer", "Added Google job")
2. **PDF path** — where the updated resume was saved
3. **Before/after** — show the key sections that changed (summary, skills list)
4. Offer to run ATS analysis: `/resume-ats <id> <job_description>`

## Resume Data Schema Reference

```json
{
  "contact": { "name": "", "email": "", "phone": "", "location": "", "linkedin": "", "github": "", "website": "" },
  "summary": "Professional summary string",
  "experience": [
    { "company": "", "title": "", "location": "", "start_date": "", "end_date": "", "bullets": [] }
  ],
  "education": [
    { "institution": "", "degree": "", "field": "", "graduation_date": "", "gpa": "" }
  ],
  "skills": { "languages": [], "frameworks": [], "tools": [], "databases": [], "other": [] },
  "projects": [
    { "name": "", "description": "", "tech_stack": [], "link": "" }
  ],
  "certifications": [
    { "name": "", "issuer": "", "date": "" }
  ]
}
```
