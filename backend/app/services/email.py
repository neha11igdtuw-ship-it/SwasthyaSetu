"""Outgoing email via stdlib smtplib.

Falls back to logging a dev-only verification link when SMTP isn't
configured, so registration works with zero setup in dev/CI. Never raises
out of send() — a slow/unreachable SMTP server must not break registration.
"""

from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

from app.core.config import Settings, get_settings

logger = logging.getLogger("app.email")


class EmailService:
    def __init__(self, settings: Settings | None = None):
        self.settings = settings or get_settings()

    @property
    def configured(self) -> bool:
        return self.settings.smtp_configured

    def send(self, *, to: str, subject: str, text_body: str, html_body: str | None = None) -> bool:
        if not self.configured:
            if self.settings.environment != "production":
                logger.info(
                    "EMAIL (dev fallback, not sent) to=%s subject=%s\n%s", to, subject, text_body
                )
            else:
                logger.info("Email not sent: SMTP is not configured.")
            return False

        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = f"{self.settings.smtp_from_name} <{self.settings.smtp_from_email}>"
        msg["To"] = to
        msg.set_content(text_body)
        if html_body:
            msg.add_alternative(html_body, subtype="html")

        try:
            with smtplib.SMTP(
                self.settings.smtp_host, self.settings.smtp_port, timeout=10
            ) as server:
                server.starttls()
                server.login(self.settings.smtp_username, self.settings.smtp_password)
                server.send_message(msg)
            return True
        except (smtplib.SMTPException, OSError) as exc:
            logger.warning("Failed to send email to %s: %s", to, exc)
            return False

    def send_verification_email(self, *, to: str, full_name: str, verify_url: str) -> bool:
        subject = "Verify your SwasthyaSetu account"
        text_body = (
            f"Hi {full_name},\n\n"
            "Please verify your email address to activate your SwasthyaSetu account:\n"
            f"{verify_url}\n\n"
            f"This link expires in {self.settings.email_verification_ttl_hours} hours. "
            "If you didn't create this account, you can ignore this email.\n"
        )
        html_body = (
            f"<p>Hi {full_name},</p>"
            "<p>Please verify your email address to activate your SwasthyaSetu account:</p>"
            f'<p><a href="{verify_url}">{verify_url}</a></p>'
            f"<p>This link expires in {self.settings.email_verification_ttl_hours} hours. "
            "If you didn't create this account, you can ignore this email.</p>"
        )
        return self.send(to=to, subject=subject, text_body=text_body, html_body=html_body)
