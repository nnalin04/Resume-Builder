"""
Gemini 3.1 Flash-Lite integration for all AI resume operations.

All functions gracefully fall back to the rule engine (resume_generator.py)
when GEMINI_API_KEY is empty or the API call fails — never hard-fail.

Note: Uses direct httpx REST calls (v1beta) to avoid SDK version compatibility
issues with newer Gemini model names.
"""

import json
import logging
import os
import re as _gsre
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

_INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?previous\s+instructions?",
    r"disregard\s+(all\s+)?above",
    r"forget\s+(all\s+)?previous",
    r"system\s*:",
    r"you\s+are\s+now\s+",
    r"new\s+instructions?\s*:",
    r"override\s+(previous\s+)?instructions?",
    r"<\s*/?(?:system|instruction|prompt)\s*>",
]

def sanitize_user_input(text: str, max_len: int = 4000) -> str:
    """Strip prompt injection patterns from user-submitted text before inserting into prompts."""
    if not text:
        return text
    text = text[:max_len]
    for pattern in _INJECTION_PATTERNS:
        text = _gsre.sub(pattern, "[REMOVED]", text, flags=_gsre.IGNORECASE)
    return text

_GEMINI_MODEL = "gemini-3.1-flash-lite-preview"
_GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models"


def _get_api_key() -> Optional[str]:
    key = os.getenv("GEMINI_API_KEY", "")
    return key if key else None


async def _generate(prompt: str) -> Optional[str]:
    """Call Gemini via REST and return the text response, or None on failure."""
    api_key = _get_api_key()
    if not api_key:
        logger.warning("GEMINI_API_KEY not set — skipping AI call.")
        return None
    logger.debug(
        "Gemini call: model=%s prompt_len=%d",
        _GEMINI_MODEL, len(prompt),
        extra={"event": "gemini_call_start", "model": _GEMINI_MODEL, "prompt_preview": prompt[:150]},
    )
    url = f"{_GEMINI_BASE}/{_GEMINI_MODEL}:generateContent?key={api_key}"
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            logger.debug(
                "Gemini response: len=%d preview=%s",
                len(text), text[:100],
                extra={"event": "gemini_call_success", "response_len": len(text)},
            )
            return text.strip()
    except Exception as exc:
        logger.warning("Gemini REST API call failed: %s", exc)
        return None


async def rewrite_text(text: str, instruction: str = "", context: str = "") -> Optional[str]:
    """Strengthen a resume bullet point or summary using Gemini."""
    text = sanitize_user_input(text)
    instruction = sanitize_user_input(instruction)
    context = sanitize_user_input(context)
    if not text.strip():
        return None
    instruction_part = f"\nInstruction: {instruction}" if instruction.strip() else ""
    context_part = f"\nContext: {context}" if context.strip() else ""
    prompt = f"Rewrite the following resume text to be more high-impact and ATS-friendly: {text}{instruction_part}{context_part}"
    return await _generate(prompt)


async def parse_resume_structured(raw_text: str) -> Optional[dict]:
    """
    Parse raw extracted PDF text into a highly structured JSON format using Gemini.
    Follows strict JSON schema rules to ensure perfect data extraction.
    """
    raw_text = sanitize_user_input(raw_text)
    if not raw_text.strip():
        return None

    prompt = f"""You are an expert resume parser. Extract structured data from this resume text and return ONLY valid JSON.

Raw Resume Text:
{raw_text}

Rules:
1. Fix common PDF extraction errors (e.g., connected words, weird characters).
2. For dates, standardize to "Month YYYY" (e.g., "Aug 2021", "Present").
3. Do NOT make up information. If a field is missing, use an empty string "" or empty array [].
4. Return ONLY raw JSON. No markdown formatting (no ```json).

The JSON schema MUST be EXACTLY:
{{
  "personalInfo": {{
    "fullName": "...",
    "email": "...",
    "phone": "...",
    "location": "...",
    "linkedin": "...",
    "github": "...",
    "portfolio": "..."
  }},
  "summary": "...",
  "workExperience": [
    {{
      "jobTitle": "...",
      "company": "...",
      "location": "...",
      "startDate": "...",
      "endDate": "...",
      "bulletPoints": ["...", "..."]
    }}
  ],
  "education": [
    {{
      "degree": "...",
      "institution": "...",
      "location": "...",
      "startDate": "...",
      "endDate": "...",
      "gpa": "..."
    }}
  ],
  "skills": ["...", "..."],
  "projects": [
    {{
       "name": "...",
       "description": "...",
       "technologies": ["...", "..."],
       "link": "..."
    }}
  ],
  "certifications": [
    {{
       "name": "...",
       "issuer": "...",
       "date": "..."
    }}
  ],
  "customSections": [
    {{
      "heading": "Section Title",
      "items": [
        {{
          "title": "item title",
          "date": "optional date or empty string",
          "description": "optional description or empty string"
        }}
      ]
    }}
  ]
}}

5. If the resume contains non-standard sections (e.g. Publications, Awards, Volunteer Work, Languages, Conferences, Patents, Honors, or any other section not covered above), capture them in the "customSections" array using the schema above. Include only sections that are actually present in the resume. If there are no such sections, return "customSections": [].
"""
    result = await _generate(prompt)
    if result is None:
        return None
    try:
        text = result.strip()
        if text.startswith("```"):
            # Strip markdown code blocks if AI included them despite instructions
            lines = text.splitlines()
            if lines[0].startswith("```"): lines = lines[1:]
            if lines[-1].startswith("```"): lines = lines[:-1]
            text = "\n".join(lines)
            
        return json.loads(text)
    except Exception as exc:
        logger.warning(f"Failed to parse Gemini parse_resume_structured response: {exc}")
        return None


async def chat_response(
    resume_sections: dict,
    history: list,
    user_msg: str
) -> Optional[str]:
    """AI resume coach chatbot logic."""
    user_msg = sanitize_user_input(user_msg)
    sections_json = json.dumps(resume_sections, indent=2)
    prompt = f"You are an expert AI resume coach. Context:\n{sections_json}\nUser message: {user_msg}"
    return await _generate(prompt)
