from pydantic import BaseModel


class CreateOrderRequest(BaseModel):
    plan: str
    return_url: str = "http://localhost:3000/payment/success"
