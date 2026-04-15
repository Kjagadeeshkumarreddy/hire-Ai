import asyncio
from typing import Optional
from playwright.sync_api import sync_playwright
import structlog

logger = structlog.get_logger()

def _generate_pdf_sync(content_str: str) -> Optional[bytes]:
    """Runs the PDF generation synchronously in an isolated thread to bypass Uvicorn's Windows `SelectorEventLoop` limitation."""
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            
            # Load HTML content
            page.set_content(content_str, wait_until="networkidle")
            
            # Generate PDF matching the UI
            pdf_bytes = page.pdf(
                format="A4",
                print_background=True,
                margin={"top": "0", "right": "0", "bottom": "0", "left": "0"}
            )
            
            browser.close()
            return pdf_bytes
    except Exception as e:
        logger.error("playwright.pdf_generation_failed", error=str(e))
        return None

async def generate_pdf(html_content: str | dict) -> Optional[bytes]:
    """Convert HTML content into a PDF binary flawlessly using Headless Chromium (Playwright)."""
    # 1. Setup minimal envelope if it's not a full document yet
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
        
    # Execute heavily-isolated threaded call
    return await asyncio.to_thread(_generate_pdf_sync, content_str)

