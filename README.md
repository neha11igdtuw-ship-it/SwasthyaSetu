# SwasthyaSetu

AI-powered, multilingual and offline-first continuity-of-care platform connecting patients, health workers and doctors in rural and underserved areas.

## Live Demo

**Prototype:** [swasthya-setu-iota.vercel.app](https://swasthya-setu-iota.vercel.app/)

<img src="docs/live_link_qr.png" alt="Scan to open the live SwasthyaSetu prototype" width="180" />

Scan the QR code above or click the link to open the live app.

## Core USP

> We do not just connect rural patients to healthcare—we ensure they complete their entire care journey.

## Problem

Rural and underserved communities often face long travel distances, limited specialists, poor connectivity, fragmented health records, delayed referrals, diagnostic unavailability and missed follow-ups.

SwasthyaSetu connects patients, health workers and doctors through one coordinated healthcare journey.

## Main Features

- Multilingual voice-based interaction
- AI-assisted triage
- Shared longitudinal patient health records
- Teleconsultation support
- Smart referral matching
- Two-way referral tracking
- Diagnostic and medicine availability
- Care-gap detection
- Follow-up reminders and escalation
- Offline-first workflows
- Patient, health-worker and doctor dashboards

## User Roles

### Patient

- Enter symptoms using voice or text
- View personal health records
- Track appointments and referrals
- Receive medicine and follow-up reminders
- Access multilingual health guidance

### Health Worker

- Register and screen patients
- Record symptoms and vital signs
- Access patient history
- Coordinate referrals
- Track high-risk patients and missed follow-ups
- Work in low-connectivity areas

### Doctor

- View patient history and reports
- Review AI-assisted triage summaries
- Conduct teleconsultations
- Add prescriptions and recommendations
- Create referrals and follow-up instructions

## How It Works

```text
Patient Voice/Text Input
          ↓
Multilingual AI Processing
          ↓
AI-Assisted Triage
          ↓
Health Worker/Doctor Validation
          ↓
Teleconsultation or Facility Referral
          ↓
Diagnostics and Medicines
          ↓
Care-Gap Detection
          ↓
Follow-up and Escalation
          ↓
Care Completed
```

## Tech Stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Backend:** FastAPI (Python), SQLAlchemy, Alembic
- **Database:** PostgreSQL
- **Offline support:** Dexie.js / IndexedDB
- **Deployment:** Vercel (frontend), Railway (backend)

## Architecture and schema source of truth

Live data path: **Frontend (Next.js) → FastAPI (`backend/`) → Postgres**. The Next.js app does not connect to Postgres directly.

The **authoritative database schema** is the SQLAlchemy models in `backend/app/models/` plus Alembic migrations in `backend/alembic/versions/`.

`database/DATABASE_DESIGN.md` is **reference documentation only** — it does not necessarily match the running backend; treat the SQLAlchemy models and migrations as the source of truth.

## Getting Started (local development)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .
cp .env.example .env   # fill in your local DB credentials
alembic upgrade head
python -m seed.seed_data
uvicorn app.main:app --reload
```

### Frontend

```bash
npm install
cp .env.local.example .env.local   # if present; otherwise set NEXT_PUBLIC_API_URL to your backend
npm run dev
```

The app runs at `http://localhost:3000`, the API at `http://localhost:8000`.

### Demo story (seeded)

| Role | Name | Login |
|---|---|---|
| Patient | Priya Sharma, Rampur Village, pregnancy week 28, high-risk maternal care | `patient@swasthyasetu.dev` / `Patient@123` |
| Health worker | ANM Sunita Devi | `worker@swasthyasetu.dev` / `ChangeMe123!` |
| Doctor | Dr. Meera Singh | `doctor@swasthyasetu.dev` / `ChangeMe123!` |
| Facility admin | District Civil Hospital & Maternal Care Centre | `admin@swasthyasetu.dev` / `ChangeMe123!` |

## Queue management (OPD queues)

Patients join a facility's OPD queue for a specific department/room/doctor ("queue desk") instead of
waiting in a physical line. Backend: `backend/app/models/queue.py`, `repositories/queue.py`,
`services/queue.py`, `services/notifications.py`, `schemas/queue.py`, `api/routes/queue.py`. Frontend:
`src/components/patient/QueueCard.tsx` ("My OPD Queue" on the patient dashboard),
`src/app/patient/queue/join/page.tsx` (QR scan + manual join), `src/components/care/DoctorQueuePanel.tsx`,
`src/components/care/FacilityQueueSection.tsx`, `src/components/care/HealthWorkerQueueSection.tsx`.

**Ordering algorithm.** Within a queue desk + day, active entries (`WAITING`/`CALLED`/`IN_CONSULTATION`)
are ordered by `active_order` ascending, then `joined_at` ascending. `active_order` starts at
`max_active_order + 1 - priority` when a patient joins (priority 0 is normal; a higher priority moves
someone earlier — used for urgent referrals/appointments). `token_number` is a separate, strictly
incrementing per-desk-per-day counter (`queue_desk_counters`, locked with `SELECT ... FOR UPDATE` inside
the join transaction) — it is never reused and never changes for the lifetime of an entry, even across
skip/rejoin. `estimated_wait_minutes` is recomputed for every waiting entry after each
join/complete/skip/pause/resume: `(patients ahead × average_consultation_minutes) + doctor_delay_minutes`
(a flat 15-minute delay is applied while the desk is paused).

**Skip / rejoin / audit trail.** A no-show is never deleted. `POST /queues/{id}/skip` marks the entry
`SKIPPED` with `skipped_at`/`skip_reason`, and the doctor's next `call-next` automatically advances to the
next `WAITING` entry. `POST /queues/{id}/rejoin` transitions the *same row* `SKIPPED → REJOINED → WAITING`
(both transitions logged as separate `QueueEvent` rows), keeps the original `token_number`, and assigns a
new `active_order` at the end of the current line. Every status transition — join, call, start, complete,
skip, cancel, rejoin — is written to `queue_events` with `previous_status`/`new_status`/`performed_by_user_id`,
so the full timeline survives even though the queue position itself is a live, moving number.

**QR flow.** Each queue desk has a unique, opaque `qr_code_key` (`POST /queue-desks` generates it via
`secrets.token_urlsafe`; `GET /queue-desks/{id}/qr` returns the payload plus a base64 PNG, using the pure-Python
`qrcode` package — no patient data is ever encoded in it). The patient app scans it with the camera
(`html5-qrcode`, added as a lightweight dependency — camera permission failures show a friendly fallback
message and point to manual selection instead of crashing), shows the desk's department/room/doctor, and
requires an explicit "Confirm Join Queue" tap before calling `POST /queues/join-by-qr` — scanning alone
never joins a queue. The manual fallback is Select Facility → Department → Room/Doctor → Join Queue.

**Notifications.** `NotificationService` persists a `Notification` row first (so it's visible in-app and
auditable even if delivery fails) on: joined queue, 3 patients ahead, next in line, queue delayed, and
skipped. Delivery goes through a small channel-adapter interface (`NotificationChannelAdapter`) rather than
being hard-coded to one vendor. `InAppNotificationAdapter` is fully implemented (the patient app polling
`GET /queues/me` *is* the delivery). `SmsNotificationAdapter` is an env-gated placeholder — it never sends
a real SMS in this codebase. It requires both `patient.sms_consent = true` and `SMS_PROVIDER` +
`SMS_API_KEY` environment variables to even attempt delivery, and always returns a non-crashing `FAILED`
result with a clear reason otherwise. SMS bodies never contain medical details, e.g.: *"SwasthyaSetu: Your
OPD token is approaching at District Hospital, Cardiology. Please reach the counter soon."*

**Polling.** All queue reads (`/queues/me`, `/doctor/queue/current`, `/facility/queues/overview`) return
small, stable JSON shapes designed for 20–30s client-side polling (see the `POLL_INTERVAL_MS` constants in
the frontend components) — no WebSocket is implemented yet, but the response shapes don't need to change
to add one later.
