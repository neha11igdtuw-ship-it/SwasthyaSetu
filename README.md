# SwasthyaSetu

AI-powered, multilingual and offline-first continuity-of-care platform connecting patients, health workers and doctors in rural and underserved areas.

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

## Architecture and schema source of truth

Live data path: **Frontend (Next.js) → FastAPI (`backend/`) → Postgres**. The Next.js app does not connect to Postgres.

The **authoritative database schema** is the SQLAlchemy models in `backend/app/models/` plus Alembic migrations in `backend/alembic/versions/`. Apply with:

```bash
cd backend
source .venv/bin/activate
alembic upgrade head
python -m seed.seed_data
```

`database/schema.sql`, `database/seed.sql`, and `database/DATABASE_DESIGN.md` are **legacy/reference only**. They do not match the running backend and must not be applied to the live database.

### Demo story (seeded)

| Role | Name | Login |
|---|---|---|
| Patient | Priya Sharma, Rampur Village, pregnancy week 28, high-risk maternal care | `patient@swasthyasetu.dev` / `Patient@123` |
| Health worker | ANM Sunita Devi | `worker@swasthyasetu.dev` / `ChangeMe123!` |
| Doctor | Dr. Meera Singh | `doctor@swasthyasetu.dev` / `ChangeMe123!` |
| Facility | District Civil Hospital & Maternal Care Centre | `admin@swasthyasetu.dev` / `ChangeMe123!` |
