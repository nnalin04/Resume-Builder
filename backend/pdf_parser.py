"""
PDF text extraction.

Uses PyMuPDF (fitz) as primary extractor — preserves reading order and handles
multi-column layouts better than pdfplumber.
Falls back to pdfplumber if PyMuPDF is not installed or fails.

Raises ValueError for scanned/image PDFs and encrypted PDFs so the caller
can return a user-friendly HTTP 422.
"""

from io import BytesIO


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extract plain text from a PDF's bytes.

    Tries PyMuPDF first; falls back to pdfplumber on ImportError or parse error.
    Raises ValueError for unreadable files (scanned, encrypted, empty).
    """
    # ── Primary: PyMuPDF ──────────────────────────────────────────────────────
    try:
        import fitz  # PyMuPDF

        doc = fitz.open(stream=file_bytes, filetype="pdf")

        if doc.is_encrypted:
            doc.close()
            raise ValueError(
                "This PDF is password-protected. "
                "Please upload an unprotected version."
            )

        lines: list[str] = []
        for page in doc:
            text = page.get_text("text")
            if text:
                lines.append(text)
        doc.close()

        raw = "\n".join(lines).strip()
        if len(raw) < 30:
            raise ValueError(
                "This appears to be a scanned or image-only PDF. "
                "Please upload a text-based PDF."
            )
        return raw

    except ImportError:
        pass  # PyMuPDF not installed — fall through to pdfplumber
    except ValueError:
        raise  # re-raise user-facing errors (scanned, encrypted)
    except Exception:
        pass  # unexpected parse error — try pdfplumber

    # ── Fallback: pdfplumber ──────────────────────────────────────────────────
    import pdfplumber

    text_parts: list[str] = []
    with pdfplumber.open(BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            extracted = page.extract_text()
            if extracted:
                text_parts.append(extracted)

    raw = "\n".join(text_parts).strip()
    if not raw:
        raise ValueError(
            "Could not extract text from this PDF. "
            "Please ensure it is not an image-only or scanned document."
        )
    return raw
