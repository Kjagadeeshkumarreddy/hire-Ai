ENRICHMENT_PROMPT = """
You are an expert HR Recruiter analyzing a candidate profile. Extracts structured insights.

## Input Context
- Candidate resume text snippet: {resume_text}
- Job Title: {job_title}
- Required Skills for Job: {required_skills}

## Output Format (JSON)
{{
  "inferred_skills": ["skill1", ...],
  "experience_summary": "Short 1 sentence summary of depth of experience",
  "culture_fit_hints": ["hint1", ...],
  "estimated_years_match": X.X
}}
"""

GAP_ANALYSIS_PROMPT = """
You are performing a strict evaluation of a candidate against job requirements.

## Input Context
- Candidate Extracted Data: {candidate_data}
- Job Description Structured Requirements: {jd_requirements}

## Output Format (JSON)
{{
  "strengths": ["match1", "match2"],
  "missing_skills": ["missing1", "missing2"],
  "risk_factors": ["risk1"]
}}
"""
