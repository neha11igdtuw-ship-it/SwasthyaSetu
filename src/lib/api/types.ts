// Types mirroring backend/app/schemas/*.py — keep in sync with the FastAPI backend.

export type Role =
  | "ADMIN"
  | "FACILITY_ADMIN"
  | "DOCTOR"
  | "HEALTH_WORKER"
  | "FACILITY_STAFF"
  | "PATIENT";

export interface UserOut {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  phone: string | null;
  facility_id: string | null;
  is_active: boolean;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface PatientOut {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  gender: string | null;
  phone: string | null;
  village: string | null;
  abha_id: string | null;
  facility_id: string | null;
  version: number;
  is_deleted: boolean;
}

export interface PatientCreate {
  full_name: string;
  date_of_birth?: string | null;
  gender?: string | null;
  phone?: string | null;
  village?: string | null;
  abha_id?: string | null;
  facility_id?: string | null;
}

export interface PatientUpdate {
  base_version: number;
  full_name?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  phone?: string | null;
  village?: string | null;
  abha_id?: string | null;
  facility_id?: string | null;
}

export type ReferralStatus =
  | "CREATED"
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "IN_TRANSIT"
  | "COMPLETED"
  | "CANCELLED";

export interface ReferralOut {
  id: string;
  patient_id: string;
  from_facility_id: string | null;
  to_facility_id: string | null;
  reason: string;
  specialty_needed: string | null;
  urgency: string;
  status: ReferralStatus;
  notes: string | null;
  version: number;
  is_deleted: boolean;
}

export interface ReferralCreate {
  patient_id: string;
  from_facility_id?: string | null;
  to_facility_id?: string | null;
  reason: string;
  specialty_needed?: string | null;
  urgency?: string;
  notes?: string | null;
}

export interface ReferralStatusUpdate {
  base_version: number;
  status: ReferralStatus;
  notes?: string | null;
}

export interface MatchCandidate {
  facility_id: string;
  facility_name: string;
  score: number;
  distance_km: number | null;
  reasons: string[];
}

export interface FacilityOut {
  id: string;
  name: string;
  facility_type?: string | null;
  village?: string | null;
  [key: string]: unknown;
}

export interface CareGapOut {
  id: string;
  patient_id: string;
  gap_type: string;
  description: string | null;
  due_date: string | null;
  status: "OPEN" | "CLOSED";
  version: number;
}

// ---- Maternal care (encounters/symptoms/vitals/screenings) ----

export interface EncounterCreate {
  patient_id: string;
  facility_id?: string | null;
  encounter_type?: string;
  encounter_date?: string | null;
  notes?: string | null;
}

export interface EncounterOut {
  id: string;
  patient_id: string;
  facility_id: string | null;
  author_id: string | null;
  encounter_type: string;
  encounter_date: string;
  notes: string | null;
  version: number;
  is_deleted: boolean;
}

export interface SymptomCreate {
  encounter_id: string;
  description: string;
  severity?: string | null;
  onset_date?: string | null;
}

export interface SymptomOut {
  id: string;
  encounter_id: string;
  description: string;
  severity: string | null;
  onset_date: string | null;
  version: number;
  is_deleted: boolean;
}

export interface VitalCreate {
  encounter_id: string;
  systolic_bp?: number | null;
  diastolic_bp?: number | null;
  pulse?: number | null;
  temperature_c?: number | null;
  weight_kg?: number | null;
  spo2?: number | null;
}

export interface VitalOut {
  id: string;
  encounter_id: string;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  pulse: number | null;
  temperature_c: number | null;
  weight_kg: number | null;
  spo2: number | null;
  recorded_at: string;
  version: number;
  is_deleted: boolean;
}

export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export interface ScreeningCreate {
  encounter_id: string;
  screening_type: string;
  result?: string | null;
  risk_level?: RiskLevel;
  notes?: string | null;
  create_referral?: boolean;
  referral_reason?: string | null;
  referral_to_facility_id?: string | null;
  referral_specialty_needed?: string | null;
}

export interface ScreeningOut {
  id: string;
  encounter_id: string;
  screening_type: string;
  result: string | null;
  risk_level: RiskLevel;
  notes: string | null;
  version: number;
  is_deleted: boolean;
  referral_id?: string | null;
}

// ---- Diagnostics ----

export type DiagnosticOrderStatus = "ORDERED" | "COLLECTED" | "COMPLETED" | "CANCELLED";

export interface DiagnosticOrderOut {
  id: string;
  patient_id: string;
  facility_id: string | null;
  encounter_id: string | null;
  screening_id: string | null;
  referral_id: string | null;
  test_type: string;
  status: DiagnosticOrderStatus;
  version: number;
  is_deleted: boolean;
}

export interface DiagnosticReportOut {
  id: string;
  diagnostic_order_id: string;
  result_summary: string | null;
  result_data: string | null;
  reported_at: string;
  version: number;
  is_deleted: boolean;
}

// ---- Prescriptions ----

export type PrescriptionStatus = "ACTIVE" | "DISPENSED" | "CANCELLED";

export interface PrescriptionOut {
  id: string;
  patient_id: string;
  facility_id: string | null;
  encounter_id: string | null;
  inventory_item_id: string;
  quantity: number;
  dosage_instructions: string | null;
  status: PrescriptionStatus;
  version: number;
  is_deleted: boolean;
}

// ---- Maternal: pregnancies ----

export interface PregnancyOut {
  id: string;
  patient_id: string;
  expected_delivery_date: string | null;
  gravida: number | null;
  para: number | null;
  risk_level: RiskLevel;
  risk_flags: string | null;
  status: "ACTIVE" | "COMPLETED" | "TERMINATED";
  notes: string | null;
  version: number;
  is_deleted: boolean;
}

// ---- Inventory ----

export interface InventoryItemOut {
  id: string;
  facility_id: string;
  name: string;
  sku: string | null;
  unit: string | null;
  quantity: number;
  reorder_level: number;
  version: number;
}

// ---- Doctor availability ----

export interface DoctorAvailabilityOut {
  id: string;
  doctor_id: string;
  facility_id: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
  version: number;
  is_deleted: boolean;
}

// ---- Offline sync ----

export type SyncEntityType = "PATIENT" | "REFERRAL" | "CARE_GAP";
export type SyncOperation = "CREATE" | "UPDATE" | "DELETE";

export interface SyncChange {
  client_change_id: string;
  entity_type: SyncEntityType;
  operation: SyncOperation;
  entity_id?: string | null;
  base_version?: number | null;
  payload: Record<string, unknown>;
}

export interface SyncPushRequest {
  device_id: string;
  changes: SyncChange[];
}

export interface SyncChangeResult {
  client_change_id: string;
  status: "APPLIED" | "ALREADY_APPLIED" | "CONFLICT" | "ERROR";
  entity_id: string | null;
  version: number | null;
  server_state: Record<string, unknown> | null;
  error: string | null;
}

export interface SyncPushResponse {
  results: SyncChangeResult[];
}

export interface SyncPullResponse {
  server_time: string;
  patients: Record<string, unknown>[];
  referrals: Record<string, unknown>[];
  care_gaps: Record<string, unknown>[];
}

// ---- Symptom summary (Gemini-backed AI pipeline) ----
// Matches backend/app/schemas/symptom_summary.py.

export interface SymptomSummarizeRequest {
  transcript: string;
  selected_symptoms: string[];
  manual_symptoms: string[];
  language: string;
  duration?: string | null;
  severity?: string | null;
}

export interface AISymptomSummary {
  reportedSymptoms: string[];
  duration: string;
  severity: string;
  additionalContext: string;
  possibleWarningSigns: string[];
  summary: string;
  language: string;
}

export interface SymptomSummarizeResponse {
  accepted: boolean;
  transcript: string;
  ai_summary: AISymptomSummary | null;
  ai_summary_error: string | null;
}

// Matches app/core/errors.py's JSON envelope: { "error": { code, message, details } }
export interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
  detail?: unknown;
}
