"""Tests for /api/auth/* endpoints."""


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_register_success(client):
    r = client.post("/api/auth/register", json={
        "email": "newuser@example.com",
        "password": "strongpass99",
        "name": "New User",
    })
    assert r.status_code == 200
    data = r.json()
    assert "token" in data
    assert data["user"]["email"] == "newuser@example.com"


def test_register_duplicate_email(client, registered_user):
    # Attempt to re-register with the same email the fixture already created
    email = registered_user["user"]["email"]
    r = client.post("/api/auth/register", json={
        "email": email,
        "password": "anotherpass99",
    })
    assert r.status_code == 409


def test_register_short_password(client):
    r = client.post("/api/auth/register", json={
        "email": "short@example.com",
        "password": "abc",
    })
    assert r.status_code == 422


def test_login_success(client, registered_user):
    email = registered_user["user"]["email"]
    r = client.post("/api/auth/login", json={
        "email": email,
        "password": "testpassword123",
    })
    assert r.status_code == 200
    assert "token" in r.json()


def test_login_wrong_password(client, registered_user):
    email = registered_user["user"]["email"]
    r = client.post("/api/auth/login", json={
        "email": email,
        "password": "wrongpassword",
    })
    assert r.status_code == 401


def test_get_me(client, registered_user, auth_headers):
    r = client.get("/api/auth/me", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["email"] == registered_user["user"]["email"]


def test_get_me_unauthenticated(client):
    r = client.get("/api/auth/me")
    assert r.status_code == 401
