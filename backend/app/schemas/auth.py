import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator, model_validator

from app.core.validators import (
    SELF_REGISTRABLE_ROLES,
    assert_email_allowed,
    normalize_indian_phone,
    validate_password_strength,
    validate_pincode,
)
from app.models.enums import Role
from app.schemas.common import ORMBase


class AddressIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    address_line: str
    village_area: str
    city_district: str
    state: str
    pincode: str
    landmark: str | None = None

    @field_validator("address_line", "village_area", "city_district", "state")
    @classmethod
    def _required_nonempty(cls, value: str) -> str:
        if not value:
            raise ValueError("This field is required")
        return value

    @field_validator("pincode")
    @classmethod
    def _pincode(cls, value: str) -> str:
        return validate_pincode(value)


class AddressOut(BaseModel):
    address_line: str | None = None
    village_area: str | None = None
    city_district: str | None = None
    state: str | None = None
    pincode: str | None = None
    landmark: str | None = None


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: Role
    phone: str | None = None
    facility_id: uuid.UUID | None = None
    village: str | None = None
    preferred_language: str | None = None
    address: AddressIn | None = None

    @field_validator("password")
    @classmethod
    def _password_strength(cls, value: str) -> str:
        return validate_password_strength(value)

    @field_validator("phone")
    @classmethod
    def _normalize_phone(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return normalize_indian_phone(value)


class PublicUserRegister(UserRegister):
    """Stricter contract enforced only on the public self-registration
    endpoint: role restricted to patient/health-worker, phone + address
    required, and email domain checked against the role's allow-list."""

    phone: str
    address: AddressIn

    @field_validator("role")
    @classmethod
    def _self_registrable_role(cls, value: Role) -> Role:
        if value not in SELF_REGISTRABLE_ROLES:
            raise ValueError("Only patient and health worker accounts can self-register")
        return value

    @model_validator(mode="after")
    def _email_domain_allowed(self) -> "PublicUserRegister":
        self.email = assert_email_allowed(self.email, self.role)
        return self


class AdminCreateUser(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: Role
    phone: str | None = None
    facility_id: uuid.UUID | None = None

    @field_validator("password")
    @classmethod
    def _password_strength(cls, value: str) -> str:
        return validate_password_strength(value)

    @field_validator("phone")
    @classmethod
    def _normalize_phone(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return normalize_indian_phone(value)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(ORMBase):
    id: uuid.UUID
    email: str
    full_name: str
    role: Role
    phone: str | None = None
    facility_id: uuid.UUID | None = None
    is_active: bool
    is_verified: bool
    address_line: str | None = None
    village_area: str | None = None
    city_district: str | None = None
    state: str | None = None
    pincode: str | None = None
    landmark: str | None = None


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class VerifyEmailRequest(BaseModel):
    token: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class SimpleMessage(BaseModel):
    message: str
