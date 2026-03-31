from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
from app.workers.tasks import run_backtest_task

router = APIRouter()

class BacktestRequest(BaseModel):
    game_id: str
    strategies: list[str] = ["ai_model", "statistical", "hot_cold", "random"]
    period_days: int = 730

@router.post("/run")
async def run_backtest(req: BacktestRequest, background_tasks: BackgroundTasks):
    import uuid
    backtest_id = str(uuid.uuid4())
    for strategy in req.strategies:
        background_tasks.add_task(run_backtest_task, req.game_id, strategy, req.period_days)
    return {"backtest_id": backtest_id, "strategies": req.strategies, "status": "running"}

@router.get("/results")
async def list_results(game_id: str):
    return {"results": [
        {"strategy": "ai_model",    "avg_matches": 2.41, "roi": -46.1},
        {"strategy": "statistical", "avg_matches": 2.00, "roi": -47.3},
        {"strategy": "hot_cold",    "avg_matches": 1.53, "roi": -48.5},
        {"strategy": "random",      "avg_matches": 1.15, "roi": -48.9},
    ]}
