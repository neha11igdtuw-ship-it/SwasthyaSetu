"""Shared validation helpers for registration input.

Kept dependency-free (no DB, no FastAPI) so they can be unit tested directly
and reused from both Pydantic schemas and services.
"""

from __future__ import annotations

import re

from app.core.config import get_settings
from app.models.enums import Role

# Roles allowed to self-register via the public /auth/register endpoint.
# DOCTOR/ADMIN/FACILITY_ADMIN/FACILITY_STAFF accounts are provisioned by an
# existing admin via POST /auth/users instead.
SELF_REGISTRABLE_ROLES: frozenset[Role] = frozenset({Role.PATIENT, Role.HEALTH_WORKER})

_PASSWORD_SPECIALS = "!@#$%^&*()-_=+[]{};:,.<>?/|~`'\"\\"

_INDIAN_PHONE_RE = re.compile(r"^[6-9]\d{9}$")
_PINCODE_RE = re.compile(r"^[1-9]\d{5}$")


def normalize_indian_phone(raw: str) -> str:
    """Normalize an Indian mobile number to a bare 10-digit string.

    Strips spaces/hyphens/parens/dots and an optional leading country code
    (+91 / 91) or trunk prefix (0), then requires exactly 10 digits starting
    with 6-9. Raises ValueError with a user-facing message otherwise.
    """
    cleaned = re.sub(r"[\s\-().]", "", raw or "")
    if cleaned.startswith("+91"):
        cleaned = cleaned[3:]
    elif cleaned.startswith("91") and len(cleaned) == 12:
        cleaned = cleaned[2:]
    elif cleaned.startswith("0") and len(cleaned) == 11:
        cleaned = cleaned[1:]
    if not _INDIAN_PHONE_RE.match(cleaned):
        raise ValueError("Enter a valid 10-digit Indian mobile number starting with 6-9")
    return cleaned


def validate_pincode(raw: str) -> str:
    cleaned = (raw or "").strip()
    if not _PINCODE_RE.match(cleaned):
        raise ValueError("Enter a valid 6-digit PIN code")
    return cleaned


def validate_password_strength(password: str) -> str:
    problems: list[str] = []
    if len(password) < 8:
        problems.append("at least 8 characters")
    if not any(c.isupper() for c in password):
        problems.append("an uppercase letter")
    if not any(c.islower() for c in password):
        problems.append("a lowercase letter")
    if not any(c.isdigit() for c in password):
        problems.append("a number")
    if not any(c in _PASSWORD_SPECIALS for c in password):
        problems.append("a special character")
    if problems:
        raise ValueError("Password must contain " + ", ".join(problems))
    return password


def allowed_domains_for(role: Role) -> set[str]:
    return get_settings().allowed_email_domains.get(role.value, set())


def assert_email_allowed(email: str, role: Role) -> str:
    """Validate the email's domain against the role-configured allow-list.

    Exact, case-insensitive match on the full domain part only — never
    `endswith`/substring — so `abc@gmail.com.fake` is rejected even though it
    contains `gmail.com`.
    """
    local, _, domain = email.rpartition("@")
    domain = domain.lower()
    if not local or "." not in domain or len(domain.rsplit(".", 1)[-1]) < 2:
        raise ValueError("Enter a valid email address")
    allowed = allowed_domains_for(role)
    if allowed and domain not in allowed:
        raise ValueError(
            f"Please register with an email address ending in {', '.join(sorted(allowed))}"
        )
    return f"{local}@{domain}"
