"""
Resume generator with Gemini 3.1 Flash-Lite integration.

Capabilities:
1. generate_clarifying_questions  — returns targeted questions based on resume gaps
2. generate_optimized_resume      — rewrites bullets, injects JD keywords, strengthens summary (Gemini-first, rule-engine fallback)
3. build_chat_response            — coaching chat (Gemini-first, rule-engine fallback)
"""

import re
import json
import logging

logger = logging.getLogger(__name__)

# ─── Action verb library ──────────────────────────────────────────────────────

WEAK_TO_STRONG = {
    "worked on": "Engineered", "was responsible for": "Owned",
    "helped": "Enabled", "assisted": "Supported", "did": "Executed",
    "made": "Delivered", "used": "Leveraged", "wrote": "Authored",
    "fixed": "Resolved", "updated": "Enhanced", "changed": "Refactored",
    "handled": "Managed", "dealt with": "Addressed", "set up": "Architected",
    "created": "Built", "built": "Engineered", "developed": "Developed",
    "improved": "Optimized", "worked with": "Collaborated with",
    "responsible for": "Led", "managed": "Orchestrated",
    "maintained": "Sustained", "implemented": "Delivered",
    "tested": "Validated", "reviewed": "Evaluated",
}

# ─── ATS keyword weight map ───────────────────────────────────────────────────

# High-value terms to preferentially inject when missing
HIGH_VALUE_TERMS = {
    "agile", "scrum", "ci/cd", "rest api", "microservices", "cloud",
    "scalable", "performance", "optimization", "cross-functional",
    "stakeholder", "end-to-end", "distributed systems", "data pipeline",
}


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _extract_jd_keywords(jd: str) -> list[str]:
    """Pull meaningful technical keywords from a job description."""
    stop = {
        "the", "a", "an", "and", "or", "in", "on", "at", "to", "for",
        "of", "with", "by", "is", "are", "was", "we", "you", "will",
        "must", "should", "have", "has", "be", "our", "your", "this",
        "that", "as", "not", "if", "all", "any", "including", "required",
        "experience", "ability", "strong", "good", "great", "knowledge",
        "years", "plus", "team", "role", "position", "work", "looking",
        "seeking", "hire", "join", "company", "candidate", "applicant",
        "bonus", "preferred", "location", "remote", "competitive",
        "compensation", "salary", "benefit", "opportunity", "responsibilities",
        "qualification", "requirement", "description", "about", "also",
        "well", "into", "from", "than", "such", "both", "each", "very",
    }
    tokens = re.findall(r"[a-zA-Z][a-zA-Z+#./\-]{1,}", jd)
    seen, result = set(), []
    for t in tokens:
        tl = t.lower()
        if tl not in stop and tl not in seen and len(tl) > 2:
            seen.add(tl)
            result.append(t)
    return result


def _strengthen_bullet(bullet: str) -> str:
    """Replace weak verbs and ensure bullet starts with an action verb."""
    b = bullet.strip()
    # Replace weak phrases
    for weak, strong in WEAK_TO_STRONG.items():
        b = re.sub(r"(?i)^" + re.escape(weak) + r"\b", strong, b)
    # Capitalise first letter
    if b:
        b = b[0].upper() + b[1:]
    # Add period if missing
    if b and b[-1] not in ".!?":
        b += "."
    return b



def _resume_keywords(sections: dict) -> set:
    """Collect all text tokens from a structured resume."""
    text = json.dumps(sections).lower()
    return set(re.findall(r"[a-z][a-z+#./\-]{2,}", text))


def _gap_keywords(sections: dict, jd: str) -> list[str]:
    """Return JD keywords missing from the resume."""
    resume_kw = _resume_keywords(sections)
    jd_kw = _extract_jd_keywords(jd)
    return [k for k in jd_kw if k.lower() not in resume_kw]


# ─── Public API ──────────────────────────────────────────────────────────────

async def generate_clarifying_questions(resume_sections: dict, requirements_prompt: str) -> str:
    """
    Return targeted clarifying questions to improve resume output.
    Fully local — inspects the resume structure for gaps.
    """
    questions = []
    exp = resume_sections.get("experience", [])
    skills = resume_sections.get("skills", {})
    summary = resume_sections.get("summary", "")

    # Check for quantified bullets
    all_bullets = [b for job in exp for b in job.get("bullets", [])]
    quantified = [b for b in all_bullets if re.search(r"\d+[%kKmM$]?", b)]
    if len(quantified) < len(all_bullets) // 2:
        questions.append(
            "1. Can you share specific numbers for your achievements? "
            "(e.g. how many users, % performance gain, $ cost saved, team size)"
        )

    # Check for a summary
    if not summary:
        questions.append(
            "2. Do you have a 2–3 sentence professional summary you'd like to use? "
            "If not, I'll generate one based on your experience."
        )

    # Check target role clarity
    if requirements_prompt and len(requirements_prompt) < 30:
        questions.append(
            "3. What is your target job title and industry? "
            "(e.g. Senior Backend Engineer at a fintech startup in the US)"
        )

    # Check for missing skills
    all_skills = (
        skills.get("languages", []) + skills.get("frameworks", []) + skills.get("tools", [])
    )
    if len(all_skills) < 5:
        questions.append(
            "4. Which additional tools or technologies have you used that aren't on your resume? "
            "(e.g. cloud providers, CI/CD tools, testing frameworks)"
        )

    # Check for certifications gap
    if not resume_sections.get("certifications"):
        questions.append(
            "5. Do you hold any certifications? (AWS, GCP, Oracle, Scrum, etc.)"
        )

    if not questions:
        questions.append(
            "Your resume looks comprehensive! "
            "Would you like me to focus on any specific section or target a particular company type?"
        )

    return "\n\n".join(questions)


async def generate_optimized_resume(
    current_sections: dict,
    job_description: str,
    requirements_prompt: str,
) -> dict:
    """
    Produce an ATS-optimized version of the resume.
    Tries Gemini 3.1 Flash-Lite first; falls back to local rule engine on failure.
    """
    import copy

    # ── Try Gemini first ──────────────────────────────────────────────────────
    try:
        from gemini_service import optimize_resume as gemini_optimize
        result = await gemini_optimize(current_sections, job_description, requirements_prompt)
        if result and isinstance(result, dict):
            logger.info("generate_optimized_resume: Gemini response used.")
            return result
    except Exception as exc:
        logger.warning("Gemini optimize_resume failed, falling back to rule engine: %s", exc)

    # ── Rule-engine fallback ──────────────────────────────────────────────────
    logger.info("generate_optimized_resume: using rule-engine fallback.")
    optimized = copy.deepcopy(current_sections)

    jd_keywords = _extract_jd_keywords(job_description) if job_description else []

    # ── 1. Strengthen experience bullets ─────────────────────────────────────
    for job in optimized.get("experience", []):
        new_bullets = []
        for bullet in job.get("bullets", []):
            new_bullets.append(_strengthen_bullet(bullet))

        # Ensure at least 2 bullets per role
        while len(new_bullets) < 2 and job.get("title"):
            new_bullets.append(
                f"Contributed to {job['title'].lower()} deliverables, "
                "collaborating cross-functionally to meet sprint goals."
            )

        job["bullets"] = new_bullets

    # ── 2. Regenerate / enhance summary ───────────────────────────────────────
    exp_list = optimized.get("experience", [])
    latest_title = exp_list[0].get("title", "Software Engineer") if exp_list else "Software Engineer"
    latest_company = exp_list[0].get("company", "") if exp_list else ""
    years = _estimate_years(exp_list)

    lang_list = ", ".join(optimized.get("skills", {}).get("languages", [])[:4])
    fw_list = ", ".join(optimized.get("skills", {}).get("frameworks", [])[:4])

    # Parse target role from requirements prompt
    target_role = _extract_target_role(requirements_prompt) or latest_title
    target_industry = _extract_target_industry(requirements_prompt) or "technology"

    article = "an" if latest_title and latest_title[0].lower() in "aeiou" else "a"
    display_role = target_role or latest_title
    summary = (
        f"{years}+ year{'s' if years != 1 else ''} of experience as {article} {latest_title}"
        + (f" at {latest_company}" if latest_company else "")
        + f", specialising in {lang_list or 'backend development'}"
        + (f" and {fw_list}" if fw_list else "")
        + f". Seeking a {display_role} role in {target_industry}"
        + " with a focus on building scalable, high-performance systems."
        + (" Strong track record of delivering quantifiable results in fast-paced environments." if years >= 3 else "")
    )
    optimized["summary"] = summary

    # ── 3. Add missing high-value skills if mentioned in JD ──────────────────
    if jd_keywords:
        skills = optimized.setdefault("skills", {})
        for cat in ("languages", "frameworks", "tools", "databases", "other"):
            skills.setdefault(cat, [])

        existing_skills_lower = {s.lower() for cat in skills.values() for s in cat}
        for kw in jd_keywords[:20]:
            kl = kw.lower()
            if kl not in existing_skills_lower:
                from resume_parser_ai import _classify_skill
                cat = _classify_skill(kw)
                if cat != "other" or kw in HIGH_VALUE_TERMS:
                    skills[cat].append(kw)
                    existing_skills_lower.add(kl)

    return optimized


def _estimate_years(experience: list) -> int:
    """Rough year estimate from experience list."""
    if not experience:
        return 0
    years = 0
    for job in experience:
        start = job.get("start_date", "")
        end = job.get("end_date", "")
        sy = re.search(r"(\d{4})", start)
        ey = re.search(r"(\d{4})", end)
        if sy and ey:
            years += int(ey.group(1)) - int(sy.group(1))
        elif sy and (not end or "present" in end.lower() or "current" in end.lower()):
            import datetime
            years += datetime.datetime.now().year - int(sy.group(1))
    return max(years, 1)


def _extract_target_role(prompt: str) -> str:
    """Pull target job title from requirements prompt."""
    if not prompt:
        return ""
    m = re.search(
        r"(senior|junior|lead|principal|staff)?\s*(software|backend|frontend|fullstack|full.stack|data|ml|devops|cloud)?\s*(engineer|developer|architect|scientist|analyst)",
        prompt, re.I
    )
    return m.group(0).strip().title() if m else ""


def _extract_target_industry(prompt: str) -> str:
    """Pull target industry from requirements prompt."""
    if not prompt:
        return "technology"
    industries = {
        "fintech": "fintech", "finance": "finance", "banking": "banking",
        "healthcare": "healthcare", "ecommerce": "e-commerce",
        "startup": "a high-growth startup", "enterprise": "enterprise",
        "saas": "SaaS", "ai": "AI/ML", "gaming": "gaming",
    }
    pl = prompt.lower()
    for key, label in industries.items():
        if key in pl:
            return label
    return "technology"


# ─── Chat response ────────────────────────────────────────────────────────────

CHAT_RULES = [
    # (trigger keywords, response template)
    (
        {"bullet", "bullets", "improve", "rewrite", "achievement"},
        lambda sections, jd, msg: _chat_bullets(sections),
    ),
    (
        {"summary", "profile", "objective"},
        lambda sections, jd, msg: _chat_summary(sections),
    ),
    (
        {"skill", "skills", "technology", "keyword", "missing"},
        lambda sections, jd, msg: _chat_skills(sections, jd),
    ),
    (
        {"ats", "score", "keyword coverage"},
        lambda sections, jd, msg: _chat_ats(sections, jd),
    ),
    (
        {"tip", "advice", "best practice", "improve", "suggest"},
        lambda sections, jd, msg: _chat_tips(),
    ),
    (
        {"export", "download", "pdf", "save"},
        lambda _s, _j, _m: "Use the **Export** buttons on the left panel to download your resume as PDF, Markdown, or JSON.",
    ),
]


async def build_chat_response(
    resume_sections: dict,
    _chat_history: list,
    user_message: str,
    job_description: str,
) -> str:
    # ── Try Gemini first ──────────────────────────────────────────────────────
    try:
        from gemini_service import chat_response as gemini_chat
        result = await gemini_chat(resume_sections, _chat_history, user_message, job_description)
        if result:
            logger.info("build_chat_response: Gemini response used.")
            return result
    except Exception as exc:
        logger.warning("Gemini chat_response failed, falling back to rule engine: %s", exc)

    # ── Rule-engine fallback ──────────────────────────────────────────────────
    logger.info("build_chat_response: using rule-engine fallback.")
    words = set(re.findall(r"\w+", user_message.lower()))

    for trigger_set, handler in CHAT_RULES:
        if words & trigger_set:
            return handler(resume_sections, job_description, user_message)

    # Default: generic coaching reply
    exp = resume_sections.get("experience", [])
    skills = resume_sections.get("skills", {})
    all_skills = skills.get("languages", []) + skills.get("frameworks", [])
    return (
        f"I can see you have **{len(exp)} role(s)** on your resume "
        f"with skills in **{', '.join(all_skills[:5]) or 'various technologies'}**.\n\n"
        "Here's what I can help you with:\n"
        "- **Rewrite bullets** — ask me to improve your bullet points\n"
        "- **Improve summary** — ask me to rewrite your summary\n"
        "- **Missing keywords** — ask what keywords you're missing for the job\n"
        "- **ATS tips** — ask for ATS best practices\n"
        "- **Export** — download your resume as PDF, Markdown, or JSON"
    )


def _chat_bullets(sections: dict) -> str:
    exp = sections.get("experience", [])
    if not exp:
        return "No experience entries found. Upload your resume first."
    resp = "**Improved bullet points for your most recent role:**\n\n"
    job = exp[0]
    resp += f"**{job.get('title')} @ {job.get('company')}**\n"
    for b in job.get("bullets", [])[:4]:
        improved = _strengthen_bullet(b)
        resp += f"- {improved}\n"
    resp += "\nWould you like me to improve bullets for other roles too?"
    return resp


def _chat_summary(sections: dict) -> str:
    exp = sections.get("experience", [])
    skills = sections.get("skills", {})
    title = exp[0].get("title", "Software Engineer") if exp else "Software Engineer"
    years = _estimate_years(exp)
    langs = ", ".join(skills.get("languages", [])[:3])
    return (
        f"**Suggested professional summary:**\n\n"
        f"> Results-driven **{title}** with {years}+ years of experience "
        f"building high-performance systems using {langs or 'modern technologies'}. "
        f"Proven ability to deliver scalable solutions and collaborate cross-functionally "
        f"to drive business impact.\n\n"
        "You can copy this into the summary field in the editor."
    )


def _chat_skills(sections: dict, jd: str) -> str:
    if not jd:
        all_s = sections.get("skills", {})
        total = sum(len(v) for v in all_s.values())
        return (
            f"Your resume lists **{total} skills** across all categories. "
            "Paste a job description in the JD panel on the left, then click "
            "**Analyze ATS Fit** to see exactly which keywords you're missing."
        )
    gap = _gap_keywords(sections, jd)
    if not gap:
        return "Great news — your resume already covers the main keywords in the job description!"
    top_missing = gap[:10]
    return (
        f"**{len(gap)} keywords from the JD are missing from your resume.**\n\n"
        f"Top missing: **{', '.join(top_missing)}**\n\n"
        "Click **Generate Resume** to automatically inject these keywords, "
        "or add them manually to your Skills section."
    )


def _chat_ats(_sections: dict, _jd: str) -> str:
    return (
        "**ATS Optimisation Checklist:**\n\n"
        "✅ Use a single-column layout (done — all 3 templates are ATS-safe)\n"
        "✅ Start every bullet with a strong action verb\n"
        "✅ Quantify at least 50% of your achievements\n"
        "✅ Mirror exact keywords from the job description\n"
        "✅ Keep formatting clean — no tables, no text boxes\n"
        "✅ Use standard section headers (Experience, Education, Skills)\n\n"
        "Paste a job description and click **Analyze ATS Fit** for your personalised score."
    )


def _chat_tips() -> str:
    return (
        "**Top resume tips for 2025:**\n\n"
        "1. **Lead with impact** — put your biggest achievement first in each role\n"
        "2. **Quantify everything** — numbers (%, $, users, time saved) stand out\n"
        "3. **Mirror the JD** — use the exact same terms the job posting uses\n"
        "4. **Keep it to 1–2 pages** — recruiters spend ~6 seconds on a first scan\n"
        "5. **ATS-safe PDF** — use the PDF export; avoid tables, columns, and images\n"
        "6. **Strong summary** — 3 sentences: who you are, what you do, what you want\n"
        "7. **Skills section at the bottom** — ATS reads top-to-bottom; experience first\n\n"
        "Click **Generate Resume** to apply these automatically to your resume."
    )
