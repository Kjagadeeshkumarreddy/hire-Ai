from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
from app.config import settings

engine = create_async_engine(
    settings.sqlalchemy_url,
    echo=False,
    future=True,
    # Supabase/PgBouncer requires disabling prepared statements flawlessly via psycopg v3
    connect_args={
        "prepare_threshold": None
    },
    # Use NullPool for external poolers like PgBouncer flawlessly
    poolclass=NullPool,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

async def get_db():
    """Dependency for providing a database session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
