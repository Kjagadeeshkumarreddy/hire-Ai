from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db

router = APIRouter(prefix="/audit", tags=["Audit Log"])

@router.get("/{job_id}/logs")
async def get_job_audit_logs(job_id: UUID, db: AsyncSession = Depends(get_db)):
    """Admin-only endpoint reading paginated audit trails per job."""
    raise HTTPException(status_code=501, detail="Not implemented yet")

@router.get("/candidate/{id}/trail")
async def get_candidate_audit_trail(id: UUID, db: AsyncSession = Depends(get_db)):
    """Fetch complete traceable history for candidate lifecycle."""
    raise HTTPException(status_code=501, detail="Not implemented yet")
