"""
Tests for DB-backed OTP service (services/otp_service.py) and
the /api/auth/send-verification + /api/auth/verify-email endpoints.
"""
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import models
from services.otp_service import clear_otp, generate_otp, get_otp_entry, store_otp


# ─── Unit: generate_otp ───────────────────────────────────────────────────────

def test_generate_otp_is_six_digits():
    otp = generate_otp()
    assert len(otp) == 6
    assert otp.isdigit()


def test_generate_otp_different_each_call():
    otps = {generate_otp() for _ in range(20)}
    # extremely unlikely to be all the same
    assert len(otps) > 1


# ─── Unit: store / get / clear ────────────────────────────────────────────────

def test_store_otp_creates_record(registered_user, client):
    """store_otp inserts a row; get_otp_entry retrieves it."""
    from tests.conftest import TestingSession
    db = TestingSession()
    user_id = registered_user["user"]["id"]
    otp = "123456"

    store_otp(user_id, otp, db)
    entry = get_otp_entry(user_id, db)

    assert entry is not None
    assert entry["otp"] == otp
    db.close()


def test_store_otp_replaces_existing(registered_user):
    """Calling store_otp twice replaces the previous record (no duplicates)."""
    from tests.conftest import TestingSession
    db = TestingSession()
    user_id = registered_user["user"]["id"]

    store_otp(user_id, "111111", db)
    store_otp(user_id, "999999", db)

    entry = get_otp_entry(user_id, db)
    assert entry["otp"] == "999999"

    # Only one active token
    count = db.query(models.OtpToken).filter(
        models.OtpToken.user_id == user_id,
        models.OtpToken.used == False,  # noqa: E712
    ).count()
    assert count == 1
    db.close()


def test_clear_otp_marks_used(registered_user):
    from tests.conftest import TestingSession
    db = TestingSession()
    user_id = registered_user["user"]["id"]

    store_otp(user_id, "654321", db)
    clear_otp(user_id, db)

    entry = get_otp_entry(user_id, db)
    assert entry is None
    db.close()


def test_get_otp_entry_returns_none_when_missing(registered_user):
    from tests.conftest import TestingSession
    db = TestingSession()
    user_id = registered_user["user"]["id"]

    clear_otp(user_id, db)  # ensure nothing exists
    entry = get_otp_entry(user_id, db)
    assert entry is None
    db.close()


def test_get_otp_entry_returns_none_when_expired(registered_user):
    from tests.conftest import TestingSession
    db = TestingSession()
    user_id = registered_user["user"]["id"]

    # Insert an already-expired token directly
    expired_token = models.OtpToken(
        user_id=user_id,
        otp_hash="000000",
        expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
    )
    db.add(expired_token)
    db.commit()

    entry = get_otp_entry(user_id, db)
    assert entry is None
    db.close()


# ─── Integration: /api/auth/send-verification + /api/auth/verify-email ────────

def test_send_verification_unauthenticated(client):
    r = client.post("/api/auth/send-verification")
    assert r.status_code == 401


def test_send_verification_already_verified(client, registered_user, auth_headers):
    """If email_verified is already True, endpoint returns 400."""
    from tests.conftest import TestingSession
    db = TestingSession()
    user = db.query(models.User).filter(models.User.id == registered_user["user"]["id"]).first()
    user.email_verified = True
    db.commit()
    db.close()

    r = client.post("/api/auth/send-verification", headers=auth_headers)
    assert r.status_code == 400
    assert "already verified" in r.json()["detail"].lower()

    # Reset for other tests
    db = TestingSession()
    user = db.query(models.User).filter(models.User.id == registered_user["user"]["id"]).first()
    user.email_verified = False
    db.commit()
    db.close()


def test_send_verification_dev_mode_returns_otp(client, registered_user, auth_headers, monkeypatch):
    """In dev mode with no SMTP, the OTP is returned in dev_otp."""
    monkeypatch.setenv("ENV", "development")
    with patch("routers.auth_router.smtp_is_configured", return_value=False):
        r = client.post("/api/auth/send-verification", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "dev_otp" in data
    assert len(data["dev_otp"]) == 6


def test_verify_email_correct_otp(client, registered_user, auth_headers, monkeypatch):
    monkeypatch.setenv("ENV", "development")
    # Step 1: send verification to get OTP
    with patch("routers.auth_router.smtp_is_configured", return_value=False):
        send_r = client.post("/api/auth/send-verification", headers=auth_headers)
    assert send_r.status_code == 200
    otp = send_r.json()["dev_otp"]

    # Step 2: verify with correct OTP
    verify_r = client.post("/api/auth/verify-email", json={"otp": otp}, headers=auth_headers)
    assert verify_r.status_code == 200
    assert verify_r.json()["email_verified"] is True


def test_verify_email_wrong_otp(client, registered_user, auth_headers, monkeypatch):
    monkeypatch.setenv("ENV", "development")
    with patch("routers.auth_router.smtp_is_configured", return_value=False):
        client.post("/api/auth/send-verification", headers=auth_headers)

    r = client.post("/api/auth/verify-email", json={"otp": "000000"}, headers=auth_headers)
    assert r.status_code == 400
    assert "incorrect" in r.json()["detail"].lower()


def test_verify_email_no_otp_sent(client, registered_user, auth_headers):
    r = client.post("/api/auth/verify-email", json={"otp": "123456"}, headers=auth_headers)
    assert r.status_code == 400


def test_verify_email_already_verified(client, registered_user, auth_headers):
    from tests.conftest import TestingSession
    db = TestingSession()
    user = db.query(models.User).filter(models.User.id == registered_user["user"]["id"]).first()
    user.email_verified = True
    db.commit()
    db.close()

    r = client.post("/api/auth/verify-email", json={"otp": "123456"}, headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["email_verified"] is True

    # Reset
    db = TestingSession()
    user = db.query(models.User).filter(models.User.id == registered_user["user"]["id"]).first()
    user.email_verified = False
    db.commit()
    db.close()
