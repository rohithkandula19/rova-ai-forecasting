from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional

class Settings(BaseSettings):
    APP_NAME: str = "ROVA AI Forecasting"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = "dev-secret-key-change-in-production-256bit"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    DATABASE_URL: str = "postgresql+asyncpg://rova_user:rova_pass@db:5432/rova_db"
    REDIS_URL: str = "redis://redis:6379/0"
    GCP_PROJECT_ID: Optional[str] = None
    GCS_BUCKET: Optional[str] = None
    MODEL_ARTIFACTS_PATH: str = "./artifacts"
    MLFLOW_TRACKING_URI: str = "http://mlflow:5000"
    SENTRY_DSN: Optional[str] = None
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:8000"]

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()
