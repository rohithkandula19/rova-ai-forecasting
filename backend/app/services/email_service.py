"""
ROVA Email Service
==================
Sends draw result notifications via SendGrid.
Free tier: 100 emails/day — plenty for a lottery app.

Setup after GCP deploy:
1. Create free account at sendgrid.com
2. Create API key (Settings → API Keys)
3. Add to GCP Secret Manager:
   echo -n "SG.your-key-here" | gcloud secrets create rova-sendgrid-key --data-file=-
4. Add to Cloud Run env vars:
   SENDGRID_API_KEY=SG.your-key-here
   EMAIL_FROM=noreply@yourdomain.com
"""

import httpx
import os
import json
from datetime import datetime
from typing import Optional
import structlog

log = structlog.get_logger()

SENDGRID_API = "https://api.sendgrid.com/v3/mail/send"
FROM_EMAIL   = os.environ.get("EMAIL_FROM", "noreply@rova-forecasting.com")
FROM_NAME    = "ROVA AI Forecasting"
APP_URL      = os.environ.get("APP_URL", "https://rova-ai-forecasting.vercel.app")


def _sendgrid_key() -> Optional[str]:
    return os.environ.get("SENDGRID_API_KEY")


async def send_draw_result_email(
    to_email:    str,
    to_name:     str,
    game_name:   str,
    draw_date:   str,
    numbers:     list[int],
    bonus:       int,
    bonus_name:  str,
    jackpot:     int,
    jackpot_won: bool,
    winner_city: Optional[str] = None,
    user_numbers: Optional[list[int]] = None,  # user's saved numbers for match check
) -> bool:
    """Send draw result email to a subscriber."""
    key = _sendgrid_key()
    if not key:
        log.warning("email.no_api_key")
        return False

    # Check if user matched any numbers
    matched = []
    if user_numbers:
        matched = [n for n in user_numbers if n in numbers]

    # Build HTML email
    numbers_html = "".join(
        f'<span style="display:inline-flex;align-items:center;justify-content:center;'
        f'width:40px;height:40px;border-radius:50%;background:'
        f'{"#00ff9d" if n in matched else "#1a2a1a"};color:'
        f'{"#000" if n in matched else "#00ff9d"};'
        f'font-weight:700;font-size:14px;margin:3px;font-family:monospace;">{n}</span>'
        for n in numbers
    )
    bonus_html = (
        f'<span style="display:inline-flex;align-items:center;justify-content:center;'
        f'width:40px;height:40px;border-radius:50%;background:#00b8ff;color:#000;'
        f'font-weight:700;font-size:14px;margin:3px;font-family:monospace;">{bonus}</span>'
    )

    jackpot_fmt = (
        f"${jackpot/1_000_000_000:.2f}B" if jackpot >= 1_000_000_000
        else f"${jackpot/1_000_000:.0f}M" if jackpot >= 1_000_000
        else f"${jackpot:,}"
    )

    match_section = ""
    if user_numbers and matched:
        match_section = f"""
        <div style="background:#0a2a0a;border:1px solid #00ff9d;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="color:#00ff9d;font-weight:700;margin:0 0 8px;">
                🎉 You matched {len(matched)} number{'s' if len(matched)>1 else ''}!
            </p>
            <p style="color:#a0c8b0;margin:0;font-size:13px;">
                Matched: {', '.join(map(str, matched))}
            </p>
        </div>"""
    elif user_numbers:
        match_section = """
        <div style="background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="color:#4a7a5a;margin:0;font-size:13px;">No matches this draw. Better luck next time!</p>
        </div>"""

    winner_section = ""
    if jackpot_won:
        location = f" — {winner_city}" if winner_city and winner_city != "Undisclosed" else ""
        winner_section = f"""
        <div style="background:#1a1200;border:1px solid #ffb830;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="color:#ffb830;font-weight:700;margin:0;">
                ★ JACKPOT WON{location}! The {jackpot_fmt} jackpot has a winner!
            </p>
        </div>"""

    html_body = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#020609;font-family:monospace,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 16px;">

  <!-- Header -->
  <div style="text-align:center;margin-bottom:32px;">
    <h1 style="color:#00ff9d;font-size:28px;letter-spacing:8px;margin:0;">ROVA</h1>
    <p style="color:#4a7a5a;font-size:11px;margin:4px 0 0;letter-spacing:2px;">AI FORECASTING</p>
  </div>

  <!-- Draw result card -->
  <div style="background:#060d10;border:1px solid rgba(0,255,157,0.1);border-radius:12px;padding:24px;margin-bottom:16px;">
    <p style="color:#4a7a5a;font-size:10px;letter-spacing:2px;margin:0 0 4px;">DRAW RESULT</p>
    <h2 style="color:#e0ffe8;font-size:18px;margin:0 0 4px;">{game_name}</h2>
    <p style="color:#4a7a5a;font-size:12px;margin:0 0 20px;">{draw_date}</p>

    <!-- Numbers -->
    <div style="margin-bottom:16px;">
      <p style="color:#4a7a5a;font-size:10px;letter-spacing:1px;margin:0 0 8px;">WINNING NUMBERS</p>
      <div>{numbers_html} <span style="color:#4a7a5a;margin:0 4px;">+</span> {bonus_html}</div>
      <p style="color:#4a7a5a;font-size:10px;margin:8px 0 0;">{bonus_name}: {bonus}</p>
    </div>

    <!-- Jackpot -->
    <div style="display:flex;justify-content:space-between;padding:12px 0;border-top:1px solid rgba(0,255,157,0.08);">
      <span style="color:#4a7a5a;font-size:12px;">Jackpot</span>
      <span style="color:#ffb830;font-weight:700;font-size:14px;">{jackpot_fmt}</span>
    </div>
  </div>

  {winner_section}
  {match_section}

  <!-- CTA -->
  <div style="text-align:center;margin:24px 0;">
    <a href="{APP_URL}/history"
       style="display:inline-block;background:#00ff9d;color:#000;padding:12px 32px;
              border-radius:8px;font-weight:700;font-size:13px;text-decoration:none;
              letter-spacing:1px;">
      VIEW FULL ANALYSIS →
    </a>
  </div>

  <!-- Footer -->
  <div style="text-align:center;padding-top:24px;border-top:1px solid rgba(0,255,157,0.08);">
    <p style="color:#1e3d2d;font-size:10px;margin:0;">
      ROVA AI Forecasting · Lottery statistics platform<br>
      ⚠️ Lottery draws are random. Statistical analysis has no predictive value.<br>
      <a href="{APP_URL}/profile" style="color:#1e3d2d;">Manage notifications</a>
    </p>
  </div>

</div>
</body>
</html>"""

    subject = (
        f"★ JACKPOT WON — {game_name} {draw_date}"
        if jackpot_won
        else f"🎲 {game_name} Results — {draw_date}"
        + (f" — You matched {len(matched)}!" if matched else "")
    )

    payload = {
        "personalizations": [{"to": [{"email": to_email, "name": to_name}]}],
        "from":    {"email": FROM_EMAIL, "name": FROM_NAME},
        "subject": subject,
        "content": [{"type": "text/html", "value": html_body}],
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                SENDGRID_API,
                headers={
                    "Authorization": f"Bearer {key}",
                    "Content-Type":  "application/json",
                },
                content=json.dumps(payload),
            )
            if resp.status_code in (200, 202):
                log.info("email.sent", to=to_email, game=game_name)
                return True
            else:
                log.error("email.failed", status=resp.status_code, body=resp.text[:200])
                return False
    except Exception as e:
        log.error("email.exception", error=str(e))
        return False


async def send_jackpot_alert_email(
    to_email: str,
    to_name:  str,
    game_name: str,
    jackpot:   int,
    threshold: int = 500_000_000,
) -> bool:
    """Send alert when jackpot crosses a milestone ($100M, $500M, $1B)."""
    key = _sendgrid_key()
    if not key:
        return False

    jackpot_fmt = (
        f"${jackpot/1_000_000_000:.2f}B" if jackpot >= 1_000_000_000
        else f"${jackpot/1_000_000:.0f}M"
    )
    threshold_fmt = (
        f"${threshold/1_000_000_000:.0f}B" if threshold >= 1_000_000_000
        else f"${threshold/1_000_000:.0f}M"
    )

    html_body = f"""
<body style="background:#020609;font-family:monospace;padding:32px;">
<div style="max-width:480px;margin:0 auto;text-align:center;">
  <h1 style="color:#00ff9d;letter-spacing:8px;">ROVA</h1>
  <div style="background:#1a1200;border:2px solid #ffb830;border-radius:12px;padding:32px;margin:24px 0;">
    <p style="color:#ffb830;font-size:32px;font-weight:700;margin:0;">{jackpot_fmt}</p>
    <p style="color:#a0c8b0;margin:8px 0;">{game_name} jackpot just crossed {threshold_fmt}</p>
    <p style="color:#4a7a5a;font-size:12px;">Odds of winning: 1 in 292,201,338</p>
  </div>
  <a href="{APP_URL}" style="background:#00ff9d;color:#000;padding:12px 32px;border-radius:8px;font-weight:700;text-decoration:none;">
    VIEW ANALYSIS →
  </a>
  <p style="color:#1e3d2d;font-size:10px;margin-top:24px;">
    ⚠️ Play responsibly. Lottery is random.<br>
    <a href="{APP_URL}/profile" style="color:#1e3d2d;">Unsubscribe</a>
  </p>
</div>
</body>"""

    payload = {
        "personalizations": [{"to": [{"email": to_email, "name": to_name}]}],
        "from":    {"email": FROM_EMAIL, "name": FROM_NAME},
        "subject": f"🔔 {game_name} jackpot hits {jackpot_fmt}!",
        "content": [{"type": "text/html", "value": html_body}],
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                SENDGRID_API,
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                content=json.dumps(payload),
            )
            return resp.status_code in (200, 202)
    except Exception:
        return False
