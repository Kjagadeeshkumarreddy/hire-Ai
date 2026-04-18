from fastapi import APIRouter, Depends, HTTPException, Query
from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.db.models import AuditLog, Candidate, Job
import structlog

logger = structlog.get_logger()

router = APIRouter(prefix="/audit", tags=["Audit Log"])


@router.get("/{job_id}/logs")
async def get_job_audit_logs(
    job_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    action_filter: str = Query(None, description="Filter by action type"),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve paginated audit trail for a specific job."""
    # Verify job exists
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Count total
    count_stmt = select(func.count(AuditLog.id)).where(AuditLog.job_id == job_id)
    if action_filter:
        count_stmt = count_stmt.where(AuditLog.action == action_filter)
    total = (await db.execute(count_stmt)).scalar() or 0

    # Fetch paginated logs
    offset = (page - 1) * page_size
    stmt = (
        select(AuditLog)
        .where(AuditLog.job_id == job_id)
    )
    if action_filter:
        stmt = stmt.where(AuditLog.action == action_filter)

    stmt = stmt.order_by(AuditLog.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(stmt)
    logs = result.scalars().all()

    return {
        "job_id": str(job_id),
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": (total + page_size - 1) // page_size,
        "logs": [
            {
                "id": str(log.id),
                "action": log.action,
                "entity_type": log.entity_type,
                "entity_id": str(log.entity_id) if log.entity_id else None,
                "candidate_id": str(log.candidate_id) if log.candidate_id else None,
                "user_id": str(log.user_id) if log.user_id else None,
                "details": log.details or {},
                "ip_address": str(log.ip_address) if log.ip_address else None,
                "created_at": log.created_at.isoformat() if log.created_at else None
            }
            for log in logs
        ]
    }


@router.get("/candidate/{id}/trail")
async def get_candidate_audit_trail(
    id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Fetch complete traceable audit history for a candidate's lifecycle."""
    # Verify candidate exists
    candidate = await db.get(Candidate, id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Fetch all audit logs for this candidate
    stmt = (
        select(AuditLog)
        .where(AuditLog.candidate_id == id)
        .order_by(AuditLog.created_at.asc())
    )
    result = await db.execute(stmt)
    logs = result.scalars().all()

    # Also fetch job-level logs that affect this candidate's job
    job_stmt = (
        select(AuditLog)
        .where(AuditLog.job_id == candidate.job_id)
        .where(AuditLog.candidate_id.is_(None))
        .where(AuditLog.action.in_(["jd_generated", "jd_refined", "jd_approved", "jd_rejected", "scoring_config_updated"]))
        .order_by(AuditLog.created_at.asc())
    )
    job_result = await db.execute(job_stmt)
    job_logs = job_result.scalars().all()

    # Merge and sort by timestamp
    all_logs = sorted(
        list(logs) + list(job_logs),
        key=lambda x: x.created_at if x.created_at else ""
    )

    return {
        "candidate_id": str(id),
        "candidate_name": candidate.full_name,
        "job_id": str(candidate.job_id),
        "pipeline_status": candidate.pipeline_status,
        "total_events": len(all_logs),
        "trail": [
            {
                "id": str(log.id),
                "action": log.action,
                "entity_type": log.entity_type,
                "entity_id": str(log.entity_id) if log.entity_id else None,
                "user_id": str(log.user_id) if log.user_id else None,
                "details": log.details or {},
                "scope": "candidate" if log.candidate_id else "job",
                "created_at": log.created_at.isoformat() if log.created_at else None
            }
            for log in all_logs
        ]
    }
