import hmac
import logging
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from schemas.auth_schemas import (
    RegisterRequest, LoginRequest, GoogleCallbackRequest,
    ForgotPasswordRequest, ResetPasswordRequest, UpdateProfileRequest,
    VerifyEmailRequest,
)
from sqlalchemy.orm import Session

import models
from auth import (
    create_access_token,
    exchange_google_code,
    get_current_user,
    hash_password,
    verify_password,
)
from database import get_db
from rate_limiter import limiter
from services.auth_service import (
    FRONTEND_URL,
    RESET_TOKEN_TTL_MINUTES,
    SMTP_HOST,
    SMTP_USER,
    _send_reset_email,
    _user_dict,
    _user_response,
)
from services.otp_service import clear_otp, generate_otp, get_otp_entry, send_otp_email, smtp_is_configured, store_otp


router = APIRouter()
logger = logging.getLogger(__name__)
AVATARS_DIR = os.getenv("AVATARS_DIR", "./data/avatars")



@router.post("/api/auth/register")
@limiter.limit("10/minute")
def register(request: Request, body: RegisterRequest, db: Session = Depends(get_db)):
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


@router.post("/api/auth/login")
@limiter.limit("10/minute")
def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == body.email).first()
    if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
        logger.warning(
            "Login failed: email=%s reason=bad_credentials",
            body.email,
            extra={"event": "login_failed", "email": body.email},
        )
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    token = create_access_token(user.id, user.email)
    logger.info(
        "User login: id=%d email=%s",
        user.id, user.email,
        extra={"event": "user_login", "user_id": user.id, "auth_provider": "email"},
    )
    return _user_response(user, token)


@router.post("/api/auth/google")
@limiter.limit("10/minute")
async def google_callback(request: Request, body: GoogleCallbackRequest, db: Session = Depends(get_db)):
    google_user = await exchange_google_code(body.code, body.redirect_uri)
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


@router.post("/api/auth/forgot-password")
@limiter.limit("5/minute")
def forgot_password(request: Request, body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == body.email).first()
    if not user or user.auth_provider != "LOCAL":
        return {"detail": "If that email exists, a reset link has been sent."}

    db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.user_id == user.id,
        models.PasswordResetToken.used == 0,
    ).update({"used": 1})

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_TTL_MINUTES)
    reset_token = models.PasswordResetToken(user_id=user.id, token=token, expires_at=expires_at)
    db.add(reset_token)
    db.commit()

    reset_link = f"{FRONTEND_URL}/reset-password?token={token}"

    if not SMTP_HOST or not SMTP_USER:
        if os.getenv("ENV", "production") == "development":
            logger.warning("SMTP not configured. Reset link: %s", reset_link)
            return {"detail": "If that email exists, a reset link has been sent.", "dev_reset_link": reset_link}
        raise HTTPException(status_code=503, detail="Email service not configured. Contact support.")

    try:
        _send_reset_email(user.email, reset_link)
    except Exception as exc:
        logger.error("Failed to send reset email: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to send email. Please try again later.")

    return {"detail": "If that email exists, a reset link has been sent."}


@router.post("/api/auth/reset-password")
@limiter.limit("10/minute")
def reset_password(request: Request, body: ResetPasswordRequest, db: Session = Depends(get_db)):
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


@router.get("/api/auth/me")
def get_me(current_user: models.User = Depends(get_current_user)):
    return _user_dict(current_user)


@router.put("/api/auth/me")
@limiter.limit("20/minute")
def update_profile(
    request: Request,
    body: UpdateProfileRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
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


@router.post("/api/auth/me/photo")
@limiter.limit("5/minute")
async def upload_avatar(
    request: Request,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    allowed = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, or WebP images are supported.")
    data = await file.read()
    if len(data) > 2 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image too large. Maximum size is 2 MB.")
    ext = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}[file.content_type]
    filename = f"{uuid.uuid4().hex}.{ext}"
    os.makedirs(AVATARS_DIR, exist_ok=True)
    dest = os.path.join(AVATARS_DIR, filename)
    if current_user.profile_photo_url and "/api/avatars/" in current_user.profile_photo_url:
        old_file = os.path.join(AVATARS_DIR, current_user.profile_photo_url.split("/api/avatars/")[-1])
        if os.path.exists(old_file):
            os.remove(old_file)
    with open(dest, "wb") as f:
        f.write(data)
    photo_url = f"/api/avatars/{filename}"
    current_user.profile_photo_url = photo_url
    db.commit()
    return {"profile_photo_url": photo_url}


@router.get("/api/avatars/{filename}")
async def serve_avatar(filename: str):
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename.")
    path = os.path.join(AVATARS_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Avatar not found.")
    ext = filename.rsplit(".", 1)[-1].lower()
    media = {"jpg": "image/jpeg", "png": "image/png", "webp": "image/webp"}.get(ext, "application/octet-stream")
    return FileResponse(path, media_type=media)


@router.post("/api/auth/send-verification")
@limiter.limit("3/minute")
def send_verification(
    request: Request,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.email_verified:
        raise HTTPException(status_code=400, detail="Email is already verified.")
    otp = generate_otp()
    store_otp(current_user.id, otp, db)
    if not smtp_is_configured():
        if os.getenv("ENV", "production") == "development":
            logger.warning("SMTP not configured. OTP for %s: %s", current_user.email, otp)
            return {"detail": "OTP sent (dev mode — check server logs).", "dev_otp": otp}
        raise HTTPException(status_code=503, detail="Email service not configured. Contact support.")
    try:
        send_otp_email(current_user.email, otp)
    except Exception as exc:
        logger.error("Failed to send OTP email: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to send email. Please try again later.")
    return {"detail": "Verification code sent to your email."}


@router.post("/api/auth/verify-email")
@limiter.limit("10/minute")
def verify_email(
    request: Request,
    body: VerifyEmailRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.email_verified:
        return {"detail": "Email already verified.", "email_verified": True}
    entry = get_otp_entry(current_user.id, db)
    if not entry:
        raise HTTPException(status_code=400, detail="No verification code found. Please request a new one.")
    expires_at = entry["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expires_at:
        clear_otp(current_user.id, db)
        raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new one.")
    if not hmac.compare_digest(body.otp.strip(), entry["otp"]):
        raise HTTPException(status_code=400, detail="Incorrect verification code.")
    clear_otp(current_user.id, db)
    current_user.email_verified = True
    db.commit()
    return {"detail": "Email verified successfully.", "email_verified": True}
