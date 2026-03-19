import hmac
import json
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Request, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field
import uvicorn

from database import engine, get_db
import models
from pdf_parser import extract_text_from_pdf
from resume_parser_ai import parse_resume_with_ai
from resume_generator import generate_clarifying_questions, generate_optimized_resume, build_chat_response
from ats_scorer import calculate_ats_score, _get_nlp
from pdf_generator import generate_resume_pdf
from search_client import perform_web_search
from auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, get_current_user_optional, exchange_google_code,
)
from payment import (
    create_payment_order, verify_payment_order, verify_cashfree_webhook,
    FREE_DOWNLOAD_LIMIT,
)

# ─── Logging ──────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)
logger = logging.getLogger(__name__)

# ─── Rate Limiter ─────────────────────────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address)

# ─── Lifespan (startup tasks) ─────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(_app: FastAPI):
    models.Base.metadata.create_all(bind=engine)
    _get_nlp()  # warm up spaCy model so first ATS request isn't slow
    logger.info("spaCy model loaded. API ready.")
    yield

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")

app = FastAPI(title="AI Resume Builder API", version="3.0.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN, "http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# ─── Backend Secret Guard ─────────────────────────────────────────────────────
# Requests must carry X-Backend-Secret matching the BACKEND_SECRET env var.
# This is set only by the Vercel serverless proxy — direct hits to the Oracle
# IP without the secret are rejected with 403.
# If BACKEND_SECRET is not set (local dev), the check is skipped entirely.

_BACKEND_SECRET = os.getenv("BACKEND_SECRET", "")
_EXEMPT_PATHS   = {"/", "/health"}   # health probe doesn't go through Vercel

@app.middleware("http")
async def verify_backend_secret(request: Request, call_next):
    if _BACKEND_SECRET and request.url.path not in _EXEMPT_PATHS:
        incoming = request.headers.get("X-Backend-Secret", "")
        if not hmac.compare_digest(incoming, _BACKEND_SECRET):
            from fastapi.responses import JSONResponse
            return JSONResponse({"detail": "Forbidden"}, status_code=403)
    return await call_next(request)


# ─── Security Headers ─────────────────────────────────────────────────────────

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if request.url.scheme == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# ─── Health ──────────────────────────────────────────────────────────────────

@app.get("/")
def read_root():
    return {"message": "AI Resume Builder API v3 is running.", "status": "ok"}


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    """Liveness + readiness probe. Checks DB connectivity."""
    try:
        db.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception as e:
        logger.error("DB health check failed: %s", e)
        db_status = "error"
    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "db": db_status,
        "version": "3.0.0",
    }


# ─── Auth ─────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = ""

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class GoogleCallbackRequest(BaseModel):
    code: str

def _user_response(user: models.User, token: str) -> dict:
    return {
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "auth_provider": user.auth_provider,
            "profile_photo_url": user.profile_photo_url,
            "free_downloads_used": user.free_downloads_used,
            "subscription_status": user.subscription_status,
            "subscription_plan": user.subscription_plan,
            "subscription_expiry": user.subscription_expiry.isoformat() if user.subscription_expiry else None,
        }
    }


@app.post("/api/auth/register")
@limiter.limit("10/minute")
def register(request: Request, body: RegisterRequest, db: Session = Depends(get_db)):
    """Register with email + password."""
    if db.query(models.User).filter(models.User.email == body.email).first():
        raise HTTPException(status_code=409, detail="Email already registered.")

    user = models.User(
        email=body.email,
        password_hash=hash_password(body.password),
        name=body.name or body.email.split("@")[0],
        auth_provider="LOCAL",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user.id, user.email)
    return _user_response(user, token)


@app.post("/api/auth/login")
@limiter.limit("10/minute")
def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    """Login with email + password."""
    user = db.query(models.User).filter(models.User.email == body.email).first()
    if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    token = create_access_token(user.id, user.email)
    return _user_response(user, token)


@app.post("/api/auth/google")
async def google_callback(body: GoogleCallbackRequest, db: Session = Depends(get_db)):
    """Exchange Google OAuth code for JWT. Creates user on first login."""
    google_user = await exchange_google_code(body.code)
    email = google_user.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Google did not return an email.")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        user = models.User(
            email=email,
            name=google_user.get("name", email.split("@")[0]),
            auth_provider="GOOGLE",
            profile_photo_url=google_user.get("picture"),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(user.id, user.email)
    return _user_response(user, token)


@app.get("/api/auth/me")
def get_me(current_user: models.User = Depends(get_current_user)):
    """Return authenticated user profile."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "auth_provider": current_user.auth_provider,
        "profile_photo_url": current_user.profile_photo_url,
        "free_downloads_used": current_user.free_downloads_used,
        "subscription_status": current_user.subscription_status,
        "subscription_plan": current_user.subscription_plan,
        "subscription_expiry": current_user.subscription_expiry.isoformat() if current_user.subscription_expiry else None,
    }


# ─── Resume CRUD ─────────────────────────────────────────────────────────────

@app.get("/api/resumes")
def list_resumes(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """List resumes with pagination. If authenticated, returns only the user's resumes."""
    q = db.query(models.Resume).order_by(models.Resume.created_at.desc())
    if current_user:
        q = q.filter(models.Resume.user_id == current_user.id)
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


@app.post("/api/upload-resume")
@limiter.limit("5/minute")
async def upload_resume(
    request: Request,
    file: UploadFile = File(...),
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Upload a PDF resume and extract its raw text."""
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


@app.get("/api/resume/{resume_id}")
def get_resume(
    resume_id: int,
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Get a resume with its parsed sections and generated resumes."""
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


@app.post("/api/parse-resume/{resume_id}")
async def parse_resume(
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


class UpdateSectionsRequest(BaseModel):
    sections: dict


@app.put("/api/resume/{resume_id}/sections")
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


# ─── ATS Scoring ─────────────────────────────────────────────────────────────

class AtsRequest(BaseModel):
    resume_id: int
    job_description: str = Field(max_length=8000)


@app.post("/api/ats-score")
async def get_ats_score(
    body: AtsRequest,
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    resume = _get_resume_or_404(body.resume_id, db)
    _check_resume_ownership(resume, current_user)
    parsed = _safe_json(resume.parsed_sections)

    resume_text = _sections_to_text(parsed) if parsed else resume.original_text
    return calculate_ats_score(resume_text, body.job_description)


# ─── AI Generation ───────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    resume_id: int
    job_description: str = Field(default="", max_length=8000)
    requirements_prompt: str = Field(default="", max_length=4000)
    template: str = Field(default="classic", pattern="^(classic|modern|technical|professional|twocolumn|clean)$")


@app.post("/api/clarify")
async def get_clarifying_questions(
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


@app.post("/api/generate-resume")
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
    message: str = Field(max_length=4000)
    job_description: str = Field(default="", max_length=8000)


@app.post("/api/chat")
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
        chat_history=history,
        user_message=body.message,
        job_description=body.job_description,
    )

    db.add(models.ChatHistory(resume_id=body.resume_id, role="user", content=body.message))
    db.add(models.ChatHistory(resume_id=body.resume_id, role="assistant", content=reply))
    db.commit()

    return {"reply": reply}


@app.delete("/api/chat/{resume_id}")
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


# ─── Stateless AI rewrite (no resume_id required) ────────────────────────────

class RewriteRequest(BaseModel):
    text: str = Field(max_length=5000)
    instruction: str = Field(max_length=1000)
    context: str = Field(default="", max_length=2000)


@app.post("/api/ai/rewrite")
@limiter.limit("20/minute")
async def ai_rewrite(
    request: Request,
    body: RewriteRequest,
    current_user: Optional[models.User] = Depends(get_current_user_optional),
):
    """
    Stateless AI rewrite endpoint — no resume_id needed.
    Calls Gemini 2.5 Flash; falls back to simple rule-based strengthening if unavailable.
    """
    try:
        from gemini_service import rewrite_text
        result = await rewrite_text(body.text, body.instruction, body.context)
        if result:
            return {"result": result}
    except Exception as exc:
        logger.warning("ai_rewrite Gemini call failed: %s", exc)

    # Fallback: return the original text (rule engine can't do freeform rewrite)
    return {"result": body.text}


# ─── Export (with freemium gating) ───────────────────────────────────────────

@app.get("/api/export/{resume_id}")
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

    # ── Freemium gate for PDF downloads ───────────────────────────────────────
    if format == "pdf" and current_user:
        _check_download_access(current_user)

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
            headers={"Content-Disposition": 'attachment; filename="resume_optimized.md"'},
        )

    elif format == "pdf":
        pdf_bytes = generate_resume_pdf(sections, template=template)

        # Increment free download counter after successful generation
        if current_user and _is_free_tier(current_user):
            current_user.free_downloads_used = (current_user.free_downloads_used or 0) + 1
            db.commit()

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="resume_optimized.pdf"'},
        )

    raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")


# ─── Direct PDF export (no resume_id required) ───────────────────────────────

class DirectExportRequest(BaseModel):
    sections: dict
    template: str = "classic"


@app.post("/api/export/generate")
async def generate_export_direct(
    body: DirectExportRequest,
    current_user: Optional[models.User] = Depends(get_current_user_optional),
):
    """Generate a PDF from raw sections JSON — no resume upload required.

    Does NOT increment the download counter — the frontend calls
    /api/record-download separately before hitting this endpoint.
    """
    if current_user:
        _check_download_access(current_user)
    pdf_bytes = generate_resume_pdf(body.sections, template=body.template)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="resume.pdf"'},
    )


# ─── Payments ────────────────────────────────────────────────────────────────

class CreateOrderRequest(BaseModel):
    plan: str                     # one_time | basic | pro
    return_url: str = "http://localhost:3000/payment/success"


@app.post("/api/payments/create-order")
async def create_order(
    body: CreateOrderRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a Cashfree payment order."""
    result = await create_payment_order(
        user_id=current_user.id,
        user_email=current_user.email,
        user_name=current_user.name,
        plan=body.plan,
        return_url=body.return_url,
    )

    # Persist pending payment record
    payment = models.Payment(
        user_id=current_user.id,
        cashfree_order_id=result["order_id"],
        amount=result["amount"],
        currency=result["currency"],
        status="PENDING",
        type="SUBSCRIPTION" if body.plan in ("basic", "pro") else "ONE_TIME",
        plan=body.plan,
    )
    db.add(payment)
    db.commit()

    return result


@app.post("/api/payments/verify")
async def verify_payment(
    order_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verify a completed payment and activate subscription/download credits."""
    result = await verify_payment_order(order_id)

    payment = db.query(models.Payment).filter(
        models.Payment.cashfree_order_id == order_id,
        models.Payment.user_id == current_user.id,
    ).first()

    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found.")

    if result["status"] == "PAID":
        payment.status = "SUCCESS"
        payment.payment_method = result.get("payment_method", "")

        # Activate access
        if payment.type == "ONE_TIME":
            # Reset download counter — allow one more download
            current_user.free_downloads_used = 0
        else:
            # Activate subscription
            current_user.subscription_status = "ACTIVE"
            current_user.subscription_plan = payment.plan
            current_user.subscription_expiry = datetime.now(timezone.utc) + timedelta(days=30)

        db.commit()
        return {"status": "SUCCESS", "plan": payment.plan, "type": payment.type}

    elif result["status"] in ("ACTIVE", "PENDING"):
        return {"status": "PENDING"}
    else:
        payment.status = "FAILED"
        db.commit()
        return {"status": "FAILED"}


@app.post("/api/payments/webhook")
async def cashfree_webhook(
    request: Request,
    x_webhook_signature: Optional[str] = Header(None),
    x_webhook_timestamp: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """Handle Cashfree webhook events (payment success/failure)."""
    body_bytes = await request.body()
    payload_str = body_bytes.decode("utf-8")

    if not x_webhook_signature or not x_webhook_timestamp:
        raise HTTPException(status_code=400, detail="Missing webhook signature headers.")
    if not verify_cashfree_webhook(payload_str, x_webhook_signature, x_webhook_timestamp):
        raise HTTPException(status_code=400, detail="Invalid webhook signature.")

    event = json.loads(payload_str)
    event_type = event.get("type", "")
    order_id = event.get("data", {}).get("order", {}).get("order_id", "")

    if not order_id:
        return {"status": "ignored"}

    payment = db.query(models.Payment).filter(models.Payment.cashfree_order_id == order_id).first()
    if not payment:
        return {"status": "ignored"}

    if event_type == "PAYMENT_SUCCESS_WEBHOOK":
        payment.status = "SUCCESS"
        user = db.query(models.User).filter(models.User.id == payment.user_id).first()
        if user:
            if payment.type == "ONE_TIME":
                user.free_downloads_used = 0
            else:
                user.subscription_status = "ACTIVE"
                user.subscription_plan = payment.plan
                user.subscription_expiry = datetime.now(timezone.utc) + timedelta(days=30)
        db.commit()

    elif event_type in ("PAYMENT_FAILED_WEBHOOK", "PAYMENT_USER_DROPPED_WEBHOOK"):
        payment.status = "FAILED"
        db.commit()

    return {"status": "ok"}


@app.get("/api/payments/plans")
def get_plans():
    """Return available pricing plans."""
    return {
        "plans": [
            {"id": "one_time", "label": "Single Download", "amount": 199, "currency": "INR", "type": "ONE_TIME"},
            {"id": "basic", "label": "Basic Monthly", "amount": 399, "currency": "INR", "type": "SUBSCRIPTION"},
            {"id": "pro", "label": "Pro Monthly", "amount": 649, "currency": "INR", "type": "SUBSCRIPTION"},
        ],
        "free_download_limit": FREE_DOWNLOAD_LIMIT,
    }


# ─── Frontend PDF download gate ──────────────────────────────────────────────

@app.post("/api/record-download")
def record_download(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Called by the frontend before window.print() to enforce the freemium gate.
    Returns 402 if the user has no downloads left and no active subscription.
    On success, increments free_downloads_used and returns updated counts.
    """
    _check_download_access(current_user)

    if _is_free_tier(current_user):
        current_user.free_downloads_used = (current_user.free_downloads_used or 0) + 1
        db.commit()
        db.refresh(current_user)

    return {
        "ok": True,
        "free_downloads_used": current_user.free_downloads_used,
        "subscription_status": current_user.subscription_status,
    }


# ─── Web Search ──────────────────────────────────────────────────────────────

@app.get("/api/search")
@limiter.limit("10/minute")
async def web_search(
    request: Request,
    query: str,
    max_results: int = 5,
    current_user: models.User = Depends(get_current_user),
):
    results = perform_web_search(query, max_results=max_results)
    return {"results": results}


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _get_resume_or_404(resume_id: int, db: Session) -> models.Resume:
    resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail=f"Resume {resume_id} not found.")
    return resume


def _check_resume_ownership(resume: models.Resume, current_user: Optional[models.User]) -> None:
    """Raises 401/403 if resume is owned and requester is unauthenticated or a different user."""
    if resume.user_id is not None:
        if current_user is None:
            raise HTTPException(status_code=401, detail="Authentication required.")
        if resume.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied.")


def _is_free_tier(user: models.User) -> bool:
    if user.subscription_status == "ACTIVE":
        if user.subscription_expiry and user.subscription_expiry > datetime.now(timezone.utc):
            return False
    return True


def _check_download_access(user: models.User) -> None:
    """Raises 402 Payment Required if user has exhausted free downloads and has no active subscription."""
    if not _is_free_tier(user):
        return  # subscriber — allow
    if (user.free_downloads_used or 0) < FREE_DOWNLOAD_LIMIT:
        return  # still within free tier
    raise HTTPException(
        status_code=402,
        detail={
            "code": "PAYMENT_REQUIRED",
            "message": f"You have used your {FREE_DOWNLOAD_LIMIT} free PDF download(s). Purchase a plan to continue.",
            "plans_url": "/api/payments/plans",
        },
    )


def _safe_json(raw: str) -> dict:
    try:
        return json.loads(raw) if raw else {}
    except (json.JSONDecodeError, TypeError):
        return {}


def _sections_to_text(sections: dict) -> str:
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
            degree = edu.get("degree", "")
            field = edu.get("field", "")
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
