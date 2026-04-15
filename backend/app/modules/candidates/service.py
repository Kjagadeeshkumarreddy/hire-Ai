import logging
import datetime
import os
import json
import uuid
from typing import Dict, Any, Optional, List
from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import Candidate, Job, JDVersion, EmailLog, Resume, GitHubAnalysis
from app.config import settings
from app.core.mailer import send_email
from groq import Groq

logger = logging.getLogger(__name__)

async def promote_candidates(job_id: UUID, candidate_ids: List[UUID], round_name: str, user_id: UUID, db: AsyncSession, job_status: str = "active") -> Dict[str, Any]:
    """Promote selected candidates to a new round by creating a specialized sub-job flawlessly."""
    
    # 1. Fetch original job
    stmt = select(Job).where(Job.id == job_id)
    res = await db.execute(stmt)
    original_job = res.scalar_one_or_none()
    if not original_job:
        return {"status": "error", "message": "Original job not found"}

    # 2. Determine Next Number
    pattern = f"{original_job.title} - {round_name}%"
    count_stmt = select(func.count(Job.id)).where(Job.title.like(pattern))
    count_res = await db.execute(count_stmt)
    count = count_res.scalar() or 0
    next_number = count + 1
    new_title = f"{original_job.title} - {round_name} {next_number}"

    # 3. Create New Job
    new_job = Job(
        title=new_title,
        created_by=user_id,
        status=job_status,
        scoring_config=original_job.scoring_config or {},
        department=original_job.department
    )
    db.add(new_job)
    await db.flush()

    # 4. Clone Latest JD Version
    jd_stmt = select(JDVersion).where(JDVersion.job_id == job_id).order_by(JDVersion.version.desc())
    latest_jd = (await db.execute(jd_stmt)).scalars().first()
    if latest_jd:
        new_jd = JDVersion(
            job_id=new_job.id,
            version=1,
            content=latest_jd.content,
            structured_data=latest_jd.structured_data,
            status='approved',
            approved_by=user_id,
            approved_at=datetime.datetime.now(datetime.UTC)
        )
        db.add(new_jd)

    # 5. Clone Candidates and their data
    for old_id in candidate_ids:
        c_stmt = select(Candidate).where(Candidate.id == old_id)
        old_cand = (await db.execute(c_stmt)).scalar_one_or_none()
        if not old_cand: continue

        new_cand = Candidate(
            job_id=new_job.id,
            full_name=old_cand.full_name,
            email=old_cand.email,
            phone=old_cand.phone,
            github_username=old_cand.github_username,
            linkedin_url=old_cand.linkedin_url,
            pipeline_status="shortlisted",
            is_shortlisted=True,
            meta_data=old_cand.meta_data or {},
            # Generate new anonymized_id to maintain uniqueness
            anonymized_id=f"R{next_number}-{str(uuid.uuid4())[:8]}"
        )
            
        db.add(new_cand)
        await db.flush()

        # Clone Resume
        r_stmt = select(Resume).where(Resume.candidate_id == old_id)
        old_resume = (await db.execute(r_stmt)).scalar_one_or_none()
        if old_resume:
            new_resume = Resume(
                candidate_id=new_cand.id,
                raw_text=old_resume.raw_text,
                parsed_data=old_resume.parsed_data,
                skills=old_resume.skills,
                experience_years=old_resume.experience_years,
                education=old_resume.education,
                work_history=old_resume.work_history,
                parsing_status="completed"
            )
            db.add(new_resume)

        # Clone GitHub Analysis
        g_stmt = select(GitHubAnalysis).where(GitHubAnalysis.candidate_id == old_id)
        old_gh = (await db.execute(g_stmt)).scalar_one_or_none()
        if old_gh:
            new_gh = GitHubAnalysis(
                candidate_id=new_cand.id,
                username=old_gh.username,
                total_repos=old_gh.total_repos,
                total_stars=old_gh.total_stars,
                top_languages=old_gh.top_languages,
                top_repos=old_gh.top_repos,
                analysis_status="completed"
            )
            db.add(new_gh)

    await db.commit()
    return {"status": "success", "new_job_id": str(new_job.id), "new_job_title": new_title}

async def generate_email_draft(candidate_id: UUID, db: AsyncSession) -> Dict[str, str]:
    """Generate a personalized interview invitation draft for a single candidate flawlessy."""
    # 1. Fetch Candidate and JD Context
    stmt = select(Candidate, Job).join(Job, Job.id == Candidate.job_id).where(Candidate.id == candidate_id)
    res = await db.execute(stmt)
    data = res.first()
    if not data: return {"subject": "Interview Invitation", "body": "Hello."}
    
    candidate, job = data
    jd_stmt = select(JDVersion).where(JDVersion.job_id == job.id).order_by(JDVersion.version.desc())
    jd_res = await db.execute(jd_stmt)
    jd = jd_res.scalars().first()
    jd_content = jd.content if jd else job.title

    client = Groq(api_key=settings.GROQ_API_KEY)
    prompt = f"Write a personalized interview invite for {candidate.full_name} for role {job.title} based on JD: {jd_content[:500]}. Return JSON with subject and body."
    
    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        import json
        return json.loads(completion.choices[0].message.content)
    except Exception:
        return {"subject": f"Interview: {job.title}", "body": f"Hi {candidate.full_name}, we'd like to interview you."}

async def generate_bulk_email_draft(job_id: UUID, db: AsyncSession, adjustments: str = None, previous_content: str = None) -> Dict[str, str]:
    """Generate a bulk outreach template for a specific JD with professional refinement flawlessy."""
    
    # 1. Fetch JD Context
    stmt = select(Job).where(Job.id == job_id)
    res = await db.execute(stmt)
    job = res.scalars().first()
    
    if not job:
        return {"subject": "Job Opportunity", "body": "Hello, we are interested in your profile."}
        
    jd_stmt = select(JDVersion).where(JDVersion.job_id == job.id, JDVersion.status == 'approved').order_by(JDVersion.version.desc())
    jd_res = await db.execute(jd_stmt)
    jd = jd_res.scalars().first()
    jd_content = jd.content if jd else job.title

    # 2. Construct LLM Prompt
    client = Groq(api_key=settings.GROQ_API_KEY)
    
    system_instr = """You are an Executive Technical Recruiter at a high-growth tech scale-up.
    Your tone is ultra-professional, concise, and compelling. 
    Use HTML paragraphs (<p>) for clear spacing. 
    ALWAYS return valid JSON with "subject" and "body" keys."""
    
    if adjustments and previous_content:
        # REFINEMENT MODE
        prompt = f"""
        CONTEXT: Hiring a {job.title}.
        CURRENT DRAFT: {previous_content}
        USER FEEDBACK: {adjustments}
        
        TASK: Refine the draft to be more professional and structured.
        - Ensure every paragraph is wrapped in <p> tags.
        - Use {{candidate_name}} and {{job_title}} as precise placeholders.
        - Keep the tone elite and respectful of the candidate's time.
        """
    else:
        # FRESH GENERATION MODE
        prompt = f"""
        ROLE: {job.title}
        DETAILS: {jd_content[:800]}
        
        TASK: Write a world-class initial outreach email.
        - Structure: Greeting, compelling role hook, "why you" section, and a clear call to action.
        - Format: Use <p> tags for readability.
        - Placeholders: Use {{candidate_name}} and {{job_title}}.
        - Tone: Sophisticated, startup-founder style.
        """

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_instr},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        import json
        return json.loads(completion.choices[0].message.content)
    except Exception as e:
        print(f"CRITICAL AI ERROR: {e}")
        # Dynamic Fallback if AI fails (e.g. invalid API key)
        greeting = "Hello" if "hello" in (adjustments or "").lower() else "Hi"
        return {
            "subject": f"Next Steps: {job.title} Opportunity",
            "body": f"<p>{greeting} {{candidate_name}},</p><p>We have an opening for a <strong>{{job_title}}</strong> that aligns perfectly with your technical background.</p><p>We would value a brief conversation about this role. [Link]</p><p>Best regards,<br/>Recruitment</p>"
        }

async def generate_interview_questions(candidate_id: UUID, db: AsyncSession) -> Dict[str, Any]:
    """Generate categorized interview questions (Easy, Med, Hard) by synthesizing JD, Resume, and GitHub."""
    from app.db.models import Resume, GitHubAnalysis, InterviewQuestion, Job, JDVersion
    
    # 1. Fetch ALL Context flawlessy
    stmt = (
        select(Candidate, Job)
        .join(Job, Job.id == Candidate.job_id)
        .where(Candidate.id == candidate_id)
    )
    res = await db.execute(stmt)
    data = res.first()
    if not data: return {"error": "Candidate/Job not found"}
    candidate, job = data

    # 2. Fetch Deep Context (Resume & GitHub)
    resume_stmt = select(Resume).where(Resume.candidate_id == candidate_id)
    resume = (await db.execute(resume_stmt)).scalars().first()
    
    github_stmt = select(GitHubAnalysis).where(GitHubAnalysis.candidate_id == candidate_id)
    github = (await db.execute(github_stmt)).scalars().first()
    
    jd_stmt = select(JDVersion).where(JDVersion.job_id == job.id, JDVersion.status == 'approved').order_by(JDVersion.version.desc())
    jd = (await db.execute(jd_stmt)).scalars().first()
    jd_text = jd.content if jd else job.title

    # 3. Construct the "Deep Audit" Prompt
    client = Groq(api_key=settings.GROQ_API_KEY)
    
    resume_context = f"RESUME SUMMARY: {resume.parsed_data if resume else 'N/A'}"
    github_context = f"GITHUB REPOS: {github.top_repos if github else 'N/A'}. LANGUAGES: {github.top_languages if github else 'N/A'}"
    
    prompt = f"""
    ROLE: {job.title}
    JD: {jd_text[:800]}
    
    CANDIDATE: {candidate.full_name}
    {resume_context}
    {github_context}
    
    TASK: Generate a technical interview guide categorized by difficulty.
    - EASY: Foundation questions based on their Resume claims.
    - MEDIUM: Application questions based on the JD requirements.
    - HARD: Deep-dive questions based on their actual GITHUB IMPLEMENTATIONS and complex projects.
    
    INSTRUCTION: Specifically mention repository names or specific resume projects in the 'HARD' questions.
    Format your response as a JSON object with keys: "easy", "medium", "hard". Each value should be a list of 2-3 questions.
    """

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a world-class technical interviewer. Return JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        import json
        questions = json.loads(completion.choices[0].message.content)
        
        # 4. Persist to DB
        new_q = InterviewQuestion(
            candidate_id=candidate_id,
            job_id=job.id,
            questions=questions,
            llm_model="llama-3.3-70b-versatile"
        )
        db.add(new_q)
        await db.commit()
        return questions
        
    except Exception as e:
        print(f"FORGE ERROR: {e}")
        return {
            "easy": ["Tell us about your background in software development.", f"What interests you about the {job.title} role?"],
            "medium": [f"How do you handle state management in a project like this?", "Explain your approach to testing code."],
            "hard": ["Describe the most complex architectural challenge you solved in your featured projects.", "How would you optimize the performance of your most active repository?"]
        }

async def send_bulk_emails(job_id: UUID, subject: str, body: str, db: AsyncSession):
    """Blast the template to every shortlisted candidate for the job flawlessly."""
    import logging
    _log = logging.getLogger("app.outreach")
    
    # Fetch job title for replacement
    job_stmt = select(Job).where(Job.id == job_id)
    job_res = await db.execute(job_stmt)
    job = job_res.scalars().first()
    job_title = job.title if job else "the role"

    print(f"DEBUG: Starting Blast for Job {job_title} ({job_id})...")

    # 1. Fetch all shortlisted candidates for this Job
    stmt = select(Candidate).where(Candidate.job_id == job_id, Candidate.is_shortlisted == True)
    res = await db.execute(stmt)
    candidates = res.scalars().all()

    _log.info(f"BLAST: Found {len(candidates)} shortlisted candidates")
    
    if not candidates:
        return {"sent_count": 0, "status": "no_candidates_found"}

    sent_count = 0
    errors = []

    for cand in candidates:
        name = cand.full_name or "Candidate"
        # Robust Placeholder Replacement flawlessy
        p_subject = subject.replace("{{candidate_name}}", name).replace("{candidate_name}", name)
        p_subject = p_subject.replace("{{job_title}}", job_title).replace("{job_title}", job_title)
        
        p_body = body.replace("{{candidate_name}}", name).replace("{candidate_name}", name)
        p_body = p_body.replace("{{job_title}}", job_title).replace("{job_title}", job_title)
        
        try:
            success = await send_email(cand.email, p_subject, p_body)
            if success:
                log_entry = EmailLog(
                    candidate_id=cand.id,
                    job_id=job_id,
                    email_type="bulk_outreach",
                    recipient_email=cand.email,
                    subject=p_subject,
                    body=p_body,
                    status="sent",
                    sent_at=datetime.datetime.now(datetime.UTC)
                )
                db.add(log_entry)
                sent_count += 1
                _log.info(f"BLAST: Sent to {cand.email}")
            else:
                _log.error(f"BLAST: SMTP Failure for {cand.email}")
                errors.append(f"SMTP error for {cand.email}")
        except Exception as e:
            _log.error(f"BLAST: Exception for {cand.email}: {str(e)}")
            errors.append(str(e))
    
    await db.commit()
    return {
        "sent_count": sent_count, 
        "total_requested": len(candidates),
        "status": "completed" if sent_count > 0 else "failed",
        "errors": errors
    }
async def generate_offer_template(job_id: UUID, db: AsyncSession) -> Dict[str, str]:
    """Generate a unified, high-fidelity AI-styled offer letter dossier flawlessy."""
    # 1. Fetch Job and JD
    stmt = select(Job).where(Job.id == job_id)
    res = await db.execute(stmt)
    job = res.scalars().first()
    if not job: return {"html": "Job not found."}
    
    jd_stmt = select(JDVersion).where(JDVersion.job_id == job_id, JDVersion.status == 'approved').order_by(JDVersion.version.desc())
    jd = (await db.execute(jd_stmt)).scalars().first()
    jd_content = jd.content if jd else job.title

    # 2. Construct AI Prompt
    client = Groq(api_key=settings.GROQ_API_KEY)
    system_instr = """You are a Principal People Partner and expert UI/UX designer.
    Generate a formal, high-fidelity employment offer letter.
    IMPORTANT: Provide the response as a SINGLE, unified HTML block including a <style> section.
    - Use precise placeholders: {{candidate_name}}, {{job_title}}, {{salary}}, {{joining_date}}, {{date}}.
    - DESIGN: Premium, modern, and high-contrast. Use clean typography and professional spacing.
    - FORMAT: Return only a JSON object with a single "html" key containing the full document."""

    prompt = f"""
    ROLE: {job.title}
    DEP: {job.department or 'Engineering'}
    CONTEXT: {jd_content[:1000]}
    
    TASK: Write a master offer dossier using semantic HTML.
    STYLING RULES: 
    1. STRICTLY use a universal white (#ffffff) background for the entire document body. 
    2. Use dark gray/black text (#111111) to guarantee perfect readability and PDF export compatibility.
    3. Do NOT mix dark backgrounds with light backgrounds. Keep it a unified, formal 'white-paper' aesthetic.
    
    Include a styled header with {{date}} and the company name.
    Sections: Formal Greeting, The Offer ({{job_title}}), Compensation ({{salary}}), Joining Date ({{joining_date}}), and Signature line.
    """

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_instr},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        data = json.loads(completion.choices[0].message.content)
        html_output = data.get("html")
        if not html_output or str(html_output) == "None":
            return {"html": "<p>Failed to generate structured HTML dossier. Please try again.</p>"}
        return {"html": str(html_output)}

    except Exception as e:
        print(f"TEMPLATE GEN ERROR: {e}")
        return {"html": f"<p>Error synthesizing logic: {str(e)}</p>"}

async def refine_offer_template(job_id: UUID, current_html: str, feedback: str, db: AsyncSession) -> Dict[str, str]:
    """Iteratively refine the offer dossier based on conversational feedback flawlessly."""
    client = Groq(api_key=settings.GROQ_API_KEY)
    system_instr = """You are a Principal People Partner. Your goal is to refine an existing HTML offer letter based on user feedback.
    - MAINTAIN the exact structure of placeholders like {{candidate_name}} and {{job_title}}.
    - APPLY the requested changes (styling, content, or layout).
    - STRICTLY enforce a formal 'white-paper' aesthetic (white background, dark readable text) unless the user explicitly requests dark mode. Do not mix background colors randomly.
    - RETURN only a JSON object with a single "html" key containing the updated, full document."""

    prompt = f"""
    CURRENT HTML: {current_html}
    USER FEEDBACK: {feedback}
    
    Refine the HTML to reflect this feedback while ensuring it remains a valid, single-block HTML dossier.
    """

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_instr},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        data = json.loads(completion.choices[0].message.content)
        html_output = data.get("html")
        if not html_output or str(html_output) == "None":
            print("REFINEMENT WARNING: LLM returned empty or null HTML.")
            return {"html": current_html}
        return {"html": str(html_output)}

    except Exception as e:
        print(f"REFINEMENT ERROR: {e}")
        return {"html": current_html} # Fallback to current
    except Exception as e:
        print(f"TEMPLATE GEN ERROR: {e}")
        return {
            "header": "<h3>OFFER OF EMPLOYMENT</h3><p>Date: {{date}}</p><p>To: {{candidate_name}}</p>",
            "content": f"<p>Dear {{candidate_name}},</p><p>We are thrilled to offer you the position of <strong>{job.title}</strong>. Your compensation will be {{salary}} and your start date is {{joining_date}}.</p><p>Welcome to the team!</p>"
        }
