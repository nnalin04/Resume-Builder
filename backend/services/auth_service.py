import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import models


SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
SMTP_FROM = os.getenv("SMTP_FROM", "Resume Builder <noreply@resumebuilder.app>")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
RESET_TOKEN_TTL_MINUTES = 30


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


def _send_reset_email(to_email: str, reset_link: str) -> None:
    """Send password reset email via SMTP. Raises on failure."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Reset your Resume Builder password"
    msg["From"] = SMTP_FROM
    msg["To"] = to_email

    text_body = f"""Hi,

You requested a password reset for your Resume Builder account.

Click the link below to set a new password (valid for {RESET_TOKEN_TTL_MINUTES} minutes):

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
      This link expires in <strong>{RESET_TOKEN_TTL_MINUTES} minutes</strong>.
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

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.ehlo()
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.sendmail(SMTP_FROM, to_email, msg.as_string())
