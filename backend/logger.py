"""
Centralized logging configuration for AI Resume Builder.

Log hierarchy:
  api.main       — HTTP requests/responses, route handlers
  api.auth       — login, register, token validation
  api.ai         — Gemini calls, AI operations
  api.parser     — PDF text extraction, structured parsing
  api.ats        — ATS scoring operations
  api.export     — PDF/DOCX generation, download gating
  api.payments   — Cashfree order creation, verification, webhooks

Usage:
  from logger import get_logger
  log = get_logger(__name__)
  log.info("User logged in", extra={"user_id": 1, "email": "x@x.com"})
"""

import logging
import json
import os
from typing import Any


class _JsonFormatter(logging.Formatter):
    """Emit single-line JSON log records for easy docker logs | jq parsing."""

    _SKIP = frozenset({
        "name", "msg", "args", "levelname", "levelno", "pathname",
        "filename", "module", "exc_info", "exc_text", "stack_info",
        "lineno", "funcName", "created", "msecs", "relativeCreated",
        "thread", "threadName", "processName", "process", "message",
        "taskName",
    })

    def format(self, record: logging.LogRecord) -> str:
        entry: dict[str, Any] = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S"),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        for k, v in record.__dict__.items():
            if k not in self._SKIP:
                entry[k] = v
        if record.exc_info:
            entry["exc"] = self.formatException(record.exc_info)
        return json.dumps(entry, default=str)


def setup_logging() -> None:
    """
    Call once at application startup.
    Reads LOG_LEVEL env var (default: DEBUG).
    Quiets noisy third-party loggers.
    """
    level_name = os.getenv("LOG_LEVEL", "DEBUG").upper()
    level = getattr(logging, level_name, logging.DEBUG)

    handler = logging.StreamHandler()
    handler.setFormatter(_JsonFormatter())

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level)

    # Quiet noisy third-party loggers — keep them at WARNING+
    for name in (
        "uvicorn.access",
        "sqlalchemy.engine",
        "sqlalchemy.pool",
        "httpx",
        "httpcore",
        "slowapi",
        "alembic",
    ):
        logging.getLogger(name).setLevel(logging.WARNING)

    logging.getLogger("uvicorn.error").setLevel(logging.INFO)


def get_logger(name: str) -> logging.Logger:
    """Return a named logger. Conventionally pass __name__."""
    return logging.getLogger(name)
