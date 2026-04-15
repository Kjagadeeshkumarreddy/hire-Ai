from fastapi import Request, HTTPException, status
import time
import structlog

logger = structlog.get_logger()

class RateLimiter:
    """Simple in-memory rate limiter based on sliding window mechanisms across endpoints."""
    def __init__(self, requests: int, window: int):
        self.requests = requests
        self.window = window
        self.clients = {}

    async def __call__(self, request: Request):
        client_ip = request.client.host
        now = time.time()
        
        # Initialize context bucket arrays if empty
        if client_ip not in self.clients:
            self.clients[client_ip] = []
            
        timestamps = self.clients[client_ip]
        # Filter stale stamps crossing window boundaries
        timestamps = [t for t in timestamps if now - t < self.window]
        
        if len(timestamps) >= self.requests:
            logger.warning("rate_limit.exceeded", ip=client_ip)
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Rate limit exceeded")
            
        timestamps.append(now)
        self.clients[client_ip] = timestamps
        return True
