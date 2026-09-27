import { patientsApi } from "./client";
import type { PatientOut } from "./types";

/**
 * Load the RBAC-scoped patient row for the logged-in user.
 *
 * IMPORTANT: this must ONLY ever resolve to the record that belongs to the
 * currently authenticated user (via GET /patients/me, which the backend
 * scopes strictly to `user_id = current_user.id` — see
 * `app.api.deps.get_own_patient`). Do NOT fall back to `/patients` (a list
 * endpoint) and grab `patients[0]`: that pattern previously risked showing
 * one account's data (or, worse, another account's) as if it belonged to
 * the logged-in patient. If `/patients/me` fails, surface "no record" (null)
 * rather than guessing at a substitute patient.
 */
export async function loadOwnPatient(): Promise<PatientOut | null> {
  try {
    return await patientsApi.me();
  } catch (err) {
    console.warn("loadOwnPatient: /patients/me failed", err);
    return null;
  }
}
