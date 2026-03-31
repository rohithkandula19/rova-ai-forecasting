"""
ROVA AI Forecasting — FastAPI Application
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator
import structlog
import sentry_sdk

from app.core.config import settings
from app.db.database import engine, Base
from app.api.v1 import auth, games, draws, features, score, simulate, backtest, models_router, ws

log = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create tables. Shutdown: dispose engine."""
    log.info("rova.startup", version=settings.VERSION, env=settings.ENVIRONMENT)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    log.info("rova.db.ready", url=settings.DATABASE_URL.split("@")[-1])
    yield
    await engine.dispose()
    log.info("rova.shutdown")


# ── Sentry (production only) ──────────────────────────────────────
if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        traces_sample_rate=0.1,
    )

# ── FastAPI App ───────────────────────────────────────────────────
app = FastAPI(
    title="ROVA AI Forecasting API",
    description="Statistical intelligence platform — Dense NN + LSTM + Monte Carlo",
    version=settings.VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# ── Middleware ────────────────────────────────────────────────────
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)

# ── Prometheus metrics ────────────────────────────────────────────
Instrumentator(
    should_group_status_codes=True,
    should_ignore_untemplated=True,
    excluded_handlers=["/health", "/metrics"],
).instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)

# ── Routers ───────────────────────────────────────────────────────
app.include_router(auth.router,           prefix="/api/v1/auth",     tags=["Auth"])
app.include_router(games.router,          prefix="/api/v1/games",    tags=["Games"])
app.include_router(draws.router,          prefix="/api/v1/draws",    tags=["Draws"])
app.include_router(features.router,       prefix="/api/v1/features", tags=["Features"])
app.include_router(score.router,          prefix="/api/v1/score",    tags=["Score"])
app.include_router(simulate.router,       prefix="/api/v1/simulate", tags=["Simulate"])
app.include_router(backtest.router,       prefix="/api/v1/backtest", tags=["Backtest"])
app.include_router(models_router.router,  prefix="/api/v1/models",   tags=["Models"])
app.include_router(ws.router,             prefix="/ws",              tags=["WebSocket"])


@app.get("/health", include_in_schema=False)
async def health():
    return {"status": "ok", "version": settings.VERSION, "env": settings.ENVIRONMENT}


@app.get("/", include_in_schema=False)
async def root():
    return JSONResponse({
        "name": "ROVA AI Forecasting API",
        "version": settings.VERSION,
        "docs": "/api/docs",
        "health": "/health",
    })
