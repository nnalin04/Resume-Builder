---
name: resume-ats
description: Run ATS (Applicant Tracking System) keyword analysis on a resume against a job description. Returns score, matched keywords, missing keywords, and targeted improvement suggestions. Use when user says "check ATS score", "how does my resume match this job", "what keywords am I missing", "ATS analysis", or pastes a job description.
argument-hint: "[resume_id] [job_description_text_or_file]"
allowed-tools: Bash, Read
---

# ATS Resume Analysis

You are running a keyword-match ATS analysis to see how well a resume matches a specific job description.

## Arguments
- `$0` — Resume ID (integer)
- `$1` — Job description: raw text, path to file, or URL

## Step 1 — Resolve Job Description

If `$1` is a file path:
```bash
JD=$(cat "$1" 2>/dev/null)
```

Otherwise use `$1` as raw text.

## Step 2 — Run ATS Score

```bash
RESUME_ID=$0
curl -s -X POST http://localhost:8000/api/ats-score \
  -H "Content-Type: application/json" \
  -d "{\"resume_id\": $RESUME_ID, \"job_description\": \"$JD\"}" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
score = d.get('score', 0)
matched = d.get('matched', [])
missing = d.get('missing', [])

bar_len = score // 5
bar = '█' * bar_len + '░' * (20 - bar_len)
grade = 'Excellent' if score >= 80 else 'Good' if score >= 60 else 'Needs Work' if score >= 40 else 'Poor'

print(f'ATS Score: {score}% [{bar}] — {grade}')
print()
print(f'Matched ({len(matched)}): {', '.join(sorted(matched)[:15])}' + ('...' if len(matched) > 15 else ''))
print()
print(f'Missing ({len(missing)}): {', '.join(sorted(missing)[:20])}' + ('...' if len(missing) > 20 else ''))
"
```

## Step 3 — Fetch Resume Details for Gap Analysis

```bash
curl -s http://localhost:8000/api/resume/$RESUME_ID \
  | python3 -c "
import sys, json, re
d = json.load(sys.stdin)
s = d.get('parsed_sections', {})
exp = s.get('experience', [])
skills = s.get('skills', {})
all_skills = skills.get('languages',[]) + skills.get('frameworks',[]) + skills.get('tools',[])
print(f'Resume: {s.get(\"contact\",{}).get(\"name\",\"Unknown\")}')
print(f'Roles: {len(exp)}  |  Skills listed: {len(all_skills)}')
print(f'Current skills: {', '.join(all_skills[:10])}')
"
```

## Step 4 — Generate Targeted Recommendations

Based on the score and missing keywords, provide a structured analysis:

### Score Interpretation
| Score | Grade | Action |
|-------|-------|--------|
| 80-100% | Excellent | Apply immediately, minor tweaks only |
| 60-79% | Good | Add 5-10 missing keywords, strengthen 2-3 bullets |
| 40-59% | Needs Work | Significant keyword gaps, rewrite summary & bullets |
| 0-39% | Poor | Resume needs major rework for this role |

### Gap Categories

Classify each missing keyword into:
- **Must-Add Skills** — tools/technologies directly required in JD ("required" or "must have")
- **Nice-to-Have Skills** — mentioned but not required ("preferred", "bonus")
- **Soft Keywords** — methodologies, practices (agile, scrum, ci/cd, microservices)
- **Domain Keywords** — industry-specific terms to weave into bullet points

### Recommended Fixes (Priority Order)

1. **Summary rewrite** — If score < 60%, suggest adding top 3-5 missing keywords to the summary
2. **Skills section additions** — List exact skills to add under correct category (languages/frameworks/tools/databases)
3. **Bullet enhancements** — Show 2-3 specific bullets that could incorporate missing keywords naturally
4. **Experience framing** — If target role differs significantly, suggest reframing job titles/descriptions

## Output Format

Present the analysis as:

```
ATS Match: [score]% — [grade]

✅ Matched ([N]): keyword1, keyword2, keyword3...

❌ Missing ([N]):
  Critical: keyword1, keyword2
  Skills:   keyword3, keyword4
  Soft:     keyword5, keyword6

Recommendations:
1. Add to Skills section: [list]
2. Add to Summary: [2-3 keywords to weave in]
3. Bullet to improve: "[old bullet]" → "[improved version with keyword]"

Run `/resume-update $RESUME_ID "add [keywords] to skills, update summary for [role]"` to apply these changes.
```

## Quick Fix Command

At the end, always provide a ready-to-run update command:
```
/resume-update $0 "add <top_5_missing_skills> to skills section; update summary to include <top_3_keywords> targeting <target_role>"
```
