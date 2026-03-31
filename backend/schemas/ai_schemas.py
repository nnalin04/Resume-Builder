from pydantic import BaseModel, Field


class AtsRequest(BaseModel):
    resume_id: int
    job_description: str = Field(max_length=8000)


class GenerateRequest(BaseModel):
    resume_id: int
    job_description: str = Field(default="", max_length=8000)
    requirements_prompt: str = Field(default="", max_length=4000)
    template: str = Field(default="classic", pattern="^(classic|modern|technical|professional|twocolumn|clean)$")


class ChatRequest(BaseModel):
    resume_id: int
    message: str = Field(max_length=4000)
    job_description: str = Field(default="", max_length=8000)


class RewriteRequest(BaseModel):
    text: str = Field(max_length=5000)
    instruction: str = Field(max_length=1000)
    context: str = Field(default="", max_length=2000)


class CoverLetterRequest(BaseModel):
    resume_id: int
    job_description: str = Field(max_length=8000)
    company: str = Field(max_length=200)
    tone: str = Field(default="professional", pattern="^(professional|enthusiastic|concise)$")
