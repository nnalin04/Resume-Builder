import json
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
import uvicorn

from database import engine, get_db
import models
from pdf_parser import extract_text_from_pdf

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Resume Builder API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Health ──────────────────────────────────────────────────────────────────

@app.get("/")
def read_root():
    return {"message": "AI Resume Builder API v2 is running.", "status": "ok"}


# ─── Resume CRUD ─────────────────────────────────────────────────────────────

@app.get("/api/resumes")
def list_resumes(db: Session = Depends(get_db)):
    """List all uploaded resumes (id, filename, created_at)."""
    resumes = db.query(models.Resume).order_by(models.Resume.created_at.desc()).all()
    return [
        {
            "id": r.id,
            "filename": r.filename,
            "created_at": r.created_at.isoformat(),
            "has_parsed_sections": r.parsed_sections not in (None, "{}", ""),
        }
        for r in resumes
    ]


@app.post("/api/upload-resume")
async def upload_resume(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload a PDF resume and extract its raw text."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    file_bytes = await file.read()
    extracted_text = extract_text_from_pdf(file_bytes)

    if not extracted_text.strip():
        raise HTTPException(status_code=422, detail="Could not extract text from PDF. Ensure it is not image-only.")

    new_resume = models.Resume(
        filename=file.filename,
        original_text=extracted_text,
        parsed_sections="{}",
    )
    db.add(new_resume)
    db.commit()
    db.refresh(new_resume)

    return {
        "message": "Resume uploaded successfully.",
        "resume_id": new_resume.id,
        "extracted_length": len(extracted_text),
        "preview": extracted_text[:300],
    }


@app.get("/api/resume/{resume_id}")
def get_resume(resume_id: int, db: Session = Depends(get_db)):
    """Get a resume with its parsed sections and generated resumes."""
    resume = _get_resume_or_404(resume_id, db)
    parsed = _safe_json(resume.parsed_sections)

    generated = (
        db.query(models.GeneratedResume)
        .filter(models.GeneratedResume.resume_id == resume_id)
        .order_by(models.GeneratedResume.created_at.desc())
        .first()
    )

    chat_history = (
        db.query(models.ChatHistory)
        .filter(models.ChatHistory.resume_id == resume_id)
        .order_by(models.ChatHistory.created_at.asc())
        .all()
    )

    return {
        "id": resume.id,
        "filename": resume.filename,
        "original_text": resume.original_text,
        "parsed_sections": parsed,
        "latest_generated": {
            "id": generated.id,
            "template": generated.template,
            "sections": _safe_json(generated.optimized_sections),
            "ats_score": generated.ats_score,
            "created_at": generated.created_at.isoformat(),
        } if generated else None,
        "chat_history": [
            {"role": c.role, "content": c.content, "created_at": c.created_at.isoformat()}
            for c in chat_history
        ],
    }


@app.post("/api/parse-resume/{resume_id}")
async def parse_resume(resume_id: int, db: Session = Depends(get_db)):
    """
    Use AI to parse raw resume text into structured sections.
    Stores result in resume.parsed_sections.
    """
    from resume_parser_ai import parse_resume_with_ai

    resume = _get_resume_or_404(resume_id, db)
    parsed = await parse_resume_with_ai(resume.original_text)

    if "error" in parsed:
        raise HTTPException(status_code=500, detail=f"AI parsing failed: {parsed['error']}")

    resume.parsed_sections = json.dumps(parsed)
    db.commit()
    db.refresh(resume)

    return {"message": "Resume parsed successfully.", "sections": parsed}


class UpdateSectionsRequest(BaseModel):
    sections: dict


@app.put("/api/resume/{resume_id}/sections")
def update_sections(resume_id: int, body: UpdateSectionsRequest, db: Session = Depends(get_db)):
    """Save manually edited resume sections (from the UI editor)."""
    resume = _get_resume_or_404(resume_id, db)
    resume.parsed_sections = json.dumps(body.sections)
    db.commit()
    return {"message": "Sections updated.", "sections": body.sections}


# ─── ATS Scoring ─────────────────────────────────────────────────────────────

class AtsRequest(BaseModel):
    resume_id: int
    job_description: str


@app.post("/api/ats-score")
async def get_ats_score(body: AtsRequest, db: Session = Depends(get_db)):
    """
    Run ATS keyword analysis. Uses parsed sections if available,
    falls back to raw text.
    """
    from ats_scorer import calculate_ats_score

    resume = _get_resume_or_404(body.resume_id, db)
    parsed = _safe_json(resume.parsed_sections)

    # Build rich text from structured sections if available
    if parsed and parsed != {}:
        resume_text = _sections_to_text(parsed)
    else:
        resume_text = resume.original_text

    score_result = calculate_ats_score(resume_text, body.job_description)
    return score_result


# ─── AI Generation ───────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    resume_id: int
    job_description: str = ""
    requirements_prompt: str = ""
    template: str = "classic"  # classic | modern | technical


@app.post("/api/clarify")
async def get_clarifying_questions(body: GenerateRequest, db: Session = Depends(get_db)):
    """
    Before generating, ask the AI to produce clarifying questions
    about the candidate's experience for better output.
    """
    from resume_generator import generate_clarifying_questions

    resume = _get_resume_or_404(body.resume_id, db)
    parsed = _safe_json(resume.parsed_sections)
    if not parsed:
        raise HTTPException(status_code=400, detail="Parse the resume first before asking for clarifications.")

    questions = await generate_clarifying_questions(parsed, body.requirements_prompt)
    return {"questions": questions}


@app.post("/api/generate-resume")
async def generate_resume(body: GenerateRequest, db: Session = Depends(get_db)):
    """
    Generate an ATS-optimized resume using AI.
    Returns a GeneratedResume record with optimized sections.
    """
    from resume_generator import generate_optimized_resume
    from ats_scorer import calculate_ats_score

    resume = _get_resume_or_404(body.resume_id, db)
    parsed = _safe_json(resume.parsed_sections)
    if not parsed:
        raise HTTPException(status_code=400, detail="Parse the resume first before generating.")

    optimized = await generate_optimized_resume(
        current_sections=parsed,
        job_description=body.job_description,
        requirements_prompt=body.requirements_prompt,
    )

    if "error" in optimized:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {optimized['error']}")

    # Calculate ATS score for the generated resume
    ats_score = 0.0
    if body.job_description.strip():
        score_result = calculate_ats_score(_sections_to_text(optimized), body.job_description)
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


# ─── AI Chat ─────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    resume_id: int
    message: str
    job_description: str = ""


@app.post("/api/chat")
async def chat_with_ai(body: ChatRequest, db: Session = Depends(get_db)):
    """
    Multi-turn AI resume coaching chat.
    Maintains full conversation history per resume.
    """
    from resume_generator import build_chat_response

    resume = _get_resume_or_404(body.resume_id, db)
    parsed = _safe_json(resume.parsed_sections)

    # Load conversation history
    history_rows = (
        db.query(models.ChatHistory)
        .filter(models.ChatHistory.resume_id == body.resume_id)
        .order_by(models.ChatHistory.created_at.asc())
        .all()
    )
    history = [{"role": h.role, "content": h.content} for h in history_rows]

    reply = await build_chat_response(
        resume_sections=parsed,
        chat_history=history,
        user_message=body.message,
        job_description=body.job_description,
    )

    # Persist both turns
    db.add(models.ChatHistory(resume_id=body.resume_id, role="user", content=body.message))
    db.add(models.ChatHistory(resume_id=body.resume_id, role="assistant", content=reply))
    db.commit()

    return {"reply": reply}


@app.delete("/api/chat/{resume_id}")
def clear_chat(resume_id: int, db: Session = Depends(get_db)):
    """Clear chat history for a resume."""
    db.query(models.ChatHistory).filter(models.ChatHistory.resume_id == resume_id).delete()
    db.commit()
    return {"message": "Chat history cleared."}


# ─── Export ──────────────────────────────────────────────────────────────────

@app.get("/api/export/{resume_id}")
async def export_resume(
    resume_id: int,
    format: str = "json",
    use_generated: bool = True,
    template: str = "classic",
    db: Session = Depends(get_db),
):
    """
    Export resume in json | markdown | pdf format.
    If use_generated=true and a GeneratedResume exists, exports that; otherwise exports parsed sections.
    """
    resume = _get_resume_or_404(resume_id, db)

    # Determine which sections to export
    sections = None
    if use_generated:
        gen = (
            db.query(models.GeneratedResume)
            .filter(models.GeneratedResume.resume_id == resume_id)
            .order_by(models.GeneratedResume.created_at.desc())
            .first()
        )
        if gen:
            sections = _safe_json(gen.optimized_sections)
            template = gen.template

    if not sections:
        sections = _safe_json(resume.parsed_sections)

    if not sections:
        raise HTTPException(status_code=400, detail="No structured sections found. Parse the resume first.")

    if format == "json":
        return {"sections": sections, "filename": resume.filename}

    elif format == "markdown":
        md = _sections_to_markdown(sections)
        return Response(
            content=md,
            media_type="text/markdown",
            headers={"Content-Disposition": f'attachment; filename="resume_optimized.md"'},
        )

    elif format == "pdf":
        from pdf_generator import generate_resume_pdf
        pdf_bytes = generate_resume_pdf(sections, template=template)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="resume_optimized.pdf"'},
        )

    raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")


# ─── Web Search ──────────────────────────────────────────────────────────────

@app.get("/api/search")
async def web_search(query: str, max_results: int = 5):
    """Run a web search and return snippets (for the AI to incorporate)."""
    from search_client import perform_web_search
    results = perform_web_search(query, max_results=max_results)
    return {"results": results}


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _get_resume_or_404(resume_id: int, db: Session) -> models.Resume:
    resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail=f"Resume {resume_id} not found.")
    return resume


def _safe_json(raw: str) -> dict:
    try:
        return json.loads(raw) if raw else {}
    except (json.JSONDecodeError, TypeError):
        return {}


def _sections_to_text(sections: dict) -> str:
    """Flatten structured sections to plain text for ATS scoring."""
    parts = []
    contact = sections.get("contact", {})
    if contact.get("name"):
        parts.append(contact["name"])

    summary = sections.get("summary", "")
    if summary:
        parts.append(summary)

    for job in sections.get("experience", []):
        parts.append(f"{job.get('title', '')} {job.get('company', '')}")
        parts.extend(job.get("bullets", []))

    for edu in sections.get("education", []):
        parts.append(f"{edu.get('degree', '')} {edu.get('field', '')} {edu.get('institution', '')}")

    skills = sections.get("skills", {})
    for key in ("languages", "frameworks", "tools", "databases", "other"):
        parts.extend(skills.get(key, []))

    for proj in sections.get("projects", []):
        parts.append(proj.get("name", ""))
        parts.append(proj.get("description", ""))
        parts.extend(proj.get("tech_stack", []))

    return " ".join(parts)


def _sections_to_markdown(sections: dict) -> str:
    """Convert structured resume sections to clean Markdown."""
    lines = []
    contact = sections.get("contact", {})
    if contact.get("name"):
        lines.append(f"# {contact['name']}\n")

    contact_parts = [
        contact.get("email", ""),
        contact.get("phone", ""),
        contact.get("location", ""),
        contact.get("linkedin", ""),
        contact.get("github", ""),
        contact.get("website", ""),
    ]
    lines.append("  |  ".join(p for p in contact_parts if p))
    lines.append("")

    if sections.get("summary"):
        lines.append("## Professional Summary\n")
        lines.append(sections["summary"])
        lines.append("")

    if sections.get("experience"):
        lines.append("## Experience\n")
        for job in sections["experience"]:
            lines.append(f"### {job.get('title', '')} — {job.get('company', '')}")
            meta = []
            if job.get("location"):
                meta.append(job["location"])
            meta.append(f"{job.get('start_date', '')} – {job.get('end_date', 'Present')}")
            lines.append("  |  ".join(meta))
            for bullet in job.get("bullets", []):
                lines.append(f"- {bullet}")
            lines.append("")

    if sections.get("education"):
        lines.append("## Education\n")
        for edu in sections["education"]:
            degree = edu.get('degree', '')
            field  = edu.get('field', '')
            # Avoid "Specialisation in X in X" when field is already in degree
            deg_line = degree if field.lower() in degree.lower() else f"{degree} in {field}".strip(" in")
            lines.append(f"### {deg_line}")
            lines.append(f"{edu.get('institution', '')}  |  {edu.get('graduation_date', '')}")
            if edu.get("gpa"):
                lines.append(f"GPA: {edu['gpa']}")
            lines.append("")

    skills = sections.get("skills", {})
    if skills:
        lines.append("## Skills\n")
        label_map = {
            "languages": "Languages",
            "frameworks": "Frameworks / Libraries",
            "tools": "Tools & Platforms",
            "databases": "Databases",
            "other": "Other",
        }
        for key, label in label_map.items():
            vals = skills.get(key, [])
            if vals:
                lines.append(f"**{label}:** {', '.join(vals)}")
        lines.append("")

    if sections.get("projects"):
        lines.append("## Projects\n")
        for proj in sections["projects"]:
            name_line = proj.get("name", "")
            if proj.get("link"):
                name_line += f" — {proj['link']}"
            lines.append(f"### {name_line}")
            if proj.get("tech_stack"):
                lines.append(f"*{', '.join(proj['tech_stack'])}*")
            if proj.get("description"):
                lines.append(f"- {proj['description']}")
            lines.append("")

    if sections.get("certifications"):
        lines.append("## Certifications\n")
        for cert in sections["certifications"]:
            line = cert.get("name", "")
            if cert.get("issuer"):
                line += f" — {cert['issuer']}"
            if cert.get("date"):
                line += f" ({cert['date']})"
            lines.append(f"- {line}")
        lines.append("")

    return "\n".join(lines)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
