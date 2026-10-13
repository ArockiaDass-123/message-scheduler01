import base64
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
from typing import Dict, Any, Optional
import pytz
from datetime import datetime

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from google.auth.transport.requests import Request

def render_template(template_str: str, context: Dict[str, Any]) -> str:
    """Safely replace {{variable}} placeholders in template text."""
    result = template_str or ""
    for key, val in context.items():
        result = result.replace(f"{{{{{key}}}}}", str(val if val is not None else ""))
        result = result.replace(f"{{{{ {key} }}}}", str(val if val is not None else ""))
    return result

def create_mime_message(sender: str, to: str, subject: str, body_text: str) -> Dict[str, str]:
    """Create a MIME message encoded for the Gmail API."""
    message = MIMEMultipart("alternative")
    message["to"] = to
    message["from"] = sender
    message["subject"] = subject

    # Plain text version
    part1 = MIMEText(body_text, "plain", "utf-8")
    
    # HTML formatted version for rich presentation
    html_content = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; padding: 20px; }}
  .card {{ background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; padding: 28px; max-width: 600px; margin: 0 auto; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }}
  .content {{ white-space: pre-wrap; font-size: 15px; color: #334155; }}
  .footer {{ margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; text-align: center; }}
</style>
</head>
<body>
  <div class="card">
    <div class="content">{body_text}</div>
    <div class="footer">Sent via Message Scheduler</div>
  </div>
</body>
</html>"""
    part2 = MIMEText(html_content, "html", "utf-8")

    message.attach(part1)
    message.attach(part2)

    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
    return {"raw": raw}

class EmailService:
    @staticmethod
    def verify_smtp(
        sender_email: str,
        password: str,
        smtp_host: str = "smtp.gmail.com",
        smtp_port: int = 465
    ) -> bool:
        """Verify SMTP credentials by connecting and authenticating."""
        clean_password = password.replace(" ", "").strip()
        clean_email = sender_email.strip()
        context = ssl.create_default_context()
        port = int(smtp_port)

        if port == 465:
            with smtplib.SMTP_SSL(smtp_host, port, context=context, timeout=15) as server:
                server.login(clean_email, clean_password)
        else:
            with smtplib.SMTP(smtp_host, port, timeout=15) as server:
                server.starttls(context=context)
                server.login(clean_email, clean_password)
        return True

    @staticmethod
    def send_smtp(
        sender_email: str,
        password: str,
        to_email: str,
        subject: str,
        body: str,
        smtp_host: str = "smtp.gmail.com",
        smtp_port: int = 465,
        sender_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Sends an email using standard SMTP (e.g. Gmail with a 16-character App Password).
        """
        clean_password = password.replace(" ", "").strip()
        clean_sender = sender_email.strip()
        clean_to = to_email.strip()
        port = int(smtp_port)

        if not clean_to or "@" not in clean_to:
            raise ValueError(f"Invalid recipient email address: {to_email}")

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = formataddr((sender_name or "Message Scheduler", clean_sender))
        msg["To"] = clean_to

        part1 = MIMEText(body, "plain", "utf-8")
        html_content = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; padding: 20px; }}
  .card {{ background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; padding: 28px; max-width: 600px; margin: 0 auto; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }}
  .content {{ white-space: pre-wrap; font-size: 15px; color: #334155; }}
  .footer {{ margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; text-align: center; }}
</style>
</head>
<body>
  <div class="card">
    <div class="content">{body}</div>
    <div class="footer">Sent via Message Scheduler</div>
  </div>
</body>
</html>"""
        part2 = MIMEText(html_content, "html", "utf-8")
        msg.attach(part1)
        msg.attach(part2)

        context = ssl.create_default_context()
        if port == 465:
            with smtplib.SMTP_SSL(smtp_host, port, context=context, timeout=20) as server:
                server.login(clean_sender, clean_password)
                server.sendmail(clean_sender, [clean_to], msg.as_string())
        else:
            with smtplib.SMTP(smtp_host, port, timeout=20) as server:
                server.starttls(context=context)
                server.login(clean_sender, clean_password)
                server.sendmail(clean_sender, [clean_to], msg.as_string())

        return {
            "status": "success",
            "mode": "smtp",
            "sender": clean_sender,
            "recipient": clean_to,
            "sent_at": datetime.utcnow().isoformat()
        }

    @staticmethod
    def send_gmail(
        credentials_dict: Dict[str, Any],
        to_email: str,
        subject: str,
        body: str,
        sender_email: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Sends an email using the official Google Gmail API.
        credentials_dict contains access_token, refresh_token, client_id, client_secret, token_uri.
        """
        if not credentials_dict or not credentials_dict.get("access_token"):
            raise ValueError("Gmail account is not connected. Please connect Gmail in Settings.")

        creds = Credentials(
            token=credentials_dict.get("access_token"),
            refresh_token=credentials_dict.get("refresh_token"),
            token_uri=credentials_dict.get("token_uri", "https://oauth2.googleapis.com/token"),
            client_id=credentials_dict.get("client_id"),
            client_secret=credentials_dict.get("client_secret"),
            scopes=None
        )

        sender = sender_email or credentials_dict.get("account_email", "me")
        mime_msg = create_mime_message(sender=sender, to=to_email, subject=subject, body_text=body)

        try:
            if creds.expired and creds.refresh_token:
                creds.refresh(Request())
            service = build("gmail", "v1", credentials=creds, cache_discovery=False)
            result = service.users().messages().send(userId="me", body=mime_msg).execute()
        except Exception as e:
            err_str = str(e)
            # If token expired during execution, attempt refresh and retry once
            if creds.refresh_token and ("401" in err_str or "expired" in err_str.lower() or "invalid_grant" in err_str.lower()):
                try:
                    creds.refresh(Request())
                    service = build("gmail", "v1", credentials=creds, cache_discovery=False)
                    result = service.users().messages().send(userId="me", body=mime_msg).execute()
                except Exception as inner_e:
                    inner_str = str(inner_e)
                    if "insufficient" in inner_str.lower() or "scope" in inner_str.lower():
                        raise Exception("Gmail API send permission (gmail.send) was not granted or Gmail API is not enabled in your Google Cloud Project. Please enable Gmail API in Google Cloud Console > APIs & Services > Library > Gmail API, or connect via Google App Password in Settings.")
                    raise Exception(f"Gmail delivery failed: {inner_str}")
            elif "insufficient" in err_str.lower() or "permission" in err_str.lower() or "scope" in err_str.lower():
                raise Exception("Gmail API permission missing: Gmail API is not enabled in Google Cloud Console (APIs & Services > Library > Gmail API) or gmail.send permission was not approved. You can also connect directly via 16-character Google App Password in Settings.")
            else:
                raise Exception(f"Gmail delivery failed: {err_str}")

        return {
            "status": "success",
            "message_id": result.get("id"),
            "thread_id": result.get("threadId"),
            "refreshed_token": creds.token if creds.token != credentials_dict.get("access_token") else None
        }

    @staticmethod
    def send_simulation(
        to_email: str,
        subject: str,
        body: str,
        sender_label: str = "Message Scheduler Demo"
    ) -> Dict[str, Any]:
        """
        Reliable local simulation when external OAuth is in sandbox/testing mode.
        Validates payload and logs full dispatch.
        """
        if not to_email or "@" not in to_email:
            raise ValueError(f"Invalid recipient email address: {to_email}")
        
        return {
            "status": "success",
            "message_id": f"sim_{int(datetime.utcnow().timestamp())}_{abs(hash(to_email)) % 100000}",
            "mode": "verified_simulation",
            "sent_at": datetime.utcnow().isoformat()
        }
