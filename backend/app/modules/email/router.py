from fastapi import APIRouter, Depends, HTTPException, Body
from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.db.models import EmailLog, Candidate, Job, AuditLog
from app.middleware.auth import verify_token, RoleChecker
import structlog

logger = structlog.get_logger()
hr_only = RoleChecker(["admin", "hr"])

router = APIRouter(prefix="/email", tags=["Email"])


@router.post("/{job_id}/send-shortlist")
async def send_shortlist_emails(
    job_id: UUID,
    subject: str = Body(..., embed=True),
    body: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(hr_only)
):
    """Send emails to all shortlisted candidates for a job using the existing bulk email system."""
    # Verify job exists
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Reuse the existing bulk send function from candidates service
    from app.modules.candidates.service import send_bulk_emails
    user_id = UUID(user.get("sub"))
    result = await send_bulk_emails(job_id, subject, body, db, user_id=user_id)

    # Log audit
    audit = AuditLog(
        job_id=job_id,
        user_id=user_id,
        action="shortlist_emails_sent",
        entity_type="email_batch",
        details=result
    )
    db.add(audit)
    await db.commit()

    logger.info("email.shortlist.sent", job_id=str(job_id))
    return result


@router.get("/{job_id}/status")
async def get_email_status(
    job_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Retrieve email send/fail/queued statistics for a job."""
    # Aggregate counts by status
    stmt = (
        select(
            EmailLog.status,
            func.count(EmailLog.id).label("count")
        )
        .where(EmailLog.job_id == job_id)
        .group_by(EmailLog.status)
    )
    result = await db.execute(stmt)
    status_counts = {row[0]: row[1] for row in result.all()}

    # Fetch individual email logs
    log_stmt = (
        select(EmailLog)
        .where(EmailLog.job_id == job_id)
        .order_by(EmailLog.created_at.desc())
        .limit(100)
    )
    log_result = await db.execute(log_stmt)
    logs = log_result.scalars().all()

    return {
        "job_id": str(job_id),
        "summary": {
            "total": sum(status_counts.values()),
            "sent": status_counts.get("sent", 0),
            "failed": status_counts.get("failed", 0),
            "queued": status_counts.get("queued", 0),
            "pending": status_counts.get("pending", 0)
        },
        "logs": [
            {
                "id": str(log.id),
                "candidate_id": str(log.candidate_id) if log.candidate_id else None,
                "recipient_email": log.recipient_email,
                "subject": log.subject,
                "status": log.status,
                "email_type": log.email_type,
                "sent_at": log.sent_at.isoformat() if log.sent_at else None,
                "error_message": log.error_message,
                "retry_count": log.retry_count
            }
            for log in logs
        ]
    }
