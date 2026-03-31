"""
ROVA Winner Scraper
===================
Scrapes winner city/state from official lottery press release pages.
Runs 48 hours after any jackpot win via Celery task.

Sources:
  Powerball:     https://www.powerball.com/winners
  Mega Millions: https://www.megamillions.com/winners
  MFL:           https://www.nclottery.com/Millionaire

Note: Winner pages are HTML — no internal API available.
If scraping fails → draw stays as jackpotWon=True, winnerCity=None
→ UI shows "Winner announced, location pending"
"""

import httpx
import re
from datetime import datetime, timedelta
from typing import Optional
import structlog

log = structlog.get_logger()

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Accept":     "text/html,application/xhtml+xml,*/*",
}

# Known winner locations — manually verified from official press releases
# Format: "GAME|DATE" -> {"city": "...", "state": "...", "count": 1}
KNOWN_WINNERS = {
    "mega-millions|Mar 17, 2026": {"city": "Van Wert",      "state": "OH", "count": 1},
    "mega-millions|Jan 16, 2026": {"city": "Wichita Falls", "state": "TX", "count": 1},
    "powerball|Dec 24, 2025":     {"city": "Undisclosed",   "state": "CA", "count": 1},
    "powerball|Mar 4,  2026":     {"city": "Undisclosed",   "state": "",   "count": 1},
    "millionaire-for-life|Mar 9, 2026": {"city": "Undisclosed", "state": "NC", "count": 1},
}


async def scrape_powerball_winners() -> list[dict]:
    """
    Scrape powerball.com/winners for recent jackpot winner locations.
    Returns list of {date, city, state, jackpot} dicts.
    """
    winners = []
    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            resp = await client.get("https://www.powerball.com/winners", headers=HEADERS)
            resp.raise_for_status()
            html = resp.text

        # Look for patterns like "Texas winner" or "won in Dallas, Texas"
        # Powerball winner pages have structured data
        patterns = [
            # "winner in Dallas, Texas"
            r'winner[s]?\s+in\s+([A-Za-z\s]+),\s*([A-Z][a-z]+)',
            # "Dallas, TX"
            r'([A-Za-z\s]+),\s*([A-Z]{2})\s+winner',
            # State only: "California winner"
            r'([A-Za-z\s]+)\s+winner',
        ]

        for pattern in patterns:
            matches = re.findall(pattern, html, re.IGNORECASE)
            for match in matches[:5]:
                if isinstance(match, tuple) and len(match) == 2:
                    city, state = match[0].strip(), match[1].strip()
                    if len(city) > 2 and len(state) >= 2:
                        winners.append({"city": city, "state": state[:2].upper()})

        log.info("winner_scraper.powerball", found=len(winners))
    except Exception as e:
        log.warning("winner_scraper.powerball_failed", error=str(e))

    return winners


async def scrape_megamillions_winners() -> list[dict]:
    """
    Scrape megamillions.com/winners for recent jackpot winner locations.
    """
    winners = []
    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            resp = await client.get(
                "https://www.megamillions.com/winners",
                headers={**HEADERS, "Referer": "https://www.megamillions.com/"}
            )
            resp.raise_for_status()
            html = resp.text

        # Common patterns on MM winners page
        patterns = [
            r'([A-Za-z\s]{3,25}),\s*([A-Z]{2})\b',
            r'ticket\s+sold\s+in\s+([A-Za-z\s]+),\s*([A-Za-z]+)',
            r'winner\s+from\s+([A-Za-z\s]+),\s*([A-Z]{2})',
        ]

        for pattern in patterns:
            matches = re.findall(pattern, html)
            for match in matches[:5]:
                if isinstance(match, tuple) and len(match) == 2:
                    city = match[0].strip().title()
                    state = match[1].strip()[:2].upper()
                    # Filter out false positives
                    if (len(city) > 3 and len(state) == 2
                            and not city.lower() in ['mega', 'million', 'jackpot', 'winner']):
                        winners.append({"city": city, "state": state})

        log.info("winner_scraper.megamillions", found=len(winners))
    except Exception as e:
        log.warning("winner_scraper.megamillions_failed", error=str(e))

    return winners


def get_known_winner(game_id: str, draw_date: str) -> Optional[dict]:
    """
    Check our hardcoded known winners first (most reliable).
    Key: "game_id|draw_date"
    """
    key = f"{game_id}|{draw_date}"
    return KNOWN_WINNERS.get(key)


async def find_winner_for_draw(game_id: str, draw_date: str) -> Optional[dict]:
    """
    Main function — try known winners first, then scrape, then give up gracefully.
    Called by Celery task 48hrs after a jackpot win.
    """
    # 1. Check known winners dict first
    known = get_known_winner(game_id, draw_date)
    if known:
        log.info("winner_scraper.found_known", game=game_id, date=draw_date, city=known["city"])
        return known

    # 2. Try scraping official site
    try:
        if game_id == "powerball":
            scraped = await scrape_powerball_winners()
        elif game_id == "mega-millions":
            scraped = await scrape_megamillions_winners()
        else:
            scraped = []

        if scraped:
            # Return most likely match (first result)
            result = scraped[0]
            log.info("winner_scraper.scraped", game=game_id, date=draw_date, **result)
            return result
    except Exception as e:
        log.warning("winner_scraper.scrape_failed", game=game_id, error=str(e))

    # 3. Give up gracefully — UI shows "Location pending"
    log.info("winner_scraper.not_found", game=game_id, date=draw_date)
    return None
