from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "rova_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="US/Eastern",
    enable_utc=True,
    result_expires=3600,
    task_routes={
        "app.workers.tasks.run_monte_carlo_task":  {"queue": "simulation"},
        "app.workers.tasks.run_backtest_task":      {"queue": "backtest"},
        "app.workers.tasks.retrain_model_task":     {"queue": "ml"},
        "app.workers.tasks.nightly_data_sync":      {"queue": "scraper"},
        "app.workers.tasks.run_prediction_task":    {"queue": "prediction"},
    },
    beat_schedule={
        # Mega Millions draws: Tue & Fri at 11pm ET
        "sync-megamillions-tuesday": {
            "task":    "app.workers.tasks.nightly_data_sync",
            "schedule": crontab(hour=23, minute=30, day_of_week=2),
        },
        "sync-megamillions-friday": {
            "task":    "app.workers.tasks.nightly_data_sync",
            "schedule": crontab(hour=23, minute=30, day_of_week=5),
        },
        # Powerball draws: Mon, Wed, Sat at 11pm ET
        "sync-powerball-mon": {
            "task":    "app.workers.tasks.nightly_data_sync",
            "schedule": crontab(hour=23, minute=15, day_of_week=1),
        },
        "sync-powerball-wed": {
            "task":    "app.workers.tasks.nightly_data_sync",
            "schedule": crontab(hour=23, minute=15, day_of_week=3),
        },
        "sync-powerball-sat": {
            "task":    "app.workers.tasks.nightly_data_sync",
            "schedule": crontab(hour=23, minute=15, day_of_week=6),
        },
        # Full sync every morning 6am ET
        "full-sync-daily": {
            "task":    "app.workers.tasks.nightly_data_sync",
            "schedule": crontab(hour=6, minute=0),
        },
        # Drift detection every 2h
        "drift-check-every-2h": {
            "task":    "app.workers.tasks.drift_detection_task",
            "schedule": 7200.0,
        },
    },
)
