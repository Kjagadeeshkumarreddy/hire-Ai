"""
Background tasks for the Hire-AI platform.
Can be run via Celery workers or called directly as async functions (fallback).
"""
import structlog
from celery import shared_task

logger = structlog.get_logger()


@shared_task(name="run_pipeline_task", bind=True, max_retries=2, default_retry_delay=30)
def run_pipeline_task(self, job_id: str, candidate_ids: list):
    """
    Background task: Run the LangGraph agentic pipeline for a batch of candidates.
    Uses synchronous wrapper around the async pipeline for Celery compatibility.
    """
    import asyncio
    logger.info("worker.pipeline.started", job_id=job_id, candidates=len(candidate_ids))

    async def _execute():
        from app.db.session import AsyncSessionLocal
        from app.db.models import JDVersion, PipelineRun
        from app.agents.graph import get_compiled_graph, pool
        from sqlalchemy import select
        import uuid as uuid_mod

        async with AsyncSessionLocal() as db:
            # Fetch JD
            jd_stmt = select(JDVersion).where(JDVersion.job_id == job_id).order_by(JDVersion.version.desc())
            jd_result = await db.execute(jd_stmt)
            jd = jd_result.scalars().first()
            jd_content = jd.content if jd else "No Job Description provided."

            # Create pipeline run
            run_id = str(uuid_mod.uuid4())
            pipeline_run = PipelineRun(
                id=run_id, job_id=job_id, status="running",
                total_candidates=len(candidate_ids), langgraph_thread_id=run_id
            )
            db.add(pipeline_run)
            await db.commit()

        # Execute pipeline
        async with pool.connection() as conn:
            graph = await get_compiled_graph(conn)
            config = {"configurable": {"thread_id": run_id}}
            initial_state = {
                "job_id": job_id,
                "jd_content": jd_content,
                "pipeline_run_id": run_id,
                "candidate_ids": candidate_ids,
                "total_candidates": len(candidate_ids),
                "processed_count": 0,
                "current_step": "resume_parser"
            }
            async for event in graph.astream(initial_state, config):
                pass

        # Mark complete
        async with AsyncSessionLocal() as db:
            from sqlalchemy import update
            await db.execute(
                update(PipelineRun).where(PipelineRun.id == run_id).values(status="completed")
            )
            await db.commit()

        logger.info("worker.pipeline.completed", job_id=job_id, run_id=run_id)
        return {"status": "completed", "run_id": run_id}

    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        return loop.run_until_complete(_execute())
    except Exception as exc:
        logger.error("worker.pipeline.failed", job_id=job_id, error=str(exc))
        raise self.retry(exc=exc)
    finally:
        loop.close()


@shared_task(name="send_bulk_email_task", bind=True, max_retries=3, default_retry_delay=60)
def send_bulk_email_task(self, job_id: str, subject: str, body: str, user_id: str):
    """
    Background task: Send bulk emails to shortlisted candidates.
    """
    import asyncio
    logger.info("worker.email.started", job_id=job_id)

    async def _execute():
        from app.db.session import AsyncSessionLocal
        from app.modules.candidates.service import send_bulk_emails
        from uuid import UUID

        async with AsyncSessionLocal() as db:
            result = await send_bulk_emails(
                UUID(job_id), subject, body, db, user_id=UUID(user_id)
            )
            return result

    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        return loop.run_until_complete(_execute())
    except Exception as exc:
        logger.error("worker.email.failed", job_id=job_id, error=str(exc))
        raise self.retry(exc=exc)
    finally:
        loop.close()
