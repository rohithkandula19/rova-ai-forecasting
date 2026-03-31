from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
import uuid as uuid_mod
from app.db.database import get_db
from app.models.models import Simulation
from app.workers.tasks import run_monte_carlo_task

router = APIRouter()

class SimRequest(BaseModel):
    game_id: str
    user_id: str = "00000000-0000-0000-0000-000000000000"
    strategy: str = "ai_model"
    n_simulations: int = 1000000
    n_tickets: int = 100

@router.post("/montecarlo")
async def start_simulation(req: SimRequest, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    sim_id = str(uuid_mod.uuid4())
    background_tasks.add_task(run_monte_carlo_task, sim_id, req.model_dump())
    return {"simulation_id": sim_id, "status": "queued"}

@router.get("/{simulation_id}/results")
async def get_results(simulation_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Simulation).where(Simulation.id == simulation_id))
    sim = result.scalar_one_or_none()
    if not sim:
        return {"status": "not_found"}
    return {"status": sim.status, "results": sim.results}
