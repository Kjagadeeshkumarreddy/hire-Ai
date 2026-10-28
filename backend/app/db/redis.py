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
            url = settings.redis_url
            if not url or url.lower() in ["none", "null", ""]:
                logger.warning("redis.connection.skipped", reason="REDIS_URL not configured")
                return

            try:
                import asyncio
                # Set socket timeouts so unreachable hosts or DNS issues don't stall startup
                self.redis = redis.from_url(
                    url,
                    encoding="utf-8",
                    decode_responses=True,
                    health_check_interval=30,
                    socket_connect_timeout=5,
                    socket_timeout=5
                )
                # Verify connection with a strict 5-second timeout
                await asyncio.wait_for(self.redis.ping(), timeout=5.0)
                logger.info("redis.connection.success", url=url.split("@")[-1] if "@" in url else "connected")
            except Exception as e:
                host = url.split("@")[-1] if "@" in url else url
                logger.warning(
                    "redis.connection.fallback",
                    error=str(e),
                    target_host=host,
                    note="Redis is currently unreachable. The server will continue running using in-memory fallbacks."
                )
                if self.redis:
                    try:
                        await self.redis.close()
                    except Exception:
                        pass
                self.redis = None

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
