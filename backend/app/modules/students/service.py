import json
import asyncio
import structlog
from typing import Dict, Any, List
from uuid import UUID
from datetime import datetime
from sqlalchemy import select, insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import StudentAssessment
from app.modules.resume_parser.service import ResumeParserService
from app.agents.nodes import (
    cached_llm_invoke, 
    extract_json_from_response,
    TECHNICAL_ARCHITECT_PROMPT,
    CULTURE_EXPERT_PROMPT,
    RISK_MONITOR_PROMPT,
    SYNTHESIS_PROMPT,
    REPO_AUDITOR_PROMPT,
    REPO_RANKER_PROMPT
)
from app.modules.github_analyzer.client import GitHubClient
from app.modules.github_analyzer.github_processor import analyze_github_data
from app.modules.github_analyzer.service import GitHubService
from langchain_core.messages import SystemMessage, HumanMessage

logger = structlog.get_logger()

class StudentService:
    @staticmethod
    async def run_self_assessment(
        user_id: UUID, 
        resume_bytes: bytes, 
        filename: str,
        github_username: str, 
        jd_text: str,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """
        Run a full agentic self-assessment for a student flawlessy.
        """
        logger.info("student.assessment.started", user_id=str(user_id), github=github_username)
        
        # 1. Parse Resume
        resume_data = ResumeParserService.parse_file_in_memory(resume_bytes, filename)
        raw_resume_text = resume_data.get("raw_text", "")
        
        # 1b. Structured Extraction
        extract_prompt = f"""
        Extract structured data from this resume text. Return ONLY JSON.
        {{
            "skills": ["skill1", "skill2"],
            "experience_years": 0.0,
            "projects": [{{ "name": "", "tech_stack": [], "description": "" }}]
        }}
        Resume: {raw_resume_text[:6000]}
        """
        extract_res = await cached_llm_invoke([HumanMessage(content=extract_prompt)])
        parsed_resume = json.loads(extract_json_from_response(extract_res))
        
        # 2. GitHub Analysis via Centralized Service flawlessy
        gh_data_status = "none"
        gh_analysis_data = {}
        if github_username:
            try:
                analysis = await GitHubService.analyze_user_profile(github_username, jd_text)
                if analysis.get("status") == "success":
                    gh_data_status = "success"
                    gh_analysis_data = analysis
                else:
                    gh_data_status = "failed"
            except Exception as e:
                logger.error("student.assessment.github_failed", error=str(e))
                gh_data_status = "error"

        # 3. AI Enrichment & Multi-Persona Scoring
        # Assemble context for students that anchors individual audits flawlessly
        audit_ctx = "\n---".join([f"PROJECT: {a['name']}\nAUDIT: {a['audit_summary']}" for a in gh_analysis_data.get('repo_audits', []) if "error" not in a])
        
        candidate_context = f"""
        JD: {jd_text[:1500]}
        Resume Skills: {", ".join(parsed_resume.get('skills', []))}
        Projects: {json.dumps(parsed_resume.get('projects', []))}
        GitHub Heuristics: {json.dumps(gh_analysis_data.get('metrics', {}))}
        GitHub Audits: {audit_ctx or 'N/A'}
        GitHub AI Analysis: {json.dumps(gh_analysis_data.get('ai_analysis', {}))}
        """
        
        personas = [
            ("architect", TECHNICAL_ARCHITECT_PROMPT),
            ("culture", CULTURE_EXPERT_PROMPT),
            ("risk", RISK_MONITOR_PROMPT)
        ]
        
        evals = {}
        for p_key, p_prompt in personas:
            p_msg = [
                SystemMessage(content=p_prompt),
                HumanMessage(content=f"Evaluate this student profile against the JD:\n{candidate_context}")
            ]
            evals[p_key] = await cached_llm_invoke(p_msg)
            
        # 4. Final Synthesis
        synthesis_input = f"""
        JD: {jd_text[:1000]}
        Evaluations:
        - ARCHITECT: {evals['architect']}
        - CULTURE: {evals['culture']}
        - RISK: {evals['risk']}
        """
        
        # Modification of Synthesis prompt to include Skill Gaps
        student_synth_prompt = SYNTHESIS_PROMPT + "\nAdditionally, output a 'skill_gaps' array of specific technologies the student should learn to fit this JD."
        
        synth_msg = [
            SystemMessage(content=student_synth_prompt),
            HumanMessage(content=synthesis_input + "\nReturn JSON: {total_score: 0-100, reasoning: '', skill_gaps: [], breakdown: {}}")
        ]
        
        synth_res = await cached_llm_invoke(synth_msg)
        final_outcome = json.loads(extract_json_from_response(synth_res))
        
        # 5. Persist to DB
        assessment = StudentAssessment(
            user_id=user_id,
            jd_text=jd_text,
            github_username=github_username,
            total_score=final_outcome.get("total_score", 0),
            summary=final_outcome.get("reasoning", ""),
            skill_gap=final_outcome.get("skill_gaps", []),
            score_breakdown={
                "breakdown": final_outcome.get("breakdown", {}),
                "evaluations": evals
            }
        )
        db.add(assessment)
        await db.commit()
        await db.refresh(assessment)
        
        return {
            "id": str(assessment.id),
            "score": assessment.total_score,
            "summary": assessment.summary,
            "skill_gaps": assessment.skill_gap,
            "breakdown": assessment.score_breakdown,
            "created_at": assessment.created_at.isoformat()
        }

    @staticmethod
    async def get_history(user_id: UUID, db: AsyncSession) -> List[Dict[str, Any]]:
        """
        Retrieves the assessment history for a specific student flawlessly.
        Uses selective column fetching to minimize DB I/O and memory overhead.
        """
        stmt = (
            select(
                StudentAssessment.id,
                StudentAssessment.total_score,
                StudentAssessment.summary,
                StudentAssessment.skill_gap,
                StudentAssessment.created_at
            )
            .where(StudentAssessment.user_id == user_id)
            .order_by(StudentAssessment.created_at.desc())
        )
        
        result = await db.execute(stmt)
        rows = result.all()
        
        return [
            {
                "id": str(row.id),
                "score": float(row.total_score),
                "summary": row.summary,
                "skill_gaps": row.skill_gap,
                "created_at": row.created_at.isoformat()
            } for row in rows
        ]
    @staticmethod
    async def get_assessment_details(user_id: UUID, assessment_id: UUID, db: AsyncSession) -> Dict[str, Any]:
        """
        Fetch the complete detailed record of a specific assessment flawlessly.
        """
        stmt = select(StudentAssessment).where(
            StudentAssessment.id == assessment_id, 
            StudentAssessment.user_id == user_id
        )
        result = await db.execute(stmt)
        a = result.scalar_one_or_none()
        
        if not a:
            return None
            
        return {
            "id": str(a.id),
            "score": float(a.total_score),
            "summary": a.summary,
            "skill_gaps": a.skill_gap,
            "breakdown": a.score_breakdown,
            "jd_text": a.jd_text,
            "github_username": a.github_username,
            "created_at": a.created_at.isoformat()
        }

    @staticmethod
    async def delete_assessment(user_id: UUID, assessment_id: UUID, db: AsyncSession) -> bool:
        """
        Delete a specific assessment after verifying ownership flawlessly.
        """
        from sqlalchemy import delete
        stmt = delete(StudentAssessment).where(
            StudentAssessment.id == assessment_id, 
            StudentAssessment.user_id == user_id
        )
        result = await db.execute(stmt)
        await db.commit()
        return result.rowcount > 0

    @staticmethod
    async def convert_resume(resume_bytes: bytes, filename: str, template_text: str) -> str:
        """
        Convert a resume PDF into a specific template format flawlessly.
        """
        logger.info("student.resume_conversion.started")
        
        # 1. Parse Resume
        resume_data = ResumeParserService.parse_file_in_memory(resume_bytes, filename)
        raw_resume_text = resume_data.get("raw_text", "")
        
        # 2. Convert using template
        prompt = f"""
        You are an expert resume writer and formatting specialist. 
        Your task is to take the content from the provided resume and re-format it to EXACTLY match the structure and style of the given resume template.
        
        INPUT RESUME TEXT:
        {raw_resume_text[:8000]} 
        
        RESUME TEMPLATE:
        {template_text[:4000]}
        
        STRICT RULES:
        1. Maintain all professional facts, dates, and details from the input resume.
        2. Adapt the content to the template's structure. If the template uses specific headers or bullet styles, use them.
        3. If the template has placeholders (like [Name], [Phone]), replace them with actual data from the resume.
        4. Return the final resume in clear, professional Markdown format.
        5. DO NOT add any conversational filler. Return ONLY the markdown resume.
        """
        
        messages = [HumanMessage(content=prompt)]
        converted_resume = await cached_llm_invoke(messages)
        
        return converted_resume
