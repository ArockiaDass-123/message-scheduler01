from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta
import pytz

from app.database import get_db
from app import models, schemas
from app.security import get_current_user

router = APIRouter(prefix="/api/workspaces", tags=["workspaces"])

def enrich_workspace_stats(ws: models.Workspace, db: Session) -> dict:
    recipients_count = db.query(models.WorkspaceRecipient).filter(
        models.WorkspaceRecipient.workspace_id == ws.id,
        models.WorkspaceRecipient.is_selected == True
    ).count()

    scheduled_count = db.query(models.Schedule).filter(
        models.Schedule.workspace_id == ws.id
    ).count()

    sent_count = db.query(models.Schedule).filter(
        models.Schedule.workspace_id == ws.id,
        models.Schedule.status == "Sent"
    ).count()

    pending_count = db.query(models.Schedule).filter(
        models.Schedule.workspace_id == ws.id,
        models.Schedule.status == "Scheduled"
    ).count()

    next_sched = db.query(models.Schedule).filter(
        models.Schedule.workspace_id == ws.id,
        models.Schedule.status == "Scheduled",
        models.Schedule.scheduled_at >= datetime.utcnow()
    ).order_by(models.Schedule.scheduled_at.asc()).first()

    return {
        "id": ws.id,
        "name": ws.name,
        "description": ws.description,
        "subject": ws.subject,
        "message": ws.message,
        "send_email": ws.send_email,
        "send_whatsapp": ws.send_whatsapp,
        "active": ws.active,
        "created_at": ws.created_at,
        "updated_at": ws.updated_at,
        "recipient_count": recipients_count,
        "scheduled_count": scheduled_count,
        "sent_count": sent_count,
        "pending_count": pending_count,
        "next_scheduled_at": next_sched.scheduled_at if next_sched else None
    }

@router.get("", response_model=List[schemas.WorkspaceOut])
def get_workspaces(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    workspaces = db.query(models.Workspace).filter(
        models.Workspace.user_id == current_user.id
    ).order_by(models.Workspace.created_at.desc()).all()

    return [enrich_workspace_stats(ws, db) for ws in workspaces]

@router.get("/dashboard/summary")
def get_dashboard_summary(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    user_tz_str = current_user.timezone or "Asia/Kolkata"
    try:
        user_tz = pytz.timezone(user_tz_str)
    except Exception:
        user_tz = pytz.timezone("Asia/Kolkata")

    now_utc = datetime.utcnow()
    now_local = datetime.now(user_tz)
    today_start_local = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end_local = today_start_local + timedelta(days=1)
    
    today_start_utc = today_start_local.astimezone(pytz.utc).replace(tzinfo=None)
    today_end_utc = today_end_local.astimezone(pytz.utc).replace(tzinfo=None)

    # Today's scheduled
    today_scheds = db.query(models.Schedule).join(models.Workspace).filter(
        models.Workspace.user_id == current_user.id,
        models.Schedule.scheduled_at >= today_start_utc,
        models.Schedule.scheduled_at < today_end_utc
    ).order_by(models.Schedule.scheduled_at.asc()).all()

    # Upcoming scheduled (from now forward)
    upcoming_scheds = db.query(models.Schedule).join(models.Workspace).filter(
        models.Workspace.user_id == current_user.id,
        models.Schedule.scheduled_at >= now_utc,
        models.Schedule.status == "Scheduled"
    ).order_by(models.Schedule.scheduled_at.asc()).limit(8).all()

    # Recently sent
    recent_sent = db.query(models.Schedule).join(models.Workspace).filter(
        models.Workspace.user_id == current_user.id,
        models.Schedule.status.in_(["Sent", "Failed"])
    ).order_by(models.Schedule.scheduled_at.desc()).limit(8).all()

    def serialize_sched(s: models.Schedule):
        recipient_count = db.query(models.WorkspaceRecipient).filter(
            models.WorkspaceRecipient.workspace_id == s.workspace_id,
            models.WorkspaceRecipient.is_selected == True
        ).count()
        return {
            "id": s.id,
            "workspace_id": s.workspace_id,
            "workspace_name": s.workspace.name,
            "scheduled_at": s.scheduled_at,
            "status": s.status,
            "recipient_count": recipient_count,
            "error_reason": s.error_reason
        }

    return {
        "today": [serialize_sched(s) for s in today_scheds],
        "upcoming": [serialize_sched(s) for s in upcoming_scheds],
        "recently_sent": [serialize_sched(s) for s in recent_sent]
    }

@router.post("", response_model=schemas.WorkspaceOut)
def create_workspace(ws_in: schemas.WorkspaceCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    ws = models.Workspace(
        user_id=current_user.id,
        name=ws_in.name,
        description=ws_in.description,
        subject=ws_in.subject,
        message=ws_in.message,
        send_email=ws_in.send_email,
        send_whatsapp=ws_in.send_whatsapp
    )
    db.add(ws)
    db.commit()
    db.refresh(ws)

    # Automatically associate all current user's recipients selected by default
    user_recipients = db.query(models.Recipient).filter(models.Recipient.user_id == current_user.id).all()
    for r in user_recipients:
        db.add(models.WorkspaceRecipient(workspace_id=ws.id, recipient_id=r.id, is_selected=True))
    db.commit()

    return enrich_workspace_stats(ws, db)

@router.get("/{workspace_id}", response_model=schemas.WorkspaceDetail)
def get_workspace(workspace_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    ws = db.query(models.Workspace).filter(
        models.Workspace.id == workspace_id,
        models.Workspace.user_id == current_user.id
    ).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    stats = enrich_workspace_stats(ws, db)

    # Fetch all user recipients and which ones are selected for this workspace
    all_recipients = db.query(models.Recipient).filter(models.Recipient.user_id == current_user.id).all()
    selected_records = db.query(models.WorkspaceRecipient).filter(
        models.WorkspaceRecipient.workspace_id == ws.id,
        models.WorkspaceRecipient.is_selected == True
    ).all()
    selected_ids = [rec.recipient_id for rec in selected_records]

    return {
        **stats,
        "recipients": all_recipients,
        "selected_recipient_ids": selected_ids
    }

@router.put("/{workspace_id}", response_model=schemas.WorkspaceOut)
def update_workspace(workspace_id: int, ws_update: schemas.WorkspaceUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    ws = db.query(models.Workspace).filter(
        models.Workspace.id == workspace_id,
        models.Workspace.user_id == current_user.id
    ).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    if ws_update.name is not None:
        ws.name = ws_update.name
    if ws_update.description is not None:
        ws.description = ws_update.description
    if ws_update.subject is not None:
        ws.subject = ws_update.subject
    if ws_update.message is not None:
        ws.message = ws_update.message
    if ws_update.send_email is not None:
        ws.send_email = ws_update.send_email
    if ws_update.send_whatsapp is not None:
        ws.send_whatsapp = ws_update.send_whatsapp
    if ws_update.active is not None:
        ws.active = ws_update.active

    db.commit()
    db.refresh(ws)
    return enrich_workspace_stats(ws, db)

@router.delete("/{workspace_id}")
def delete_workspace(workspace_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    ws = db.query(models.Workspace).filter(
        models.Workspace.id == workspace_id,
        models.Workspace.user_id == current_user.id
    ).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    db.delete(ws)
    db.commit()
    return {"status": "success", "message": "Workspace deleted"}

@router.post("/{workspace_id}/recipients")
def update_workspace_recipients(
    workspace_id: int,
    selections: List[schemas.RecipientSelection],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    ws = db.query(models.Workspace).filter(
        models.Workspace.id == workspace_id,
        models.Workspace.user_id == current_user.id
    ).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    for item in selections:
        rec_assoc = db.query(models.WorkspaceRecipient).filter(
            models.WorkspaceRecipient.workspace_id == ws.id,
            models.WorkspaceRecipient.recipient_id == item.recipient_id
        ).first()

        if rec_assoc:
            rec_assoc.is_selected = item.is_selected
        else:
            new_assoc = models.WorkspaceRecipient(
                workspace_id=ws.id,
                recipient_id=item.recipient_id,
                is_selected=item.is_selected
            )
            db.add(new_assoc)

    db.commit()
    return {"status": "success", "message": "Recipients updated"}
