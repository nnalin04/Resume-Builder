"""
ATS compatibility scorer.
Uses spaCy for NLP-based keyword extraction with a robust fallback
to simple word tokenisation if the model is unavailable.
"""
import re
from typing import Set, Dict, Any

from gemini_service import sanitize_user_input

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


# ── Scoring ───────────────────────────────────────────────────────────────────

def calculate_ats_score(resume_text: str, job_description_text: str) -> Dict[str, Any]:
    """
    Calculate ATS compatibility score based on keyword overlap.
    Returns score (0-100), matched keywords, and missing keywords.
    """
    resume_text = sanitize_user_input(resume_text)
    job_description_text = sanitize_user_input(job_description_text)
    if not job_description_text.strip():
        return {"score": 0, "matched": [], "missing": [], "message": "No job description provided."}

    resume_kw = extract_keywords(resume_text)
    jd_kw = extract_keywords(job_description_text)

    if not jd_kw:
        return {"score": 0, "matched": [], "missing": [], "message": "No keywords found in job description."}

    matched = jd_kw & resume_kw
    missing = jd_kw - resume_kw
    score = round((len(matched) / len(jd_kw)) * 100)

    return {
        "score": score,
        "matched": sorted(matched),
        "missing": sorted(missing),
        "message": "Analysis complete.",
    }
