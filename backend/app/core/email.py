import os
import smtplib
from email.message import EmailMessage

from app.core.logging import get_logger

logger = get_logger(__name__)


def smtp_enabled() -> bool:
    return os.getenv("SMTP_ENABLED", "false").lower() == "true"


def send_password_reset_email(*, recipient_email: str, recipient_name: str | None, reset_url: str) -> None:
    smtp_host = os.getenv("SMTP_HOST", "mailpit")
    smtp_port = int(os.getenv("SMTP_PORT", "1025"))
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_use_tls = os.getenv("SMTP_USE_TLS", "false").lower() == "true"
    from_email = os.getenv("SMTP_FROM_EMAIL", "no-reply@mindfultrack.local")
    from_name = os.getenv("SMTP_FROM_NAME", "MindfulTrack")

    recipient_label = recipient_name or "there"
    message = EmailMessage()
    message["Subject"] = "Reset your MindfulTrack password"
    message["From"] = f"{from_name} <{from_email}>"
    message["To"] = recipient_email
    message.set_content(
        "\n".join(
            [
                f"Hello {recipient_label},",
                "",
                "We received a request to reset your MindfulTrack password.",
                "Use the link below to choose a new password. This link expires in 60 minutes.",
                "",
                reset_url,
                "",
                "If you did not request a password reset, you can safely ignore this email.",
            ]
        )
    )

    with smtplib.SMTP(host=smtp_host, port=smtp_port, timeout=10) as smtp:
        if smtp_use_tls:
            smtp.starttls()
        if smtp_username and smtp_password:
            smtp.login(smtp_username, smtp_password)
        smtp.send_message(message)

    logger.info("Password reset email sent")
