/**
 * Canonical care-pathway values.
 *
 * These are the exact strings persisted in `patients.care_pathway` on the
 * backend (see backend/app/models/patient.py — a free-form string column,
 * not a DB enum). Every place in the frontend that reads/writes
 * `care_pathway` must use these constants instead of inventing new literals,
 * so the value written by onboarding always matches the value read by the
 * dashboard/header/symptoms flow.
 *
 * IMPORTANT: There is no default. A brand-new patient has
 * `care_pathway === null` until they complete onboarding — never assume
 * Maternal Care (or any other pathway) for a patient who hasn't chosen one.
 */
export const CARE_PATHWAYS = {
  GENERAL: "General Primary Care",
  MATERNAL: "Maternal Care",
  CHILD: "Child Care",
  CHRONIC: "Chronic Care",
  EMERGENCY: "Emergency",
  OTHER: "Other",
} as const;

export type CarePathway = (typeof CARE_PATHWAYS)[keyof typeof CARE_PATHWAYS];

export const CARE_PATHWAY_LIST: CarePathway[] = [
  CARE_PATHWAYS.GENERAL,
  CARE_PATHWAYS.MATERNAL,
  CARE_PATHWAYS.CHILD,
  CARE_PATHWAYS.CHRONIC,
  CARE_PATHWAYS.EMERGENCY,
  CARE_PATHWAYS.OTHER,
];

export function isMaternalPathway(pathway: string | null | undefined): boolean {
  return pathway === CARE_PATHWAYS.MATERNAL;
}

export function isChildPathway(pathway: string | null | undefined): boolean {
  return pathway === CARE_PATHWAYS.CHILD;
}

export function isChronicPathway(pathway: string | null | undefined): boolean {
  return pathway === CARE_PATHWAYS.CHRONIC;
}

export function isEmergencyPathway(pathway: string | null | undefined): boolean {
  return pathway === CARE_PATHWAYS.EMERGENCY;
}

/** True once the patient has completed case-selection onboarding. */
export function hasChosenPathway(pathway: string | null | undefined): boolean {
  return Boolean(pathway && pathway.trim().length > 0);
}

/**
 * Deterministic, offline-safe keyword classifier. This is the client-side
 * mirror of the backend's fallback in
 * `backend/app/services/care_pathway_classifier.py` — used to give an
 * instant suggestion while the API call is in flight, and as the fallback
 * if the API call fails. It never diagnoses; it only buckets the patient's
 * own words into a care pathway for them to confirm or change.
 */
export function classifyPathwayFromText(text: string): {
  care_pathway: CarePathway;
  confidence: number;
  reason: string;
} {
  const t = (text || "").toLowerCase();

  const has = (words: string[]) => words.some((w) => t.includes(w));

  if (
    has([
      "unconscious",
      "not breathing",
      "severe bleeding",
      "heavy bleeding",
      "chest pain",
      "seizure",
      "convuls",
      "accident",
      "poison",
      "can't breathe",
      "cannot breathe",
    ])
  ) {
    return {
      care_pathway: CARE_PATHWAYS.EMERGENCY,
      confidence: 0.9,
      reason: "The description mentions symptoms that may need immediate emergency attention.",
    };
  }

  if (
    has([
      "pregnan",
      "pregnancy",
      "expecting a baby",
      "delivery",
      "labour",
      "labor pain",
      "गर्भवती",
      "गरोदर",
    ])
  ) {
    return {
      care_pathway: CARE_PATHWAYS.MATERNAL,
      confidence: 0.75,
      reason: "The description mentions pregnancy-related care.",
    };
  }

  if (
    has([
      "my child",
      "my son",
      "my daughter",
      "my baby",
      "infant",
      "toddler",
      "years old and",
      "बच्चा",
      "बच्चे",
    ])
  ) {
    return {
      care_pathway: CARE_PATHWAYS.CHILD,
      confidence: 0.7,
      reason: "The description mentions a child's health.",
    };
  }

  if (
    has([
      "diabetes",
      "blood pressure",
      "hypertension",
      "asthma",
      "thyroid",
      "kidney",
      "heart disease",
      "long term",
      "chronic",
      "regular checkup",
      "ongoing treatment",
    ])
  ) {
    return {
      care_pathway: CARE_PATHWAYS.CHRONIC,
      confidence: 0.65,
      reason: "The description mentions an ongoing/chronic condition.",
    };
  }

  if (t.trim().length === 0) {
    return {
      care_pathway: CARE_PATHWAYS.GENERAL,
      confidence: 0.3,
      reason: "No description provided; defaulting to general care for you to confirm.",
    };
  }

  return {
    care_pathway: CARE_PATHWAYS.GENERAL,
    confidence: 0.55,
    reason: "The description sounds like a general health concern.",
  };
}
