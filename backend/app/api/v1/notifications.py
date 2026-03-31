"""
ROVA Notification API
Handles email subscriptions and push notification subscriptions.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional
import os

router = APIRouter()

# In-memory store for demo — replace with DB in production
_email_subs: dict[str, dict] = {}
_push_subs:  list[dict] = []


class EmailSubRequest(BaseModel):
    email:       EmailStr
    name:        str = "Player"
    games:       list[str] = ["powerball", "mega-millions", "millionaire-for-life"]
    alert_wins:  bool = True   # notify on jackpot win
    alert_big:   bool = True   # notify when jackpot > $500M
    alert_results: bool = True # notify after every draw


class PushSubRequest(BaseModel):
    endpoint:  str
    keys:      dict  # {p256dh, auth}
    games:     list[str] = ["powerball", "mega-millions"]


class TestEmailRequest(BaseModel):
    email: EmailStr
    name:  str = "Player"


@router.post("/email/subscribe")
async def subscribe_email(req: EmailSubRequest):
    """Subscribe email for draw notifications."""
    _email_subs[req.email] = {
        "email":          req.email,
        "name":           req.name,
        "games":          req.games,
        "alert_wins":     req.alert_wins,
        "alert_big":      req.alert_big,
        "alert_results":  req.alert_results,
        "active":         True,
    }
    return {
        "status":  "subscribed",
        "email":   req.email,
        "message": "You'll receive notifications after each draw.",
    }


@router.delete("/email/unsubscribe/{email}")
async def unsubscribe_email(email: str):
    if email in _email_subs:
        _email_subs[email]["active"] = False
    return {"status": "unsubscribed", "email": email}


@router.post("/email/test")
async def send_test_email(req: TestEmailRequest):
    """Send a test draw result email — useful for verifying SendGrid setup."""
    from app.services.email_service import send_draw_result_email
    ok = await send_draw_result_email(
        to_email    = req.email,
        to_name     = req.name,
        game_name   = "Powerball",
        draw_date   = "Mar 28, 2026",
        numbers     = [11, 42, 43, 59, 61],
        bonus       = 25,
        bonus_name  = "Powerball",
        jackpot     = 167_900_000,
        jackpot_won = False,
        user_numbers= [11, 42, 15, 27, 33],  # simulate 2 matches
    )
    if ok:
        return {"status": "sent", "email": req.email}
    raise HTTPException(status_code=500, detail="Email send failed — check SENDGRID_API_KEY")


@router.post("/push/subscribe")
async def subscribe_push(req: PushSubRequest):
    """Store browser push subscription."""
    _push_subs.append({
        "endpoint": req.endpoint,
        "keys":     req.keys,
        "games":    req.games,
    })
    return {"status": "subscribed", "games": req.games}


@router.get("/subscribers/count")
async def subscriber_count():
    return {
        "email_subscribers": len([s for s in _email_subs.values() if s.get("active")]),
        "push_subscribers":  len(_push_subs),
        "note": "Production: store in PostgreSQL, not memory",
    }
