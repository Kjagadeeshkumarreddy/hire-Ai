import random
import string
import bcrypt
import structlog
from uuid import UUID
from typing import Dict, Any, List
from sqlalchemy import select
from sqlalchemy.sql import func
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import (
    User, TechRecruiterCredential, TechnicalMark,
    Candidate, InterviewQuestion, AssessmentCategory, CategoryMark
)

logger = structlog.get_logger()


async def generate_unique_login_id(db: AsyncSession) -> str:
    """Generate a unique 'TR-XXXXXX' format login ID, verified against DB."""
    while True:
        random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        login_id = f"TR-{random_part}"
        stmt = select(TechRecruiterCredential).where(
            TechRecruiterCredential.login_id == login_id
        )
        result = await db.execute(stmt)
        if not result.scalars().first():
            return login_id


def generate_password(length: int = 12) -> str:
    """Generate a random alphanumeric password."""
    chars = string.ascii_letters + string.digits
    return ''.join(random.choices(chars, k=length))


async def create_tech_recruiter(
    job_id: UUID,
    max_marks: int,
    created_by_user_id: UUID,
    db: AsyncSession
) -> Dict[str, Any]:
    """Create a tech recruiter user + credential. Returns login_id and plain password."""
    login_id = await generate_unique_login_id(db)
    plain_password = generate_password()

    # Hash password for the user record
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(
        plain_password.encode('utf-8'), salt
    ).decode('utf-8')

    # Create the User with role=tech_recruiter
    # Use login_id as email since User requires email, and it's unique per credential
    new_user = User(
        email=f"{login_id.lower()}@tech-recruiter.internal",
        hashed_password=hashed_password,
        full_name=f"Tech Recruiter {login_id}",
        role="tech_recruiter"
    )
    db.add(new_user)
    await db.flush()  # get user ID without committing

    # Create the credential record
    credential = TechRecruiterCredential(
        recruiter_user_id=new_user.id,
        created_by=created_by_user_id,
        job_id=job_id,
        login_id=login_id,
        max_marks=max_marks
    )
    db.add(credential)
    await db.commit()
    await db.refresh(credential)

    logger.info(
        "tech_recruiter.created",
        login_id=login_id,
        job_id=str(job_id),
        created_by=str(created_by_user_id)
    )

    return {
        "login_id": login_id,
        "password": plain_password,
        "credential_id": str(credential.id),
        "max_marks": max_marks,
        "job_id": str(job_id)
    }


async def get_credential_for_user(
    user_id: UUID, db: AsyncSession
) -> TechRecruiterCredential | None:
    """Get the active credential for a tech recruiter user."""
    stmt = select(TechRecruiterCredential).where(
        TechRecruiterCredential.recruiter_user_id == user_id,
        TechRecruiterCredential.is_active == True
    )
    result = await db.execute(stmt)
    return result.scalars().first()


async def get_shortlisted_candidates(
    job_id: UUID, db: AsyncSession
) -> List[Dict[str, Any]]:
    """Get all shortlisted candidates for a job."""
    stmt = select(Candidate).where(
        Candidate.job_id == job_id,
        Candidate.is_shortlisted == True
    )
    result = await db.execute(stmt)
    candidates = result.scalars().all()

    return [
        {
            "id": str(c.id),
            "full_name": c.full_name,
            "email": c.email,
            "anonymized_id": c.anonymized_id,
            "pipeline_status": c.pipeline_status,
            "github_username": c.github_username,
        }
        for c in candidates
    ]


async def get_candidate_questions(
    candidate_id: UUID, db: AsyncSession
) -> List[Dict[str, Any]]:
    """Get all interview questions for a candidate."""
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
            "question_category": r.question_category,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in records
    ]


async def submit_marks(
    credential_id: UUID,
    candidate_id: UUID,
    job_id: UUID,
    marks_obtained: float,
    max_marks: int,
    remarks: str | None,
    db: AsyncSession
) -> Dict[str, Any]:
    """Submit marks for a candidate. Upserts if already exists."""
    # Check if marks already exist for this credential+candidate
    stmt = select(TechnicalMark).where(
        TechnicalMark.credential_id == credential_id,
        TechnicalMark.candidate_id == candidate_id
    )
    result = await db.execute(stmt)
    existing = result.scalars().first()

    if existing:
        # Update existing marks
        existing.marks_obtained = marks_obtained
        existing.max_marks = max_marks
        existing.remarks = remarks
        await db.commit()
        await db.refresh(existing)
        logger.info("tech_recruiter.marks_updated", candidate_id=str(candidate_id))
        return {
            "id": str(existing.id),
            "candidate_id": str(candidate_id),
            "marks_obtained": float(existing.marks_obtained),
            "max_marks": existing.max_marks,
            "remarks": existing.remarks,
            "status": "updated"
        }
    else:
        # Create new marks
        mark = TechnicalMark(
            credential_id=credential_id,
            candidate_id=candidate_id,
            job_id=job_id,
            marks_obtained=marks_obtained,
            max_marks=max_marks,
            remarks=remarks
        )
        db.add(mark)
        await db.commit()
        await db.refresh(mark)
        logger.info("tech_recruiter.marks_submitted", candidate_id=str(candidate_id))
        return {
            "id": str(mark.id),
            "candidate_id": str(candidate_id),
            "marks_obtained": float(mark.marks_obtained),
            "max_marks": mark.max_marks,
            "remarks": mark.remarks,
            "status": "created"
        }


async def get_all_marks(
    credential_id: UUID, db: AsyncSession
) -> List[Dict[str, Any]]:
    """Get all marks submitted by a tech recruiter."""
    stmt = select(TechnicalMark).where(
        TechnicalMark.credential_id == credential_id
    )
    result = await db.execute(stmt)
    marks = result.scalars().all()

    return [
        {
            "id": str(m.id),
            "candidate_id": str(m.candidate_id),
            "job_id": str(m.job_id),
            "marks_obtained": float(m.marks_obtained),
            "max_marks": m.max_marks,
            "remarks": m.remarks,
            "submitted_at": m.submitted_at.isoformat() if m.submitted_at else None,
        }
        for m in marks
    ]





# ──────────────────────────────────────────────
# Assessment Categories
# ──────────────────────────────────────────────

async def save_assessment_categories(
    job_id: UUID,
    categories: List[Dict[str, Any]],
    db: AsyncSession
) -> List[Dict[str, Any]]:
    """Replace all assessment categories for a job with the provided list."""
    from sqlalchemy import delete
    
    # Delete existing categories for this job
    await db.execute(
        delete(AssessmentCategory).where(AssessmentCategory.job_id == job_id)
    )
    
    results = []
    for i, cat in enumerate(categories):
        new_cat = AssessmentCategory(
            job_id=job_id,
            name=cat["name"],
            max_marks=cat["max_marks"],
            display_order=i
        )
        db.add(new_cat)
        await db.flush()
        results.append({
            "id": str(new_cat.id),
            "name": new_cat.name,
            "max_marks": new_cat.max_marks,
            "display_order": new_cat.display_order
        })
    
    await db.commit()
    logger.info("assessment_categories.saved", job_id=str(job_id), count=len(results))
    return results


async def get_assessment_categories(
    job_id: UUID,
    db: AsyncSession
) -> List[Dict[str, Any]]:
    """Get all assessment categories for a job, ordered by display_order."""
    stmt = (
        select(AssessmentCategory)
        .where(AssessmentCategory.job_id == job_id)
        .order_by(AssessmentCategory.display_order)
    )
    result = await db.execute(stmt)
    cats = result.scalars().all()
    
    return [
        {
            "id": str(c.id),
            "name": c.name,
            "max_marks": c.max_marks,
            "display_order": c.display_order
        }
        for c in cats
    ]


async def submit_category_marks(
    credential_id: UUID,
    candidate_id: UUID,
    job_id: UUID,
    category_marks_data: List[Dict[str, Any]],
    remarks: str | None,
    db: AsyncSession
) -> Dict[str, Any]:
    """Submit per-category marks for a candidate. Auto-calculates total."""
    # Validate categories exist and compute totals
    total_obtained = 0.0
    total_max = 0
    
    for cm in category_marks_data:
        cat = await db.get(AssessmentCategory, UUID(cm["category_id"]))
        if not cat:
            raise ValueError(f"Category {cm['category_id']} not found")
        if cm["marks_obtained"] > cat.max_marks:
            raise ValueError(f"Marks for '{cat.name}' ({cm['marks_obtained']}) exceed max ({cat.max_marks})")
        total_obtained += cm["marks_obtained"]
        total_max += cat.max_marks
    
    # Upsert TechnicalMark (parent record)
    stmt = select(TechnicalMark).where(
        TechnicalMark.credential_id == credential_id,
        TechnicalMark.candidate_id == candidate_id
    )
    result = await db.execute(stmt)
    existing = result.scalars().first()
    
    if existing:
        existing.marks_obtained = total_obtained
        existing.max_marks = total_max
        existing.remarks = remarks
        existing.edited_at = func.now()
        await db.flush()
        tech_mark = existing
        status = "updated"
        
        # Delete old category marks
        from sqlalchemy import delete
        await db.execute(
            delete(CategoryMark).where(CategoryMark.technical_mark_id == tech_mark.id)
        )
    else:
        tech_mark = TechnicalMark(
            credential_id=credential_id,
            candidate_id=candidate_id,
            job_id=job_id,
            marks_obtained=total_obtained,
            max_marks=total_max,
            remarks=remarks
        )
        db.add(tech_mark)
        await db.flush()
        status = "created"
    
    # Insert category marks
    for cm in category_marks_data:
        cat_mark = CategoryMark(
            technical_mark_id=tech_mark.id,
            category_id=UUID(cm["category_id"]),
            marks_obtained=cm["marks_obtained"]
        )
        db.add(cat_mark)
    
    await db.commit()
    await db.refresh(tech_mark)
    
    logger.info("tech_recruiter.category_marks_submitted", 
                candidate_id=str(candidate_id), 
                total=total_obtained)
    
    return {
        "id": str(tech_mark.id),
        "candidate_id": str(candidate_id),
        "marks_obtained": float(tech_mark.marks_obtained),
        "max_marks": tech_mark.max_marks,
        "remarks": tech_mark.remarks,
        "status": status
    }


async def get_category_marks_for_technical_mark(
    technical_mark_id: UUID,
    db: AsyncSession
) -> List[Dict[str, Any]]:
    """Get the per-category breakdown for a specific technical mark."""
    stmt = (
        select(CategoryMark, AssessmentCategory)
        .join(AssessmentCategory, CategoryMark.category_id == AssessmentCategory.id)
        .where(CategoryMark.technical_mark_id == technical_mark_id)
        .order_by(AssessmentCategory.display_order)
    )
    result = await db.execute(stmt)
    rows = result.all()
    
    return [
        {
            "category_id": str(cat.id),
            "category_name": cat.name,
            "marks_obtained": float(cm.marks_obtained),
            "max_marks": cat.max_marks
        }
        for cm, cat in rows
    ]
