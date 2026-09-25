import os
import uuid

os.environ["RATE_LIMIT_ENABLED"] = "false"
# Tests use @example.com addresses; don't apply the real .env's role-based
# domain allow-lists (e.g. gmail.com) meant for local/dev use.
os.environ["ALLOWED_EMAIL_DOMAINS_PATIENT"] = ""
os.environ["ALLOWED_EMAIL_DOMAINS_HEALTH_WORKER"] = ""
os.environ["ALLOWED_EMAIL_DOMAINS_DOCTOR"] = ""
os.environ["ALLOWED_EMAIL_DOMAINS_ADMIN"] = ""

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.db.session import Base, get_db
from app.main import app
from app.models.enums import Role
from app.models.facility import Facility
from app.schemas.auth import UserRegister
from app.services.auth import AuthService

get_settings.cache_clear()


@pytest_asyncio.fixture
async def db_engine():
    engine = create_async_engine(
        f"sqlite+aiosqlite:///file:{uuid.uuid4()}?mode=memory&cache=shared&uri=true"
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session


@pytest_asyncio.fixture
async def client(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)

    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def facility(db_session):
    fac = Facility(name="Test Facility", facility_type="PHC")
    db_session.add(fac)
    await db_session.commit()
    await db_session.refresh(fac)
    return fac


@pytest_asyncio.fixture
async def auth_headers(client, db_session, facility):
    """A HEALTH_WORKER scoped to `facility` — the default facility-scoped
    identity used by most existing tests."""
    await AuthService(db_session).create_trusted_user(
        UserRegister(
            email="worker@example.com",
            password="StrongPass123!",
            full_name="Test Worker",
            role=Role.HEALTH_WORKER,
            facility_id=facility.id,
        )
    )
    resp = await client.post(
        "/api/v1/auth/login", json={"email": "worker@example.com", "password": "StrongPass123!"}
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def admin_headers(client, db_session):
    await AuthService(db_session).create_trusted_user(
        UserRegister(
            email="admin@example.com",
            password="StrongPass123!",
            full_name="Test Admin",
            role=Role.ADMIN,
        )
    )
    resp = await client.post(
        "/api/v1/auth/login", json={"email": "admin@example.com", "password": "StrongPass123!"}
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
