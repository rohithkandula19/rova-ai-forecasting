from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.models.models import MLModel

router = APIRouter()

@router.get("/")
async def list_models(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MLModel).order_by(MLModel.created_at.desc()))
    models = result.scalars().all()
    return [{"id": str(m.id), "version": m.version, "architecture": m.architecture, "val_loss": m.val_loss, "accuracy": m.accuracy, "is_active": m.is_active} for m in models]

@router.post("/train")
async def trigger_retrain(game_id: str):
    from app.workers.tasks import retrain_model_task
    retrain_model_task.delay(game_id)
    return {"status": "retrain_queued", "game_id": game_id}
