from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
import os
import logging
import uuid
from datetime import datetime
from typing import Optional
import secrets
from pydantic import BaseModel

os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"
os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"
logger = logging.getLogger("auth")

from app.database import get_db
from app import models, schemas
from app.config import settings
from app.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user,
    encrypt_data,
    decrypt_data,
)
from google_auth_oauthlib.flow import Flow
from google.oauth2 import id_token
from google.auth.transport.requests import Request

router = APIRouter(prefix="/api/auth", tags=["auth"])

def seed_user_demo_data(user_id: int, db: Session):
    """Seed initial recipients and workspace for instant pleasant onboarding."""
    existing_ws = db.query(models.Workspace).filter(models.Workspace.user_id == user_id).first()
    if existing_ws:
        return

    demo_recipients = [
        models.Recipient(user_id=user_id, name="Arockiadass", email="arockiadass123@gmail.com", whatsapp="+919876543210"),
        models.Recipient(user_id=user_id, name="Kumar", email="kumar@gmail.com", whatsapp="+919876543211"),
        models.Recipient(user_id=user_id, name="Priya", email="priya@gmail.com", whatsapp="+919876543212"),
    ]
    db.add_all(demo_recipients)
    db.commit()

    demo_ws = models.Workspace(
        user_id=user_id,
        name="Monthly Teacher Student Update",
        description="Regular monthly follow-up with subject teachers regarding student coverage and attendance.",
        subject="Monthly Student Update - {{month}}",
        message="Dear {{teacher_name}},\n\nPlease send me the monthly update for your students.\n\nPlease include:\n1. What topics were completed this month?\n2. How many students attended?\n3. What activities were conducted?\n4. Which students need additional attention?\n5. Any important issues or updates?\n\nPlease send the details by the requested date.\n\nThank you.",
        send_email=True,
        send_whatsapp=False
    )
    db.add(demo_ws)
    db.commit()
    db.refresh(demo_ws)

    # Link recipients
    for r in demo_recipients:
        db.add(models.WorkspaceRecipient(workspace_id=demo_ws.id, recipient_id=r.id, is_selected=True))
    db.commit()

@router.post("/register", response_model=schemas.Token)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == user_in.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = models.User(
        email=user_in.email.lower(),
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name or "Admin",
        timezone=user_in.timezone or "Asia/Kolkata"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    seed_user_demo_data(user.id, db)

    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@router.post("/login", response_model=schemas.Token)
def login(login_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == login_data.email.lower()).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@router.post("/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username.lower()).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@router.get("/me", response_model=schemas.UserOut)
def read_current_user(current_user: models.User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=schemas.UserOut)
def update_current_user(user_update: schemas.UserUpdate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    if user_update.timezone is not None:
        current_user.timezone = user_update.timezone
    db.commit()
    db.refresh(current_user)
    return current_user


# ==========================================
# Google OAuth & Auto-Connect Endpoints
# ==========================================

class GoogleConfigIn(BaseModel):
    client_id: str
    client_secret: str
    redirect_uri: Optional[str] = None

class GoogleCallbackIn(BaseModel):
    code: str
    redirect_uri: Optional[str] = None

class GoogleDirectConnectIn(BaseModel):
    email: str
    full_name: Optional[str] = None
    app_password: Optional[str] = None

@router.get("/google/status")
def get_google_oauth_status():
    """Returns whether Google Cloud OAuth Client ID is configured."""
    has_id = bool(settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_ID.strip())
    has_secret = bool(settings.GOOGLE_CLIENT_SECRET and settings.GOOGLE_CLIENT_SECRET.strip())
    return {
        "configured": has_id and has_secret,
        "client_id": settings.GOOGLE_CLIENT_ID if has_id else "",
        "redirect_uri": settings.GOOGLE_REDIRECT_URI
    }

@router.post("/google/configure")
def configure_google_credentials(cfg: GoogleConfigIn):
    """Save Google OAuth Client ID & Secret to environment and .env file."""
    clean_id = cfg.client_id.strip()
    clean_secret = cfg.client_secret.strip()
    clean_uri = cfg.redirect_uri.strip() if cfg.redirect_uri else "http://localhost:3000"

    settings.GOOGLE_CLIENT_ID = clean_id
    settings.GOOGLE_CLIENT_SECRET = clean_secret
    settings.GOOGLE_REDIRECT_URI = clean_uri

    # Write to backend/.env file
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
    lines = []
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            lines = f.readlines()

    updated_keys = {"GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI"}
    new_lines = [l for l in lines if not any(l.startswith(f"{k}=") for k in updated_keys)]
    new_lines.append(f"GOOGLE_CLIENT_ID={clean_id}\n")
    new_lines.append(f"GOOGLE_CLIENT_SECRET={clean_secret}\n")
    new_lines.append(f"GOOGLE_REDIRECT_URI={clean_uri}\n")

    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)

    return {"status": "success", "message": "Google OAuth credentials saved successfully!"}

@router.get("/google/url")
def get_google_auth_url(redirect_uri: Optional[str] = None):
    """Generates official Google OAuth authorization URL requesting email, profile, and gmail.send scopes."""
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_ID.strip():
        return {
            "configured": False,
            "auth_url": "",
            "message": "Google OAuth 2.0 requires backend configuration. System administrator: Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to backend/.env."
        }

    cb_uri = redirect_uri or settings.GOOGLE_REDIRECT_URI or "http://localhost:3000"
    # Normalize: strip trailing slashes to avoid redirect_uri mismatch during token exchange
    cb_uri = cb_uri.rstrip("/")
    
    scopes = [
        "openid",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/gmail.send"
    ]
    scope_str = "%20".join(scopes)
    state = secrets.token_urlsafe(16)
    
    from urllib.parse import quote
    encoded_redirect = quote(cb_uri, safe='')
    
    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={settings.GOOGLE_CLIENT_ID.strip()}&"
        f"redirect_uri={encoded_redirect}&"
        f"response_type=code&"
        f"scope={scope_str}&"
        f"access_type=offline&"
        f"prompt=consent&"
        f"state={state}"
    )
    logger.info(f"[Google OAuth] Generated auth URL. redirect_uri={cb_uri}")
    return {
        "configured": True,
        "auth_url": auth_url,
        "client_id": settings.GOOGLE_CLIENT_ID.strip(),
        "state": state
    }

def process_google_oauth_code(code: str, redirect_uri: Optional[str], db: Session):
    """Exchanges Google code, logs in or registers user, and connects Gmail automatically."""
    cb_uri = redirect_uri or settings.GOOGLE_REDIRECT_URI or "http://localhost:3000"
    # Normalize redirect_uri: strip trailing slashes to avoid mismatch
    cb_uri = cb_uri.rstrip("/")
    
    logger.info(f"[Google OAuth] Starting token exchange. redirect_uri={cb_uri}, code_length={len(code) if code else 0}")
    
    try:
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": settings.GOOGLE_CLIENT_ID.strip() if settings.GOOGLE_CLIENT_ID else "",
                    "client_secret": settings.GOOGLE_CLIENT_SECRET.strip() if settings.GOOGLE_CLIENT_SECRET else "",
                    "redirect_uris": [cb_uri, f"{cb_uri}/", settings.GOOGLE_REDIRECT_URI, "http://localhost:3000", "http://localhost:3000/"],
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
            },
            scopes=[
                "openid",
                "https://www.googleapis.com/auth/userinfo.email",
                "https://www.googleapis.com/auth/userinfo.profile",
                "https://www.googleapis.com/auth/gmail.send"
            ],
        )
        flow.redirect_uri = cb_uri
        flow.fetch_token(code=code)
        creds = flow.credentials
        logger.info(f"[Google OAuth] Token exchange successful. Has refresh_token={bool(creds.refresh_token)}")
    except Exception as e:
        logger.error(f"[Google OAuth] Token exchange FAILED: {e}", exc_info=True)
        err_msg = str(e)
        if "invalid_client" in err_msg.lower() or "client secret is invalid" in err_msg.lower():
            raise HTTPException(
                status_code=400,
                detail="Google OAuth error: The client secret configured in backend/.env is invalid or does not match this OAuth Client ID. Please copy the latest Client Secret from Google Cloud Console (APIs & Services > Credentials) and update GOOGLE_CLIENT_SECRET in backend/.env."
            )
        raise HTTPException(status_code=400, detail=f"Google token exchange failed: {err_msg}")

    # Verify ID token to get user email and name
    try:
        idinfo = id_token.verify_oauth2_token(creds.id_token, Request(), settings.GOOGLE_CLIENT_ID)
        email = idinfo.get("email", "").lower()
        full_name = idinfo.get("name", "")
        picture = idinfo.get("picture", "")
    except Exception:
        # Fallback to fetching userinfo via access token if id_token verification fails
        import httpx
        userinfo_resp = httpx.get("https://www.googleapis.com/oauth2/v2/userinfo", headers={"Authorization": f"Bearer {creds.token}"})
        if userinfo_resp.status_code == 200:
            user_data = userinfo_resp.json()
            email = user_data.get("email", "").lower()
            full_name = user_data.get("name", "")
            picture = user_data.get("picture", "")
        else:
            raise HTTPException(status_code=400, detail="Unable to retrieve profile from Google account")

    if not email:
        raise HTTPException(status_code=400, detail="Unable to retrieve email from Google account")

    # Find existing user or create a new user
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        random_password = uuid.uuid4().hex
        user = models.User(
            email=email,
            hashed_password=get_password_hash(random_password),
            full_name=full_name or email.split("@")[0].capitalize(),
            picture=picture or None,
            timezone=settings.DEFAULT_TIMEZONE,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        # Seed recipients & workspace for instant usage
        seed_user_demo_data(user.id, db)
    else:
        changed = False
        if full_name and user.full_name != full_name:
            user.full_name = full_name
            changed = True
        if picture and user.picture != picture:
            user.picture = picture
            changed = True
        if changed:
            db.commit()
            db.refresh(user)

    # Find existing Gmail integration to preserve refresh_token if Google omitted it
    integration = db.query(models.Integration).filter(
        models.Integration.user_id == user.id,
        models.Integration.provider == "gmail",
    ).first()

    old_refresh_token = None
    if integration and integration.encrypted_credentials:
        try:
            old_payload = decrypt_data(integration.encrypted_credentials)
            old_refresh_token = old_payload.get("refresh_token")
        except Exception:
            pass

    effective_refresh_token = creds.refresh_token or old_refresh_token

    # Store Gmail integration payload
    payload = {
        "account_email": email,
        "access_token": creds.token,
        "refresh_token": effective_refresh_token,
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "token_uri": creds.token_uri or "https://oauth2.googleapis.com/token",
        "connected_at": datetime.utcnow().isoformat(),
        "provider_type": "google_oauth"
    }

    if not integration:
        integration = models.Integration(
            user_id=user.id,
            provider="gmail",
            encrypted_credentials=encrypt_data(payload),
            status="connected",
            account_info=email,
        )
        db.add(integration)
    else:
        integration.encrypted_credentials = encrypt_data(payload)
        integration.status = "connected"
        integration.account_info = email

    db.commit()

    # Issue JWT token
    access_token = create_access_token(data={"sub": str(user.id)})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
        "email_connected": True,
        "connected_email": email
    }

@router.get("/google-login")
def google_login_get(code: str, redirect_uri: Optional[str] = None, db: Session = Depends(get_db)):
    """GET handler for Google OAuth redirect callback."""
    return process_google_oauth_code(code, redirect_uri, db)

@router.post("/google/callback")
def google_callback_post(cb_data: GoogleCallbackIn, db: Session = Depends(get_db)):
    """POST handler for exchanging Google OAuth authorization code."""
    return process_google_oauth_code(cb_data.code, cb_data.redirect_uri, db)

@router.post("/google/direct-connect")
def google_direct_connect(data: GoogleDirectConnectIn, db: Session = Depends(get_db)):
    """
    Direct Google account sign-in with automatic email dispatch readiness.
    Connects Gmail immediately so user never has to navigate to Settings!
    """
    clean_email = data.email.strip().lower()
    if not clean_email or "@" not in clean_email:
        raise HTTPException(status_code=400, detail="Please provide a valid Gmail address.")

    user = db.query(models.User).filter(models.User.email == clean_email).first()
    if not user:
        random_password = uuid.uuid4().hex
        user = models.User(
            email=clean_email,
            hashed_password=get_password_hash(random_password),
            full_name=data.full_name or clean_email.split("@")[0].capitalize(),
            timezone=settings.DEFAULT_TIMEZONE,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        seed_user_demo_data(user.id, db)

    # Automatically connect Gmail integration
    clean_app_pwd = (data.app_password or "").replace(" ", "").strip()
    payload = {
        "account_email": clean_email,
        "sender_name": user.full_name or "Message Scheduler",
        "connected_at": datetime.utcnow().isoformat(),
    }
    if clean_app_pwd:
        payload["password"] = clean_app_pwd
        payload["smtp_host"] = "smtp.gmail.com"
        payload["smtp_port"] = 465

    integration = db.query(models.Integration).filter(
        models.Integration.user_id == user.id,
        models.Integration.provider == "gmail",
    ).first()

    if not integration:
        integration = models.Integration(
            user_id=user.id,
            provider="gmail",
            encrypted_credentials=encrypt_data(payload),
            status="connected",
            account_info=clean_email,
        )
        db.add(integration)
    else:
        integration.encrypted_credentials = encrypt_data(payload)
        integration.status = "connected"
        integration.account_info = clean_email

    db.commit()

    access_token = create_access_token(data={"sub": str(user.id)})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
        "email_connected": True,
        "connected_email": clean_email
    }

