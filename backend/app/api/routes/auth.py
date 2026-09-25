from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_roles
from app.core.ratelimit import RateLimiter, rate_limit
from app.db.session import get_db
from app.models.enums import Role
from app.models.user import User
from app.schemas.auth import (
    AdminCreateUser,
    PublicUserRegister,
    RefreshRequest,
    ResendVerificationRequest,
    SimpleMessage,
    TokenPair,
    UserLogin,
    UserOut,
    VerifyEmailRequest,
)
from app.services.auth import AuthService
from app.services.verification import VerificationService

router = APIRouter(prefix="/auth", tags=["auth"])

_login_limiter = RateLimiter(limit=10, window_seconds=900, name="login")
_register_limiter = RateLimiter(limit=5, window_seconds=3600, name="register")
_verify_limiter = RateLimiter(limit=20, window_seconds=3600, name="verify-email")
_resend_limiter = RateLimiter(limit=3, window_seconds=3600, name="resend-verification")


@router.post(
    "/register",
    response_model=UserOut,
    status_code=201,
    dependencies=[Depends(rate_limit(_register_limiter))],
)
async def register(
    data: PublicUserRegister,
    background: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    return await AuthService(db).register(data, background=background)


@router.post(
    "/login",
    response_model=TokenPair,
    dependencies=[Depends(rate_limit(_login_limiter, by_email=True))],
)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    user = await service.authenticate(data.email, data.password)
    return service.issue_tokens(user)


@router.post("/refresh", response_model=TokenPair)
async def refresh(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    return await AuthService(db).refresh(data.refresh_token)


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return user


@router.post(
    "/verify-email",
    response_model=SimpleMessage,
    dependencies=[Depends(rate_limit(_verify_limiter))],
)
async def verify_email(data: VerifyEmailRequest, db: AsyncSession = Depends(get_db)):
    await VerificationService(db).consume(data.token)
    return SimpleMessage(message="Email verified. You can now sign in.")


@router.post(
    "/resend-verification",
    response_model=SimpleMessage,
    status_code=202,
    dependencies=[Depends(rate_limit(_resend_limiter, by_email=True))],
)
async def resend_verification(
    data: ResendVerificationRequest,
    background: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    await VerificationService(db).resend(data.email, background=background)
    return SimpleMessage(message="If an account needs verification, we've sent a new link.")


@router.post(
    "/users",
    response_model=UserOut,
    status_code=201,
)
async def admin_create_user(
    data: AdminCreateUser,
    db: AsyncSession = Depends(get_db),
    _actor: User = Depends(require_roles(Role.ADMIN)),
):
    return await AuthService(db).admin_create_user(data)
