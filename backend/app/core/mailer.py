import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings

logger = logging.getLogger(__name__)

from email.mime.application import MIMEApplication

async def send_email(to_email: str, subject: str, html_body: str, attachment: bytes = None, filename: str = None, smtp_config: dict = None) -> bool:
    """Send an email with optional attachments using configured SMTP settings flawlessly."""
    # Prioritize user-specific config if provided, fallback to global settings
    smtp_host = (smtp_config or {}).get("smtp_host") or settings.SMTP_HOST
    smtp_port = (smtp_config or {}).get("smtp_port") or settings.SMTP_PORT
    smtp_user = (smtp_config or {}).get("smtp_user") or settings.SMTP_USER
    smtp_pass = (smtp_config or {}).get("smtp_password") or settings.SMTP_PASSWORD

    if not all([smtp_host, smtp_user, smtp_pass]):
        logger.error("SMTP NOT CONFIGURED. Outreach failure mapping to missing credentials.")
        return False

    try:
        msg = MIMEMultipart()
        msg['From'] = smtp_user
        msg['To'] = to_email
        msg['Subject'] = subject

        # Body
        msg.attach(MIMEText(html_body, 'html'))

        # Attachment
        if attachment and filename:
            part = MIMEApplication(attachment, _subtype="pdf")
            part.add_header('Content-Disposition', 'attachment', filename=filename)
            msg.attach(part)

        # Standard Gmail SMTP flow using TLS flawlessly
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
        
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return False
