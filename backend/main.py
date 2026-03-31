import hmac
import logging
import os
import sentry_sdk
from contextlib import asynccontextmanager
import time as _time

import uvicorn
from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text
from sqlalchemy.orm import Session
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

from database import engine, get_db
import models
from rate_limiter import _rate_limit_exceeded_handler, limiter
from ats_scorer import _get_nlp
from routers.ai_router import router as ai_router
from routers.auth_router import router as auth_router
from routers.export_router import router as export_router
from routers.payment_router import router as payment_router
from routers.resume_router import router as resume_router

# ─── Logging ──────────────────────────────────────────────────────────────────

from logger import setup_logging, get_logger
setup_logging()
logger = get_logger(__name__)

# ─── Sentry ───────────────────────────────────────────────────────────────────

_SENTRY_DSN = os.getenv("SENTRY_DSN", "")
if _SENTRY_DSN:
    sentry_sdk.init(
        dsn=_SENTRY_DSN,
        integrations=[FastApiIntegration(), SqlalchemyIntegration()],
        traces_sample_rate=0.1,
        send_default_pii=False,
    )
    logger.info("Sentry initialized.")
else:
    logger.warning("SENTRY_DSN not set — error monitoring disabled.")

# ─── Lifespan (startup tasks) ─────────────────────────────────────────────────

_AVATARS_DIR = os.getenv("AVATARS_DIR", "./data/avatars")

@asynccontextmanager
async def lifespan(_app: FastAPI):
    models.Base.metadata.create_all(bind=engine)
    os.makedirs(_AVATARS_DIR, exist_ok=True)
    _get_nlp()  # warm up spaCy model so first ATS request isn't slow
    logger.info("spaCy model loaded. API ready.")
    yield

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")

app = FastAPI(title="AI Resume Builder API", version="3.0.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN, "http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# ─── Backend Secret Guard ─────────────────────────────────────────────────────
# Requests must carry X-Backend-Secret matching the BACKEND_SECRET env var.
# This is set only by the Vercel serverless proxy — direct hits to the Oracle
# IP without the secret are rejected with 403.
# If BACKEND_SECRET is not set (local dev), the check is skipped entirely.

_BACKEND_SECRET  = os.getenv("BACKEND_SECRET", "")
_EXEMPT_PATHS    = {"/", "/health"}
_EXEMPT_PREFIXES = ("/api/avatars/",)  # avatar images loaded by browser <img> tags

@app.middleware("http")
async def verify_backend_secret(request: Request, call_next):
    if _BACKEND_SECRET:
        path = request.url.path
        exempt = path in _EXEMPT_PATHS or any(path.startswith(p) for p in _EXEMPT_PREFIXES)
        if not exempt:
            incoming = request.headers.get("X-Backend-Secret", "")
            if not hmac.compare_digest(incoming, _BACKEND_SECRET):
                from fastapi.responses import JSONResponse
                return JSONResponse({"detail": "Forbidden"}, status_code=403)
    return await call_next(request)


# ─── Security Headers ─────────────────────────────────────────────────────────

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if request.url.scheme == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# ─── Request / Response Logging ───────────────────────────────────────────────

@app.middleware("http")
async def _log_requests(request: Request, call_next):
    """Log every HTTP request with method, path, status, and duration."""
    t0 = _time.perf_counter()
    path = request.url.path
    method = request.method

    logger.debug(
        "→ %s %s",
        method, path,
        extra={
            "event": "request_start",
            "method": method,
            "path": path,
            "query": str(request.query_params) or None,
            "content_type": request.headers.get("content-type"),
            "user_agent": request.headers.get("user-agent", "")[:80],
        },
    )

    response = await call_next(request)

    duration_ms = round((_time.perf_counter() - t0) * 1000)
    status = response.status_code

    log_level = (
        logging.ERROR if status >= 500
        else logging.WARNING if status >= 400
        else logging.INFO
    )
    logger.log(
        log_level,
        "← %s %s %d (%dms)",
        method, path, status, duration_ms,
        extra={
            "event": "request_end",
            "method": method,
            "path": path,
            "status": status,
            "duration_ms": duration_ms,
        },
    )
    return response


# ─── Health ──────────────────────────────────────────────────────────────────

@app.get("/")
def read_root():
    return {"message": "AI Resume Builder API v3 is running.", "status": "ok"}


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    """Liveness + readiness probe. Checks DB connectivity."""
    try:
        db.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception as e:
        logger.error("DB health check failed: %s", e)
        db_status = "error"
    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "db": db_status,
        "version": "3.0.0",
    }

app.include_router(auth_router)
app.include_router(resume_router)
app.include_router(ai_router)
app.include_router(export_router)
app.include_router(payment_router)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
