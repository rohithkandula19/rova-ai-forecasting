from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

# US Lottery games config — defined here, not imported from scraper
US_LOTTERY_GAMES = [
    {
        "id":           "mega-millions",
        "name":         "Mega Millions",
        "pool":         70,
        "bonusPool":    24,
        "bonusName":    "Mega Ball",
        "drawDays":     "Tuesday & Friday",
        "drawTime":     "11:00 PM ET",
        "ticketPrice":  5.00,
        "officialUrl":  "https://www.megamillions.com",
        "description":  "Pick 5 from 1-70 + Mega Ball 1-24. Jackpot starts at $20M.",
    },
    {
        "id":           "powerball",
        "name":         "Powerball",
        "pool":         69,
        "bonusPool":    26,
        "bonusName":    "Powerball",
        "drawDays":     "Mon, Wed & Sat",
        "drawTime":     "10:59 PM ET",
        "ticketPrice":  2.00,
        "officialUrl":  "https://www.powerball.com",
        "description":  "Pick 5 from 1-69 + Powerball 1-26. Jackpot starts at $20M.",
    },
    {
        "id":           "millionaire-for-life",
        "name":         "Millionaire for Life",
        "pool":         58,
        "bonusPool":    5,
        "bonusName":    "Millionaire Ball",
        "drawDays":     "Daily",
        "drawTime":     "11:15 PM ET",
        "ticketPrice":  5.00,
        "officialUrl":  "https://www.nclottery.com",
        "description":  "Pick 5 from 1-58 + MB 1-5. Top prize: $1M/year for life.",
    },
]

@router.get("/")
async def list_games():
    return {"games": US_LOTTERY_GAMES}

@router.get("/{game_id}")
async def get_game(game_id: str):
    game = next((g for g in US_LOTTERY_GAMES if g["id"] == game_id), None)
    if not game:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Game '{game_id}' not found")
    return game
