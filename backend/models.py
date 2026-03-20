from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey
from database import Base
import datetime


def _now():
    return datetime.datetime.now(datetime.timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=True)          # null for OAuth-only users
    name = Column(String, nullable=False, default="")
    auth_provider = Column(String, default="LOCAL")        # LOCAL | GOOGLE
    profile_photo_url = Column(String, nullable=True)

    free_downloads_used = Column(Integer, default=0)
    free_downloads_reset_date = Column(DateTime, nullable=True)
    subscription_status = Column(String, default="FREE")   # FREE | ACTIVE | EXPIRED | CANCELLED
    subscription_plan = Column(String, nullable=True)      # monthly | yearly
    subscription_expiry = Column(DateTime, nullable=True)
    cashfree_customer_id = Column(String, nullable=True)

    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    filename = Column(String, index=True)
    original_text = Column(Text)
    parsed_sections = Column(Text, default="{}")   # AI-structured JSON
    created_at = Column(DateTime, default=_now)


class GeneratedResume(Base):
    __tablename__ = "generated_resumes"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id"), index=True)
    template = Column(String, default="classic")   # classic | modern | technical
    optimized_sections = Column(Text, default="{}")  # AI-improved structured JSON
    job_description = Column(Text, default="")
    requirements_prompt = Column(Text, default="")
    ats_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=_now)


class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id"), index=True)
    role = Column(String)    # 'user' | 'assistant'
    content = Column(Text)
    created_at = Column(DateTime, default=_now)


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    cashfree_order_id = Column(String, unique=True, nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="INR")
    payment_method = Column(String, nullable=True)
    status = Column(String, default="PENDING")             # PENDING | SUCCESS | FAILED
    type = Column(String, default="ONE_TIME")              # ONE_TIME | SUBSCRIPTION
    plan = Column(String, nullable=True)                   # basic | pro (for subscriptions)
    created_at = Column(DateTime, default=_now)


class ResumeVersion(Base):
    __tablename__ = "resume_versions"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id"), index=True)
    name = Column(String, nullable=False)
    sections_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=_now)


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token = Column(String, unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Integer, default=0)   # 0 = unused, 1 = consumed
    created_at = Column(DateTime, default=_now)


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    cashfree_subscription_id = Column(String, nullable=True)
    plan = Column(String, nullable=False)                  # basic | pro
    status = Column(String, default="ACTIVE")              # ACTIVE | CANCELLED | EXPIRED
    current_period_start = Column(DateTime, nullable=True)
    current_period_end = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=_now)
