from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import httpx, os, json

router = APIRouter()

SYSTEM = """You are ROVA, a lottery statistics AI assistant.
RULES: Never claim to predict lottery outcomes (they are random).
Only discuss statistical patterns, frequency, historical data.
Be concise and helpful."""

STATS = {
    "powerball": {
        "hot": [32,39,23,11,42,18,61,26,14,20],
        "cold": [65,67,4,57,44,69,3],
        "recent": "Mar 28: 11,42,43,59,61 +PB25 ($167.9M) | Mar 25: 7,21,55,56,64 +PB26 ($147.6M)",
        "jackpot": "$180M current. $1.816B won Dec 24 2025 (record 46-draw streak). $250.8M won Mar 4 2026.",
        "gap": "Average ~30-40 draws between wins. Longest streak: 46 draws (Sep-Dec 2025). Odds: 1 in 292,201,338.",
        "info": "Pool: 1-69 | Powerball: 1-26 | Mon/Wed/Sat 11pm ET | $2/play",
    },
    "mega-millions": {
        "hot": [18,27,42,56,14,38,63,11,4,19],
        "cold": [61,70,3,48,22,68,37],
        "recent": "Mar 27: 13,27,28,41,62 +MB16 ($70M) | Mar 24: 4,13,52,53,69 +MB10 ($60M)",
        "jackpot": "$80M current. $533M won Mar 10 2026.",
        "gap": "Average ~20-35 draws between wins. Odds: 1 in 290,472,336.",
        "info": "Pool: 1-70 | Mega Ball: 1-24 | Tue/Fri 11pm ET | $5/play",
    },
    "millionaire-for-life": {
        "hot": [17,28,39,52,14,33,47,18,5,55],
        "cold": [58,3,45,22,51],
        "recent": "Mar 29: 11,17,18,43,53 +MB5 | Mar 28: 12,14,17,22,55 +MB4",
        "jackpot": "$1M/year for life (cash: $18M). Launched Feb 22 2026.",
        "gap": "Daily draws. Odds: 1 in 22,910,580.",
        "info": "Pool: 1-58 | Millionaire Ball: 1-5 | Daily 11:15pm ET | $5/play",
    },
}

def smart_reply(msg: str, game_id: Optional[str]) -> str:
    g = game_id or "powerball"
    s = STATS.get(g, STATS["powerball"])
    m = msg.lower()

    if any(w in m for w in ["hot","frequent","common","appear most","popular"]):
        return (f"**Hottest numbers** in recent {g.replace('-',' ').title()} draws:\n\n"
                f"🔥 {', '.join(map(str, s['hot'][:7]))}\n\n"
                f"These appear above average frequency. ⚠️ Each draw is independent — "
                f"past frequency has zero predictive value for future draws.")

    if any(w in m for w in ["cold","overdue","rare","least","not appear"]):
        return (f"**Coldest numbers** (below-average frequency):\n\n"
                f"❄️ {', '.join(map(str, s['cold'][:5]))}\n\n"
                f"These appear less often historically. The 'gambler's fallacy' suggests "
                f"they're 'due' — but that's mathematically false. Each draw is independent.")

    if any(w in m for w in ["jackpot","biggest","record","largest","won","prize"]):
        return f"**Jackpot history — {g.replace('-',' ').title()}:**\n\n{s['jackpot']}"

    if any(w in m for w in ["gap","average","how often","how long","frequency of win","streak"]):
        return f"**Win frequency — {g.replace('-',' ').title()}:**\n\n{s['gap']}"

    if any(w in m for w in ["recent","latest","last draw","result","last result"]):
        return f"**Recent {g.replace('-',' ').title()} draws:**\n\n{s['recent']}"

    if any(w in m for w in ["how to play","how does","rules","explain","info","about"]):
        return f"**{g.replace('-',' ').title()} at a glance:**\n\n{s['info']}\n\n9 prize tiers. Overall odds ~1 in 24."

    if any(w in m for w in ["odds","probability","chance","likely"]):
        return (f"**{g.replace('-',' ').title()} jackpot odds: {s['gap'].split('Odds: ')[-1].split('.')[0]}**\n\n"
                f"To put that in perspective: you're ~300x more likely to be struck by lightning (1 in 1M) "
                f"than to win the jackpot. Smaller prizes have much better odds — match 3 balls: ~1 in 580.")

    return (f"I can help with **{g.replace('-',' ').title()}** stats! Ask me about:\n\n"
            f"• 🔥 Hot/cold numbers · 📈 Jackpot history · ⏱ Win frequency\n"
            f"• 🎯 Recent draws · 📊 Odds & probability · 📖 How to play\n\n"
            f"⚠️ I can't predict future draws — lotteries are cryptographically random.")

class ChatIn(BaseModel):
    message: str
    game_id: Optional[str] = None
    conversation_history: Optional[list] = []

class ChatOut(BaseModel):
    reply: str
    disclaimer: Optional[str] = None
    source: str = "builtin"

@router.post("", response_model=ChatOut)
async def chat(req: ChatIn):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    api_key = os.environ.get("ANTHROPIC_API_KEY","")
    source  = "builtin"
    reply   = ""

    if api_key and len(api_key) > 10:
        ctx  = json.dumps(STATS.get(req.game_id or "powerball",{}))
        msgs = [{"role":h.get("role","user"),"content":h.get("content","")}
                for h in (req.conversation_history or [])[-6:]
                if h.get("role") in ("user","assistant")]
        msgs.append({"role":"user","content":f"Stats: {ctx}\n\nQuestion: {req.message}"})
        try:
            async with httpx.AsyncClient(timeout=25) as c:
                r = await c.post("https://api.anthropic.com/v1/messages",
                    headers={"Content-Type":"application/json",
                             "x-api-key":api_key,
                             "anthropic-version":"2023-06-01"},
                    json={"model":"claude-sonnet-4-20250514","max_tokens":700,
                          "system":SYSTEM,"messages":msgs})
                data = r.json()
                for block in data.get("content",[]):
                    if block.get("type") == "text":
                        reply += block["text"]
                if reply:
                    source = "claude"
        except Exception:
            pass

    if not reply:
        reply  = smart_reply(req.message, req.game_id)
        source = "builtin"

    disclaimer = None
    if any(w in req.message.lower() for w in ["predict","will win","next draw","lucky","going to"]):
        disclaimer = "⚠️ Lottery draws are cryptographically random. No model can predict outcomes."

    return ChatOut(reply=reply, disclaimer=disclaimer, source=source)
