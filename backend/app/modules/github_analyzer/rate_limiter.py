import httpx
import re
import time
import asyncio
from typing import Dict, Any, Optional

class GitHubRateLimiter:
    """Token bucket with GitHub X-RateLimit headers using Redis."""
    def __init__(self, redis_client, pat: str):
        self.redis = redis_client
        self.pat = pat
        self.http = httpx.AsyncClient()

    async def call_with_limit(self, username: str) -> dict:
        remaining = int(await self.redis.get('github:rate_remaining') or 5000)
        
        if remaining < 50:
            reset_at = float(await self.redis.get('github:rate_reset') or 0)
            wait = max(0, reset_at - time.time())
            if wait > 0:
                await asyncio.sleep(wait)
        
        resp = await self.http.get(
            f'https://api.github.com/users/{username}/repos',
            params={'per_page': 100, 'sort': 'pushed'},
            headers={'Authorization': f'token {self.pat}'}
        )
        
        if 'X-RateLimit-Remaining' in resp.headers:
            await self.redis.set('github:rate_remaining', resp.headers['X-RateLimit-Remaining'])
            await self.redis.set('github:rate_reset', resp.headers['X-RateLimit-Reset'])
        
        if resp.status_code == 404:
            return {'error': 'user_not_found', 'repos': []}
            
        resp.raise_for_status()
        return {'repos': resp.json()}

def extract_github_username(url: str) -> Optional[str]:
    """Extract username from GitHub URL."""
    if not url: return None
    match = re.match(r'https?://github\.com/([\w-]+)/?$', url.strip())
    return match.group(1) if match else None
