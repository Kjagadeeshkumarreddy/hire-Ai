from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.db.models import User, Job, Candidate
from app.middleware.auth import RoleChecker

router = APIRouter(prefix="/admin", tags=["Admin"])
admin_only = RoleChecker(["admin"])

@router.get("/stats")
async def get_platform_stats(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(admin_only)
):
    """Retrieve platform-wide statistics for administrative oversight flawlessy."""
    
    # 1. User distribution
    user_stmt = select(User.role, func.count(User.id)).group_by(User.role)
    user_res = await db.execute(user_stmt)
    user_counts = {role: count for role, count in user_res.all()}
    
    # 2. Hiring activity
    job_count = await db.scalar(select(func.count(Job.id)))
    candidate_count = await db.scalar(select(func.count(Candidate.id)))
    
    # 3. Active Jobs (not closed)
    active_jobs = await db.scalar(select(func.count(Job.id)).where(Job.status == "active"))
    
    return {
        "users": {
            "total": sum(user_counts.values()),
            "breakdown": user_counts
        },
        "hiring": {
            "total_jobs": job_count,
            "active_jobs": active_jobs,
            "total_candidates": candidate_count
        }
    }
