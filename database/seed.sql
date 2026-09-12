-- ============================================================
-- SwasthyaSetu Seed Data
-- PostgreSQL 18
-- ============================================================
--
-- This file contains initial/sample data derived from the
-- existing frontend mock data.
--
-- Do not run this file until the seed data has been reviewed.
-- ============================================================
-- ============================================================
-- 1. FACILITIES
-- ============================================================

INSERT INTO facilities (
    id,
    name,
    type,
    district,
    distance_km,
    status
) VALUES
(
    '00000000-0000-0000-0000-000000000001',
    'District Civil Hospital & Maternal Care Centre',
    'District Hospital',
    'Kalyanpur District',
    8.50,
    'Available'
),
(
    '00000000-0000-0000-0000-000000000002',
    'Community Health Centre (CHC) Kalyanpur',
    'Community Health Centre',
    'Kalyanpur District',
    4.20,
    'Available'
),
(
    '00000000-0000-0000-0000-000000000003',
    'Sub-Centre Rampur',
    'Sub-Centre',
    'Kalyanpur District',
    0.80,
    'Available'
);


-- ============================================================
-- 2. PATIENTS
-- ============================================================

INSERT INTO patients (
    id,
    display_id,
    name,
    age,
    location,
    pregnancy_week,
    edd,
    care_pathway,
    preferred_language,
    phone,
    risk_level
) VALUES
(
    '10000000-0000-0000-0000-000000000001',
    'P-7821',
    'Priya Sharma',
    24,
    'Rampur Village, Sub-Centre Rampur',
    28,
    '2026-11-28',
    'Maternal Care',
    'Hindi (हिंदी)',
    '+91 12345 67890',
    'High Risk'
),
(
    '10000000-0000-0000-0000-000000000002',
    'P-9012',
    'Pooja Sharma',
    22,
    'Kalyanpur',
    32,
    '2026-11-02',
    'Maternal Care',
    'Bhojpuri',
    '+91 11111 11111',
    'High Risk'
),
(
    '10000000-0000-0000-0000-000000000003',
    'P-3341',
    'Sunita Verma',
    29,
    'Rampur',
    16,
    '2027-02-14',
    'Maternal Care',
    'Hindi',
    '+91 22222 22222',
    'Watch'
),
(
    '10000000-0000-0000-0000-000000000004',
    'P-5521',
    'Asha Devi',
    31,
    'Sundarpur',
    36,
    '2026-10-05',
    'Maternal Care',
    'Maithili',
    '+91 33333 44444',
    'Normal'
),
(
    '10000000-0000-0000-0000-000000000005',
    'P-4410',
    'Ramesh Chandra',
    58,
    'Rampur',
    NULL,
    NULL,
    'Hypertension',
    'Hindi',
    '+91 12345 12345',
    'High Risk'
);


-- ============================================================
-- 3. HEALTH WORKERS
-- ============================================================

INSERT INTO health_workers (
    id,
    name,
    worker_type,
    phone,
    facility_id
) VALUES
(
    '20000000-0000-0000-0000-000000000001',
    'Meena Devi',
    'ASHA',
    '+91 98765 43210',
    '00000000-0000-0000-0000-000000000003'
),
(
    '20000000-0000-0000-0000-000000000002',
    'Sunita Devi',
    'ANM',
    NULL,
    '00000000-0000-0000-0000-000000000003'
);


-- ============================================================
-- 4. DOCTORS
-- ============================================================

INSERT INTO doctors (
    id,
    name,
    specialty,
    phone,
    facility_id
) VALUES
(
    '30000000-0000-0000-0000-000000000001',
    'Dr. Ananya Rao',
    'Gynecology & High-Risk ANC',
    NULL,
    '00000000-0000-0000-0000-000000000001'
);


-- ============================================================
-- 5. MEDICINES
-- ============================================================

INSERT INTO medicines (
    id,
    name
) VALUES
(
    '40000000-0000-0000-0000-000000000001',
    'Iron & Folic Acid (IFA) Tablets'
),
(
    '40000000-0000-0000-0000-000000000002',
    'Calcium & Vitamin D3 Tablets'
),
(
    '40000000-0000-0000-0000-000000000003',
    'Labetalol 100mg (Antihypertensive)'
);


-- ============================================================
-- 6. PATIENT SYMPTOMS
-- ============================================================

INSERT INTO patient_symptoms (
    patient_id,
    symptom,
    severity
) VALUES
(
    '10000000-0000-0000-0000-000000000001',
    'Headache',
    'Not specified'
),
(
    '10000000-0000-0000-0000-000000000001',
    'Blurred Vision',
    'Not specified'
);


-- ============================================================
-- 7. PATIENT VITALS
-- ============================================================

INSERT INTO patient_vitals (
    patient_id,
    blood_pressure_systolic,
    blood_pressure_diastolic,
    hemoglobin,
    weight_kg,
    pulse_bpm,
    recorded_at
) VALUES
(
    '10000000-0000-0000-0000-000000000001',
    145,
    92,
    9.2,
    58.00,
    82,
    '2026-09-05 10:00:00'
);




-- ============================================================
-- 8. PATIENT DOCUMENTS
-- ============================================================

INSERT INTO patient_documents (
    patient_id,
    file_name,
    file_type,
    file_reference
) VALUES
(
    '10000000-0000-0000-0000-000000000001',
    'Mother_Protection_Card.pdf',
    'application/pdf',
    'Mother_Protection_Card.pdf'
),
(
    '10000000-0000-0000-0000-000000000001',
    'Lab_Report_Sep4.jpg',
    'image/jpeg',
    'Lab_Report_Sep4.jpg'
);



-- ============================================================
-- 9. PATIENT VISITS / TIMELINE
-- ============================================================

INSERT INTO patient_visits (
    patient_id,
    facility_id,
    doctor_id,
    visit_type,
    visit_date,
    summary
) VALUES
(
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000003',
    NULL,
    'ASHA Home Visit',
    '2026-09-05 10:00:00',
    'High BP recorded (145/92 mmHg). Hemoglobin 9.2 g/dL. Patient advised rest and referred for hospital checkup. Provider: Meena Devi (ASHA).'
),
(
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000003',
    NULL,
    'Sub-Centre ANC Visit 2',
    '2026-08-20 10:00:00',
    'ANC Checkup 2 completed. Tetanus Toxoid (TT-2) dose administered. BP 132/84 mmHg. Hemoglobin 9.5 g/dL. Provider: ANM Sunita Devi.'
),
(
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000003',
    NULL,
    'First ANC Registration',
    '2026-07-10 10:00:00',
    'Pregnancy registered. MCP card issued and basic vitals logged. BP 120/80 mmHg. Hemoglobin 10.1 g/dL. Provider: Sub-Centre Rampur.'
);


-- ============================================================
-- 10. REFERRALS
-- ============================================================

INSERT INTO referrals (
    id,
    referral_code,
    patient_id,
    referring_worker_id,
    facility_id,
    reason,
    priority,
    expected_visit_date,
    status,
    current_step
) VALUES
(
    '50000000-0000-0000-0000-000000000001',
    'REF-2026-0891',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Pre-eclampsia screening & Anemia Management',
    'High',
    '2026-09-07 10:30:00',
    'Accepted',
    'Accepted'
),
(
    '50000000-0000-0000-0000-000000000002',
    'REF-2026-0895',
    '10000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Severe Pre-eclampsia & High BP',
    'High',
    '2026-09-06 10:30:00',
    'Pending Acceptance',
    'Created'
),
(
    '50000000-0000-0000-0000-000000000003',
    'REF-2026-0880',
    '10000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    'Routine Second Trimester Ultrasound',
    'Routine',
    '2026-09-10 10:00:00',
    'Accepted',
    'Accepted'
);


-- ============================================================
-- 11. REFERRAL STEPS
-- ============================================================

INSERT INTO referral_steps (
    referral_id,
    step_name,
    status,
    completed_at
) VALUES
(
    '50000000-0000-0000-0000-000000000001',
    'Created',
    'Completed',
    '2026-09-05 09:00:00'
),
(
    '50000000-0000-0000-0000-000000000001',
    'Accepted',
    'Completed',
    '2026-09-05 14:00:00'
),
(
    '50000000-0000-0000-0000-000000000002',
    'Created',
    'Completed',
    '2026-09-06 09:00:00'
),
(
    '50000000-0000-0000-0000-000000000003',
    'Created',
    'Completed',
    '2026-08-28 10:00:00'
),
(
    '50000000-0000-0000-0000-000000000003',
    'Accepted',
    'Completed',
    '2026-08-29 10:00:00'
);

-- ============================================================
-- 12. FOLLOW UPS
-- ============================================================

INSERT INTO follow_ups (
    patient_id,
    referral_id,
    title,
    type,
    due_date,
    status,
    instructions
) VALUES
(
    '10000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001',
    'Iron Sucrose Injection Dose 2',
    'Doctor Visit',
    '2026-09-07 10:00:00',
    'Due',
    'Visit District Hospital OPD Room 4 with ANC Card.'
),
(
    '10000000-0000-0000-0000-000000000001',
    NULL,
    'ASHA Home BP Check',
    'ASHA Visit',
    '2026-09-08 10:00:00',
    'Due',
    'ASHA Meena Devi will visit home for morning BP check.'
),
(
    '10000000-0000-0000-0000-000000000001',
    NULL,
    'Repeat Hemoglobin Test',
    'Diagnostic',
    '2026-09-12 10:00:00',
    'Due',
    'Give blood sample at Primary Health Centre.'
),
(
    '10000000-0000-0000-0000-000000000005',
    NULL,
    'ASHA Home Visit',
    'ASHA Home Visit',
    '2026-09-02 10:00:00',
    'Missed',
    'Home visit for high BP monitoring and refill check. Patient was out of village visiting relatives.'
),
(
    '10000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000002',
    'Hospital Visit',
    'Hospital Visit',
    '2026-09-06 14:00:00',
    'Due Today',
    'Confirm arrival at District Hospital OPD.'
);



-- ============================================================
-- 13. APPOINTMENTS
-- ============================================================

INSERT INTO appointments (
    patient_id,
    doctor_id,
    facility_id,
    appointment_date,
    status
) VALUES
(
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '2026-09-07 10:30:00',
    'Confirmed'
);


-- ============================================================
-- 14. DIAGNOSTICS
-- ============================================================

INSERT INTO diagnostics (
    patient_id,
    facility_id,
    test_name,
    status,
    scheduled_date,
    report_summary
) VALUES
(
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Complete Blood Count & Serum Ferritin',
    'Report Available',
    '2026-09-04 10:00:00',
    'Hemoglobin 9.2 g/dL (Moderate Anemia). Iron studies recommended.'
),
(
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Obstetric Ultrasound (Growth Scan)',
    'Booked',
    '2026-09-07 11:30:00',
    'Pending ultrasound appointment at District Hospital.'
),
(
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000003',
    'Urine Albumin & Protein Test',
    'Recommended',
    '2026-09-08 10:00:00',
    'Recommended during next ASHA home visit.'
);



-- ============================================================
-- 15. PATIENT MEDICINES
-- ============================================================

INSERT INTO patient_medicines (
    patient_id,
    medicine_id,
    dosage,
    timing,
    received
) VALUES
(
    '10000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    '1 tablet daily after food',
    'Morning after breakfast',
    TRUE
),
(
    '10000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000002',
    '1 tablet daily',
    'Night after dinner',
    TRUE
),
(
    '10000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000003',
    '1 tablet twice daily if BP > 140/90',
    'Morning and Evening',
    FALSE
);



-- ============================================================
-- 16. FACILITY SERVICES
-- ============================================================

INSERT INTO facility_services (
    facility_id,
    service_name,
    status,
    on_duty_staff
) VALUES
(
    '00000000-0000-0000-0000-000000000001',
    '24/7 Maternity Emergency & Labor Room',
    'Available',
    '2 Obstetricians, 4 Midwives'
),
(
    '00000000-0000-0000-0000-000000000001',
    'Blood Bank (O-Negative & B-Positive)',
    'In Stock',
    'Lab Tech On Duty'
),
(
    '00000000-0000-0000-0000-000000000001',
    'Ultrasound & Growth Scan Facility',
    'Available',
    'Radiologist On Duty till 4 PM'
),
(
    '00000000-0000-0000-0000-000000000002',
    'Medical Officer',
    'Available',
    'Medical Officer on Duty'
),
(
    '00000000-0000-0000-0000-000000000002',
    'Labor Room',
    'Available',
    'Medical Officer on Duty'
),
(
    '00000000-0000-0000-0000-000000000002',
    'Basic Diagnostics',
    'Available',
    'Medical Officer on Duty'
),
(
    '00000000-0000-0000-0000-000000000003',
    'ANM Checkup',
    'Available',
    'ANM Sunita Devi'
),
(
    '00000000-0000-0000-0000-000000000003',
    'IFA Meds',
    'Available',
    'ANM Sunita Devi'
),
(
    '00000000-0000-0000-0000-000000000003',
    'BP Monitoring',
    'Available',
    'ANM Sunita Devi'
);


-- ============================================================
-- 17. FACILITY INVENTORY
-- ============================================================

INSERT INTO facility_inventory (
    facility_id,
    item_name,
    quantity,
    availability
)
VALUES
(
    '00000000-0000-0000-0000-000000000001',
    'Blood Bank Units',
    24,
    'In Stock'
),
(
    '00000000-0000-0000-0000-000000000001',
    'Maternal ICU Beds',
    4,
    'Available'
),
(
    '00000000-0000-0000-0000-000000000001',
    'Oxytocin',
    NULL,
    'Adequate'
),
(
    '00000000-0000-0000-0000-000000000001',
    'Essential Medicines',
    NULL,
    'In Stock'
);