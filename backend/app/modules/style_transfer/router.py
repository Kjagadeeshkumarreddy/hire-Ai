from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import Dict, Any, Optional
import structlog
import re
import io
from docx import Document
from docx.shared import Pt, RGBColor

logger = structlog.get_logger()

from app.db.session import get_db
from app.middleware.auth import verify_token, RoleChecker
from .service import StyleTransferService
from .ai_logic import StyleTransferAI
from . import template_registry
from pydantic import BaseModel
from app.utils.pdf_generator import generate_pdf

router = APIRouter(prefix="/style-transfer", tags=["Style Transfer"])

# Restrict to students and admins
student_only = RoleChecker(["student", "admin"])

# ─── Template Gallery Endpoints ────────────────────────────────────────────

@router.get("/templates")
async def list_templates(
    user: dict = Depends(verify_token),
    role: bool = Depends(student_only)
):
    """
    Returns the list of all available built-in resume templates with metadata.
    """
    templates = template_registry.get_all_templates()
    return {"templates": templates}


@router.get("/templates/{template_id}/preview")
async def preview_template(
    template_id: str,
    user: dict = Depends(verify_token),
    role: bool = Depends(student_only)
):
    """
    Returns the full markdown text of a template for preview.
    """
    meta = template_registry.get_template_by_id(template_id)
    if not meta:
        raise HTTPException(status_code=404, detail=f"Template '{template_id}' not found.")
    text = template_registry.get_template_text(template_id)
    if not text:
        raise HTTPException(status_code=500, detail="Failed to load template content.")
    return {"template": meta, "markdown": text}


@router.post("/transform-with-template")
async def start_template_transfer(
    background_tasks: BackgroundTasks,
    template_id: str,
    candidate: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(verify_token),
    role: bool = Depends(student_only)
):
    """
    Transforms a candidate resume using a built-in template from the gallery.
    """
    # Validate template exists
    template_meta = template_registry.get_template_by_id(template_id)
    if not template_meta:
        raise HTTPException(status_code=404, detail=f"Template '{template_id}' not found.")
    
    if not any(candidate.filename.lower().endswith(ext) for ext in [".pdf", ".docx", ".doc"]):
        raise HTTPException(status_code=400, detail="Candidate resume must be in PDF or DOCX format.")
    
    student_id = UUID(user.get("sub"))
    candidate_bytes = await candidate.read()
    
    # Create job entry
    job = await StyleTransferService.create_job(student_id, db)
    
    # Trigger background processing with template ID
    background_tasks.add_task(
        StyleTransferService.process_template_transformation,
        job.id,
        template_id,
        candidate_bytes,
        db
    )
    
    return {"job_id": str(job.id), "status": "accepted", "template": template_meta["name"]}


# ─── Existing Custom Upload Endpoints ──────────────────────────────────────

@router.post("/transform")
async def start_style_transfer(
    background_tasks: BackgroundTasks,
    template: UploadFile = File(...),
    candidate: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(verify_token),
    role: bool = Depends(student_only)
):
    """
    Starts a background task to transform the candidate resume to the template's style.
    """
    logger.info("style_transfer.request_received", template=template.filename, candidate=candidate.filename)

    if not any(template.filename.lower().endswith(ext) for ext in [".pdf", ".docx", ".doc"]):
        raise HTTPException(status_code=400, detail="Template must be in PDF or DOCX format.")
    
    if not any(candidate.filename.lower().endswith(ext) for ext in [".pdf", ".docx", ".doc"]):
        raise HTTPException(status_code=400, detail="Candidate resume must be in PDF or DOCX format.")
    
    student_id = UUID(user.get("sub"))
    template_bytes = await template.read()
    candidate_bytes = await candidate.read()
    
    # Create job entry
    job = await StyleTransferService.create_job(student_id, db)
    
    # Trigger background processing
    background_tasks.add_task(
        StyleTransferService.process_transformation,
        job.id,
        template_bytes,
        candidate_bytes,
        db
    )
    
    return {"job_id": str(job.id), "status": "accepted"}

@router.get("/job/{job_id}")
async def get_transfer_status(
    job_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(verify_token),
    role: bool = Depends(student_only)
):
    """
    Polls the status of a transformation job.
    """
    status = await StyleTransferService.get_job_status(job_id, db)
    if not status:
        raise HTTPException(status_code=404, detail="Job not found.")
    return status

class RefineRequest(BaseModel):
    current_markdown: str
    instruction: str

@router.post("/refine")
async def refine_resume_style(
    request: RefineRequest,
    user: dict = Depends(verify_token),
    role: bool = Depends(student_only)
):
    """
    Synchronously refines the resume based on user chat instruction.
    """
    logger.info("style_transfer.refine_request", user=user.get("sub"))
    updated_markdown = await StyleTransferAI.refine_resume(
        request.current_markdown, 
        request.instruction
    )
    return {"updated_markdown": updated_markdown}


# ─── File Download Compilation Helpers ──────────────────────────────────────

def markdown_to_html(md: str) -> str:
    """Converts a standard Markdown string into sanitized, structured HTML tags flawlessly using native regex."""
    html = md.replace("\r\n", "\n").replace("\r", "\n")
    
    # Blockquotes
    html = re.sub(r"^>\s*(.+)$", r"<blockquote>\1</blockquote>", html, flags=re.MULTILINE)
    
    # Horizontal rules
    html = re.sub(r"^---+$", r"<hr />", html, flags=re.MULTILINE)
    
    # Headers
    html = re.sub(r"^####\s*(.+)$", r"<h4>\1</h4>", html, flags=re.MULTILINE)
    html = re.sub(r"^###\s*(.+)$", r"<h3>\1</h3>", html, flags=re.MULTILINE)
    html = re.sub(r"^##\s*(.+)$", r"<h2>\1</h2>", html, flags=re.MULTILINE)
    html = re.sub(r"^#\s*(.+)$", r"<h1>\1</h1>", html, flags=re.MULTILINE)
    
    # Bold & Italic inline formatting
    html = re.sub(r"\*\*([^\*]+)\*\*", r"<strong>\1</strong>", html)
    html = re.sub(r"__([^_]+)__", r"<strong>\1</strong>", html)
    html = re.sub(r"\*([^\*]+)\*", r"<em>\1</em>", html)
    html = re.sub(r"_([^_]+)_", r"<em>\1</em>", html)
    
    # Unordered Lists
    lines = html.split("\n")
    in_list = False
    new_lines = []
    for line in lines:
        match = re.match(r"^[\-\*\+]\s+(.+)$", line.strip())
        if match:
            if not in_list:
                new_lines.append("<ul>")
                in_list = True
            new_lines.append(f"<li>{match.group(1)}</li>")
        else:
            if in_list:
                new_lines.append("</ul>")
                in_list = False
            new_lines.append(line)
    if in_list:
        new_lines.append("</ul>")
    html = "\n".join(new_lines)

    # Ordered Lists
    lines = html.split("\n")
    in_list = False
    new_lines = []
    for line in lines:
        match = re.match(r"^\d+\.\s+(.+)$", line.strip())
        if match:
            if not in_list:
                new_lines.append("<ol>")
                in_list = True
            new_lines.append(f"<li>{match.group(1)}</li>")
        else:
            if in_list:
                new_lines.append("</ol>")
                in_list = False
            new_lines.append(line)
    if in_list:
        new_lines.append("</ol>")
    html = "\n".join(new_lines)
    
    # Simple markdown table parser
    lines = html.split("\n")
    new_lines = []
    in_table = False
    table_rows = []
    for line in lines:
        if "|" in line:
            if not in_table:
                in_table = True
                table_rows = []
            cells = [c.strip() for c in line.split("|")][1:-1]
            if all(re.match(r"^[\s\-\:\=]*$", cell) for cell in cells) and len(cells) > 0:
                continue
            table_rows.append(cells)
        else:
            if in_table:
                table_html = "<table>"
                for idx, row in enumerate(table_rows):
                    if idx == 0:
                        table_html += "<thead><tr>" + "".join(f"<th>{c}</th>" for c in row) + "</tr></thead><tbody>"
                    else:
                        table_html += "<tr>" + "".join(f"<td>{c}</td>" for c in row) + "</tr>"
                table_html += "</tbody></table>"
                new_lines.append(table_html)
                in_table = False
            new_lines.append(line)
    if in_table:
        table_html = "<table>"
        for idx, row in enumerate(table_rows):
            if idx == 0:
                table_html += "<thead><tr>" + "".join(f"<th>{c}</th>" for c in row) + "</tr></thead><tbody>"
            else:
                table_html += "<tr>" + "".join(f"<td>{c}</td>" for c in row) + "</tr>"
        table_html += "</tbody></table>"
        new_lines.append(table_html)
    html = "\n".join(new_lines)
    
    # Paragraphs (wrapping text blocks that aren't tags in <p>)
    blocks = html.split("\n\n")
    new_blocks = []
    for block in blocks:
        block_stripped = block.strip()
        if not block_stripped:
            continue
        if block_stripped.startswith(("<h", "<ul", "<ol", "<li", "<blockquote", "<hr", "<table", "<thead", "<tbody", "<tr")):
            new_blocks.append(block)
        else:
            p_content = block_stripped.replace("\n", "<br />")
            new_blocks.append(f"<p>{p_content}</p>")
    html = "\n\n".join(new_blocks)
    
    return html

def get_pdf_html(markdown_content: str, theme_id: str, font_family: str = "font-sans", font_size: str = "14px") -> str:
    """Builds styled HTML template including full CSS definitions based on style transformer presets."""
    html_body = markdown_to_html(markdown_content)
    
    theme_colors = {
        "modern_minimal": {
            "pageBg": "#ffffff",
            "h1Color": "#1e1b4b",
            "h2Color": "#4338ca",
            "h3Color": "#3730a3",
            "bodyText": "#334155",
            "accent": "#6366f1",
            "border": "#e0e7ff",
            "badgeBg": "#eef2ff",
            "hrColor": "#c7d2fe",
            "tableBg": "#f5f3ff",
        },
        "corporate_professional": {
            "pageBg": "#ffffff",
            "h1Color": "#1a365d",
            "h2Color": "#1a365d",
            "h3Color": "#2c5282",
            "bodyText": "#2d3748",
            "accent": "#2b6cb0",
            "border": "#bee3f8",
            "badgeBg": "#ebf8ff",
            "hrColor": "#90cdf4",
            "tableBg": "#ebf8ff",
        },
        "creative_designer": {
            "pageBg": "#1a1a2e",
            "h1Color": "#f9a8d4",
            "h2Color": "#ec4899",
            "h3Color": "#f472b6",
            "bodyText": "#cbd5e1",
            "accent": "#ec4899",
            "border": "#4a1942",
            "badgeBg": "#500724",
            "hrColor": "#831843",
            "tableBg": "#1e1233",
        },
        "tech_engineering": {
            "pageBg": "#0d1117",
            "h1Color": "#34d399",
            "h2Color": "#10b981",
            "h3Color": "#6ee7b7",
            "bodyText": "#94a3b8",
            "accent": "#10b981",
            "border": "#1e3a2f",
            "badgeBg": "#052e16",
            "hrColor": "#065f46",
            "tableBg": "#0a1f16",
        },
        "academic_research": {
            "pageBg": "#fffef8",
            "h1Color": "#3b0764",
            "h2Color": "#6d28d9",
            "h3Color": "#7c3aed",
            "bodyText": "#374151",
            "accent": "#7c3aed",
            "border": "#ddd6fe",
            "badgeBg": "#f5f3ff",
            "hrColor": "#c4b5fd",
            "tableBg": "#faf5ff",
        },
        "executive_leadership": {
            "pageBg": "#ffffff",
            "h1Color": "#78350f",
            "h2Color": "#b45309",
            "h3Color": "#d97706",
            "bodyText": "#374151",
            "accent": "#d97706",
            "border": "#fde68a",
            "badgeBg": "#fffbeb",
            "hrColor": "#fbbf24",
            "tableBg": "#fffbeb",
        },
        "text-blue-900": {
            "pageBg": "#ffffff",
            "h1Color": "#1e3a8a",
            "h2Color": "#1e3a8a",
            "h3Color": "#2563eb",
            "bodyText": "#1e293b",
            "accent": "#3b82f6",
            "border": "#dbeafe",
            "badgeBg": "#eff6ff",
            "hrColor": "#bfdbfe",
            "tableBg": "#eff6ff",
        },
        "text-emerald-900": {
            "pageBg": "#ffffff",
            "h1Color": "#064e3b",
            "h2Color": "#064e3b",
            "h3Color": "#059669",
            "bodyText": "#1f2937",
            "accent": "#10b981",
            "border": "#d1fae5",
            "badgeBg": "#ecfdf5",
            "hrColor": "#a7f3d0",
            "tableBg": "#ecfdf5",
        },
        "text-slate-900": {
            "pageBg": "#ffffff",
            "h1Color": "#0f172a",
            "h2Color": "#1e293b",
            "h3Color": "#334155",
            "bodyText": "#334155",
            "accent": "#0d9488",
            "border": "#e2e8f0",
            "badgeBg": "#f8fafc",
            "hrColor": "#cbd5e1",
            "tableBg": "#f8fafc",
        },
        "text-indigo-900": {
            "pageBg": "#ffffff",
            "h1Color": "#31108f",
            "h2Color": "#4338ca",
            "h3Color": "#4f46e5",
            "bodyText": "#1e293b",
            "accent": "#6366f1",
            "border": "#e0e7ff",
            "badgeBg": "#eef2ff",
            "hrColor": "#c7d2fe",
            "tableBg": "#eef2ff",
        }
    }
    
    c = theme_colors.get(theme_id, theme_colors["text-slate-900"])
    
    font_stack = "system-ui, -apple-system, sans-serif"
    if font_family == "font-serif":
        font_stack = "Georgia, Cambria, 'Times New Roman', serif"
    elif font_family == "font-mono":
        font_stack = "SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace"
        
    is_dark = theme_id in ["creative_designer", "tech_engineering"]
    strong_color = "#f1f5f9" if is_dark else "#0f172a"
        
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@400;600;700;800&display=swap');
            
            body {{
                font-family: {font_stack};
                font-size: {font_size};
                line-height: 1.6;
                color: {c['bodyText']};
                background-color: {c['pageBg']};
                padding: 50px;
                margin: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }}
            h1 {{
                font-size: 2.2rem;
                font-weight: 800;
                color: {c['h1Color']};
                margin-top: 0;
                margin-bottom: 8px;
                padding-bottom: 12px;
                border-bottom: 3px solid {c['border']};
                letter-spacing: -0.5px;
            }}
            h2 {{
                font-size: 1.5rem;
                font-weight: 700;
                color: {c['h2Color']};
                margin-top: 28px;
                margin-bottom: 12px;
                padding-bottom: 6px;
                border-bottom: 1px solid {c['border']};
                text-transform: uppercase;
                letter-spacing: 1px;
            }}
            h3 {{
                font-size: 1.2rem;
                font-weight: 700;
                color: {c['h3Color']};
                margin-top: 20px;
                margin-bottom: 6px;
            }}
            h4 {{
                font-size: 1rem;
                font-weight: 600;
                color: {c['accent']};
                font-style: italic;
                margin-top: 12px;
                margin-bottom: 4px;
            }}
            p {{
                margin-bottom: 12px;
            }}
            ul, ol {{
                padding-left: 20px;
                margin-bottom: 16px;
            }}
            li {{
                margin-bottom: 4px;
            }}
            strong {{
                font-weight: 700;
                color: {strong_color};
            }}
            em {{
                color: {c['accent']};
                font-style: italic;
            }}
            hr {{
                border: none;
                border-top: 1px solid {c['hrColor']};
                margin: 20px 0;
            }}
            a {{
                color: {c['accent']};
                text-decoration: underline;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 16px;
                font-size: 0.9rem;
            }}
            th {{
                text-align: left;
                padding: 8px 12px;
                background-color: {c['tableBg']};
                border-bottom: 2px solid {c['border']};
                font-weight: 700;
                color: {c['h2Color']};
            }}
            td {{
                padding: 8px 12px;
                border-bottom: 1px solid {c['border']};
                color: {c['bodyText']};
            }}
            blockquote {{
                border-left: 3px solid {c['accent']};
                padding: 12px 16px;
                margin: 16px 0;
                color: {c['bodyText']};
                font-style: italic;
                background-color: {c['badgeBg']};
                border-radius: 0 8px 8px 0;
            }}
        </style>
    </head>
    <body>
        {html_body}
    </body>
    </html>
    """
    return html

def generate_docx_binary(markdown_content: str, theme_id: str) -> bytes:
    """Builds native DOCX word document mapping elements to layout colors seamlessly using python-docx."""
    doc = Document()
    
    theme_colors = {
        "modern_minimal": {"h1": (30, 27, 75), "h2": (67, 56, 202), "body": (51, 65, 85)},
        "corporate_professional": {"h1": (26, 54, 93), "h2": (26, 54, 93), "body": (45, 55, 72)},
        "creative_designer": {"h1": (249, 168, 212), "h2": (236, 72, 153), "body": (203, 213, 225)},
        "tech_engineering": {"h1": (52, 211, 153), "h2": (16, 185, 129), "body": (148, 163, 184)},
        "academic_research": {"h1": (59, 7, 100), "h2": (109, 40, 217), "body": (55, 65, 81)},
        "executive_leadership": {"h1": (120, 53, 15), "h2": (180, 83, 9), "body": (55, 65, 81)},
        "text-blue-900": {"h1": (30, 58, 138), "h2": (30, 58, 138), "body": (30, 41, 59)},
        "text-emerald-900": {"h1": (6, 78, 59), "h2": (6, 78, 59), "body": (31, 41, 55)},
        "text-slate-900": {"h1": (15, 23, 42), "h2": (30, 41, 59), "body": (51, 65, 85)},
        "text-indigo-900": {"h1": (49, 16, 143), "h2": (67, 56, 202), "body": (30, 41, 59)}
    }
    
    colors = theme_colors.get(theme_id, theme_colors["text-slate-900"])
    
    lines = markdown_content.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    
    for line in lines:
        line_stripped = line.strip()
        if not line_stripped:
            continue
            
        # Headers
        if line_stripped.startswith("# "):
            p = doc.add_paragraph()
            run = p.add_run(line_stripped[2:])
            run.bold = True
            run.font.name = 'Arial'
            run.font.size = Pt(20)
            run.font.color.rgb = RGBColor(*colors["h1"])
        elif line_stripped.startswith("## "):
            p = doc.add_paragraph()
            run = p.add_run(line_stripped[3:])
            run.bold = True
            run.font.name = 'Arial'
            run.font.size = Pt(14)
            run.font.color.rgb = RGBColor(*colors["h2"])
        elif line_stripped.startswith("### "):
            p = doc.add_paragraph()
            run = p.add_run(line_stripped[4:])
            run.bold = True
            run.font.name = 'Arial'
            run.font.size = Pt(12)
            run.font.color.rgb = RGBColor(*colors["h2"])
        elif line_stripped.startswith("- ") or line_stripped.startswith("* "):
            p = doc.add_paragraph(style='List Bullet')
            run = p.add_run(line_stripped[2:])
            run.font.name = 'Arial'
            run.font.size = Pt(10.5)
            run.font.color.rgb = RGBColor(*colors["body"])
        elif re.match(r"^\d+\.\s+", line_stripped):
            text = re.sub(r"^\d+\.\s+", "", line_stripped)
            p = doc.add_paragraph(style='List Number')
            run = p.add_run(text)
            run.font.name = 'Arial'
            run.font.size = Pt(10.5)
            run.font.color.rgb = RGBColor(*colors["body"])
        else:
            clean_text = line_stripped.replace("**", "").replace("__", "").replace("*", "").replace("_", "")
            p = doc.add_paragraph()
            run = p.add_run(clean_text)
            run.font.name = 'Arial'
            run.font.size = Pt(10.5)
            run.font.color.rgb = RGBColor(*colors["body"])
            
    file_stream = io.BytesIO()
    doc.save(file_stream)
    return file_stream.getvalue()

class DownloadRequest(BaseModel):
    markdown: str
    format: str  # "pdf", "docx", "markdown"
    theme_id: str
    font_family: str = "font-sans"
    font_size: str = "14px"

@router.post("/download")
async def download_resume_file(
    request: DownloadRequest,
    user: dict = Depends(verify_token),
    role: bool = Depends(student_only)
):
    """
    Compiles and downloads the transformed resume in PDF, DOCX, or Markdown format flawlessly.
    """
    logger.info("style_transfer.download_request", format=request.format, theme_id=request.theme_id)
    
    filename_base = "Transformed_Resume"
    
    if request.format == "markdown":
        return Response(
            content=request.markdown,
            media_type="text/markdown",
            headers={"Content-Disposition": f"attachment; filename={filename_base}.md"}
        )
        
    elif request.format == "docx":
        try:
            docx_bytes = generate_docx_binary(request.markdown, request.theme_id)
            return Response(
                content=docx_bytes,
                media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                headers={"Content-Disposition": f"attachment; filename={filename_base}.docx"}
            )
        except Exception as e:
            logger.error("style_transfer.docx_generation_failed", error=str(e))
            raise HTTPException(status_code=500, detail=f"Failed to generate Word document: {str(e)}")
            
    elif request.format == "pdf":
        try:
            html_content = get_pdf_html(
                request.markdown, 
                request.theme_id, 
                request.font_family, 
                request.font_size
            )
            pdf_bytes = await generate_pdf(html_content)
            if not pdf_bytes:
                raise HTTPException(status_code=500, detail="PDF generation returned empty content.")
                
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename={filename_base}.pdf"}
            )
        except Exception as e:
            logger.error("style_transfer.pdf_generation_failed", error=str(e))
            raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")
            
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported format '{request.format}'")
