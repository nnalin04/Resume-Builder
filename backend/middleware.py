import hmac
import logging
import os
import time as _time

from fastapi import Request

from logger import get_logger

logger = get_logger(__name__)

_BACKEND_SECRET  = os.getenv("BACKEND_SECRET", "")
_EXEMPT_PATHS    = {"/", "/health"}
_EXEMPT_PREFIXES = ("/api/avatars/",)


async def verify_backend_secret(request: Request, call_next):
    """Reject requests missing the correct X-Backend-Secret header (production only)."""
    if _BACKEND_SECRET:
        path = request.url.path
        exempt = path in _EXEMPT_PATHS or any(path.startswith(p) for p in _EXEMPT_PREFIXES)
        if not exempt:
            incoming = request.headers.get("X-Backend-Secret", "")
            if not hmac.compare_digest(incoming, _BACKEND_SECRET):
                from fastapi.responses import JSONResponse
                return JSONResponse({"detail": "Forbidden"}, status_code=403)
    return await call_next(request)


async def add_security_headers(request: Request, call_next):
    """Add standard browser security headers to every response."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if request.url.scheme == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


async def log_requests(request: Request, call_next):
    """Log every HTTP request with method, path, status, and duration."""
    t0 = _time.perf_counter()
    path = request.url.path
    method = request.method

    logger.debug(
        "→ %s %s", method, path,
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
        "← %s %s %d (%dms)", method, path, status, duration_ms,
        extra={
            "event": "request_end",
            "method": method,
            "path": path,
            "status": status,
            "duration_ms": duration_ms,
        },
    )
    return response
