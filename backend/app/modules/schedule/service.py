"""
Core scheduling logic for interview meeting slot generation and email dispatch.
"""
import uuid
import secrets
import string
from datetime import datetime, timedelta, date, time
from typing import List, Optional, Dict, Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import func

from app.db.models import (
    InterviewSchedule, InterviewSlot, Candidate, Job, User, EmailLog
)
from app.core.mailer import send_email
from app.modules.schedule.google_meet import create_google_meet
from app.modules.schedule.teams_meet import create_teams_meeting
import structlog

logger = structlog.get_logger()


def generate_meeting_id() -> str:
    """Generate a human-readable meeting ID like 'MTG-839-421-756'."""
    parts = []
    for _ in range(3):
        parts.append(''.join(secrets.choice(string.digits) for _ in range(3)))
    return f"MTG-{'-'.join(parts)}"


def generate_meeting_password(length: int = 8) -> str:
    """Generate a random alphanumeric meeting password."""
    chars = string.ascii_letters + string.digits
    return ''.join(secrets.choice(chars) for _ in range(length))


def parse_time(time_str: str) -> time:
    """Parse HH:MM string to time object."""
    parts = time_str.strip().split(':')
    return time(int(parts[0]), int(parts[1]))


def generate_time_slots(
    schedule_date: str,
    start_time: str,
    end_time: str,
    duration_minutes: int,
    breaks: List[Dict[str, str]]
) -> List[Dict[str, datetime]]:
    """
    Generate available time slots for a given date/time range, excluding break periods.
    
    Args:
        schedule_date: Date string in YYYY-MM-DD format
        start_time: Start time in HH:MM format
        end_time: End time in HH:MM format
        duration_minutes: Duration of each slot in minutes
        breaks: List of break periods [{start_time, end_time, label}]
    
    Returns:
        List of dicts with 'start' and 'end' datetime objects
    """
    from zoneinfo import ZoneInfo
    tz = ZoneInfo("Asia/Kolkata")
    
    base_date = datetime.strptime(schedule_date, "%Y-%m-%d").date()
    slot_start = datetime.combine(base_date, parse_time(start_time)).replace(tzinfo=tz)
    day_end = datetime.combine(base_date, parse_time(end_time)).replace(tzinfo=tz)
    slot_duration = timedelta(minutes=duration_minutes)
    
    # Parse break periods
    break_periods = []
    for brk in (breaks or []):
        brk_start = datetime.combine(base_date, parse_time(brk["start_time"])).replace(tzinfo=tz)
        brk_end = datetime.combine(base_date, parse_time(brk["end_time"])).replace(tzinfo=tz)
        break_periods.append((brk_start, brk_end))
    
    slots = []
    while slot_start + slot_duration <= day_end:
        slot_end = slot_start + slot_duration
        
        # Check if this slot overlaps with any break
        overlaps_break = False
        for brk_start, brk_end in break_periods:
            if slot_start < brk_end and slot_end > brk_start:
                overlaps_break = True
                # Jump to end of break
                slot_start = brk_end
                break
        
        if not overlaps_break:
            slots.append({
                "start": slot_start,
                "end": slot_end
            })
            slot_start = slot_end
    
    return slots


async def create_schedule(
    job_id: UUID,
    user_id: UUID,
    schedule_date: str,
    start_time: str,
    end_time: str,
    duration_minutes: int,
    breaks: List[Dict[str, str]],
    platform: str,
    candidate_ids: List[UUID],
    custom_meeting_link: Optional[str],
    db: AsyncSession,
    custom_slots: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Create a full interview schedule with time slots for selected candidates.
    
    1. Generate available time slots (or use customized slots if provided)
    2. Assign candidates to slots
    3. Generate meeting IDs/passwords for each slot
    4. Persist schedule + slots to database
    """
    # Validate job exists
    job = await db.get(Job, job_id)
    if not job:
        raise ValueError("Job not found")
    
    # Load HR user's OAuth tokens for platform integrations
    hr_user = await db.get(User, user_id)
    google_token = hr_user.google_oauth_token if hr_user else None
    teams_token = hr_user.teams_oauth_token if hr_user else None
    
    # Enforce OAuth authentication for Google Meet / Teams
    if platform == "google_meet" and not google_token:
        raise ValueError(
            "Google account not connected. Please go to Settings and connect your Google account before scheduling with Google Meet."
        )
    if platform == "teams" and not teams_token:
        raise ValueError(
            "Microsoft Teams account not connected. Please go to Settings and connect your Teams account before scheduling with Teams."
        )
    
    # Map and prepare slots (custom or auto-generated)
    custom_map = {}
    available_slots = []
    if custom_slots:
        for cs in custom_slots:
            from datetime import datetime
            from zoneinfo import ZoneInfo
            tz = ZoneInfo("Asia/Kolkata")
            
            s_dt = datetime.fromisoformat(cs["slot_start"])
            e_dt = datetime.fromisoformat(cs["slot_end"])
            
            if s_dt.tzinfo is None:
                s_dt = s_dt.replace(tzinfo=tz)
            if e_dt.tzinfo is None:
                e_dt = e_dt.replace(tzinfo=tz)
                
            custom_map[UUID(cs["candidate_id"])] = {
                "start": s_dt,
                "end": e_dt
            }
    else:
        # Generate available time slots
        available_slots = generate_time_slots(
            schedule_date, start_time, end_time,
            duration_minutes, breaks
        )
        
        if len(available_slots) < len(candidate_ids):
            raise ValueError(
                f"Not enough time slots ({len(available_slots)}) "
                f"for {len(candidate_ids)} candidates. "
                f"Increase the time range, reduce meeting duration, or remove breaks."
            )
    
    # Create the schedule record
    schedule = InterviewSchedule(
        job_id=job_id,
        created_by=user_id,
        schedule_date=schedule_date,
        start_time=start_time,
        end_time=end_time,
        meeting_duration_minutes=duration_minutes,
        breaks=breaks or [],
        platform=platform,
        custom_meeting_link=custom_meeting_link,
        status="scheduled"
    )
    db.add(schedule)
    await db.flush()  # Get the schedule ID
    
    # Assign candidates to slots and create meeting credentials
    created_slots = []
    for idx, cand_id in enumerate(candidate_ids):
        if custom_slots:
            slot_time = custom_map.get(cand_id)
            if not slot_time:
                continue
        else:
            slot_time = available_slots[idx]
        
        # Fetch candidate details for meeting title and attendee email
        candidate = await db.get(Candidate, cand_id)
        candidate_email = candidate.email if candidate else None
        candidate_name = candidate.full_name if candidate else "Candidate"
        
        # Default: local fallback credentials
        meeting_id = generate_meeting_id()
        meeting_password = generate_meeting_password()
        meeting_link = custom_meeting_link or ""
        
        # Try creating a real meeting via the selected platform API
        slot_start_str = slot_time["start"].strftime("%H:%M")
        slot_end_str = slot_time["end"].strftime("%H:%M")
        meeting_title = f"Interview: {job.title} — {candidate_name}"
        
        if platform == "google_meet":
            meet_data = await create_google_meet(
                title=meeting_title,
                start_time=slot_start_str,
                end_time=slot_end_str,
                date=schedule_date,
                attendee_email=candidate_email,
                oauth_token=google_token
            )
            if meet_data:
                meeting_link = meet_data["meeting_link"]
                meeting_id = meet_data["meeting_id"]
                meeting_password = "Join via link"
                logger.info("schedule.google_meet_created", candidate=candidate_name, link=meeting_link)
        
        elif platform == "teams":
            teams_data = await create_teams_meeting(
                title=meeting_title,
                start_time=slot_start_str,
                end_time=slot_end_str,
                date=schedule_date,
                attendee_email=candidate_email,
                oauth_token=teams_token
            )
            if teams_data:
                meeting_link = teams_data["meeting_link"]
                meeting_id = teams_data["meeting_id"]
                meeting_password = teams_data.get("meeting_password", "Join via link")
                logger.info("schedule.teams_meeting_created", candidate=candidate_name, link=meeting_link)
        
        slot = InterviewSlot(
            schedule_id=schedule.id,
            candidate_id=cand_id,
            job_id=job_id,
            slot_start=slot_time["start"],
            slot_end=slot_time["end"],
            meeting_link=meeting_link,
            meeting_id=meeting_id,
            meeting_password=meeting_password,
            platform=platform,
            status="scheduled"
        )
        db.add(slot)
        created_slots.append(slot)
    
    await db.commit()
    
    # Refresh to get generated IDs
    await db.refresh(schedule)
    
    logger.info(
        "schedule.created",
        schedule_id=str(schedule.id),
        job_id=str(job_id),
        slot_count=len(created_slots),
        platform=platform
    )
    
    return {
        "schedule_id": str(schedule.id),
        "job_id": str(job_id),
        "schedule_date": schedule_date,
        "start_time": start_time,
        "end_time": end_time,
        "duration_minutes": duration_minutes,
        "platform": platform,
        "total_slots": len(created_slots),
        "total_available": len(available_slots),
        "status": "scheduled"
    }


async def get_schedule_with_slots(schedule_id: UUID, db: AsyncSession) -> Optional[Dict[str, Any]]:
    """Fetch a schedule with all its slots and candidate details."""
    schedule = await db.get(InterviewSchedule, schedule_id)
    if not schedule:
        return None
    
    # Fetch slots with candidate info
    stmt = (
        select(InterviewSlot, Candidate)
        .join(Candidate, InterviewSlot.candidate_id == Candidate.id)
        .where(InterviewSlot.schedule_id == schedule_id)
        .order_by(InterviewSlot.slot_start)
    )
    result = await db.execute(stmt)
    slot_rows = result.all()
    
    slots_data = []
    for slot, candidate in slot_rows:
        slots_data.append({
            "id": str(slot.id),
            "candidate_id": str(slot.candidate_id),
            "candidate_name": candidate.full_name,
            "candidate_email": candidate.email,
            "slot_start": slot.slot_start.isoformat() if slot.slot_start else None,
            "slot_end": slot.slot_end.isoformat() if slot.slot_end else None,
            "meeting_link": slot.meeting_link,
            "meeting_id": slot.meeting_id,
            "meeting_password": slot.meeting_password,
            "platform": slot.platform,
            "email_sent": slot.email_sent,
            "email_sent_at": slot.email_sent_at.isoformat() if slot.email_sent_at else None,
            "status": slot.status
        })
    
    return {
        "id": str(schedule.id),
        "job_id": str(schedule.job_id),
        "schedule_date": schedule.schedule_date,
        "start_time": schedule.start_time,
        "end_time": schedule.end_time,
        "meeting_duration_minutes": schedule.meeting_duration_minutes,
        "breaks": schedule.breaks,
        "platform": schedule.platform,
        "custom_meeting_link": schedule.custom_meeting_link,
        "status": schedule.status,
        "created_at": schedule.created_at.isoformat() if schedule.created_at else None,
        "slots": slots_data
    }


async def get_job_schedules(job_id: UUID, db: AsyncSession) -> List[Dict[str, Any]]:
    """Fetch all schedules for a job with slot summary."""
    stmt = (
        select(InterviewSchedule)
        .where(InterviewSchedule.job_id == job_id)
        .order_by(InterviewSchedule.created_at.desc())
    )
    result = await db.execute(stmt)
    schedules = result.scalars().all()
    
    schedules_data = []
    for schedule in schedules:
        # Count slots
        slot_stmt = (
            select(func.count(InterviewSlot.id))
            .where(InterviewSlot.schedule_id == schedule.id)
        )
        slot_count = (await db.execute(slot_stmt)).scalar() or 0
        
        # Count emails sent
        email_stmt = (
            select(func.count(InterviewSlot.id))
            .where(InterviewSlot.schedule_id == schedule.id)
            .where(InterviewSlot.email_sent == True)
        )
        emails_sent = (await db.execute(email_stmt)).scalar() or 0
        
        schedules_data.append({
            "id": str(schedule.id),
            "job_id": str(schedule.job_id),
            "schedule_date": schedule.schedule_date,
            "start_time": schedule.start_time,
            "end_time": schedule.end_time,
            "meeting_duration_minutes": schedule.meeting_duration_minutes,
            "platform": schedule.platform,
            "status": schedule.status,
            "total_slots": slot_count,
            "emails_sent": emails_sent,
            "created_at": schedule.created_at.isoformat() if schedule.created_at else None
        })
    
    return schedules_data


async def send_meeting_invites(schedule_id: UUID, db: AsyncSession, user_id: UUID) -> Dict[str, Any]:
    """Send email invitations to all candidates in a schedule."""
    schedule = await db.get(InterviewSchedule, schedule_id)
    if not schedule:
        raise ValueError("Schedule not found")
    
    # Get the job title
    job = await db.get(Job, schedule.job_id)
    job_title = job.title if job else "Interview"
    
    # Get HR user SMTP config
    user = await db.get(User, user_id)
    smtp_config = None
    if user and user.smtp_host:
        smtp_config = {
            "smtp_host": user.smtp_host,
            "smtp_port": user.smtp_port,
            "smtp_user": user.smtp_user,
            "smtp_password": user.smtp_password
        }
    
    # Fetch all slots with candidates
    stmt = (
        select(InterviewSlot, Candidate)
        .join(Candidate, InterviewSlot.candidate_id == Candidate.id)
        .where(InterviewSlot.schedule_id == schedule_id)
        .where(InterviewSlot.email_sent == False)
        .order_by(InterviewSlot.slot_start)
    )
    result = await db.execute(stmt)
    pending_slots = result.all()
    
    sent_count = 0
    failed_count = 0
    
    for slot, candidate in pending_slots:
        if not candidate.email:
            failed_count += 1
            continue
        
        # Format times for display
        start_str = slot.slot_start.strftime("%I:%M %p") if slot.slot_start else "TBD"
        end_str = slot.slot_end.strftime("%I:%M %p") if slot.slot_end else "TBD"
        date_str = slot.slot_start.strftime("%B %d, %Y") if slot.slot_start else schedule.schedule_date
        
        # Build email body
        subject = f"Interview Scheduled — {job_title} | {date_str}"
        html_body = f"""
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0b; color: #e2e8f0; border-radius: 16px; overflow: hidden; border: 1px solid #1e293b;">
            <div style="background: linear-gradient(135deg, #0d9488, #0891b2); padding: 32px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px; color: white; font-weight: 800; letter-spacing: -0.5px;">Interview Scheduled</h1>
                <p style="margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">{job_title}</p>
            </div>
            <div style="padding: 32px;">
                <p style="color: #94a3b8; font-size: 14px; margin-bottom: 24px;">
                    Dear <strong style="color: white;">{candidate.full_name or 'Candidate'}</strong>,
                </p>
                <p style="color: #94a3b8; font-size: 14px; margin-bottom: 24px;">
                    Your interview has been scheduled. Please find the details below:
                </p>
                <div style="background: #111827; border: 1px solid #1e293b; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Date</td>
                            <td style="padding: 8px 0; color: white; font-size: 16px; font-weight: 700; text-align: right;">{date_str}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Time</td>
                            <td style="padding: 8px 0; color: #14b8a6; font-size: 16px; font-weight: 700; text-align: right;">{start_str} — {end_str}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Meeting ID</td>
                            <td style="padding: 8px 0; color: white; font-size: 16px; font-weight: 700; font-family: monospace; text-align: right;">{slot.meeting_id}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Password</td>
                            <td style="padding: 8px 0; color: #f59e0b; font-size: 16px; font-weight: 700; font-family: monospace; text-align: right;">{slot.meeting_password}</td>
                        </tr>
                    </table>
                </div>
                {f'<a href="{slot.meeting_link}" style="display: block; background: linear-gradient(135deg, #0d9488, #0891b2); color: white; text-decoration: none; padding: 16px; border-radius: 12px; text-align: center; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Join Meeting</a>' if slot.meeting_link else ''}
                <p style="color: #475569; font-size: 12px; margin-top: 24px; text-align: center;">
                    Please join 5 minutes before the scheduled time. Good luck!
                </p>
            </div>
        </div>
        """
        
        success = await send_email(
            to_email=candidate.email,
            subject=subject,
            html_body=html_body,
            smtp_config=smtp_config
        )
        
        if success:
            slot.email_sent = True
            slot.email_sent_at = func.now()
            sent_count += 1
            
            # Log email
            email_log = EmailLog(
                candidate_id=candidate.id,
                job_id=schedule.job_id,
                email_type="interview_invite",
                recipient_email=candidate.email,
                subject=subject,
                body=html_body,
                status="sent",
                sent_at=func.now()
            )
            db.add(email_log)
        else:
            failed_count += 1
            email_log = EmailLog(
                candidate_id=candidate.id,
                job_id=schedule.job_id,
                email_type="interview_invite",
                recipient_email=candidate.email,
                subject=subject,
                status="failed",
                error_message="SMTP send failed"
            )
            db.add(email_log)
    
    await db.commit()
    
    logger.info(
        "schedule.invites_sent",
        schedule_id=str(schedule_id),
        sent=sent_count,
        failed=failed_count
    )
    
    return {
        "schedule_id": str(schedule_id),
        "sent_count": sent_count,
        "failed_count": failed_count,
        "total": sent_count + failed_count
    }
