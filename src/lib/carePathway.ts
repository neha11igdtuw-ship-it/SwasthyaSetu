/**
 * Care-pathway helpers shared across the patient journey.
 *
 * A brand-new patient record has `care_pathway = null` until they complete
 * the "What brings you to SwasthyaSetu?" onboarding step. Pregnancy /
 * maternal-care UI (pregnancy week, high-risk maternal badges, maternal
 * referrals & facilities, maternal medicines, etc.) must only be shown once
 * the patient has explicitly chosen the maternal-care pathway. Never assume
 * a pathway — always check the real value from the backend patient record.
 */

export const CARE_PATHWAY_OPTIONS = [
  {
    value: "General Health Problem",
    label: "General Health Problem",
    description: "A common illness, checkup, or a health concern not listed below.",
  },
  {
    value: "Pregnancy / Maternal Care",
    label: "Pregnancy / Maternal Care",
    description: "Antenatal checkups, pregnancy symptoms, and maternal health support.",
  },
  {
    value: "Child Healthcare",
    label: "Child Healthcare",
    description: "Care for a child — vaccinations, growth checks, or illness.",
  },
  {
    value: "Chronic Condition",
    label: "Chronic Condition",
    description: "Ongoing conditions such as diabetes, hypertension, or asthma.",
  },
  {
    value: "Emergency",
    label: "Emergency",
    description: "Urgent symptoms that need immediate attention right now.",
  },
  {
    value: "Other",
    label: "Other",
    description: "Something else that isn't covered by the options above.",
  },
] as const;

/**
 * True only when the patient has explicitly selected the maternal-care
 * pathway. Everything gating pregnancy-related UI must call this instead of
 * assuming maternal care by default.
 */
export function isMaternalCarePathway(carePathway: string | null | undefined): boolean {
  if (!carePathway) return false;
  const normalized = carePathway.toLowerCase();
  return normalized.includes("maternal") || normalized.includes("pregnan");
}
