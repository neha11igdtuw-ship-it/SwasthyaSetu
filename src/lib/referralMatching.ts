import { NearbyFacility, priyaPatientMock } from "./mockData";

export interface MatchingInput {
  riskLevel?: string;
  systolicBp?: number;
  diastolicBp?: number;
  symptoms?: string[];
  carePathway?: string;
}

export interface MatchResult {
  facility: NearbyFacility;
  matchReason: string;
  suggestedLevel: "District Hospital" | "Community Health Centre" | "Sub-Centre";
  isHighRiskMatched: boolean;
}

/**
 * Deterministic rule-based referral matching engine for rural healthcare continuity.
 * Matches patient risk, vitals, and danger signs with appropriate facility capabilities & distance.
 */
export function matchReferralFacility(
  input: MatchingInput,
  facilitiesList: NearbyFacility[] = priyaPatientMock.nearbyFacilities
): MatchResult {
  const { riskLevel = "High Risk", systolicBp = 145, diastolicBp = 92, symptoms = [], carePathway = "Maternal Care" } = input;

  const isHighBp = systolicBp >= 140 || diastolicBp >= 90;
  const hasDangerSigns = symptoms.some((s) => {
    const l = s.toLowerCase();
    return l.includes("headache") || l.includes("vision") || l.includes("bleeding") || l.includes("swelling");
  });

  const isHighRisk = riskLevel === "High Risk" || isHighBp || hasDangerSigns;
  const isModerateRisk = riskLevel === "Watch / Moderate" || (!isHighRisk && symptoms.length > 0);

  let targetType: NearbyFacility["type"] = "Sub-Centre";
  let suggestedLevel: MatchResult["suggestedLevel"] = "Sub-Centre";
  let matchReason = "Routine primary health care; Sub-Centre ANM checkup recommended.";

  if (isHighRisk) {
    targetType = "District Hospital";
    suggestedLevel = "District Hospital";
    matchReason =
      carePathway === "Maternal Care"
        ? "High-risk pregnancy vitals (BP >= 140/90 or pre-eclampsia signs) require 24/7 specialist obstetrician care, high-risk ward, and blood bank availability."
        : "High-risk clinical condition requiring specialist evaluation and hospital admission capability.";
  } else if (isModerateRisk) {
    targetType = "Community Health Centre";
    suggestedLevel = "Community Health Centre";
    matchReason = "Moderate risk indicators; Community Health Centre (CHC) medical officer checkup and basic diagnostics recommended.";
  }

  // Find facility matching targetType first, preferring status === 'Available'
  let matched = facilitiesList.find((f) => f.type === targetType && f.status === "Available");

  if (!matched) {
    matched = facilitiesList.find((f) => f.type === targetType);
  }

  // Fallback to closest available facility if targetType not found
  if (!matched) {
    const available = facilitiesList.filter((f) => f.status === "Available");
    const candidates = available.length > 0 ? available : facilitiesList;

    matched = [...candidates].sort((a, b) => {
      const distA = parseFloat(a.distance.replace(/[^0-9.]/g, "")) || 0;
      const distB = parseFloat(b.distance.replace(/[^0-9.]/g, "")) || 0;
      return distA - distB;
    })[0];
  }

  return {
    facility: matched || facilitiesList[0],
    matchReason,
    suggestedLevel,
    isHighRiskMatched: isHighRisk,
  };
}
