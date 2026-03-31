from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from schemas.export_schemas import DirectExportRequest
from sqlalchemy.orm import Session

import models
from auth import get_current_user, get_current_user_optional
from database import get_db
from docx_generator import generate_resume_docx
from pdf_generator import generate_resume_pdf
from rate_limiter import limiter
from services.freemium_service import _check_download_access, _is_free_tier
from services.resume_service import _check_resume_ownership, _get_resume_or_404, _sections_to_markdown
from services.serialization_service import _safe_json


router = APIRouter()



@router.get("/api/export/{resume_id}")
async def export_resume(
    resume_id: int,
    format: str = "json",
    use_generated: bool = True,
    template: str = "classic",
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    resume = _get_resume_or_404(resume_id, db)
    _check_resume_ownership(resume, current_user)

    if format == "pdf" and current_user:
        _check_download_access(current_user, db)

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

    if format == "markdown":
        md = _sections_to_markdown(sections)
        return Response(
            content=md,
            media_type="text/markdown",
            headers={"Content-Disposition": 'attachment; filename="resume_optimized.md"'},
        )

    if format == "pdf":
        pdf_bytes, page_count = generate_resume_pdf(sections, template=template)

        if current_user and _is_free_tier(current_user):
            current_user.free_downloads_used = (current_user.free_downloads_used or 0) + 1
            db.commit()

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": 'attachment; filename="resume_optimized.pdf"',
                "X-Resume-Pages": str(page_count),
                "Access-Control-Expose-Headers": "X-Resume-Pages",
            },
        )

    raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")


@router.post("/api/export/generate")
@limiter.limit("20/minute")
async def generate_export_direct(
    request: Request,
    body: DirectExportRequest,
    current_user: Optional[models.User] = Depends(get_current_user_optional),
):
    if current_user:
        _check_download_access(current_user)
    pdf_bytes, page_count = generate_resume_pdf(body.sections, template=body.template)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'attachment; filename="resume.pdf"',
            "X-Resume-Pages": str(page_count),
            "Access-Control-Expose-Headers": "X-Resume-Pages",
        },
    )


@router.post("/api/export/generate-docx")
@limiter.limit("20/minute")
async def generate_export_docx(request: Request, body: DirectExportRequest):
    docx_bytes = generate_resume_docx(body.sections)
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": 'attachment; filename="resume.docx"'},
    )


@router.post("/api/record-download")
def record_download(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _check_download_access(current_user, db)

    if _is_free_tier(current_user):
        current_user.free_downloads_used = (current_user.free_downloads_used or 0) + 1
        db.commit()
        db.refresh(current_user)

    return {
        "ok": True,
        "free_downloads_used": current_user.free_downloads_used,
        "subscription_status": current_user.subscription_status,
    }
