import httpx
import structlog
from app.config import settings
from app.db.redis import redis_manager
from .rate_limiter import GitHubRateLimiter

logger = structlog.get_logger()

class GitHubClient:
    def __init__(self, token: str = None):
        # Always prioritize the latest environment variable to avoid uvicorn caching issues
        self.token = settings.github_token # Using stripped property flawlessly
        
        logger.debug("github.client.init", 
                     token_prefix=self.token[:4] if self.token else "NONE",
                     token_len=len(self.token))
                     
        self.base_url = "https://api.github.com"
        self.headers = {
            "Authorization": f"token {self.token}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "AI-Hiring-Platform/1.0",
            "X-GitHub-Api-Version": "2022-11-28"
        }
        
        # Initialize Rate Limiter with global Redis client flawlessly
        self.redis = redis_manager.get_client()
        self.limiter = GitHubRateLimiter(self.redis) if self.redis else None
    

    async def get_user_repositories(self, username: str):
        """Fetch all public repositories for a given user."""
        logger.info("github.client.fetch_repos", username=username)
        
        if self.limiter:
            await self.limiter.wait_if_needed()
            
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/users/{username}/repos",
                    headers=self.headers,
                    params={"sort": "updated", "per_page": 100}
                )
                
                if self.limiter:
                    await self.limiter.update_from_headers(response.headers)
                    
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                logger.error("github.client.error", 
                             status=e.response.status_code, 
                             username=username,
                             response=e.response.text)
                return []
            except Exception as e:
                logger.error("github.client.exception", error=str(e), username=username)
                return []

    async def get_repo_details(self, username: str, repo_name: str):
        """Fetch specific details for a repository."""
        if self.limiter:
            await self.limiter.wait_if_needed()
            
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/repos/{username}/{repo_name}",
                    headers=self.headers
                )
                
                if self.limiter:
                    await self.limiter.update_from_headers(response.headers)
                    
                response.raise_for_status()
                return response.json()
            except Exception:
                return {}

    async def get_repo_readme(self, username: str, repo_name: str):
        """Fetch the README content for a repository."""
        if self.limiter:
            await self.limiter.wait_if_needed()
            
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/repos/{username}/{repo_name}/readme",
                    headers=self.headers
                )
                
                if self.limiter:
                    await self.limiter.update_from_headers(response.headers)
                    
                response.raise_for_status()
                data = response.json()
                import base64
                return base64.b64decode(data.get("content", "")).decode("utf-8", errors="ignore")
            except Exception:
                return "README not available."

    async def get_repo_contents(self, username: str, repo_name: str, path: str = ""):
        """Fetch the contents of a directory (default root)."""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/repos/{username}/{repo_name}/contents/{path}",
                    headers=self.headers
                )
                response.raise_for_status()
                return response.json()
            except Exception:
                return []
