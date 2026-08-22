from typing import TypedDict, Optional, List, Dict, Any

class HiringPipelineState(TypedDict):
    # Identity
    job_id: str
    pipeline_run_id: str
    
    # JD Phase
    jd_content: Optional[str]
    jd_feedback: Optional[str]
    jd_version_id: Optional[str]
    jd_approved: bool
    
    # Candidate Phase
    candidate_ids: List[str]
    total_candidates: int
    processed_count: int
    
    # Processing Results
    parsing_results: Dict[str, Any]          # {candidate_id: ParseResult}
    github_results: Dict[str, Any]           # {candidate_id: GitHubResult}
    enrichment_results: Dict[str, Any]       # {candidate_id: EnrichmentResult}
    
    # Scoring
    scores: Dict[str, Any]                   # {candidate_id: ScoreResult}
    debate_results: Dict[str, Any]           # {candidate_id: PersonaEvaluations}
    rankings: List[str]                      # Ordered candidate_ids
    
    # HITL
    shortlisted_ids: List[str]
    shortlist_approved: bool
    
    # Interview
    interview_questions: Dict[str, Any]      # {candidate_id: QuestionSet}
    questions_approved: bool
    
    # Status
    current_step: str
    errors: List[Dict[str, Any]]
    
    # User Inputs for Generation Triggers
    input_job_title: Optional[str]
    input_department: Optional[str]
    input_key_requirements: Optional[List[str]]
    input_seniority: Optional[str]
    input_tone: Optional[str]
    input_template_text: Optional[str]
