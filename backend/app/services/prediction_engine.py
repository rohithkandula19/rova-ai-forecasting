"""
ROVA AI Forecasting — Prediction Engine
Analyzes historical draw data and generates ranked number combinations.
"""
import random
import math
from collections import Counter, defaultdict
from typing import Optional
import structlog

log = structlog.get_logger()


def analyze_draws(draws: list[dict], game_config: dict) -> dict:
    """
    Analyze a list of historical draws and compute statistical features.
    Returns frequency, hot/cold/overdue data, co-occurrence matrix.
    """
    pool = game_config["pool_size"]
    all_numbers = []
    co_occur = defaultdict(Counter)
    last_seen = {}
    positional = defaultdict(Counter)

    for draw_idx, draw in enumerate(draws):
        nums = draw.get("numbers", [])
        all_numbers.extend(nums)

        for i, n in enumerate(nums):
            if n not in last_seen:
                last_seen[n] = draw_idx
            positional[i][n] += 1

        for i, a in enumerate(nums):
            for b in nums[i+1:]:
                co_occur[a][b] += 1
                co_occur[b][a] += 1

    total_draws = len(draws)
    freq_counter = Counter(all_numbers)
    expected_freq = (total_draws * 5) / pool

    analysis = {
        "total_draws": total_draws,
        "frequency": {},
        "hot": [],
        "cold": [],
        "overdue": [],
        "co_occurrence": {},
        "positional": {},
    }

    # Compute per-number stats
    num_stats = []
    for n in range(1, pool + 1):
        freq = freq_counter.get(n, 0)
        last_idx = last_seen.get(n, total_draws)
        draws_since = last_idx  # 0 = appeared in most recent draw
        z_score = (freq - expected_freq) / max(math.sqrt(expected_freq), 1)

        num_stats.append({
            "number":      n,
            "frequency":   freq,
            "freq_pct":    round(freq / max(total_draws * 5, 1) * 100, 2),
            "z_score":     round(z_score, 3),
            "draws_since": draws_since,
            "is_hot":      z_score > 0.5,
            "is_cold":     z_score < -0.5,
            "is_overdue":  draws_since > (pool // 5),
        })
        analysis["frequency"][n] = freq

    analysis["co_occurrence"] = {
        k: dict(v.most_common(10)) for k, v in co_occur.items()
    }
    analysis["positional"] = {
        str(pos): dict(counter.most_common(10))
        for pos, counter in positional.items()
    }

    # Sort lists
    by_freq = sorted(num_stats, key=lambda x: x["frequency"], reverse=True)
    analysis["hot"]     = [x["number"] for x in by_freq if x["is_hot"]][:15]
    analysis["cold"]    = [x["number"] for x in by_freq if x["is_cold"]][:15]
    analysis["overdue"] = sorted(
        [x for x in num_stats if x["is_overdue"]],
        key=lambda x: x["draws_since"], reverse=True
    )[:10]
    analysis["all_stats"] = {s["number"]: s for s in num_stats}

    return analysis


def score_combination(combo: list[int], bonus: int, analysis: dict, game_config: dict) -> float:
    """Score a combination 0–1 based on statistical features."""
    if not combo:
        return 0.0

    pool = game_config["pool_size"]
    stats = analysis.get("all_stats", {})

    score = 0.0

    # 1. Frequency score (35% weight) — prefer numbers with above-average freq
    freq_scores = [stats.get(n, {}).get("z_score", 0) for n in combo]
    freq_score = sum(freq_scores) / len(freq_scores)
    score += 0.35 * (0.5 + freq_score * 0.3)

    # 2. Overdue score (20% weight) — mix in some overdue numbers
    overdue_nums = set(x["number"] for x in analysis.get("overdue", []))
    overdue_count = sum(1 for n in combo if n in overdue_nums)
    score += 0.20 * min(overdue_count / 2.0, 1.0)

    # 3. Co-occurrence score (25% weight) — prefer numbers that appear together
    co_occur = analysis.get("co_occurrence", {})
    co_scores = []
    for i, a in enumerate(combo):
        for b in combo[i+1:]:
            co_val = co_occur.get(a, {}).get(b, 0)
            co_scores.append(co_val)
    if co_scores:
        avg_co = sum(co_scores) / len(co_scores)
        max_co = max(max(v.values()) for v in co_occur.values() if v) if co_occur else 1
        score += 0.25 * (avg_co / max(max_co, 1))

    # 4. Distribution score (20% weight) — prefer spread across pool
    spread = (max(combo) - min(combo)) / max(pool - 1, 1)
    score += 0.20 * spread

    return round(min(max(score, 0.01), 0.99), 3)


def generate_combination(
    analysis: dict,
    game_config: dict,
    strategy: str = "balanced",
    seed: Optional[int] = None,
) -> tuple[list[int], int]:
    """
    Generate a single combination using specified strategy.
    Strategies: balanced, hot_heavy, overdue_heavy, lucky_random
    """
    pool       = game_config["pool_size"]
    bonus_pool = game_config["bonus_pool"]
    rng        = random.Random(seed) if seed else random.Random()
    stats      = analysis.get("all_stats", {})

    if strategy == "lucky_random":
        nums = sorted(rng.sample(range(1, pool + 1), 5))
        bonus = rng.randint(1, bonus_pool) if bonus_pool > 0 else 0
        return nums, bonus

    # Build weighted pool
    weights = []
    hot_set     = set(analysis.get("hot", []))
    overdue_set = set(x["number"] for x in analysis.get("overdue", []))

    for n in range(1, pool + 1):
        s = stats.get(n, {})
        w = 1.0

        if strategy == "hot_heavy":
            w += 2.0 if n in hot_set else 0.0
            w += 1.0 if n in overdue_set else 0.0

        elif strategy == "overdue_heavy":
            w += 3.0 if n in overdue_set else 0.0
            w += 0.5 if n in hot_set else 0.0

        else:  # balanced
            w += 1.0 if n in hot_set else 0.0
            w += 1.0 if n in overdue_set else 0.0
            w += s.get("z_score", 0) * 0.5

        weights.append(max(w, 0.1))

    pool_nums = list(range(1, pool + 1))
    chosen = rng.choices(pool_nums, weights=weights, k=50)
    seen = set()
    nums = []
    for n in chosen:
        if n not in seen:
            seen.add(n)
            nums.append(n)
        if len(nums) == 5:
            break

    # Fill remaining if needed
    remaining = [n for n in pool_nums if n not in seen]
    rng.shuffle(remaining)
    nums.extend(remaining[:5 - len(nums)])
    nums = sorted(nums[:5])

    bonus = rng.randint(1, bonus_pool) if bonus_pool > 0 else 0
    return nums, bonus


def predict_combinations(
    draws: list[dict],
    game_config: dict,
    n_draws_to_analyze: int = 50,
    n_combinations: int = 5,
) -> dict:
    """
    Main prediction function.
    Analyzes last N draws and generates 5 ranked combinations.
    """
    # Use only the requested number of draws
    recent_draws = draws[:n_draws_to_analyze]
    analysis = analyze_draws(recent_draws, game_config)

    strategies = [
        ("balanced",       "Statistical Balance",    "Blends hot frequency, overdue gaps, and co-occurrence patterns."),
        ("hot_heavy",      "Hot Number Focus",       "Strongly weights numbers with above-average recent frequency."),
        ("overdue_heavy",  "Overdue Number Focus",   "Targets numbers statistically due to appear based on gaps."),
        ("balanced",       "Co-occurrence Pattern",  "Prioritizes numbers that historically appear together."),
        ("lucky_random",   "Lucky Prediction",       "AI-seeded random — sometimes the universe decides! 🍀"),
    ]

    combos = []
    seen_combos = set()

    for i, (strategy, label, desc) in enumerate(strategies):
        for attempt in range(20):
            nums, bonus = generate_combination(
                analysis, game_config, strategy,
                seed=i * 1000 + attempt + n_draws_to_analyze
            )
            key = tuple(nums)
            if key not in seen_combos:
                seen_combos.add(key)
                break

        sc = score_combination(nums, bonus, analysis, game_config)

        hot_in_combo    = [n for n in nums if n in set(analysis.get("hot", []))]
        overdue_in_combo= [n for n in nums if n in set(x["number"] for x in analysis.get("overdue", []))]

        explanation = f"Strategy: {label}. "
        if hot_in_combo:
            explanation += f"Numbers {hot_in_combo} are currently HOT (above-average frequency). "
        if overdue_in_combo:
            explanation += f"Numbers {overdue_in_combo} are OVERDUE based on {n_draws_to_analyze}-draw gap analysis. "
        explanation += f"Ensemble score: {sc}."

        combos.append({
            "rank":        i + 1,
            "numbers":     nums,
            "bonus":       bonus,
            "score":       sc,
            "strategy":    label,
            "explanation": explanation,
            "hot_count":   len(hot_in_combo),
            "overdue_count": len(overdue_in_combo),
        })

    # Sort by score descending
    combos.sort(key=lambda x: x["score"], reverse=True)
    for i, c in enumerate(combos):
        c["rank"] = i + 1

    return {
        "game":             game_config["name"],
        "draws_analyzed":   len(recent_draws),
        "combinations":     combos,
        "analysis_summary": {
            "hot_numbers":     analysis["hot"][:10],
            "cold_numbers":    analysis["cold"][:10],
            "overdue_numbers": [x["number"] for x in analysis["overdue"][:5]],
            "total_draws":     analysis["total_draws"],
        },
    }
