from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth import verify_token, RoleChecker
from app.config import settings
from .service import ESignService

import structlog

logger = structlog.get_logger()

hr_only = RoleChecker(["admin", "hr"])

router = APIRouter(prefix="/esign", tags=["E-Signature"])


# ── Request Schemas ──────────────────────────────────────────────

class SigningRequest(BaseModel):
    saved_offer_id: UUID
    expires_in_days: int = 7  # HR sets this when sending
    frontend_url: Optional[str] = None  # Override for deployed URL


class SignatureSubmission(BaseModel):
    signature_image: Optional[str] = None      # Base64 PNG data URL from canvas
    signature_type: str       # "drawn" or "typed"
    typed_name: Optional[str] = None


# ── HR Endpoints (JWT Protected) ────────────────────────────────

@router.post("/request")
async def create_signing_request(
    request: SigningRequest,
    http_request: Request,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(hr_only),
):
    """HR creates a signing request — sends an email with a unique link to the candidate."""
    user_id = UUID(user.get("sub"))

    # Determine frontend URL
    frontend_url = request.frontend_url or "http://localhost:5173"
    # Try to infer from request origin
    origin = http_request.headers.get("origin")
    if origin and not request.frontend_url:
        frontend_url = origin

    # Fetch sender's SMTP config
    from app.db.models import User
    db_user = await db.get(User, user_id)
    
    if not db_user or not all([db_user.smtp_host, db_user.smtp_user, db_user.smtp_password]):
        raise HTTPException(
            status_code=400, 
            detail="Your SMTP settings are not configured. Please set your email details in your profile before sending offers."
        )

    smtp_config = {
        "smtp_host": db_user.smtp_host,
        "smtp_port": db_user.smtp_port,
        "smtp_user": db_user.smtp_user,
        "smtp_password": db_user.smtp_password,
    }

    try:
        result = await ESignService.create_signing_request(
            saved_offer_id=request.saved_offer_id,
            expires_in_days=request.expires_in_days,
            user_id=user_id,
            frontend_url=frontend_url,
            db=db,
            smtp_config=smtp_config,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("esign.request.failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to create signing request: {str(e)}")


@router.get("/status/{offer_id}")
async def get_signature_status(
    offer_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(hr_only),
):
    """HR checks if a candidate has signed their offer letter."""
    return await ESignService.get_signature_status(offer_id, db)


@router.get("/download/{signature_id}")
async def download_signed_pdf(
    signature_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(hr_only),
):
    """HR downloads the signed PDF with the embedded signature."""
    from fastapi.responses import Response
    from app.db.models import OfferSignature, Candidate

    # Fetch signature and candidate name for a better filename flawlessly
    sig = await db.get(OfferSignature, signature_id)
    candidate_name = "signed_offer"
    if sig:
        candidate = await db.get(Candidate, sig.candidate_id)
        if candidate:
            candidate_name = candidate.full_name.replace(" ", "_")

    pdf_bytes = await ESignService.get_signed_pdf(signature_id, db)
    if not pdf_bytes:
        raise HTTPException(
            status_code=404, 
            detail="Signed PDF not available yet. It might be generating in the background or the offer is not fully signed."
        )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Signed_Offer_{candidate_name}.pdf"},
    )


@router.get("/list")
async def get_signatures_list(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(hr_only),
):
    """HR checks status of all signature requests."""
    return await ESignService.get_signatures_list(db)


@router.post("/hr-sign/{signature_id}")
async def hr_submit_signature(
    signature_id: UUID,
    submission: SignatureSubmission,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(hr_only),
):
    """HR counter-signs the offer after candidate has signed."""
    signer_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    from fastapi import BackgroundTasks
    
    # 1. Finalize the signature record status first flawlessly
    result = await ESignService.hr_submit_signature(
        signature_id=signature_id,
        signature_image=submission.signature_image,
        signature_type=submission.signature_type,
        typed_name=submission.typed_name,
        signer_ip=signer_ip,
        user_agent=user_agent,
        db=db,
    )

    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result["error"])

    # 2. Trigger PDF generation in the background so the user doesn't wait
    background_tasks.add_task(
        ESignService.generate_pdf_background,
        signature_id
    )

    return result



# ── Public Endpoints (No Auth — Token-Based) ────────────────────

@router.get("/sign/{token}")
async def get_offer_for_signing(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint — candidate opens signing link to preview their offer letter."""
    result = await ESignService.get_offer_for_signing(token, db)

    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result["error"])

    return result


@router.post("/sign/{token}/submit")
async def submit_signature(
    token: str,
    submission: SignatureSubmission,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint — candidate submits their drawn/typed signature."""
    # Capture legal metadata
    signer_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    result = await ESignService.submit_signature(
        token=token,
        signature_image=submission.signature_image,
        signature_type=submission.signature_type,
        typed_name=submission.typed_name,
        signer_ip=signer_ip,
        user_agent=user_agent,
        db=db,
    )

    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result["error"])

    return result
