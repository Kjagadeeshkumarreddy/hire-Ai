import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

# Initialize structured logging before anything else
from app.logging_config import setup_logging
setup_logging()

import structlog
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.middleware.rate_limit import RateLimiter

logger = structlog.get_logger()

# Rate limiter instances for different endpoint categories
auth_rate_limiter = RateLimiter(requests=20, window=60)       # 20 req/min for auth
ai_rate_limiter = RateLimiter(requests=10, window=60)         # 10 req/min for AI-heavy
general_rate_limiter = RateLimiter(requests=100, window=60)   # 100 req/min general

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        openapi_url=f"{settings.API_V1_STR}/openapi.json"
    )

    from app.middleware.audit import AuditLogMiddleware
    app.add_middleware(AuditLogMiddleware)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174", "http://localhost:5175", "http://127.0.0.1:5175"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    from app.db.redis import redis_manager

    @app.on_event("startup")
    async def startup_event():
        logger.info("application.startup", project=settings.PROJECT_NAME, version=settings.VERSION)
        
        # Ensure database and schema exists on every restart
        from app.db.init_db import setup_database
        await setup_database()

        # Initialize Redis connection for Upstash-backed caching
        await redis_manager.connect()

        # Initialize LangGraph Checkpointer schema
        from app.agents.graph import pool
        await pool.open() # Fix deprecation warning by opening explicitly
        
        from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
        async with pool.connection() as conn:
            checkpointer = AsyncPostgresSaver(conn)
            await checkpointer.setup()
            logger.info("langgraph.checkpointer.setup_complete")

    @app.on_event("shutdown")
    async def shutdown_event():
        # Gracefully terminating native Psycopg pool connections
        from app.agents.graph import pool
        await pool.close()
        
        # Gracefully closing Redis connection
        await redis_manager.disconnect()
        logger.info("application.shutdown_complete")

    @app.get("/health")
    async def health_check():
        return {"status": "ok"}

    # Include API Routers
    from app.modules.jd.router import router as jd_router
    from app.modules.candidates.router import router as candidates_router
    from app.modules.scoring.router import router as scoring_router
    from app.modules.interview.router import router as interview_router
    from app.modules.email.router import router as email_router
    from app.modules.audit.router import router as audit_router
    from app.modules.auth.router import router as auth_router
    from app.modules.students.router import router as students_router
    from app.modules.admin.router import router as admin_router
    from app.modules.esign.router import router as esign_router
    from app.modules.style_transfer.router import router as style_transfer_router
    from app.modules.tech_recruiter.router import router as tech_recruiter_router
    from app.modules.hr.router import router as hr_router
    from app.modules.schedule.router import router as schedule_router
    from app.modules.auth.oauth_router import router as oauth_router
    
    app.include_router(auth_router, prefix=settings.API_V1_STR)
    app.include_router(oauth_router, prefix=settings.API_V1_STR)
    app.include_router(admin_router, prefix=settings.API_V1_STR)
    app.include_router(jd_router, prefix=settings.API_V1_STR)
    app.include_router(candidates_router, prefix=settings.API_V1_STR)
    app.include_router(scoring_router, prefix=settings.API_V1_STR)
    app.include_router(interview_router, prefix=settings.API_V1_STR)
    app.include_router(email_router, prefix=settings.API_V1_STR)
    app.include_router(audit_router, prefix=settings.API_V1_STR)
    app.include_router(students_router, prefix=settings.API_V1_STR)
    app.include_router(esign_router, prefix=settings.API_V1_STR)
    app.include_router(style_transfer_router, prefix=settings.API_V1_STR)
    app.include_router(tech_recruiter_router, prefix=settings.API_V1_STR)
    app.include_router(hr_router, prefix=settings.API_V1_STR)
    app.include_router(schedule_router, prefix=settings.API_V1_STR)
    
    return app

app = create_app()

# Uvicorn hot-reload trigger comment to load updated .env keys
