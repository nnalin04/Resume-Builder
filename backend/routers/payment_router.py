import json
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from schemas.payment_schemas import CreateOrderRequest
from sqlalchemy.orm import Session

import models
from auth import get_current_user
from database import get_db
from payment import FREE_DOWNLOAD_LIMIT, create_payment_order, verify_cashfree_webhook, verify_payment_order
from services.freemium_service import _activate_plan


router = APIRouter()



@router.post("/api/payments/create-order")
async def create_order(
    body: CreateOrderRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = await create_payment_order(
        user_id=current_user.id,
        user_email=current_user.email,
        user_name=current_user.name,
        plan=body.plan,
        return_url=body.return_url,
    )

    payment = models.Payment(
        user_id=current_user.id,
        cashfree_order_id=result["order_id"],
        amount=result["amount"],
        currency=result["currency"],
        status="PENDING",
        type="SUBSCRIPTION" if body.plan in ("basic", "pro") else "ONE_TIME",
        plan=body.plan,
    )
    db.add(payment)
    db.commit()

    return result


@router.post("/api/payments/verify")
async def verify_payment(
    order_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = await verify_payment_order(order_id)

    payment = db.query(models.Payment).filter(
        models.Payment.cashfree_order_id == order_id,
        models.Payment.user_id == current_user.id,
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found.")

    if result["status"] == "PAID":
        payment.status = "SUCCESS"
        payment.payment_method = result.get("payment_method", "")
        _activate_plan(current_user, payment)
        db.commit()
        return {"status": "SUCCESS", "plan": payment.plan, "type": payment.type}

    if result["status"] in ("ACTIVE", "PENDING"):
        return {"status": "PENDING"}

    payment.status = "FAILED"
    db.commit()
    return {"status": "FAILED"}


@router.post("/api/payments/webhook")
async def cashfree_webhook(
    request: Request,
    x_webhook_signature: Optional[str] = Header(None),
    x_webhook_timestamp: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    body_bytes = await request.body()
    payload_str = body_bytes.decode("utf-8")

    if not x_webhook_signature or not x_webhook_timestamp:
        raise HTTPException(status_code=400, detail="Missing webhook signature headers.")
    if not verify_cashfree_webhook(payload_str, x_webhook_signature, x_webhook_timestamp):
        raise HTTPException(status_code=400, detail="Invalid webhook signature.")

    event = json.loads(payload_str)
    event_type = event.get("type", "")
    order_id = event.get("data", {}).get("order", {}).get("order_id", "")

    if not order_id:
        return {"status": "ignored"}

    payment = db.query(models.Payment).filter(models.Payment.cashfree_order_id == order_id).first()
    if not payment:
        return {"status": "ignored"}

    if event_type == "PAYMENT_SUCCESS_WEBHOOK":
        payment.status = "SUCCESS"
        user = db.query(models.User).filter(models.User.id == payment.user_id).first()
        if user:
            _activate_plan(user, payment)
        db.commit()
    elif event_type in ("PAYMENT_FAILED_WEBHOOK", "PAYMENT_USER_DROPPED_WEBHOOK"):
        payment.status = "FAILED"
        db.commit()

    return {"status": "ok"}


@router.get("/api/payments/plans")
def get_plans():
    return {
        "plans": [
            {"id": "one_time", "label": "Top-Up", "amount": 199, "currency": "INR", "type": "ONE_TIME"},
            {"id": "starter", "label": "7-Day Access", "amount": 49, "currency": "INR", "type": "ONE_TIME"},
            {"id": "basic", "label": "Basic Monthly", "amount": 399, "currency": "INR", "type": "SUBSCRIPTION"},
            {"id": "lifetime", "label": "Lifetime Access", "amount": 999, "currency": "INR", "type": "ONE_TIME"},
            {"id": "pro", "label": "Pro Monthly", "amount": 649, "currency": "INR", "type": "SUBSCRIPTION"},
        ],
        "free_download_limit": FREE_DOWNLOAD_LIMIT,
    }
