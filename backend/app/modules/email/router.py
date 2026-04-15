from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db

router = APIRouter(prefix="/email", tags=["Email"])

@router.post("/{job_id}/send-shortlist")
async def send_shortlist_emails(job_id: UUID, db: AsyncSession = Depends(get_db)):
    """Trigger email dispatches to all shortlisted candidates."""
    raise HTTPException(status_code=501, detail="Not implemented yet")

@router.get("/{job_id}/status")
async def get_email_status(job_id: UUID, db: AsyncSession = Depends(get_db)):
    """Retrieve completion and failure statuses for batches."""
    raise HTTPException(status_code=501, detail="Not implemented yet")
