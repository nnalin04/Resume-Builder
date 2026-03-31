"""
Tests for freemium / export access control:
  services/freemium_service.py  — _is_free_tier, _check_download_access, _activate_plan
  POST /api/record-download     — endpoint that gates PDF export
  GET  /api/payments/plans      — public plans list
  GET  /api/export/{id}         — format=json (no gate), format=pdf (gated)
"""
import json
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import models
from payment import FREE_DOWNLOAD_LIMIT
from services.freemium_service import _activate_plan, _check_download_access, _is_free_tier


# ─── Unit: _is_free_tier ─────────────────────────────────────────────────────

def _make_user(**kwargs) -> SimpleNamespace:
    """Build a plain namespace that duck-types models.User for service unit tests."""
    return SimpleNamespace(
        subscription_status=kwargs.get("subscription_status", "INACTIVE"),
        subscription_expiry=kwargs.get("subscription_expiry", None),
        subscription_plan=kwargs.get("subscription_plan", None),
        free_downloads_used=kwargs.get("free_downloads_used", 0),
        free_downloads_reset_date=kwargs.get("free_downloads_reset_date", None),
        id=kwargs.get("id", 1),
    )


def test_free_tier_default():
    user = _make_user()
    assert _is_free_tier(user) is True


def test_active_subscription_not_expired():
    future = datetime.utcnow() + timedelta(days=30)
    user = _make_user(subscription_status="ACTIVE", subscription_expiry=future)
    assert _is_free_tier(user) is False


def test_active_subscription_expired():
    past = datetime.utcnow() - timedelta(days=1)
    user = _make_user(subscription_status="ACTIVE", subscription_expiry=past)
    assert _is_free_tier(user) is True


def test_lifetime_plan_no_expiry():
    user = _make_user(subscription_status="ACTIVE", subscription_expiry=None, subscription_plan="lifetime")
    assert _is_free_tier(user) is False


# ─── Unit: _check_download_access ────────────────────────────────────────────

def test_free_user_within_limit_passes():
    user = _make_user(free_downloads_used=0)
    # Should not raise
    _check_download_access(user)


def test_free_user_at_limit_raises_402():
    from fastapi import HTTPException
    import pytest
    user = _make_user(free_downloads_used=FREE_DOWNLOAD_LIMIT)
    with pytest.raises(HTTPException) as exc_info:
        _check_download_access(user)
    assert exc_info.value.status_code == 402
    assert exc_info.value.detail["code"] == "PAYMENT_REQUIRED"


def test_paid_user_ignores_download_count():
    future = datetime.utcnow() + timedelta(days=30)
    user = _make_user(
        subscription_status="ACTIVE",
        subscription_expiry=future,
        free_downloads_used=FREE_DOWNLOAD_LIMIT + 5,
    )
    _check_download_access(user)  # should not raise


# ─── Unit: _activate_plan ────────────────────────────────────────────────────

def test_activate_one_time_resets_downloads():
    user = _make_user(free_downloads_used=3)
    payment = SimpleNamespace()
    payment.plan = "one_time"
    _activate_plan(user, payment)
    assert user.free_downloads_used == 0


def test_activate_starter_sets_7_day_expiry():
    user = _make_user()
    payment = SimpleNamespace()
    payment.plan = "starter"
    _activate_plan(user, payment)
    assert user.subscription_status == "ACTIVE"
    assert user.subscription_plan == "starter"
    diff = user.subscription_expiry - datetime.now(timezone.utc)
    assert 6 <= diff.days <= 7


def test_activate_lifetime_no_expiry():
    user = _make_user()
    payment = SimpleNamespace()
    payment.plan = "lifetime"
    _activate_plan(user, payment)
    assert user.subscription_status == "ACTIVE"
    assert user.subscription_expiry is None


def test_activate_basic_30_day_expiry():
    user = _make_user()
    payment = SimpleNamespace()
    payment.plan = "basic"
    _activate_plan(user, payment)
    assert user.subscription_status == "ACTIVE"
    diff = user.subscription_expiry - datetime.now(timezone.utc)
    assert 29 <= diff.days <= 30


# ─── Integration: GET /api/payments/plans ────────────────────────────────────

def test_plans_endpoint_public(client):
    r = client.get("/api/payments/plans")
    assert r.status_code == 200
    data = r.json()
    assert "plans" in data
    assert "free_download_limit" in data
    plan_ids = [p["id"] for p in data["plans"]]
    assert "one_time" in plan_ids
    assert "lifetime" in plan_ids
    assert "basic" in plan_ids
    assert "pro" in plan_ids


# ─── Integration: POST /api/record-download ──────────────────────────────────

def test_record_download_unauthenticated(client):
    r = client.post("/api/record-download")
    assert r.status_code == 401


def test_record_download_within_limit(client, auth_headers):
    r = client.post("/api/record-download", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["ok"] is True
    assert data["free_downloads_used"] == 1


def test_record_download_exhausted_returns_402(client, registered_user, auth_headers):
    from datetime import datetime
    from tests.conftest import TestingSession
    db = TestingSession()
    user = db.query(models.User).filter(models.User.id == registered_user["user"]["id"]).first()
    user.free_downloads_used = FREE_DOWNLOAD_LIMIT
    # Set reset_date to this month so _apply_monthly_reset doesn't wipe our counter
    user.free_downloads_reset_date = datetime.utcnow()
    db.commit()
    db.close()

    r = client.post("/api/record-download", headers=auth_headers)
    assert r.status_code == 402
    assert r.json()["detail"]["code"] == "PAYMENT_REQUIRED"


# ─── Integration: GET /api/export/{id}?format=json ───────────────────────────

def _create_resume_with_sections(client, auth_headers) -> int:
    """Helper: upload a minimal PDF and inject parsed_sections directly via DB."""
    from tests.conftest import TestingSession
    import json

    db = TestingSession()
    user_id = None
    # Get user id from auth endpoint
    me_r = client.get("/api/auth/me", headers=auth_headers)
    user_id = me_r.json()["id"]

    sections = {
        "contact": {"name": "Test User", "email": "test@test.com"},
        "summary": "A great engineer.",
        "experience": [],
        "education": [],
        "skills": {"other": ["Python", "FastAPI"]},
        "projects": [],
        "certifications": [],
    }
    resume = models.Resume(
        user_id=user_id,
        filename="test_resume.pdf",
        original_text="Test resume text",
        parsed_sections=json.dumps(sections),
    )
    db.add(resume)
    db.commit()
    resume_id = resume.id
    db.close()
    return resume_id


def test_export_json_format(client, auth_headers):
    resume_id = _create_resume_with_sections(client, auth_headers)
    r = client.get(f"/api/export/{resume_id}?format=json", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "sections" in data
    assert "contact" in data["sections"]


def test_export_markdown_format(client, auth_headers):
    resume_id = _create_resume_with_sections(client, auth_headers)
    r = client.get(f"/api/export/{resume_id}?format=markdown", headers=auth_headers)
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/markdown")


def test_export_unsupported_format(client, auth_headers):
    resume_id = _create_resume_with_sections(client, auth_headers)
    r = client.get(f"/api/export/{resume_id}?format=csv", headers=auth_headers)
    assert r.status_code == 400


def test_export_not_found(client, auth_headers):
    r = client.get("/api/export/99999?format=json", headers=auth_headers)
    assert r.status_code == 404
