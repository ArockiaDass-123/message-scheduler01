from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel

from app.database import get_db
from app import models, schemas
from app.config import settings
from app.security import get_current_user, encrypt_data, decrypt_data
from app.email_service import EmailService
from app.whatsapp_service import WhatsAppService

router = APIRouter(prefix="/api/settings", tags=["settings"])

class ManualGmailConfig(BaseModel):
    account_email: str
    password: Optional[str] = None
    smtp_host: Optional[str] = "smtp.gmail.com"
    smtp_port: Optional[int] = 465
    sender_name: Optional[str] = "Message Scheduler"
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None

class WhatsAppConfigRequest(BaseModel):
    phone_number_id: str
    access_token: str
    account_label: Optional[str] = "Official WhatsApp Cloud API"

class TimezoneUpdateRequest(BaseModel):
    timezone: str

@router.get("/integrations", response_model=List[schemas.IntegrationOut])
def get_integrations(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    integrations = db.query(models.Integration).filter(
        models.Integration.user_id == current_user.id
    ).all()

    # Ensure gmail and whatsapp entries exist in output
    result_map = {i.provider: i for i in integrations}
    providers = ["gmail", "whatsapp"]
    response = []
    for p in providers:
        if p in result_map:
            response.append(schemas.IntegrationOut(
                provider=p,
                status=result_map[p].status,
                account_info=result_map[p].account_info,
                updated_at=result_map[p].updated_at
            ))
        else:
            response.append(schemas.IntegrationOut(
                provider=p,
                status="disconnected",
                account_info=None,
                updated_at=None
            ))
    return response

@router.get("/google/auth-url")
def get_google_auth_url(current_user: models.User = Depends(get_current_user)):
    """
    Returns Google OAuth 2.0 authorization URL.
    """
    if not settings.GOOGLE_CLIENT_ID:
        return {
            "configured": False,
            "auth_url": "",
            "message": "Google Client ID is not configured in .env. Connect using your Gmail address & 16-character App Password."
        }

    redirect_uri = settings.GOOGLE_REDIRECT_URI
    scope = "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email"
    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={settings.GOOGLE_CLIENT_ID}&"
        f"redirect_uri={redirect_uri}&"
        f"response_type=code&"
        f"scope={scope}&"
        f"access_type=offline&"
        f"prompt=consent&"
        f"state=user_{current_user.id}"
    )
    return {"configured": True, "auth_url": auth_url}

@router.post("/google/connect-manual")
def connect_gmail_account(
    data: ManualGmailConfig,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not data.account_email or "@" not in data.account_email:
        raise HTTPException(status_code=400, detail="Please provide a valid email address.")

    clean_email = data.account_email.strip()
    clean_password = (data.password or "").replace(" ", "").strip()
    smtp_host = (data.smtp_host or "smtp.gmail.com").strip()
    smtp_port = int(data.smtp_port or 465)
    sender_name = (data.sender_name or "Message Scheduler").strip()

    if clean_password:
        # Verify SMTP credentials against mail server
        try:
            EmailService.verify_smtp(
                sender_email=clean_email,
                password=clean_password,
                smtp_host=smtp_host,
                smtp_port=smtp_port
            )
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"SMTP authentication failed: {str(e)}. If using Gmail, make sure 2-Step Verification is enabled and use a 16-character Google App Password (not your main password)."
            )

        payload = {
            "account_email": clean_email,
            "password": clean_password,
            "smtp_host": smtp_host,
            "smtp_port": smtp_port,
            "sender_name": sender_name,
            "connected_at": datetime.utcnow().isoformat()
        }
        account_label = f"{clean_email} (Verified SMTP)"
    elif data.access_token and data.refresh_token:
        payload = {
            "account_email": clean_email,
            "access_token": data.access_token,
            "refresh_token": data.refresh_token,
            "client_id": data.client_id or settings.GOOGLE_CLIENT_ID,
            "client_secret": data.client_secret or settings.GOOGLE_CLIENT_SECRET,
            "connected_at": datetime.utcnow().isoformat()
        }
        account_label = f"{clean_email} (Google OAuth)"
    else:
        raise HTTPException(
            status_code=400,
            detail="Please provide your 16-character Google App Password to connect and verify your email account."
        )

    integration = db.query(models.Integration).filter(
        models.Integration.user_id == current_user.id,
        models.Integration.provider == "gmail"
    ).first()

    if not integration:
        integration = models.Integration(
            user_id=current_user.id,
            provider="gmail",
            encrypted_credentials=encrypt_data(payload),
            status="connected",
            account_info=account_label
        )
        db.add(integration)
    else:
        integration.encrypted_credentials = encrypt_data(payload)
        integration.status = "connected"
        integration.account_info = account_label

    db.commit()
    db.refresh(integration)
    return {"status": "success", "message": f"Email successfully verified and connected for {clean_email}!"}

@router.post("/google/disconnect")
def disconnect_gmail(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    integration = db.query(models.Integration).filter(
        models.Integration.user_id == current_user.id,
        models.Integration.provider == "gmail"
    ).first()
    if integration:
        integration.status = "disconnected"
        integration.account_info = None
        integration.encrypted_credentials = None
        db.commit()
    return {"status": "success", "message": "Email account disconnected"}

@router.post("/whatsapp/connect")
def connect_whatsapp(
    data: WhatsAppConfigRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    integration = db.query(models.Integration).filter(
        models.Integration.user_id == current_user.id,
        models.Integration.provider == "whatsapp"
    ).first()

    payload = {
        "phone_number_id": data.phone_number_id.strip(),
        "access_token": data.access_token.strip(),
        "connected_at": datetime.utcnow().isoformat()
    }

    account_label = f"ID: {data.phone_number_id}"
    if not integration:
        integration = models.Integration(
            user_id=current_user.id,
            provider="whatsapp",
            encrypted_credentials=encrypt_data(payload),
            status="connected",
            account_info=account_label
        )
        db.add(integration)
    else:
        integration.encrypted_credentials = encrypt_data(payload)
        integration.status = "connected"
        integration.account_info = account_label

    db.commit()
    db.refresh(integration)
    return {"status": "success", "message": "WhatsApp Business Cloud API connected"}

@router.post("/whatsapp/disconnect")
def disconnect_whatsapp(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    integration = db.query(models.Integration).filter(
        models.Integration.user_id == current_user.id,
        models.Integration.provider == "whatsapp"
    ).first()
    if integration:
        integration.status = "disconnected"
        integration.account_info = None
        integration.encrypted_credentials = None
        db.commit()
    return {"status": "success", "message": "WhatsApp disconnected"}

@router.post("/test-email")
def send_test_email(
    data: schemas.TestEmailRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    integration = db.query(models.Integration).filter(
        models.Integration.user_id == current_user.id,
        models.Integration.provider.in_(["gmail", "email"])
    ).first()

    if not integration or integration.status != "connected":
        raise HTTPException(
            status_code=400,
            detail="No email account connected. Please enter your Gmail address and 16-character App Password above and click 'Connect & Verify'."
        )

    creds = decrypt_data(integration.encrypted_credentials) if integration.encrypted_credentials else {}

    try:
        if creds.get("password"):
            result = EmailService.send_smtp(
                sender_email=creds.get("account_email"),
                password=creds.get("password"),
                to_email=data.to_email,
                subject=data.subject,
                body=data.message,
                smtp_host=creds.get("smtp_host", "smtp.gmail.com"),
                smtp_port=creds.get("smtp_port", 465),
                sender_name=creds.get("sender_name", "Message Scheduler")
            )
            return {"status": "success", "message": f"Real test email successfully delivered to {data.to_email} via SMTP!", "result": result}
        elif creds.get("access_token"):
            result = EmailService.send_gmail(
                credentials_dict=creds,
                to_email=data.to_email,
                subject=data.subject,
                body=data.message
            )
            return {"status": "success", "message": f"Test email sent via Gmail API to {data.to_email}", "result": result}
        else:
            raise HTTPException(
                status_code=400,
                detail="Google account is not connected. Please click 'Continue with Google' to sign in and authorize email dispatch."
            )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Email dispatch error: {str(e)}")

@router.put("/timezone")
def update_timezone(
    data: TimezoneUpdateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    import pytz
    if data.timezone not in pytz.all_timezones:
        raise HTTPException(status_code=400, detail="Invalid timezone identifier")

    current_user.timezone = data.timezone
    db.commit()
    db.refresh(current_user)
    return {"status": "success", "timezone": current_user.timezone}
