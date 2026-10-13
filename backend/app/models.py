from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True, default="Admin")
    timezone = Column(String(64), default="Asia/Kolkata", nullable=False)
    picture = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    workspaces = relationship("Workspace", back_populates="user", cascade="all, delete-orphan")
    recipients = relationship("Recipient", back_populates="user", cascade="all, delete-orphan")
    integrations = relationship("Integration", back_populates="user", cascade="all, delete-orphan")


class Recipient(Base):
    __tablename__ = "recipients"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    whatsapp = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="recipients")
    workspace_associations = relationship("WorkspaceRecipient", back_populates="recipient", cascade="all, delete-orphan")


class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    subject = Column(String(500), nullable=False, default="Monthly Student Update")
    message = Column(Text, nullable=False, default="Dear Teacher,\n\nPlease send me the monthly update for your students.\n\n1. Topics completed\n2. Attendance details\n3. Activities conducted\n4. Students needing extra attention\n\nThank you.")
    send_email = Column(Boolean, default=True)
    send_whatsapp = Column(Boolean, default=False)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="workspaces")
    recipient_associations = relationship("WorkspaceRecipient", back_populates="workspace", cascade="all, delete-orphan")
    schedules = relationship("Schedule", back_populates="workspace", cascade="all, delete-orphan")
    logs = relationship("MessageLog", back_populates="workspace", cascade="all, delete-orphan")


class WorkspaceRecipient(Base):
    __tablename__ = "workspace_recipients"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    recipient_id = Column(Integer, ForeignKey("recipients.id", ondelete="CASCADE"), nullable=False)
    is_selected = Column(Boolean, default=True)

    workspace = relationship("Workspace", back_populates="recipient_associations")
    recipient = relationship("Recipient", back_populates="workspace_associations")

    __table_args__ = (
        Index("idx_ws_recip", "workspace_id", "recipient_id", unique=True),
    )


class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    scheduled_at = Column(DateTime, nullable=False, index=True)  # Stored in UTC
    recurrence_type = Column(String(50), default="once")  # once, monthly, custom
    status = Column(String(50), default="Scheduled", index=True)  # Scheduled, Sending, Sent, Failed, Cancelled
    idempotency_key = Column(String(255), unique=True, index=True, nullable=True)
    retry_count = Column(Integer, default=0)
    error_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    workspace = relationship("Workspace", back_populates="schedules")
    logs = relationship("MessageLog", back_populates="schedule", cascade="all, delete-orphan")


class MessageLog(Base):
    __tablename__ = "message_logs"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    schedule_id = Column(Integer, ForeignKey("schedules.id", ondelete="SET NULL"), nullable=True)
    recipient_id = Column(Integer, ForeignKey("recipients.id", ondelete="SET NULL"), nullable=True)
    
    recipient_name = Column(String(255), nullable=True)
    recipient_destination = Column(String(255), nullable=True)  # email or phone
    channel = Column(String(50), default="email")  # email, whatsapp
    status = Column(String(50), default="Sent")  # Sent, Failed
    sent_at = Column(DateTime, default=datetime.utcnow)
    error_message = Column(Text, nullable=True)
    
    subject_snapshot = Column(String(500), nullable=True)
    message_snapshot = Column(Text, nullable=True)

    workspace = relationship("Workspace", back_populates="logs")
    schedule = relationship("Schedule", back_populates="logs")


class Integration(Base):
    __tablename__ = "integrations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String(50), nullable=False)  # gmail, whatsapp
    encrypted_credentials = Column(Text, nullable=True)
    status = Column(String(50), default="disconnected")  # connected, disconnected, error
    account_info = Column(String(255), nullable=True)  # e.g. "principal@school.edu" or "+919876543210"
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="integrations")

    __table_args__ = (
        Index("idx_user_provider", "user_id", "provider", unique=True),
    )
