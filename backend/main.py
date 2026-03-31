import logging
import os
import sentry_sdk
from contextlib import asynccontextmanager

import uvicorn
from fastapi import Depends, FastAPI
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

from middleware import verify_backend_secret, add_security_headers, log_requests
app.middleware("http")(verify_backend_secret)
app.middleware("http")(add_security_headers)
app.middleware("http")(log_requests)


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
