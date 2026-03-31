"""
ROVA AI Forecasting — Real Lottery Data Scraper
================================================
Sources:
  Powerball:     https://www.powerball.com/api/v1/drawings/powerball
  Mega Millions: https://www.megamillions.com/cmspages/utilservice.asmx/GetDrawingPagingData

These are the internal endpoints that each lottery's own website uses.
They are not officially documented public APIs, but are stable and structured.

If either endpoint fails → falls back to HTML scraping of the official page.
All data is validated before storage. Unverified data is flagged clearly.
"""

import httpx
import asyncio
import json
import re
from datetime import datetime, date
from typing import Optional
import structlog

log = structlog.get_logger()

# ── Official endpoints used by each lottery's own website ────
POWERBALL_API  = "https://www.powerball.com/api/v1/drawings/powerball"
POWERBALL_HTML = "https://www.powerball.com/previous-results"
MEGAMM_API     = "https://www.megamillions.com/cmspages/utilservice.asmx/GetDrawingPagingData"
MEGAMM_HTML    = "https://www.megamillions.com/winning-numbers/previous-drawings.aspx"

HEADERS = {
    "User-Agent":      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Accept":          "application/json, text/html, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer":         "https://www.powerball.com/",
}

# ── Validation config ────────────────────────────────────────
GAME_CONFIG = {
    "powerball": {
        "main_count": 5, "main_min": 1, "main_max": 69,
        "bonus_min": 1,  "bonus_max": 26,
    },
    "mega-millions": {
        "main_count": 5, "main_min": 1, "main_max": 70,
        "bonus_min": 1,  "bonus_max": 24,
    },
}


def validate_draw(game_id: str, numbers: list, bonus: int) -> tuple[bool, list[str]]:
    """Validate draw numbers against official game rules."""
    cfg = GAME_CONFIG.get(game_id, {})
    errors = []
    if len(numbers) != cfg.get("main_count", 5):
        errors.append(f"Expected {cfg.get('main_count')} numbers, got {len(numbers)}")
    for n in numbers:
        if not (cfg.get("main_min", 1) <= n <= cfg.get("main_max", 69)):
            errors.append(f"Number {n} out of range 1-{cfg.get('main_max')}")
    if not (cfg.get("bonus_min", 1) <= bonus <= cfg.get("bonus_max", 26)):
        errors.append(f"Bonus {bonus} out of range 1-{cfg.get('bonus_max')}")
    if len(set(numbers)) != len(numbers):
        errors.append("Duplicate numbers in draw")
    return len(errors) == 0, errors


def parse_jackpot(value: str) -> Optional[int]:
    """Parse '$167.9 Million' or '$1.816 Billion' → integer dollars."""
    if not value:
        return None
    try:
        v = value.replace("$", "").replace(",", "").strip()
        if "billion" in v.lower() or v.lower().endswith("b"):
            n = float(re.sub(r"[bB]illion|[bB]", "", v, flags=re.I).strip())
            return int(n * 1_000_000_000)
        if "million" in v.lower() or v.lower().endswith("m"):
            n = float(re.sub(r"[mM]illion|[mM]", "", v, flags=re.I).strip())
            return int(n * 1_000_000)
        return int(float(v))
    except Exception:
        return None


# ════════════════════════════════════════════════════════
# POWERBALL SCRAPER
# ════════════════════════════════════════════════════════
async def fetch_powerball(limit: int = 50) -> list[dict]:
    """
    Fetch Powerball results. Tries JSON API first, falls back to HTML.
    Returns list of validated draw dicts or empty list on total failure.
    """
    try:
        results = await _powerball_via_api(limit)
        if results:
            log.info("scraper.powerball.api_success", count=len(results))
            return results
    except Exception as e:
        log.warning("scraper.powerball.api_failed", error=str(e))

    try:
        results = await _powerball_via_html()
        log.info("scraper.powerball.html_success", count=len(results))
        return results
    except Exception as e:
        log.error("scraper.powerball.html_failed", error=str(e))
        return []


async def _powerball_via_api(limit: int) -> list[dict]:
    """
    Use powerball.com's own internal JSON API.
    Endpoint: GET https://www.powerball.com/api/v1/drawings/powerball
    """
    async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
        resp = await client.get(
            POWERBALL_API,
            params={"page": 1, "itemsPerPage": limit},
            headers={**HEADERS, "Referer": "https://www.powerball.com/"},
        )
        resp.raise_for_status()
        data = resp.json()

    draws = []
    for item in data.get("data", []):
        try:
            # Numbers come as "11,42,43,59,61,25" (main + bonus combined)
            raw_nums = item.get("field_winning_numbers", "")
            all_nums  = [int(n.strip()) for n in raw_nums.split(",") if n.strip()]
            if len(all_nums) < 6:
                continue
            main   = sorted(all_nums[:5])
            bonus  = all_nums[5]

            # Validate
            valid, errors = validate_draw("powerball", main, bonus)

            draws.append({
                "game_id":      "powerball",
                "draw_date":    item["field_draw_date"][:10],
                "numbers":      main,
                "bonus":        bonus,
                "multiplier":   item.get("field_power_play") or "",
                "jackpot":      parse_jackpot(str(item.get("field_jackpot", "") or "")),
                "jackpot_won":  int(item.get("field_jackpot_winners", 0) or 0) > 0,
                "verified":     valid,
                "validation_errors": errors,
                "source_url":   POWERBALL_API,
                "source_type":  "api",
            })
        except Exception as e:
            log.warning("scraper.powerball.parse_row_failed", error=str(e))
            continue
    return draws


async def _powerball_via_html() -> list[dict]:
    """Fallback: scrape the HTML results page."""
    from bs4 import BeautifulSoup
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        resp = await client.get(POWERBALL_HTML, headers=HEADERS)
        resp.raise_for_status()

    soup   = BeautifulSoup(resp.text, "lxml")
    draws  = []

    # Each draw result is in a .draw-card or similar container
    # Structure can change — this is best-effort
    for card in soup.select(".resultsCard, .draw-card, [data-draw-date]")[:20]:
        try:
            date_el = card.select_one("[class*='date'], time, .draw-date")
            nums_el = card.select_all(".ball, .white-ball, [class*='ball']")
            if not date_el or not nums_el:
                continue
            raw_date = date_el.get_text(strip=True)
            numbers  = [int(el.get_text(strip=True)) for el in nums_el[:5]]
            bonus    = int(nums_el[5].get_text(strip=True)) if len(nums_el) > 5 else 0
            valid, errors = validate_draw("powerball", numbers, bonus)
            draws.append({
                "game_id":           "powerball",
                "draw_date":         raw_date,
                "numbers":           sorted(numbers),
                "bonus":             bonus,
                "multiplier":        None,
                "jackpot":           None,
                "jackpot_won":       False,
                "verified":          valid,
                "validation_errors": errors,
                "source_url":        POWERBALL_HTML,
                "source_type":       "html_scrape",
            })
        except Exception:
            continue
    return draws


# ════════════════════════════════════════════════════════
# MEGA MILLIONS SCRAPER
# ════════════════════════════════════════════════════════
async def fetch_megamillions(limit: int = 50) -> list[dict]:
    """
    Fetch Mega Millions results. Tries ASMX web service first, falls back to HTML.
    """
    try:
        results = await _megamm_via_api(limit)
        if results:
            log.info("scraper.megamillions.api_success", count=len(results))
            return results
    except Exception as e:
        log.warning("scraper.megamillions.api_failed", error=str(e))

    try:
        results = await _megamm_via_html()
        log.info("scraper.megamillions.html_success", count=len(results))
        return results
    except Exception as e:
        log.error("scraper.megamillions.html_failed", error=str(e))
        return []


async def _megamm_via_api(limit: int) -> list[dict]:
    """
    Use megamillions.com internal ASMX web service.
    POST https://www.megamillions.com/cmspages/utilservice.asmx/GetDrawingPagingData
    """
    async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
        resp = await client.post(
            MEGAMM_API,
            json={"pageNumber": 0, "pageSize": limit, "startDate": "", "endDate": ""},
            headers={
                **HEADERS,
                "Content-Type": "application/json",
                "Referer": "https://www.megamillions.com/",
            },
        )
        resp.raise_for_status()
        data = resp.json()

    draws  = []
    raw    = data.get("DrawingData") or data.get("d") or []
    if isinstance(raw, str):
        raw = json.loads(raw)

    for item in raw:
        try:
            # WinningNumbers: "4 13 52 53 69" MegaBall: "10"
            nums_str = item.get("WinningNumbers", "")
            main     = sorted([int(n) for n in nums_str.split() if n])
            bonus    = int(item.get("MegaBall", 0))
            jraw     = str(item.get("JackpotAmt", "") or "")
            valid, errors = validate_draw("mega-millions", main, bonus)

            draws.append({
                "game_id":           "mega-millions",
                "draw_date":         item.get("DrawingDate", "")[:10],
                "numbers":           main,
                "bonus":             bonus,
                "multiplier":        str(item.get("Megaplier", "") or ""),
                "jackpot":           parse_jackpot(jraw),
                "jackpot_won":       int(item.get("NumberOfWinners", 0) or 0) > 0,
                "verified":          valid,
                "validation_errors": errors,
                "source_url":        MEGAMM_API,
                "source_type":       "api",
            })
        except Exception as e:
            log.warning("scraper.megamm.parse_row_failed", error=str(e))
            continue
    return draws


async def _megamm_via_html() -> list[dict]:
    """Fallback: scrape Mega Millions HTML results page."""
    from bs4 import BeautifulSoup
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        resp = await client.get(MEGAMM_HTML, headers={**HEADERS, "Referer": "https://www.megamillions.com/"})
        resp.raise_for_status()

    soup  = BeautifulSoup(resp.text, "lxml")
    draws = []

    for row in soup.select(".winning-numbers-item, .resultsCard")[:20]:
        try:
            date_el = row.select_one("time, .date, [class*='date']")
            balls   = row.select(".ball, .winning-number, [class*='ball']")
            if not date_el or len(balls) < 6:
                continue
            main  = sorted([int(b.get_text(strip=True)) for b in balls[:5]])
            bonus = int(balls[5].get_text(strip=True))
            valid, errors = validate_draw("mega-millions", main, bonus)
            draws.append({
                "game_id":           "mega-millions",
                "draw_date":         date_el.get("datetime", date_el.get_text(strip=True))[:10],
                "numbers":           main,
                "bonus":             bonus,
                "multiplier":        None,
                "jackpot":           None,
                "jackpot_won":       False,
                "verified":          valid,
                "validation_errors": errors,
                "source_url":        MEGAMM_HTML,
                "source_type":       "html_scrape",
            })
        except Exception:
            continue
    return draws


# ════════════════════════════════════════════════════════
# MASTER FETCH — called by Celery tasks
# ════════════════════════════════════════════════════════
async def fetch_all_games(limit: int = 100) -> dict[str, list[dict]]:
    """Fetch all supported games concurrently."""
    pb, mm = await asyncio.gather(
        fetch_powerball(limit),
        fetch_megamillions(limit),
        return_exceptions=True,
    )
    return {
        "powerball":      pb if isinstance(pb, list) else [],
        "mega-millions":  mm if isinstance(mm, list) else [],
    }


async def fetch_single_game(game_id: str, limit: int = 10) -> list[dict]:
    """Fetch a single game — used for nightly sync after each draw."""
    if game_id == "powerball":
        return await fetch_powerball(limit)
    if game_id == "mega-millions":
        return await fetch_megamillions(limit)
    return []
