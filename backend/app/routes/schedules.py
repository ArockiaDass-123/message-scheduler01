import calendar
from datetime import datetime, time
import pytz
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.security import get_current_user
from app.scheduler import dispatch_schedule_job

router = APIRouter(prefix="/api/schedules", tags=["schedules"])

@router.get("/workspace/{workspace_id}", response_model=List[schemas.ScheduleOut])
def get_workspace_schedules(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    ws = db.query(models.Workspace).filter(
        models.Workspace.id == workspace_id,
        models.Workspace.user_id == current_user.id
    ).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    return db.query(models.Schedule).filter(
        models.Schedule.workspace_id == workspace_id
    ).order_by(models.Schedule.scheduled_at.asc()).all()

@router.get("/global")
def get_all_user_schedules(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Returns all schedules across all user workspaces for global calendar."""
    schedules = db.query(models.Schedule).join(models.Workspace).filter(
        models.Workspace.user_id == current_user.id
    ).order_by(models.Schedule.scheduled_at.asc()).all()

    result = []
    for s in schedules:
        recip_count = db.query(models.WorkspaceRecipient).filter(
            models.WorkspaceRecipient.workspace_id == s.workspace_id,
            models.WorkspaceRecipient.is_selected == True
        ).count()
        result.append({
            "id": s.id,
            "workspace_id": s.workspace_id,
            "workspace_name": s.workspace.name,
            "scheduled_at": s.scheduled_at.isoformat() + "Z" if s.scheduled_at and s.scheduled_at.tzinfo is None else s.scheduled_at,
            "recurrence_type": s.recurrence_type,
            "status": s.status,
            "recipient_count": recip_count,
            "error_reason": s.error_reason,
            "created_at": s.created_at.isoformat() + "Z" if s.created_at and s.created_at.tzinfo is None else s.created_at
        })
    return result

@router.post("/workspace/{workspace_id}/single", response_model=schemas.ScheduleOut)
def create_single_schedule(
    workspace_id: int,
    data: schemas.ScheduleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    ws = db.query(models.Workspace).filter(
        models.Workspace.id == workspace_id,
        models.Workspace.user_id == current_user.id
    ).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Idempotency check: prevent duplicate schedule at the exact same minute for the workspace
    scheduled_utc = data.scheduled_at
    if scheduled_utc.tzinfo is not None:
        scheduled_utc = scheduled_utc.astimezone(pytz.utc).replace(tzinfo=None)

    idempotency_key = f"ws_{ws.id}_{int(scheduled_utc.timestamp() / 60)}"
    existing = db.query(models.Schedule).filter(
        models.Schedule.workspace_id == ws.id,
        models.Schedule.idempotency_key == idempotency_key
    ).first()
    if existing:
        if existing.status == "Scheduled":
            return existing
        else:
            # Already completed or failed; generate unique key to allow new test/send
            idempotency_key = f"ws_{ws.id}_{int(scheduled_utc.timestamp() / 60)}_{int(datetime.utcnow().timestamp())}"

    schedule = models.Schedule(
        workspace_id=ws.id,
        scheduled_at=scheduled_utc,
        recurrence_type=data.recurrence_type or "once",
        status="Scheduled",
        idempotency_key=idempotency_key
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return schedule

@router.post("/workspace/{workspace_id}/recurring", response_model=List[schemas.ScheduleOut])
def create_recurring_monthly_schedules(
    workspace_id: int,
    data: schemas.ScheduleRecurringCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Creates monthly occurrences (e.g. Day 5 at 09:00 AM for 12 months)
    respecting user's timezone and clamping to valid days per month.
    """
    ws = db.query(models.Workspace).filter(
        models.Workspace.id == workspace_id,
        models.Workspace.user_id == current_user.id
    ).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    tz_str = data.timezone or current_user.timezone or "Asia/Kolkata"
    try:
        user_tz = pytz.timezone(tz_str)
    except Exception:
        user_tz = pytz.timezone("Asia/Kolkata")

    hour, minute = 9, 0
    try:
        parts = data.time_str.split(":")
        hour = int(parts[0])
        minute = int(parts[1]) if len(parts) > 1 else 0
    except Exception:
        pass

    created_schedules = []
    current_year = data.start_year
    current_month = data.start_month

    for i in range(data.months_count):
        # Calculate max days in that month
        _, max_days = calendar.monthrange(current_year, current_month)
        target_day = min(data.day_of_month, max_days)

        # Build local datetime
        local_dt = datetime(current_year, current_month, target_day, hour, minute, 0)
        local_dt_tz = user_tz.localize(local_dt)
        utc_dt = local_dt_tz.astimezone(pytz.utc).replace(tzinfo=None)

        idempotency_key = f"ws_{ws.id}_{int(utc_dt.timestamp() / 60)}"
        existing = db.query(models.Schedule).filter(
            models.Schedule.workspace_id == ws.id,
            models.Schedule.idempotency_key == idempotency_key
        ).first()

        if not existing:
            sched = models.Schedule(
                workspace_id=ws.id,
                scheduled_at=utc_dt,
                recurrence_type="monthly",
                status="Scheduled",
                idempotency_key=idempotency_key
            )
            db.add(sched)
            created_schedules.append(sched)
        else:
            created_schedules.append(existing)

        # Advance to next month
        current_month += 1
        if current_month > 12:
            current_month = 1
            current_year += 1

    db.commit()
    for s in created_schedules:
        db.refresh(s)

    return created_schedules

@router.post("/workspace/{workspace_id}/batch", response_model=List[schemas.ScheduleOut])
def create_batch_custom_schedules(
    workspace_id: int,
    data: schemas.ScheduleBatchCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    ws = db.query(models.Workspace).filter(
        models.Workspace.id == workspace_id,
        models.Workspace.user_id == current_user.id
    ).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    created_list = []
    for dt in data.dates:
        utc_dt = dt
        if utc_dt.tzinfo is not None:
            utc_dt = utc_dt.astimezone(pytz.utc).replace(tzinfo=None)

        idempotency_key = f"ws_{ws.id}_{int(utc_dt.timestamp() / 60)}"
        existing = db.query(models.Schedule).filter(
            models.Schedule.workspace_id == ws.id,
            models.Schedule.idempotency_key == idempotency_key
        ).first()

        if not existing:
            sched = models.Schedule(
                workspace_id=ws.id,
                scheduled_at=utc_dt,
                recurrence_type="custom",
                status="Scheduled",
                idempotency_key=idempotency_key
            )
            db.add(sched)
            created_list.append(sched)
        else:
            created_list.append(existing)

    db.commit()
    for s in created_list:
        db.refresh(s)

    return created_list

@router.delete("/{schedule_id}")
def cancel_or_delete_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    schedule = db.query(models.Schedule).join(models.Workspace).filter(
        models.Schedule.id == schedule_id,
        models.Workspace.user_id == current_user.id
    ).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    db.delete(schedule)
    db.commit()
    return {"status": "success", "message": "Schedule deleted"}

@router.post("/{schedule_id}/retry")
async def retry_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Retries a failed message immediately or re-queues it."""
    schedule = db.query(models.Schedule).join(models.Workspace).filter(
        models.Schedule.id == schedule_id,
        models.Workspace.user_id == current_user.id
    ).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    schedule.retry_count += 1
    schedule.status = "Scheduled"
    schedule.error_reason = f"Retry #{schedule.retry_count} queued"
    db.commit()

    # Trigger job in background
    await dispatch_schedule_job(schedule.id)

    db.refresh(schedule)
    return {"status": "success", "schedule": schedule}

@router.post("/{schedule_id}/send-now")
async def send_schedule_now(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Immediately triggers execution of a scheduled message."""
    schedule = db.query(models.Schedule).join(models.Workspace).filter(
        models.Schedule.id == schedule_id,
        models.Workspace.user_id == current_user.id
    ).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    await dispatch_schedule_job(schedule.id)
    db.refresh(schedule)
    return {"status": "success", "schedule": schedule}
