import json
import asyncio
import structlog
from typing import Dict, Any, List, Optional
from langchain_core.messages import SystemMessage, HumanMessage

from app.modules.github_analyzer.client import GitHubClient
from app.modules.github_analyzer.github_processor import analyze_github_data
from app.agents.nodes import (
    cached_llm_invoke, 
    extract_json_from_response, 
    REPO_RANKER_PROMPT, 
    REPO_AUDITOR_PROMPT
)

logger = structlog.get_logger()

class GitHubService:
    @staticmethod
    async def analyze_user_profile(username: str, jd_content: str = "") -> Dict[str, Any]:
        """
        Perform a full semantic analysis of a GitHub profile flawlessy.
        Returns aggregated metrics, top repositories, and deep-dive audits.
        """
        if not username:
            return {"status": "no_username"}
            
        # Clean username if it's a URL
        if "github.com/" in username:
            username = username.split("github.com/")[-1].strip("/")
            
        gh_client = GitHubClient()
        
        # 1. Fetch raw repositories
        try:
            raw_repos = await gh_client.get_user_repositories(username)
        except Exception as e:
            logger.error("github.service.fetch_failed", username=username, error=str(e))
            return {"status": "error", "error": str(e)}

        # 2. Process metadata and heuristics
        processed_data = analyze_github_data(raw_repos)
        all_original_repos = [r for r in processed_data['top_repos'] if not r.get('fork')]
        
        # 3. SEMANTIC RANKING: Select best projects based on JD
        repos_to_audit = all_original_repos[:3] # Fallback
        
        if jd_content and len(all_original_repos) > 3:
            logger.info("github.service.ranking_repos", username=username, count=len(all_original_repos))
            repo_list_str = "\n".join([
                f"- {r['name']} ({r.get('language', 'Unknown')}): {r.get('description', 'No description')}" 
                for r in all_original_repos
            ])
            
            ranking_prompt = f"JD: {jd_content[:1500]}\n\nCANDIDATE REPOS:\n{repo_list_str}"
            
            try:
                messages = [
                    SystemMessage(content=REPO_RANKER_PROMPT),
                    HumanMessage(content=ranking_prompt)
                ]
                content = await cached_llm_invoke(messages)
                ranked_names = json.loads(extract_json_from_response(content))
                
                if isinstance(ranked_names, list) and len(ranked_names) > 0:
                    selected = []
                    for name in ranked_names:
                        match = next((r for r in all_original_repos if r['name'] == name), None)
                        if match: selected.append(match)
                    
                    if selected:
                        repos_to_audit = selected[:3]
                        logger.info("github.service.semantic_selection_complete", username=username, selected=[r['name'] for r in repos_to_audit])
            except Exception as e:
                logger.error("github.service.ranking_error", error=str(e))

        # 4. PARALLEL DEEP DIVE: Auditing the Selected projects simultaneously
        async def _audit_repo(repo):
            try:
                readme = await gh_client.get_repo_readme(username, repo['name'])
                # Optionally could also fetch file structure for deeper context flawlessy
                audit_msg = [
                    SystemMessage(content=REPO_AUDITOR_PROMPT),
                    HumanMessage(content=f"AUDIT TARGET: {repo['name']}\nREADME: {readme[:2000]}")
                ]
                audit_res = await cached_llm_invoke(audit_msg)
                return {
                    "name": repo['name'],
                    "audit_summary": audit_res,
                    "url": repo.get('url')
                }
            except Exception as e:
                return {"name": repo['name'], "error": str(e)}

        logger.info("github.service.parallel_audits_started", username=username, count=len(repos_to_audit))
        repo_audits = await asyncio.gather(*[_audit_repo(repo) for repo in repos_to_audit])
        
        # 5. SYNTHESIS: Holistic profile evaluation
        audit_contexts = [f"PROJECT: {a['name']}\nAUDIT: {a['audit_summary']}" for a in repo_audits if "error" not in a]
        
        prompt = f"""
        Analyze these GitHub signals and audits for {username}.
        {processed_data['llm_input']}
        
        DEEP-DIVE AUDITS:
        {"---".join(audit_contexts)}
        
        JD CONTEXT: {jd_content[:500] if jd_content else "General Engineering Profile Evaluation"}
        
        Return JSON:
        {{
            "authenticity_score": 0.0 to 1.0,
            "quality_assessment": "Integrate findings from individual repo audits with overall metrics.",
            "top_technologies": []
        }}
        """
        
        summary_text = "Analysis pending"
        ai_analysis = {}
        try:
            messages = [
                SystemMessage(content="You are a Technical Profiler. Return only minified JSON."),
                HumanMessage(content=prompt)
            ]
            content = await cached_llm_invoke(messages)
            ai_analysis = json.loads(extract_json_from_response(content))
            
            project_names = ", ".join([a['name'] for a in repo_audits if "error" not in a])
            summary_text = f"PARALLEL GITHUB AUDIT COMPLETE for: {project_names}. "
            summary_text += ai_analysis.get('quality_assessment', '')
        except Exception as e:
            logger.error("github.service.synthesis_error", error=str(e))

        return {
            "status": "success",
            "username": username,
            "summary_text": summary_text,
            "repo_audits": repo_audits,
            "metrics": processed_data['features'],
            "ai_analysis": ai_analysis,
            "heuristic_score": processed_data["score"],
            "risk": processed_data["risk"]
        }
