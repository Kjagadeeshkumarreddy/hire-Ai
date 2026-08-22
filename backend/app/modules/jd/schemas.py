from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime

class JDGenerateRequest(BaseModel):
    title: str
    department: Optional[str] = None
    key_requirements: List[str] = Field(default_factory=list)
    seniority_level: str
    tone: str = "professional"
    template_text: Optional[str] = None

class JDImproveRequest(BaseModel):
    feedback: str

class JobSimpleResponse(BaseModel):
    id: UUID
    title: str
    department: Optional[str] = None
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class JDVersionResponse(BaseModel):
    id: UUID
    job_id: UUID
    version: int
    content: str
    structured_data: Optional[Dict[str, Any]] = None
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class RecentApproval(BaseModel):
    id: UUID
    job_id: UUID
    job_title: str
    version: int
    created_at: datetime

class DashboardStatsResponse(BaseModel):
    total_candidates: int
    active_jobs: int
    interviews_pending: int
    action_required: int
    recent_approvals: List[RecentApproval]

class BulkEmailDraftRequest(BaseModel):
    adjustments: Optional[str] = None
    previous_content: Optional[str] = None

class ActivityItem(BaseModel):
    id: UUID
    action: str
    job_title: str
    details: Dict[str, Any]
    created_at: datetime

class DashboardActivityResponse(BaseModel):
    activities: List[ActivityItem]

class OfferTemplateSaveRequest(BaseModel):
    html: str
    subject: Optional[str] = None


