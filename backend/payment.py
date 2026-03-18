"""
Cashfree payment integration.
Docs: https://docs.cashfree.com/docs/payment-gateway
"""
import os
import hashlib
import hmac
import base64
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
from fastapi import HTTPException

# ─── Config ──────────────────────────────────────────────────────────────────

CASHFREE_APP_ID = os.getenv("CASHFREE_APP_ID", "")
CASHFREE_SECRET = os.getenv("CASHFREE_SECRET_KEY", "")
CASHFREE_ENV = os.getenv("CASHFREE_ENV", "sandbox")   # sandbox | production

BASE_URL = (
    "https://api.cashfree.com/pg"
    if CASHFREE_ENV == "production"
    else "https://sandbox.cashfree.com/pg"
)

# ─── Pricing ──────────────────────────────────────────────────────────────────

PLANS = {
    "one_time": {"amount": 199.0, "currency": "INR", "label": "Single Download"},
    "basic":    {"amount": 399.0, "currency": "INR", "label": "Basic Monthly"},
    "pro":      {"amount": 649.0, "currency": "INR", "label": "Pro Monthly"},
}

FREE_DOWNLOAD_LIMIT = 1

# ─── Helpers ──────────────────────────────────────────────────────────────────

def _headers() -> dict:
    return {
        "x-client-id": CASHFREE_APP_ID,
        "x-client-secret": CASHFREE_SECRET,
        "x-api-version": "2023-08-01",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

def _order_id() -> str:
    return f"order_{uuid.uuid4().hex[:16]}"

# ─── Create Order ─────────────────────────────────────────────────────────────

async def create_payment_order(
    user_id: int,
    user_email: str,
    user_name: str,
    plan: str,
    return_url: str,
) -> dict:
    """Creates a Cashfree payment order. Returns { order_id, payment_session_id, amount }."""
    if plan not in PLANS:
        raise HTTPException(status_code=400, detail=f"Unknown plan: {plan}")

    price = PLANS[plan]
    order_id = _order_id()

    payload = {
        "order_id": order_id,
        "order_amount": price["amount"],
        "order_currency": price["currency"],
        "order_note": f"AI Resume Builder — {price['label']}",
        "customer_details": {
            "customer_id": f"user_{user_id}",
            "customer_email": user_email,
            "customer_name": user_name or user_email.split("@")[0],
            "customer_phone": "9999999999",  # placeholder — collect at checkout if needed
        },
        "order_meta": {
            "return_url": f"{return_url}?order_id={order_id}",
            "notify_url": os.getenv("CASHFREE_WEBHOOK_URL", ""),
        },
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{BASE_URL}/orders", json=payload, headers=_headers())

    if resp.status_code not in (200, 201):
        import logging
        logging.getLogger(__name__).error("Cashfree order creation failed: %s", resp.text)
        raise HTTPException(status_code=502, detail="Payment service unavailable.")

    data = resp.json()
    return {
        "order_id": order_id,
        "payment_session_id": data.get("payment_session_id"),
        "amount": price["amount"],
        "currency": price["currency"],
        "cashfree_order_id": data.get("cf_order_id"),
    }

# ─── Verify Order ─────────────────────────────────────────────────────────────

async def verify_payment_order(order_id: str) -> dict:
    """Fetch order status from Cashfree."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{BASE_URL}/orders/{order_id}", headers=_headers())

    if resp.status_code != 200:
        import logging
        logging.getLogger(__name__).error("Cashfree order fetch failed: %s", resp.text)
        raise HTTPException(status_code=502, detail="Payment service unavailable.")

    data = resp.json()
    return {
        "order_id": order_id,
        "status": data.get("order_status"),  # ACTIVE | PAID | EXPIRED
        "amount": data.get("order_amount"),
        "payment_method": data.get("payment_method"),
    }

# ─── Webhook Verification ──────────────────────────────────────────────────────

def verify_cashfree_webhook(payload_str: str, received_signature: str, timestamp: str) -> bool:
    """Verify Cashfree webhook signature per their docs."""
    message = timestamp + payload_str
    computed = base64.b64encode(
        hmac.new(CASHFREE_SECRET.encode(), message.encode(), hashlib.sha256).digest()
    ).decode()
    return hmac.compare_digest(computed, received_signature)
