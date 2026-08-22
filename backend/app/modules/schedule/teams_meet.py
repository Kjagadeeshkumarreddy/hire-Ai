"""
Microsoft Teams integration via Microsoft Graph API.
Creates Teams online meetings using user-delegated OAuth tokens.

Requires:
- MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID in .env
- User must have connected their Teams account via Settings -> OAuth

If tokens are not available, returns None to fall back to local meeting ID generation.
"""
import structlog

logger = structlog.get_logger()


async def refresh_teams_token(token_data: dict) -> dict:
    """Refresh an expired Teams access token using the refresh token."""
    import httpx
    from app.config import settings
    
    refresh_token = token_data.get("refresh_token")
    if not refresh_token:
        return None
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://login.microsoftonline.com/{settings.MICROSOFT_TENANT_ID}/oauth2/v2.0/token",
                data={
                    "client_id": settings.MICROSOFT_CLIENT_ID,
                    "client_secret": settings.MICROSOFT_CLIENT_SECRET,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                    "scope": "OnlineMeetings.ReadWrite Calendars.ReadWrite offline_access",
                },
                timeout=15.0,
            )
        
        if response.status_code == 200:
            new_data = response.json()
            token_data["access_token"] = new_data["access_token"]
            if new_data.get("refresh_token"):
                token_data["refresh_token"] = new_data["refresh_token"]
            token_data["expiry"] = new_data.get("expires_in")
            return token_data
        else:
            logger.error("teams_meet.token_refresh_failed", status=response.status_code)
            return None
    except Exception as e:
        logger.error("teams_meet.token_refresh_error", error=str(e))
        return None


async def create_teams_meeting(
    title: str,
    start_time: str,
    end_time: str,
    date: str,
    attendee_email: str = None,
    oauth_token: dict = None
) -> dict:
    """
    Create a Microsoft Teams online meeting via Graph API using user-delegated tokens.
    
    Args:
        oauth_token: User's stored Teams OAuth token dict with access_token, refresh_token
    
    Returns:
        dict with keys: meeting_link, meeting_id, meeting_password, platform
        Returns None if tokens are not available.
    """
    if not oauth_token or not oauth_token.get("access_token"):
        logger.info("teams_meet.no_token", msg="No user OAuth token provided, using fallback")
        return None
    
    try:
        import httpx
        
        access_token = oauth_token["access_token"]
        
        # Build ISO 8601 datetime strings
        start_iso = f"{date}T{start_time}:00"
        end_iso = f"{date}T{end_time}:00"
        
        meeting_data = {
            "subject": title,
            "startDateTime": start_iso,
            "endDateTime": end_iso,
        }
        
        if attendee_email:
            meeting_data["participants"] = {
                "attendees": [
                    {
                        "identity": {
                            "user": {
                                "displayName": attendee_email
                            }
                        },
                        "upn": attendee_email
                    }
                ]
            }
        
        async with httpx.AsyncClient() as client:
            # Use /me/ endpoint since we have user-delegated token
            response = await client.post(
                "https://graph.microsoft.com/v1.0/me/onlineMeetings",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json=meeting_data,
                timeout=30.0
            )
            
            if response.status_code in (200, 201):
                data = response.json()
                logger.info(
                    "teams_meet.created",
                    meeting_id=data.get("id"),
                    join_url=data.get("joinWebUrl")
                )
                return {
                    'meeting_link': data.get('joinWebUrl', ''),
                    'meeting_id': data.get('id', ''),
                    'meeting_password': data.get('videoTeleconferenceId', ''),
                    'platform': 'teams'
                }
            else:
                logger.error(
                    "teams_meet.api_error",
                    status=response.status_code,
                    body=response.text
                )
                return None
        
    except Exception as e:
        logger.error("teams_meet.creation_failed", error=str(e))
        return None


async def delete_teams_meeting(meeting_id: str, oauth_token: dict) -> bool:
    """
    Delete a Microsoft Teams online meeting.
    """
    if not oauth_token or not oauth_token.get("access_token") or not meeting_id:
        logger.info("teams_meet.no_token_for_deletion", msg="Missing token or meeting ID, skipping calendar delete")
        return False
    
    try:
        import httpx
        access_token = oauth_token["access_token"]
        
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"https://graph.microsoft.com/v1.0/me/onlineMeetings/{meeting_id}",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                timeout=15.0
            )
            
            if response.status_code in (200, 204):
                logger.info("teams_meet.deleted", meeting_id=meeting_id)
                return True
            else:
                logger.error(
                    "teams_meet.deletion_failed",
                    meeting_id=meeting_id,
                    status=response.status_code,
                    body=response.text
                )
                return False
                
    except Exception as e:
        logger.error("teams_meet.deletion_failed", meeting_id=meeting_id, error=str(e))
        return False


async def update_teams_meeting(
    meeting_id: str,
    start_time_iso: str,
    end_time_iso: str,
    oauth_token: dict
) -> bool:
    """
    Update a Microsoft Teams online meeting start and end times.
    """
    if not oauth_token or not oauth_token.get("access_token") or not meeting_id:
        logger.info("teams_meet.no_token_for_update", msg="Missing token or meeting ID, skipping calendar update")
        return False
    
    try:
        import httpx
        access_token = oauth_token["access_token"]
        
        async with httpx.AsyncClient() as client:
            response = await client.patch(
                f"https://graph.microsoft.com/v1.0/me/onlineMeetings/{meeting_id}",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json={
                    "startDateTime": start_time_iso,
                    "endDateTime": end_time_iso
                },
                timeout=15.0
            )
            
            if response.status_code in (200, 204):
                logger.info("teams_meet.rescheduled", meeting_id=meeting_id, start=start_time_iso, end=end_time_iso)
                return True
            else:
                logger.error(
                    "teams_meet.rescheduling_failed",
                    meeting_id=meeting_id,
                    status=response.status_code,
                    body=response.text
                )
                return False
                
    except Exception as e:
        logger.error("teams_meet.rescheduling_failed", meeting_id=meeting_id, error=str(e))
        return False
