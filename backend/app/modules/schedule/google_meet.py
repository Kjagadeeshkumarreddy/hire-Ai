"""
Google Meet integration via Google Calendar API.
Creates Google Calendar events with Google Meet conferencing using user-delegated OAuth tokens.

Requires:
- GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env
- User must have connected their Google account via Settings -> OAuth

If tokens are not available, returns None to fall back to local meeting ID generation.
"""
import structlog

logger = structlog.get_logger()


async def refresh_google_token(token_data: dict) -> dict:
    """Refresh an expired Google access token using the refresh token."""
    import httpx
    from app.config import settings
    
    refresh_token = token_data.get("refresh_token")
    if not refresh_token:
        return None
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                },
                timeout=15.0,
            )
        
        if response.status_code == 200:
            new_data = response.json()
            token_data["access_token"] = new_data["access_token"]
            token_data["expiry"] = new_data.get("expires_in")
            return token_data
        else:
            logger.error("google_meet.token_refresh_failed", status=response.status_code)
            return None
    except Exception as e:
        logger.error("google_meet.token_refresh_error", error=str(e))
        return None


async def create_google_meet(
    title: str,
    start_time: str,
    end_time: str,
    date: str,
    attendee_email: str = None,
    oauth_token: dict = None
) -> dict:
    """
    Create a Google Calendar event with Google Meet conferencing.
    
    Args:
        oauth_token: User's stored Google OAuth token dict with access_token, refresh_token
    
    Returns:
        dict with keys: meeting_link, meeting_id, platform
        Returns None if tokens are not available.
    """
    if not oauth_token or not oauth_token.get("access_token"):
        logger.info("google_meet.no_token", msg="No user OAuth token provided, using fallback")
        return None
    
    try:
        import uuid
        import json
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build
        from app.config import settings
        
        credentials = Credentials(
            token=oauth_token["access_token"],
            refresh_token=oauth_token.get("refresh_token"),
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
        )
        
        service = build('calendar', 'v3', credentials=credentials)
        
        event = {
            'summary': title,
            'description': 'Technical Interview scheduled via Hire-AI Scheduler Engine',
            'start': {
                'dateTime': f'{date}T{start_time}:00',
                'timeZone': 'Asia/Kolkata',
            },
            'end': {
                'dateTime': f'{date}T{end_time}:00',
                'timeZone': 'Asia/Kolkata',
            },
            'conferenceData': {
                'createRequest': {
                    'requestId': str(uuid.uuid4()),
                    'conferenceSolutionKey': {'type': 'hangoutsMeet'}
                }
            },
            'attendees': [{'email': attendee_email}] if attendee_email else []
        }
        
        created_event = service.events().insert(
            calendarId='primary',
            body=event,
            conferenceDataVersion=1,
            sendUpdates='all'
        ).execute()
        
        meet_link = created_event.get('hangoutLink', '')
        conference_data = created_event.get('conferenceData', {})
        entry_points = conference_data.get('entryPoints', [])
        
        meeting_id = ''
        for ep in entry_points:
            if ep.get('entryPointType') == 'video':
                meeting_id = ep.get('label', ep.get('uri', '').split('/')[-1])
                break
        
        logger.info("google_meet.created", meet_link=meet_link, meeting_id=meeting_id)
        
        return {
            'meeting_link': meet_link or created_event.get('htmlLink', ''),
            'meeting_id': meeting_id or created_event.get('id', ''),
            'platform': 'google_meet'
        }
        
    except Exception as e:
        logger.error("google_meet.creation_failed", error=str(e))
        return None


async def delete_google_meet(meeting_id: str, oauth_token: dict) -> bool:
    """
    Delete a Google Calendar event.
    """
    if not oauth_token or not oauth_token.get("access_token") or not meeting_id:
        logger.info("google_meet.no_token_for_deletion", msg="Missing token or meeting ID, skipping calendar delete")
        return False
    
    try:
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build
        from app.config import settings
        
        credentials = Credentials(
            token=oauth_token["access_token"],
            refresh_token=oauth_token.get("refresh_token"),
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
        )
        
        service = build('calendar', 'v3', credentials=credentials)
        service.events().delete(calendarId='primary', eventId=meeting_id).execute()
        logger.info("google_meet.deleted", meeting_id=meeting_id)
        return True
        
    except Exception as e:
        logger.error("google_meet.deletion_failed", meeting_id=meeting_id, error=str(e))
        return False


async def update_google_meet(
    meeting_id: str,
    start_time_iso: str,
    end_time_iso: str,
    oauth_token: dict
) -> bool:
    """
    Update Google Calendar event start and end times.
    """
    if not oauth_token or not oauth_token.get("access_token") or not meeting_id:
        logger.info("google_meet.no_token_for_update", msg="Missing token or meeting ID, skipping calendar update")
        return False
    
    try:
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build
        from app.config import settings
        
        credentials = Credentials(
            token=oauth_token["access_token"],
            refresh_token=oauth_token.get("refresh_token"),
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
        )
        
        service = build('calendar', 'v3', credentials=credentials)
        
        # Fetch existing event
        event = service.events().get(calendarId='primary', eventId=meeting_id).execute()
        
        # Update start & end times
        event['start'] = {'dateTime': start_time_iso, 'timeZone': 'Asia/Kolkata'}
        event['end'] = {'dateTime': end_time_iso, 'timeZone': 'Asia/Kolkata'}
        
        # Save event
        service.events().update(
            calendarId='primary',
            eventId=meeting_id,
            body=event,
            sendUpdates='all'
        ).execute()
        
        logger.info("google_meet.rescheduled", meeting_id=meeting_id, start=start_time_iso, end=end_time_iso)
        return True
        
    except Exception as e:
        logger.error("google_meet.rescheduling_failed", meeting_id=meeting_id, error=str(e))
        return False
