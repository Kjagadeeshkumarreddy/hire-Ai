"""
OAuth flow endpoints for Google Calendar and Microsoft Teams integrations.
Handles authorization URL generation, callback token exchange, disconnect, and status.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional
import structlog

from app.db.session import get_db
from app.db.models import User
from app.middleware.auth import RoleChecker
from app.config import settings

logger = structlog.get_logger()
hr_only = RoleChecker(["admin", "hr"])

router = APIRouter(prefix="/auth/oauth", tags=["OAuth"])

FRONTEND_URL = "http://localhost:5173"


# ─── Google OAuth ─────────────────────────────────────────────────

GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.readonly",
]


def _google_redirect_uri() -> str:
    return f"http://localhost:8000{settings.API_V1_STR}/auth/oauth/google/callback"


@router.get("/google/url")
async def google_auth_url(current_user: dict = Depends(hr_only)):
    """Generate the Google OAuth2 consent URL."""
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=400,
            detail="Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env"
        )
    
    from urllib.parse import urlencode
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": _google_redirect_uri(),
        "response_type": "code",
        "scope": " ".join(GOOGLE_SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": current_user.get("sub"),  # pass user_id as state for callback
    }
    url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return {"auth_url": url}


@router.get("/google/callback")
async def google_callback(
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db),
):
    """Handle the Google OAuth2 callback, exchange code for tokens."""
    import httpx
    
    try:
        # Exchange authorization code for tokens
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": _google_redirect_uri(),
                },
                timeout=30.0,
            )
        
        if response.status_code != 200:
            logger.error("google_oauth.token_exchange_failed", status=response.status_code, body=response.text)
            return RedirectResponse(f"{FRONTEND_URL}/settings?oauth=google&status=error")
        
        token_data = response.json()
        
        # Store tokens on the user
        user_id = state
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        user = result.scalars().first()
        
        if not user:
            return RedirectResponse(f"{FRONTEND_URL}/settings?oauth=google&status=error")
        
        user.google_oauth_token = {
            "access_token": token_data.get("access_token"),
            "refresh_token": token_data.get("refresh_token"),
            "expiry": token_data.get("expires_in"),
            "token_type": token_data.get("token_type", "Bearer"),
        }
        await db.commit()
        
        logger.info("google_oauth.connected", user_id=user_id)
        return RedirectResponse(f"{FRONTEND_URL}/settings?oauth=google&status=success")
        
    except Exception as e:
        logger.error("google_oauth.callback_failed", error=str(e))
        return RedirectResponse(f"{FRONTEND_URL}/settings?oauth=google&status=error")


@router.delete("/google/disconnect")
async def google_disconnect(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(hr_only),
):
    """Remove Google OAuth tokens for the current user."""
    user_id = current_user.get("sub")
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.google_oauth_token = None
    await db.commit()
    
    logger.info("google_oauth.disconnected", user_id=user_id)
    return {"status": "disconnected", "platform": "google"}


# ─── Microsoft Teams OAuth ────────────────────────────────────────

TEAMS_SCOPES = [
    "OnlineMeetings.ReadWrite",
    "Calendars.ReadWrite",
    "offline_access",
]


def _teams_redirect_uri() -> str:
    return f"http://localhost:8000{settings.API_V1_STR}/auth/oauth/teams/callback"


@router.get("/teams/url")
async def teams_auth_url(current_user: dict = Depends(hr_only)):
    """Generate the Microsoft OAuth2 consent URL."""
    if not all([settings.MICROSOFT_CLIENT_ID, settings.MICROSOFT_CLIENT_SECRET, settings.MICROSOFT_TENANT_ID]):
        raise HTTPException(
            status_code=400,
            detail="Microsoft OAuth is not configured. Add MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, and MICROSOFT_TENANT_ID to .env"
        )
    
    from urllib.parse import urlencode
    params = {
        "client_id": settings.MICROSOFT_CLIENT_ID,
        "redirect_uri": _teams_redirect_uri(),
        "response_type": "code",
        "scope": " ".join(TEAMS_SCOPES),
        "response_mode": "query",
        "state": current_user.get("sub"),
    }
    url = f"https://login.microsoftonline.com/{settings.MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize?{urlencode(params)}"
    return {"auth_url": url}


@router.get("/teams/callback")
async def teams_callback(
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db),
):
    """Handle the Microsoft OAuth2 callback, exchange code for tokens."""
    import httpx
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://login.microsoftonline.com/{settings.MICROSOFT_TENANT_ID}/oauth2/v2.0/token",
                data={
                    "client_id": settings.MICROSOFT_CLIENT_ID,
                    "client_secret": settings.MICROSOFT_CLIENT_SECRET,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": _teams_redirect_uri(),
                    "scope": " ".join(TEAMS_SCOPES),
                },
                timeout=30.0,
            )
        
        if response.status_code != 200:
            logger.error("teams_oauth.token_exchange_failed", status=response.status_code, body=response.text)
            return RedirectResponse(f"{FRONTEND_URL}/settings?oauth=teams&status=error")
        
        token_data = response.json()
        
        user_id = state
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        user = result.scalars().first()
        
        if not user:
            return RedirectResponse(f"{FRONTEND_URL}/settings?oauth=teams&status=error")
        
        user.teams_oauth_token = {
            "access_token": token_data.get("access_token"),
            "refresh_token": token_data.get("refresh_token"),
            "expiry": token_data.get("expires_in"),
            "token_type": token_data.get("token_type", "Bearer"),
        }
        await db.commit()
        
        logger.info("teams_oauth.connected", user_id=user_id)
        return RedirectResponse(f"{FRONTEND_URL}/settings?oauth=teams&status=success")
        
    except Exception as e:
        logger.error("teams_oauth.callback_failed", error=str(e))
        return RedirectResponse(f"{FRONTEND_URL}/settings?oauth=teams&status=error")


@router.delete("/teams/disconnect")
async def teams_disconnect(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(hr_only),
):
    """Remove Teams OAuth tokens for the current user."""
    user_id = current_user.get("sub")
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.teams_oauth_token = None
    await db.commit()
    
    logger.info("teams_oauth.disconnected", user_id=user_id)
    return {"status": "disconnected", "platform": "teams"}


# ─── Status Endpoint ──────────────────────────────────────────────

@router.get("/status")
async def get_oauth_status(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(hr_only),
):
    """Return OAuth connection status for all platforms."""
    user_id = current_user.get("sub")
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "google_connected": user.google_oauth_token is not None,
        "teams_connected": user.teams_oauth_token is not None,
        "google_configured": bool(settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET),
        "teams_configured": bool(settings.MICROSOFT_CLIENT_ID and settings.MICROSOFT_CLIENT_SECRET and settings.MICROSOFT_TENANT_ID),
    }
