"""
ATS compatibility scorer.
Uses spaCy for NLP-based keyword extraction with a robust fallback
to simple word tokenisation if the model is unavailable.

Section 6: Structured scoring — Gemini extracts required/preferred skills
from the JD first; required skills carry 2x weight.  Falls back to the
original spaCy approach when Gemini is unavailable or returns empty data.
"""
import json
import re
from typing import Set, Dict, Any

from gemini_service import sanitize_user_input, _generate

# ── spaCy setup ───────────────────────────────────────────────────────────────

_nlp = None

def _get_nlp():
    global _nlp
    if _nlp is not None:
        return _nlp
    try:
        import spacy
        _nlp = spacy.load("en_core_web_sm")
    except Exception:
        # spaCy may be incompatible with this Python version or model not installed.
        # We fall back to the regex tokeniser in all cases.
        _nlp = None
    return _nlp


# ── Keyword extraction ────────────────────────────────────────────────────────

# Common stop-words to skip even in the fallback path
_STOP = {
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "that", "this", "these",
    "those", "we", "you", "i", "he", "she", "it", "they", "our", "your",
    "their", "its", "as", "not", "no", "so", "if", "than", "then", "also",
    "all", "any", "each", "both", "few", "more", "most", "other", "some",
    "such", "up", "about", "after", "before", "between", "during", "through",
    "within", "without", "across", "into", "over", "under", "while",
    "experience", "work", "company", "team", "project", "role", "position",
    "responsibilities", "required", "requirements", "plus", "including",
    "ability", "strong", "excellent", "good", "great", "using", "use",
    "knowledge", "skills", "skill", "years", "year",
}


def _extract_keywords_spacy(text: str) -> Set[str]:
    nlp = _get_nlp()
    doc = nlp(text)
    keywords = set()
    for token in doc:
        if token.pos_ in ("NOUN", "PROPN") and not token.is_stop and len(token.text) > 1:
            kw = token.lemma_.lower()
            if kw not in _STOP:
                keywords.add(kw)
    return keywords


def _extract_keywords_fallback(text: str) -> Set[str]:
    """Simple regex tokeniser used when spaCy model is unavailable."""
    words = re.findall(r"\b[a-zA-Z][a-zA-Z+#.]{1,}\b", text)
    return {w.lower() for w in words if w.lower() not in _STOP and len(w) > 2}


def extract_keywords(text: str) -> Set[str]:
    if _get_nlp() is not None:
        return _extract_keywords_spacy(text)
    return _extract_keywords_fallback(text)


# ── Structured JD extraction (Section 6) ─────────────────────────────────────

async def extract_jd_requirements(jd_text: str) -> dict:
    """Use Gemini to extract structured job requirements from JD text."""
    prompt = f"""Extract job requirements as JSON from this job description.
Output ONLY valid JSON with no markdown, no explanation, no code fences.

Schema:
{{
  "required_skills": ["list of explicitly required technical skills"],
  "preferred_skills": ["list of preferred/nice-to-have skills"],
  "experience_years": 0,
  "seniority_level": "junior|mid|senior|staff|principal",
  "keywords": ["other important keywords from the JD"]
}}

Job Description:
{jd_text[:3000]}
"""
    try:
        raw = await _generate(prompt)
        if not raw:
            return {}
        text = raw.strip()
        # Strip markdown code fences if model included them
        if text.startswith("```"):
            lines = text.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            text = "\n".join(lines)
        result = json.loads(text)
        return result if isinstance(result, dict) else {}
    except Exception:
        return {}


# ── Structured scoring (Section 6) ───────────────────────────────────────────

def score_against_requirements(resume_text: str, requirements: dict) -> dict:
    """Score resume against structured JD requirements with 2x weight for required skills."""
    resume_lower = resume_text.lower()

    required_skills = requirements.get("required_skills", [])
    preferred_skills = requirements.get("preferred_skills", [])

    required_matched = [s for s in required_skills if s.lower() in resume_lower]
    preferred_matched = [s for s in preferred_skills if s.lower() in resume_lower]
    required_missing = [s for s in required_skills if s not in required_matched]
    preferred_missing = [s for s in preferred_skills if s not in preferred_matched]

    total_possible = (len(required_skills) * 2) + len(preferred_skills)
    earned = (len(required_matched) * 2) + len(preferred_matched)
    score = round((earned / total_possible) * 100) if total_possible > 0 else 0

    return {
        "score": score,
        "required_matched": required_matched,
        "required_missing": required_missing,
        "preferred_matched": preferred_matched,
        "preferred_missing": preferred_missing,
        "matched": required_matched + preferred_matched,   # backward compat
        "missing": required_missing + preferred_missing,   # backward compat
        "seniority": requirements.get("seniority_level", ""),
        "experience_years": requirements.get("experience_years", 0),
    }


# ── Scoring ───────────────────────────────────────────────────────────────────

async def calculate_ats_score(resume_text: str, job_description_text: str) -> Dict[str, Any]:
    """
    Calculate ATS compatibility score based on keyword overlap.

    Section 6: First attempts structured scoring via Gemini (required/preferred
    skills with 2x weight for required).  Falls back to spaCy keyword overlap
    when Gemini returns empty data or fails.

    Returns score (0-100), matched keywords, missing keywords, plus the new
    required_matched / required_missing / preferred_matched / preferred_missing
    / seniority / experience_years fields (empty defaults in fallback path).
    """
    resume_text = sanitize_user_input(resume_text)
    job_description_text = sanitize_user_input(job_description_text)
    if not job_description_text.strip():
        return {
            "score": 0, "matched": [], "missing": [],
            "required_matched": [], "required_missing": [],
            "preferred_matched": [], "preferred_missing": [],
            "seniority": "", "experience_years": 0,
            "message": "No job description provided.",
        }

    # ── Section 6: try structured Gemini scoring first ────────────────────────
    requirements = await extract_jd_requirements(job_description_text)
    if requirements.get("required_skills") or requirements.get("preferred_skills"):
        result = score_against_requirements(resume_text, requirements)
        result["recommendations"] = []
        result["keywords_found"] = result["matched"]
        result["keywords_missing"] = result["missing"]
        result["message"] = "Structured analysis complete."
        return result

    # ── Fallback: spaCy keyword overlap ──────────────────────────────────────
    resume_kw = extract_keywords(resume_text)
    jd_kw = extract_keywords(job_description_text)

    if not jd_kw:
        return {
            "score": 0, "matched": [], "missing": [],
            "required_matched": [], "required_missing": [],
            "preferred_matched": [], "preferred_missing": [],
            "seniority": "", "experience_years": 0,
            "message": "No keywords found in job description.",
        }

    matched = jd_kw & resume_kw
    missing = jd_kw - resume_kw
    score = round((len(matched) / len(jd_kw)) * 100)

    return {
        "score": score,
        "matched": sorted(matched),
        "missing": sorted(missing),
        "keywords_found": sorted(matched),
        "keywords_missing": sorted(missing),
        "recommendations": [],
        "required_matched": [],
        "required_missing": [],
        "preferred_matched": [],
        "preferred_missing": [],
        "seniority": "",
        "experience_years": 0,
        "message": "Analysis complete.",
    }
