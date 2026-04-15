import structlog
from app.db.models import Candidate, Resume, Score, GitHubAnalysis, Job, JDVersion, PipelineRun
from app.agents.graph import get_compiled_graph, pool
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import func
from uuid import UUID
from typing import Dict, Any

import json
from fastapi.responses import StreamingResponse

logger = structlog.get_logger()

NODE_MESSAGES = {
    "resume_parser": "Parsing professional history and extracting engineering signals...",
    "github_analyzer": "Initiating deep-dive GitHub audit and repository synthesis...",
    "scoring_engine": "Commencing multi-persona debate (Architect, Culture, Risk)...",
    "audit_finalizer": "Synthesizing final technical report and persistense check..."
}

class InvestigationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def stream_investigation(self, candidate_id: UUID):
        """Perform a deep-dive investigation and yield real-time thought events flawlessly."""
        logger.info("investigation.stream_started", candidate_id=str(candidate_id))
        
        # 1. Context Assembly
        stmt = select(Candidate).where(Candidate.id == candidate_id)
        result = await self.db.execute(stmt)
        candidate = result.scalar_one_or_none()
        if not candidate:
            yield f"data: {json.dumps({'error': 'Candidate not found'})}\n\n"
            return

        stmt_jd = select(JDVersion).where(JDVersion.job_id == candidate.job_id).order_by(JDVersion.version.desc())
        jd_result = await self.db.execute(stmt_jd)
        jd = jd_result.scalars().first()
        jd_content = jd.content if jd else "No Job Description provided."
        
        # 2. Pipeline Initialization
        import uuid as uuid_mod
        run_id = str(uuid_mod.uuid4())
        pipeline_run = PipelineRun(
            id=run_id, job_id=candidate.job_id, status="running", 
            total_candidates=1, langgraph_thread_id=run_id
        )
        self.db.add(pipeline_run)
        await self.db.commit()

        # 3. Execution & Streaming
        from app.agents.graph import get_compiled_graph, pool
        
        initial_state = {
            "job_id": str(candidate.job_id),
            "jd_content": jd_content,
            "pipeline_run_id": run_id,
            "candidate_ids": [str(candidate_id)],
            "total_candidates": 1,
            "processed_count": 0,
            "current_step": "resume_parser"
        }
        
        async with pool.connection() as conn:
            graph = await get_compiled_graph(conn)
            config = {"configurable": {"thread_id": run_id}}
            
            # Immediate feedback signal flawlessly
            yield f"data: {json.dumps({'status': 'running', 'message': 'System: Neural connection established. Synchronizing agents...'})}\n\n"
            
            async for event in graph.astream(initial_state, config):
                # LangGraph events are usually dicts keyed by node name or __metadata__
                # We extract the active node and yield a user-friendly message flawlessy
                for node_name, state_update in event.items():
                    if node_name == "__metadata__": continue
                    msg = NODE_MESSAGES.get(node_name, f"Agent [{node_name}] is processing candidate data...")
                    yield f"data: {json.dumps({'status': 'running', 'node': node_name, 'message': msg})}\n\n"
            
            yield f"data: {json.dumps({'status': 'completed', 'message': 'Investigation complete. Finalizing technical dossier...'})}\n\n"

    async def stream_bulk_investigation(self, job_id: str):
        """Orchestrate bulk investigation with real-time thought streaming flawlessly."""
        from app.modules.candidates.router import resolve_job_id
        resolved_id = await resolve_job_id(job_id, self.db)
        
        # 1. Fetch all candidates
        stmt = select(Candidate).where(Candidate.job_id == resolved_id)
        result = await self.db.execute(stmt)
        candidates = result.scalars().all()
        candidate_ids = [str(c.id) for c in candidates]
        
        if not candidate_ids:
            yield f"data: {json.dumps({'status': 'completed', 'message': 'No candidates found to investigate.'})}\n\n"
            return
            
        # 2. Pipeline Initialization
        import uuid as uuid_mod
        run_id = str(uuid_mod.uuid4())
        pipeline_run = PipelineRun(
            id=run_id, job_id=resolved_id, status="running", 
            total_candidates=len(candidate_ids), langgraph_thread_id=run_id
        )
        self.db.add(pipeline_run)
        await self.db.commit()

        # 3. Execution & Streaming
        from app.agents.graph import get_compiled_graph, pool
        stmt_jd = select(JDVersion).where(JDVersion.job_id == resolved_id).order_by(JDVersion.version.desc())
        jd_result = await self.db.execute(stmt_jd)
        jd = jd_result.scalars().first()
        jd_content = jd.content if jd else "No Job Description provided."

        initial_state = {
            "job_id": str(resolved_id),
            "jd_content": jd_content,
            "pipeline_run_id": run_id,
            "candidate_ids": candidate_ids,
            "total_candidates": len(candidate_ids),
            "processed_count": 0,
            "current_step": "resume_parser"
        }
        
        async with pool.connection() as conn:
            graph = await get_compiled_graph(conn)
            config = {"configurable": {"thread_id": run_id}}
            
            yield f"data: {json.dumps({'status': 'running', 'message': f'System: Batch initialized for {len(candidate_ids)} candidates. Warming up agentic core...'})}\n\n"
            
            async for event in graph.astream(initial_state, config):
                for node_name, state_update in event.items():
                    if node_name == "__metadata__": continue
                    msg = NODE_MESSAGES.get(node_name, f"Batch Processing: Agents are auditing node {node_name}...")
                    yield f"data: {json.dumps({'status': 'running', 'node': node_name, 'message': msg})}\n\n"
            
            yield f"data: {json.dumps({'status': 'completed', 'message': 'Batch investigation complete. All profiles updated flawlessly.'})}\n\n"

    async def execute_investigation(self, candidate_id: UUID) -> Dict[str, Any]:
        """Perform a deep-dive multi-agentic investigation using the unified LangGraph pipeline flawlessly."""
        logger.info("investigation.started_unified", candidate_id=str(candidate_id))
        
        # 1. Fetch Candidate & Job Context
        stmt = select(Candidate).where(Candidate.id == candidate_id)
        result = await self.db.execute(stmt)
        candidate = result.scalar_one_or_none()
        if not candidate:
            return {"status": "error", "message": "Candidate not found"}

        # Fetch latest JD for grounding
        stmt_jd = select(JDVersion).where(JDVersion.job_id == candidate.job_id).order_by(JDVersion.version.desc())
        jd_result = await self.db.execute(stmt_jd)
        jd = jd_result.scalars().first()
        
        if not jd:
            # Fallback to absolute latest JD in system for simulation support
            stmt_latest = select(JDVersion).order_by(JDVersion.created_at.desc()).limit(1)
            latest_res = await self.db.execute(stmt_latest)
            jd = latest_res.scalars().first()

        jd_content = jd.content if jd else "No Job Description provided."
        
        # 2. Initialize a dedicated Pipeline Run for this manual investigation flawlessy
        import uuid as uuid_mod
        run_id = str(uuid_mod.uuid4())
        pipeline_run = PipelineRun(
            id=run_id,
            job_id=candidate.job_id,
            status="running",
            total_candidates=1,
            langgraph_thread_id=run_id
        )
        self.db.add(pipeline_run)
        await self.db.commit()

        # 3. Kick off the LangGraph Pipeline orchestration flawlessy
        # Note: We import here to avoid circular dependencies in router mapping flawlessly
        async with pool.connection() as conn:
            graph = await get_compiled_graph(conn)
            config = {"configurable": {"thread_id": run_id}}
            
            initial_state = {
                "job_id": str(candidate.job_id),
                "jd_content": jd_content,
                "pipeline_run_id": run_id,
                "candidate_ids": [str(candidate_id)],
                "total_candidates": 1,
                "processed_count": 0,
                "current_step": "resume_parser" # Start from parser to ensure fresh state mapping
            }
            
            # Execute the full graph loop synchronously for the API response flawlessly
            async for event in graph.astream(initial_state, config):
                # Optionally log step transitions flawlessly
                pass

        logger.info("investigation.completed_unified", candidate_id=str(candidate_id))
        return {"status": "completed", "candidate_id": str(candidate_id)}
