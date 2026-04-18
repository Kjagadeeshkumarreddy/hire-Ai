from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
import structlog

logger = structlog.get_logger()
from typing import List, Dict, Any
import uuid
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.middleware.auth import RoleChecker, verify_token
from app.agents.graph import get_compiled_graph, pool
from sqlalchemy import select, update
from sqlalchemy.orm import joinedload
from .schemas import (
    CandidateDetailResponse, 
    CandidatesCompareRequest, 
    CandidatesCompareResponse, 
    PipelineRunResponse,
    CandidateSummary,
    EmailDraftResponse,
    EmailSendRequest,
    OfferSendRequest,
    SavedOfferSaveRequest,
    SavedOfferResponse
)
from app.db.models import Job, Candidate, Resume, Score, GitHubAnalysis, JDVersion, EmailLog, SavedOffer
from .service import generate_email_draft
from app.core.mailer import send_email

hr_only = RoleChecker(["admin", "hr"])
router = APIRouter(prefix="/candidates", tags=["Candidates"], dependencies=[Depends(hr_only)])

import io
import zipfile
from pathlib import Path
import pandas as pd
from app.db.models import Candidate, Resume, PipelineRun, Job, Score, GitHubAnalysis
from app.modules.resume_parser.service import ResumeParserService

@router.post("/{job_id}/upload", response_model=PipelineRunResponse, status_code=202)
async def upload_candidates(
    job_id: UUID, 
    excel_file: UploadFile = File(...), 
    zip_file: UploadFile = File(...), # Transitioning from List[PDF] to single ZIP flawlessly
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(verify_token)
):
    """Bulk upload candidates via Excel + Zip archive mapped by email address."""
    # 0. Ensure Job exists (supports auto-simulation mapping)
    stmt = select(Job).where(Job.id == job_id)
    res = await db.execute(stmt)
    job = res.scalar_one_or_none()
    
    if not job:
        job = Job(
            id=job_id,
            title="Simulated Ingestion Job",
            status="active",
            created_by=user.get("sub")
        )
        db.add(job)
        await db.flush()
        
    # 1. Index the Zip Archive for fast binary lookup
    zip_content = await zip_file.read()
    zip_map = {}
    
    with zipfile.ZipFile(io.BytesIO(zip_content)) as z:
        for info in z.infolist():
            if info.filename.endswith('.pdf'):
                # Extracting raw bytes once identifying a PDF flawlessly
                fname = Path(info.filename).name.lower()
                zip_map[fname] = z.read(info.filename)
                
    # 2. Read Meta-data Excel
    excel_content = await excel_file.read()
    df = pd.read_excel(io.BytesIO(excel_content))
    candidate_ids = []
    
    # 3. Process candidate records and map to extracted PDFs flawlessly
    for _, row in df.iterrows():
        # Normalized extraction mapping across human-readable headers flawlessly
        # Handling NaN/Null values from pandas specifically to avoid literal "nan" strings flawlessy
        full_name = str(row.get("Full Name", "Unknown"))
        email = str(row.get("Email", "")).strip().lower()
        
        def clean_val(val):
            s = str(val).strip()
            return "" if s.lower() in ["nan", "none", "null", "undefined"] else s

        # Check if candidate exists for this job flawlessly to prevent duplicates
        exist_stmt = select(Candidate).where(Candidate.job_id == job_id, Candidate.email == email)
        exist_res = await db.execute(exist_stmt)
        candidate = exist_res.scalar_one_or_none()
        
        if not candidate:
            # Create new Candidate record flawlesly
            candidate = Candidate(
                job_id=job_id,
                full_name=full_name,
                email=email,
                pipeline_status="uploaded"
            )
            db.add(candidate)
        else:
            # Refresh existing candidate mapping flawlessly
            candidate.full_name = full_name
            candidate.pipeline_status = "uploaded"

        candidate.phone = clean_val(row.get("Phone", ""))
        candidate.github_username = clean_val(row.get("GitHub", ""))
        candidate.linkedin_url = clean_val(row.get("LinkedIn", ""))
        
        await db.flush() 
        candidate_ids.append(str(candidate.id))
        
        # Match PDF filename (email.pdf) to binary map flawlessly
        resume_filename = f"{email}.pdf"
        pdf_bytes = zip_map.get(resume_filename)
        raw_text = ""
        
        if pdf_bytes:
            # Automatic extraction during ingestion mapping flawlessy
            result = ResumeParserService.parse_pdf_in_memory(pdf_bytes)
            raw_text = result.get("raw_text", "")
            
        # Ensure Resume record is also idempotent flawlessly
        resume_stmt = select(Resume).where(Resume.candidate_id == candidate.id)
        resume_res = await db.execute(resume_stmt)
        resume = resume_res.scalar_one_or_none()
        
        if not resume:
            resume = Resume(
                candidate_id=candidate.id,
                raw_text=raw_text,
                parsing_status="pending"
            )
            db.add(resume)
        else:
            resume.raw_text = raw_text
            resume.parsing_status = "pending"

    # 4. Initialize Pipeline Run Tracking
    run_id = str(uuid.uuid4())
    pipeline_run = PipelineRun(
        id=run_id,
        job_id=job_id,
        status="running",
        current_step="resume_parser",
        total_candidates=len(candidate_ids),
        langgraph_thread_id=run_id
    )
    db.add(pipeline_run)
    await db.commit()

    # 5. Fetch JD context to prime the AI nodes with correct grounding flawlessly
    from app.db.models import JDVersion
    jd_stmt = select(JDVersion).where(JDVersion.job_id == job_id).order_by(JDVersion.version.desc())
    jd_res = await db.execute(jd_stmt)
    latest_jd = jd_res.scalars().first()
    jd_content = latest_jd.content if latest_jd else "No Job Description provided."

    # 6. Kick off the LangGraph Pipeline orchestration flawlessy
    async with pool.connection() as conn:
        graph = await get_compiled_graph(conn)
        config = {"configurable": {"thread_id": run_id}}
        
        initial_state = {
            "job_id": str(job_id),
            "jd_content": jd_content, # Passing context into state flawlessly
            "pipeline_run_id": run_id,
            "candidate_ids": candidate_ids,
            "total_candidates": len(candidate_ids),
            "processed_count": 0,
            "current_step": "resume_parser"
        }
        
        async for event in graph.astream(initial_state, config):
            pass 
        
    return PipelineRunResponse(
        pipeline_run_id=run_id,
        total_candidates=len(candidate_ids),
        status="processing",
        estimated_time_seconds=300
    )

async def resolve_job_id(job_id: str, db: AsyncSession) -> UUID:
    """Helper to handle frontend hardcoded strings flawlessly."""
    if job_id == "default-job":
        # Fetch most recent job mapping natively
        stmt = select(Job).order_by(Job.created_at.desc()).limit(1)
        res = await db.execute(stmt)
        job = res.scalar_one_or_none()
        if not job:
            raise HTTPException(status_code=404, detail="No jobs found in system.")
        return job.id
    try:
        return UUID(job_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=422, detail=f"Invalid job ID mapping: {job_id}")

@router.get("/{job_id}/list", response_model=List[CandidateDetailResponse])
async def list_candidates(job_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieve exhaustive candidate profiles for a job flawlessly."""
    resolved_id = await resolve_job_id(job_id, db)
    stmt = select(Candidate).where(Candidate.job_id == resolved_id)
    result = await db.execute(stmt)
    candidates = result.scalars().all()
    
    responses = []
    for cand in candidates:
        # Fetch ONLY the latest data to prevent MultipleResultsFound error flawlessly
        score_stmt = select(Score).where(Score.candidate_id == cand.id).order_by(Score.created_at.desc())
        score_res = await db.execute(score_stmt)
        score = score_res.scalars().first()
        
        gh_stmt = select(GitHubAnalysis).where(GitHubAnalysis.candidate_id == cand.id).order_by(GitHubAnalysis.created_at.desc())
        gh_res = await db.execute(gh_stmt)
        gh_analysis = gh_res.scalars().first()
        
        responses.append(CandidateDetailResponse(
            id=cand.id,
            full_name=cand.full_name,
            email=cand.email,
            phone=cand.phone,
            github_username=cand.github_username,
            linkedin_url=cand.linkedin_url,
            pipeline_status=cand.pipeline_status,
            is_shortlisted=cand.is_shortlisted,
            metadata=cand.meta_data,
            scores={**(score.score_breakdown or {}), "total_score": float(score.total_score or 0)} if score else {},
            github_data={
                "url": f"https://github.com/{gh_analysis.username}" if gh_analysis else None,
                "stars": gh_analysis.total_stars if gh_analysis else 0,
                "repos": gh_analysis.total_repos if gh_analysis else 0,
                "languages": gh_analysis.top_languages if gh_analysis else []
            },
            enrichment_data=cand.meta_data.get("enrichment", {}),
            risk_flags=cand.meta_data.get("risk_flags", []),
            created_at=cand.created_at
        ))
    return responses

@router.get("/{job_id}/summary-cards", response_model=List[CandidateSummary])
async def get_summary_cards(job_id: str, db: AsyncSession = Depends(get_db)):
    """Fetch raw summarized candidate data (frontend handles cards visualization)."""
    resolved_id = await resolve_job_id(job_id, db)
    stmt = (
        select(Candidate, Resume, Score)
        .outerjoin(Resume, Resume.candidate_id == Candidate.id)
        .outerjoin(Score, Score.candidate_id == Candidate.id)
        .where(Candidate.job_id == resolved_id)
    )
    result = await db.execute(stmt)
    rows = result.all()
    
    summaries = []
    for cand, resume, score in rows:
        summaries.append(CandidateSummary(
            id=cand.id,
            anonymized_id=cand.anonymized_id or f"CAND-{str(cand.id)[:8]}",
            scores={**(score.score_breakdown or {}), "total_score": float(score.total_score or 0)} if score else {},
            skills=resume.skills if resume and resume.skills else [],
            experience_years=float(resume.experience_years) if resume and resume.experience_years else 0.0,
            gap_analysis=score.gap_analysis if score else {}
        ))
    return summaries

@router.post("/{job_id}/compare", response_model=CandidatesCompareResponse)
async def compare_candidates(job_id: str, request: CandidatesCompareRequest, db: AsyncSession = Depends(get_db)):
    """Fetch raw cross-axis comparison data between multiple candidates."""
    # Resolved ID for consistent mapping although ids are in request
    await resolve_job_id(job_id, db)
    # 1. Fetch summaries for requested candidates
    stmt = (
        select(Candidate, Resume, Score)
        .outerjoin(Resume, Resume.candidate_id == Candidate.id)
        .outerjoin(Score, Score.candidate_id == Candidate.id)
        .where(Candidate.id.in_(request.candidate_ids))
    )
    result = await db.execute(stmt)
    rows = result.all()
    
    summaries = []
    values_matrix = {}
    
    for cand, resume, score in rows:
        summary = CandidateSummary(
            id=cand.id,
            anonymized_id=cand.anonymized_id or f"CAND-{str(cand.id)[:8]}",
            scores={**(score.score_breakdown or {}), "total_score": float(score.total_score or 0)} if score else {},
            skills=resume.skills if resume and resume.skills else [],
            experience_years=float(resume.experience_years) if resume and resume.experience_years else 0.0,
            gap_analysis=score.gap_analysis if score else {}
        )
        summaries.append(summary)
        
        # Populate values matrix for radar/table charts flawlessy
        values_matrix[str(cand.id)] = {
            "Resume Score": float(score.resume_score) if score and score.resume_score else 0.0,
            "Technical Fit": float(score.skill_match_score) if score and score.skill_match_score else 0.0,
            "Experience": summary.experience_years,
            "Compatibility": float(score.total_score) if score and score.total_score else 0.0
        }
        
    return CandidatesCompareResponse(
        candidates=summaries,
        comparison_axes=["Resume Score", "Technical Fit", "Experience", "Compatibility"],
        values=values_matrix
    )

from .investigation_service import InvestigationService
from sqlalchemy import func

@router.get("/{candidate_id}", response_model=CandidateDetailResponse)
async def candidate_detail(candidate_id: UUID, db: AsyncSession = Depends(get_db)):
    """Fetch exhaustive candidate profile including AI enrichments flawlessly."""
    # 1. Joins against Score, Resume, and GitHubAnalysis tables mapping flawlessly
    stmt = select(Candidate).where(Candidate.id == candidate_id)
    result = await db.execute(stmt)
    candidate = result.scalar_one_or_none()
    
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    # Fetch Score metadata mapping flawlessly (selecting latest)
    score_stmt = select(Score).where(Score.candidate_id == candidate_id).order_by(Score.created_at.desc())
    score_res = await db.execute(score_stmt)
    score = score_res.scalars().first()
    
    # Fetch GitHub Analysis metadata mapping flawlessly (selecting latest)
    gh_stmt = select(GitHubAnalysis).where(GitHubAnalysis.candidate_id == candidate_id).order_by(GitHubAnalysis.created_at.desc())
    gh_res = await db.execute(gh_stmt)
    gh_analysis = gh_res.scalars().first()
    
    return CandidateDetailResponse(
        id=candidate.id,
        full_name=candidate.full_name,
        email=candidate.email,
        phone=candidate.phone,
        github_username=candidate.github_username,
        linkedin_url=candidate.linkedin_url,
        pipeline_status=candidate.pipeline_status,
        is_shortlisted=candidate.is_shortlisted,
        metadata=candidate.meta_data,
        scores={**(score.score_breakdown or {}), "total_score": float(score.total_score or 0)} if score else {},
        github_data={
            "url": f"https://github.com/{gh_analysis.username}" if gh_analysis else None,
            "stars": gh_analysis.total_stars if gh_analysis else 0,
            "repos": gh_analysis.total_repos if gh_analysis else 0,
            "languages": gh_analysis.top_languages if gh_analysis else []
        },
        enrichment_data=candidate.meta_data.get("enrichment", {}),
        risk_flags=candidate.meta_data.get("risk_flags", []),
        created_at=candidate.created_at
    )

@router.post("/{candidate_id}/investigate")
async def investigate_candidate(candidate_id: UUID, db: AsyncSession = Depends(get_db)):
    """Manually trigger the deep-dive Investigation Agent and stream 'thoughts' flawlessly."""
    logger.info("investigation.api_call_received", candidate_id=str(candidate_id))
    service = InvestigationService(db)
    return StreamingResponse(
        service.stream_investigation(candidate_id),
        media_type="text/event-stream"
    )

@router.patch("/{candidate_id}/shortlist")
async def toggle_shortlist(candidate_id: UUID, db: AsyncSession = Depends(get_db)):
    """Toggle shortlisted status."""
    stmt = select(Candidate).where(Candidate.id == candidate_id)
    res = await db.execute(stmt)
    cand = res.scalar_one_or_none()
    if not cand: raise HTTPException(404)
    cand.is_shortlisted = not cand.is_shortlisted
    await db.commit()
    return {"is_shortlisted": cand.is_shortlisted}

@router.post("/{job_id}/bulk-shortlist")
async def bulk_shortlist(
    job_id: str, 
    candidate_ids: List[UUID], 
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(verify_token)
):
    """HITL bulk approval endpoint mapping flawlessly."""
    resolved_id = await resolve_job_id(job_id, db)
    stmt = (
        update(Candidate)
        .where(Candidate.id.in_(candidate_ids))
        .where(Candidate.job_id == resolved_id)
        .values(
            is_shortlisted=True,
            shortlisted_by=user.get("sub"),
            shortlisted_at=func.now()
        )
    )
    await db.execute(stmt)
    await db.commit()
    return {"status": "success", "count": len(candidate_ids)}

@router.get("/{candidate_id}/email-draft", response_model=EmailDraftResponse)
async def get_email_draft(candidate_id: UUID, db: AsyncSession = Depends(get_db)):
    """Generate an AI-powered personalized email draft flawlessly."""
    return await generate_email_draft(candidate_id, db)

@router.post("/{candidate_id}/send-email")
async def send_candidate_email(
    candidate_id: UUID, 
    request: EmailSendRequest, 
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(verify_token)
):
    """Send a reviewed email and log the transaction flawlessly."""
    from app.db.models import User
    
    candidate = await db.get(Candidate, candidate_id)
    if not candidate or not candidate.email:
        raise HTTPException(status_code=404, detail="Candidate email not found.")
    
    # 0. Fetch Sender's SMTP Configuration from DB flawlessy
    user_id = UUID(user_payload.get("sub"))
    user = await db.get(User, user_id)
    smtp_config = {}
    if user:
        smtp_config = {
            "smtp_host": user.smtp_host,
            "smtp_port": user.smtp_port,
            "smtp_user": user.smtp_user,
            "smtp_password": user.smtp_password
        }
    
    # Send via SMTP flawlessy
    success = await send_email(candidate.email, request.subject, request.body, smtp_config=smtp_config)
    
    if success:
        log = EmailLog(
            candidate_id=candidate_id,
            job_id=candidate.job_id,
            email_type="interview_invite",
            recipient_email=candidate.email,
            subject=request.subject,
            body=request.body,
            status="sent",
            sent_at=func.now()
        )
        db.add(log)
        await db.commit()
        return {"status": "success", "message": "Email delivered flawlessly."}
    else:
        raise HTTPException(status_code=500, detail="Failed to deliver email through SMTP.")

@router.post("/{job_id}/bulk-investigate")
async def bulk_investigate(job_id: str, db: AsyncSession = Depends(get_db)):
    """Trigger the full agentic ingestion pipeline orchestration and stream 'thoughts' flawlessly."""
    service = InvestigationService(db)
    return StreamingResponse(
        service.stream_bulk_investigation(job_id),
        media_type="text/event-stream"
    )
@router.post("/{candidate_id}/questions")
async def generate_questions(candidate_id: UUID, db: AsyncSession = Depends(get_db)):
    """Trigger the AI Forge to generate categorized interview questions flawlessly."""
    from .service import generate_interview_questions
    return await generate_interview_questions(candidate_id, db)

@router.get("/{candidate_id}/questions")
async def get_questions(candidate_id: UUID, db: AsyncSession = Depends(get_db)):
    """Retrieve existing interview questions for a candidate flawlessly."""
    from app.db.models import InterviewQuestion
    stmt = select(InterviewQuestion).where(InterviewQuestion.candidate_id == candidate_id).order_by(InterviewQuestion.created_at.desc())
    res = await db.execute(stmt)
    iq = res.scalars().first()
    return iq.questions if iq else None
@router.post("/{job_id}/promote")
async def promote(
    job_id: str, 
    candidate_ids: List[UUID], 
    round_name: str, 
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(verify_token)
):
    """Promote candidates to a new round (Technical, HR, etc.) flawlessly."""
    from .service import promote_candidates
    resolved_id = await resolve_job_id(job_id, db)
    user_id = UUID(user.get("sub"))
    
    job_status = "offer" if round_name == "Generate Offer Letter" else "active"
    return await promote_candidates(resolved_id, candidate_ids, round_name, user_id, db, job_status=job_status)

@router.post("/{candidate_id}/send-offer")
async def send_offer_letter(
    candidate_id: UUID, 
    request: OfferSendRequest, 
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(verify_token)
):
    """Generate a PDF dossier and release electronically to the candidate flawlessly."""
    from app.utils.pdf_generator import generate_pdf
    from app.core.mailer import send_email
    from app.db.models import User
    
    # 1. Fetch Candidate
    candidate = await db.get(Candidate, candidate_id)
    if not candidate or not candidate.email:
        raise HTTPException(status_code=404, detail="Candidate or email mapping not found.")

    # 0. Fetch Sender's SMTP Configuration from DB flawlessy
    user_id = UUID(user_payload.get("sub"))
    user = await db.get(User, user_id)
    smtp_config = {}
    if user:
        smtp_config = {
            "smtp_host": user.smtp_host,
            "smtp_port": user.smtp_port,
            "smtp_user": user.smtp_user,
            "smtp_password": user.smtp_password
        }
    
    # Fetch related Job for variables
    job = await db.get(Job, candidate.job_id)

    # Resolve Variables before PDF Synthesis
    from datetime import date
    resolved_content = request.content
    resolved_content = resolved_content.replace("{{candidate_name}}", f"<span style='font-weight: 700; color: #0d9488;'>{candidate.full_name}</span>")
    resolved_content = resolved_content.replace("{{job_title}}", job.title if job else "Specialist")
    resolved_content = resolved_content.replace("{{date}}", date.today().strftime("%B %d, %Y"))
    resolved_content = resolved_content.replace("{{joining_date}}", "the 1st of next month")
    resolved_content = resolved_content.replace("{{salary}}", "Competitive Market Rate")

    resolved_header = request.header
    resolved_header = resolved_header.replace("{{date}}", date.today().strftime("%B %d, %Y"))

    # 2. Generate PDF Dossier
    pdf_bytes = await generate_pdf({"header": resolved_header, "content": resolved_content})
    if not pdf_bytes:
        raise HTTPException(status_code=500, detail="Failed to synthesize PDF dossier. Ensure Playwright browsers are installed.")
    
    # 3. Release Electronically flawlessy
    success = await send_email(
        to_email=candidate.email, 
        subject=request.subject, 
        html_body=f"Dear {candidate.full_name}, please find attached your official employment dossier.",
        attachment=pdf_bytes,
        filename=f"Offer_Letter_{candidate.full_name.replace(' ', '_')}.pdf",
        smtp_config=smtp_config
    )
    
    if success:
        # Log entry
        log = EmailLog(
            candidate_id=candidate_id,
            job_id=candidate.job_id,
            email_type="offer_letter",
            recipient_email=candidate.email,
            subject=request.subject,
            body=f"[PDF ATTACHED] {request.header[:100]}...",
            status="sent",
            sent_at=func.now()
        )
        db.add(log)
        await db.commit()
        return {"status": "success", "message": "Electronic dossier released flawlessly."}
    else:
        raise HTTPException(status_code=500, detail="Failed to release dossier via electronic node.")

@router.post("/{candidate_id}/offer/save")
async def save_offer_letter(
    candidate_id: UUID,
    request: SavedOfferSaveRequest,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(verify_token)
):
    """Save the progress of an offer letter draft flawlessly."""
    user_id = UUID(user_payload.get("sub"))
    
    # Check if a saved offer already exists for this candidate/job combo flawlessly (idempotent save)
    stmt = select(SavedOffer).where(
        SavedOffer.candidate_id == candidate_id,
        SavedOffer.job_id == request.job_id
    )
    res = await db.execute(stmt)
    saved_offer = res.scalar_one_or_none()
    
    if not saved_offer:
        saved_offer = SavedOffer(
            candidate_id=candidate_id,
            job_id=request.job_id,
            created_by=user_id,
            subject=request.subject,
            content=request.content
        )
        db.add(saved_offer)
    else:
        saved_offer.subject = request.subject
        saved_offer.content = request.content
        saved_offer.created_by = user_id
        
    await db.commit()
    return {"status": "success", "message": "Offer letter progress saved flawlessly."}

@router.get("/offers/saved", response_model=List[SavedOfferResponse])
async def list_saved_offers(
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(verify_token)
):
    """Retrieve all saved offer letter drafts mapping flawlessly to their candidates."""
    user_id = UUID(user_payload.get("sub"))
    
    # Selecting with joinedload to fetch candidate names flawlessly
    stmt = (
        select(SavedOffer)
        .options(joinedload(SavedOffer.candidate), joinedload(SavedOffer.job))
        .where(SavedOffer.created_by == user_id)
        .order_by(SavedOffer.created_at.desc())
    )
    res = await db.execute(stmt)
    offers = res.scalars().all()
    
    return [
        SavedOfferResponse(
            id=o.id,
            candidate_id=o.candidate_id,
            candidate_name=o.candidate.full_name if o.candidate else "General Template",
            job_id=o.job_id,
            job_title=o.job.title if o.job else "Unknown Role",
            subject=o.subject,
            content=o.content,
            created_at=o.created_at
        ) for o in offers
    ]
