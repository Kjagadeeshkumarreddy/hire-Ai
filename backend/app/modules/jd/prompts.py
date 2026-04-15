JD_GENERATION_PROMPT = """
You are an expert HR consultant. Generate a professional job description.

## Input
- Title: {title}
- Department: {department}
- Seniority: {seniority_level}
- Key Requirements: {requirements}

## Output Format (JSON)
{{
  "content": "Full JD in markdown",
  "required_skills": ["skill1", ...],
  "nice_to_have": ["skill1", ...],
  "experience_range": "X-Y years",
  "key_responsibilities": ["resp1", ...]
}}

## Rules
- Be specific, avoid generic phrases
- Include 5-8 required skills, 3-5 nice-to-have
- Avoid gendered language
- Focus on outcomes, not pedigree
"""
