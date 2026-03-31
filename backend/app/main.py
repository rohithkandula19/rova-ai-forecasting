from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import structlog

log = structlog.get_logger()

@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("rova.startup")
    try:
        from app.db.database import engine, Base
        from app.models import models  # noqa — registers all models
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        log.info("rova.db_ready")
    except Exception as e:
        log.error("rova.db_error", error=str(e))
    yield
    try:
        from app.db.database import engine
        await engine.dispose()
    except Exception:
        pass

app = FastAPI(
    title="ROVA AI Forecasting API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
    redirect_slashes=False,
)

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Health check (always works, even if other imports fail) ──
@app.get("/health", include_in_schema=False)
async def health():
    return {"status": "ok", "version": "1.0.0"}

@app.get("/", include_in_schema=False)
async def root():
    return {"name": "ROVA AI Forecasting API", "docs": "/api/docs"}

# ── Import routers individually so one failure doesn't kill all ──
def safe_include(module_path: str, prefix: str, tags: list):
    try:
        import importlib
        mod = importlib.import_module(module_path)
        app.include_router(mod.router, prefix=prefix, tags=tags)
        log.info("router.loaded", module=module_path)
    except Exception as e:
        log.error("router.failed", module=module_path, error=str(e))

safe_include("app.api.v1.auth",           "/api/v1/auth",      ["Auth"])
safe_include("app.api.v1.games",          "/api/v1/games",     ["Games"])
safe_include("app.api.v1.draws",          "/api/v1/draws",     ["Draws"])
safe_include("app.api.v1.features",       "/api/v1/features",  ["Features"])
safe_include("app.api.v1.score",          "/api/v1/score",     ["Score"])
safe_include("app.api.v1.simulate",       "/api/v1/simulate",  ["Simulate"])
safe_include("app.api.v1.backtest",       "/api/v1/backtest",  ["Backtest"])
safe_include("app.api.v1.models_router",  "/api/v1/models",    ["Models"])
safe_include("app.api.v1.ws",             "/ws",               ["WebSocket"])
safe_include("app.api.v1.users",          "/api/v1/users",     ["Users"])
safe_include("app.api.v1.chat",           "/api/v1/chat",      ["Chat"])
safe_include("app.api.v1.admin",          "/api/v1/admin",     ["Admin"])
safe_include("app.api.v1.notifications", "/api/v1/notifications", ["Notifications"])

# ── Inline auth endpoints (fallback if users router fails) ──
import hashlib, secrets as _secrets
from datetime import datetime as _dt, timedelta as _td
_users_db: dict = {}

@app.post("/api/v1/users/register")
async def inline_register(req: dict):
    email = req.get("email","")
    password = req.get("password","")
    name = req.get("full_name", email.split("@")[0])
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password required")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password too short")
    for u in _users_db.values():
        if u["email"] == email:
            raise HTTPException(status_code=400, detail="Email already registered")
    uid = _secrets.token_hex(16)
    salt = _secrets.token_hex(8)
    hashed = hashlib.sha256(f"{salt}{password}".encode()).hexdigest()
    _users_db[uid] = {"id":uid,"email":email,"full_name":name,"password":f"{salt}:{hashed}","plan":"Free"}
    import jwt as _jwt
    token = _jwt.encode({"sub":uid,"email":email,"exp":_dt.utcnow()+_td(days=7)},
                        os.environ.get("SECRET_KEY","dev-secret"), algorithm="HS256")
    user = {k:v for k,v in _users_db[uid].items() if k != "password"}
    return {"token": token, "user": user}

@app.post("/api/v1/users/login")
async def inline_login(req: dict):
    email = req.get("email","")
    password = req.get("password","")
    for uid, u in _users_db.items():
        if u["email"] == email:
            salt, hashed = u["password"].split(":",1)
            if hashlib.sha256(f"{salt}{password}".encode()).hexdigest() == hashed:
                import jwt as _jwt
                token = _jwt.encode({"sub":uid,"email":email,"exp":_dt.utcnow()+_td(days=7)},
                                    os.environ.get("SECRET_KEY","dev-secret"), algorithm="HS256")
                user = {k:v for k,v in u.items() if k != "password"}
                return {"token": token, "user": user}
            raise HTTPException(status_code=401, detail="Invalid password")
    raise HTTPException(status_code=404, detail="Email not found")

