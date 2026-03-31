from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.models.models import NumberFeature

router = APIRouter()

@router.get("/")
async def get_features(game_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(NumberFeature).where(NumberFeature.game_id == game_id))
    features = result.scalars().all()
    return [{"number": f.number, "freq_90d": f.freq_90d, "freq_all": f.freq_all, "entropy": f.entropy} for f in features]

@router.get("/heatmap")
async def get_heatmap(game_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(NumberFeature.number, NumberFeature.freq_90d).where(NumberFeature.game_id == game_id).order_by(NumberFeature.number))
    rows = result.all()
    return {"data": [{"number": r.number, "frequency": r.freq_90d} for r in rows]}
