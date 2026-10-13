from pydantic import BaseModel, field_serializer
from typing import Optional, List
from datetime import datetime

# --- Auth Schemas ---
class UserCreate(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = "Admin"
    timezone: Optional[str] = "Asia/Kolkata"

class UserLogin(BaseModel):
    email: str
    password: str

class UserOut(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    picture: Optional[str] = None
    timezone: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    timezone: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

# --- Recipient Schemas ---
class RecipientBase(BaseModel):
    name: str
    email: str
    whatsapp: Optional[str] = None

class RecipientCreate(RecipientBase):
    pass

class RecipientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    whatsapp: Optional[str] = None

class RecipientOut(RecipientBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class RecipientSelection(BaseModel):
    recipient_id: int
    is_selected: bool

# --- Workspace Schemas ---
class WorkspaceBase(BaseModel):
    name: str
    description: Optional[str] = None
    subject: str = "Monthly Student Update"
    message: str
    send_email: bool = True
    send_whatsapp: bool = False

class WorkspaceCreate(WorkspaceBase):
    pass

class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    subject: Optional[str] = None
    message: Optional[str] = None
    send_email: Optional[bool] = None
    send_whatsapp: Optional[bool] = None
    active: Optional[bool] = None

class WorkspaceOut(WorkspaceBase):
    id: int
    active: bool
    created_at: datetime
    updated_at: datetime
    recipient_count: int = 0
    scheduled_count: int = 0
    sent_count: int = 0
    pending_count: int = 0
    next_scheduled_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class WorkspaceDetail(WorkspaceOut):
    recipients: List[RecipientOut] = []
    selected_recipient_ids: List[int] = []

# --- Schedule Schemas ---
class ScheduleCreate(BaseModel):
    scheduled_at: datetime  # ISO string or datetime
    recurrence_type: Optional[str] = "once"

class ScheduleRecurringCreate(BaseModel):
    # e.g., monthly on day X at HH:MM for N months
    day_of_month: int
    time_str: str  # "09:00"
    start_year: int
    start_month: int
    months_count: int = 12
    timezone: Optional[str] = "Asia/Kolkata"

class ScheduleBatchCreate(BaseModel):
    # Multiple custom dates
    dates: List[datetime]  # list of datetimes

class ScheduleOut(BaseModel):
    id: int
    workspace_id: int
    scheduled_at: datetime
    recurrence_type: str
    status: str
    retry_count: int
    error_reason: Optional[str]
    created_at: datetime

    @field_serializer("scheduled_at", "created_at")
    def serialize_datetime(self, dt: datetime, _info) -> str:
        if dt is None:
            return None
        if dt.tzinfo is None:
            return dt.isoformat() + "Z"
        return dt.isoformat()

    class Config:
        from_attributes = True

# --- Message Log Schemas ---
class MessageLogOut(BaseModel):
    id: int
    workspace_id: int
    schedule_id: Optional[int]
    recipient_name: Optional[str]
    recipient_destination: Optional[str]
    channel: str
    status: str
    sent_at: datetime
    error_message: Optional[str]
    subject_snapshot: Optional[str]
    message_snapshot: Optional[str]

    class Config:
        from_attributes = True

# --- Settings & Integrations ---
class IntegrationOut(BaseModel):
    provider: str
    status: str
    account_info: Optional[str]
    updated_at: Optional[datetime]

class TestEmailRequest(BaseModel):
    to_email: str
    subject: str = "Test Email from Message Scheduler"
    message: str = "This is a test notification confirming your message dispatch system is working properly."

class WhatsAppConfigRequest(BaseModel):
    phone_number_id: str
    access_token: str

class GoogleOAuthCallback(BaseModel):
    code: str
    redirect_uri: Optional[str] = None
