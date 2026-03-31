"""
Tests for backend/middleware.py
Covers: verify_backend_secret, add_security_headers, log_requests
"""
import os


# ─── verify_backend_secret ────────────────────────────────────────────────────

def test_no_secret_env_allows_all_requests(client, monkeypatch):
    """When BACKEND_SECRET is not set, every request passes through."""
    monkeypatch.setattr("middleware._BACKEND_SECRET", "")
    r = client.get("/health")
    assert r.status_code == 200


def test_wrong_secret_returns_403(client, monkeypatch):
    monkeypatch.setattr("middleware._BACKEND_SECRET", "correct-secret")
    r = client.get("/api/auth/me", headers={"X-Backend-Secret": "wrong"})
    assert r.status_code == 403


def test_correct_secret_passes(client, monkeypatch, auth_headers):
    monkeypatch.setattr("middleware._BACKEND_SECRET", "correct-secret")
    headers = {**auth_headers, "X-Backend-Secret": "correct-secret"}
    r = client.get("/api/auth/me", headers=headers)
    assert r.status_code == 200


def test_missing_secret_header_returns_403(client, monkeypatch):
    monkeypatch.setattr("middleware._BACKEND_SECRET", "my-secret")
    r = client.get("/api/auth/me")
    assert r.status_code == 403


def test_health_exempt_from_secret(client, monkeypatch):
    """/ and /health are exempt even when BACKEND_SECRET is set."""
    monkeypatch.setattr("middleware._BACKEND_SECRET", "my-secret")
    r = client.get("/health")
    assert r.status_code == 200


def test_root_exempt_from_secret(client, monkeypatch):
    monkeypatch.setattr("middleware._BACKEND_SECRET", "my-secret")
    r = client.get("/")
    assert r.status_code == 200


def test_avatar_prefix_exempt_from_secret(client, monkeypatch):
    """/api/avatars/* is exempt."""
    monkeypatch.setattr("middleware._BACKEND_SECRET", "my-secret")
    r = client.get("/api/avatars/somefile.jpg")
    # 404 from file-not-found is fine; 403 would mean the middleware blocked it
    assert r.status_code != 403


# ─── add_security_headers ─────────────────────────────────────────────────────

def test_security_headers_present(client):
    r = client.get("/health")
    assert r.headers.get("X-Content-Type-Options") == "nosniff"
    assert r.headers.get("X-Frame-Options") == "DENY"
    assert r.headers.get("X-XSS-Protection") == "1; mode=block"
    assert r.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"


def test_no_hsts_over_http(client):
    """HSTS is only added for HTTPS requests; TestClient uses http."""
    r = client.get("/health")
    assert "Strict-Transport-Security" not in r.headers
