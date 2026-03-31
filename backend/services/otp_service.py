import secrets
import smtplib
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from sqlalchemy.orm import Session

import models
from services.auth_service import SMTP_FROM, SMTP_HOST, SMTP_PASS, SMTP_PORT, SMTP_USER


OTP_TTL_MINUTES = 10


def generate_otp() -> str:
    return f"{secrets.randbelow(1000000):06d}"


def store_otp(user_id: int, otp: str, db: Session) -> None:
    """Persist OTP to DB. Deletes any existing token for this user first."""
    db.query(models.OtpToken).filter(models.OtpToken.user_id == user_id).delete()
    token = models.OtpToken(
        user_id=user_id,
        otp_hash=otp,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=OTP_TTL_MINUTES),
    )
    db.add(token)
    db.commit()


def get_otp_entry(user_id: int, db: Session) -> dict | None:
    """Return the active OTP entry for a user, or None if expired/missing."""
    token = (
        db.query(models.OtpToken)
        .filter(
            models.OtpToken.user_id == user_id,
            models.OtpToken.used == False,  # noqa: E712
            models.OtpToken.expires_at > datetime.now(timezone.utc),
        )
        .first()
    )
    if token is None:
        return None
    return {"otp": token.otp_hash, "expires_at": token.expires_at, "_id": token.id}


def clear_otp(user_id: int, db: Session) -> None:
    """Mark all OTP tokens for this user as used."""
    db.query(models.OtpToken).filter(models.OtpToken.user_id == user_id).update({"used": True})
    db.commit()


def smtp_is_configured() -> bool:
    return bool(SMTP_HOST and SMTP_USER)


def send_otp_email(to_email: str, otp: str) -> None:
    """Send email verification OTP via SMTP."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Your Resume Builder verification code"
    msg["From"] = SMTP_FROM
    msg["To"] = to_email
    text_body = f"Your Resume Builder verification code is: {otp}\n\nThis code expires in {OTP_TTL_MINUTES} minutes."
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
      This code expires in <strong>{OTP_TTL_MINUTES} minutes</strong>.
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
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.sendmail(SMTP_FROM, to_email, msg.as_string())
