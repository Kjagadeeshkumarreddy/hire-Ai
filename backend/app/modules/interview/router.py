from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db

router = APIRouter(prefix="/interview", tags=["Interview"])

@router.post("/{candidate_id}/generate")
async def generate_interview_questions(candidate_id: UUID, db: AsyncSession = Depends(get_db)):
    """Generate interview questions via Groq."""
    raise HTTPException(status_code=501, detail="Not implemented yet")

@router.patch("/{id}/approve")
async def approve_interview_questions(id: UUID, db: AsyncSession = Depends(get_db)):
    """HITL Approve questions."""
    raise HTTPException(status_code=501, detail="Not implemented yet")
