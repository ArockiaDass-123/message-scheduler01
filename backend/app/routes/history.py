from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app import models, schemas
from app.security import get_current_user

router = APIRouter(prefix="/api/history", tags=["history"])

@router.get("/workspace/{workspace_id}", response_model=List[schemas.MessageLogOut])
def get_workspace_history(
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

    return db.query(models.MessageLog).filter(
        models.MessageLog.workspace_id == workspace_id
    ).order_by(models.MessageLog.sent_at.desc()).all()

@router.get("/global", response_model=List[schemas.MessageLogOut])
def get_global_history(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.MessageLog).join(models.Workspace).filter(
        models.Workspace.user_id == current_user.id
    ).order_by(models.MessageLog.sent_at.desc()).limit(limit).all()

@router.get("/detail/{log_id}", response_model=schemas.MessageLogOut)
def get_log_detail(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    log = db.query(models.MessageLog).join(models.Workspace).filter(
        models.MessageLog.id == log_id,
        models.Workspace.user_id == current_user.id
    ).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log entry not found")
    return log
