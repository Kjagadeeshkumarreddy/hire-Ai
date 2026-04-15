import asyncio
import psycopg
from psycopg import sql
from app.config import settings
from app.db.session import engine
from app.db.models import Base
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
        with psycopg.connect(postgres_url, autocommit=True) as conn:
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

async def init_models():
    """ create all tables defined in models flawlessly. """
    try:
        async with engine.begin() as conn:
            # This creates all tables if they don't exist
            await conn.run_sync(Base.metadata.create_all)
        logger.info("database.schema_initialized")
    except Exception as e:
        logger.error("database.schema_initialization_failed", error=str(e))
        raise

async def setup_database():
    """ entry point for database setup on startup. """
    ensure_db_exists()
    await init_models()
