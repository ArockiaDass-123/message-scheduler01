from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import models, schemas
from app.security import get_current_user

router = APIRouter(prefix="/api/recipients", tags=["recipients"])

@router.get("", response_model=List[schemas.RecipientOut])
def get_recipients(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Recipient).filter(
        models.Recipient.user_id == current_user.id
    ).order_by(models.Recipient.name.asc()).all()

@router.post("", response_model=schemas.RecipientOut)
def create_recipient(rec_in: schemas.RecipientCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Check if duplicate email for this user
    existing = db.query(models.Recipient).filter(
        models.Recipient.user_id == current_user.id,
        models.Recipient.email == rec_in.email.lower()
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="A recipient with this email already exists")

    recipient = models.Recipient(
        user_id=current_user.id,
        name=rec_in.name,
        email=rec_in.email.lower(),
        whatsapp=rec_in.whatsapp
    )
    db.add(recipient)
    db.commit()
    db.refresh(recipient)

    # Automatically add to all existing workspaces of this user
    user_workspaces = db.query(models.Workspace).filter(models.Workspace.user_id == current_user.id).all()
    for ws in user_workspaces:
        db.add(models.WorkspaceRecipient(workspace_id=ws.id, recipient_id=recipient.id, is_selected=True))
    db.commit()

    return recipient

@router.put("/{recipient_id}", response_model=schemas.RecipientOut)
def update_recipient(recipient_id: int, rec_in: schemas.RecipientUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    recipient = db.query(models.Recipient).filter(
        models.Recipient.id == recipient_id,
        models.Recipient.user_id == current_user.id
    ).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")

    if rec_in.name is not None:
        recipient.name = rec_in.name
    if rec_in.email is not None:
        recipient.email = rec_in.email.lower()
    if rec_in.whatsapp is not None:
        recipient.whatsapp = rec_in.whatsapp

    db.commit()
    db.refresh(recipient)
    return recipient

@router.delete("/{recipient_id}")
def delete_recipient(recipient_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    recipient = db.query(models.Recipient).filter(
        models.Recipient.id == recipient_id,
        models.Recipient.user_id == current_user.id
    ).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")

    db.delete(recipient)
    db.commit()
    return {"status": "success", "message": "Recipient deleted"}
