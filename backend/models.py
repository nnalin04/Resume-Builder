from sqlalchemy import Column, Integer, String, Text, DateTime, Float
from database import Base
import datetime


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    original_text = Column(Text)
    parsed_sections = Column(Text, default="{}")   # AI-structured JSON
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class GeneratedResume(Base):
    __tablename__ = "generated_resumes"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, index=True)
    template = Column(String, default="classic")   # classic | modern | technical
    optimized_sections = Column(Text, default="{}")  # AI-improved structured JSON
    job_description = Column(Text, default="")
    requirements_prompt = Column(Text, default="")
    ats_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, index=True)
    role = Column(String)    # 'user' | 'assistant'
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
