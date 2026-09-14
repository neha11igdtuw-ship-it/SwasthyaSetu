# Software Requirements Specification — SwasthyaSetu

## 1. Problem Statement

Rural and underserved communities face long travel distances, specialist shortages, irregular diagnostics, fragmented medical records, delayed referrals, and limited awareness of available services. Patients move between sub-centres, PHCs, rural hospitals, and district hospitals without continuity of information. Connectivity, language, health literacy, and affordability further limit access. The system must improve timely access, continuity, quality, and accountability while strengthening — not replacing — the public health system.

## 2. Solution Overview

An integrated care-access and quality-support platform combining: assisted teleconsultation, appointment/queue management, digital triage, longitudinal patient records, referral tracking, diagnostic coordination, medicine availability, high-risk patient follow-up, and facility dashboards — supporting frontline health workers, low-connectivity environments, multilingual interaction, emergency escalation, and interoperable records.

## 3. Current Implementation Status (as audited)

| Capability from problem statement | Status | Evidence |
|---|---|---|
| Longitudinal patient records | ✅ Live | `patients.py`, `encounters.py` backend routes; `patient/records`, `patient/dashboard` pages |
| Appointment management | ✅ Live | `appointments.py`; `patient/appointments` |
| Referral tracking | ✅ Live | `referrals.py`; `patient/referrals` |
| Diagnostic coordination | ✅ Live | `diagnostics.py`; `patient/diagnostics` |
| Medicine availability | ✅ Live | `inventory.py`, `prescriptions.py`; `patient/medicines` |
| Digital triage / symptom assistance | ✅ Live | `symptoms.py` → Gemini API; voice assistant flow |
| Facility discovery near patient | ✅ Live | `osmFacilities.ts` (OpenStreetMap Overpass), with disclosed fallback |
| Offline document access | ✅ Live | `lib/offline/db.ts` (IndexedDB) |
| Emergency escalation | ⚠️ Mock only | `patient/emergency-help` uses `priyaPatientMock`, no backend wiring |
| High-risk follow-up | ⚠️ Mock only | `patient/follow-ups` uses `priyaPatientMock.followUps` |
| Health worker / doctor / facility dashboards | ⚠️ Mock only | `src/app/hw/*`, `doctor/patients`, `facility/patients` — no backend calls |
| Multilingual interaction | ✅ Live | `lib/i18n/*` |

**Gap:** emergency escalation, follow-up tracking, and all non-patient (health worker/doctor/facility) dashboards are UI-complete but not wired to the database — they will mislead demo users into thinking real data is shown.

## 4. Data Architecture Findings & Optimization

- **Active store:** PostgreSQL via SQLAlchemy + Alembic (`backend/app/db/session.py`, `backend/alembic/versions/`). This is the system of record and should remain the only backend data store.
- **Removed (dead, no longer tracked):**
  - `dev.db`, `database/dev.db` — empty, unreferenced SQLite files.
  - `database/schema.sql`, `database/seed.sql` — legacy schema defining tables (`health_workers`, `doctors`, `patient_vitals`, etc.) that don't match the live Alembic-managed models; superseded and never executed by any code path.
- **Dead config to remove next:** `TEST_DATABASE_URL` in `backend/.env.example` — never read; tests use a hardcoded in-memory SQLite DSN instead.
- **Dead routes to remove or wire up:**
  - `GET /facilities/nearby/osm` (`backend/app/api/routes/facilities.py`) — duplicate of frontend's direct Overpass call; unused.
  - `backend/app/api/routes/health_worker_profiles.py` — registered but no frontend caller.
- **Silent-fallback risk to fix:** `src/lib/api/ownPatient.ts` swallows any `/patients/me` error and silently shows a different patient's record (`list()[0]`) — should surface the error instead of guessing.

## 5. Recommended Next Steps

1. Wire `patient/emergency-help`, `patient/follow-ups`, and HW/doctor/facility dashboards to real backend endpoints (or explicitly label them "Preview / Sample Data" until wired).
2. Remove the two dead backend routes, or connect them to a real caller.
3. Remove unused `TEST_DATABASE_URL` env var.
4. Fix the silent patient-fallback in `ownPatient.ts` to surface errors rather than substitute another patient's data.
