import pdfplumber
from io import BytesIO

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extract text content from a PDF file's bytes using pdfplumber.
    """
    text_content = ""
    with pdfplumber.open(BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            extracted = page.extract_text()
            if extracted:
                text_content += extracted + "\n"
    return text_content
