-- ============================================================
-- SwasthyaSetu Database Schema
-- PostgreSQL 18
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- 1. FACILITIES
-- ============================================================

CREATE TABLE facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    type VARCHAR(80) NOT NULL,
    district VARCHAR(150),
    distance_km DECIMAL(6,2),
    status VARCHAR(30),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 2. PATIENTS
-- ============================================================

CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_id VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    age INTEGER,
    location VARCHAR(255),
    pregnancy_week INTEGER,
    edd DATE,
    care_pathway VARCHAR(50),
    preferred_language VARCHAR(50),
    phone VARCHAR(20),
    risk_level VARCHAR(30),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 3. HEALTH WORKERS
-- ============================================================

CREATE TABLE health_workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    worker_type VARCHAR(50),
    phone VARCHAR(20),
    facility_id UUID REFERENCES facilities(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 4. DOCTORS
-- ============================================================

CREATE TABLE doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    specialty VARCHAR(150),
    phone VARCHAR(20),
    facility_id UUID REFERENCES facilities(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 5. PATIENT VITALS
-- ============================================================

CREATE TABLE patient_vitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    blood_pressure_systolic INTEGER,
    blood_pressure_diastolic INTEGER,
    hemoglobin DECIMAL(4,1),
    weight_kg DECIMAL(5,2),
    pulse_bpm INTEGER,
    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 6. PATIENT SYMPTOMS
-- ============================================================

CREATE TABLE patient_symptoms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    symptom VARCHAR(255) NOT NULL,
    severity VARCHAR(30),
    reported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 7. PATIENT DOCUMENTS
-- ============================================================

CREATE TABLE patient_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    file_reference TEXT,
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 8. PATIENT VISITS
-- ============================================================

CREATE TABLE patient_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    facility_id UUID REFERENCES facilities(id),
    doctor_id UUID REFERENCES doctors(id),
    visit_type VARCHAR(100),
    visit_date TIMESTAMP NOT NULL,
    summary TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 9. REFERRALS
-- ============================================================

CREATE TABLE referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_code VARCHAR(40) UNIQUE NOT NULL,
    patient_id UUID NOT NULL REFERENCES patients(id),
    referring_worker_id UUID REFERENCES health_workers(id),
    facility_id UUID NOT NULL REFERENCES facilities(id),
    reason TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL,
    expected_visit_date TIMESTAMP,
    status VARCHAR(40) NOT NULL,
    current_step VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 10. REFERRAL STEPS
-- ============================================================

CREATE TABLE referral_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    step_name VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    completed_at TIMESTAMP
);


-- ============================================================
-- 11. FOLLOW UPS
-- ============================================================

CREATE TABLE follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    referral_id UUID REFERENCES referrals(id),
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    due_date TIMESTAMP NOT NULL,
    status VARCHAR(30) NOT NULL,
    instructions TEXT,
    completed_at TIMESTAMP
);


-- ============================================================
-- 12. APPOINTMENTS
-- ============================================================

CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    doctor_id UUID REFERENCES doctors(id),
    facility_id UUID NOT NULL REFERENCES facilities(id),
    appointment_date TIMESTAMP NOT NULL,
    status VARCHAR(30) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 13. DIAGNOSTICS
-- ============================================================

CREATE TABLE diagnostics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    facility_id UUID REFERENCES facilities(id),
    test_name VARCHAR(255) NOT NULL,
    status VARCHAR(40) NOT NULL,
    scheduled_date TIMESTAMP,
    report_summary TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 14. MEDICINES
-- ============================================================

CREATE TABLE medicines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 15. PATIENT MEDICINES
-- ============================================================

CREATE TABLE patient_medicines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    medicine_id UUID NOT NULL REFERENCES medicines(id),
    dosage VARCHAR(255),
    timing VARCHAR(255),
    received BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 16. FACILITY SERVICES
-- ============================================================

CREATE TABLE facility_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    service_name VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL,
    on_duty_staff TEXT
);


-- ============================================================
-- 17. FACILITY INVENTORY
-- ============================================================

CREATE TABLE facility_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    medicine_id UUID REFERENCES medicines(id),
    item_name VARCHAR(255),
    quantity INTEGER,
    availability VARCHAR(30),
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_patient_vitals_patient_id
    ON patient_vitals(patient_id);

CREATE INDEX idx_patient_symptoms_patient_id
    ON patient_symptoms(patient_id);

CREATE INDEX idx_patient_documents_patient_id
    ON patient_documents(patient_id);

CREATE INDEX idx_patient_visits_patient_id
    ON patient_visits(patient_id);

CREATE INDEX idx_referrals_patient_id
    ON referrals(patient_id);

CREATE INDEX idx_referrals_status
    ON referrals(status);

CREATE INDEX idx_follow_ups_patient_id
    ON follow_ups(patient_id);

CREATE INDEX idx_follow_ups_due_date
    ON follow_ups(due_date);

CREATE INDEX idx_appointments_patient_id
    ON appointments(patient_id);

CREATE INDEX idx_appointments_date
    ON appointments(appointment_date);

CREATE INDEX idx_diagnostics_patient_id
    ON diagnostics(patient_id);

CREATE INDEX idx_patient_medicines_patient_id
    ON patient_medicines(patient_id);

CREATE INDEX idx_facility_inventory_facility_id
    ON facility_inventory(facility_id);