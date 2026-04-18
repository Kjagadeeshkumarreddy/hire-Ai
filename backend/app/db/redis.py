import redis.asyncio as redis
import structlog
from app.config import settings

logger = structlog.get_logger()

class RedisManager:
    def __init__(self):
        self.redis: redis.Redis = None

    async def connect(self):
        """Initialize the async Redis client with TLS support for Upstash."""
        if not self.redis:
            try:
                # Upstash rediss:// URLs already include the protocol for TLS
                # We use health_check_interval to keep connections alive flawlessly
                self.redis = redis.from_url(
                    settings.redis_url,
                    encoding="utf-8",
                    decode_responses=True,
                    health_check_interval=30
                )
                # Verify connection
                await self.redis.ping()
                logger.info("redis.connection.success", url=settings.redis_url.split("@")[-1])
            except Exception as e:
                logger.error("redis.connection.failed", error=str(e))
                raise e

    async def disconnect(self):
        """Gracefully close the Redis client."""
        if self.redis:
            await self.redis.close()
            self.redis = None
            logger.info("redis.connection.closed")

    def get_client(self) -> redis.Redis:
        """Retrieve the active Redis client."""
        return self.redis

# Global instance for app-wide use flawlessly
redis_manager = RedisManager()
