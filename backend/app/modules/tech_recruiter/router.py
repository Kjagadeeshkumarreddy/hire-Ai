from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.models import TechRecruiterCredential, TechnicalMark, Candidate, AssessmentCategory, CategoryMark
from app.middleware.auth import verify_token, RoleChecker
from app.modules.tech_recruiter.service import (
    create_tech_recruiter,
    get_credential_for_user,
    get_shortlisted_candidates,
    get_candidate_questions,
    submit_marks,
    get_all_marks,
    save_assessment_categories,
    get_assessment_categories,
    submit_category_marks,
    get_category_marks_for_technical_mark
)
import structlog

logger = structlog.get_logger()

router = APIRouter(prefix="/tech-recruiter", tags=["Tech Recruiter"])

hr_only = RoleChecker(["hr", "admin"])
tech_recruiter_only = RoleChecker(["tech_recruiter"])


# ──────────────────────────────────────────────
# Pydantic Schemas
# ──────────────────────────────────────────────

class GenerateCredentialRequest(BaseModel):
    job_id: str
    max_marks: int = Field(default=100, ge=1, le=1000)
    email: Optional[str] = None


class SubmitMarksRequest(BaseModel):
    marks_obtained: float = Field(ge=0)
    remarks: Optional[str] = None


class CategoryMarkItem(BaseModel):
    category_id: str
    marks_obtained: float = Field(ge=0)


class SubmitCategoryMarksRequest(BaseModel):
    category_marks: List[CategoryMarkItem]
    remarks: Optional[str] = None


class CategoryItem(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    max_marks: int = Field(ge=1, le=1000)


class SaveCategoriesRequest(BaseModel):
    categories: List[CategoryItem]


# ──────────────────────────────────────────────
# HR-Facing Endpoints
# ──────────────────────────────────────────────

@router.post("/generate", status_code=status.HTTP_201_CREATED)
async def generate_tech_recruiter(
    payload: GenerateCredentialRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(hr_only)
):
    """HR generates a unique login ID + password for a new tech recruiter."""
    user_id = UUID(user.get("sub"))
    job_id = UUID(payload.job_id)

    result = await create_tech_recruiter(
        job_id=job_id,
        max_marks=payload.max_marks,
        created_by_user_id=user_id,
        db=db
    )
    
    if payload.email:
        from app.core.mailer import send_email
        from app.db.models import User
        # Get user's SMTP config if applicable
        user_obj = await db.get(User, user_id)
        smtp_config = {
            "smtp_host": user_obj.smtp_host,
            "smtp_port": user_obj.smtp_port,
            "smtp_user": user_obj.smtp_user,
            "smtp_password": user_obj.smtp_password
        } if user_obj else None

        subject = "Your Technical Recruiter Login Credentials"
        body = f"""
        <div style="font-family: sans-serif; color: #111;">
            <h2 style="color: #f59e0b;">HireAI Tech Recruiter Access</h2>
            <p>Hello,</p>
            <p>You have been assigned as a Technical Recruiter for a new evaluation.</p>
            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <p style="margin: 0 0 8px 0;"><strong>Login ID:</strong> {result['login_id']}</p>
                <p style="margin: 0;"><strong>Password:</strong> {result['password']}</p>
            </div>
            <p><strong>Note:</strong> Please save these credentials. For security reasons, the password cannot be retrieved later.</p>
            <p>Please log in to the portal to begin your technical evaluation.</p>
            <p>Best regards,<br>The Recruitment Team</p>
        </div>
        """
        try:
            await send_email(payload.email, subject, body, smtp_config=smtp_config)
            result["email_sent"] = True
        except Exception as e:
            logger.error("tech_recruiter.email_failed", error=str(e))
            result["email_sent"] = False
            result["email_error"] = str(e)

    return {
        "message": "Tech Recruiter credentials generated successfully.",
        "credentials": result
    }


@router.get("/list")
async def list_tech_recruiters(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(hr_only)
):
    """List all tech recruiter credentials created by this HR."""
    user_id = UUID(user.get("sub"))
    stmt = select(TechRecruiterCredential).where(
        TechRecruiterCredential.created_by == user_id
    ).order_by(TechRecruiterCredential.created_at.desc())
    result = await db.execute(stmt)
    credentials = result.scalars().all()

    return [
        {
            "id": str(c.id),
            "login_id": c.login_id,
            "job_id": str(c.job_id),
            "max_marks": c.max_marks,
            "is_active": c.is_active,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in credentials
    ]


@router.delete("/{credential_id}/revoke")
async def revoke_tech_recruiter(
    credential_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(hr_only)
):
    """Deactivate a tech recruiter credential."""
    credential = await db.get(TechRecruiterCredential, credential_id)
    if not credential:
        raise HTTPException(status_code=404, detail="Credential not found.")
    if str(credential.created_by) != user.get("sub"):
        raise HTTPException(status_code=403, detail="You can only revoke credentials you created.")

    credential.is_active = False
    await db.commit()
    return {"message": "Credential revoked successfully.", "login_id": credential.login_id}


@router.delete("/cleanup")
async def cleanup_revoked_credentials(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(hr_only)
):
    """Hard delete all revoked credentials created by this HR."""
    user_id = UUID(user.get("sub"))
    stmt = select(TechRecruiterCredential).where(
        TechRecruiterCredential.created_by == user_id,
        TechRecruiterCredential.is_active == False
    )
    result = await db.execute(stmt)
    credentials = result.scalars().all()
    
    from sqlalchemy import update
    from app.db.models import User
    
    deleted_count = 0
    for cred in credentials:
        # Nullify the credential_id in any marks they submitted to avoid foreign key violation
        update_stmt = update(TechnicalMark).where(
            TechnicalMark.credential_id == cred.id
        ).values(credential_id=None)
        await db.execute(update_stmt)
        
        # Delete the user associated with the credential
        user_to_delete = await db.get(User, cred.recruiter_user_id)
        
        # Delete the credential itself
        await db.delete(cred)
        
        if user_to_delete:
            await db.delete(user_to_delete)
            
        deleted_count += 1
        
    await db.commit()
    return {"message": f"Successfully deleted {deleted_count} revoked accounts.", "deleted_count": deleted_count}


@router.post("/categories/{job_id}")
async def save_categories(
    job_id: UUID,
    payload: SaveCategoriesRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(hr_only)
):
    """HR defines assessment categories for a job."""
    if len(payload.categories) == 0:
        raise HTTPException(status_code=400, detail="At least one category is required.")
    
    categories_data = [c.model_dump() for c in payload.categories]
    result = await save_assessment_categories(job_id, categories_data, db)
    return {
        "message": f"Saved {len(result)} assessment categories.",
        "categories": result
    }


@router.get("/categories/{job_id}")
async def get_categories(
    job_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(verify_token)
):
    """Get assessment categories for a job. Available to HR and tech recruiters."""
    categories = await get_assessment_categories(job_id, db)
    return {"categories": categories}



@router.get("/marks/{job_id}/all")
async def get_marks_for_job(
    job_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(hr_only)
):
    """HR views all submitted marks for a job across all tech recruiters."""
    stmt = (
        select(TechnicalMark)
        .join(TechRecruiterCredential)
        .where(TechnicalMark.job_id == job_id)
    )
    result = await db.execute(stmt)
    marks = result.scalars().all()

    # Also fetch candidate names for display
    candidate_ids = [m.candidate_id for m in marks]
    cand_stmt = select(Candidate).where(Candidate.id.in_(candidate_ids))
    cand_result = await db.execute(cand_stmt)
    cand_map = {c.id: c.full_name for c in cand_result.scalars().all()}

    results = []
    for m in marks:
        cat_breakdown = await get_category_marks_for_technical_mark(m.id, db)
        results.append({
            "id": str(m.id),
            "candidate_id": str(m.candidate_id),
            "candidate_name": cand_map.get(m.candidate_id, "Unknown"),
            "marks_obtained": float(m.marks_obtained),
            "max_marks": m.max_marks,
            "remarks": m.remarks,
            "submitted_at": m.submitted_at.isoformat() if m.submitted_at else None,
            "category_breakdown": cat_breakdown
        })
    return results


# ──────────────────────────────────────────────
# Tech Recruiter-Facing Endpoints
# ──────────────────────────────────────────────

@router.get("/me/credential")
async def get_my_credential(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(tech_recruiter_only)
):
    """Get the tech recruiter's own credential info (job scope, max marks)."""
    user_id = UUID(user.get("sub"))
    credential = await get_credential_for_user(user_id, db)
    if not credential:
        raise HTTPException(status_code=404, detail="No active credential found.")

    return {
        "credential_id": str(credential.id),
        "login_id": credential.login_id,
        "job_id": str(credential.job_id),
        "max_marks": credential.max_marks,
        "is_active": credential.is_active,
    }


@router.get("/candidates")
async def list_candidates_for_recruiter(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(tech_recruiter_only)
):
    """Get all shortlisted candidates for the tech recruiter's scoped job."""
    user_id = UUID(user.get("sub"))
    credential = await get_credential_for_user(user_id, db)
    if not credential:
        raise HTTPException(status_code=404, detail="No active credential found.")

    candidates = await get_shortlisted_candidates(credential.job_id, db)

    # Also fetch existing marks for these candidates
    marks_stmt = select(TechnicalMark).where(
        TechnicalMark.credential_id == credential.id
    )
    marks_result = await db.execute(marks_stmt)
    marks_map = {
        str(m.candidate_id): {
            "marks_obtained": float(m.marks_obtained),
            "max_marks": m.max_marks,
            "remarks": m.remarks,
        }
        for m in marks_result.scalars().all()
    }

    # Attach marks info to candidates
    for cand in candidates:
        cand["marks"] = marks_map.get(cand["id"])
        cand["max_marks"] = credential.max_marks

    return {
        "job_id": str(credential.job_id),
        "max_marks": credential.max_marks,
        "candidates": candidates
    }


@router.get("/candidates/{candidate_id}/questions")
async def get_questions_for_candidate(
    candidate_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(tech_recruiter_only)
):
    """Get interview questions for a specific candidate."""
    user_id = UUID(user.get("sub"))
    credential = await get_credential_for_user(user_id, db)
    if not credential:
        raise HTTPException(status_code=404, detail="No active credential found.")

    # Verify candidate belongs to this job
    candidate = await db.get(Candidate, candidate_id)
    if not candidate or candidate.job_id != credential.job_id:
        raise HTTPException(status_code=404, detail="Candidate not found in your assigned job.")

    questions = await get_candidate_questions(candidate_id, db)

    # Also get existing marks
    marks_stmt = select(TechnicalMark).where(
        TechnicalMark.credential_id == credential.id,
        TechnicalMark.candidate_id == candidate_id
    )
    marks_result = await db.execute(marks_stmt)
    existing_mark = marks_result.scalars().first()

    # Get category breakdown if exists
    existing_category_marks = None
    if existing_mark:
        existing_category_marks = await get_category_marks_for_technical_mark(existing_mark.id, db)

    # Get assessment categories for this job
    categories = await get_assessment_categories(credential.job_id, db)

    return {
        "candidate": {
            "id": str(candidate.id),
            "full_name": candidate.full_name,
            "email": candidate.email,
            "anonymized_id": candidate.anonymized_id,
            "github_username": candidate.github_username,
        },
        "questions": questions,
        "max_marks": credential.max_marks,
        "categories": categories,
        "existing_marks": {
            "marks_obtained": float(existing_mark.marks_obtained),
            "remarks": existing_mark.remarks,
            "category_marks": existing_category_marks or []
        } if existing_mark else None
    }


@router.post("/candidates/{candidate_id}/marks")
async def submit_candidate_marks(
    candidate_id: UUID,
    payload: SubmitMarksRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(tech_recruiter_only)
):
    """Submit or update marks for a candidate."""
    user_id = UUID(user.get("sub"))
    credential = await get_credential_for_user(user_id, db)
    if not credential:
        raise HTTPException(status_code=404, detail="No active credential found.")

    # Validate candidate belongs to this job
    candidate = await db.get(Candidate, candidate_id)
    if not candidate or candidate.job_id != credential.job_id:
        raise HTTPException(status_code=404, detail="Candidate not found in your assigned job.")

    # Validate marks
    if payload.marks_obtained > credential.max_marks:
        raise HTTPException(
            status_code=400,
            detail=f"Marks ({payload.marks_obtained}) cannot exceed maximum ({credential.max_marks})."
        )

    result = await submit_marks(
        credential_id=credential.id,
        candidate_id=candidate_id,
        job_id=credential.job_id,
        marks_obtained=payload.marks_obtained,
        max_marks=credential.max_marks,
        remarks=payload.remarks,
        db=db
    )

    return {
        "message": "Marks submitted successfully.",
        "data": result
    }


@router.post("/candidates/{candidate_id}/category-marks")
async def submit_candidate_category_marks(
    candidate_id: UUID,
    payload: SubmitCategoryMarksRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(tech_recruiter_only)
):
    """Submit per-category marks for a candidate."""
    user_id = UUID(user.get("sub"))
    credential = await get_credential_for_user(user_id, db)
    if not credential:
        raise HTTPException(status_code=404, detail="No active credential found.")

    # Validate candidate belongs to this job
    candidate = await db.get(Candidate, candidate_id)
    if not candidate or candidate.job_id != credential.job_id:
        raise HTTPException(status_code=404, detail="Candidate not found in your assigned job.")

    try:
        category_marks_data = [
            {"category_id": cm.category_id, "marks_obtained": cm.marks_obtained}
            for cm in payload.category_marks
        ]
        result = await submit_category_marks(
            credential_id=credential.id,
            candidate_id=candidate_id,
            job_id=credential.job_id,
            category_marks_data=category_marks_data,
            remarks=payload.remarks,
            db=db
        )
        return {
            "message": "Category marks submitted successfully.",
            "data": result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/my-marks")
async def get_my_submitted_marks(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(tech_recruiter_only)
):
    """Get all marks submitted by this tech recruiter."""
    user_id = UUID(user.get("sub"))
    credential = await get_credential_for_user(user_id, db)
    if not credential:
        raise HTTPException(status_code=404, detail="No active credential found.")

    marks = await get_all_marks(credential.id, db)

    # Fetch candidate names
    candidate_ids = [UUID(m["candidate_id"]) for m in marks]
    if candidate_ids:
        cand_stmt = select(Candidate).where(Candidate.id.in_(candidate_ids))
        cand_result = await db.execute(cand_stmt)
        cand_map = {str(c.id): c.full_name for c in cand_result.scalars().all()}
        for m in marks:
            m["candidate_name"] = cand_map.get(m["candidate_id"], "Unknown")

    return {
        "credential_id": str(credential.id),
        "max_marks": credential.max_marks,
        "marks": marks
    }


@router.post("/candidates/{candidate_id}/questions")
async def generate_candidate_questions(
    candidate_id: UUID,
    category: str = "technical",
    force: bool = False,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(tech_recruiter_only)
):
    """Trigger Question Forge directly by the tech recruiter."""
    user_id = UUID(user.get("sub"))
    credential = await get_credential_for_user(user_id, db)
    if not credential:
        raise HTTPException(status_code=404, detail="No active credential found.")

    # Verify candidate belongs to this job
    candidate = await db.get(Candidate, candidate_id)
    if not candidate or candidate.job_id != credential.job_id:
        raise HTTPException(status_code=404, detail="Candidate not found in your assigned job.")

    from app.modules.candidates.service import generate_interview_questions
    questions = await generate_interview_questions(candidate_id, db, category=category, force=force)
    return {
        "message": "Questions generated successfully.",
        "questions": questions
    }

