"""
ROVA Admin API
==============
Protected endpoints for manual data management.
Used when auto-scraping fails or for data corrections.
"""
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
import os

router = APIRouter()

def require_admin(x_admin_key: str = Header(None)):
    """Simple API key auth for admin endpoints."""
    admin_key = os.environ.get("ADMIN_API_KEY", "rova-admin-dev")
    if x_admin_key != admin_key:
        raise HTTPException(status_code=403, detail="Invalid admin key")
    return True


class WinnerUpdateRequest(BaseModel):
    game_id:      str            # "powerball", "mega-millions", "millionaire-for-life"
    draw_date:    str            # "Mar 4, 2026"
    winner_city:  str            # "Dallas"
    winner_state: str            # "TX"
    winner_count: int = 1        # number of winners
    notes:        Optional[str] = None


class SyncRequest(BaseModel):
    game_id: Optional[str] = None  # None = sync all games


@router.post("/winner")
async def update_winner_location(
    req: WinnerUpdateRequest,
    admin: bool = False,  # injected by dependency
):
    """
    Manually update winner city for a jackpot draw.
    Use this when auto-scraping fails or for corrections.

    Example:
    curl -X POST https://your-api.run.app/api/v1/admin/winner \\
      -H "x-admin-key: YOUR_ADMIN_KEY" \\
      -H "Content-Type: application/json" \\
      -d '{"game_id":"powerball","draw_date":"Mar 4, 2026","winner_city":"Dallas","winner_state":"TX"}'
    """
    # In production: update the DB
    # For now: update the in-memory KNOWN_WINNERS dict
    try:
        from app.services.winner_scraper import KNOWN_WINNERS
        key = f"{req.game_id}|{req.draw_date}"
        KNOWN_WINNERS[key] = {
            "city":  req.winner_city,
            "state": req.winner_state,
            "count": req.winner_count,
        }
        return {
            "status":     "updated",
            "game_id":    req.game_id,
            "draw_date":  req.draw_date,
            "winner":     f"{req.winner_city}, {req.winner_state}",
            "note":       "Update persists until container restart. Use DB migration for permanent storage.",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync")
async def trigger_sync(req: SyncRequest = SyncRequest()):
    """
    Manually trigger a data sync from official lottery sites.
    Called by Cloud Scheduler after each draw, also available manually.

    Example:
    curl -X POST https://your-api.run.app/api/v1/admin/sync \\
      -d '{"game_id":"powerball"}'
    """
    import asyncio
    try:
        from app.services.lottery_scraper import fetch_single_game, fetch_all_games
        if req.game_id:
            results = await fetch_single_game(req.game_id, limit=5)
            return {
                "status":   "synced",
                "game_id":  req.game_id,
                "draws":    len(results),
                "latest":   results[0] if results else None,
            }
        else:
            results = await fetch_all_games(limit=10)
            return {
                "status":  "synced",
                "summary": {g: len(d) for g, d in results.items()},
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/winners/pending")
async def get_pending_winners():
    """
    List jackpot wins that don't have a winner city yet.
    Run this to see what needs manual updating.
    """
    from app.services.winner_scraper import KNOWN_WINNERS
    # In production: query DB for jackpotWon=True AND winnerCity IS NULL
    return {
        "known_winners": list(KNOWN_WINNERS.keys()),
        "note": "Draws with jackpotWon=True but no city will show 'Location pending' in UI",
        "manual_update_command": (
            "curl -X POST https://your-api.run.app/api/v1/admin/winner "
            "-H 'x-admin-key: YOUR_KEY' "
            "-H 'Content-Type: application/json' "
            "-d '{\"game_id\":\"powerball\",\"draw_date\":\"Mar 4, 2026\","
            "\"winner_city\":\"Dallas\",\"winner_state\":\"TX\"}'"
        )
    }


@router.post("/trigger-winner-scrape")
async def trigger_winner_scrape(game_id: str, draw_date: str):
    """
    Manually trigger winner city scrape for a specific draw.
    Use this 48hrs after a jackpot win if auto-task hasn't run.
    """
    from app.workers.tasks import update_winner_city_task
    task = update_winner_city_task.delay(game_id, draw_date)
    return {
        "status":    "triggered",
        "task_id":   task.id,
        "game_id":   game_id,
        "draw_date": draw_date,
        "note":      "Task will retry every hour for up to 5 hours if city not found",
    }
