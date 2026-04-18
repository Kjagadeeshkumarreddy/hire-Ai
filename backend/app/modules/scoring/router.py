from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Dict, Optional
from uuid import UUID
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.db.models import Score, Candidate, Job, AuditLog
from app.modules.scoring.bias_free import BiasFilter
from .schemas import ScoringConfigUpdate, ScoreBreakdownResponse, CandidatesRankingResponse
from app.middleware.auth import verify_token, RoleChecker
import structlog

logger = structlog.get_logger()
hr_only = RoleChecker(["admin", "hr"])

router = APIRouter(prefix="/scores", tags=["Scoring"])


@router.post("/{job_id}/run")
async def trigger_scoring(
    job_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(hr_only)
):
    """Trigger the agentic scoring pipeline for all candidates under a job."""
    # Verify job exists
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Fetch candidates that haven't been scored yet for this job
    stmt = (
        select(Candidate.id)
        .where(Candidate.job_id == job_id)
        .where(Candidate.pipeline_status != "scored")
    )
    result = await db.execute(stmt)
    candidate_ids = [str(row[0]) for row in result.all()]

    if not candidate_ids:
        return {"status": "no_action", "message": "All candidates already scored or no candidates found."}

    # Trigger the LangGraph pipeline for scoring
    from app.agents.graph import get_compiled_graph, pool
    from app.db.models import JDVersion, PipelineRun
    import uuid as uuid_mod

    # Fetch latest JD
    jd_stmt = select(JDVersion).where(JDVersion.job_id == job_id).order_by(JDVersion.version.desc())
    jd_result = await db.execute(jd_stmt)
    jd = jd_result.scalars().first()
    jd_content = jd.content if jd else "No Job Description provided."

    # Create pipeline run
    run_id = str(uuid_mod.uuid4())
    pipeline_run = PipelineRun(
        id=run_id, job_id=job_id, status="running",
        total_candidates=len(candidate_ids), langgraph_thread_id=run_id,
        triggered_by=UUID(user.get("sub"))
    )
    db.add(pipeline_run)
    await db.commit()

    # Execute scoring via LangGraph
    try:
        async with pool.connection() as conn:
            graph = await get_compiled_graph(conn)
            config = {"configurable": {"thread_id": run_id}}
            initial_state = {
                "job_id": str(job_id),
                "jd_content": jd_content,
                "pipeline_run_id": run_id,
                "candidate_ids": candidate_ids,
                "total_candidates": len(candidate_ids),
                "processed_count": 0,
                "current_step": "resume_parser"
            }
            async for event in graph.astream(initial_state, config):
                pass

        # Update pipeline run status
        pipeline_run.status = "completed"
        await db.commit()

        logger.info("scoring.pipeline.completed", job_id=str(job_id), candidates=len(candidate_ids))
        return {
            "status": "completed",
            "job_id": str(job_id),
            "candidates_processed": len(candidate_ids),
            "pipeline_run_id": run_id
        }
    except Exception as e:
        pipeline_run.status = "failed"
        await db.commit()
        logger.error("scoring.pipeline.failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Scoring pipeline failed: {str(e)}")


@router.get("/{job_id}/ranking")
async def get_candidate_ranking(
    job_id: UUID,
    bias_free: bool = Query(False, description="Enable bias-free anonymized view"),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    """Fetch descending ranking list of scored candidates for a job."""
    # Check if job has bias-free enabled
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    use_bias_free = bias_free or job.bias_free_enabled

    # Query scores joined with candidates, ordered by total_score descending
    stmt = (
        select(Score, Candidate)
        .join(Candidate, Score.candidate_id == Candidate.id)
        .where(Score.job_id == job_id)
        .order_by(Score.total_score.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    rows = result.all()

    ranked = []
    for rank_idx, (score, candidate) in enumerate(rows, 1):
        candidate_data = {
            "rank": rank_idx,
            "candidate_id": str(candidate.id),
            "full_name": candidate.full_name,
            "email": candidate.email,
            "total_score": float(score.total_score) if score.total_score else 0,
            "breakdown": score.score_breakdown or {},
            "is_shortlisted": candidate.is_shortlisted,
            "anonymized_id": candidate.anonymized_id
        }

        # Apply bias-free anonymization if enabled
        if use_bias_free:
            candidate_data = BiasFilter.anonymize(candidate_data)

        ranked.append(candidate_data)

    return {
        "job_id": str(job_id),
        "bias_free_mode": use_bias_free,
        "total_ranked": len(ranked),
        "rankings": ranked
    }


@router.patch("/{job_id}/config")
async def update_scoring_config(
    job_id: UUID,
    config: ScoringConfigUpdate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(hr_only)
):
    """Update scoring configuration (weights, top_n, bias_free) for a job."""
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Update job scoring config
    job.scoring_config = {"weights": config.weights, "updated_by": user.get("sub")}
    job.top_n_count = config.top_n
    job.bias_free_enabled = config.bias_free_enabled
    
    # Audit log
    audit = AuditLog(
        job_id=job_id,
        user_id=UUID(user.get("sub")),
        action="scoring_config_updated",
        entity_type="job",
        entity_id=job_id,
        details={
            "weights": config.weights,
            "top_n": config.top_n,
            "bias_free": config.bias_free_enabled
        }
    )
    db.add(audit)
    await db.commit()

    logger.info("scoring.config.updated", job_id=str(job_id))
    return {
        "status": "success",
        "job_id": str(job_id),
        "scoring_config": job.scoring_config,
        "top_n_count": job.top_n_count,
        "bias_free_enabled": job.bias_free_enabled
    }


@router.get("/{candidate_id}/breakdown")
async def get_score_breakdown(
    candidate_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Retrieve detailed score breakdown for a specific candidate."""
    stmt = select(Score).where(Score.candidate_id == candidate_id).order_by(Score.created_at.desc())
    result = await db.execute(stmt)
    score = result.scalars().first()

    if not score:
        raise HTTPException(status_code=404, detail="No score found for this candidate")

    return {
        "candidate_id": str(candidate_id),
        "job_id": str(score.job_id),
        "total_score": float(score.total_score) if score.total_score else 0,
        "scoring_mode": score.scoring_mode or "normal",
        "breakdown": score.score_breakdown or {},
        "gap_analysis": score.gap_analysis,
        "config_snapshot": score.scoring_config_snapshot or {},
        "scored_at": score.created_at.isoformat() if score.created_at else None
    }
