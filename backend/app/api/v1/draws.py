"""
ROVA Draws API
==============
Serves historical draw data. Falls back to hardcoded data if DB unavailable.
This allows the frontend to always show data even before DB is populated.
"""
from fastapi import APIRouter, Query
from typing import Optional
import json, os

router = APIRouter()

# ── Hardcoded seed data (fallback when DB empty) ─────────────
# This is the same data as realDraws.ts — kept in sync manually
SEED_DRAWS = {
  "powerball": [
    {"date":"Mar 30, 2026","numbers":[7,11,31,41,57],"bonus":20,"jackpot":180300000,"jackpotWon":False,"multiplier":"2x"},
    {"date":"Mar 28, 2026","numbers":[11,42,43,59,61],"bonus":25,"jackpot":167900000,"jackpotWon":False,"multiplier":"4x"},
    {"date":"Mar 25, 2026","numbers":[7,21,55,56,64],"bonus":26,"jackpot":147600000,"jackpotWon":False,"multiplier":"4x"},
    {"date":"Mar 23, 2026","numbers":[12,18,47,56,63],"bonus":1,"jackpot":88900000,"jackpotWon":False,"multiplier":"10x"},
    {"date":"Mar 21, 2026","numbers":[12,28,36,41,59],"bonus":2,"jackpot":77700000,"jackpotWon":False,"multiplier":"2x"},
    {"date":"Mar 18, 2026","numbers":[14,18,19,21,69],"bonus":1,"jackpot":65000000,"jackpotWon":False,"multiplier":"3x"},
    {"date":"Mar 16, 2026","numbers":[7,10,20,47,52],"bonus":20,"jackpot":52000000,"jackpotWon":False,"multiplier":"2x"},
    {"date":"Mar 14, 2026","numbers":[9,30,42,50,52],"bonus":21,"jackpot":41000000,"jackpotWon":False,"multiplier":"3x"},
    {"date":"Mar 11, 2026","numbers":[3,6,55,58,63],"bonus":12,"jackpot":31000000,"jackpotWon":False,"multiplier":"2x"},
    {"date":"Mar 9,  2026","numbers":[22,23,28,36,54],"bonus":13,"jackpot":23000000,"jackpotWon":False,"multiplier":"3x"},
    {"date":"Mar 7,  2026","numbers":[17,18,30,50,68],"bonus":24,"jackpot":20000000,"jackpotWon":False,"multiplier":"3x"},
    {"date":"Mar 4,  2026","numbers":[7,14,42,47,56],"bonus":6,"jackpot":250800000,"jackpotWon":True,"multiplier":"4x","winnerCity":"Undisclosed","winnerState":""},
    {"date":"Mar 2,  2026","numbers":[2,17,18,38,62],"bonus":20,"jackpot":237000000,"jackpotWon":False,"multiplier":"2x"},
    {"date":"Feb 28, 2026","numbers":[6,20,35,54,65],"bonus":10,"jackpot":224000000,"jackpotWon":False,"multiplier":"4x"},
    {"date":"Dec 24, 2025","numbers":[4,25,31,52,59],"bonus":19,"jackpot":1816800000,"jackpotWon":True,"multiplier":"2x","winnerCity":"Undisclosed","winnerState":"CA"},
  ],
  "mega-millions": [
    {"date":"Mar 27, 2026","numbers":[13,27,28,41,62],"bonus":16,"jackpot":70000000,"jackpotWon":False},
    {"date":"Mar 24, 2026","numbers":[4,13,52,53,69],"bonus":10,"jackpot":60000000,"jackpotWon":False},
    {"date":"Mar 20, 2026","numbers":[11,20,51,55,63],"bonus":4,"jackpot":50000000,"jackpotWon":False},
    {"date":"Mar 17, 2026","numbers":[4,11,18,38,50],"bonus":24,"jackpot":60000000,"jackpotWon":True,"winnerCity":"Van Wert","winnerState":"OH"},
    {"date":"Mar 13, 2026","numbers":[6,19,36,40,55],"bonus":9,"jackpot":50000000,"jackpotWon":False},
    {"date":"Mar 10, 2026","numbers":[16,21,30,35,65],"bonus":7,"jackpot":533000000,"jackpotWon":True,"winnerCity":"Undisclosed","winnerState":""},
    {"date":"Mar 6,  2026","numbers":[8,19,26,38,42],"bonus":24,"jackpot":496000000,"jackpotWon":False},
    {"date":"Mar 3,  2026","numbers":[7,21,53,54,62],"bonus":16,"jackpot":450000000,"jackpotWon":False},
    {"date":"Jan 16, 2026","numbers":[2,22,33,42,67],"bonus":1,"jackpot":50000000,"jackpotWon":True,"winnerCity":"Wichita Falls","winnerState":"TX"},
  ],
  "millionaire-for-life": [
    {"date":"Mar 30, 2026","numbers":[24,25,32,34,44],"bonus":4,"jackpot":0,"jackpotWon":False},
    {"date":"Mar 29, 2026","numbers":[11,17,18,43,53],"bonus":5,"jackpot":0,"jackpotWon":False},
    {"date":"Mar 28, 2026","numbers":[12,14,17,22,55],"bonus":4,"jackpot":0,"jackpotWon":False},
    {"date":"Mar 27, 2026","numbers":[6,9,28,33,46],"bonus":4,"jackpot":0,"jackpotWon":False},
    {"date":"Mar 26, 2026","numbers":[1,8,18,39,47],"bonus":1,"jackpot":0,"jackpotWon":False},
    {"date":"Mar 25, 2026","numbers":[1,26,40,46,50],"bonus":3,"jackpot":0,"jackpotWon":False},
    {"date":"Mar 9,  2026","numbers":[6,19,33,47,56],"bonus":1,"jackpot":0,"jackpotWon":True,"winnerCity":"Undisclosed","winnerState":"NC"},
  ]
}

# In-memory store for newly scraped draws
_live_draws: dict = {}


@router.get("/{game_id}")
async def get_draws(
    game_id: str,
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0),
):
    """
    Get draws for a game. Returns DB draws merged with seed data.
    Frontend polls this every 5 minutes to stay current.
    """
    if game_id not in SEED_DRAWS:
        return {"draws": [], "total": 0, "game_id": game_id}

    # Merge live draws with seed data
    live = _live_draws.get(game_id, [])
    seed = SEED_DRAWS.get(game_id, [])

    # Deduplicate by date (live takes priority)
    live_dates = {d["date"] for d in live}
    combined = live + [d for d in seed if d["date"] not in live_dates]

    total = len(combined)
    draws = combined[offset:offset + limit]

    return {
        "draws":   draws,
        "total":   total,
        "game_id": game_id,
        "source":  "live+seed",
    }


@router.post("/{game_id}/add")
async def add_draw(game_id: str, draw: dict):
    """
    Add a new draw result. Called by the scraper after each draw.
    """
    if game_id not in _live_draws:
        _live_draws[game_id] = []

    # Remove existing draw for same date if any
    _live_draws[game_id] = [
        d for d in _live_draws[game_id]
        if d.get("date") != draw.get("date")
    ]
    _live_draws[game_id].insert(0, draw)

    # Also update seed data
    if game_id in SEED_DRAWS:
        SEED_DRAWS[game_id] = [
            d for d in SEED_DRAWS[game_id]
            if d.get("date") != draw.get("date")
        ]
        SEED_DRAWS[game_id].insert(0, draw)

    return {"status": "added", "draw": draw}


@router.get("/{game_id}/latest")
async def get_latest(game_id: str):
    """Get the most recent draw for a game."""
    draws = _live_draws.get(game_id, []) or SEED_DRAWS.get(game_id, [])
    return {"draw": draws[0] if draws else None, "game_id": game_id}


@router.get("/{game_id}/stats")
async def get_stats(game_id: str):
    """Get frequency stats computed from all draws."""
    live = _live_draws.get(game_id, [])
    seed = SEED_DRAWS.get(game_id, [])
    live_dates = {d["date"] for d in live}
    all_draws = live + [d for d in seed if d["date"] not in live_dates]

    freq: dict[int, int] = {}
    bonus_freq: dict[int, int] = {}

    for draw in all_draws:
        for n in draw.get("numbers", []):
            freq[n] = freq.get(n, 0) + 1
        b = draw.get("bonus")
        if b:
            bonus_freq[b] = bonus_freq.get(b, 0) + 1

    if not freq:
        return {"freq": {}, "bonus_freq": {}, "total_draws": 0}

    avg = sum(freq.values()) / len(freq) if freq else 1
    hot  = sorted(freq.items(), key=lambda x: x[1], reverse=True)[:15]
    cold = sorted(freq.items(), key=lambda x: x[1])[:15]

    return {
        "total_draws": len(all_draws),
        "freq":        freq,
        "bonus_freq":  bonus_freq,
        "hot_numbers": [n for n, _ in hot],
        "cold_numbers": [n for n, _ in cold],
        "jackpot_wins": sum(1 for d in all_draws if d.get("jackpotWon")),
        "biggest_jackpot": max((d.get("jackpot", 0) for d in all_draws), default=0),
    }
