import io
import json
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

import models
from auth import get_current_user_optional
from database import get_db
from pdf_parser import extract_text_from_pdf
from rate_limiter import limiter
from resume_parser_ai import parse_resume_with_ai
from services.resume_service import _check_resume_ownership, _get_resume_or_404
from services.serialization_service import _safe_json


router = APIRouter()


class UpdateSectionsRequest(BaseModel):
    sections: dict


class SaveVersionRequest(BaseModel):
    name: str


@router.get("/api/resumes")
def list_resumes(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    if not current_user:
        return {"items": [], "total": 0, "page": page, "page_size": page_size}
    q = (
        db.query(models.Resume)
        .filter(models.Resume.user_id == current_user.id)
        .order_by(models.Resume.created_at.desc())
    )
    total = q.count()
    resumes = q.offset((page - 1) * page_size).limit(page_size).all()
    return {
        "items": [
            {
                "id": r.id,
                "filename": r.filename,
                "created_at": r.created_at.isoformat(),
                "has_parsed_sections": r.parsed_sections not in (None, "{}", ""),
            }
            for r in resumes
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/api/upload-resume")
@limiter.limit("5/minute")
async def upload_resume(
    request: Request,
    file: UploadFile = File(...),
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    if not file.filename.lower().endswith(".pdf") or file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    file_bytes = await file.read()
    if len(file_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large. Maximum PDF size is 5 MB.")
    extracted_text = extract_text_from_pdf(file_bytes)

    if not extracted_text.strip():
        raise HTTPException(status_code=422, detail="Could not extract text from PDF. Ensure it is not image-only.")

    new_resume = models.Resume(
        filename=file.filename,
        original_text=extracted_text,
        parsed_sections="{}",
        user_id=current_user.id if current_user else None,
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


@router.get("/api/resume/{resume_id}")
def get_resume(
    resume_id: int,
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    resume = _get_resume_or_404(resume_id, db)
    _check_resume_ownership(resume, current_user)
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


@router.post("/api/parse-resume/{resume_id}")
@limiter.limit("5/minute")
async def parse_resume(
    request: Request,
    resume_id: int,
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    resume = _get_resume_or_404(resume_id, db)
    _check_resume_ownership(resume, current_user)
    parsed = await parse_resume_with_ai(resume.original_text)

    if "error" in parsed:
        raise HTTPException(status_code=500, detail=f"AI parsing failed: {parsed['error']}")

    resume.parsed_sections = json.dumps(parsed)
    db.commit()
    db.refresh(resume)

    return {"message": "Resume parsed successfully.", "sections": parsed}


@router.put("/api/resume/{resume_id}/sections")
def update_sections(
    resume_id: int,
    body: UpdateSectionsRequest,
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    resume = _get_resume_or_404(resume_id, db)
    _check_resume_ownership(resume, current_user)
    resume.parsed_sections = json.dumps(body.sections)
    db.commit()
    return {"message": "Sections updated.", "sections": body.sections}


@router.post("/api/resume/{resume_id}/versions")
def save_resume_version(
    resume_id: int,
    body: SaveVersionRequest,
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    resume = _get_resume_or_404(resume_id, db)
    _check_resume_ownership(resume, current_user)

    gen = (
        db.query(models.GeneratedResume)
        .filter(models.GeneratedResume.resume_id == resume_id)
        .order_by(models.GeneratedResume.created_at.desc())
        .first()
    )
    sections_json = gen.optimized_sections if gen else resume.parsed_sections or "{}"

    version = models.ResumeVersion(
        resume_id=resume_id,
        name=body.name,
        sections_json=sections_json,
    )
    db.add(version)
    db.commit()
    db.refresh(version)

    return {
        "id": version.id,
        "name": version.name,
        "resume_id": version.resume_id,
        "created_at": version.created_at.isoformat(),
    }


@router.get("/api/resume/{resume_id}/versions")
def list_resume_versions(
    resume_id: int,
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    resume = _get_resume_or_404(resume_id, db)
    _check_resume_ownership(resume, current_user)

    versions = (
        db.query(models.ResumeVersion)
        .filter(models.ResumeVersion.resume_id == resume_id)
        .order_by(models.ResumeVersion.created_at.desc())
        .all()
    )
    return {
        "versions": [
            {"id": v.id, "name": v.name, "created_at": v.created_at.isoformat()}
            for v in versions
        ]
    }


@router.post("/api/resume/{resume_id}/versions/{version_id}/restore")
def restore_resume_version(
    resume_id: int,
    version_id: int,
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    resume = _get_resume_or_404(resume_id, db)
    _check_resume_ownership(resume, current_user)

    version = db.query(models.ResumeVersion).filter(
        models.ResumeVersion.id == version_id,
        models.ResumeVersion.resume_id == resume_id,
    ).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found.")

    gen = (
        db.query(models.GeneratedResume)
        .filter(models.GeneratedResume.resume_id == resume_id)
        .order_by(models.GeneratedResume.created_at.desc())
        .first()
    )
    if gen:
        gen.optimized_sections = version.sections_json
        db.commit()
    else:
        resume.parsed_sections = version.sections_json
        db.commit()

    return {"sections": _safe_json(version.sections_json)}
