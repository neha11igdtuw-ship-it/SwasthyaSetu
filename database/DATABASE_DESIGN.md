# SwasthyaSetu Database Design

> **Legacy / reference only.** This document describes an earlier design sketch.
> The live database schema is defined by SQLAlchemy models in `backend/app/models/`
> and Alembic migrations in `backend/alembic/versions/`. Do not apply
> `database/schema.sql` or `database/seed.sql` against the running Postgres
> instance. Use `alembic upgrade head` and `python -m seed.seed_data` from `backend/`.

## Database
PostgreSQL 18

## Purpose
Store persistent healthcare data used by patients, health workers,
doctors, and healthcare facilities.

---

## 1. patients

Stores patient-specific information.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PRIMARY KEY |
| display_id | VARCHAR(30) | UNIQUE, NOT NULL |
| name | VARCHAR(150) | NOT NULL |
| age | INTEGER | |
| location | VARCHAR(255) | |
| pregnancy_week | INTEGER | |
| edd | DATE | |
| care_pathway | VARCHAR(50) | |
| preferred_language | VARCHAR(50) | |
| phone | VARCHAR(20) | |
| risk_level | VARCHAR(30) | |
| created_at | TIMESTAMP | NOT NULL |

---

## 2. health_workers

Stores health worker information.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PRIMARY KEY |
| name | VARCHAR(150) | NOT NULL |
| worker_type | VARCHAR(50) | |
| phone | VARCHAR(20) | |
| facility_id | UUID | FOREIGN KEY |
| created_at | TIMESTAMP | NOT NULL |

---

## 3. doctors

Stores doctor information.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PRIMARY KEY |
| name | VARCHAR(150) | NOT NULL |
| specialty | VARCHAR(150) | |
| phone | VARCHAR(20) | |
| facility_id | UUID | FOREIGN KEY |
| created_at | TIMESTAMP | NOT NULL |

---

## 4. facilities

Stores healthcare facilities.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PRIMARY KEY |
| name | VARCHAR(200) | NOT NULL |
| type | VARCHAR(80) | NOT NULL |
| district | VARCHAR(150) | |
| distance_km | DECIMAL(6,2) | |
| status | VARCHAR(30) | |
| created_at | TIMESTAMP | NOT NULL |

---

## 5. patient_vitals

Stores historical patient vital measurements.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PRIMARY KEY |
| patient_id | UUID | FOREIGN KEY, NOT NULL |
| blood_pressure_systolic | INTEGER | |
| blood_pressure_diastolic | INTEGER | |
| hemoglobin | DECIMAL(4,1) | |
| weight_kg | DECIMAL(5,2) | |
| pulse_bpm | INTEGER | |
| recorded_at | TIMESTAMP | NOT NULL |

One patient can have many vital records.

---

## 6. patient_symptoms

Stores symptoms reported by patients.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PRIMARY KEY |
| patient_id | UUID | FOREIGN KEY, NOT NULL |
| symptom | VARCHAR(255) | NOT NULL |
| severity | VARCHAR(30) | |
| reported_at | TIMESTAMP | NOT NULL |

---

## 7. patient_documents

Stores metadata/references for patient documents.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PRIMARY KEY |
| patient_id | UUID | FOREIGN KEY, NOT NULL |
| file_name | VARCHAR(255) | NOT NULL |
| file_type | VARCHAR(100) | |
| file_reference | TEXT | |
| uploaded_at | TIMESTAMP | NOT NULL |

---

## 8. patient_visits

Stores patient healthcare visits.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PRIMARY KEY |
| patient_id | UUID | FOREIGN KEY, NOT NULL |
| facility_id | UUID | FOREIGN KEY |
| doctor_id | UUID | FOREIGN KEY |
| visit_type | VARCHAR(100) | |
| visit_date | TIMESTAMP | NOT NULL |
| summary | TEXT | |
| created_at | TIMESTAMP | NOT NULL |

---

## 9. referrals

Stores referrals from health workers to facilities.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PRIMARY KEY |
| referral_code | VARCHAR(40) | UNIQUE, NOT NULL |
| patient_id | UUID | FOREIGN KEY, NOT NULL |
| referring_worker_id | UUID | FOREIGN KEY |
| facility_id | UUID | FOREIGN KEY, NOT NULL |
| reason | TEXT | NOT NULL |
| priority | VARCHAR(20) | NOT NULL |
| expected_visit_date | TIMESTAMP | |
| status | VARCHAR(40) | NOT NULL |
| current_step | VARCHAR(50) | |
| created_at | TIMESTAMP | NOT NULL |

---

## 10. referral_steps

Stores the progress of a referral.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PRIMARY KEY |
| referral_id | UUID | FOREIGN KEY, NOT NULL |
| step_name | VARCHAR(50) | NOT NULL |
| status | VARCHAR(20) | NOT NULL |
| completed_at | TIMESTAMP | |

### Referral workflow

- Created
- Accepted
- Patient Visit
- Test Completed
- Treatment Started
- Follow-up Due
- Closed

---

## 11. follow_ups

Stores patient follow-up activities.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PRIMARY KEY |
| patient_id | UUID | FOREIGN KEY, NOT NULL |
| referral_id | UUID | FOREIGN KEY |
| title | VARCHAR(255) | NOT NULL |
| type | VARCHAR(50) | NOT NULL |
| due_date | TIMESTAMP | NOT NULL |
| status | VARCHAR(30) | NOT NULL |
| instructions | TEXT | |
| completed_at | TIMESTAMP | |

---

## 12. appointments

Stores patient appointments.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PRIMARY KEY |
| patient_id | UUID | FOREIGN KEY, NOT NULL |
| doctor_id | UUID | FOREIGN KEY |
| facility_id | UUID | FOREIGN KEY, NOT NULL |
| appointment_date | TIMESTAMP | NOT NULL |
| status | VARCHAR(30) | NOT NULL |
| created_at | TIMESTAMP | NOT NULL |

---

## 13. diagnostics

Stores diagnostic tests and their results.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PRIMARY KEY |
| patient_id | UUID | FOREIGN KEY, NOT NULL |
| facility_id | UUID | FOREIGN KEY |
| test_name | VARCHAR(255) | NOT NULL |
| status | VARCHAR(40) | NOT NULL |
| scheduled_date | TIMESTAMP | |
| report_summary | TEXT | |
| created_at | TIMESTAMP | NOT NULL |

---

## 14. medicines

Stores medicines.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PRIMARY KEY |
| name | VARCHAR(255) | UNIQUE, NOT NULL |
| created_at | TIMESTAMP | NOT NULL |

---

## 15. patient_medicines

Stores medicines associated with patients.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PRIMARY KEY |
| patient_id | UUID | FOREIGN KEY, NOT NULL |
| medicine_id | UUID | FOREIGN KEY, NOT NULL |
| dosage | VARCHAR(255) | |
| timing | VARCHAR(255) | |
| received | BOOLEAN | NOT NULL |
| created_at | TIMESTAMP | NOT NULL |

---

## 16. facility_services

Stores services available at facilities.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PRIMARY KEY |
| facility_id | UUID | FOREIGN KEY, NOT NULL |
| service_name | VARCHAR(255) | NOT NULL |
| status | VARCHAR(30) | NOT NULL |
| on_duty_staff | TEXT | |

---

## 17. facility_inventory

Stores medicine/resource availability at facilities.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PRIMARY KEY |
| facility_id | UUID | FOREIGN KEY, NOT NULL |
| medicine_id | UUID | FOREIGN KEY |
| item_name | VARCHAR(255) | |
| quantity | INTEGER | |
| availability | VARCHAR(30) | |
| updated_at | TIMESTAMP | NOT NULL |

---

# Relationships

facilities
├── health_workers
├── doctors
├── facility_services
└── facility_inventory

patients
├── patient_vitals
├── patient_symptoms
├── patient_documents
├── patient_visits
├── referrals
├── follow_ups
├── appointments
├── diagnostics
└── patient_medicines

referrals
└── referral_steps

medicines
├── patient_medicines
└── facility_inventory

---

# Dashboard Data

Dashboard counts should be calculated from the database rather than
stored as duplicate values.

Examples:

- Total patients
- High-risk patients
- Pending referrals
- Follow-ups due
- Missed follow-ups
- Incoming referrals
- Accepted referrals

---

# Notes

The existing frontend currently uses mock/static data.

The database should support the existing application features without
inventing additional functionality.

Database implementation will use PostgreSQL 18.