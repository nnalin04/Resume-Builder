import logging
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

import models
from payment import FREE_DOWNLOAD_LIMIT


logger = logging.getLogger(__name__)


def _activate_plan(user: models.User, payment: models.Payment) -> None:
    """Apply the correct access grant based on the plan purchased."""
    plan = payment.plan
    if plan == "one_time":
        user.free_downloads_used = 0
    elif plan == "starter":
        user.subscription_status = "ACTIVE"
        user.subscription_plan = "starter"
        user.subscription_expiry = datetime.now(timezone.utc) + timedelta(days=7)
    elif plan == "lifetime":
        user.subscription_status = "ACTIVE"
        user.subscription_plan = "lifetime"
        user.subscription_expiry = None
    else:
        user.subscription_status = "ACTIVE"
        user.subscription_plan = plan
        user.subscription_expiry = datetime.now(timezone.utc) + timedelta(days=30)


def _is_free_tier(user: models.User) -> bool:
    if user.subscription_status == "ACTIVE":
        if user.subscription_expiry is None:
            return False  # lifetime plan — no expiry means unlimited access
        expiry = user.subscription_expiry
        if expiry.tzinfo is not None:
            expiry = expiry.replace(tzinfo=None)
        if expiry > datetime.utcnow():
            return False
    return True


def _apply_monthly_reset(user: models.User, db: Session) -> None:
    """Reset free download counter if we're in a new calendar month."""
    now = datetime.utcnow()
    reset_date = user.free_downloads_reset_date
    if reset_date is None or (now.year, now.month) != (reset_date.year, reset_date.month):
        user.free_downloads_used = 0
        user.free_downloads_reset_date = now
        db.commit()


def _check_download_access(user: models.User, db: Session = None) -> None:
    """Raises 402 Payment Required if user has exhausted free downloads and has no active subscription."""
    logger.debug(
        "_check_download_access: user=%d free_used=%d sub=%s",
        user.id, user.free_downloads_used or 0, user.subscription_status,
        extra={"event": "download_access_check", "user_id": user.id},
    )
    if not _is_free_tier(user):
        return
    if db is not None:
        _apply_monthly_reset(user, db)
    if (user.free_downloads_used or 0) < FREE_DOWNLOAD_LIMIT:
        return
    logger.warning(
        "Download blocked — limit reached: user=%d free_used=%d limit=%d",
        user.id, user.free_downloads_used or 0, FREE_DOWNLOAD_LIMIT,
        extra={"event": "download_blocked", "user_id": user.id, "reason": "limit_reached"},
    )
    raise HTTPException(
        status_code=402,
        detail={
            "code": "PAYMENT_REQUIRED",
            "message": f"You have used your {FREE_DOWNLOAD_LIMIT} free PDF downloads this month. Purchase a plan to continue.",
            "plans_url": "/api/payments/plans",
        },
    )
