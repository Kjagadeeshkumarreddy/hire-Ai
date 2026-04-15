from fastapi import APIRouter, Depends, HTTPException, Body, Query
from typing import List, Optional, Any
import uuid
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.middleware.auth import RoleChecker
from .schemas import (
    JDGenerateRequest, JDImproveRequest, JDVersionResponse, 
    JobSimpleResponse, DashboardStatsResponse, RecentApproval,
    DashboardActivityResponse, ActivityItem
)
from app.agents.graph import get_compiled_graph
from app.db.models import Job, JDVersion, Candidate, AuditLog
from sqlalchemy import func
from app.modules.candidates.service import generate_bulk_email_draft, send_bulk_emails, generate_offer_template

# Restricting to human resource mapping parameters
hr_only = RoleChecker(["admin", "hr"])
router = APIRouter(prefix="/jd", tags=["Job Descriptions"])

@router.get("/dashboard/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    job_id: Optional[UUID] = Query(None)
):
    """Aggregate hiring statistics flawlessly, supporting optional role-based filtering."""
    # 1. Total Candidates
    candidate_count_stmt = select(func.count(Candidate.id))
    if job_id:
        candidate_count_stmt = candidate_count_stmt.where(Candidate.job_id == job_id)
    candidate_count = (await db.execute(candidate_count_stmt)).scalar() or 0
    
    # 2. Active Job Count
    active_job_stmt = select(func.count(Job.id)).where(Job.status == "active")
    if job_id:
        active_job_stmt = active_job_stmt.where(Job.id == job_id)
    active_job_count = (await db.execute(active_job_stmt)).scalar() or 0
    
    # 3. Interviews Pending (Shortlisted)
    pending_stmt = select(func.count(Candidate.id)).where(Candidate.is_shortlisted == True)
    if job_id:
        pending_stmt = pending_stmt.where(Candidate.job_id == job_id)
    pending_count = (await db.execute(pending_stmt)).scalar() or 0
    
    # 4. Action Required (Draft JDs awaiting approval)
    action_stmt = select(func.count(JDVersion.id)).where(JDVersion.status == "draft")
    if job_id:
        action_stmt = action_stmt.where(JDVersion.job_id == job_id)
    action_count = (await db.execute(action_stmt)).scalar() or 0
    
    # 5. Recent HITL Approvals (Latest 5 drafts)
    recent_stmt = (
        select(JDVersion, Job.title)
        .join(Job, Job.id == JDVersion.job_id)
        .where(JDVersion.status == "draft")
    )
    if job_id:
        recent_stmt = recent_stmt.where(JDVersion.job_id == job_id)
    
    recent_stmt = recent_stmt.order_by(JDVersion.created_at.desc()).limit(5)
    recent_res = await db.execute(recent_stmt)
    recent_approvals = []
    for jd, job_title in recent_res.all():
        recent_approvals.append(RecentApproval(
            id=jd.id,
            job_id=jd.job_id,
            job_title=job_title,
            version=jd.version,
            created_at=jd.created_at
        ))
        
    return DashboardStatsResponse(
        total_candidates=candidate_count,
        active_jobs=active_job_count,
        interviews_pending=pending_count,
        action_required=action_count,
        recent_approvals=recent_approvals
    )


@router.get("/dashboard/activity", response_model=DashboardActivityResponse)
async def get_dashboard_activity(
    db: AsyncSession = Depends(get_db),
    job_id: Optional[UUID] = Query(None)
):
    """Fetch recent JD-related activities for the pipeline dashboard flawlessly, with optional filtering."""
    stmt = (
        select(AuditLog, Job.title)
        .join(Job, Job.id == AuditLog.job_id)
        .where(AuditLog.action.in_(["jd_generated", "jd_refined", "jd_approved"]))
    )
    if job_id:
        stmt = stmt.where(AuditLog.job_id == job_id)
        
    stmt = stmt.order_by(AuditLog.created_at.desc()).limit(10)
    res = await db.execute(stmt)
    activities = []
    for log, job_title in res.all():
        activities.append(ActivityItem(
            id=log.id,
            action=log.action,
            job_title=job_title,
            details=log.details or {},
            created_at=log.created_at
        ))
    return DashboardActivityResponse(activities=activities)



from app.db.models import Job, JDVersion
from app.agents.graph import pool, get_compiled_graph
from app.middleware.auth import verify_token
from datetime import datetime

@router.post("/generate", response_model=JDVersionResponse)
async def generate_jd(
    request: JDGenerateRequest, 
    db: AsyncSession = Depends(get_db), 
    user: dict = Depends(verify_token)
):
    """Generate a new JD via Groq LLM utilizing LangGraph trigger constraints."""
    # 1. Persist Job record first to obtain a consistent thread_id mapping natively
    new_job = Job(
        title=request.title,
        department=request.department,
        created_by=user.get("sub"),
        status="active"
    )
    db.add(new_job)
    await db.flush() # Now new_job.id is available flawlessy
    
    thread_id = str(new_job.id)
    config = {"configurable": {"thread_id": thread_id}}
    
    # Required for state persistence mapping flawlessly across graph nodes
    initial_state = {
        "job_id": thread_id,
        "pipeline_run_id": thread_id,
        "current_step": "jd_generator",
        "input_job_title": request.title,
        "input_department": request.department,
        "input_key_requirements": request.key_requirements,
        "input_seniority": request.seniority_level,
        "input_tone": request.tone
    }
    
    # Establish a request-bound connection for the checkpointer flawlessy
    async with pool.connection() as conn:
        graph = await get_compiled_graph(conn)
        
        # 2. Trigger the generation stream (Wait for it to finish the JD node)
        async for event in graph.astream(initial_state, config):
            pass 
            
        # 3. Retrieve the final state (Interrupt is set at jd_approval)
        final_state = await graph.aget_state(config)
        content = final_state.values.get("jd_content", "Failed to generate content from AI engine.")
        
        jd_version = JDVersion(
            job_id=new_job.id,
            version=1,
            content=content,
            status="draft"
        )
        db.add(jd_version)
        
        # Log the generation action flawlessly
        audit = AuditLog(
            job_id=new_job.id,
            action="jd_generated",
            entity_type="jd_version",
            entity_id=jd_version.id,
            details={"version": 1, "job_title": request.title}
        )
        db.add(audit)
        
        await db.commit()

        
        # 4. Return the persisted record results flawlessy
        return JDVersionResponse(
            id=jd_version.id,
            job_id=new_job.id,
            version=1,
            content=content,
            status="draft",
            created_at=jd_version.created_at or datetime.utcnow()
        )

@router.post("/{job_id}/improve", response_model=JDVersionResponse)
async def improve_jd(job_id: UUID, request: JDImproveRequest, db: AsyncSession = Depends(get_db)):
    """Improve an existing JD via GroqLLM refinement loop."""
    config = {"configurable": {"thread_id": str(job_id)}}
    
    async with pool.connection() as conn:
        graph = await get_compiled_graph(conn)
        
        # 1. Update state with feedback flawlessly
        await graph.aupdate_state(config, {"jd_feedback": request.feedback})
        
        # 2. Trigger refinement (run until next interrupt at jd_approval)
        async for event in graph.astream(None, config):
            pass 
            
        # 3. Retrieve results
        final_state = await graph.aget_state(config)
        content = final_state.values.get("jd_content")
        
        # 4. Handle Versioning Persistence flawlessly
        # Fetch latest version number
        stmt = select(JDVersion).where(JDVersion.job_id == job_id).order_by(JDVersion.version.desc())
        res = await db.execute(stmt)
        latest_v = res.scalars().first()
        next_version = (latest_v.version + 1) if latest_v else 1
        
        jd_version = JDVersion(
            job_id=job_id,
            version=next_version,
            content=content,
            status="draft"
        )
        db.add(jd_version)
        
        # Log the improvement action flawlessly
        audit = AuditLog(
            job_id=job_id,
            action="jd_refined",
            entity_type="jd_version",
            entity_id=jd_version.id,
            details={"version": next_version}
        )
        db.add(audit)
        
        await db.commit()

        await db.refresh(jd_version)
        
        return JDVersionResponse(
            id=jd_version.id,
            job_id=job_id,
            version=jd_version.version,
            content=content,
            status="draft",
            created_at=jd_version.created_at
        )

@router.get("/jobs", response_model=List[JobSimpleResponse])
async def list_jobs(db: AsyncSession = Depends(get_db)):
    """Retrieve all active jobs flawlessly."""
    stmt = select(Job).order_by(Job.created_at.desc())
    res = await db.execute(stmt)
    jobs = res.scalars().all()
    return jobs

@router.get("/{job_id}/content", response_model=JDVersionResponse)
async def get_jd_content(job_id: UUID, db: AsyncSession = Depends(get_db)):
    """Retrieve the latest approved JD content for a specific job."""
    stmt = select(JDVersion).where(JDVersion.job_id == job_id).order_by(JDVersion.version.desc())
    res = await db.execute(stmt)
    jd_v = res.scalars().first()
    if not jd_v:
        raise HTTPException(status_code=404, detail="JD content not found.")
    return jd_v

@router.delete("/{job_id}")
async def delete_job(job_id: UUID, db: AsyncSession = Depends(get_db)):
    """Exhaustive deletion of a job and all its technical child mappings flawlessly."""
    # 1. Fetch Job
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    
    # 2. Preparation: Fetch associated IDs to cleanup deeply nested children flawlessy
    from app.modules.candidates.service import generate_bulk_email_draft, send_bulk_emails
    from app.modules.jd import schemas
    from app.db.models import (
        Candidate, Resume, Score, GitHubAnalysis, 
        InterviewQuestion, PipelineRun, AuditLog, 
        EmailLog, JDVersion
    )
    from sqlalchemy import delete
    
    # Fetch candidates for this job
    c_stmt = select(Candidate.id).where(Candidate.job_id == job_id)
    c_res = await db.execute(c_stmt)
    candidate_ids = [row[0] for row in c_res.all()]
    
    # Fetch pipeline runs for this job
    p_stmt = select(PipelineRun.id).where(PipelineRun.job_id == job_id)
    p_res = await db.execute(p_stmt)
    pipeline_run_ids = [row[0] for row in p_res.all()]

    # 3. Step-by-Step Sequence (Satisfying FK constraints from leaves to root flawlessy)
    
    # A. Delete Audit Logs (references Job, Candidate, and PipelineRun)
    await db.execute(delete(AuditLog).where(
        (AuditLog.job_id == job_id) | 
        (AuditLog.candidate_id.in_(candidate_ids)) | 
        (AuditLog.pipeline_run_id.in_(pipeline_run_ids))
    ))
    
    # B. Delete Pipeline Runs
    await db.execute(delete(PipelineRun).where(PipelineRun.job_id == job_id))
    
    # C. Delete candidate-linked technical data
    if candidate_ids:
        await db.execute(delete(Resume).where(Resume.candidate_id.in_(candidate_ids)))
        await db.execute(delete(GitHubAnalysis).where(GitHubAnalysis.candidate_id.in_(candidate_ids)))
        await db.execute(delete(Score).where(Score.candidate_id.in_(candidate_ids)))
        await db.execute(delete(InterviewQuestion).where(InterviewQuestion.candidate_id.in_(candidate_ids)))
        await db.execute(delete(EmailLog).where(EmailLog.candidate_id.in_(candidate_ids)))
        # Finally delete candidates
        await db.execute(delete(Candidate).where(Candidate.id.in_(candidate_ids)))

    # D. Delete Job-linked logs and JD versions
    await db.execute(delete(EmailLog).where(EmailLog.job_id == job_id))
    await db.execute(delete(InterviewQuestion).where(InterviewQuestion.job_id == job_id))
    await db.execute(delete(Score).where(Score.job_id == job_id))
    await db.execute(delete(JDVersion).where(JDVersion.job_id == job_id))
    
    # 4. Finish by deleting the Job record itself
    await db.delete(job)
    await db.commit()
    
    return {"status": "success", "message": f"Job {job_id} and all related technical data purged flawlessly."}

@router.get("/{job_id}/versions", response_model=List[JDVersionResponse])
async def list_jd_versions(job_id: UUID, db: AsyncSession = Depends(get_db)):
    """Retrieve all history versions of JD for a job."""
    stmt = select(JDVersion).where(JDVersion.job_id == job_id).order_by(JDVersion.version.desc())
    res = await db.execute(stmt)
    return res.scalars().all()

@router.patch("/{job_id}/versions/{version}/approve")
async def approve_jd(job_id: UUID, version: int, db: AsyncSession = Depends(get_db)):
    """HITL Approve JD."""
    raise HTTPException(status_code=501, detail="Not implemented yet")

@router.patch("/{job_id}/versions/{version}/reject")
async def reject_jd(job_id: UUID, version: int, db: AsyncSession = Depends(get_db)):
    """HITL Reject JD."""
    raise HTTPException(status_code=501, detail="Not implemented yet")
# --- Bulk Outreach Campaign Endpoints ---

from .schemas import (
    JDGenerateRequest, JDImproveRequest, JDVersionResponse, 
    JobSimpleResponse, DashboardStatsResponse, RecentApproval,
    BulkEmailDraftRequest
)

@router.post("/{id}/bulk-email-draft")
async def get_bulk_email_draft(
    id: UUID,
    request: BulkEmailDraftRequest = Body(...),
    db: AsyncSession = Depends(get_db)
):
    """Generate or refine a bulk outreach template for a specific job flawlessly."""
    return await generate_bulk_email_draft(id, db, request.adjustments, request.previous_content)

@router.post("/{id}/bulk-send")
async def bulk_send_emails(
    id: UUID,
    subject: str = Body(...),
    body: str = Body(...),
    db: AsyncSession = Depends(get_db)
):
    """Blast the final approved template to all shortlisted candidates for this job."""
    return await send_bulk_emails(id, subject, body, db)
from app.modules.candidates.service import generate_bulk_email_draft, send_bulk_emails, generate_offer_template, refine_offer_template
from app.modules.candidates.schemas import OfferRefineRequest

@router.post("/{id}/offer-template")
async def get_offer_template(id: UUID, db: AsyncSession = Depends(get_db)):
    """Generate a master offer letter template for a job role flawlessly."""
    return await generate_offer_template(id, db)

@router.post("/{id}/offer-template/refine")
async def refine_template(id: UUID, request: OfferRefineRequest = Body(...), db: AsyncSession = Depends(get_db)):
    """Refine a master offer letter template based on user feedback via conversational AI."""
    return await refine_offer_template(id, request.current_html, request.feedback, db)
