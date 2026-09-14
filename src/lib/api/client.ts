// Thin REST client for the FastAPI backend (backend/app/main.py).
// Handles base URL, auth token storage/refresh, and typed request helpers.

import type {
  CareGapOut,
  CarePathwayClassifyRequest,
  CarePathwayClassification,
  DiagnosticOrderOut,
  DiagnosticReportOut,
  DoctorAvailabilityOut,
  EncounterCreate,
  EncounterOut,
  FacilityOut,
  InventoryItemOut,
  MatchCandidate,
  PatientCreate,
  PatientOut,
  PatientUpdate,
  PregnancyOut,
  PrescriptionOut,
  ReferralCreate,
  CareRequestCreate,
  ReferralOut,
  ReferralStatusUpdate,
  ScreeningCreate,
  ScreeningOut,
  SymptomCreate,
  SymptomOut,
  SymptomSummarizeRequest,
  SymptomSummarizeResponse,
  SyncPullResponse,
  SyncPushRequest,
  SyncPushResponse,
  TokenPair,
  UserLogin,
  UserOut,
  UserRegister,
  VitalCreate,
  VitalOut,
  AppointmentCreate,
  AppointmentOut,
  AppointmentStatusUpdate,
  NearbyInventoryOut,
  DiagnosticOrderCreate,
  DiagnosticReportCreate,
  SelfVitalCreate,
  SelfSymptomCreate,
} from "./types";

const API_ROOT =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

export const API_BASE_URL = `${API_ROOT}/api/v1`;

const ACCESS_TOKEN_KEY = "ss_access_token";
const REFRESH_TOKEN_KEY = "ss_refresh_token";

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function isBrowser() {
  return typeof window !== "undefined";
}

export function getAccessToken(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export const AUTH_CHANGED_EVENT = "ss-auth-changed";

function notifyAuthChanged() {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function setTokens(tokens: TokenPair) {
  if (!isBrowser()) return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  notifyAuthChanged();
}

export function clearTokens() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  notifyAuthChanged();
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

/** Decode the (unverified) payload of a JWT — client-side only, used for
 * routing decisions right after login. The server remains the source of
 * truth for actual authorization. */
export function decodeJwtPayload<T = Record<string, unknown>>(token: string): T | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export function getCurrentUserRole(): string | null {
  const token = getAccessToken();
  if (!token) return null;
  return decodeJwtPayload<{ role?: string }>(token)?.role ?? null;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean; // default true
  retry?: boolean; // internal: prevents infinite refresh loops
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as TokenPair;
    setTokens(data);
    return true;
  } catch {
    return false;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, retry = true } = options;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new ApiError(0, `Network error reaching API at ${API_BASE_URL}${path}: ${String(err)}`);
  }

  if (res.status === 401 && auth && retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request<T>(path, { ...options, retry: false });
    }
  }

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    let code: string | undefined;
    let details: unknown;
    try {
      const errBody = await res.json();
      if (errBody?.error) {
        message = errBody.error.message || message;
        code = errBody.error.code;
        details = errBody.error.details;
      } else if (errBody?.detail) {
        message =
          typeof errBody.detail === "string" ? errBody.detail : JSON.stringify(errBody.detail);
      }
    } catch {
      // ignore body parse errors
    }
    throw new ApiError(res.status, message, code, details);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

// ---- Auth ----

export const authApi = {
  login: async (data: UserLogin): Promise<TokenPair> => {
    const tokens = await request<TokenPair>("/auth/login", { method: "POST", body: data, auth: false });
    setTokens(tokens);
    return tokens;
  },
  register: (data: UserRegister) =>
    request<UserOut>("/auth/register", { method: "POST", body: data, auth: false }),
  me: () => request<UserOut>("/auth/me"),
  logout: () => clearTokens(),
};

// ---- Patients ----

export const patientsApi = {
  list: (facilityId?: string) =>
    request<PatientOut[]>(`/patients${facilityId ? `?facility_id=${facilityId}` : ""}`),
  me: () => request<PatientOut>("/patients/me"),
  get: (id: string) => request<PatientOut>(`/patients/${id}`),
  create: (data: PatientCreate) => request<PatientOut>("/patients", { method: "POST", body: data }),
  updateMe: (data: PatientUpdate) => request<PatientOut>("/patients/me", { method: "PATCH", body: data }),
  update: (id: string, data: PatientUpdate) =>
    request<PatientOut>(`/patients/${id}`, { method: "PATCH", body: data }),
  remove: (id: string, baseVersion: number) =>
    request<void>(`/patients/${id}?base_version=${baseVersion}`, { method: "DELETE" }),
  classifyPathway: (data: CarePathwayClassifyRequest) =>
    request<CarePathwayClassification>("/patients/me/classify-pathway", { method: "POST", body: data }),
};

// ---- Referrals ----

export const referralsApi = {
  list: (patientId?: string) =>
    request<ReferralOut[]>(`/referrals${patientId ? `?patient_id=${patientId}` : ""}`),
  me: () => request<ReferralOut[]>("/referrals/me"),
  get: (id: string) => request<ReferralOut>(`/referrals/${id}`),
  create: (data: ReferralCreate) => request<ReferralOut>("/referrals", { method: "POST", body: data }),
  requestCare: (data: CareRequestCreate) =>
    request<ReferralOut>("/referrals/request-care", { method: "POST", body: data }),
  transition: (id: string, data: ReferralStatusUpdate) =>
    request<ReferralOut>(`/referrals/${id}/transition`, { method: "POST", body: data }),
  updateStatus: (id: string, data: ReferralStatusUpdate) =>
    request<ReferralOut>(`/referrals/${id}/status`, { method: "PATCH", body: data }),
  matchCandidates: (params: { from_facility_id?: string; specialty_needed?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params.from_facility_id) qs.set("from_facility_id", params.from_facility_id);
    if (params.specialty_needed) qs.set("specialty_needed", params.specialty_needed);
    if (params.limit) qs.set("limit", String(params.limit));
    return request<MatchCandidate[]>(`/referrals/match/candidates?${qs.toString()}`);
  },
};

// ---- Care gaps ----
// Backend requires `patient_id` for non-admin roles (RBAC: facility-scoped
// roles cannot list care gaps across a whole facility in one call), so
// dashboards that need a facility-wide count fetch per-patient and aggregate
// client-side (see hw/dashboard and patient/dashboard pages).
export const careGapsApi = {
  listForPatient: (patientId: string) =>
    request<CareGapOut[]>(`/care-gaps?patient_id=${patientId}`),
  listAll: () => request<CareGapOut[]>("/care-gaps"), // ADMIN only
};

// ---- Facilities (read-only, used for name lookups) ----

export const facilitiesApi = {
  list: () => request<FacilityOut[]>("/facilities"),
  get: (id: string) => request<FacilityOut>(`/facilities/${id}`),
};

// ---- Encounters / symptoms / vitals / screenings ----

export const encountersApi = {
  list: (patientId: string) => request<EncounterOut[]>(`/encounters?patient_id=${patientId}`),
  me: () => request<EncounterOut[]>("/encounters/me"),
  get: (id: string) => request<EncounterOut>(`/encounters/${id}`),
  create: (data: EncounterCreate) => request<EncounterOut>("/encounters", { method: "POST", body: data }),
  createMine: (data: EncounterCreate) => request<EncounterOut>("/encounters/me", { method: "POST", body: data }),
  addMyVitals: (data: SelfVitalCreate) => request<VitalOut>("/vitals/me", { method: "POST", body: data }),
  addMySymptom: (data: SelfSymptomCreate) =>
    request<SymptomOut>("/encounters/me/symptoms", { method: "POST", body: data }),
  addSymptom: (encounterId: string, data: SymptomCreate) =>
    request<SymptomOut>(`/encounters/${encounterId}/symptoms`, { method: "POST", body: data }),
  listSymptoms: (encounterId: string) => request<SymptomOut[]>(`/encounters/${encounterId}/symptoms`),
  addVital: (encounterId: string, data: VitalCreate) =>
    request<VitalOut>(`/encounters/${encounterId}/vitals`, { method: "POST", body: data }),
  listVitals: (encounterId: string) => request<VitalOut[]>(`/encounters/${encounterId}/vitals`),
  addScreening: (encounterId: string, data: ScreeningCreate) =>
    request<ScreeningOut>(`/encounters/${encounterId}/screenings`, { method: "POST", body: data }),
  listScreenings: (encounterId: string) => request<ScreeningOut[]>(`/encounters/${encounterId}/screenings`),
};

// ---- Diagnostics ----

export const diagnosticsApi = {
  listOrders: (patientId: string) =>
    request<DiagnosticOrderOut[]>(`/diagnostics/orders?patient_id=${patientId}`),
  me: () => request<DiagnosticOrderOut[]>("/diagnostics/me"),
  getOrder: (id: string) => request<DiagnosticOrderOut>(`/diagnostics/orders/${id}`),
  createOrder: (data: DiagnosticOrderCreate) =>
    request<DiagnosticOrderOut>("/diagnostics/orders", { method: "POST", body: data }),
  createReport: (data: DiagnosticReportCreate) =>
    request<DiagnosticReportOut>("/diagnostics/reports", { method: "POST", body: data }),
  getReport: (id: string) => request<DiagnosticReportOut>(`/diagnostics/reports/${id}`),
};

// ---- Prescriptions ----

export const prescriptionsApi = {
  list: (patientId: string) => request<PrescriptionOut[]>(`/prescriptions?patient_id=${patientId}`),
  me: () => request<PrescriptionOut[]>("/prescriptions/me"),
  get: (id: string) => request<PrescriptionOut>(`/prescriptions/${id}`),
};

// ---- Maternal: pregnancies ----

export const pregnanciesApi = {
  listForPatient: (patientId: string) =>
    request<PregnancyOut[]>(`/pregnancies?patient_id=${patientId}`),
};

// ---- Inventory ----

export const inventoryApi = {
  list: (facilityId: string) => request<InventoryItemOut[]>(`/inventory?facility_id=${facilityId}`),
  lowStock: (facilityId: string) => request<InventoryItemOut[]>(`/inventory/low-stock?facility_id=${facilityId}`),
  nearby: () => request<NearbyInventoryOut[]>("/inventory/nearby"),
  search: (query: string) =>
    request<NearbyInventoryOut[]>(`/inventory/search?query=${encodeURIComponent(query)}`),
  adjust: (itemId: string, data: { delta: number; reason: string }) =>
    request<{ id: string; item_id: string; delta: number; resulting_quantity: number }>(
      `/inventory/${itemId}/adjust`,
      { method: "POST", body: data }
    ),
};

// ---- Doctor availability ----

export const appointmentsApi = {
  list: (patientId: string) => request<AppointmentOut[]>(`/appointments?patient_id=${patientId}`),
  me: () => request<AppointmentOut[]>("/appointments/me"),
  create: (data: AppointmentCreate) =>
    request<AppointmentOut>("/appointments", { method: "POST", body: data }),
  updateStatus: (id: string, data: AppointmentStatusUpdate) =>
    request<AppointmentOut>(`/appointments/${id}/status`, { method: "PATCH", body: data }),
};

export const doctorAvailabilityApi = {
  list: (facilityId: string) =>
    request<DoctorAvailabilityOut[]>(`/doctor-availability?facility_id=${facilityId}`),
};

// ---- Symptom summary (Gemini-backed AI pipeline) ----

export const symptomsApi = {
  summarize: (data: SymptomSummarizeRequest) =>
    request<SymptomSummarizeResponse>("/symptoms/summarize", { method: "POST", body: data }),
};

// ---- Offline sync ----

export const syncApi = {
  push: (data: SyncPushRequest) =>
    request<SyncPushResponse>("/sync/push", { method: "POST", body: data }),
  pull: (since?: string | null) =>
    request<SyncPullResponse>("/sync/pull", { method: "POST", body: { since: since ?? null } }),
};

export { request as apiRequest };
