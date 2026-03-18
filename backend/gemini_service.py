"""
Gemini 2.5 Flash integration for all AI resume operations.

All functions gracefully fall back to the rule engine (resume_generator.py)
when GEMINI_API_KEY is empty or the API call fails — never hard-fail.
"""

import json
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

# Lazy-init the Gemini client so startup doesn't fail if the package is missing.
_genai = None
_model = None


def _get_model():
    global _genai, _model
    if _model is not None:
        return _model
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        return None
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        _genai = genai
        _model = genai.GenerativeModel("gemini-2.5-flash")
        logger.info("Gemini 2.5 Flash model loaded.")
        return _model
    except Exception as exc:
        logger.warning("Failed to initialise Gemini client: %s", exc)
        return None


async def _generate(prompt: str) -> Optional[str]:
    """Call Gemini and return the text response, or None on failure."""
    model = _get_model()
    if model is None:
        return None
    try:
        response = await model.generate_content_async(prompt)
        return response.text.strip()
    except Exception as exc:
        logger.warning("Gemini API call failed: %s", exc)
        return None


# ─── Public functions ─────────────────────────────────────────────────────────

async def rewrite_summary(current_summary: str, job_description: str) -> Optional[str]:
    """Rewrite a resume summary targeting the given job description."""
    jd_snippet = job_description[:600] if job_description else ""
    prompt = f"""You are an expert resume writer. Rewrite the following professional summary to be more impactful, ATS-optimized, and tailored to the job description provided.

Current summary:
{current_summary or "(empty — write a compelling default)"}

Job description excerpt:
{jd_snippet or "(no job description provided — write a strong generic summary)"}

Instructions:
- 2–3 sentences maximum
- Start with a strong adjective + role title
- Include 2–3 concrete skills/technologies from the JD
- End with a value statement (what you deliver)
- Return ONLY the summary text, no quotes or extra commentary
"""
    return await _generate(prompt)


async def improve_bullets(
    bullets: list[str],
    job_description: str,
    role_title: str,
) -> Optional[list[str]]:
    """Improve a list of resume bullet points for a specific role."""
    jd_snippet = job_description[:600] if job_description else ""
    bullets_text = "\n".join(f"- {b}" for b in bullets)
    prompt = f"""You are an expert resume writer. Improve the following resume bullet points for a {role_title} role.

Current bullets:
{bullets_text}

Job description excerpt:
{jd_snippet or "(no job description provided)"}

Instructions:
- Start each bullet with a strong action verb (Engineered, Led, Optimized, etc.)
- Add quantifiable impact where plausible (%, users, time saved, $ amount)
- Mirror keywords from the job description naturally
- Keep each bullet to 1–2 lines
- Return ONLY the improved bullets, one per line, each starting with "- "
- Return exactly {len(bullets)} bullets
"""
    result = await _generate(prompt)
    if result is None:
        return None
    lines = [line.lstrip("- ").strip() for line in result.splitlines() if line.strip()]
    return lines if lines else None


async def optimize_resume(
    sections: dict,
    job_description: str,
    requirements_prompt: str,
) -> Optional[dict]:
    """Return a fully optimized resume sections dict, or None to fall back."""
    jd_snippet = job_description[:800] if job_description else ""
    sections_json = json.dumps(sections, indent=2)[:3000]
    prompt = f"""You are an expert ATS resume optimizer. Optimize the following resume JSON for the given job description.

Resume (JSON):
{sections_json}

Job description:
{jd_snippet or "(no job description provided)"}

Target role / requirements:
{requirements_prompt or "(not specified)"}

Instructions:
- Strengthen all experience bullets (action verbs, quantified impact, JD keywords)
- Rewrite the summary to be targeted and impactful (2–3 sentences)
- Add missing JD keywords to the appropriate skills categories
- Keep the JSON structure identical — same keys, same nesting
- Return ONLY valid JSON, no markdown fences, no explanation
"""
    result = await _generate(prompt)
    if result is None:
        return None
    try:
        # Strip markdown code fences if present
        text = result.strip()
        if text.startswith("```"):
            text = "\n".join(text.splitlines()[1:])
        if text.endswith("```"):
            text = "\n".join(text.splitlines()[:-1])
        return json.loads(text)
    except Exception as exc:
        logger.warning("Failed to parse Gemini optimize_resume response: %s", exc)
        return None


async def chat_response(
    resume_sections: dict,
    history: list,
    message: str,
    job_description: str,
) -> Optional[str]:
    """Generate a coaching chat reply, or None to fall back to rule engine."""
    sections_summary = json.dumps({
        "experience_count": len(resume_sections.get("experience", [])),
        "skills": resume_sections.get("skills", {}),
        "summary_length": len(resume_sections.get("summary", "")),
        "certifications": len(resume_sections.get("certifications", [])),
    })
    recent_history = history[-6:] if history else []
    history_text = "\n".join(
        f"{'User' if h.get('role') == 'user' else 'Assistant'}: {h.get('content', '')}"
        for h in recent_history
    )
    jd_snippet = job_description[:500] if job_description else ""
    prompt = f"""You are an expert resume coach. Help the user improve their resume.

Resume summary:
{sections_summary}

Job description:
{jd_snippet or "(not provided)"}

Recent conversation:
{history_text or "(new conversation)"}

User message: {message}

Instructions:
- Be concise, specific, and actionable (max 3–4 sentences or a short list)
- If asked about missing keywords, list the top 5–8 missing from the JD
- If asked to improve bullets/summary, show concrete example rewrites
- Use markdown (bold, bullet lists) for readability
- Never make up job titles or companies from the resume
"""
    return await _generate(prompt)


async def rewrite_text(text: str, instruction: str, context: str = "") -> Optional[str]:
    """Generic rewrite — used by the /api/ai/rewrite stateless endpoint."""
    prompt = f"""You are an expert resume writer. Rewrite the following text according to the instruction.

Text to rewrite:
{text or "(empty)"}

Instruction:
{instruction}

{f"Additional context:{chr(10)}{context}" if context else ""}

Instructions:
- Return ONLY the rewritten text, no explanations, no quotes
- Keep the same general meaning but make it stronger, more impactful, and professional
- If the text is bullet points (lines starting with - or •), return improved bullet points in the same format
"""
    return await _generate(prompt)
