from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime

class CandidateSummary(BaseModel):
    id: UUID
    anonymized_id: str
    scores: Dict[str, Any]
    skills: List[str]
    experience_years: Optional[float]
    gap_analysis: Optional[Dict[str, Any]]
    
    class Config:
        from_attributes = True

class CandidateDetailResponse(BaseModel):
    id: UUID
    full_name: str
    email: str
    phone: Optional[str] = None
    github_username: Optional[str] = None
    linkedin_url: Optional[str] = None
    pipeline_status: str
    is_shortlisted: bool
    metadata: Dict[str, Any]
    
    # Enrichment fields for Investigation Deep-Dive flawlessly
    scores: Optional[Dict[str, Any]] = None
    github_data: Optional[Dict[str, Any]] = None
    enrichment_data: Optional[Dict[str, Any]] = None
    risk_flags: List[str] = []
    
    created_at: datetime
    
    class Config:
        from_attributes = True

class CandidatesCompareRequest(BaseModel):
    candidate_ids: List[UUID]

class CandidatesCompareResponse(BaseModel):
    candidates: List[CandidateSummary]
    comparison_axes: List[str]
    values: Dict[str, Any]

class PipelineRunResponse(BaseModel):
    pipeline_run_id: UUID
    total_candidates: int
    status: str
    estimated_time_seconds: int

class EmailDraftResponse(BaseModel):
    subject: str
    body: str

class EmailSendRequest(BaseModel):
    subject: str
    body: str

class OfferSendRequest(BaseModel):
    subject: str
    header: str
    content: str

class OfferRefineRequest(BaseModel):
    current_html: str
    feedback: str
