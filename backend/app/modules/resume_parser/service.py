import fitz  # PyMuPDF
from typing import Dict, Any, List

class ResumeParserService:
    @staticmethod
    def parse_pdf_in_memory(file_bytes: bytes) -> Dict[str, Any]:
        """
        Parse resume PDF in-memory using PyMuPDF and extract raw text.
        (Called from celery task or upload flow before extracting structured data)
        """
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        raw_text = []
        for page in doc:
            raw_text.append(page.get_text())
        
        full_text = "\n".join(raw_text)
        return {
            "raw_text": full_text
        }
