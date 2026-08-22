"""
Interview scheduling API router.
Provides endpoints for creating schedules, managing slots, and sending meeting invitations.
"""
from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.db.models import InterviewSchedule, InterviewSlot, Candidate, User
from app.middleware.auth import verify_token, RoleChecker
from app.modules.schedule.service import (
    create_schedule,
    get_schedule_with_slots,
    get_job_schedules,
    send_meeting_invites,
    generate_time_slots
)
from app.modules.schedule.google_meet import delete_google_meet, update_google_meet
from app.modules.schedule.teams_meet import delete_teams_meeting, update_teams_meeting
import structlog

logger = structlog.get_logger()
hr_only = RoleChecker(["admin", "hr"])

router = APIRouter(prefix="/schedule", tags=["Schedule"])


# --- Request Models ---

class BreakPeriod(BaseModel):
    start_time: str  # HH:MM
    end_time: str    # HH:MM
    label: Optional[str] = ""

class CustomSlotDetail(BaseModel):
    candidate_id: str
    slot_start: str  # ISO string
    slot_end: str    # ISO string

class CreateScheduleRequest(BaseModel):
    schedule_date: str       # YYYY-MM-DD
    start_time: str          # HH:MM
    end_time: str            # HH:MM
    meeting_duration_minutes: int = 30
    breaks: List[BreakPeriod] = []
    platform: str = "custom"  # google_meet, teams, custom
    candidate_ids: List[str] = []
    custom_meeting_link: Optional[str] = None
    custom_slots: Optional[List[CustomSlotDetail]] = None

class PreviewSlotsRequest(BaseModel):
    schedule_date: str
    start_time: str
    end_time: str
    meeting_duration_minutes: int = 30
    breaks: List[BreakPeriod] = []

class UpdateSlotStatusRequest(BaseModel):
    status: str  # scheduled, completed, cancelled, no_show

class RescheduleSlotRequest(BaseModel):
    slot_start: str  # ISO 8601 string
    slot_end: str    # ISO 8601 string


# --- Endpoints ---

@router.post("/{job_id}/create")
async def create_interview_schedule(
    job_id: UUID,
    payload: CreateScheduleRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(hr_only)
):
    """Create a new interview schedule with time slots for selected candidates."""
    try:
        candidate_uuids = [UUID(cid) for cid in payload.candidate_ids]
        breaks_data = [b.model_dump() for b in payload.breaks]
        
        result = await create_schedule(
            job_id=job_id,
            user_id=UUID(user.get("sub")),
            schedule_date=payload.schedule_date,
            start_time=payload.start_time,
            end_time=payload.end_time,
            duration_minutes=payload.meeting_duration_minutes,
            breaks=breaks_data,
            platform=payload.platform,
            candidate_ids=candidate_uuids,
            custom_meeting_link=payload.custom_meeting_link,
            db=db,
            custom_slots=[{
                "candidate_id": str(cs.candidate_id),
                "slot_start": cs.slot_start,
                "slot_end": cs.slot_end
            } for cs in payload.custom_slots] if payload.custom_slots else None
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("schedule.create_failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to create schedule")


@router.post("/{job_id}/preview-slots")
async def preview_time_slots(
    job_id: UUID,
    payload: PreviewSlotsRequest,
    user: dict = Depends(hr_only)
):
    """Preview available time slots without creating a schedule."""
    try:
        breaks_data = [b.model_dump() for b in payload.breaks]
        slots = generate_time_slots(
            payload.schedule_date,
            payload.start_time,
            payload.end_time,
            payload.meeting_duration_minutes,
            breaks_data
        )
        return {
            "available_slots": len(slots),
            "slots": [
                {
                    "index": idx + 1,
                    "start": s["start"].isoformat(),
                    "end": s["end"].isoformat(),
                    "start_display": s["start"].strftime("%I:%M %p"),
                    "end_display": s["end"].strftime("%I:%M %p")
                }
                for idx, s in enumerate(slots)
            ]
        }
    except Exception as e:
        logger.error("schedule.preview_failed", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{job_id}/list")
async def list_job_schedules(
    job_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(hr_only)
):
    """Get all schedules for a job."""
    return await get_job_schedules(job_id, db)


@router.get("/detail/{schedule_id}")
async def get_schedule_detail(
    schedule_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(hr_only)
):
    """Get full schedule details with all slots and candidate info."""
    result = await get_schedule_with_slots(schedule_id, db)
    if not result:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return result


@router.post("/{schedule_id}/send-invites")
async def send_invites(
    schedule_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(hr_only)
):
    """Send email invitations to all candidates in a schedule."""
    try:
        result = await send_meeting_invites(
            schedule_id=schedule_id,
            db=db,
            user_id=UUID(user.get("sub"))
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error("schedule.send_invites_failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to send invitations")


@router.delete("/{schedule_id}/slots/{slot_id}")
async def delete_slot(
    schedule_id: UUID,
    slot_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(hr_only)
):
    """Remove a candidate's slot from a schedule."""
    slot = await db.get(InterviewSlot, slot_id)
    if not slot or str(slot.schedule_id) != str(schedule_id):
        raise HTTPException(status_code=404, detail="Slot not found in this schedule")
    
    # Load user to get OAuth credentials
    user_id = UUID(user.get("sub"))
    hr_user = await db.get(User, user_id)
    
    # Try deleting from external platform calendar
    if slot.platform == "google_meet" and hr_user and hr_user.google_oauth_token:
        try:
            await delete_google_meet(slot.meeting_id, hr_user.google_oauth_token)
        except Exception as e:
            logger.error("schedule.delete_google_meet_failed", slot_id=str(slot_id), error=str(e))
    elif slot.platform == "teams" and hr_user and hr_user.teams_oauth_token:
        try:
            await delete_teams_meeting(slot.meeting_id, hr_user.teams_oauth_token)
        except Exception as e:
            logger.error("schedule.delete_teams_meeting_failed", slot_id=str(slot_id), error=str(e))
            
    await db.delete(slot)
    await db.commit()
    
    logger.info("schedule.slot_deleted", slot_id=str(slot_id), schedule_id=str(schedule_id))
    return {"status": "deleted", "slot_id": str(slot_id)}


@router.delete("/{schedule_id}")
async def delete_schedule(
    schedule_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(hr_only)
):
    """Delete an interview schedule and all its associated slots."""
    schedule = await db.get(InterviewSchedule, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
        
    # Load all associated slots first to delete external meetings
    stmt = select(InterviewSlot).where(InterviewSlot.schedule_id == schedule_id)
    result = await db.execute(stmt)
    slots = result.scalars().all()
    
    user_id = UUID(user.get("sub"))
    hr_user = await db.get(User, user_id)
    
    for slot in slots:
        if slot.platform == "google_meet" and hr_user and hr_user.google_oauth_token:
            try:
                await delete_google_meet(slot.meeting_id, hr_user.google_oauth_token)
            except Exception as e:
                logger.error("schedule.delete_google_meet_failed", slot_id=str(slot.id), error=str(e))
        elif slot.platform == "teams" and hr_user and hr_user.teams_oauth_token:
            try:
                await delete_teams_meeting(slot.meeting_id, hr_user.teams_oauth_token)
            except Exception as e:
                logger.error("schedule.delete_teams_meeting_failed", slot_id=str(slot.id), error=str(e))
                
    await db.delete(schedule)
    await db.commit()
    
    logger.info("schedule.deleted", schedule_id=str(schedule_id))
    return {"status": "deleted", "schedule_id": str(schedule_id)}



@router.patch("/slots/{slot_id}/status")
async def update_slot_status(
    slot_id: UUID,
    payload: UpdateSlotStatusRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(hr_only)
):
    """Update the status of an interview slot."""
    slot = await db.get(InterviewSlot, slot_id)
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    
    valid_statuses = ["scheduled", "completed", "cancelled", "no_show"]
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    slot.status = payload.status
    await db.commit()
    
    logger.info("schedule.slot_status_updated", slot_id=str(slot_id), status=payload.status)
    return {"slot_id": str(slot_id), "status": payload.status}


@router.get("/{job_id}/candidates")
async def get_schedulable_candidates(
    job_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(hr_only)
):
    """Get shortlisted candidates for a job that can be scheduled for interviews."""
    stmt = (
        select(Candidate)
        .where(Candidate.job_id == job_id)
        .where(Candidate.is_shortlisted == True)
        .order_by(Candidate.full_name)
    )
    result = await db.execute(stmt)
    candidates = result.scalars().all()
    
    return [
        {
            "id": str(c.id),
            "full_name": c.full_name,
            "email": c.email,
            "pipeline_status": c.pipeline_status
        }
        for c in candidates
    ]


@router.patch("/slots/{slot_id}/reschedule")
async def reschedule_slot(
    slot_id: UUID,
    payload: RescheduleSlotRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(hr_only)
):
    """Reschedule an individual candidate's interview slot."""
    from datetime import datetime
    
    slot = await db.get(InterviewSlot, slot_id)
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
        
    try:
        # standard ISO format parsing
        new_start = datetime.fromisoformat(payload.slot_start)
        new_end = datetime.fromisoformat(payload.slot_end)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date/time format. Must be a valid ISO 8601 string.")
        
    # Load user for OAuth keys
    user_id = UUID(user.get("sub"))
    hr_user = await db.get(User, user_id)
    
    # Reschedule on external platform if configured
    if slot.meeting_id:
        if slot.platform == "google_meet" and hr_user and hr_user.google_oauth_token:
            try:
                await update_google_meet(
                    meeting_id=slot.meeting_id,
                    start_time_iso=payload.slot_start,
                    end_time_iso=payload.slot_end,
                    oauth_token=hr_user.google_oauth_token
                )
            except Exception as e:
                logger.error("schedule.update_google_meet_failed", slot_id=str(slot_id), error=str(e))
        elif slot.platform == "teams" and hr_user and hr_user.teams_oauth_token:
            try:
                await update_teams_meeting(
                    meeting_id=slot.meeting_id,
                    start_time_iso=payload.slot_start,
                    end_time_iso=payload.slot_end,
                    oauth_token=hr_user.teams_oauth_token
                )
            except Exception as e:
                logger.error("schedule.update_teams_meeting_failed", slot_id=str(slot_id), error=str(e))
                
    # Update DB values
    slot.slot_start = new_start
    slot.slot_end = new_end
    await db.commit()
    
    logger.info(
        "schedule.slot_rescheduled",
        slot_id=str(slot_id),
        start=new_start.isoformat(),
        end=new_end.isoformat()
    )
    
    return {
        "slot_id": str(slot_id),
        "slot_start": new_start.isoformat(),
        "slot_end": new_end.isoformat(),
        "platform": slot.platform,
        "meeting_link": slot.meeting_link
    }
