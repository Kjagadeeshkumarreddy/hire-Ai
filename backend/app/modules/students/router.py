from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
from uuid import UUID

from app.db.session import get_db
from app.middleware.auth import verify_token, RoleChecker
from .service import StudentService

router = APIRouter(prefix="/students", tags=["Students"])

student_only = RoleChecker(["student", "admin"])

@router.post("/analyze")
async def analyze_self(
    resume: UploadFile = File(...),
    github_username: str = Form(...),
    jd_text: str = Form(...),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(verify_token)
):
    """
    Endpoint for students to trigger a self-assessment.
    """
    # Verify file type
    if not resume.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF resumes are supported currently.")
    
    resume_bytes = await resume.read()
    user_id = UUID(user.get("sub"))
    
    try:
        result = await StudentService.run_self_assessment(
            user_id=user_id,
            resume_bytes=resume_bytes,
            github_username=github_username,
            jd_text=jd_text,
            db=db
        )
        return result
    except Exception as e:
        import structlog
        logger = structlog.get_logger()
        logger.error("student.analyze.endpoint_failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.get("/history")
async def get_my_history(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(verify_token)
):
    """
    Retrieve history of previous self-assessments for the logged in student.
    """
    user_id = UUID(user.get("sub"))
    return await StudentService.get_history(user_id, db)

@router.get("/assessment/{assessment_id}")
async def get_assessment_details(
    assessment_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(verify_token)
):
    """
    Fetch full details (including breakdown) for a specific assessment.
    """
    user_id = UUID(user.get("sub"))
    details = await StudentService.get_assessment_details(user_id, assessment_id, db)
    if not details:
        raise HTTPException(status_code=404, detail="Assessment not found.")
    return details

@router.delete("/{assessment_id}")
async def delete_assessment(
    assessment_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(verify_token)
):
    """
    Delete a specific assessment from the history.
    """
    user_id = UUID(user.get("sub"))
    success = await StudentService.delete_assessment(user_id, assessment_id, db)
    if not success:
        raise HTTPException(status_code=404, detail="Assessment not found or unauthorized.")
    return {"status": "success"}
