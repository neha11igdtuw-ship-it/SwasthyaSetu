import uuid

from pydantic import BaseModel, EmailStr

from app.models.enums import Role
from app.schemas.common import ORMBase


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: Role
    phone: str | None = None
    facility_id: uuid.UUID | None = None
    village: str | None = None
    preferred_language: str | None = None


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


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str
