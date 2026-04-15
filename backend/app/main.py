import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

logger = structlog.get_logger()

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
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.on_event("startup")
    async def startup_event():
        logger.info("application.startup", project=settings.PROJECT_NAME, version=settings.VERSION)
        
        # Ensure database and schema exists flawlessly on every restart
        from app.db.init_db import setup_database
        await setup_database()

        # Initialize LangGraph Checkpointer schema flawlessly
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
    
    app.include_router(auth_router, prefix=settings.API_V1_STR)
    app.include_router(jd_router, prefix=settings.API_V1_STR)
    app.include_router(candidates_router, prefix=settings.API_V1_STR)
    app.include_router(scoring_router, prefix=settings.API_V1_STR)
    app.include_router(interview_router, prefix=settings.API_V1_STR)
    app.include_router(email_router, prefix=settings.API_V1_STR)
    app.include_router(audit_router, prefix=settings.API_V1_STR)
    
    return app

app = create_app()
