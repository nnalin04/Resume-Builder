"""
Local resume parser — zero external API dependencies.

Handles the most common single-column PDF resume format:
  Line N:   Job Title
  Line N+1: Company Name
  Line N+2: "Month YYYY – Month YYYY  City"   ← confirms this is a job block
  Lines …:  Bullet text (may or may not start with •)
"""

import re
from typing import Optional

# ─── Section header detection ─────────────────────────────────────────────────

SECTION_MAP = {
    # FIX: wrap all alternatives in outer group so ^ anchors all of them
    "experience":     re.compile(r"^((work\s+)?experience|employment(\s+history)?|professional\s+background|work\s+history)", re.I),
    "education":      re.compile(r"^(education(al)?(\s+background)?|academic(\s+background)?|qualifications?)", re.I),
    "skills":         re.compile(r"^((technical\s+)?skills?(\s+&\s+(expertise|tools))?|competencies|technologies(\s+&\s+tools)?|core\s+competencies)", re.I),
    "projects":       re.compile(r"^(projects?(\s+&\s+achievements?)?|personal\s+projects?|key\s+projects?|side\s+projects?|academic\s+projects?)", re.I),
    "certifications": re.compile(r"^(certifications?|certificates?|credentials?|licenses?|awards?(\s+&\s+honors?)?)", re.I),
    "summary":        re.compile(r"^((professional\s+)?summary|profile|objective|about(\s+me)?|overview|career\s+(summary|objective))", re.I),
}

# ─── Regex patterns ───────────────────────────────────────────────────────────

EMAIL_RE    = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
PHONE_RE    = re.compile(r"(\+?\d[\d\s\-().]{6,}\d)")

# FIX: capture full URL including optional https://www. prefix
LINKEDIN_RE = re.compile(r"(?:https?://)?(?:www\.)?linkedin\.com/in/[\w\-]+", re.I)
GITHUB_RE   = re.compile(r"(?:https?://)?(?:www\.)?github\.com/[\w\-]+", re.I)
WEBSITE_RE  = re.compile(r"https?://(?!(?:www\.)?(?:linkedin|github)\.com)[\w\-\.]+\.[a-z]{2,}(?:/[\w\-\./?=&%#]*)?", re.I)

# Date range: "Nov 2022 - Present"  /  "Jan 2021 – Aug 2022"  /  "2019 - 2022"
DATE_RANGE_RE = re.compile(
    r"((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{4})"
    r"\s*[-–—to]+\s*"
    r"((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{4}|Present|Current|Now|ongoing)",
    re.I,
)

# Single year at end of line: "Scaler 2022"
YEAR_SUFFIX_RE = re.compile(r"^(.+?)\s+(\d{4})\s*$")

# "Key Skills:" line to discard from bullets
KEY_SKILLS_RE = re.compile(r"^key\s+skills?\s*:", re.I)

# ─── Skill taxonomy ───────────────────────────────────────────────────────────

_LANGUAGES  = {"java","python","javascript","typescript","c","c++","c#","go","golang","rust",
               "kotlin","swift","ruby","php","scala","bash","shell","sql","r","matlab","dart"}
_FRAMEWORKS = {"spring","spring boot","django","flask","fastapi","react","next.js","nextjs",
               "vue","angular","express","node.js","nodejs","rails","hibernate","kafka","spark",
               "hadoop","tensorflow","pytorch","grpc","graphql","microservices","rest"}
_TOOLS      = {"docker","kubernetes","k8s","jenkins","git","github","gitlab","bitbucket",
               "terraform","ansible","nginx","apache","linux","aws","azure","gcp","google cloud",
               "heroku","vercel","ci/cd","jira","confluence","maven","gradle","teamcity","openshift",
               "intellij","vscode","eclipse","ibm mq","apache ignite"}
_DATABASES  = {"mysql","postgresql","postgres","mongodb","redis","cassandra","oracle","sqlite",
               "dynamodb","elasticsearch","neo4j","firebase","sql server","mariadb"}


def _classify_skill(skill: str) -> str:
    s = skill.lower().strip()
    if s in _LANGUAGES:  return "languages"
    if s in _FRAMEWORKS: return "frameworks"
    if s in _TOOLS:      return "tools"
    if s in _DATABASES:  return "databases"
    return "other"


def _clean(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _normalize_url(url: str) -> str:
    """Ensure URL has https:// prefix."""
    url = url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    return url


# ─── Section splitter ─────────────────────────────────────────────────────────

# Strip leading/trailing non-letter characters (ASCII decorators + Unicode box-drawing U+2500-U+257F)
_DECORATOR_RE = re.compile(r"^[^a-zA-Z]+|[^a-zA-Z0-9\s]+$")


def _is_section_header(line: str) -> Optional[str]:
    # FIX: strip decorator/non-letter chars, increase length limit to 60
    s = _DECORATOR_RE.sub("", line).strip()
    if not s or len(s) > 60:
        return None
    # FIX: use fullmatch so "employment is growing" doesn't match "employment" pattern
    for key, pat in SECTION_MAP.items():
        if pat.fullmatch(s):
            return key
    return None


def _split_sections(lines: list[str]) -> dict[str, list[str]]:
    buckets: dict[str, list[str]] = {k: [] for k in SECTION_MAP}
    buckets["header"] = []
    current = "header"
    for line in lines:
        key = _is_section_header(line)
        if key:
            current = key
        else:
            buckets[current].append(line)
    return buckets


# ─── Contact ──────────────────────────────────────────────────────────────────

def _extract_contact(lines: list[str]) -> dict:
    # FIX: expand name search to first 10 lines, skip headers/emails/phones/links
    name = ""
    for ln in lines[:10]:
        s = ln.strip()
        if not s or len(s) < 2:
            continue
        if EMAIL_RE.search(s):
            continue
        if PHONE_RE.search(s):
            continue
        if LINKEDIN_RE.search(s) or GITHUB_RE.search(s):
            continue
        if _is_section_header(s):
            break  # hit a real section — name must have appeared before this
        name = s
        break

    # FIX: search first 20 lines for email/phone (they're almost always in the header)
    full_header = " ".join(lines[:20])

    email = EMAIL_RE.search(full_header)
    phone = PHONE_RE.search(full_header)

    # FIX: search the entire document for LinkedIn/GitHub (sometimes at bottom of header
    # or in a separate "Links" block further down the page)
    full_text = " ".join(lines)
    linkedin  = LINKEDIN_RE.search(full_text)
    github    = GITHUB_RE.search(full_text)
    website   = WEBSITE_RE.search(full_text)

    # Location: first short word(s) before the email/phone on the contact line
    location = ""
    for ln in lines[:10]:
        s = ln.strip()
        if EMAIL_RE.search(s) or PHONE_RE.search(s):
            parts = s.split()
            loc_parts = []
            for p in parts:
                if EMAIL_RE.match(p) or PHONE_RE.match(p) or p.lower() in ("linkedin","github","leetcode"):
                    break
                loc_parts.append(p)
            location = " ".join(loc_parts).strip()
            break

    return {
        "name":     name,
        "email":    email.group(0)                              if email    else "",
        "phone":    _clean(phone.group(0))                     if phone    else "",
        "location": location,
        # FIX: normalize URLs to always include https://
        "linkedin": _normalize_url(linkedin.group(0))          if linkedin else "",
        "github":   _normalize_url(github.group(0))            if github   else "",
        "website":  website.group(0)                           if website  else "",
    }


# ─── Skills ───────────────────────────────────────────────────────────────────

def _extract_skills(lines: list[str]) -> dict:
    result: dict[str, list] = {k: [] for k in ("languages","frameworks","tools","databases","other")}
    seen: set = set()
    text = ", ".join(l.strip() for l in lines if l.strip())

    # Protect compound tokens that contain / before splitting on /
    text = re.sub(r"\bCI\s*/\s*CD\b", "CI/CD", text, flags=re.I)
    text = re.sub(r"\bGCP\s*/\s*GCP\b", "GCP", text, flags=re.I)
    text = re.sub(r"\bGoogle\s+Cloud\s*/\s*GCP\b", "GCP", text, flags=re.I)
    text = re.sub(r"\bGoogle\s+Cloud\b", "GCP", text, flags=re.I)

    for raw_tok in re.split(r"[,|\n]+", text):  # split on comma/pipe/newline but NOT slash
        # Handle "Label: val1, val2" sub-structure
        if ":" in raw_tok:
            label_part, _, rest = raw_tok.partition(":")
            tokens = [t.strip() for t in rest.split(",")]
        else:
            tokens = [raw_tok.strip()]

        for tok in tokens:
            tok = _clean(tok)
            if len(tok) < 2 or len(tok) > 40:
                continue
            tl = tok.lower()
            if tl in seen:
                continue
            seen.add(tl)
            cat = _classify_skill(tok)
            result[cat].append(tok)

    return result


# ─── Experience ───────────────────────────────────────────────────────────────

def _looks_like_title(s: str) -> bool:
    """Heuristic: short proper-cased line with no sentence punctuation = job title."""
    if not s or len(s) > 60:
        return False
    if s.endswith((".", ",", ";")):
        return False
    if DATE_RANGE_RE.search(s):
        return False
    if KEY_SKILLS_RE.match(s):
        return False
    # Must start with an uppercase letter
    if not s[0].isupper():
        return False
    # Reject lines that read like bullet prose (contain common verbs mid-sentence)
    prose_markers = re.compile(r"\b(and|to|the|by|for|with|using|into|of|in|a|an)\b", re.I)
    words = s.split()
    if len(words) > 6 and prose_markers.search(s):
        return False
    return True


def _parse_experience(lines: list[str]) -> list[dict]:
    """
    Format detected in this CV:
        Title line
        Company line
        "Mon YYYY – Mon YYYY  City"   ← triggers a new job
        Plain-text bullet lines (may continue onto wrapped next line)

    Strategy: two-pointer lookahead so short title/company lines that appear
    between bullet blocks are captured as the next job, not as bullets.
    """
    # Pre-clean
    clean = [l.strip() for l in lines]

    jobs: list[dict] = []
    pending: list[str] = []      # title/company buffer before a date line
    current_job: dict | None = None

    def _make_job(date_line: str) -> dict | None:
        parts = [p for p in pending if p]
        dm = DATE_RANGE_RE.search(date_line)
        start    = _clean(dm.group(1)) if dm else ""
        end      = _clean(dm.group(2)).capitalize() if dm else ""
        location = _clean(DATE_RANGE_RE.sub("", date_line)).strip(" ,|–—")
        title    = parts[0] if len(parts) >= 1 else ""
        company  = parts[1] if len(parts) >= 2 else ""
        return {"company": company, "title": title, "location": location,
                "start_date": start, "end_date": end, "bullets": []}

    i = 0
    while i < len(clean):
        s = clean[i]
        i += 1
        if not s:
            continue

        dm = DATE_RANGE_RE.search(s)
        if dm:
            # Date line → flush pending as new job header
            if current_job:
                jobs.append(current_job)
            current_job = _make_job(s)
            pending = []
            continue

        if KEY_SKILLS_RE.match(s):
            continue

        if current_job is not None:
            # Lookahead: if the next 1-2 non-empty lines form (title, company, date),
            # this line is a new job title, not a bullet.
            future = [c for c in clean[i:i+3] if c]
            next_has_date = any(DATE_RANGE_RE.search(f) for f in future[:2])

            if _looks_like_title(s) and next_has_date:
                # Start buffering the next job's header
                pending = [s]
                if current_job:
                    jobs.append(current_job)
                current_job = None
                continue

            # Otherwise it's a bullet
            bullet = re.sub(r"^[•\-–*▪›·]\s*", "", s)
            if bullet:
                current_job["bullets"].append(bullet)
        else:
            # Not yet in a job — accumulate title/company
            pending.append(s)

    if current_job:
        jobs.append(current_job)

    # Merge wrapped lines (continuation fragments that start lowercase)
    for job in jobs:
        merged: list[str] = []
        for b in job["bullets"]:
            if merged and b and b[0].islower() and not merged[-1].endswith("."):
                merged[-1] += " " + b
            else:
                merged.append(b)
        job["bullets"] = merged

    return jobs


# ─── Education ────────────────────────────────────────────────────────────────

def _parse_education(lines: list[str]) -> list[dict]:
    """
    Format in this CV:
        "Specialisation in Software Development"   ← degree / cert title
        "Scaler 2022"                              ← institution + year
        "BE/B.Tech/BS"                             ← degree type
        "KIIT Bhubaneswar 2017"                    ← institution + year
    """
    entries: list[dict] = []
    clean_lines = [l.strip() for l in lines if l.strip()]

    i = 0
    while i < len(clean_lines):
        ln = clean_lines[i]

        # Skip lines that are obviously not education entries
        if len(ln) < 3:
            i += 1
            continue

        year_match = YEAR_SUFFIX_RE.match(ln)
        if year_match:
            # "Institution Year" format — look back for a degree line
            institution = _clean(year_match.group(1))
            year = year_match.group(2)
            # The previous entry's degree may already be set
            if entries and not entries[-1].get("institution"):
                entries[-1]["institution"] = institution
                entries[-1]["graduation_date"] = year
            else:
                # Could be a standalone cert block
                degree_line = clean_lines[i - 1] if i > 0 else ""
                entries.append({
                    "institution": institution,
                    "degree": degree_line,
                    "field": "",
                    "graduation_date": year,
                    "gpa": "",
                })
            i += 1
            continue

        # Line without a year → treat as degree / program title
        entries.append({
            "institution": "",
            "degree": ln,
            "field": "",
            "graduation_date": "",
            "gpa": "",
        })
        i += 1

    # Post-process: try to split "degree in field"
    for e in entries:
        m = re.search(r"\bin\s+([A-Za-z\s]+?)(?:\s*,|\s*\(|$)", e["degree"], re.I)
        if m:
            e["field"] = _clean(m.group(1))

    return [e for e in entries if e["degree"] or e["institution"]]


# ─── Projects ─────────────────────────────────────────────────────────────────

def _parse_projects(lines: list[str]) -> list[dict]:
    """
    Format: project name line (no date, relatively short) followed by plain text bullets.
    """
    projects: list[dict] = []
    current: dict | None = None

    for line in lines:
        s = line.strip()
        if not s:
            continue

        bullet = re.sub(r"^[•\-–*▪›·]\s*", "", s)
        is_short = len(s) <= 80
        looks_like_title = (
            is_short
            and not DATE_RANGE_RE.search(s)
            and not KEY_SKILLS_RE.match(s)
            and (s[0].isupper() or s[0].isdigit())
            and not bullet.startswith(("Developed","Built","Designed","Implemented","Created",
                                       "Architected","Accelerated","Applied","Improved","Resolved",
                                       "Led","Mentored","Modernized","Integrated","Engineered"))
        )

        if looks_like_title and current is not None:
            # Check if it's a continuation bullet or a new project name
            if current["description"] or current.get("_has_bullets"):
                projects.append(current)
                current = {"name": s, "description": "", "tech_stack": [], "link": "", "_has_bullets": False}
            else:
                # Still setting up the project name (multi-word title on 2 lines)
                current["name"] += " " + s
        elif current is None and looks_like_title:
            current = {"name": s, "description": "", "tech_stack": [], "link": "", "_has_bullets": False}
        elif current is not None:
            # It's a bullet / description line
            current["_has_bullets"] = True
            if current["description"]:
                current["description"] += " " + bullet
            else:
                current["description"] = bullet
        else:
            current = {"name": s, "description": "", "tech_stack": [], "link": "", "_has_bullets": False}

    if current:
        projects.append(current)

    # Clean up internal flag
    for p in projects:
        p.pop("_has_bullets", None)

    return projects


# ─── Certifications ───────────────────────────────────────────────────────────

def _parse_certifications(lines: list[str]) -> list[dict]:
    certs = []
    for line in lines:
        s = line.strip().lstrip("•-–*▪›· ")
        if not s or len(s) < 3:
            continue
        year_m = re.search(r"\b(\d{4})\b", s)
        date = year_m.group(1) if year_m else ""
        name_part = re.sub(r"\b\d{4}\b", "", s).strip(" –—|,")
        parts = re.split(r"\s*[|–—,]\s*", name_part, maxsplit=1)
        certs.append({
            "name":   _clean(parts[0]),
            "issuer": _clean(parts[1]) if len(parts) > 1 else "",
            "date":   date,
        })
    return certs


# ─── Date restoration post-processing ────────────────────────────────────────

_MONTH_DATE_RE = re.compile(
    r'\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|'
    r'Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)'
    r'[\s\./\-]*(\d{4})\b',
    re.IGNORECASE
)

def restore_dates_from_text(parsed: dict, raw_text: str) -> dict:
    """
    Patch year-only dates (e.g. "2020") in parsed JSON with month-inclusive
    dates from raw text when the year matches.
    Adopted from Resume-Matcher restore_dates_from_markdown().
    """
    full_dates: dict[str, list[str]] = {}
    for match in _MONTH_DATE_RE.finditer(raw_text):
        month, year = match.group(1), match.group(2)
        full_dates.setdefault(year, []).append(f"{month[:3]} {year}")

    year_only = re.compile(r'^\d{4}$')

    def patch(obj):
        if isinstance(obj, str) and year_only.match(obj.strip()):
            year = obj.strip()
            if year in full_dates:
                return full_dates[year][0]
        elif isinstance(obj, dict):
            return {k: patch(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [patch(item) for item in obj]
        return obj

    return patch(parsed)


# ─── Main public function ─────────────────────────────────────────────────────

async def parse_resume_with_ai(raw_text: str) -> dict:
    """
    Parse raw resume text into structured sections.
    First tries Gemini 3.1 Flash-Lite, then falls back to local heuristics.
    """
    try:
        from gemini_service import parse_resume_structured
        import logging
        logger = logging.getLogger(__name__)

        ai_result = await parse_resume_structured(raw_text)
        if ai_result:
            logger.info("parse_resume_with_ai: Successfully parsed using Gemini 3.1 Flash-Lite.")
            
            # Bucket the flat skills array
            skills_list = ai_result.get("skills", [])
            categorized_skills = {"languages": [], "frameworks": [], "tools": [], "databases": [], "other": []}
            if isinstance(skills_list, list):
                for skill in skills_list:
                    cat = _classify_skill(skill)
                    categorized_skills[cat].append(skill)
            
            result = {
                "contact": {
                    "name": ai_result.get("personalInfo", {}).get("fullName", ""),
                    "email": ai_result.get("personalInfo", {}).get("email", ""),
                    "phone": ai_result.get("personalInfo", {}).get("phone", ""),
                    "location": ai_result.get("personalInfo", {}).get("location", ""),
                    "linkedin": ai_result.get("personalInfo", {}).get("linkedin", ""),
                    "github": ai_result.get("personalInfo", {}).get("github", ""),
                    "website": ai_result.get("personalInfo", {}).get("portfolio", "")
                },
                "summary": ai_result.get("summary", ""),
                "experience": [
                    {
                        "company": exp.get("company", ""),
                        "title": exp.get("jobTitle", ""),
                        "location": exp.get("location", ""),
                        "start_date": exp.get("startDate", ""),
                        "end_date": exp.get("endDate", ""),
                        "bullets": exp.get("bulletPoints", [])
                    }
                    for exp in ai_result.get("workExperience", [])
                ],
                "education": [
                    {
                        "institution": edu.get("institution", ""),
                        "degree": edu.get("degree", ""),
                        "field": "",
                        "graduation_date": edu.get("endDate", edu.get("startDate", "")),
                        "gpa": edu.get("gpa", "")
                    }
                    for edu in ai_result.get("education", [])
                ],
                "skills": categorized_skills,
                "projects": [
                    {
                        "name": proj.get("name", ""),
                        "description": proj.get("description", ""),
                        "tech_stack": proj.get("technologies", []),
                        "link": proj.get("link", "")
                    }
                    for proj in ai_result.get("projects", [])
                ],
                "certifications": [
                    {
                        "name": cert.get("name", ""),
                        "issuer": cert.get("issuer", ""),
                        "date": cert.get("date", "")
                    }
                    for cert in ai_result.get("certifications", [])
                ]
            }
            result = restore_dates_from_text(result, raw_text)
            return result
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Fallback to local parser due to error: {e}")

    # Fallback to local heuristic parsing
    lines = raw_text.splitlines()
    buckets = _split_sections(lines)

    contact          = _extract_contact(lines)
    summary_lines    = [l.strip() for l in buckets.get("summary", []) if l.strip()]
    summary          = _clean(" ".join(summary_lines))
    experience       = _parse_experience(buckets.get("experience", []))
    education        = _parse_education(buckets.get("education", []))
    skills           = _extract_skills(buckets.get("skills", []))
    projects         = _parse_projects(buckets.get("projects", []))
    certifications   = _parse_certifications(buckets.get("certifications", []))

    result = {
        "contact":        contact,
        "summary":        summary,
        "experience":     experience,
        "education":      education,
        "skills":         skills,
        "projects":       projects,
        "certifications": certifications,
    }
    result = restore_dates_from_text(result, raw_text)
    return result
