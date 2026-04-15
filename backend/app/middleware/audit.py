from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
import structlog
import time

logger = structlog.get_logger()

class AuditLogMiddleware(BaseHTTPMiddleware):
    """
    Middleware injecting high level request profiling tracing contexts appending metric measurements implicitly logging API performance details.
    """
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        response = await call_next(request)
        
        process_time = (time.time() - start_time) * 1000
        logger.info(
            "request_audit",
            method=request.method,
            url=str(request.url),
            status_code=response.status_code,
            duration_ms=round(process_time, 2),
            client_ip=request.client.host if request.client else None
        )
        return response
