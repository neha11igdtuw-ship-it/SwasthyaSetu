"""Outgoing email via Brevo/Resend's HTTPS APIs, with stdlib smtplib as a
fallback.

Brevo/Resend are tried before SMTP because hosts like Railway/Render block
outbound SMTP ports (25/465/587) on their network — smtplib can never open
that socket there regardless of credentials (fails with ENETUNREACH),
whereas an HTTPS API call is unaffected. Brevo is preferred over Resend when
both are configured: Brevo only requires a single verified sender email (no
owned domain) and can then deliver to any recipient, while a Resend sandbox
key can only deliver to the Resend account's own email until a domain is
verified there. Falls back to logging a dev-only verification link when
nothing is configured, so registration works with zero setup in dev/CI.
Never raises out of send() — a failed/unreachable provider must not break
registration.
"""

from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

import httpx

from app.core.config import Settings, get_settings

logger = logging.getLogger("app.email")

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"
RESEND_API_URL = "https://api.resend.com/emails"


class EmailService:
    def __init__(self, settings: Settings | None = None):
        self.settings = settings or get_settings()

    @property
    def configured(self) -> bool:
        return (
            self.settings.brevo_configured
            or self.settings.resend_configured
            or self.settings.smtp_configured
        )

    def send(self, *, to: str, subject: str, text_body: str, html_body: str | None = None) -> bool:
        if self.settings.brevo_configured:
            return self._send_via_brevo(
                to=to, subject=subject, text_body=text_body, html_body=html_body
            )
        if self.settings.resend_configured:
            return self._send_via_resend(
                to=to, subject=subject, text_body=text_body, html_body=html_body
            )
        if self.settings.smtp_configured:
            return self._send_via_smtp(
                to=to, subject=subject, text_body=text_body, html_body=html_body
            )

        if self.settings.environment != "production":
            logger.info(
                "EMAIL (dev fallback, not sent) to=%s subject=%s\n%s", to, subject, text_body
            )
        else:
            logger.info("Email not sent: no email provider is configured.")
        return False

    def _send_via_brevo(
        self, *, to: str, subject: str, text_body: str, html_body: str | None
    ) -> bool:
        payload = {
            "sender": {
                "name": self.settings.smtp_from_name,
                "email": self.settings.smtp_from_email,
            },
            "to": [{"email": to}],
            "subject": subject,
            "textContent": text_body,
        }
        if html_body:
            payload["htmlContent"] = html_body

        try:
            response = httpx.post(
                BREVO_API_URL,
                headers={
                    "api-key": self.settings.brevo_api_key,
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=10,
            )
            response.raise_for_status()
            return True
        except httpx.HTTPError as exc:
            logger.warning("Failed to send email to %s via Brevo: %s", to, exc)
            return False

    def _send_via_resend(
        self, *, to: str, subject: str, text_body: str, html_body: str | None
    ) -> bool:
        payload = {
            "from": f"{self.settings.smtp_from_name} <{self.settings.smtp_from_email}>",
            "to": [to],
            "subject": subject,
            "text": text_body,
        }
        if html_body:
            payload["html"] = html_body

        try:
            response = httpx.post(
                RESEND_API_URL,
                headers={"Authorization": f"Bearer {self.settings.resend_api_key}"},
                json=payload,
                timeout=10,
            )
            response.raise_for_status()
            return True
        except httpx.HTTPError as exc:
            logger.warning("Failed to send email to %s via Resend: %s", to, exc)
            return False

    def _send_via_smtp(
        self, *, to: str, subject: str, text_body: str, html_body: str | None
    ) -> bool:
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
            logger.warning("Failed to send email to %s via SMTP: %s", to, exc)
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
