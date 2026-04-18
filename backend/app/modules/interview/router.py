from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import func
from app.db.session import get_db
from app.db.models import InterviewQuestion, Candidate, Resume, JDVersion
from app.middleware.auth import verify_token, RoleChecker
import structlog

logger = structlog.get_logger()
hr_only = RoleChecker(["admin", "hr"])

router = APIRouter(prefix="/interview", tags=["Interview"])


@router.post("/{candidate_id}/generate")
async def generate_interview_questions(
    candidate_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(hr_only)
):
    """Generate tailored interview questions for a candidate using Groq LLM."""
    # Fetch candidate
    candidate = await db.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Reuse the existing generation logic from candidates service
    from app.modules.candidates.service import generate_questions_for_candidate
    result = await generate_questions_for_candidate(candidate_id, db)
    return result


@router.patch("/{id}/approve")
async def approve_interview_questions(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(hr_only)
):
    """HITL Approve generated interview questions."""
    question_record = await db.get(InterviewQuestion, id)
    if not question_record:
        raise HTTPException(status_code=404, detail="Interview questions record not found")

    question_record.status = "approved"
    question_record.approved_by = UUID(user.get("sub"))
    question_record.approved_at = func.now()

    # Log audit
    from app.db.models import AuditLog
    audit = AuditLog(
        candidate_id=question_record.candidate_id,
        job_id=question_record.job_id,
        user_id=UUID(user.get("sub")),
        action="interview_questions_approved",
        entity_type="interview_question",
        entity_id=id,
        details={"question_count": len(question_record.questions) if question_record.questions else 0}
    )
    db.add(audit)
    await db.commit()

    logger.info("interview.questions.approved", id=str(id), approved_by=user.get("sub"))
    return {
        "status": "approved",
        "id": str(id),
        "candidate_id": str(question_record.candidate_id),
        "approved_by": user.get("sub")
    }


@router.patch("/{id}/reject")
async def reject_interview_questions(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(hr_only)
):
    """HITL Reject generated interview questions for re-generation."""
    question_record = await db.get(InterviewQuestion, id)
    if not question_record:
        raise HTTPException(status_code=404, detail="Interview questions record not found")

    question_record.status = "rejected"
    await db.commit()

    logger.info("interview.questions.rejected", id=str(id))
    return {
        "status": "rejected",
        "id": str(id),
        "candidate_id": str(question_record.candidate_id)
    }


@router.get("/{candidate_id}/questions")
async def get_candidate_questions(
    candidate_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Retrieve all interview questions generated for a candidate."""
    stmt = (
        select(InterviewQuestion)
        .where(InterviewQuestion.candidate_id == candidate_id)
        .order_by(InterviewQuestion.created_at.desc())
    )
    result = await db.execute(stmt)
    records = result.scalars().all()

    return [
        {
            "id": str(r.id),
            "candidate_id": str(r.candidate_id),
            "job_id": str(r.job_id),
            "questions": r.questions,
            "status": r.status,
            "llm_model": r.llm_model,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "approved_at": r.approved_at.isoformat() if r.approved_at else None
        }
        for r in records
    ]
