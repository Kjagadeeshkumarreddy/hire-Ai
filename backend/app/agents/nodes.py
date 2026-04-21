from app.agents.state import HiringPipelineState
from langgraph.graph import END
import structlog
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from app.config import settings
import asyncio

logger = structlog.get_logger()

# Initialize LLM Client with a high-capacity versatile model mapped flawlessly
llm = ChatGroq(
    api_key=settings.groq_api_key, # Using stripped property flawlessly
    model_name="llama-3.3-70b-versatile",
    temperature=0.1, 
    max_retries=3 # Automatic backoff for 429 errors flawlessly 
)

from app.db.redis import redis_manager
from app.modules.ai_enrichment.cache import LLMCache

async def cached_llm_invoke(messages: list, model_name: str = "llama-3.3-70b-versatile") -> str:
    """Helper to invoke LLM with Redis caching enabled flawlessly."""
    # Convert messages to a stable string for key generation flawlessly
    prompt_str = "\n".join([f"{m.type}:{m.content}" for m in messages])
    
    redis_client = redis_manager.get_client()
    if not redis_client:
        # Fallback to direct call if Redis is unavailable flawlessly
        res = await llm.ainvoke(messages)
        return res.content
        
    cache = LLMCache(redis_client)
    
    async def _direct_call(p, m):
        response = await llm.ainvoke(messages)
        if not response or not response.content.strip():
            raise ValueError("LLM returned an empty response")
        return response.content
        
    try:
        return await cache.get_or_call(prompt_str, model_name, _direct_call)
    except Exception as e:
        logger.error("agent.llm_call.failed", error=str(e))
        # Do not cache failures; re-invoke directly if needed or propagate
        # Here we propagate to let the node handle the fallback flawlessly
        raise e

def extract_json_from_response(text):
    """Reliably extract JSON content (objects or arrays) from AI responses flawlessly."""
    text = text.strip()
    
    # Try to find the start of a JSON block (object or array) flawlessy
    start_chars = ['{', '[']
    end_chars = ['}', ']']
    
    start_pos = -1
    end_pos = -1
    
    for s_char, e_char in zip(start_chars, end_chars):
        s = text.find(s_char)
        if s != -1 and (start_pos == -1 or s < start_pos):
            e = text.rfind(e_char)
            if e != -1 and e > s:
                start_pos = s
                end_pos = e + 1
    
    if start_pos != -1:
        return text[start_pos:end_pos]
        
    return text

# Persona Prompts for Multi-Agent Debate
TECHNICAL_ARCHITECT_PROMPT = """
You are a Senior Technical Architect. Your primary goal is to evaluate candidates strictly against the provided Job Description (JD). 
Analyze their technical depth, system design, and code quality ONLY in the context of the skills required by the JD. 
CRITICAL: Do not describe the candidate as a 'Full Stack Developer' or mention irrelevant frontend/backend stacks unless they are explicitly requested in the JD. 
If the JD is for a Python Developer, evaluate their Python maturity, not their React skills.
"""

CULTURE_EXPERT_PROMPT = """
You are a Lead Talent Partner and Culture Specialist. Evaluate the candidate's trajectory and growth mindset 
SPECIFICALLY for the level and department described in the JD. 
Avoid generic praise for unrelated skills. Focus on whether their professional history aligns with 
the seniority and niche requirements defined by the hiring manager.
"""

RISK_MONITOR_PROMPT = """
You are a Technical Risk Analyst. Identify mismatches between the candidate's profile and the EXPLICIT 
requirements of the JD. 
DATA INTEGRITY RULE: Check the 'Project Audits' section before flagging 'Empty Profile' risks. 
If audits show valid code structure and modularity, do NOT report the GitHub profile as empty, even if the 'Risk Metric' mentions inactivity. 
Distinguish clearly between 'No Code Presence' and 'Low Recent Activity'.
"""

SYNTHESIS_PROMPT = """
You are a Head of Engineering. You must synthesize three evaluations into a final score. 
STRICT GROUNDING RULE: Your reasoning MUST center on the Job Description. 
Reject any persona evaluation that focuses on irrelevant skills not mentioned in the JD. 
DATA INTEGRITY RULE: Favor the granular 'Project Audits' over high-level 'Risk Metrics'. 
If a project like 'mlproject' was audited, the candidate HAS a GitHub presence. Do not let any persona claim the profile is empty or missing.
"""

REPO_AUDITOR_PROMPT = """
You are a Senior Software Engineer and Project Auditor. Your goal is to perform a deep technical audit of a SINGLE repository.
You will be provided with the repository's README, its top-level file structure, and its metadata.

Analyze the following:
1. Architectural Maturity: Is the project organized logically (e.g., separations of concerns, standard directory structures like /src, /tests)?
2. Documentation Quality: Is the README clear? Does it explain the project's purpose, setup, and design patterns?
3. Engineering Standards: Look for tests, CI/CD configuration files, or linting setups.
4. Technical Complexity: Based on the file tree and metadata, evaluate the engineering effort.

Provide a concise, 100-word highly technical summary of your audit. Focus on facts, not praise.
"""

REPO_RANKER_PROMPT = """
You are a Technical Talent Scout. Your goal is to identify the 3 best repositories for a technical deep-dive review. 
You will be provided with a list of repositories (with names and descriptions) and a Job Description (JD).

Rank the repositories based on:
1. Domain Alignment: Prioritize projects that match the DOMAIN of the JD (e.g., for Full Stack, look for Web Frameworks/UI/DB; for Data Science, look for Models/Analysis). Avoid choosing projects just because the language (like Python) matches.
2. Technical Relevance: Does the repo demonstrate specific frameworks or tools explicitly requested in the JD (e.g., React, Django, Kafka)?
3. Engineering Difficulty: Does it show complex problem solving, system design, or architectural maturity beyond simple tutorials?
4. Originality: Prioritize original projects over forks or boilerplate.

Return ONLY a JSON array of the top 3 repository names in order of relevance: ["repo1_name", "repo2_name", "repo3_name"]. 
If there are fewer than 3 repositories, return all of them.
"""


from app.db.session import AsyncSessionLocal
from app.db.models import Resume, Candidate, GitHubAnalysis
from sqlalchemy import select, update, func
import json
from app.modules.github_analyzer.client import GitHubClient
from app.modules.github_analyzer.github_processor import analyze_github_data
from app.modules.github_analyzer.service import GitHubService

# JD Processing Nodes
async def jd_generator_node(state: HiringPipelineState) -> dict:
    """Generate or refine JD via Groq LLM module based on human feedback loop."""
    logger.info("agent.jd_generator.started", job_id=state.get("job_id"), feedback_present=bool(state.get("jd_feedback")))
    
    # Constructing a granular professional prompt mapping user intent flawlessly
    # Focus on expert level JD creation with iterative improvement support
    system_prompt = f"""
    You are an expert HR Specialist and Technical Recruiter with over 20 years of experience 
    writing and refining high-performing Job Descriptions for engineering roles.
    
    Your goal is to {'refine the existing' if state.get('jd_feedback') else 'generate a new'} comprehensive 
    and engaging Job Description based on the provided parameters. 
    The tone should be {state.get('input_tone', 'professional')}.
    
    CRITICAL INSTRUCTION: If refining an existing JD, focus HEAVILY on the specific feedback 
    provided while maintaining the document's overall flow. Do not discard sections that 
    the user didn't mention unless it improves the clarity.
    """
    
    if state.get("jd_feedback") and state.get("jd_content"):
        user_prompt = f"""
        Refine the following Job Description based on this user feedback.
        
        FEEDBACK: {state.get('jd_feedback')}
        
        EXISTING JD:
        {state.get('jd_content')}
        
        Return the full updated JD. Maintain professional markdown formatting.
        """
    else:
        user_prompt = f"""
        Generate a comprehensive Job Description for a {state.get('input_job_title')} in the {state.get('input_department')} department.
        Seniority Level: {state.get('input_seniority', 'Not Specified')}
        Key Requirements/Context: {', '.join(state.get('input_key_requirements', [])) if state.get('input_key_requirements') else 'Standard role requirements'}
        
        Format the output clearly with:
        1. Role Summary
        2. Core Responsibilities
        3. Technical Requirements (Must have vs Nice to have)
        4. Key Projects/Impact
        5. Cultural Fit & Benefits
        """
    
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt)
    ]
    
    try:
        content = await cached_llm_invoke(messages)
        logger.info("agent.jd_generator.complete", job_id=state.get("job_id"))
        # Reset feedback after consumption to prevent infinite loops flawlessly
        return {"jd_content": content, "jd_feedback": None, "current_step": "jd_approval"}
    except Exception as e:
        logger.error("agent.jd_generator.error", error=str(e))
        return {"current_step": "error", "errors": [{"node": "jd_generator", "error": str(e)}]}

async def resume_parser_node(state: HiringPipelineState) -> dict:
    """Extract structured profile data from raw resume text via Groq."""
    candidate_ids = state.get("candidate_ids", [])
    job_id = state.get("job_id")
    parsing_results = {}
    
    async with AsyncSessionLocal() as db:
        # 1. Fetch raw text for all candidates in this run
        stmt = select(Resume).where(Resume.candidate_id.in_(candidate_ids))
        result = await db.execute(stmt)
        resumes = result.scalars().all()
        
        for resume in resumes:
            logger.info("agent.resume_parser.processing", candidate_id=str(resume.candidate_id))
            
            # 2. AI Structured Extraction Prompt with Project focus
            prompt = f"""
            Extract structured professional data from this resume text. 
            Return ONLY a valid JSON object.
            
            Required Schema:
            {{
                "skills": ["skill1", "skill2"],
                "experience_years": 0.0,
                "education": [{{ "degree": "", "institution": "", "year": "" }}],
                "work_history": [{{ "role": "", "company": "", "duration": "", "description": "" }}],
                "projects": [{{ "name": "", "tech_stack": [], "description": "", "impact": "" }}]
            }}
            
            Note: For 'experience_years', provide a single float.
            
            Resume Text:
            {resume.raw_text[:6000]} 
            """
            
            try:
                # Using a higher temperature for extraction to avoid truncation but keep accuracy
                messages = [HumanMessage(content=prompt)]
                content = await cached_llm_invoke(messages)
                # Robust extraction to handle conversational noise and markdown flawlessy
                json_str = extract_json_from_response(content)
                structured_data = json.loads(json_str)
                
                # 3. Update PostgreSQL with parsed results
                resume.parsed_data = structured_data
                resume.skills = structured_data.get("skills", [])
                resume.experience_years = structured_data.get("experience_years", 0)
                resume.parsing_status = "completed"
                
                parsing_results[str(resume.candidate_id)] = structured_data
            except Exception as e:
                logger.error("agent.resume_parser.error", candidate_id=str(resume.candidate_id), error=str(e))
                resume.parsing_status = "failed"
                resume.parsing_error = str(e)
        
        await db.commit()
        
    return {
        "parsing_results": parsing_results, 
        "current_step": "github_analyzer"
    }


async def github_analyzer_node(state: HiringPipelineState) -> dict:
    """Analyze GitHub profiling with a parallel multi-agent deep dive into top projects."""
    candidate_ids = state.get("candidate_ids", [])
    github_results = {}
    jd_content = state.get("jd_content", "")
    
    async with AsyncSessionLocal() as db:
        stmt = select(Candidate).where(Candidate.id.in_(candidate_ids))
        result = await db.execute(stmt)
        candidates = result.scalars().all()
        
        for cand in candidates:
            username = cand.github_username
            if username:
                logger.info("agent.github_analyzer.processing", username=username, candidate_id=str(cand.id))
                
                # Execute the centralized GitHub analysis flawlessly
                analysis = await GitHubService.analyze_user_profile(username, jd_content)
                
                if analysis.get("status") == "success":
                    # Persist GitHub analysis data mapped flawlessly
                    gh_stmt = select(GitHubAnalysis).where(GitHubAnalysis.candidate_id == cand.id)
                    gh_res = await db.execute(gh_stmt)
                    gh_record = gh_res.scalar_one_or_none()
                    
                    if not gh_record:
                        gh_record = GitHubAnalysis(
                            candidate_id=cand.id, 
                            username=analysis.get("username", username)
                        )
                        db.add(gh_record)
                    
                    metrics = analysis.get("metrics", {})
                    ai_analysis = analysis.get("ai_analysis", {})
                    
                    gh_record.total_stars = metrics.get("total_stars", 0)
                    gh_record.total_repos = metrics.get("total_repos", 0)
                    gh_record.top_languages = metrics.get("top_languages", [])
                    gh_record.authenticity_score = ai_analysis.get("authenticity_score", 0.9)
                    gh_record.analysis_status = "completed"
                    gh_record.analyzed_at = func.now()
                    
                    github_results[str(cand.id)] = {
                        "github_summary_text": analysis["summary_text"],
                        "repo_audits": analysis["repo_audits"],
                        **metrics, 
                        **ai_analysis,
                        "heuristic_score": analysis["heuristic_score"],
                        "risk": analysis["risk"],
                        "status": "success"
                    }
                else:
                    github_results[str(cand.id)] = {"status": analysis.get("status", "error"), "error": analysis.get("error")}
            else:
                github_results[str(cand.id)] = {"status": "no_handle_found"}
        
        await db.commit()
                
    return {
        "github_results": github_results, 
        "current_step": "ai_enricher"
    }

async def ai_enricher_node(state: HiringPipelineState) -> dict:
    """Deep dive assessment of project quality, strengths, and weaknesses."""
    candidate_ids = state.get("candidate_ids", [])
    parsing_results = state.get("parsing_results", {})
    github_results = state.get("github_results", {})
    jd_content = state.get("jd_content", "")
    enrichment_results = {}
    
    for cid in candidate_ids:
        cid_str = str(cid)
        p_data = parsing_results.get(cid_str, {})
        g_data = github_results.get(cid_str, {})
        logger.info("agent.ai_enricher.analyzing", candidate_id=cid_str)
        
        # Summarizing data to stay within token limits flawlessly
        p_summary = {"projects": p_data.get('projects', [])[:5], "skills": p_data.get('skills', [])}
        g_summary = {k: v for k, v in g_data.items() if k != "raw_repos"} # Exclude noisy raw repository lists
        
        # Formatting Repo Audits for deep-dive reference flawlessly
        repo_audits = g_data.get("repo_audits", [])
        audit_details = ""
        for audit in repo_audits:
            if "error" not in audit:
                audit_details += f"--- AUDIT FOR {audit['name']} ---\n{audit['audit_summary']}\n"
        
        prompt = f"""
        Conduct a deep assessment of this candidate against the Job Description.
        Analyze their listed projects (from resume) and GitHub activity.
        
        JD: {jd_content[:1500]}
        Resume Data: {json.dumps(p_summary)[:1500]}
        
        VERIFIED GITHUB NARRATIVE:
        {g_data.get('github_summary_text', 'No GitHub details available.')}
        
        DETAILED PROJECT AUDITS (CODE-LEVEL SIGNALS):
        {audit_details if audit_details else 'No specific audits available.'}
        
        CRITICAL DATA INTEGRITY RULE: 
        1. If 'DETAILED PROJECT AUDITS' lists projects, you are FORBIDDEN from reporting an 'Empty GitHub Profile' or 'No exposure' as a risk. 
        2. You must acknowledge the candidate's repository presence even if their current activity is low. 
        3. Failing to mention projects that are clearly listed in the audits above is considered a hallucination.
        
        HOLISTIC EVALUATION RULE:
        1. Treat Resume projects and GitHub activities as equal, complementary signal. 
        2. Do NOT penalize the candidate for a lack of GitHub "exposure" or "stars" if their Resume demonstrates strong professional experience.
        3. Avoid sentences like "GitHub profile lacks exposure" if the Resume projects are high-quality.
        
        STRICT GROUNDING RULE:
        - Your analysis must be JD-DRIVEN. If the JD is for a 'Python Developer', do not praise them for being a 'Full Stack Developer' based on unrelated projects.
        - Only identify skill gaps that are EXPLICITLY required in the provided JD. 
        - Do NOT invent requirements for unrelated fields (e.g. Frontend, Advanced ML) unless they are clearly mentioned in the JD text above.
        - Focus your executive summary on the candidate's mastery of the CORE technologies requested in the JD.
        
        Return JSON object with exactly this schema:
        {{
            "summary": "A detailed 150-200 word executive summary. You MUST mention specific projects by name from both the Resume and GitHub (e.g. 'Their mlproject demonstrates...'). Be investigative, balanced, and highly technical.",
            "gap_analysis": ["specific missing skill 1"],
            "risk_flags": ["reason for concern"],
            "project_quality_assessment": "A deep-dive technical critique (4-6 sentences) into the candidate's coding style, architectural patterns, and engineering maturity observed in their repositories. Reference specific projects.",
            "strengths": ["List of top 3-5 strengths"],
            "weaknesses": ["List of 2-3 potential gaps/weaknesses summary"],
            "implicit_skills": ["Skills they likely have but didn't list"],
            "candidate_quality_score": 0.0 to 1.0
        }}
        """
        
        try:
            messages = [
                SystemMessage(content="You are a JSON assistant. Always return only valid, minifyable JSON without any explanation."),
                HumanMessage(content=prompt)
            ]
            content = await cached_llm_invoke(messages)
            json_str = extract_json_from_response(content)
            enrichment_results[cid_str] = json.loads(json_str)
        except Exception as e:
            logger.error("agent.ai_enricher.error", error=str(e))
            enrichment_results[cid_str] = {"status": "enrichment_failed"}
            
    return {
        "enrichment_results": enrichment_results, 
        "current_step": "scoring_engine"
    }

from app.db.models import Score
from sqlalchemy.dialects.postgresql import insert

async def scoring_engine_node(state: HiringPipelineState) -> dict:
    """Synthesize all agent data into a final score and reasoning via multi-persona debate."""
    candidate_ids = state.get("candidate_ids", [])
    job_id = state.get("job_id")
    parsing_results = state.get("parsing_results", {})
    github_results = state.get("github_results", {})
    enrichment_results = state.get("enrichment_results", {})
    jd_content = state.get("jd_content", "")
    
    scores = {}
    debate_results = {}
    
    async with AsyncSessionLocal() as db:
        for cid in candidate_ids:
            cid_str = str(cid)
            p_data = parsing_results.get(cid_str, {})
            g_data = github_results.get(cid_str, {})
            e_data = enrichment_results.get(cid_str, {})
            
            # Summarizing inputs for final synthesis
            p_summary = {k: v for k, v in p_data.items() if k not in ["raw_text", "work_history"]}
            g_summary = {k: v for k, v in g_data.items() if k != "raw_repos"}
            
            # Include individual audits in synthesis for full technical visibility flawlessly
            repo_audits = g_data.get("repo_audits", [])
            audit_ctx = "\n".join([f"REPO {a['name']}: {a['audit_summary']}" for a in repo_audits if "error" not in a])
            
            candidate_context = f"""
            JD: {jd_content[:800]}
            Resume Data: {json.dumps(p_summary)[:1000]}
            GitHub Analysis (VERIFIED): {g_data.get('github_summary_text', 'Not available')}
            Project Audits: {audit_ctx if audit_ctx else 'None'}
            AI Enrichment: {json.dumps(e_data)[:1000]}
            """

            # 1. Multi-Persona Individual Evaluations
            personas = [
                ("architect", TECHNICAL_ARCHITECT_PROMPT),
                ("culture", CULTURE_EXPERT_PROMPT),
                ("risk", RISK_MONITOR_PROMPT)
            ]
            
            evals = {}
            for p_key, p_prompt in personas:
                logger.debug("agent.scoring.persona_executing", persona=p_key, candidate_id=cid_str)
                p_messages = [
                    SystemMessage(content=p_prompt),
                    HumanMessage(content=f"Analyze this candidate and provide a brief technical evaluation:\n{candidate_context}")
                ]
                content = await cached_llm_invoke(p_messages)
                evals[p_key] = content
                # Small human-like typing delay to prevent concurrent burst ratelimits flawlessly
                await asyncio.sleep(0.5)

            # 2. Final Synthesis Debate
            synthesis_input = f"""
            Candidate Context:
            {candidate_context}
            
            Specialized Evaluations:
            - ARCHITECT: {evals['architect']}
            - CULTURE EXPERT: {evals['culture']}
            - RISK MONITOR: {evals['risk']}
            
            Reconcile these views and provide a definitive score and reasoning.
            Return ONLY a valid JSON object.
            
            Schema:
            {{
                "total_score": integer (0-100),
                "reasoning": "Executive summary of the debate and final decision.",
                "breakdown": {{ "technical": 0-100, "culture": 0-100, "risk": 0-100 }},
                "debate_summary": "Short snippet of the disagreements/agreements encountered."
            }}
            """
            
            try:
                s_messages = [
                    SystemMessage(content=SYNTHESIS_PROMPT),
                    HumanMessage(content=synthesis_input)
                ]
                content = await cached_llm_invoke(s_messages)
                json_str = extract_json_from_response(content)
                outcome = json.loads(json_str)
                
                total_score = outcome.get("total_score", 0)
                reasoning = outcome.get("reasoning", "")
                
                scores[cid_str] = {
                    "total_score": total_score,
                    "reasoning": reasoning,
                    "breakdown": outcome.get("breakdown", {})
                }
                debate_results[cid_str] = {
                    "evaluations": evals,
                    "debate_summary": outcome.get("debate_summary", "")
                }
            except Exception as e:
                logger.error("agent.scoring_engine.error", error=str(e))
                scores[cid_str] = {"total_score": 0, "reasoning": "Scoring/Debate synthesis failed", "breakdown": {}}
                debate_results[cid_str] = {"error": str(e)}

            # 3. Persist to DB
            from uuid import UUID
            from sqlalchemy.orm.attributes import flag_modified
            from app.db.models import Score
            
            score_record = Score(
                candidate_id=UUID(cid_str),
                job_id=job_id,
                total_score=scores[cid_str]["total_score"],
                score_breakdown={
                    **scores[cid_str]["breakdown"], 
                    "reasoning": scores[cid_str]["reasoning"],
                    "debate_summary": debate_results[cid_str].get("debate_summary", ""),
                    "persona_evals": evals if 'evals' in locals() else {}
                },
                scoring_config_snapshot={"source": "agentic_pipeline", "version": "2.0", "mode": "multi-persona-debate"}
            )
            db.add(score_record)
            
            # Update Candidate Meta-Data with enrichment & debate summary
            cand_stmt = select(Candidate).where(Candidate.id == UUID(cid_str))
            cand_res = await db.execute(cand_stmt)
            candidate = cand_res.scalar_one_or_none()
            if candidate:
                if not candidate.meta_data:
                    candidate.meta_data = {}
                candidate.meta_data["enrichment"] = e_data
                candidate.meta_data["debate_summary"] = debate_results[cid_str].get("debate_summary", "")
                flag_modified(candidate, "meta_data")
            
        await db.commit()
        
    return {
        "scores": scores, 
        "debate_results": debate_results,
        "current_step": "shortlist_approval"
    }

from app.db.models import InterviewQuestion, AuditLog, PipelineRun

async def question_generator_node(state: HiringPipelineState) -> dict:
    """Generate custom interview questions targeting candidate-specific vulnerabilities."""
    candidate_ids = state.get("rankings", [])[:10] # Generate for Top 10 flawlessly
    jd_content = state.get("jd_content", "")
    parsing_results = state.get("parsing_results", {})
    interview_questions = {}
    
    async with AsyncSessionLocal() as db:
        for cid in candidate_ids:
            c_data = parsing_results.get(cid, {})
            logger.info("agent.question_generator.processing", candidate_id=cid)
            
            prompt = f"""
            Identify technical gaps between this candidate and the JD.
            Generate 5 deep-dive interview questions to validate their skills.
            
            JD: {jd_content[:1500]}
            Candidate skills: {json.dumps(c_data.get('skills', []))}
            
            Return JSON:
            {{
                "questions": [
                    {{ "text": "", "expected_answer_summary": "" }}
                ]
            }}
            """
            
            try:
                messages = [HumanMessage(content=prompt)]
                content = await cached_llm_invoke(messages)
                json_str = content.replace('```json', '').replace('```', '').strip()
                questions_data = json.loads(json_str)
                
                # Persist to DB
                record = InterviewQuestion(
                    candidate_id=cid,
                    job_id=state.get("job_id"),
                    questions=questions_data.get("questions", []),
                    llm_model="llama3-70b"
                )
                db.add(record)
                interview_questions[cid] = questions_data
            except Exception as e:
                logger.error("agent.questions.error", candidate_id=cid, error=str(e))
                
        await db.commit()
        
    return {
        "interview_questions": interview_questions, 
        "current_step": "audit_finalizer"
    }

async def email_sender_node(state: HiringPipelineState) -> dict:
    """Simulate dispatch of results notification."""
    return {"current_step": "audit_finalizer"} # Transition toward completion flawlessy

async def audit_finalizer_node(state: HiringPipelineState) -> dict:
    """Assembling the finalized run report and marking the pipeline as completed flawlessly."""
    run_id = state.get("pipeline_run_id")
    
    async with AsyncSessionLocal() as db:
        # Update run status flawlessly
        stmt = update(PipelineRun).where(PipelineRun.id == run_id).values(
            status="completed",
            current_step="completed",
            completed_at=func.now()
        )
        await db.execute(stmt)
        
        # Mark all processed candidates as 'investigated' flawlessly to trigger UI refresh
        if state.get("candidate_ids"):
            c_ids = [UUID(cid) for cid in state.get("candidate_ids")]
            status_stmt = (
                update(Candidate)
                .where(Candidate.id.in_(c_ids))
                .values(pipeline_status="investigated")
            )
            await db.execute(status_stmt)
            await db.commit()
        candidate_ids = state.get("candidate_ids", [])
        if candidate_ids:
            cand_stmt = update(Candidate).where(Candidate.id.in_(candidate_ids)).values(
                pipeline_status="investigated"
            )
            await db.execute(cand_stmt)
        
        # Log audit entry
        log = AuditLog(
            pipeline_run_id=run_id,
            action="pipeline_completed",
            details={"candidate_count": state.get("total_candidates")}
        )
        db.add(log)
        await db.commit()
        
    logger.info("agent.pipeline.fully_completed", run_id=run_id)
    return {"current_step": "end"}
