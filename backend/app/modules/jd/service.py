import structlog
from uuid import UUID
from typing import Optional
# Using groq client (placeholder setup according to architectural requirements)
from groq import AsyncGroq
from app.config import settings
from .prompts import JD_GENERATION_PROMPT

logger = structlog.get_logger()
client = AsyncGroq(api_key=settings.GROQ_API_KEY)

class JDService:
    @staticmethod
    async def generate_jd_from_llm(title: str, department: str, reqs: list, seniority: str) -> dict:
        prompt = JD_GENERATION_PROMPT.format(
            title=title,
            department=department or "General",
            seniority_level=seniority,
            requirements=", ".join(reqs)
        )
        
        logger.info("jd.generate", title=title, model="llama-3.3-70b-versatile")
        response = await client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=2048,
            response_format={"type": "json_object"}
        )
        return response.choices[0].message.content
