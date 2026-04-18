from celery import Celery
from app.config import settings

# Initialize Celery with Upstash Redis as Broker and Backend
celery_app = Celery(
    "hiring_ai_workers",
    broker=settings.redis_url,
    backend=settings.redis_url
)

# Configuration for robust message handling
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour max for deep-dive tasks
    worker_prefetch_multiplier=1,  # Fair distribution for heavy agent tasks
    broker_connection_retry_on_startup=True,
)

# Auto-discover task modules
celery_app.autodiscover_tasks(["app.workers"])

@celery_app.task(name="ping_task")
def ping_task():
    """Simple health-check task."""
    return "pong"
