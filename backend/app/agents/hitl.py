from app.agents.state import HiringPipelineState

async def hitl_jd_approval(state: HiringPipelineState) -> dict:
    """Wait state for human review on LLM generated Job Descriptions."""
    return {"current_step": "hitl_jd_approval"}

async def hitl_shortlist_approval(state: HiringPipelineState) -> dict:
    """Wait state prior to launching post-scoring external outreach routines."""
    return {"current_step": "hitl_shortlist_approval"}

async def hitl_question_approval(state: HiringPipelineState) -> dict:
    """Wait state permitting internal review of uniquely extracted interview material per candidate."""
    return {"current_step": "hitl_question_approval"}
