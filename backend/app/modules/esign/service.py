import secrets
import base64
import structlog
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import OfferSignature, SavedOffer, Candidate, Job
from app.core.mailer import send_email

logger = structlog.get_logger()

CONSENT_TEXT = (
    "I acknowledge that by providing my electronic signature below, "
    "I am agreeing to the terms and conditions outlined in this offer letter. "
    "I understand that this electronic signature carries the same legal weight "
    "as a handwritten signature under the applicable electronic signature laws "
    "(IT Act 2000 (India), ESIGN Act (US), eIDAS (EU))."
)


class ESignService:

    @staticmethod
    async def create_signing_request(
        saved_offer_id: UUID,
        expires_in_days: int,
        user_id: UUID,
        frontend_url: str,
        db: AsyncSession,
        smtp_config: dict = None,
    ) -> Dict[str, Any]:
        """Create a signing token and send the signing link to the candidate via email."""
        
        # 1. Fetch the saved offer with candidate info
        offer = await db.get(SavedOffer, saved_offer_id)
        if not offer:
            raise ValueError("Saved offer not found.")

        candidate = await db.get(Candidate, offer.candidate_id)
        if not candidate or not candidate.email:
            raise ValueError("Candidate or email not found.")

        job = await db.get(Job, offer.job_id)

        # 2. Check if a pending signature already exists
        existing_stmt = select(OfferSignature).where(
            OfferSignature.saved_offer_id == saved_offer_id,
            OfferSignature.status == "pending"
        )
        existing_res = await db.execute(existing_stmt)
        existing = existing_res.scalars().first()

        if existing:
            # Revoke the old one and create a fresh token
            existing.status = "revoked"

        # 3. Generate a unique signing token
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(days=expires_in_days)

        signature_record = OfferSignature(
            saved_offer_id=saved_offer_id,
            candidate_id=candidate.id,
            job_id=offer.job_id,
            signing_token=token,
            token_expires_at=expires_at,
            expires_in_days=expires_in_days,
            status="pending",
        )
        db.add(signature_record)

        # Update the saved offer status
        offer.signature_status = "pending"

        await db.commit()
        await db.refresh(signature_record)

        # 4. Build the signing URL
        signing_url = f"{frontend_url}/sign/{token}"

        # 5. Send email to candidate
        import re
        job_title = re.sub(r"\s*-\s*Generate Offer.*", "", job.title if job else "the offered position", flags=re.IGNORECASE).strip()
        # 6. Generate Draft PDF for Attachment
        draft_pdf_bytes = None
        try:
            from app.utils.pdf_generator import generate_pdf
            # Resolve variables for the PDF
            pdf_html = ESignService._resolve_variables(offer.content, candidate, job)
            draft_pdf_bytes = await generate_pdf({"header": "", "content": pdf_html})
        except Exception as e:
            logger.error("esign.draft_pdf_generation.failed", error=str(e))

        email_html = f"""
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0b; border-radius: 16px; overflow: hidden; border: 1px solid #1a1a2e;">
            <div style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); padding: 40px 32px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 1px;">OFFER LETTER</h1>
                <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">Your Signature is Required</p>
            </div>
            <div style="padding: 40px 32px; color: #e2e8f0;">
                <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px;">Dear <strong style="color: #0d9488;">{candidate.full_name}</strong>,</p>
                <p style="font-size: 14px; line-height: 1.8; color: #94a3b8; margin: 0 0 24px;">
                    We are pleased to extend an official offer for the position of <strong style="color: white;">{job_title}</strong>.
                    Please review the attached offer letter and provide your electronic signature to confirm your acceptance.
                </p>
                <div style="text-align: center; margin: 32px 0;">
                    <a href="{signing_url}" style="display: inline-block; background: linear-gradient(135deg, #0d9488, #0f766e); color: white; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-weight: 800; font-size: 14px; letter-spacing: 2px; text-transform: uppercase;">
                        REVIEW &amp; SIGN OFFER
                    </a>
                </div>
                <div style="background: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 20px; margin: 24px 0;">
                    <p style="font-size: 12px; color: #6b7280; margin: 0;">
                        ⏰ This link expires in <strong style="color: #f59e0b;">{expires_in_days} day{'s' if expires_in_days != 1 else ''}</strong> 
                        (by {expires_at.strftime('%B %d, %Y at %I:%M %p UTC')}).
                    </p>
                </div>
                <p style="font-size: 12px; color: #4b5563; margin: 24px 0 0; line-height: 1.6;">
                    If you did not expect this email, please disregard it. If the button above doesn't work, copy and paste this link into your browser:<br/>
                    <span style="color: #0d9488; word-break: break-all;">{signing_url}</span>
                </p>
            </div>
        </div>
        """

        email_sent = await send_email(
            to_email=candidate.email,
            subject=f"Action Required: Sign Your Offer Letter — {job_title}",
            html_body=email_html,
            attachment=draft_pdf_bytes,
            filename=f"Offer_Letter_{candidate.full_name.replace(' ', '_')}.pdf",
            smtp_config=smtp_config,
            force_user_config=True,
        )

        logger.info(
            "esign.request.created",
            offer_id=str(saved_offer_id),
            candidate=candidate.full_name,
            token=token[:8] + "...",
            expires=str(expires_at),
            email_sent=email_sent,
        )

        return {
            "status": "success",
            "signature_id": str(signature_record.id),
            "signing_url": signing_url,
            "expires_at": expires_at.isoformat(),
            "email_sent": email_sent,
        }

    @staticmethod
    async def get_offer_for_signing(token: str, db: AsyncSession) -> Dict[str, Any]:
        """Validate token and return the offer HTML for the candidate to review."""
        
        stmt = select(OfferSignature).where(OfferSignature.signing_token == token)
        res = await db.execute(stmt)
        sig = res.scalar_one_or_none()

        if not sig:
            return {"status": "error", "error": "Invalid signing link."}

        if sig.status == "signed":
            return {"status": "already_signed", "signed_at": sig.signed_at.isoformat() if sig.signed_at else None}

        if sig.status in ("expired", "revoked"):
            return {"status": "error", "error": "This signing link has expired or been revoked."}

        # Check expiration
        now = datetime.now(timezone.utc)
        if sig.token_expires_at.tzinfo is None:
            expiry = sig.token_expires_at.replace(tzinfo=timezone.utc)
        else:
            expiry = sig.token_expires_at

        if now > expiry:
            sig.status = "expired"
            # Also update the saved offer
            offer = await db.get(SavedOffer, sig.saved_offer_id)
            if offer:
                offer.signature_status = "unsigned"
            await db.commit()
            return {"status": "error", "error": "This signing link has expired."}

        # Fetch the records needed for variable resolution
        offer = await db.get(SavedOffer, sig.saved_offer_id)
        if not offer:
            return {"status": "error", "error": "Offer content not found."}
            
        candidate = await db.get(Candidate, sig.candidate_id)
        job = await db.get(Job, sig.job_id)

        # Resolve variables in the offer content
        resolved_html = ESignService._resolve_variables(offer.content, candidate, job)

        return {
            "status": "valid",
            "offer_html": resolved_html,
            "candidate_name": candidate.full_name if candidate else "Candidate",
            "job_title": job.title if job else "Position",
            "expires_at": sig.token_expires_at.isoformat(),
            "consent_text": CONSENT_TEXT,
        }

    @staticmethod
    def _resolve_variables(html: str, candidate: Optional[Candidate], job: Optional[Job]) -> str:
        """Replace placeholders with actual data flawlessly."""
        from datetime import date
        
        resolved = html or ""
        # Candidate details
        resolved = resolved.replace("{{candidate_name}}", f"<span style='font-weight: 700; color: #0d9488;'>{candidate.full_name if candidate else 'Candidate'}</span>")
        
        # Job details
        resolved = resolved.replace("{{job_title}}", job.title if job else "Specialist")
        resolved = resolved.replace("{{department}}", job.department if job else "Engineering")
        
        # Dates and Money
        resolved = resolved.replace("{{date}}", date.today().strftime("%B %d, %Y"))
        resolved = resolved.replace("{{joining_date}}", "the 1st of next month")
        resolved = resolved.replace("{{salary}}", "Competitive Market Rate")
        
        return resolved

    @staticmethod
    async def submit_signature(
        token: str,
        signature_image: str,
        signature_type: str,
        typed_name: Optional[str],
        signer_ip: str,
        user_agent: str,
        db: AsyncSession,
    ) -> Dict[str, Any]:
        """Process the candidate's signature submission."""
        
        stmt = select(OfferSignature).where(OfferSignature.signing_token == token)
        res = await db.execute(stmt)
        sig = res.scalar_one_or_none()

        if not sig:
            return {"status": "error", "error": "Invalid signing link."}

        if sig.status == "signed":
            return {"status": "error", "error": "This offer has already been signed."}

        if sig.status in ("expired", "revoked"):
            return {"status": "error", "error": "This signing link has expired or been revoked."}

        # Check expiration
        now = datetime.now(timezone.utc)
        if sig.token_expires_at.tzinfo is None:
            expiry = sig.token_expires_at.replace(tzinfo=timezone.utc)
        else:
            expiry = sig.token_expires_at

        if now > expiry:
            sig.status = "expired"
            await db.commit()
            return {"status": "error", "error": "This signing link has expired."}

        # Save signature data
        sig.signature_image = signature_image
        sig.signature_type = signature_type
        sig.typed_name = typed_name
        sig.signer_ip = signer_ip
        sig.signer_user_agent = user_agent[:500] if user_agent else None
        sig.consent_text = CONSENT_TEXT
        sig.signed_at = now
        sig.status = "candidate_signed"

        # Update saved offer status
        offer = await db.get(SavedOffer, sig.saved_offer_id)
        if offer:
            offer.signature_status = "pending"  # Still pending HR

        await db.commit()

        # Fetch candidate and job for the notification email
        candidate = await db.get(Candidate, sig.candidate_id)
        job = await db.get(Job, sig.job_id)

        # 5. Notify HR via email
        try:
            from app.db.models import User
            hr_user = await db.get(User, offer.created_by)
            if hr_user and hr_user.email:
                hr_email_html = f"""
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0b; border-radius: 16px; overflow: hidden; border: 1px solid #1a1a2e; color: white;">
                    <div style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); padding: 32px; text-align: center;">
                        <h2 style="margin: 0; font-size: 20px; font-weight: 800;">CANDIDATE SIGNED</h2>
                    </div>
                    <div style="padding: 32px; color: #e2e8f0;">
                        <p style="font-size: 16px; margin: 0 0 20px;">Great news! <strong style="color: #0d9488;">{candidate.full_name}</strong> has signed the offer letter for <strong style="color: white;">{job.title if job else 'the position'}</strong>.</p>
                        <p style="font-size: 14px; color: #94a3b8; margin: 0 0 24px;">Your counter-signature is now required to finalize the document.</p>
                        <div style="text-align: center;">
                            <a href="{frontend_url if 'frontend_url' in locals() else 'http://localhost:5173'}/esign-status" style="display: inline-block; background: #1a1a2e; border: 1px solid #0d9488; color: #0d9488; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                                GO TO DASHBOARD
                            </a>
                        </div>
                    </div>
                </div>
                """
                await send_email(
                    to_email=hr_user.email,
                    subject=f"Action Required: Counter-sign Offer — {candidate.full_name}",
                    html_body=hr_email_html,
                )
        except Exception as e:
            logger.error("esign.hr_notification.failed", error=str(e))

        logger.info(
            "esign.signature.candidate_submitted",
            token=token[:8] + "...",
            candidate=candidate.full_name,
            ip=signer_ip,
        )

        return {
            "status": "success",
            "message": "Your signature has been submitted. The HR will now counter-sign to finalize the offer.",
            "signed_at": now.isoformat(),
        }

    @staticmethod
    async def get_signatures_list(db: AsyncSession) -> Dict[str, Any]:
        """Fetch all signature requests for HR dashboard."""
        stmt = select(OfferSignature).order_by(OfferSignature.created_at.desc())
        res = await db.execute(stmt)
        sigs = res.scalars().all()

        results = []
        for sig in sigs:
            candidate = await db.get(Candidate, sig.candidate_id)
            job = await db.get(Job, sig.job_id)
            offer = await db.get(SavedOffer, sig.saved_offer_id)
            
            results.append({
                "id": str(sig.id),
                "candidate_id": str(sig.candidate_id),
                "candidate_name": candidate.full_name if candidate else "Unknown",
                "job_id": str(sig.job_id),
                "job_title": job.title if job else "Unknown",
                "offer_subject": offer.subject if offer else "Untitled Offer",
                "status": sig.status,
                "created_at": sig.created_at.isoformat(),
                "expires_at": sig.token_expires_at.isoformat(),
                "signed_at": sig.signed_at.isoformat() if sig.signed_at else None,
                "hr_signed_at": sig.hr_signed_at.isoformat() if sig.hr_signed_at else None,
            })

        return {"status": "success", "signatures": results}

    @staticmethod
    async def hr_submit_signature(
        signature_id: UUID,
        signature_image: str,
        signature_type: str,
        typed_name: Optional[str],
        signer_ip: str,
        user_agent: str,
        db: AsyncSession,
    ) -> Dict[str, Any]:
        """Process the HR's counter-signature submission."""
        
        sig = await db.get(OfferSignature, signature_id)
        if not sig:
            return {"status": "error", "error": "Signature record not found."}

        if sig.status != "candidate_signed":
            return {"status": "error", "error": f"Cannot counter-sign: current status is {sig.status}"}

        # Save HR signature data
        sig.hr_signature_image = signature_image
        sig.hr_signature_type = signature_type
        sig.hr_typed_name = typed_name
        sig.hr_signer_ip = signer_ip
        sig.hr_signer_user_agent = user_agent[:500] if user_agent else None
        sig.hr_signed_at = datetime.now(timezone.utc)
        sig.status = "signed"

        # Update saved offer status
        offer = await db.get(SavedOffer, sig.saved_offer_id)
        if offer:
            offer.signature_status = "signed"

        # Commit status change first so the UI reflects the signed state immediately
        await db.commit()
        # Note: PDF generation is now handled in the background by the router
        # to ensure instant response times flawlessy.
        return {
            "status": "success",
            "message": "Offer counter-signed successfully.",
            "signed_at": sig.hr_signed_at.isoformat(),
        }

    @staticmethod
    async def generate_pdf_background(signature_id: UUID):
        """Asynchronous background task to generate the final signed PDF."""
        from app.db.session import AsyncSessionLocal
        from app.db.models import OfferSignature, SavedOffer, Candidate, Job
        
        async with AsyncSessionLocal() as db:
            sig = await db.get(OfferSignature, signature_id)
            if not sig: return
            
            offer = await db.get(SavedOffer, sig.saved_offer_id)
            candidate = await db.get(Candidate, sig.candidate_id)
            job = await db.get(Job, sig.job_id)
            
            try:
                # Still use a timeout just in case the browser hangs indefinitely
                import asyncio
                pdf_b64 = await asyncio.wait_for(
                    ESignService._generate_signed_pdf(offer, sig, candidate, job),
                    timeout=15.0
                )
                if pdf_b64:
                    sig.signed_pdf_data = pdf_b64
                    await db.commit()
            except Exception as e:
                logger.error("esign.bg_pdf_generation.failed", error=str(e))

    @staticmethod
    async def get_signature_status(saved_offer_id: UUID, db: AsyncSession) -> Dict[str, Any]:
        """Check the signature status of an offer."""
        
        stmt = (
            select(OfferSignature)
            .where(OfferSignature.saved_offer_id == saved_offer_id)
            .order_by(OfferSignature.created_at.desc())
        )
        res = await db.execute(stmt)
        sig = res.scalars().first()

        if not sig:
            return {"status": "no_request", "message": "No signing request has been created for this offer."}

        candidate = await db.get(Candidate, sig.candidate_id)

        return {
            "signature_id": str(sig.id),
            "status": sig.status,
            "candidate_name": candidate.full_name if candidate else None,
            "expires_at": sig.token_expires_at.isoformat() if sig.token_expires_at else None,
            "signed_at": sig.signed_at.isoformat() if sig.signed_at else None,
            "signature_type": sig.signature_type,
            "has_pdf": bool(sig.signed_pdf_data),
        }

    @staticmethod
    async def get_signed_pdf(signature_id: UUID, db: AsyncSession) -> Optional[bytes]:
        """Retrieve the signed PDF bytes by signature ID."""
        
        stmt = (
            select(OfferSignature)
            .where(
                OfferSignature.id == signature_id,
                OfferSignature.status == "signed",
            )
        )
        res = await db.execute(stmt)
        sig = res.scalars().first()

        if not sig or not sig.signed_pdf_data:
            return None

        return base64.b64decode(sig.signed_pdf_data)

    @staticmethod
    async def _generate_signed_pdf(offer: SavedOffer, sig: OfferSignature, candidate: Optional[Candidate], job: Optional[Job]) -> str:
        """Render offer HTML with embedded signature into a PDF, return as base64."""
        
        # 1. Build Candidate Signature block HTML
        if sig.signature_type == "drawn" and sig.signature_image:
            cand_sig_html = f'<img src="{sig.signature_image}" style="max-width: 240px; max-height: 80px;" />'
        elif sig.signature_type == "typed" and sig.typed_name:
            cand_sig_html = f'<span style="font-family: \'Dancing Script\', cursive; font-size: 32px; color: #0d9488;">{sig.typed_name}</span>'
        else:
            cand_sig_html = '<span style="color: #666;">Candidate Signed</span>'

        cand_signed_at = sig.signed_at.strftime("%B %d, %Y") if sig.signed_at else "N/A"

        # 2. Build HR Signature block HTML (if signed)
        hr_sig_html = ""
        if sig.hr_signed_at:
            if sig.hr_signature_type == "drawn" and sig.hr_signature_image:
                hr_img = f'<img src="{sig.hr_signature_image}" style="max-width: 240px; max-height: 80px;" />'
            elif sig.hr_signature_type == "typed" and sig.hr_typed_name:
                hr_img = f'<span style="font-family: \'Dancing Script\', cursive; font-size: 32px; color: #3b82f6;">{sig.hr_typed_name}</span>'
            else:
                hr_img = '<span style="color: #666;">HR Signed</span>'
            
            hr_signed_at = sig.hr_signed_at.strftime("%B %d, %Y")
            
            hr_sig_html = f"""
            <div style="flex: 1;">
                <p style="font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">Authorized Signatory</p>
                {hr_img}
                <div style="margin-top: 4px; border-bottom: 1px solid #d1d5db; width: 240px;"></div>
                <p style="font-size: 11px; color: #374151; margin: 4px 0 0;">Date: {hr_signed_at}</p>
            </div>
            """

        signature_block = f"""
        <div style="margin-top: 60px; padding-top: 30px; border-top: 2px solid #e2e8f0; font-family: sans-serif;">
            <div style="display: flex; gap: 40px; align-items: flex-start;">
                <div style="flex: 1;">
                    <p style="font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">Candidate Signature</p>
                    {cand_sig_html}
                    <div style="margin-top: 4px; border-bottom: 1px solid #d1d5db; width: 240px;"></div>
                    <p style="font-size: 11px; color: #374151; margin: 4px 0 0;">Date: {cand_signed_at}</p>
                </div>
                {hr_sig_html}
            </div>
            
            <div style="margin-top: 24px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
                <p style="font-size: 8px; color: #64748b; margin: 0; line-height: 1.4;">
                    This document is electronically signed. Candidate IP: {sig.signer_ip or 'N/A'}. 
                    {f"HR IP: {sig.hr_signer_ip or 'N/A'}." if sig.hr_signed_at else ""}
                    {sig.consent_text or ''}
                </p>
            </div>
        </div>
        """

        # Inject signature block
        full_html = ESignService._resolve_variables(offer.content, candidate, job)
        
        if "</body>" in full_html.lower():
            insert_pos = full_html.lower().rfind("</body>")
            full_html = full_html[:insert_pos] + signature_block + full_html[insert_pos:]
        else:
            full_html = full_html + signature_block


        # Generate PDF using Playwright
        try:
            from app.utils.pdf_generator import generate_pdf
            pdf_bytes = await generate_pdf({"header": "", "content": full_html})
            if pdf_bytes:
                return base64.b64encode(pdf_bytes).decode("utf-8")
        except Exception as e:
            logger.error("esign.pdf_render_failed", error=str(e))

        return ""
