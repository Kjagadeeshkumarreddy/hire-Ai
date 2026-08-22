import asyncio
import os
import sys
import tempfile
import subprocess
from typing import Optional
import structlog

logger = structlog.get_logger()

def _run_pdf_cli_sync(html_content: str) -> Optional[bytes]:
    """Saves HTML to temp file, executes generate_pdf_cli.py in a separate process, and reads the PDF."""
    html_fd, html_path = tempfile.mkstemp(suffix=".html")
    pdf_fd, pdf_path = tempfile.mkstemp(suffix=".pdf")
    
    try:
        # Write HTML content
        with os.fdopen(html_fd, "w", encoding="utf-8") as f:
            f.write(html_content)
        
        # Close PDF file descriptor so subprocess can write to it
        os.close(pdf_fd)
        
        cli_script = os.path.join(os.path.dirname(__file__), "generate_pdf_cli.py")
        
        cmd = [
            sys.executable,
            cli_script,
            "--html",
            html_path,
            "--output",
            pdf_path
        ]
        
        # Execute standalone CLI in a new process flawlessly
        res = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True
        )
        
        # Read the generated PDF
        if os.path.exists(pdf_path) and os.path.getsize(pdf_path) > 0:
            with open(pdf_path, "rb") as f:
                pdf_bytes = f.read()
            return pdf_bytes
            
    except subprocess.CalledProcessError as err:
        logger.error("playwright.cli_pdf_generation_failed", error=err.stderr or err.stdout)
    except Exception as e:
        logger.error("playwright.cli_wrapper_failed", error=str(e))
    finally:
        # Safely cleanup temp files
        try:
            if os.path.exists(html_path):
                os.remove(html_path)
        except Exception:
            pass
        try:
            if os.path.exists(pdf_path):
                os.remove(pdf_path)
        except Exception:
            pass
            
    return None

async def generate_pdf(html_content: str | dict) -> Optional[bytes]:
    """Convert HTML content into a PDF binary flawlessly using subprocess-isolated Chromium (Playwright)."""
    content_str = html_content
    if isinstance(html_content, dict):
        header = html_content.get("header", "")
        body = html_content.get("content", "")
        content_str = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{
                    font-family: 'Inter', 'Helvetica', 'Arial', sans-serif;
                    line-height: 1.6;
                    padding: 40px;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }}
            </style>
        </head>
        <body>
            <div style="margin-bottom: 2rem;">{header}</div>
            <div>{body}</div>
        </body>
        </html>
        """
        
    # Run the synchronous CLI wrapper in an isolated thread flawlessly
    return await asyncio.to_thread(_run_pdf_cli_sync, content_str)
