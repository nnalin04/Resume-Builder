"""
Shared pytest fixtures — in-memory SQLite DB, test client, sample user.
"""
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base, get_db
from main import app, limiter

TEST_DB_URL = "sqlite:///./test_resume.db"

engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSession = sessionmaker(bind=engine)


def override_get_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Clear slowapi's in-memory storage between tests so limits don't bleed."""
    limiter.reset()
    yield


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def registered_user(client):
    # Use a unique email per test invocation to avoid 409 Conflict
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    resp = client.post("/api/auth/register", json={
        "email": email,
        "password": "testpassword123",
        "name": "Test User",
    })
    assert resp.status_code == 200, resp.json()
    return resp.json()


@pytest.fixture
def auth_headers(registered_user):
    return {"Authorization": f"Bearer {registered_user['token']}"}
