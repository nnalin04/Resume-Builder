"""Tests for resume CRUD endpoints."""
import io


def test_list_resumes_empty(client, auth_headers):
    r = client.get("/api/resumes", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] == 0


def test_list_resumes_pagination_defaults(client, auth_headers):
    r = client.get("/api/resumes", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["page"] == 1
    assert data["page_size"] == 20


def test_list_resumes_invalid_page(client, auth_headers):
    r = client.get("/api/resumes?page=0", headers=auth_headers)
    assert r.status_code == 422


def test_get_resume_not_found(client, auth_headers):
    r = client.get("/api/resume/99999", headers=auth_headers)
    assert r.status_code == 404


def test_upload_non_pdf(client, auth_headers):
    r = client.post(
        "/api/upload-resume",
        files={"file": ("resume.txt", b"not a pdf", "text/plain")},
        headers=auth_headers,
    )
    assert r.status_code == 400


def test_upload_oversized_pdf(client, auth_headers):
    big_bytes = b"%PDF-1.4" + b"0" * (6 * 1024 * 1024)
    r = client.post(
        "/api/upload-resume",
        files={"file": ("resume.pdf", io.BytesIO(big_bytes), "application/pdf")},
        headers=auth_headers,
    )
    assert r.status_code == 413
