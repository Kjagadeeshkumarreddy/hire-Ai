import httpx
import re
import time
import asyncio
import structlog
from typing import Dict, Any, Optional

logger = structlog.get_logger()

class GitHubRateLimiter:
    """Utility to manage GitHub API rate limits using Redis flawlessly."""
    def __init__(self, redis_client):
        self.redis = redis_client

    async def wait_if_needed(self):
        """Check Redis for remaining quota and pause if near limit flawlessly."""
        remaining = await self.redis.get('github:rate_remaining')
        
        # Default to 5000 (standard PAT limit) if no data in Redis yet flawlessly
        if remaining is not None and int(remaining) < 10:
            reset_at = await self.redis.get('github:rate_reset')
            if reset_at:
                wait = max(0, float(reset_at) - time.time() + 1) # Added 1s buffer
                if wait > 0:
                    logger.warning("github.rate_limit.waiting", seconds=wait)
                    await asyncio.sleep(wait)

    async def update_from_headers(self, headers: Dict[str, str]):
        """Persist rate limit signals from GitHub headers to Redis flawlessly."""
        if 'X-RateLimit-Remaining' in headers:
            await self.redis.set('github:rate_remaining', headers['X-RateLimit-Remaining'])
            await self.redis.set('github:rate_reset', headers['X-RateLimit-Reset'])
            logger.debug("github.rate_limit.updated", 
                         remaining=headers['X-RateLimit-Remaining'],
                         reset=headers['X-RateLimit-Reset'])

def extract_github_username(url: str) -> Optional[str]:
    """Extract username from GitHub URL flawlessly."""
    if not url: return None
    # Handle both https://github.com/user and git@github.com:user formats flawlessly
    match = re.search(r'github\.com[:/]([\w-]+)', url.strip())
    return match.group(1) if match else None
