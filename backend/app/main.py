from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.api.routes import (
    appointments,
    auth,
    care_gaps,
    diagnostics,
    doctor_availability,
    encounters,
    facilities,
    health_worker_profiles,
    inventory,
    patients,
    pregnancies,
    prescriptions,
    referrals,
    symptoms,
    sync,
)
from app.core.config import get_settings
from app.core.errors import register_error_handlers

settings = get_settings()

app = FastAPI(title="SwasthyaSetu API", version="0.1.0")

register_error_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(facilities.router, prefix="/api/v1")
app.include_router(patients.router, prefix="/api/v1")
app.include_router(referrals.router, prefix="/api/v1")
app.include_router(inventory.router, prefix="/api/v1")
app.include_router(care_gaps.router, prefix="/api/v1")
app.include_router(sync.router, prefix="/api/v1")
app.include_router(pregnancies.router, prefix="/api/v1")
app.include_router(encounters.router, prefix="/api/v1")
app.include_router(appointments.router, prefix="/api/v1")
app.include_router(diagnostics.router, prefix="/api/v1")
app.include_router(prescriptions.router, prefix="/api/v1")
app.include_router(doctor_availability.router, prefix="/api/v1")
app.include_router(health_worker_profiles.router, prefix="/api/v1")
app.include_router(symptoms.router, prefix="/api/v1")


@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/docs")


@app.get("/health")
async def health():
    return {"status": "ok"}
