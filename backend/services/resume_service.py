from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

import models


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
            "tools": "Tools",
            "databases": "Databases",
            "other": "Other",
        }
        for key, label in label_map.items():
            values = skills.get(key, [])
            if values:
                lines.append(f"**{label}:** {', '.join(values)}")
        lines.append("")

    if sections.get("projects"):
        lines.append("## Projects\n")
        for proj in sections["projects"]:
            lines.append(f"### {proj.get('name', '')}")
            if proj.get("description"):
                lines.append(proj["description"])
            if proj.get("tech_stack"):
                lines.append(f"Tech: {', '.join(proj['tech_stack'])}")
            if proj.get("link"):
                lines.append(proj["link"])
            lines.append("")

    if sections.get("certifications"):
        lines.append("## Certifications\n")
        for cert in sections["certifications"]:
            lines.append(f"- {cert.get('name', '')} — {cert.get('issuer', '')} ({cert.get('date', '')})")

    return "\n".join(lines).strip()
