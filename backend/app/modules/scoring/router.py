from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from .schemas import ScoringConfigUpdate, ScoreBreakdownResponse, CandidatesRankingResponse

router = APIRouter(prefix="/scores", tags=["Scoring"])

@router.post("/{job_id}/run")
async def trigger_scoring(job_id: UUID, db: AsyncSession = Depends(get_db)):
    """Trigger scoring pipeline for the specified job."""
    raise HTTPException(status_code=501, detail="Not implemented yet")

@router.get("/{job_id}/ranking", response_model=CandidatesRankingResponse)
async def get_candidate_ranking(job_id: UUID, db: AsyncSession = Depends(get_db)):
    """Fetch descending ranking list mappings."""
    raise HTTPException(status_code=501, detail="Not implemented yet")

@router.patch("/{job_id}/config")
async def update_scoring_config(job_id: UUID, config: ScoringConfigUpdate, db: AsyncSession = Depends(get_db)):
    """Admin configuration hook to control metric weighting parameters."""
    raise HTTPException(status_code=501, detail="Not implemented yet")

@router.get("/{candidate_id}/breakdown", response_model=ScoreBreakdownResponse)
async def get_score_breakdown(candidate_id: UUID, db: AsyncSession = Depends(get_db)):
    """Retrieve fine detail on score application logic via specific instance."""
    raise HTTPException(status_code=501, detail="Not implemented yet")
