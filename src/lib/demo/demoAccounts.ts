import type { Role } from "@/lib/api/types";

export type DemoAccountKey = "patient" | "hw" | "doctor" | "facility";

export const DEMO_ACCOUNTS: Record<DemoAccountKey, { email: string; password: string; role: Role; dashboard: string }> = {
  patient: { email: "patient@swasthyasetu.dev", password: "Patient@123", role: "PATIENT", dashboard: "/patient/dashboard" },
  hw: { email: "worker@swasthyasetu.dev", password: "ChangeMe123!", role: "HEALTH_WORKER", dashboard: "/hw/dashboard" },
  doctor: { email: "doctor@swasthyasetu.dev", password: "ChangeMe123!", role: "DOCTOR", dashboard: "/doctor/dashboard" },
  facility: { email: "admin@swasthyasetu.dev", password: "ChangeMe123!", role: "FACILITY_ADMIN", dashboard: "/facility/dashboard" },
};
