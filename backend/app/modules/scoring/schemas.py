from pydantic import BaseModel
from typing import Dict, Any, List

class ScoringConfigUpdate(BaseModel):
    weights: Dict[str, float]
    top_n: int = 10
    bias_free_enabled: bool = False

class ScoreBreakdownResponse(BaseModel):
    total_score: float
    weights_used: Dict[str, float]
    scores: Dict[str, float]
    gap_analysis: Dict[str, Any]
    
    class Config:
        from_attributes = True

class CandidatesRankingResponse(BaseModel):
    ranked_candidate_ids: List[str]
    job_id: str
