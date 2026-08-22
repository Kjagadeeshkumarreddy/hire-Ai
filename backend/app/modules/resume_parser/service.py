import fitz  # PyMuPDF
import io
from docx import Document
from typing import Dict, Any, List

class ResumeParserService:
    @staticmethod
    def parse_file_in_memory(file_bytes: bytes, filename: str) -> Dict[str, Any]:
        """
        Parse resume (PDF or DOCX) in-memory and extract raw text flawlessly.
        """
        ext = filename.lower().split('.')[-1]
        full_text = ""
        
        if ext == "pdf":
            try:
                doc = fitz.open(stream=file_bytes, filetype="pdf")
                raw_text = []
                for page in doc:
                    raw_text.append(page.get_text())
                full_text = "\n".join(raw_text)
            except Exception as e:
                full_text = f"Error parsing PDF: {str(e)}"
        elif ext in ["docx", "doc"]:
            try:
                f = io.BytesIO(file_bytes)
                doc = Document(f)
                full_text = "\n".join([para.text for para in doc.paragraphs])
            except Exception as e:
                full_text = f"Error parsing DOCX: {str(e)}"
            
        return {
            "raw_text": full_text
        }
    
    @staticmethod
    def parse_pdf_in_memory(file_bytes: bytes) -> Dict[str, Any]:
        """ Legacy wrapper for PDF only flawlessly """
        return ResumeParserService.parse_file_in_memory(file_bytes, "resume.pdf")
