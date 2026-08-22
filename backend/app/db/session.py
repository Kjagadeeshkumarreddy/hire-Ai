from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
from app.config import settings

from sqlalchemy import event

engine = create_async_engine(
    settings.sqlalchemy_url,
    echo=False,
    future=True,
    pool_pre_ping=False,
    poolclass=NullPool,
    query_cache_size=0,
    connect_args={"prepare_threshold": None}
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
