import hashlib
import json
from typing import Callable, Any

class LLMCache:
    def __init__(self, redis_client, ttl: int = 86400):
        self.redis = redis_client
        self.ttl = ttl
    
    def _key(self, prompt: str, model: str) -> str:
        h = hashlib.sha256(f"{model}:{prompt}".encode()).hexdigest()
        return f"llm_cache:{h}"
    
    async def get_or_call(self, prompt: str, model: str, call_fn: Callable) -> Any:
        key = self._key(prompt, model)
        # Assuming redis_client is a standard asyncio redis client
        cached = await self.redis.get(key)
        if cached:
            return json.loads(cached)
            
        result = await call_fn(prompt, model)
        await self.redis.setex(key, self.ttl, json.dumps(result))
        return result
