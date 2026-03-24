import hmac
import json
import logging
import os
import secrets
import shutil
import smtplib
import uuid

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Request, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
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
from docx_generator import generate_resume_docx
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

# ─── Sentry ───────────────────────────────────────────────────────────────────

_SENTRY_DSN = os.getenv("SENTRY_DSN", "")
if _SENTRY_DSN:
    sentry_sdk.init(
        dsn=_SENTRY_DSN,
        integrations=[FastApiIntegration(), SqlalchemyIntegration()],
        traces_sample_rate=0.1,
        send_default_pii=False,
    )
    logger.info("Sentry initialized.")
else:
    logger.warning("SENTRY_DSN not set — error monitoring disabled.")

# ─── Rate Limiter ─────────────────────────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address)

# ─── Lifespan (startup tasks) ─────────────────────────────────────────────────

_AVATARS_DIR = os.getenv("AVATARS_DIR", "./data/avatars")

@asynccontextmanager
async def lifespan(_app: FastAPI):
    models.Base.metadata.create_all(bind=engine)
    os.makedirs(_AVATARS_DIR, exist_ok=True)
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

_BACKEND_SECRET  = os.getenv("BACKEND_SECRET", "")
_EXEMPT_PATHS    = {"/", "/health"}
_EXEMPT_PREFIXES = ("/api/avatars/",)  # avatar images loaded by browser <img> tags

@app.middleware("http")
async def verify_backend_secret(request: Request, call_next):
    if _BACKEND_SECRET:
        path = request.url.path
        exempt = path in _EXEMPT_PATHS or any(path.startswith(p) for p in _EXEMPT_PREFIXES)
        if not exempt:
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

def _user_dict(user: models.User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "auth_provider": user.auth_provider,
        "profile_photo_url": user.profile_photo_url,
        "phone": user.phone,
        "location": user.location,
        "bio": user.bio,
        "linkedin": user.linkedin,
        "github": user.github,
        "website": user.website,
        "email_verified": bool(user.email_verified),
        "phone_verified": bool(user.phone_verified),
        "free_downloads_used": user.free_downloads_used,
        "subscription_status": user.subscription_status,
        "subscription_plan": user.subscription_plan,
        "subscription_expiry": user.subscription_expiry.isoformat() if user.subscription_expiry else None,
    }

def _user_response(user: models.User, token: str) -> dict:
    return {"token": token, "user": _user_dict(user)}


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
@limiter.limit("10/minute")
async def google_callback(request: Request, body: GoogleCallbackRequest, db: Session = Depends(get_db)):
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


# ─── Password reset helpers ───────────────────────────────────────────────────

_SMTP_HOST = os.getenv("SMTP_HOST", "")
_SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
_SMTP_USER = os.getenv("SMTP_USER", "")
_SMTP_PASS = os.getenv("SMTP_PASS", "")
_SMTP_FROM = os.getenv("SMTP_FROM", "Resume Builder <noreply@resumebuilder.app>")
_FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
_RESET_TOKEN_TTL_MINUTES = 30


def _send_reset_email(to_email: str, reset_link: str) -> None:
    """Send password reset email via SMTP. Raises on failure."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Reset your Resume Builder password"
    msg["From"] = _SMTP_FROM
    msg["To"] = to_email

    text_body = f"""Hi,

You requested a password reset for your Resume Builder account.

Click the link below to set a new password (valid for {_RESET_TOKEN_TTL_MINUTES} minutes):

{reset_link}

If you didn't request this, you can safely ignore this email.

— The Resume Builder Team
"""
    html_body = f"""<!DOCTYPE html>
<html>
<body style="font-family:Inter,sans-serif;background:#f8fafc;padding:40px 0;margin:0">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #e2e8f0;padding:40px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:32px">
      <div style="width:36px;height:36px;background:linear-gradient(135deg,#6366f1,#818cf8);border-radius:10px;display:flex;align-items:center;justify-content:center">
        <span style="color:#fff;font-weight:800;font-size:18px">R</span>
      </div>
      <span style="font-weight:700;font-size:18px;color:#0f172a">Resume Builder</span>
    </div>
    <h1 style="font-size:24px;font-weight:700;color:#0f172a;margin:0 0 8px">Reset your password</h1>
    <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 28px">
      You requested a password reset. Click the button below to choose a new password.
      This link expires in <strong>{_RESET_TOKEN_TTL_MINUTES} minutes</strong>.
    </p>
    <a href="{reset_link}" style="display:inline-block;background:#6366f1;color:#fff;font-weight:700;font-size:15px;padding:14px 28px;border-radius:12px;text-decoration:none">
      Reset password
    </a>
    <p style="color:#94a3b8;font-size:13px;margin:28px 0 0">
      If you didn't request this, you can safely ignore this email.
    </p>
  </div>
</body>
</html>"""

    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(_SMTP_HOST, _SMTP_PORT) as server:
        server.ehlo()
        server.starttls()
        server.login(_SMTP_USER, _SMTP_PASS)
        server.sendmail(_SMTP_FROM, to_email, msg.as_string())


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


@app.post("/api/auth/forgot-password")
@limiter.limit("5/minute")
def forgot_password(request: Request, body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Send a password reset link to the given email (if it exists)."""
    user = db.query(models.User).filter(models.User.email == body.email).first()
    # Always return 200 to prevent email enumeration
    if not user or user.auth_provider != "LOCAL":
        return {"detail": "If that email exists, a reset link has been sent."}

    # Invalidate old tokens for this user
    db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.user_id == user.id,
        models.PasswordResetToken.used == 0,
    ).update({"used": 1})

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=_RESET_TOKEN_TTL_MINUTES)
    reset_token = models.PasswordResetToken(user_id=user.id, token=token, expires_at=expires_at)
    db.add(reset_token)
    db.commit()

    reset_link = f"{_FRONTEND_URL}/reset-password?token={token}"

    if not _SMTP_HOST or not _SMTP_USER:
        if os.getenv("ENV", "production") == "development":
            # Dev only — log and return link so it can be tested without SMTP
            logging.getLogger(__name__).warning("SMTP not configured. Reset link: %s", reset_link)
            return {"detail": "If that email exists, a reset link has been sent.", "dev_reset_link": reset_link}
        raise HTTPException(status_code=503, detail="Email service not configured. Contact support.")

    try:
        _send_reset_email(user.email, reset_link)
    except Exception as exc:
        logging.getLogger(__name__).error("Failed to send reset email: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to send email. Please try again later.")

    return {"detail": "If that email exists, a reset link has been sent."}


@app.post("/api/auth/reset-password")
@limiter.limit("10/minute")
def reset_password(request: Request, body: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Verify a reset token and update the user's password."""
    now = datetime.now(timezone.utc)
    reset_token = (
        db.query(models.PasswordResetToken)
        .filter(
            models.PasswordResetToken.token == body.token,
            models.PasswordResetToken.used == 0,
        )
        .first()
    )
    if not reset_token:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link.")

    # Compare tz-aware datetimes
    expires = reset_token.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if now > expires:
        reset_token.used = 1
        db.commit()
        raise HTTPException(status_code=400, detail="Reset link has expired. Please request a new one.")

    user = db.query(models.User).filter(models.User.id == reset_token.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid reset link.")

    user.password_hash = hash_password(body.new_password)
    reset_token.used = 1
    db.commit()

    return {"detail": "Password updated successfully. You can now log in."}


@app.get("/api/auth/me")
def get_me(current_user: models.User = Depends(get_current_user)):
    """Return authenticated user profile."""
    return _user_dict(current_user)


# ─── In-memory OTP store ──────────────────────────────────────────────────────
# { user_id: { "otp": "123456", "expires_at": datetime } }
_otp_store: dict[int, dict] = {}
_OTP_TTL_MINUTES = 10


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    website: Optional[str] = None

class VerifyEmailRequest(BaseModel):
    otp: str


@app.put("/api/auth/me")
@limiter.limit("20/minute")
def update_profile(
    request: Request,
    body: UpdateProfileRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the authenticated user's profile fields."""
    if body.name is not None:
        current_user.name = body.name.strip() or current_user.name
    if body.phone is not None:
        current_user.phone = body.phone.strip() or None
    if body.location is not None:
        current_user.location = body.location.strip() or None
    if body.bio is not None:
        bio = body.bio.strip()
        if len(bio) > 200:
            raise HTTPException(status_code=422, detail="Bio must be 200 characters or fewer.")
        current_user.bio = bio or None
    if body.linkedin is not None:
        current_user.linkedin = body.linkedin.strip() or None
    if body.github is not None:
        current_user.github = body.github.strip() or None
    if body.website is not None:
        current_user.website = body.website.strip() or None
    db.commit()
    db.refresh(current_user)
    return _user_dict(current_user)


@app.post("/api/auth/me/photo")
@limiter.limit("5/minute")
async def upload_avatar(
    request: Request,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a profile photo. Saves to /app/data/avatars/ and returns the URL."""
    allowed = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, or WebP images are supported.")
    data = await file.read()
    if len(data) > 2 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image too large. Maximum size is 2 MB.")
    ext = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}[file.content_type]
    filename = f"{uuid.uuid4().hex}.{ext}"
    os.makedirs(_AVATARS_DIR, exist_ok=True)
    dest = os.path.join(_AVATARS_DIR, filename)
    # Remove old avatar file if it was one we stored
    if current_user.profile_photo_url and "/api/avatars/" in current_user.profile_photo_url:
        old_file = os.path.join(_AVATARS_DIR, current_user.profile_photo_url.split("/api/avatars/")[-1])
        if os.path.exists(old_file):
            os.remove(old_file)
    with open(dest, "wb") as f:
        f.write(data)
    photo_url = f"/api/avatars/{filename}"
    current_user.profile_photo_url = photo_url
    db.commit()
    return {"profile_photo_url": photo_url}


@app.get("/api/avatars/{filename}")
async def serve_avatar(filename: str):
    """Serve a stored avatar image. Exempt from BACKEND_SECRET (browser <img> tag)."""
    # Security: reject path traversal
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename.")
    path = os.path.join(_AVATARS_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Avatar not found.")
    ext = filename.rsplit(".", 1)[-1].lower()
    media = {"jpg": "image/jpeg", "png": "image/png", "webp": "image/webp"}.get(ext, "application/octet-stream")
    return FileResponse(path, media_type=media)


def _send_otp_email(to_email: str, otp: str) -> None:
    """Send email verification OTP via SMTP."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Your Resume Builder verification code"
    msg["From"] = _SMTP_FROM
    msg["To"] = to_email
    text_body = f"Your Resume Builder verification code is: {otp}\n\nThis code expires in {_OTP_TTL_MINUTES} minutes."
    html_body = f"""<!DOCTYPE html>
<html>
<body style="font-family:Inter,sans-serif;background:#f8fafc;padding:40px 0;margin:0">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #e2e8f0;padding:40px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:32px">
      <div style="width:36px;height:36px;background:linear-gradient(135deg,#6366f1,#818cf8);border-radius:10px;display:flex;align-items:center;justify-content:center">
        <span style="color:#fff;font-weight:800;font-size:18px">R</span>
      </div>
      <span style="font-weight:700;font-size:18px;color:#0f172a">Resume Builder</span>
    </div>
    <h1 style="font-size:22px;font-weight:700;color:#0f172a;margin:0 0 8px">Verify your email</h1>
    <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 24px">
      Enter the code below in the app to verify your email address.
      This code expires in <strong>{_OTP_TTL_MINUTES} minutes</strong>.
    </p>
    <div style="background:#f1f5f9;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
      <span style="font-size:32px;font-weight:800;letter-spacing:8px;color:#0f172a;font-family:monospace">{otp}</span>
    </div>
    <p style="color:#94a3b8;font-size:13px;margin:0">If you didn't request this, you can safely ignore this email.</p>
  </div>
</body>
</html>"""
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))
    with smtplib.SMTP(_SMTP_HOST, _SMTP_PORT) as server:
        server.starttls()
        server.login(_SMTP_USER, _SMTP_PASS)
        server.sendmail(_SMTP_FROM, to_email, msg.as_string())


@app.post("/api/auth/send-verification")
@limiter.limit("3/minute")
def send_verification(
    request: Request,
    current_user: models.User = Depends(get_current_user),
):
    """Send a 6-digit OTP to the user's email for verification."""
    if current_user.email_verified:
        raise HTTPException(status_code=400, detail="Email is already verified.")
    otp = f"{secrets.randbelow(1000000):06d}"
    _otp_store[current_user.id] = {
        "otp": otp,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=_OTP_TTL_MINUTES),
    }
    if not _SMTP_HOST or not _SMTP_USER:
        if os.getenv("ENV", "production") == "development":
            logger.warning("SMTP not configured. OTP for %s: %s", current_user.email, otp)
            return {"detail": "OTP sent (dev mode — check server logs).", "dev_otp": otp}
        raise HTTPException(status_code=503, detail="Email service not configured. Contact support.")
    try:
        _send_otp_email(current_user.email, otp)
    except Exception as exc:
        logger.error("Failed to send OTP email: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to send email. Please try again later.")
    return {"detail": "Verification code sent to your email."}


@app.post("/api/auth/verify-email")
@limiter.limit("10/minute")
def verify_email(
    request: Request,
    body: VerifyEmailRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verify email using the 6-digit OTP."""
    if current_user.email_verified:
        return {"detail": "Email already verified.", "email_verified": True}
    entry = _otp_store.get(current_user.id)
    if not entry:
        raise HTTPException(status_code=400, detail="No verification code found. Please request a new one.")
    if datetime.now(timezone.utc) > entry["expires_at"]:
        _otp_store.pop(current_user.id, None)
        raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new one.")
    if not hmac.compare_digest(body.otp.strip(), entry["otp"]):
        raise HTTPException(status_code=400, detail="Incorrect verification code.")
    _otp_store.pop(current_user.id, None)
    current_user.email_verified = True
    db.commit()
    return {"detail": "Email verified successfully.", "email_verified": True}


# ─── Resume CRUD ─────────────────────────────────────────────────────────────

@app.get("/api/resumes")
def list_resumes(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """List resumes for the authenticated user. Unauthenticated callers receive an empty list."""
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
    return calculate_ats_score(resume_text, body.job_description)


# ─── AI Generation ───────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    resume_id: int
    job_description: str = Field(default="", max_length=8000)
    requirements_prompt: str = Field(default="", max_length=4000)
    template: str = Field(default="classic", pattern="^(classic|modern|technical|professional|twocolumn|clean)$")


@app.post("/api/clarify")
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
    Calls Gemini 3.1 Flash-Lite; falls back to simple rule-based strengthening if unavailable.
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
        _check_download_access(current_user, db)

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
        pdf_bytes, page_count = generate_resume_pdf(sections, template=template)

        # Increment free download counter after successful generation
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


# ─── Direct PDF export (no resume_id required) ───────────────────────────────

class DirectExportRequest(BaseModel):
    sections: dict
    template: str = "classic"


@app.post("/api/export/generate")
@limiter.limit("20/minute")
async def generate_export_direct(
    request: Request,
    body: DirectExportRequest,
    current_user: Optional[models.User] = Depends(get_current_user_optional),
):
    """Generate a PDF from raw sections JSON — no resume upload required.

    Does NOT increment the download counter — the frontend calls
    /api/record-download separately before hitting this endpoint.
    """
    if current_user:
        _check_download_access(current_user)  # db not available here; monthly reset handled by record-download
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


# ─── Direct DOCX export (always free, no paywall) ────────────────────────────

@app.post("/api/export/generate-docx")
@limiter.limit("20/minute")
async def generate_export_docx(request: Request, body: DirectExportRequest):
    """Generate an ATS-safe DOCX from raw sections JSON.

    Always free — no download counter, no paywall. DOCX is the preferred
    format for many ATS systems and is a trust signal for users.
    """
    docx_bytes = generate_resume_docx(body.sections)
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": 'attachment; filename="resume.docx"'},
    )


# ─── Payments ────────────────────────────────────────────────────────────────

class CreateOrderRequest(BaseModel):
    plan: str                     # one_time | basic | pro
    return_url: str = "http://localhost:3000/payment/success"


@app.post("/api/payments/create-order")
@limiter.limit("10/minute")
async def create_order(
    request: Request,
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
        # starter & lifetime are ONE_TIME payments that activate timed/permanent access
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

        # Activate access based on plan
        _activate_plan(current_user, payment)
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
            _activate_plan(user, payment)
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
            {"id": "one_time", "label": "Top-Up",          "amount": 199,  "currency": "INR", "type": "ONE_TIME"},
            {"id": "starter",  "label": "7-Day Access",    "amount": 49,   "currency": "INR", "type": "ONE_TIME"},
            {"id": "basic",    "label": "Basic Monthly",   "amount": 399,  "currency": "INR", "type": "SUBSCRIPTION"},
            {"id": "lifetime", "label": "Lifetime Access", "amount": 999,  "currency": "INR", "type": "ONE_TIME"},
            {"id": "pro",      "label": "Pro Monthly",     "amount": 649,  "currency": "INR", "type": "SUBSCRIPTION"},
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
    _apply_monthly_reset(current_user, db)
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


# ─── Cover Letter ────────────────────────────────────────────────────────────

class CoverLetterRequest(BaseModel):
    resume_id: int
    job_description: str = Field(max_length=8000)
    company: str = Field(max_length=200)
    tone: str = Field(default="professional", pattern="^(professional|enthusiastic|concise)$")


@app.post("/api/cover-letter/generate")
@limiter.limit("10/minute")
async def generate_cover_letter(
    request: Request,
    body: CoverLetterRequest,
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Generate a cover letter from resume data + job description."""
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
        "concise": "brief, direct, and to the point — 3 short paragraphs maximum",
    }[body.tone]

    contact = sections.get("contact", sections.get("personal", {}))
    name = contact.get("name", "the applicant")
    summary = sections.get("summary", "")
    exp_list = sections.get("experience", [])
    top_exp = exp_list[0] if exp_list else {}
    skills = sections.get("skills", {})
    all_skills = []
    for k in ("languages", "frameworks", "tools", "databases", "other"):
        all_skills.extend(skills.get(k, []))

    sections_snippet = json.dumps({
        "name": name,
        "summary": summary[:400],
        "most_recent_role": f"{top_exp.get('title', '')} at {top_exp.get('company', '')}",
        "key_skills": all_skills[:12],
    })

    prompt = f"""You are an expert cover letter writer. Write a compelling cover letter for {name} applying to {body.company or "the company"}.

Tone: {tone_instruction}

Candidate summary:
{sections_snippet}

Job description:
{body.job_description[:1200]}

Instructions:
- Write exactly 3 paragraphs
- Paragraph 1: Express interest in the role + brief positioning statement
- Paragraph 2: Highlight 2–3 specific achievements/skills that match the JD
- Paragraph 3: Call to action — express enthusiasm and request an interview
- Do NOT include any header, salutation, or sign-off — just the 3 paragraphs
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


# ─── Resume Versions ──────────────────────────────────────────────────────────

class SaveVersionRequest(BaseModel):
    name: str = Field(max_length=100)


@app.post("/api/resume/{resume_id}/versions")
def save_resume_version(
    resume_id: int,
    body: SaveVersionRequest,
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Save current optimized sections as a named version."""
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


@app.get("/api/resume/{resume_id}/versions")
def list_resume_versions(
    resume_id: int,
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """List all saved versions for a resume."""
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


@app.post("/api/resume/{resume_id}/versions/{version_id}/restore")
def restore_resume_version(
    resume_id: int,
    version_id: int,
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Restore a saved version's sections back to the resume's latest generated record."""
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

def _activate_plan(user: models.User, payment: models.Payment) -> None:
    """Apply the correct access grant based on the plan purchased."""
    plan = payment.plan
    if plan == "one_time":
        # Top-up: reset monthly counter so they get their PDF
        user.free_downloads_used = 0
    elif plan == "starter":
        # 7-day full access
        user.subscription_status = "ACTIVE"
        user.subscription_plan = "starter"
        user.subscription_expiry = datetime.now(timezone.utc) + timedelta(days=7)
    elif plan == "lifetime":
        # Permanent access — expiry stays NULL (never expires)
        user.subscription_status = "ACTIVE"
        user.subscription_plan = "lifetime"
        user.subscription_expiry = None
    else:
        # basic / pro — 30-day rolling subscription
        user.subscription_status = "ACTIVE"
        user.subscription_plan = plan
        user.subscription_expiry = datetime.now(timezone.utc) + timedelta(days=30)


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


def _apply_monthly_reset(user: models.User, db: Session) -> None:
    """Reset free download counter if we're in a new calendar month."""
    now = datetime.now(timezone.utc)
    reset_date = user.free_downloads_reset_date
    if reset_date is None or (now.year, now.month) != (reset_date.year, reset_date.month):
        user.free_downloads_used = 0
        user.free_downloads_reset_date = now
        db.commit()


def _check_download_access(user: models.User, db: Session = None) -> None:
    """Raises 402 Payment Required if user has exhausted free downloads and has no active subscription."""
    if not _is_free_tier(user):
        return  # subscriber — allow
    if db is not None:
        _apply_monthly_reset(user, db)
    if (user.free_downloads_used or 0) < FREE_DOWNLOAD_LIMIT:
        return  # still within free tier
    raise HTTPException(
        status_code=402,
        detail={
            "code": "PAYMENT_REQUIRED",
            "message": f"You have used your {FREE_DOWNLOAD_LIMIT} free PDF downloads this month. Purchase a plan to continue.",
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
