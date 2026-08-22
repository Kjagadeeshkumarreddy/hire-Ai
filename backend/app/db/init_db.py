import asyncio
import psycopg
from psycopg import sql
from app.config import settings
from app.db.session import engine
from app.db.models import Base
from sqlalchemy import text
import structlog

logger = structlog.get_logger()

def ensure_db_exists():
    """ ensure the postgres database exists, create if missing flawlessly using synchronous connection. """
    # Parse the database URL to get connection details for the 'postgres' database
    base_url = settings.psycopg_url.rsplit("/", 1)[0]
    db_name = settings.psycopg_url.rsplit("/", 1)[1]
    
    postgres_url = f"{base_url}/postgres"
    
    try:
        # Connect to default 'postgres' database synchronously to avoid event loop issues on Windows
        with psycopg.connect(postgres_url, autocommit=True, prepare_threshold=None) as conn:
            with conn.cursor() as cur:
                # Check if database exists
                cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (db_name,))
                exists = cur.fetchone()
                
                if not exists:
                    logger.info("database.not_found", database=db_name)
                    # Create database
                    cur.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(db_name)))
                    logger.info("database.created", database=db_name)
                else:
                    logger.info("database.exists", database=db_name)
    except Exception as e:
        logger.error("database.creation_failed", error=str(e))

async def init_models(max_retries=3):
    """ create all tables defined in models, with retry for transient connection drops flawlessy. """
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy.pool import NullPool
    
    # Create a dedicated engine for schema initialization to avoid pool-level issues
    init_engine = create_async_engine(
        settings.sqlalchemy_url,
        poolclass=NullPool,
        connect_args={"prepare_threshold": None}
    )
    
    for attempt in range(1, max_retries + 1):
        try:
            async with init_engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("database.schema_initialized")
            await init_engine.dispose()
            return
        except Exception as e:
            logger.warning("database.schema_init_retry", attempt=attempt, error=str(e))
            if attempt == max_retries:
                logger.error("database.schema_initialization_failed", error=str(e))
                raise
            await asyncio.sleep(2 * attempt)  # Backoff: 2s, 4s, 6s

async def enforce_rls():
    """ Automatically enable Row Level Security on all critical tables for Supabase protection. """
    tables = [
        "users", "jobs", "candidates", "jd_versions", "scores", 
        "resumes", "audit_logs", "github_analysis", "interview_questions", 
        "pipeline_runs", "email_logs", "saved_offer_letters", "student_assessments",
        "offer_signatures", "resume_style_templates", "style_transfer_jobs",
        "checkpoint_migrations", "checkpoints", "checkpoint_writes", "checkpoint_blobs",
        "tech_recruiter_credentials", "technical_marks", "alembic_version", "category_marks", "assessment_categories",
        "interview_schedules", "interview_slots"
    ]
    
    try:
        async with engine.begin() as conn:
            for table in tables:
                # Idempotent RLS activation flawlessly
                await conn.execute(text(f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY;"))
            logger.info("database.rls_enforcement_complete")
    except Exception as e:
        # Ignore errors if tables don't exist yet (init_models handles creation)
        logger.warning("database.rls_enforcement_skipped", error=str(e))

async def setup_database():
    """ entry point for database setup on startup. """
    ensure_db_exists()
    await init_models()
    await enforce_rls()

