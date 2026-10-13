import asyncio
import logging
from datetime import datetime
import pytz
from typing import Optional

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models
from app.security import decrypt_data
from app.email_service import EmailService, render_template
from app.whatsapp_service import WhatsAppService

logger = logging.getLogger("scheduler")
logger.setLevel(logging.INFO)

async def dispatch_schedule_job(schedule_id: int):
    """
    Executes a single schedule job with idempotency and robust error handling.
    """
    db: Session = SessionLocal()
    try:
        schedule = db.query(models.Schedule).filter(models.Schedule.id == schedule_id).first()
        if not schedule:
            return

        # Double check status to avoid duplicate execution
        if schedule.status not in ["Scheduled", "Sending"]:
            return

        schedule.status = "Sending"
        db.commit()

        workspace = db.query(models.Workspace).filter(models.Workspace.id == schedule.workspace_id).first()
        if not workspace or not workspace.active:
            schedule.status = "Cancelled"
            schedule.error_reason = "Workspace was deleted or deactivated."
            db.commit()
            return

        user = db.query(models.User).filter(models.User.id == workspace.user_id).first()
        user_tz_str = user.timezone if user and user.timezone else "Asia/Kolkata"
        try:
            user_tz = pytz.timezone(user_tz_str)
        except Exception:
            user_tz = pytz.timezone("Asia/Kolkata")

        # Convert schedule time to user timezone for variable formatting
        local_dt = schedule.scheduled_at.replace(tzinfo=pytz.utc).astimezone(user_tz)
        month_name = local_dt.strftime("%B %Y")
        date_str = local_dt.strftime("%d %B %Y, %I:%M %p")

        # Fetch integrations
        email_integration = db.query(models.Integration).filter(
            models.Integration.user_id == workspace.user_id,
            models.Integration.provider.in_(["gmail", "email"])
        ).first()

        whatsapp_integration = db.query(models.Integration).filter(
            models.Integration.user_id == workspace.user_id,
            models.Integration.provider == "whatsapp"
        ).first()

        email_creds = decrypt_data(email_integration.encrypted_credentials) if (email_integration and email_integration.encrypted_credentials) else {}
        wa_creds = decrypt_data(whatsapp_integration.encrypted_credentials) if (whatsapp_integration and whatsapp_integration.encrypted_credentials) else {}

        # Get selected recipients
        selected_recip_records = db.query(models.WorkspaceRecipient).filter(
            models.WorkspaceRecipient.workspace_id == workspace.id,
            models.WorkspaceRecipient.is_selected == True
        ).all()

        if not selected_recip_records:
            schedule.status = "Failed"
            schedule.error_reason = "No recipients were selected for this workspace."
            db.commit()
            return

        success_count = 0
        fail_count = 0
        last_error = None

        for rec_assoc in selected_recip_records:
            recip = db.query(models.Recipient).filter(models.Recipient.id == rec_assoc.recipient_id).first()
            if not recip:
                continue

            # Template context
            context = {
                "teacher_name": recip.name,
                "recipient_name": recip.name,
                "month": month_name,
                "workspace_name": workspace.name,
                "date": date_str,
                "recipient_email": recip.email
            }

            rendered_subject = render_template(workspace.subject, context)
            rendered_message = render_template(workspace.message, context)

            # Send Email
            if workspace.send_email:
                try:
                    if email_integration and email_integration.status == "connected" and email_creds.get("password"):
                        # Real Email via Verified SMTP (Google App Password or custom SMTP)
                        EmailService.send_smtp(
                            sender_email=email_creds.get("account_email"),
                            password=email_creds.get("password"),
                            to_email=recip.email,
                            subject=rendered_subject,
                            body=rendered_message,
                            smtp_host=email_creds.get("smtp_host", "smtp.gmail.com"),
                            smtp_port=email_creds.get("smtp_port", 465),
                            sender_name=email_creds.get("sender_name", "Message Scheduler")
                        )
                    elif email_integration and email_integration.status == "connected" and email_creds.get("access_token"):
                        # Official Gmail API
                        res = EmailService.send_gmail(
                            credentials_dict=email_creds,
                            to_email=recip.email,
                            subject=rendered_subject,
                            body=rendered_message
                        )
                        # Update token if refreshed
                        if res.get("refreshed_token"):
                            email_creds["access_token"] = res["refreshed_token"]
                            from app.security import encrypt_data
                            email_integration.encrypted_credentials = encrypt_data(email_creds)
                            db.commit()
                    else:
                        raise ValueError("Email delivery failed: Google account is not connected. Please click 'Continue with Google' to authorize email dispatch.")

                    # Log success
                    log = models.MessageLog(
                        workspace_id=workspace.id,
                        schedule_id=schedule.id,
                        recipient_id=recip.id,
                        recipient_name=recip.name,
                        recipient_destination=recip.email,
                        channel="email",
                        status="Sent",
                        sent_at=datetime.utcnow(),
                        subject_snapshot=rendered_subject,
                        message_snapshot=rendered_message
                    )
                    db.add(log)
                    success_count += 1
                except Exception as e:
                    last_error = str(e)
                    fail_count += 1
                    log = models.MessageLog(
                        workspace_id=workspace.id,
                        schedule_id=schedule.id,
                        recipient_id=recip.id,
                        recipient_name=recip.name,
                        recipient_destination=recip.email,
                        channel="email",
                        status="Failed",
                        sent_at=datetime.utcnow(),
                        error_message=str(e),
                        subject_snapshot=rendered_subject,
                        message_snapshot=rendered_message
                    )
                    db.add(log)

            # Send WhatsApp
            if workspace.send_whatsapp and recip.whatsapp:
                try:
                    if whatsapp_integration and whatsapp_integration.status == "connected" and wa_creds.get("access_token"):
                        await WhatsAppService.send_message(
                            phone_number_id=wa_creds.get("phone_number_id", ""),
                            access_token=wa_creds.get("access_token", ""),
                            to_phone=recip.whatsapp,
                            body=f"*{rendered_subject}*\n\n{rendered_message}"
                        )
                    else:
                        WhatsAppService.send_simulation(
                            to_phone=recip.whatsapp,
                            body=rendered_message
                        )

                    log = models.MessageLog(
                        workspace_id=workspace.id,
                        schedule_id=schedule.id,
                        recipient_id=recip.id,
                        recipient_name=recip.name,
                        recipient_destination=recip.whatsapp,
                        channel="whatsapp",
                        status="Sent",
                        sent_at=datetime.utcnow(),
                        subject_snapshot=rendered_subject,
                        message_snapshot=rendered_message
                    )
                    db.add(log)
                    success_count += 1
                except Exception as e:
                    last_error = str(e)
                    fail_count += 1
                    log = models.MessageLog(
                        workspace_id=workspace.id,
                        schedule_id=schedule.id,
                        recipient_id=recip.id,
                        recipient_name=recip.name,
                        recipient_destination=recip.whatsapp,
                        channel="whatsapp",
                        status="Failed",
                        sent_at=datetime.utcnow(),
                        error_message=str(e),
                        subject_snapshot=rendered_subject,
                        message_snapshot=rendered_message
                    )
                    db.add(log)

        # Update schedule overall status
        if success_count > 0:
            schedule.status = "Sent"
            schedule.error_reason = f"Sent to {success_count} recipient channels." + (f" ({fail_count} failed)" if fail_count > 0 else "")
        else:
            schedule.status = "Failed"
            schedule.error_reason = last_error or "All delivery channels failed."

        db.commit()

    except Exception as e:
        logger.error(f"Error executing schedule {schedule_id}: {e}")
        try:
            sched = db.query(models.Schedule).filter(models.Schedule.id == schedule_id).first()
            if sched:
                sched.status = "Failed"
                sched.error_reason = str(e)
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


class BackgroundScheduler:
    def __init__(self):
        self.is_running = False
        self._task: Optional[asyncio.Task] = None

    async def start(self):
        if self.is_running:
            return
        self.is_running = True
        logger.info("Starting background scheduler worker loop...")
        self._task = asyncio.create_task(self._worker_loop())

    async def stop(self):
        self.is_running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Background scheduler stopped.")

    async def _worker_loop(self):
        while self.is_running:
            try:
                db: Session = SessionLocal()
                now_utc = datetime.utcnow()

                # Find schedules that are Scheduled or stuck in Sending and ready to run
                due_schedules = db.query(models.Schedule).filter(
                    models.Schedule.status == "Scheduled",
                    models.Schedule.scheduled_at <= now_utc
                ).limit(20).all()

                due_ids = [s.id for s in due_schedules]
                db.close()

                for sched_id in due_ids:
                    await dispatch_schedule_job(sched_id)

            except Exception as e:
                logger.error(f"Scheduler worker iteration error: {e}")

            # Sleep 5 seconds before checking again
            await asyncio.sleep(5)

# Global singleton
scheduler = BackgroundScheduler()
