import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

import models
from ats_scorer import calculate_ats_score
from auth import get_current_user, get_current_user_optional
from database import get_db
from rate_limiter import limiter
from resume_generator import build_chat_response, generate_clarifying_questions, generate_optimized_resume
from search_client import perform_web_search
from services.resume_service import _check_resume_ownership, _get_resume_or_404, _sections_to_text
from services.serialization_service import _safe_json


router = APIRouter()
logger = logging.getLogger(__name__)


class AtsRequest(BaseModel):
    resume_id: int
    job_description: str = Field(max_length=8000)


class GenerateRequest(BaseModel):
    resume_id: int
    job_description: str = Field(default="", max_length=8000)
    requirements_prompt: str = Field(default="", max_length=4000)
    template: str = Field(default="classic", pattern="^(classic|modern|technical|professional|twocolumn|clean)$")


class ChatRequest(BaseModel):
    resume_id: int
    message: str = Field(max_length=4000)
    job_description: str = Field(default="", max_length=8000)


class RewriteRequest(BaseModel):
    text: str = Field(max_length=5000)
    instruction: str = Field(max_length=1000)
    context: str = Field(default="", max_length=2000)


class CoverLetterRequest(BaseModel):
    resume_id: int
    job_description: str = Field(max_length=8000)
    company: str = Field(max_length=200)
    tone: str = Field(default="professional", pattern="^(professional|enthusiastic|concise)$")


@router.post("/api/ats-score")
@limiter.limit("10/minute")
async def get_ats_score(
    request: Request,
    body: AtsRequest,
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    resume = _get_resume_or_404(body.resume_id, db)
    _check_resume_ownership(resume, current_user)
    parsed = _safe_json(resume.parsed_sections)

    resume_text = _sections_to_text(parsed) if parsed else resume.original_text
    return await calculate_ats_score(resume_text, body.job_description)


@router.post("/api/clarify")
@limiter.limit("10/minute")
async def get_clarifying_questions(
    request: Request,
    body: GenerateRequest,
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    resume = _get_resume_or_404(body.resume_id, db)
    _check_resume_ownership(resume, current_user)
    parsed = _safe_json(resume.parsed_sections)
    if not parsed:
        raise HTTPException(status_code=400, detail="Parse the resume first.")

    questions = await generate_clarifying_questions(parsed, body.requirements_prompt)
    return {"questions": questions}


@router.post("/api/generate-resume")
@limiter.limit("20/minute")
async def generate_resume(
    request: Request,
    body: GenerateRequest,
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    resume = _get_resume_or_404(body.resume_id, db)
    _check_resume_ownership(resume, current_user)
    parsed = _safe_json(resume.parsed_sections)
    if not parsed:
        raise HTTPException(status_code=400, detail="Parse the resume first.")

    optimized = await generate_optimized_resume(
        current_sections=parsed,
        job_description=body.job_description,
        requirements_prompt=body.requirements_prompt,
    )
    if "error" in optimized:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {optimized['error']}")

    ats_score = 0.0
    if body.job_description.strip():
        score_result = await calculate_ats_score(_sections_to_text(optimized), body.job_description)
        ats_score = score_result.get("score", 0.0)

    gen = models.GeneratedResume(
        resume_id=body.resume_id,
        template=body.template,
        optimized_sections=json.dumps(optimized),
        job_description=body.job_description,
        requirements_prompt=body.requirements_prompt,
        ats_score=ats_score,
    )
    db.add(gen)
    db.commit()
    db.refresh(gen)

    return {
        "generated_id": gen.id,
        "sections": optimized,
        "ats_score": ats_score,
        "template": body.template,
    }


@router.post("/api/chat")
@limiter.limit("20/minute")
async def chat_with_ai(
    request: Request,
    body: ChatRequest,
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    resume = _get_resume_or_404(body.resume_id, db)
    _check_resume_ownership(resume, current_user)
    parsed = _safe_json(resume.parsed_sections)

    history_rows = (
        db.query(models.ChatHistory)
        .filter(models.ChatHistory.resume_id == body.resume_id)
        .order_by(models.ChatHistory.created_at.asc())
        .all()
    )
    history = [{"role": h.role, "content": h.content} for h in history_rows]

    reply = await build_chat_response(
        resume_sections=parsed,
        _chat_history=history,
        user_message=body.message,
        job_description=body.job_description,
    )

    db.add(models.ChatHistory(resume_id=body.resume_id, role="user", content=body.message))
    db.add(models.ChatHistory(resume_id=body.resume_id, role="assistant", content=reply))
    db.commit()

    return {"reply": reply}


@router.delete("/api/chat/{resume_id}")
def clear_chat(
    resume_id: int,
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    resume = _get_resume_or_404(resume_id, db)
    _check_resume_ownership(resume, current_user)
    db.query(models.ChatHistory).filter(models.ChatHistory.resume_id == resume_id).delete()
    db.commit()
    return {"message": "Chat history cleared."}


@router.post("/api/ai/rewrite")
@limiter.limit("20/minute")
async def ai_rewrite(
    request: Request,
    body: RewriteRequest,
    current_user: Optional[models.User] = Depends(get_current_user_optional),
):
    try:
        from gemini_service import rewrite_text

        result = await rewrite_text(body.text, body.instruction, body.context)
        if result:
            return {"result": result}
    except Exception as exc:
        logger.warning("ai_rewrite Gemini call failed: %s", exc)

    return {"result": body.text}


@router.post("/api/cover-letter/generate")
@limiter.limit("10/minute")
async def generate_cover_letter(
    request: Request,
    body: CoverLetterRequest,
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    resume = _get_resume_or_404(body.resume_id, db)
    _check_resume_ownership(resume, current_user)

    gen = (
        db.query(models.GeneratedResume)
        .filter(models.GeneratedResume.resume_id == body.resume_id)
        .order_by(models.GeneratedResume.created_at.desc())
        .first()
    )
    sections = _safe_json(gen.optimized_sections) if gen else _safe_json(resume.parsed_sections)

    tone_instruction = {
        "professional": "formal, confident, and polished",
        "enthusiastic": "energetic, passionate, and excited about the opportunity",
        "concise": "brief, direct, and to the point - 3 short paragraphs maximum",
    }[body.tone]

    contact = sections.get("contact", sections.get("personal", {}))
    name = contact.get("name", "the applicant")
    summary = sections.get("summary", "")
    exp_list = sections.get("experience", [])
    top_exp = exp_list[0] if exp_list else {}
    skills = sections.get("skills", {})
    all_skills = []
    for key in ("languages", "frameworks", "tools", "databases", "other"):
        all_skills.extend(skills.get(key, []))

    sections_snippet = json.dumps(
        {
            "name": name,
            "summary": summary[:400],
            "most_recent_role": f"{top_exp.get('title', '')} at {top_exp.get('company', '')}",
            "key_skills": all_skills[:12],
        }
    )

    prompt = f"""You are an expert cover letter writer. Write a compelling cover letter for {name} applying to {body.company or "the company"}.

Tone: {tone_instruction}

Candidate summary:
{sections_snippet}

Job description:
{body.job_description[:1200]}

Instructions:
- Write exactly 3 paragraphs
- Paragraph 1: Express interest in the role + brief positioning statement
- Paragraph 2: Highlight 2-3 specific achievements/skills that match the JD
- Paragraph 3: Call to action - express enthusiasm and request an interview
- Do NOT include any header, salutation, or sign-off - just the 3 paragraphs
- Return ONLY the cover letter text, no markdown, no extra commentary
"""
    try:
        from gemini_service import _generate

        result = await _generate(prompt)
        cover_letter = result if result else "Unable to generate cover letter. Please try again."
    except Exception as exc:
        logger.warning("Cover letter generation failed: %s", exc)
        cover_letter = "Unable to generate cover letter. Please try again."

    return {"cover_letter": cover_letter}


@router.get("/api/search")
@limiter.limit("10/minute")
async def web_search(
    request: Request,
    query: str,
    max_results: int = 5,
    current_user: models.User = Depends(get_current_user),
):
    results = perform_web_search(query, max_results=max_results)
    return {"results": results}
