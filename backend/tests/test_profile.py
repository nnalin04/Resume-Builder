"""
Tests for profile management and password reset endpoints:
  PUT  /api/auth/me          — update profile
  POST /api/auth/me/photo    — avatar upload
  GET  /api/avatars/{file}   — serve avatar
  POST /api/auth/forgot-password
  POST /api/auth/reset-password
"""
import io
import os


# ─── PUT /api/auth/me ─────────────────────────────────────────────────────────

def test_update_profile_name(client, registered_user, auth_headers):
    r = client.put("/api/auth/me", json={"name": "Updated Name"}, headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["name"] == "Updated Name"


def test_update_profile_phone_and_location(client, auth_headers):
    r = client.put(
        "/api/auth/me",
        json={"phone": "+91-9999999999", "location": "Mumbai, India"},
        headers=auth_headers,
    )
    assert r.status_code == 200
    data = r.json()
    assert data["phone"] == "+91-9999999999"
    assert data["location"] == "Mumbai, India"


def test_update_profile_bio_too_long(client, auth_headers):
    r = client.put("/api/auth/me", json={"bio": "x" * 201}, headers=auth_headers)
    assert r.status_code == 422


def test_update_profile_bio_max_length(client, auth_headers):
    r = client.put("/api/auth/me", json={"bio": "a" * 200}, headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["bio"] == "a" * 200


def test_update_profile_social_links(client, auth_headers):
    r = client.put(
        "/api/auth/me",
        json={
            "linkedin": "https://linkedin.com/in/testuser",
            "github": "https://github.com/testuser",
            "website": "https://testuser.dev",
        },
        headers=auth_headers,
    )
    assert r.status_code == 200
    data = r.json()
    assert data["linkedin"] == "https://linkedin.com/in/testuser"
    assert data["github"] == "https://github.com/testuser"


def test_update_profile_unauthenticated(client):
    r = client.put("/api/auth/me", json={"name": "Hacker"})
    assert r.status_code == 401


def test_update_profile_empty_name_keeps_existing(client, registered_user, auth_headers):
    """Empty string name should keep current name (the strip-or-keep logic)."""
    current_name = registered_user["user"]["name"]
    r = client.put("/api/auth/me", json={"name": ""}, headers=auth_headers)
    assert r.status_code == 200
    # Empty string triggers the `or current_user.name` fallback
    assert r.json()["name"] == current_name


# ─── POST /api/auth/me/photo ──────────────────────────────────────────────────

def test_avatar_upload_unsupported_type(client, auth_headers):
    r = client.post(
        "/api/auth/me/photo",
        files={"file": ("avatar.gif", b"GIF89a", "image/gif")},
        headers=auth_headers,
    )
    assert r.status_code == 400


def test_avatar_upload_oversized(client, auth_headers):
    big = b"\xff\xd8\xff" + b"0" * (2 * 1024 * 1024 + 1)  # > 2 MB
    r = client.post(
        "/api/auth/me/photo",
        files={"file": ("avatar.jpg", io.BytesIO(big), "image/jpeg")},
        headers=auth_headers,
    )
    assert r.status_code == 413


def test_avatar_upload_valid_png(client, auth_headers, tmp_path, monkeypatch):
    monkeypatch.setattr("routers.auth_router.AVATARS_DIR", str(tmp_path))
    # Minimal valid 1×1 PNG bytes
    png_bytes = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00"
        b"\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    r = client.post(
        "/api/auth/me/photo",
        files={"file": ("avatar.png", io.BytesIO(png_bytes), "image/png")},
        headers=auth_headers,
    )
    assert r.status_code == 200
    assert "profile_photo_url" in r.json()
    assert r.json()["profile_photo_url"].startswith("/api/avatars/")


# ─── GET /api/avatars/{filename} ─────────────────────────────────────────────

def test_serve_avatar_not_found(client):
    r = client.get("/api/avatars/nonexistent.jpg")
    assert r.status_code == 404


def test_serve_avatar_path_traversal_blocked(client):
    r = client.get("/api/avatars/../.env")
    # FastAPI path routing will likely 404; the middleware also rejects ".."
    assert r.status_code in (400, 404, 422)


# ─── POST /api/auth/forgot-password ──────────────────────────────────────────

def test_forgot_password_unknown_email_returns_200(client):
    """Always returns 200 to avoid user enumeration."""
    r = client.post("/api/auth/forgot-password", json={"email": "nobody@example.com"})
    assert r.status_code == 200
    assert "reset link" in r.json()["detail"].lower()


def test_forgot_password_google_user_returns_200(client, monkeypatch):
    """Google users get the generic 200 response (no LOCAL auth_provider)."""
    import models
    from tests.conftest import TestingSession
    db = TestingSession()
    google_user = models.User(
        email="google_pw_test@example.com",
        name="Google User",
        auth_provider="GOOGLE",
    )
    db.add(google_user)
    db.commit()
    db.close()

    r = client.post("/api/auth/forgot-password", json={"email": "google_pw_test@example.com"})
    assert r.status_code == 200


def test_forgot_password_dev_mode_returns_link(client, registered_user, monkeypatch):
    monkeypatch.setenv("ENV", "development")
    monkeypatch.setattr("routers.auth_router.SMTP_HOST", "")
    monkeypatch.setattr("routers.auth_router.SMTP_USER", "")
    r = client.post("/api/auth/forgot-password", json={"email": registered_user["user"]["email"]})
    assert r.status_code == 200
    assert "dev_reset_link" in r.json()


# ─── POST /api/auth/reset-password ───────────────────────────────────────────

def test_reset_password_invalid_token(client):
    r = client.post("/api/auth/reset-password", json={"token": "badtoken", "new_password": "newpass123"})
    assert r.status_code == 400


def test_reset_password_full_flow(client, registered_user, monkeypatch):
    """E2E: request reset → extract token from DB → use token → login with new password."""
    import models
    import secrets
    from datetime import datetime, timedelta, timezone
    from tests.conftest import TestingSession

    email = registered_user["user"]["email"]
    user_id = registered_user["user"]["id"]

    # Simulate the token creation step directly (no SMTP needed)
    db = TestingSession()
    token_val = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
    reset_token = models.PasswordResetToken(user_id=user_id, token=token_val, expires_at=expires_at)
    db.add(reset_token)
    db.commit()
    db.close()

    # Reset password
    r = client.post("/api/auth/reset-password", json={"token": token_val, "new_password": "BrandNewPass99"})
    assert r.status_code == 200
    assert "updated" in r.json()["detail"].lower()

    # Login with new password
    login_r = client.post("/api/auth/login", json={"email": email, "password": "BrandNewPass99"})
    assert login_r.status_code == 200
    assert "token" in login_r.json()


def test_reset_password_token_used_twice(client, registered_user):
    """A token can only be used once."""
    import models
    import secrets
    from datetime import datetime, timedelta, timezone
    from tests.conftest import TestingSession

    user_id = registered_user["user"]["id"]
    db = TestingSession()
    token_val = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
    reset_token = models.PasswordResetToken(user_id=user_id, token=token_val, expires_at=expires_at)
    db.add(reset_token)
    db.commit()
    db.close()

    client.post("/api/auth/reset-password", json={"token": token_val, "new_password": "FirstReset99"})
    r2 = client.post("/api/auth/reset-password", json={"token": token_val, "new_password": "SecondReset99"})
    assert r2.status_code == 400
