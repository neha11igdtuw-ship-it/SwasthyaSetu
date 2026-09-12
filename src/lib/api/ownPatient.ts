import { patientsApi } from "./client";
import type { PatientOut } from "./types";

/** Load the RBAC-scoped patient row for the logged-in user. */
export async function loadOwnPatient(): Promise<PatientOut | null> {
  try {
    return await patientsApi.me();
  } catch {
    const patients = await patientsApi.list();
    return patients[0] ?? null;
  }
}
