import { patientsApi } from "./client";
import type { PatientOut } from "./types";

/**
 * Load the patient record belonging to the CURRENTLY AUTHENTICATED user.
 *
 * This must never resolve to an arbitrary/random patient. `GET /patients/me`
 * is scoped server-side to the JWT's own user_id (see
 * backend/app/api/deps.py:get_own_patient) and self-provisions a care record
 * the first time a PATIENT-role login calls it, so it should not normally
 * fail for a logged-in patient. If it does fail (e.g. transient network
 * error, or the caller isn't a PATIENT-role account), we surface that as
 * "no patient" rather than silently substituting someone else's record.
 *
 * Do NOT reintroduce `patientsApi.list()[0]` here — `list()` for a PATIENT
 * caller can return other rows in some legacy data states, and even a single
 * result is not guaranteed to be "the current user"; only `/patients/me`
 * carries that guarantee.
 */
export async function loadOwnPatient(): Promise<PatientOut | null> {
  try {
    return await patientsApi.me();
  } catch (err) {
    console.warn("loadOwnPatient: could not load the authenticated patient record", err);
    return null;
  }
}

/** Alias with an explicit name for new call sites — same behavior as loadOwnPatient. */
export const getCurrentAuthenticatedPatient = loadOwnPatient;
