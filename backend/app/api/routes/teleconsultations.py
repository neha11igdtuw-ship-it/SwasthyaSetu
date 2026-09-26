import json
import logging
import uuid
from typing import Any

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.errors import ForbiddenError, UnauthorizedError
from app.core.security import decode_token
from app.db.session import get_db
from app.models.enums import Role
from app.models.user import User
from app.repositories.users import UserRepository
from app.schemas.maternal import EncounterOut
from app.schemas.teleconsultation import (
    SpecialityOut,
    TeleconsultationAppointmentOut,
    TeleconsultationBookRequest,
    TeleconsultationCompleteRequest,
    TeleconsultationDoctorOut,
    TeleconsultationNotesRequest,
    TeleconsultationRoomInfoOut,
    TeleconsultationSlotOut,
)
from app.services.signaling import signaling_manager
from app.services.teleconsultations import TeleconsultationService

logger = logging.getLogger("teleconsultations_api")

router = APIRouter(tags=["teleconsultations"])


# ===========================================================================
# 1. SPECIALITIES & DOCTOR DISCOVERY (Patient-accessible & open)
# ===========================================================================


@router.get("/teleconsultations/specialities", response_model=list[SpecialityOut])
async def list_teleconsultation_specialities(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    """Dynamically load specialities from active doctors in the database."""
    return await TeleconsultationService(db).list_specialities()


@router.get("/teleconsultations/doctors", response_model=list[TeleconsultationDoctorOut])
async def list_teleconsultation_doctors(
    speciality: str | None = None,
    facility_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    """Discover eligible doctors with speciality, active status, facility, and availability."""
    return await TeleconsultationService(db).list_doctors(
        speciality=speciality,
        facility_id=facility_id,
    )


@router.get("/teleconsultations/doctors/{doctor_id}", response_model=TeleconsultationDoctorOut)
async def get_teleconsultation_doctor(
    doctor_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    """Get doctor detail/profile for teleconsultation booking."""
    return await TeleconsultationService(db).get_doctor_profile(doctor_id)


@router.get("/teleconsultations/doctors/{doctor_id}/availability", response_model=list[TeleconsultationSlotOut])
async def get_doctor_availability_slots(
    doctor_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    """Get patient-safe, open future slots for a doctor."""
    return await TeleconsultationService(db).get_doctor_slots(doctor_id)


# ===========================================================================
# 2. PATIENT BOOKING & APPOINTMENT MANAGEMENT
# ===========================================================================


@router.post("/teleconsultations/appointments", response_model=TeleconsultationAppointmentOut, status_code=201)
async def book_teleconsultation_appointment(
    data: TeleconsultationBookRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Atomically book a teleconsultation slot with double-booking prevention."""
    if user.role != Role.PATIENT:
        raise ForbiddenError("Only authenticated patients can book teleconsultations")
    return await TeleconsultationService(db).book_appointment(user, data)


@router.get("/teleconsultations/appointments/me", response_model=list[TeleconsultationAppointmentOut])
async def list_my_teleconsultations(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List upcoming and past teleconsultations for the authenticated patient."""
    if user.role != Role.PATIENT:
        raise ForbiddenError("Only patients can view their patient teleconsultations")
    return await TeleconsultationService(db).list_patient_appointments(user)


@router.get("/teleconsultations/appointments/{appointment_id}", response_model=TeleconsultationAppointmentOut)
async def get_teleconsultation_appointment(
    appointment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get details for a specific teleconsultation appointment."""
    return await TeleconsultationService(db).get_appointment(appointment_id, user)


@router.post("/teleconsultations/appointments/{appointment_id}/cancel", response_model=TeleconsultationAppointmentOut)
async def cancel_teleconsultation_appointment(
    appointment_id: uuid.UUID,
    reason: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Cancel a teleconsultation and release the slot back to doctor availability."""
    return await TeleconsultationService(db).cancel_appointment(appointment_id, user, reason)


# ===========================================================================
# 3. CONSULTATION ROOM & WEBRTC SIGNALING
# ===========================================================================


@router.get("/teleconsultations/{appointment_id}/room", response_model=TeleconsultationRoomInfoOut)
async def get_consultation_room_info(
    appointment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get consultation room state, timing window, and WebRTC STUN configuration."""
    return await TeleconsultationService(db).get_room_info(appointment_id, user)


@router.post("/teleconsultations/{appointment_id}/join")
async def join_consultation_room(
    appointment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Verify authorization and record join event for teleconsultation."""
    room_info = await TeleconsultationService(db).get_room_info(appointment_id, user)
    return {"status": "joined", "appointment_id": str(appointment_id), "room_id": room_info.room_id}


@router.post("/teleconsultations/{appointment_id}/leave")
async def leave_consultation_room(
    appointment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Record leave event for teleconsultation."""
    return {"status": "left", "appointment_id": str(appointment_id)}


@router.post("/teleconsultations/{appointment_id}/signal")
async def post_rest_signal(
    appointment_id: uuid.UUID,
    signal_data: dict[str, Any],
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """REST signaling fallback for environments where WebSockets are unavailable."""
    room_info = await TeleconsultationService(db).get_room_info(appointment_id, user)
    await signaling_manager.post_rest_signal(room_info.room_id, str(user.id), signal_data)
    return {"status": "sent"}


@router.get("/teleconsultations/{appointment_id}/signals")
async def get_rest_signals(
    appointment_id: uuid.UUID,
    since: float = Query(0.0),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Retrieve queued WebRTC signaling messages via REST polling."""
    room_info = await TeleconsultationService(db).get_room_info(appointment_id, user)
    signals = await signaling_manager.get_rest_signals(room_info.room_id, str(user.id), since)
    return signals


@router.websocket("/teleconsultations/{appointment_id}/ws")
async def teleconsultation_signaling_websocket(
    websocket: WebSocket,
    appointment_id: uuid.UUID,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Real-time WebRTC signaling WebSocket endpoint for audio/video consultations."""
    # 1. Authenticate user from query token
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id_str = payload.get("sub")
    try:
        user_id = uuid.UUID(user_id_str)
        user = await UserRepository(db).get(user_id)
    except Exception:
        user = None

    if not user or not user.is_active:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # 2. Authorize user for this appointment room
    try:
        service = TeleconsultationService(db)
        room_info = await service.get_room_info(appointment_id, user)
        room_id = room_info.room_id
    except Exception as e:
        logger.warning("WebSocket unauthorized: %s", e)
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # 3. Connect to signaling manager
    await signaling_manager.connect(
        room_id=room_id,
        user_id=str(user.id),
        role=user.role.value,
        websocket=websocket,
    )

    try:
        while True:
            text = await websocket.receive_text()
            try:
                msg = json.loads(text)
            except json.JSONDecodeError:
                continue

            # Relay signaling message (offer, answer, ice-candidate, chat) to other peer(s)
            await signaling_manager.broadcast_to_others(
                room_id=room_id,
                sender_user_id=str(user.id),
                message=msg,
            )
    except WebSocketDisconnect:
        await signaling_manager.disconnect(room_id=room_id, user_id=str(user.id))
    except Exception as e:
        logger.warning("WebSocket error for user %s: %s", user.id, e)
        await signaling_manager.disconnect(room_id=room_id, user_id=str(user.id))


# ===========================================================================
# 4. DOCTOR CONSULTATION DASHBOARD & CLINICAL WORKFLOW
# ===========================================================================


@router.get("/doctor/teleconsultations", response_model=list[TeleconsultationAppointmentOut])
async def list_doctor_teleconsultations(
    today_only: bool = False,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Doctor's upcoming & ongoing teleconsultations."""
    return await TeleconsultationService(db).list_doctor_appointments(user, today_only=today_only)


@router.get("/doctor/teleconsultations/{appointment_id}", response_model=TeleconsultationAppointmentOut)
async def get_doctor_teleconsultation(
    appointment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get single teleconsultation details for doctor."""
    return await TeleconsultationService(db).get_appointment(appointment_id, user)


@router.post("/doctor/teleconsultations/{appointment_id}/start", response_model=TeleconsultationAppointmentOut)
async def start_doctor_teleconsultation(
    appointment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Doctor starts active teleconsultation."""
    return await TeleconsultationService(db).start_consultation(appointment_id, user)


@router.post("/doctor/teleconsultations/{appointment_id}/notes", response_model=EncounterOut)
async def save_teleconsultation_notes(
    appointment_id: uuid.UUID,
    data: TeleconsultationNotesRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Doctor records structured clinical notes during or after consultation."""
    encounter = await TeleconsultationService(db).save_notes(appointment_id, user, data)
    return encounter


@router.post("/doctor/teleconsultations/{appointment_id}/complete", response_model=TeleconsultationAppointmentOut)
async def complete_doctor_teleconsultation(
    appointment_id: uuid.UUID,
    data: TeleconsultationCompleteRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Doctor completes consultation and saves notes, prescriptions, diagnostics, and referrals."""
    return await TeleconsultationService(db).complete_consultation(appointment_id, user, data)
