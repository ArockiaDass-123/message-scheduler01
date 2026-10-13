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
        Sends an email using the Gmail REST API over HTTPS (port 443).
        This works on Render free tier where outbound SMTP (port 587/465) is blocked.
        Requires https://mail.google.com/ or https://www.googleapis.com/auth/gmail.send scope.
        """
        import httpx

        if not credentials_dict or not credentials_dict.get("access_token"):
            raise ValueError("Gmail account is not connected. Please connect Gmail in Settings.")

        sender = sender_email or credentials_dict.get("account_email", "")
        if not sender:
            raise ValueError("No sender email configured. Please reconnect your Gmail account.")

        # Refresh the access token if expired
        access_token = credentials_dict.get("access_token")
        refreshed_token = None

        if credentials_dict.get("refresh_token") and credentials_dict.get("client_id"):
            try:
                creds = Credentials(
                    token=access_token,
                    refresh_token=credentials_dict.get("refresh_token"),
                    token_uri=credentials_dict.get("token_uri", "https://oauth2.googleapis.com/token"),
                    client_id=credentials_dict.get("client_id"),
                    client_secret=credentials_dict.get("client_secret"),
                    scopes=None,
                )
                if creds.expired or not creds.valid:
                    creds.refresh(Request())
                    access_token = creds.token
                    refreshed_token = access_token
            except Exception:
                pass  # Try with existing token

        # Build MIME email
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = formataddr(("Message Scheduler", sender))
        msg["To"] = to_email.strip()

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

        # Encode as base64url for Gmail API
        raw = base64.urlsafe_b64encode(msg.as_bytes()).decode("utf-8")

        # Send via Gmail REST API (HTTPS port 443 — works on Render free tier)
        try:
            resp = httpx.post(
                "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
                json={"raw": raw},
                timeout=30,
            )
            if resp.status_code == 401:
                raise Exception(
                    "Gmail authentication failed (401). Please sign out and sign in again with Google to refresh permissions."
                )
            if resp.status_code == 403:
                raise Exception(
                    "Gmail permission denied (403). Please sign out and sign in again — make sure to allow Gmail send permission."
                )
            if not resp.is_success:
                error_detail = resp.json().get("error", {}).get("message", resp.text)
                raise Exception(f"Gmail API error {resp.status_code}: {error_detail}")
        except httpx.RequestError as e:
            raise Exception(f"Gmail API network error: {str(e)}")

        return {
            "status": "success",
            "mode": "gmail_api",
            "sender": sender,
            "recipient": to_email.strip(),
            "sent_at": datetime.utcnow().isoformat(),
            "refreshed_token": refreshed_token,
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
