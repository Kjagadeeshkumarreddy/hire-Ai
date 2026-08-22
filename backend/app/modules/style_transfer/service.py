import io
import uuid
import fitz  # PyMuPDF
import structlog
from typing import Dict, Any, List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.db.models import ResumeStyleTemplate, StyleTransferJob
from app.modules.resume_parser.service import ResumeParserService
from .ai_logic import StyleTransferAI
from . import template_registry

logger = structlog.get_logger()

class StyleTransferService:

    @staticmethod
    async def create_job(student_id: UUID, db: AsyncSession) -> StyleTransferJob:
        job = StyleTransferJob(student_id=student_id, status="pending")
        db.add(job)
        await db.commit()
        await db.refresh(job)
        return job

    @staticmethod
    async def process_template_transformation(
        job_id: UUID,
        template_id: str,
        candidate_bytes: bytes,
        db: AsyncSession
    ):
        """
        Transformation pipeline using a built-in template from the gallery.
        Loads template markdown directly instead of parsing an uploaded file.
        """
        logger.info("style_transfer.template_processing.started", job_id=str(job_id), template_id=template_id)
        
        try:
            # 1. Load template text from registry
            template_text = template_registry.get_template_text(template_id)
            if not template_text:
                raise ValueError(f"Template '{template_id}' not found or could not be loaded.")
            
            # 2. Parse candidate resume
            candidate_data = ResumeParserService.parse_file_in_memory(candidate_bytes, "candidate.pdf")
            candidate_text = candidate_data.get("raw_text", "")
            
            # 3. Update status to processing
            await db.execute(
                update(StyleTransferJob)
                .where(StyleTransferJob.id == job_id)
                .values(status="processing", progress={"current_step": "transforming_resume", "template_id": template_id})
            )
            await db.commit()
            
            # 4. AI transformation
            final_markdown = await StyleTransferAI.transform_resume(candidate_text, template_text)
            
            # 5. Finalize
            await db.execute(
                update(StyleTransferJob)
                .where(StyleTransferJob.id == job_id)
                .values(
                    status="completed", 
                    output_markdown=final_markdown,
                    progress={"current_step": "completed", "template_id": template_id}
                )
            )
            await db.commit()
            logger.info("style_transfer.template_processing.completed", job_id=str(job_id))

        except Exception as e:
            logger.error("style_transfer.template_processing.failed", job_id=str(job_id), error=str(e))
            await db.execute(
                update(StyleTransferJob)
                .where(StyleTransferJob.id == job_id)
                .values(status="failed", error_message=str(e))
            )
            await db.commit()

    @staticmethod
    async def process_transformation(
        job_id: UUID, 
        template_bytes: bytes, 
        candidate_bytes: bytes, 
        db: AsyncSession
    ):
        """
        Complete transformation pipeline orchestrated section-wise.
        """
        logger.info("style_transfer.processing.started", job_id=str(job_id))
        
        try:
            # 1. Extraction
            template_data = ResumeParserService.parse_file_in_memory(template_bytes, "template.pdf")
            candidate_data = ResumeParserService.parse_file_in_memory(candidate_bytes, "candidate.pdf")
            
            template_text = template_data.get("raw_text", "")
            candidate_text = candidate_data.get("raw_text", "")
            
            # 2. Single-pass transformation
            # Send both raw texts directly to the AI — no lossy JSON intermediary.
            await db.execute(
                update(StyleTransferJob)
                .where(StyleTransferJob.id == job_id)
                .values(status="processing", progress={"current_step": "transforming_resume"})
            )
            await db.commit()
            
            final_markdown = await StyleTransferAI.transform_resume(candidate_text, template_text)
            
            # 3. Finalize
            await db.execute(
                update(StyleTransferJob)
                .where(StyleTransferJob.id == job_id)
                .values(
                    status="completed", 
                    output_markdown=final_markdown,
                    progress={"current_step": "completed"}
                )
            )
            await db.commit()
            logger.info("style_transfer.processing.completed", job_id=str(job_id))

        except Exception as e:
            logger.error("style_transfer.processing.failed", job_id=str(job_id), error=str(e))
            await db.execute(
                update(StyleTransferJob)
                .where(StyleTransferJob.id == job_id)
                .values(status="failed", error_message=str(e))
            )
            await db.commit()

    @staticmethod
    async def get_job_status(job_id: UUID, db: AsyncSession) -> Dict[str, Any]:
        stmt = select(StyleTransferJob).where(StyleTransferJob.id == job_id)
        result = await db.execute(stmt)
        job = result.scalar_one_or_none()
        if not job:
            return None
        return {
            "id": str(job.id),
            "status": job.status,
            "progress": job.progress,
            "output_markdown": job.output_markdown,
            "style_config": job.style_config,
            "error": job.error_message,
            "created_at": job.created_at.isoformat()
        }
