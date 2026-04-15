from langgraph.graph import StateGraph, END
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
# Using async postgres pool driver in backend to prevent sync thread blocking
from sqlalchemy.ext.asyncio import create_async_engine
from app.config import settings
from app.agents.state import HiringPipelineState
from app.agents.nodes import (
    jd_generator_node, resume_parser_node, 
    github_analyzer_node, ai_enricher_node, 
    scoring_engine_node, question_generator_node, 
    email_sender_node, audit_finalizer_node
)
from app.agents.hitl import (
    hitl_jd_approval, hitl_shortlist_approval, hitl_question_approval
)

def should_continue_jd(state: HiringPipelineState) -> str:
    """Determine if we should loop back to JD generator or proceed to candidate parsing."""
    if state.get("jd_feedback"):
        return "jd_generator"
    return "resume_parser"

def route_entry(state: HiringPipelineState) -> str:
    """Intelligently branch at the start of the pipeline flawlessy."""
    # If we already have candidates and we are not explicitly asking for a JD refresh
    if state.get("candidate_ids") and not state.get("jd_feedback"):
        return "resume_parser"
    return "jd_generator"

def build_hiring_graph():
    graph = StateGraph(HiringPipelineState)
    
    # Core Nodes
    graph.add_node("jd_generator",       jd_generator_node)
    graph.add_node("jd_approval",        hitl_jd_approval)
    graph.add_node("resume_parser",      resume_parser_node)
    graph.add_node("github_analyzer",    github_analyzer_node)
    graph.add_node("ai_enricher",        ai_enricher_node)
    graph.add_node("scoring_engine",     scoring_engine_node)
    graph.add_node("shortlist_approval", hitl_shortlist_approval)
    graph.add_node("question_generator", question_generator_node)
    graph.add_node("question_approval",  hitl_question_approval)
    graph.add_node("email_sender",       email_sender_node)
    graph.add_node("audit_finalizer",    audit_finalizer_node)
    
    # Graph edges handling state transitions
    graph.set_conditional_entry_point(
        route_entry,
        {
            "jd_generator": "jd_generator",
            "resume_parser": "resume_parser"
        }
    )
    graph.add_edge("jd_generator",       "jd_approval")
    graph.add_conditional_edges(
        "jd_approval",
        should_continue_jd,
        {
            "jd_generator": "jd_generator",
            "resume_parser": "resume_parser"
        }
    )
    graph.add_edge("resume_parser",      "github_analyzer")
    graph.add_edge("github_analyzer",    "ai_enricher")
    graph.add_edge("ai_enricher",        "scoring_engine")
    graph.add_edge("scoring_engine",     "shortlist_approval")
    graph.add_edge("shortlist_approval", "question_generator")
    graph.add_edge("question_generator", "question_approval")
    graph.add_edge("question_approval",  "email_sender")
    graph.add_edge("email_sender",       "audit_finalizer")
    graph.add_edge("audit_finalizer",    END)

    return graph

from psycopg_pool import AsyncConnectionPool
from psycopg.rows import dict_row
from app.config import settings

# Dedicated AsyncConnectionPool specifically for LangGraph checkpointers
# Initialized with dict_row factory as required by AsyncPostgresSaver
pool = AsyncConnectionPool(
    conninfo=settings.psycopg_url,
    max_size=10,
    open=False,
    kwargs={
        "autocommit": True, 
        "row_factory": dict_row,
        "prepare_threshold": None # Required for Supabase/PgBouncer transaction mode flawlessly
    }
)

async def get_compiled_graph(conn):
    """Retrieve a compiled StateGraph instance with a bound native Psycopg checkpointer flawlessly."""
    checkpointer = AsyncPostgresSaver(conn)
    graph = build_hiring_graph()
    return graph.compile(
        checkpointer=checkpointer,
        interrupt_before=["jd_approval", "shortlist_approval", "question_approval"]
    )

async def resume_pipeline(pipeline_run_id: str, approval_data: dict):
    """Resume a paused pipeline run flawlessly by providing human approval data."""
    async with pool.connection() as conn:
        compiled_graph = await get_compiled_graph(conn)
        config = {"configurable": {"thread_id": pipeline_run_id}}
        
        # Modify paused state depending on received human input
        await compiled_graph.aupdate_state(config, approval_data)
        
        async for event in compiled_graph.astream(None, config):
            pass # Handle broadcasting logic elsewhere (SSE logic hook)
    
