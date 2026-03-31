"""ROVA User Auth API — JWT register/login/me/favorites"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional
import os, jwt, hashlib, secrets
from datetime import datetime, timedelta

router  = APIRouter()
bearer  = HTTPBearer(auto_error=False)

SECRET  = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-production")
ALGO    = "HS256"
EXP_HRS = 24 * 7  # 7 days

# In-memory user store — replace with DB in production
_users: dict[str, dict] = {}
_favorites: dict[str, list] = {}


def hash_password(password: str) -> str:
    """Simple SHA256 hash — avoids bcrypt version issues."""
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256(f"{salt}{password}".encode()).hexdigest()
    return f"{salt}:{hashed}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, hashed = stored.split(":", 1)
        return hashlib.sha256(f"{salt}{password}".encode()).hexdigest() == hashed
    except Exception:
        return False


def make_token(user_id: str, email: str) -> str:
    payload = {
        "sub":   user_id,
        "email": email,
        "exp":   datetime.utcnow() + timedelta(hours=EXP_HRS),
    }
    return jwt.encode(payload, SECRET, algorithm=ALGO)


def get_current_user(creds: HTTPAuthorizationCredentials = Depends(bearer)):
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, SECRET, algorithms=[ALGO])
        user_id = payload.get("sub")
        if user_id not in _users:
            raise HTTPException(status_code=401, detail="User not found")
        return _users[user_id]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


class RegisterRequest(BaseModel):
    email:     EmailStr
    password:  str
    full_name: Optional[str] = ""


class LoginRequest(BaseModel):
    email:    EmailStr
    password: str


class FavoriteRequest(BaseModel):
    game_id: str
    numbers: list[int]
    label:   str
    bonus:   Optional[int] = None


@router.post("/register")
async def register(req: RegisterRequest):
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    # Check duplicate email
    for u in _users.values():
        if u["email"] == req.email:
            raise HTTPException(status_code=400, detail="Email already registered")

    user_id = secrets.token_hex(16)
    _users[user_id] = {
        "id":        user_id,
        "email":     req.email,
        "full_name": req.full_name or req.email.split("@")[0],
        "password":  hash_password(req.password),
        "plan":      "Free",
        "created_at": datetime.utcnow().isoformat(),
    }
    _favorites[user_id] = []

    token = make_token(user_id, req.email)
    user  = {k: v for k, v in _users[user_id].items() if k != "password"}
    return {"token": token, "user": user}


@router.post("/login")
async def login(req: LoginRequest):
    for user in _users.values():
        if user["email"] == req.email:
            if verify_password(req.password, user["password"]):
                token = make_token(user["id"], user["email"])
                safe  = {k: v for k, v in user.items() if k != "password"}
                return {"token": token, "user": safe}
            raise HTTPException(status_code=401, detail="Invalid password")
    raise HTTPException(status_code=404, detail="Email not found")


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return {k: v for k, v in user.items() if k != "password"}


@router.post("/favorites")
async def save_favorite(req: FavoriteRequest, user: dict = Depends(get_current_user)):
    fav_id = secrets.token_hex(8)
    fav = {
        "id":      fav_id,
        "game_id": req.game_id,
        "numbers": req.numbers,
        "label":   req.label,
        "bonus":   req.bonus,
    }
    _favorites.setdefault(user["id"], []).append(fav)
    return {"status": "saved", "saved": fav}


@router.get("/favorites")
async def get_favorites(user: dict = Depends(get_current_user)):
    return {"favorites": _favorites.get(user["id"], [])}
