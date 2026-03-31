"""
ROVA Scrape API — trigger and test real data fetching
"""
from fastapi import APIRouter, HTTPException, Query
import asyncio
from app.services.lottery_scraper import fetch_single_game, fetch_all_games

router = APIRouter()


@router.get("/test/{game_id}")
async def test_scraper(game_id: str):
    """
    Test the real scraper against official lottery websites.
    Returns live results from powerball.com or megamillions.com.
    """
    if game_id not in ("powerball", "mega-millions"):
        raise HTTPException(status_code=400, detail="game_id must be 'powerball' or 'mega-millions'")

    results = await fetch_single_game(game_id, limit=5)

    if not results:
        return {
            "status": "failed",
            "message": "Could not fetch data from official source. Site may be unavailable.",
            "game_id": game_id,
        }

    return {
        "status": "success",
        "game_id": game_id,
        "draws_fetched": len(results),
        "source_url": results[0].get("source_url") if results else None,
        "source_type": results[0].get("source_type") if results else None,
        "latest_draw": results[0] if results else None,
        "all_draws": results,
    }


@router.get("/all")
async def scrape_all():
    """Fetch latest draws for all games simultaneously."""
    results = await fetch_all_games(limit=10)
    return {
        "status":  "success",
        "results": {
            game: {
                "count":       len(draws),
                "latest":      draws[0] if draws else None,
                "source_type": draws[0].get("source_type") if draws else None,
            }
            for game, draws in results.items()
        }
    }
