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
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False) # admin, hr, viewer
    # SMTP Configuration for dynamic outbound email flawlessly
    smtp_host = Column(String(255), nullable=True)
    smtp_port = Column(Integer, server_default='587')
    smtp_user = Column(String(255), nullable=True)
    smtp_password = Column(String(255), nullable=True)
    is_active = Column(Boolean, server_default='true')
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

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
        Index('idx_candidates_job_id', 'job_id'),
        Index('idx_candidates_email', 'email'),
        Index('idx_candidates_pipeline_status', 'pipeline_status'),
    )

class Resume(Base):
    __tablename__ = "resumes"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id = Column(UUID(as_uuid=True), ForeignKey("candidates.id"), unique=True, nullable=False)
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
    candidate_id = Column(UUID(as_uuid=True), ForeignKey("candidates.id"), unique=True)
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
