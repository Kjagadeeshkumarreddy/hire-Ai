from fastapi import APIRouter, Depends, HTTPException, Body, Query
from typing import List, Optional, Any
import uuid
from uuid import UUID
from sqlalchemy import select, delete, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.middleware.auth import RoleChecker
from .schemas import (
    JDGenerateRequest, JDImproveRequest, JDVersionResponse, 
    JobSimpleResponse, DashboardStatsResponse, RecentApproval,
    DashboardActivityResponse, ActivityItem
)
from app.agents.graph import get_compiled_graph
from app.db.models import (
    Job, JDVersion, Candidate, AuditLog, Resume, 
    Score, GitHubAnalysis, InterviewQuestion, 
    PipelineRun, EmailLog, SavedOffer
)
from sqlalchemy import func
from app.modules.candidates.service import generate_bulk_email_draft, send_bulk_emails, generate_offer_template

# Role-based access control bounds
hr_only = RoleChecker(["hr"])
oversight_only = RoleChecker(["admin", "hr"])
router = APIRouter(prefix="/jd", tags=["Job Descriptions"])

@router.get("/dashboard/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(oversight_only),
    job_id: Optional[UUID] = Query(None)
):
    """Aggregate hiring statistics flawlessly, supporting strict ownership filtering."""
    user_id = UUID(user.get("sub"))
    user_role = user.get("role")
    
    # Base condition for non-admins flawlessy
    ownership_filter = (Job.created_by == user_id) if user_role != "admin" else True

    # 1. Total Candidates (via Jobs owned by user)
    candidate_count_stmt = select(func.count(Candidate.id)).join(Job, Job.id == Candidate.job_id).where(ownership_filter)
    if job_id:
        candidate_count_stmt = candidate_count_stmt.where(Candidate.job_id == job_id)
    candidate_count = (await db.execute(candidate_count_stmt)).scalar() or 0
    
    # 2. Active Job Count
    active_job_stmt = select(func.count(Job.id)).where(Job.status == "active").where(ownership_filter)
    if job_id:
        active_job_stmt = active_job_stmt.where(Job.id == job_id)
    active_job_count = (await db.execute(active_job_stmt)).scalar() or 0
    
    # 3. Interviews Pending (Shortlisted via owned Jobs)
    pending_stmt = select(func.count(Candidate.id)).join(Job, Job.id == Candidate.job_id).where(Candidate.is_shortlisted == True).where(ownership_filter)
    if job_id:
        pending_stmt = pending_stmt.where(Candidate.job_id == job_id)
    pending_count = (await db.execute(pending_stmt)).scalar() or 0
    
    # 4. Action Required (Draft JDs for owned Jobs)
    action_stmt = select(func.count(JDVersion.id)).join(Job, Job.id == JDVersion.job_id).where(JDVersion.status == "draft").where(ownership_filter)
    if job_id:
        action_stmt = action_stmt.where(JDVersion.job_id == job_id)
    action_count = (await db.execute(action_stmt)).scalar() or 0
    
    # 5. Recent HITL Approvals (Latest 5 drafts for owned jobs)
    recent_stmt = (
        select(JDVersion, Job.title)
        .join(Job, Job.id == JDVersion.job_id)
        .where(JDVersion.status == "draft")
        .where(ownership_filter)
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
    user: dict = Depends(oversight_only),
    job_id: Optional[UUID] = Query(None)
):
    """Fetch recent JD-related activities for the pipeline dashboard flawlessly, with strict owner filtering."""
    user_id = UUID(user.get("sub"))
    user_role = user.get("role")
    
    ownership_filter = (Job.created_by == user_id) if user_role != "admin" else True

    stmt = (
        select(AuditLog, Job.title)
        .join(Job, Job.id == AuditLog.job_id)
        .where(AuditLog.action.in_(["jd_generated", "jd_refined", "jd_approved"]))
        .where(ownership_filter)
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
    user: dict = Depends(hr_only)
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
        "input_tone": request.tone,
        "input_template_text": request.template_text
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
async def improve_jd(job_id: UUID, request: JDImproveRequest, db: AsyncSession = Depends(get_db), user: dict = Depends(hr_only)):
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
async def list_jobs(db: AsyncSession = Depends(get_db), user: dict = Depends(oversight_only)):
    """Retrieve all jobs owned by the user flawlessy, or all if admin."""
    user_id = UUID(user.get("sub"))
    user_role = user.get("role")
    
    stmt = select(Job)
    if user_role != "admin":
        stmt = stmt.where(Job.created_by == user_id)
        
    stmt = stmt.order_by(Job.created_at.desc())
    res = await db.execute(stmt)
    jobs = res.scalars().all()
    return jobs

@router.get("/{job_id}/content", response_model=JDVersionResponse)
async def get_jd_content(job_id: UUID, db: AsyncSession = Depends(get_db), user: dict = Depends(oversight_only)):
    """Retrieve the latest approved JD content for a specific job, verifying ownership."""
    user_id = UUID(user.get("sub"))
    user_role = user.get("role")
    
    # Verify job ownership flawlessy
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    if user_role != "admin" and job.created_by != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized access to this job data matrix.")

    stmt = select(JDVersion).where(JDVersion.job_id == job_id).order_by(JDVersion.version.desc())
    res = await db.execute(stmt)
    jd_v = res.scalars().first()
    if not jd_v:
        raise HTTPException(status_code=404, detail="JD content not found.")
    return jd_v

@router.delete("/{job_id}")
async def delete_job(job_id: UUID, db: AsyncSession = Depends(get_db), user: dict = Depends(hr_only)):
    """Fast cascading deletion of a job verifying ownership flawlessy."""
    user_id = UUID(user.get("sub"))
    user_role = user.get("role")
    
    # 1. Verify job exists and ownership flawlessy
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    if user_role != "admin" and job.created_by != user_id:
        raise HTTPException(status_code=403, detail="Deletion rejected. Ownership mismatch detected.")

    # 2. Build candidate subquery once (used by all child deletes)
    candidate_sub = select(Candidate.id).where(Candidate.job_id == job_id).scalar_subquery()

    # 3. Delete all child records in correct FK order (leaves → root)
    # Group A: Records referencing candidates OR job (deepest children first)
    await db.execute(delete(AuditLog).where(
        (AuditLog.job_id == job_id) | (AuditLog.candidate_id.in_(candidate_sub))
    ))
    await db.execute(delete(SavedOffer).where(SavedOffer.job_id == job_id))
    await db.execute(delete(EmailLog).where(
        (EmailLog.job_id == job_id) | (EmailLog.candidate_id.in_(candidate_sub))
    ))
    await db.execute(delete(InterviewQuestion).where(
        (InterviewQuestion.job_id == job_id) | (InterviewQuestion.candidate_id.in_(candidate_sub))
    ))
    await db.execute(delete(Score).where(
        (Score.job_id == job_id) | (Score.candidate_id.in_(candidate_sub))
    ))
    await db.execute(delete(GitHubAnalysis).where(GitHubAnalysis.candidate_id.in_(candidate_sub)))
    await db.execute(delete(Resume).where(Resume.candidate_id.in_(candidate_sub)))

    # Group B: Pipeline runs, candidates, JD versions, then job
    await db.execute(delete(PipelineRun).where(PipelineRun.job_id == job_id))
    await db.execute(delete(Candidate).where(Candidate.job_id == job_id))
    await db.execute(delete(JDVersion).where(JDVersion.job_id == job_id))

    # 4. Delete the job itself
    await db.delete(job)
    await db.commit()

    return {"status": "success", "message": f"Job {job_id} deleted successfully."}

@router.get("/{job_id}/versions", response_model=List[JDVersionResponse])
async def list_jd_versions(job_id: UUID, db: AsyncSession = Depends(get_db), user: dict = Depends(oversight_only)):
    """Retrieve all history versions of JD for a job, verifying ownership."""
    user_id = UUID(user.get("sub"))
    user_role = user.get("role")
    
    job = await db.get(Job, job_id)
    if not job or (user_role != "admin" and job.created_by != user_id):
        raise HTTPException(status_code=403, detail="History access denied.")

    stmt = select(JDVersion).where(JDVersion.job_id == job_id).order_by(JDVersion.version.desc())
    res = await db.execute(stmt)
    return res.scalars().all()

@router.patch("/{job_id}/versions/{version}/approve")
async def approve_jd(
    job_id: UUID, version: int,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(verify_token)
):
    """HITL Approve a JD version verifying ownership flawlessly."""
    user_id = UUID(user.get("sub"))
    user_role = user.get("role")
    
    # Ownership Check
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if user_role != "admin" and job.created_by != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized approval attempt.")

    stmt = select(JDVersion).where(
        JDVersion.job_id == job_id,
        JDVersion.version == version
    )
    result = await db.execute(stmt)
    jd_v = result.scalars().first()
    if not jd_v:
        raise HTTPException(status_code=404, detail="JD version not found")

    if jd_v.status == "approved":
        return {"status": "already_approved", "version": version}

    from sqlalchemy.sql import func as sql_func
    jd_v.status = "approved"
    jd_v.approved_by = UUID(user.get("sub"))
    jd_v.approved_at = sql_func.now()

    # Log audit
    audit = AuditLog(
        job_id=job_id,
        user_id=UUID(user.get("sub")),
        action="jd_approved",
        entity_type="jd_version",
        entity_id=jd_v.id,
        details={"version": version}
    )
    db.add(audit)
    await db.commit()

    return {"status": "approved", "job_id": str(job_id), "version": version}

@router.patch("/{job_id}/versions/{version}/reject")
async def reject_jd(
    job_id: UUID, version: int,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(verify_token)
):
    """HITL Reject a JD version verifying ownership flawlessly."""
    user_id = UUID(user.get("sub"))
    user_role = user.get("role")
    
    # Ownership Check
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if user_role != "admin" and job.created_by != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized rejection attempt.")

    stmt = select(JDVersion).where(
        JDVersion.job_id == job_id,
        JDVersion.version == version
    )
    result = await db.execute(stmt)
    jd_v = result.scalars().first()
    if not jd_v:
        raise HTTPException(status_code=404, detail="JD version not found")

    jd_v.status = "rejected"

    # Log audit
    audit = AuditLog(
        job_id=job_id,
        user_id=UUID(user.get("sub")),
        action="jd_rejected",
        entity_type="jd_version",
        entity_id=jd_v.id,
        details={"version": version}
    )
    db.add(audit)
    await db.commit()

    return {"status": "rejected", "job_id": str(job_id), "version": version}
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
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(verify_token)
):
    """Generate or refine a bulk outreach template verifying ownership flawlessly."""
    user_id = UUID(user.get("sub"))
    user_role = user.get("role")
    
    job = await db.get(Job, id)
    if not job or (user_role != "admin" and job.created_by != user_id):
        raise HTTPException(status_code=403, detail="Access to campaign drafts denied.")

    return await generate_bulk_email_draft(id, db, request.adjustments, request.previous_content)

from app.modules.candidates.service import generate_bulk_email_draft, send_bulk_emails, generate_offer_template, refine_offer_template
from app.modules.candidates.schemas import OfferRefineRequest

@router.post("/{id}/bulk-send")
async def bulk_send_emails(
    id: UUID,
    subject: str = Body(...),
    body: str = Body(...),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(verify_token)
):
    """Execute bulk email campaign verifying ownership flawlessly."""
    user_id = UUID(user.get("sub"))
    user_role = user.get("role")
    
    job = await db.get(Job, id)
    if not job or (user_role != "admin" and job.created_by != user_id):
        raise HTTPException(status_code=403, detail="Campaign execution denied.")

    return await send_bulk_emails(id, subject, body, db, user_id=user_id)

@router.post("/{id}/offer-template")
async def get_offer_template(
    id: UUID, 
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(verify_token)
):
    """Generate a master offer letter template verifying ownership flawlessly."""
    user_id = UUID(user.get("sub"))
    user_role = user.get("role")
    
    job = await db.get(Job, id)
    if not job or (user_role != "admin" and job.created_by != user_id):
        raise HTTPException(status_code=403, detail="Template generation denied.")

    return await generate_offer_template(id, db)

@router.post("/{id}/offer-template/refine")
async def get_refined_offer_template(
    id: UUID, 
    request: OfferRefineRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(verify_token)
):
    """Refine offer template verifying ownership flawlessly."""
    user_id = UUID(user.get("sub"))
    user_role = user.get("role")
    
    job = await db.get(Job, id)
    if not job or (user_role != "admin" and job.created_by != user_id):
        raise HTTPException(status_code=403, detail="Refinement denied.")

    return await refine_offer_template(id, request.html, request.feedback, db)

from .schemas import OfferTemplateSaveRequest
from app.db.models import SavedOffer

@router.post("/{id}/offer-template/save")
async def save_offer_template_endpoint(
    id: UUID, 
    request: OfferTemplateSaveRequest, 
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(hr_only)
):
    """Persist a manually edited offer template for a specific job flawlessly."""
    user_id = UUID(user.get("sub"))
    user_role = user.get("role")
    
    # 1. Verify Ownership
    job = await db.get(Job, id)
    if not job or (user_role != "admin" and job.created_by != user_id):
        raise HTTPException(status_code=403, detail="Unauthorized template persistence attempt.")

    # 2. Check for existing template (SavedOffer with candidate_id=None)
    stmt = select(SavedOffer).where(
        SavedOffer.job_id == id,
        SavedOffer.candidate_id == None
    )
    res = await db.execute(stmt)
    template = res.scalar_one_or_none()
    
    if not template:
        template = SavedOffer(
            job_id=id,
            candidate_id=None,
            created_by=user_id,
            subject=request.subject or f"Master Offer: {job.title}",
            content=request.html
        )
        db.add(template)
    else:
        template.content = request.html
        if request.subject:
            template.subject = request.subject
        template.created_by = user_id
        
    await db.commit()
    return {"status": "success", "message": "Master template saved to Vault flawlessly."}
