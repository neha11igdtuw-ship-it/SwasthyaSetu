import type { ReferralOutcome } from "@/lib/api/types";

/** Patient-facing outcome options, in display order. Values mirror the
 * backend `ReferralOutcome` enum (backend/app/models/enums.py). */
export const REFERRAL_OUTCOME_OPTIONS: ReadonlyArray<{ value: ReferralOutcome; label: string }> = [
  { value: "REACHED_FACILITY", label: "I reached the facility" },
  { value: "COULD_NOT_TRAVEL", label: "I could not travel" },
  { value: "FACILITY_CLOSED", label: "Facility was closed" },
  { value: "DOCTOR_UNAVAILABLE", label: "Doctor was unavailable" },
  { value: "TEST_NOT_COMPLETED", label: "Test was not completed" },
  { value: "MEDICINE_NOT_RECEIVED", label: "Medicine was not received" },
];

export function referralOutcomeLabel(outcome: ReferralOutcome | null | undefined): string {
  if (!outcome) return "";
  return REFERRAL_OUTCOME_OPTIONS.find((o) => o.value === outcome)?.label ?? outcome;
}

/** Everything except "I reached the facility" needs health-worker follow-up. */
export function isUnsuccessfulOutcome(outcome: ReferralOutcome | null | undefined): boolean {
  return !!outcome && outcome !== "REACHED_FACILITY";
}
