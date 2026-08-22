import uuid
from sqlalchemy import (
    Column, Integer, String, Boolean, ForeignKey, 
    DateTime, Text, Numeric, Index, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, INET
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid())
    email = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False) # admin, hr, student, company, viewer
    # SMTP Configuration for dynamic outbound email flawlessly
    smtp_host = Column(String(255), nullable=True)
    smtp_port = Column(Integer, server_default='587')
    smtp_user = Column(String(255), nullable=True)
    smtp_password = Column(String(255), nullable=True)
    # OAuth tokens for meeting platform integrations
    google_oauth_token = Column(JSONB, nullable=True)  # {access_token, refresh_token, expiry, calendar_id}
    teams_oauth_token = Column(JSONB, nullable=True)   # {access_token, refresh_token, expiry}
    is_active = Column(Boolean, server_default='true')
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint('email', 'role', name='uq_user_email_role'),
    )

class Job(Base):
    __tablename__ = "jobs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    title = Column(String(255), nullable=False)
    department = Column(String(100))
    status = Column(String(20), server_default='draft') # draft, active, closed, archived
    scoring_config = Column(JSONB, nullable=False, server_default='{}')
    bias_free_enabled = Column(Boolean, server_default='false')
    top_n_count = Column(Integer, server_default='10')
    # New columns for agentic ingestion tracking
    ingestion_status = Column(String(20), server_default='idle')  # idle, queued, processing, completed, failed
    ingestion_progress = Column(JSONB, server_default='{}')
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index('idx_jobs_status', 'status'),
        Index('idx_jobs_created_by', 'created_by'),
    )

class JDVersion(Base):
    __tablename__ = "jd_versions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False)
    version = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    structured_data = Column(JSONB)
    generation_prompt = Column(Text)
    llm_model = Column(String(50))
    status = Column(String(20)) # draft, approved, rejected
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    approved_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint('job_id', 'version', name='uq_jd_version_job_version'),
        Index('idx_jd_versions_job_id', 'job_id'),
    )

class Candidate(Base):
    __tablename__ = "candidates"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False)
    full_name = Column(String(255))
    email = Column(String(255))
    phone = Column(String(50))
    github_username = Column(String(100))
    linkedin_url = Column(String(500))
    source_file = Column(String(255)) 
    pipeline_status = Column(String(30), server_default='uploaded')
    is_shortlisted = Column(Boolean, server_default='false')
    shortlisted_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    shortlisted_at = Column(DateTime(timezone=True))
    anonymized_id = Column(String(20), unique=True)
    meta_data = Column(JSONB, server_default='{}')
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint('job_id', 'email', name='uq_candidate_job_email'),
        Index('idx_candidates_job_id', 'job_id'),
        Index('idx_candidates_email', 'email'),
        Index('idx_candidates_pipeline_status', 'pipeline_status'),
    )

class Resume(Base):
    __tablename__ = "resumes"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id = Column(UUID(as_uuid=True), ForeignKey("candidates.id", ondelete="CASCADE"), unique=True, nullable=False)
    raw_text = Column(Text)
    parsed_data = Column(JSONB, nullable=False, server_default='{}')
    # Use JSONB for array elements to simplify sqlalchemy-agnostic arrays or rely on Text fields. We use JSONB for list mapping.
    skills = Column(JSONB) # store as json array
    experience_years = Column(Numeric(4, 1))
    education = Column(JSONB)
    work_history = Column(JSONB)
    file_hash = Column(String(64))
    parsing_status = Column(String(20), server_default='pending')
    parsing_error = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index('idx_resumes_candidate_id', 'candidate_id'),
        Index('idx_resumes_file_hash', 'file_hash'),
    )

class GitHubAnalysis(Base):
    __tablename__ = "github_analysis"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id = Column(UUID(as_uuid=True), ForeignKey("candidates.id", ondelete="CASCADE"), unique=True)
    username = Column(String(100), nullable=False)
    total_repos = Column(Integer)
    original_repos = Column(Integer)
    fork_ratio = Column(Numeric(3,2))
    total_stars = Column(Integer)
    total_forks_received = Column(Integer)
    top_languages = Column(JSONB)
    has_recent_activity = Column(Boolean)
    avg_repo_size_kb = Column(Integer)
    repos_with_description = Column(Integer)
    repos_with_license = Column(Integer)
    top_repos = Column(JSONB)
    authenticity_score = Column(Numeric(3,2))
    risk_flags = Column(JSONB, server_default='[]')
    analysis_status = Column(String(20), server_default='pending')
    raw_response = Column(JSONB)
    analyzed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index('idx_github_candidate_id', 'candidate_id'),
        Index('idx_github_username', 'username'),
    )

class Score(Base):
    __tablename__ = "scores"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id = Column(UUID(as_uuid=True), ForeignKey("candidates.id"), nullable=False)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False)
    scoring_mode = Column(String(20)) # normal, bias_free
    resume_score = Column(Numeric(5,2))
    github_score = Column(Numeric(5,2))
    skill_match_score = Column(Numeric(5,2))
    experience_score = Column(Numeric(5,2))
    education_score = Column(Numeric(5,2))
    ai_enrichment_score = Column(Numeric(5,2))
    authenticity_score = Column(Numeric(5,2))
    total_score = Column(Numeric(5,2), nullable=False)
    score_breakdown = Column(JSONB, nullable=False)
    gap_analysis = Column(JSONB)
    rank = Column(Integer)
    scoring_config_snapshot = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint('candidate_id', 'job_id', 'scoring_mode', name='uq_scores_cand_job_mode'),
        Index('idx_scores_candidate_job', 'candidate_id', 'job_id'),
        Index('idx_scores_rank', 'rank'),
    )

class InterviewQuestion(Base):
    __tablename__ = "interview_questions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id = Column(UUID(as_uuid=True), ForeignKey("candidates.id"), nullable=False)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False)
    questions = Column(JSONB, nullable=False)
    question_category = Column(String(50), server_default='technical')
    generation_prompt = Column(Text)
    llm_model = Column(String(50))
    status = Column(String(20), server_default='draft')
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    approved_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class EmailLog(Base):
    __tablename__ = "email_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id = Column(UUID(as_uuid=True), ForeignKey("candidates.id"))
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"))
    email_type = Column(String(30))
    recipient_email = Column(String(255), nullable=False)
    subject = Column(String(500))
    body = Column(Text)
    status = Column(String(20), server_default='queued')
    sent_at = Column(DateTime(timezone=True))
    error_message = Column(Text)
    retry_count = Column(Integer, server_default='0')
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class PipelineRun(Base):
    __tablename__ = "pipeline_runs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False)
    triggered_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    status = Column(String(20), server_default='running')
    current_step = Column(String(50))
    langgraph_thread_id = Column(String(100))
    total_candidates = Column(Integer)
    processed_candidates = Column(Integer, server_default='0')
    error_log = Column(JSONB, server_default='[]')
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pipeline_run_id = Column(UUID(as_uuid=True), ForeignKey("pipeline_runs.id"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    candidate_id = Column(UUID(as_uuid=True), ForeignKey("candidates.id"))
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"))
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50))
    entity_id = Column(UUID(as_uuid=True))
    details = Column(JSONB, server_default='{}')
    ip_address = Column(INET)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index('idx_audit_candidate_id', 'candidate_id'),
        Index('idx_audit_job_id', 'job_id'),
        Index('idx_audit_action', 'action'),
        Index('idx_audit_created_at', 'created_at'),
    )

class SavedOffer(Base):
    __tablename__ = "saved_offer_letters"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id = Column(UUID(as_uuid=True), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=True)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    subject = Column(String(500))
    content = Column(Text, nullable=False)
    signature_status = Column(String(20), server_default='unsigned')  # unsigned, pending, signed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    candidate = relationship("Candidate")
    job = relationship("Job")

class StudentAssessment(Base):
    __tablename__ = "student_assessments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    jd_text = Column(Text, nullable=False)
    resume_url = Column(String(512))
    github_username = Column(String(100))
    
    # Analysis results mapping flawlessly
    total_score = Column(Numeric(5, 2))
    summary = Column(Text)
    skill_gap = Column(JSONB) # List of strings
    score_breakdown = Column(JSONB)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    user = relationship("User")

    __table_args__ = (
        Index('idx_assessment_user_id', 'user_id'),
    )


class OfferSignature(Base):
    __tablename__ = "offer_signatures"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    saved_offer_id = Column(UUID(as_uuid=True), ForeignKey("saved_offer_letters.id", ondelete="CASCADE"), nullable=False)
    candidate_id = Column(UUID(as_uuid=True), ForeignKey("candidates.id"), nullable=False)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False)

    # Signing token (unique link for candidate — no login required)
    signing_token = Column(String(64), unique=True, nullable=False)
    token_expires_at = Column(DateTime(timezone=True), nullable=False)
    expires_in_days = Column(Integer, nullable=False, server_default='7')

    # Signature data
    signature_image = Column(Text)         # Base64 PNG of drawn signature
    signature_type = Column(String(20))    # "drawn" or "typed"
    typed_name = Column(String(255))       # If typed signature

    # Legal metadata captured at signing time (Candidate)
    signer_ip = Column(String(45))         # IPv4/IPv6
    signer_user_agent = Column(String(500))
    consent_text = Column(Text)            # Exact legal text they agreed to
    signed_at = Column(DateTime(timezone=True))

    # HR Signature data (Counter-sign)
    hr_signature_image = Column(Text)
    hr_signature_type = Column(String(20))
    hr_typed_name = Column(String(255))
    hr_signed_at = Column(DateTime(timezone=True))
    hr_signer_ip = Column(String(45))
    hr_signer_user_agent = Column(String(500))

    # Status tracking
    status = Column(String(30), server_default='pending')  # pending, candidate_signed, signed, expired, revoked
    signed_pdf_data = Column(Text)         # Base64 of the final signed PDF

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    saved_offer = relationship("SavedOffer")
    candidate = relationship("Candidate")
    job = relationship("Job")

    __table_args__ = (
        Index('idx_esign_token', 'signing_token'),
        Index('idx_esign_offer', 'saved_offer_id'),
        Index('idx_esign_candidate', 'candidate_id'),
    )

class ResumeStyleTemplate(Base):
    __tablename__ = "resume_style_templates"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String(255))
    raw_text = Column(Text)
    style_dna = Column(JSONB) # { verb_tense, metric_density, technical_depth, etc. }
    section_map = Column(JSONB) # { detected sections }
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class StyleTransferJob(Base):
    __tablename__ = "style_transfer_jobs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    status = Column(String(30), server_default='pending') # pending, processing, completed, failed
    progress = Column(JSONB, server_default='{}') # { current_step, total_sections, completed_sections }
    candidate_data = Column(JSONB)
    style_config = Column(JSONB)
    output_markdown = Column(Text)
    output_pdf_url = Column(String(512))
    error_message = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class TechRecruiterCredential(Base):
    __tablename__ = "tech_recruiter_credentials"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recruiter_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False)
    login_id = Column(String(20), unique=True, nullable=False)
    max_marks = Column(Integer, nullable=False, server_default='100')
    is_active = Column(Boolean, server_default='true')
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    recruiter_user = relationship("User", foreign_keys=[recruiter_user_id])
    job = relationship("Job")

    __table_args__ = (
        Index('idx_techcred_login_id', 'login_id'),
        Index('idx_techcred_job_id', 'job_id'),
        Index('idx_techcred_created_by', 'created_by'),
    )

class TechnicalMark(Base):
    __tablename__ = "technical_marks"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    credential_id = Column(UUID(as_uuid=True), ForeignKey("tech_recruiter_credentials.id"), nullable=True)
    candidate_id = Column(UUID(as_uuid=True), ForeignKey("candidates.id"), nullable=False)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False)
    marks_obtained = Column(Numeric(5, 2), nullable=False)
    max_marks = Column(Integer, nullable=False)
    remarks = Column(Text)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    submitted_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    submitted_by_role = Column(String(20), nullable=True)  # 'tech_recruiter', 'hr', 'admin'
    edited_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    credential = relationship("TechRecruiterCredential")
    candidate = relationship("Candidate")
    job = relationship("Job")
    submitted_by_user = relationship("User", foreign_keys=[submitted_by_user_id])

    __table_args__ = (
        UniqueConstraint('credential_id', 'candidate_id', name='uq_techmark_cred_cand'),
        Index('idx_techmark_candidate', 'candidate_id'),
        Index('idx_techmark_job', 'job_id'),
    )

class AssessmentCategory(Base):
    """HR-defined evaluation categories for a specific job (e.g. Data Structures, System Design)."""
    __tablename__ = "assessment_categories"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    max_marks = Column(Integer, nullable=False)
    display_order = Column(Integer, nullable=False, server_default='0')
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    job = relationship("Job")

    __table_args__ = (
        Index('idx_assessment_cat_job', 'job_id'),
    )

class CategoryMark(Base):
    """Per-category marks submitted by a tech recruiter for a candidate."""
    __tablename__ = "category_marks"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    technical_mark_id = Column(UUID(as_uuid=True), ForeignKey("technical_marks.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("assessment_categories.id", ondelete="CASCADE"), nullable=False)
    marks_obtained = Column(Numeric(5, 2), nullable=False)

    # Relationships
    technical_mark = relationship("TechnicalMark", backref="category_marks")
    category = relationship("AssessmentCategory")

    __table_args__ = (
        UniqueConstraint('technical_mark_id', 'category_id', name='uq_catmark_mark_cat'),
        Index('idx_catmark_techmark', 'technical_mark_id'),
        Index('idx_catmark_category', 'category_id'),
    )


class InterviewSchedule(Base):
    """HR-created scheduling session defining date, time range, breaks, and meeting platform."""
    __tablename__ = "interview_schedules"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    schedule_date = Column(String(10), nullable=False)  # YYYY-MM-DD
    start_time = Column(String(5), nullable=False)       # HH:MM
    end_time = Column(String(5), nullable=False)         # HH:MM
    meeting_duration_minutes = Column(Integer, nullable=False, server_default='30')
    breaks = Column(JSONB, server_default='[]')          # [{start_time, end_time, label}]
    platform = Column(String(20), nullable=False, server_default="'custom'")  # google_meet, teams, custom
    custom_meeting_link = Column(String(500), nullable=True)
    status = Column(String(20), server_default='scheduled')  # draft, scheduled, completed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    job = relationship("Job")
    creator = relationship("User", foreign_keys=[created_by])
    slots = relationship("InterviewSlot", back_populates="schedule", cascade="all, delete-orphan")

    __table_args__ = (
        Index('idx_schedule_job_id', 'job_id'),
        Index('idx_schedule_created_by', 'created_by'),
        Index('idx_schedule_date', 'schedule_date'),
    )


class InterviewSlot(Base):
    """Individual time slot assigned to a candidate within a schedule."""
    __tablename__ = "interview_slots"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    schedule_id = Column(UUID(as_uuid=True), ForeignKey("interview_schedules.id", ondelete="CASCADE"), nullable=False)
    candidate_id = Column(UUID(as_uuid=True), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False)
    slot_start = Column(DateTime(timezone=True), nullable=False)
    slot_end = Column(DateTime(timezone=True), nullable=False)
    meeting_link = Column(String(500), nullable=True)
    meeting_id = Column(String(100), nullable=True)
    meeting_password = Column(String(100), nullable=True)
    platform = Column(String(20), server_default="'custom'")
    email_sent = Column(Boolean, server_default='false')
    email_sent_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(20), server_default='scheduled')  # scheduled, completed, cancelled, no_show
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    schedule = relationship("InterviewSchedule", back_populates="slots")
    candidate = relationship("Candidate")
    job = relationship("Job")

    __table_args__ = (
        UniqueConstraint('schedule_id', 'candidate_id', name='uq_slot_schedule_candidate'),
        Index('idx_slot_schedule_id', 'schedule_id'),
        Index('idx_slot_candidate_id', 'candidate_id'),
        Index('idx_slot_job_id', 'job_id'),
    )

