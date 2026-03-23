"""
Multi-page ATS-safe PDF generator using reportlab.

Templates:
  classic   — Times-Roman, traditional section headers with underlines
  modern    — Helvetica, minimal, tight spacing with subtle dividers
  technical — Helvetica, skills-first emphasis, monospace skill tags

Content flows naturally across pages — no artificial caps on bullets or sections.
"""
import io
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, KeepTogether


# ─── Color Palettes ───────────────────────────────────────────────────────────

PALETTES = {
    "classic": {
        "heading_font": "Times-Bold",
        "body_font": "Times-Roman",
        "header_color": colors.HexColor("#1a1a2e"),
        "section_color": colors.HexColor("#16213e"),
        "rule_color": colors.HexColor("#4a4a6a"),
        "body_color": colors.HexColor("#1a1a1a"),
    },
    "modern": {
        "heading_font": "Helvetica-Bold",
        "body_font": "Helvetica",
        "header_color": colors.HexColor("#0d1117"),
        "section_color": colors.HexColor("#0070f3"),
        "rule_color": colors.HexColor("#e1e4e8"),
        "body_color": colors.HexColor("#24292f"),
    },
    "technical": {
        "heading_font": "Helvetica-Bold",
        "body_font": "Helvetica",
        "header_color": colors.HexColor("#1f2937"),
        "section_color": colors.HexColor("#059669"),
        "rule_color": colors.HexColor("#d1fae5"),
        "body_color": colors.HexColor("#111827"),
    },
}


def _build_styles(template: str) -> dict:
    p = PALETTES.get(template, PALETTES["classic"])
    return {
        "name": ParagraphStyle("name",
            fontName=p["heading_font"], fontSize=16, leading=18,
            textColor=p["header_color"], alignment=TA_CENTER, spaceAfter=3),
        "contact_line": ParagraphStyle("contact_line",
            fontName=p["body_font"], fontSize=8.5, leading=10,
            textColor=p["body_color"], alignment=TA_CENTER, spaceAfter=3),
        "section_header": ParagraphStyle("section_header",
            fontName=p["heading_font"], fontSize=9.5, leading=11,
            textColor=p["section_color"], spaceBefore=6, spaceAfter=1,
            textTransform="uppercase"),
        "job_title": ParagraphStyle("job_title",
            fontName=p["heading_font"], fontSize=9.5, leading=11,
            textColor=p["header_color"], spaceBefore=4, spaceAfter=1),
        "job_meta": ParagraphStyle("job_meta",
            fontName=p["body_font"], fontSize=8.5, leading=10,
            textColor=p["body_color"], spaceAfter=2),
        "bullet": ParagraphStyle("bullet",
            fontName=p["body_font"], fontSize=8.5, leading=10.5,
            textColor=p["body_color"], leftIndent=10, spaceAfter=1,
            bulletIndent=2),
        "body": ParagraphStyle("body",
            fontName=p["body_font"], fontSize=8.5, leading=10.5,
            textColor=p["body_color"], spaceAfter=2),
        "rule_color": p["rule_color"],
    }


def _safe(text) -> str:
    if not text:
        return ""
    return str(text).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _divider(styles) -> list:
    return [HRFlowable(width="100%", thickness=0.4,
                       color=styles["rule_color"], spaceAfter=2)]


def _first_sentence(text: str, max_chars: int = 110) -> str:
    """Return first sentence of text, capped at max_chars."""
    import re
    m = re.search(r"\.(?=\s|$)", text)
    snippet = text[:m.end()].strip() if m else text
    return snippet[:max_chars] + ("…" if len(snippet) > max_chars else "")


def generate_resume_pdf(sections: dict, template: str = "classic") -> bytes:
    """Build a one-page ATS-safe PDF. Returns raw bytes."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )
    styles = _build_styles(template)
    story = []

    # ── Header ────────────────────────────────────────────────────────────────
    contact = sections.get("contact", {})
    if contact.get("name"):
        story.append(Paragraph(_safe(contact["name"]), styles["name"]))

    parts = [_safe(contact[f]) for f in ("email","phone","location","linkedin","github","website") if contact.get(f)]
    if parts:
        story.append(Paragraph("  |  ".join(parts), styles["contact_line"]))
    story.append(Spacer(1, 3))

    # ── Summary ───────────────────────────────────────────────────────────────
    summary = sections.get("summary", "")
    if summary:
        story.append(Paragraph("PROFESSIONAL SUMMARY", styles["section_header"]))
        story += _divider(styles)
        story.append(Paragraph(_safe(summary), styles["body"]))

    # ── Skills (technical template: skills go first) ───────────────────────
    if template == "technical":
        story += _render_skills(sections.get("skills", {}), styles)

    # ── Experience ────────────────────────────────────────────────────────────
    experience = sections.get("experience", [])
    if experience:
        story.append(Paragraph("EXPERIENCE", styles["section_header"]))
        story += _divider(styles)
        for job in experience:
            meta = []
            if job.get("location"):
                meta.append(_safe(job["location"]))
            meta.append(_safe(f"{job.get('start_date','')} – {job.get('end_date','Present')}"))
            entry = [
                Paragraph(_safe(f"{job.get('title','')}  —  {job.get('company','')}"), styles["job_title"]),
                Paragraph("  |  ".join(meta), styles["job_meta"]),
            ]
            for b in job.get("bullets", []):
                if b:
                    entry.append(Paragraph(f"• {_safe(b)}", styles["bullet"]))
            story.append(KeepTogether(entry))

    # ── Education ─────────────────────────────────────────────────────────────
    education = sections.get("education", [])
    if education:
        story.append(Paragraph("EDUCATION", styles["section_header"]))
        story += _divider(styles)
        for edu in education:
            degree = edu.get("degree", "")
            field  = edu.get("field", "")
            deg_line = degree if (not field or field.lower() in degree.lower()) else f"{degree} in {field}"
            meta = _safe(edu.get("institution", ""))
            if edu.get("graduation_date"):
                meta += f"  |  {_safe(edu['graduation_date'])}"
            if edu.get("gpa"):
                meta += f"  |  GPA: {_safe(edu['gpa'])}"
            story.append(KeepTogether([
                Paragraph(_safe(deg_line), styles["job_title"]),
                Paragraph(meta, styles["job_meta"]),
            ]))

    # ── Skills (classic + modern) ──────────────────────────────────────────
    if template != "technical":
        story += _render_skills(sections.get("skills", {}), styles)

    # ── Projects (max 2, first sentence only) ────────────────────────────────
    projects = sections.get("projects", [])
    if projects:
        story.append(Paragraph("PROJECTS", styles["section_header"]))
        story += _divider(styles)
        for proj in projects:
            name = _safe(proj.get("name", ""))
            entry = [Paragraph(name, styles["job_title"])]
            desc = proj.get("description", "")
            if desc:
                entry.append(Paragraph(f"• {_safe(desc)}", styles["bullet"]))
            tech = proj.get("tech_stack", [])
            if tech:
                entry.append(Paragraph(f"<b>Tech:</b> {_safe(', '.join(tech))}", styles["body"]))
            story.append(KeepTogether(entry))

    # ── Certifications ────────────────────────────────────────────────────────
    certs = sections.get("certifications", [])
    if certs:
        story.append(Paragraph("CERTIFICATIONS", styles["section_header"]))
        story += _divider(styles)
        for cert in certs:
            line = _safe(cert.get("name", ""))
            if cert.get("issuer"):
                line += f"  —  {_safe(cert['issuer'])}"
            if cert.get("date"):
                line += f"  ({_safe(cert['date'])})"
            story.append(Paragraph(line, styles["body"]))

    doc.build(story)
    return buffer.getvalue()


def _render_skills(skills: dict, styles: dict) -> list:
    if not skills or not any(skills.values()):
        return []
    items = [Paragraph("SKILLS", styles["section_header"])]
    items += _divider(styles)
    label_map = {
        "languages":  "Languages",
        "frameworks": "Frameworks",
        "tools":      "Tools & Platforms",
        "databases":  "Databases",
        "other":      "Other",
    }
    for key, label in label_map.items():
        vals = skills.get(key, [])
        if vals:
            items.append(Paragraph(
                f"<b>{label}:</b>  {_safe(', '.join(vals))}",
                styles["body"]))
    return items
