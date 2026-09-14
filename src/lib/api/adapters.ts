import type { HealthWorkerPatient, HWReferral } from "@/lib/mockData";
import type { PatientOut, ReferralOut } from "./types";

function calcAge(dob: string | null): number {
  if (!dob) return 0;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return 0;
  const diffMs = Date.now() - birth.getTime();
  return Math.max(0, Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000)));
}

export function patientOutToHealthWorkerPatient(p: PatientOut): HealthWorkerPatient {
  const maternal = (p.care_pathway || "").toLowerCase().includes("maternal") || (p.pregnancy_week ?? 0) >= 20;
  return {
    id: p.id,
    name: p.full_name,
    age: calcAge(p.date_of_birth),
    village: p.village || "-",
    phone: p.phone || "-",
    carePathway: (p.care_pathway ||
      (maternal ? "Maternal Care" : "General Primary Care")) as HealthWorkerPatient["carePathway"],
    pregnancyWeek: p.pregnancy_week ?? undefined,
    riskLevel: maternal && (p.pregnancy_week ?? 0) >= 20 ? "High Risk" : "Low Risk",
    lastVisit: "-",
    nextFollowUp: "-",
    referralStatus: "None",
    careGaps: [],
    requiredAction: "",
    preferredLanguage: p.preferred_language || "Hindi",
    vitals: { bp: "-", hemoglobin: "-" },
    latestSymptoms: [],
    uploadedDocuments: [],
  };
}

const REFERRAL_STATUS_MAP: Record<ReferralOut["status"], HWReferral["status"]> = {
  CREATED: "Pending Acceptance",
  PENDING: "Pending Acceptance",
  ACCEPTED: "Accepted",
  REJECTED: "Pending Acceptance",
  IN_TRANSIT: "Accepted",
  COMPLETED: "Completed",
  CANCELLED: "Pending Acceptance",
};

export function referralOutToHWReferral(
  r: ReferralOut,
  patientName: string,
  facilityName: string
): HWReferral {
  return {
    id: r.id,
    patientId: r.patient_id,
    patientName,
    facilityName,
    reason: r.reason,
    priority: r.urgency === "URGENT" || r.urgency === "EMERGENCY" ? "High" : r.urgency === "ROUTINE" ? "Routine" : "Medium",
    expectedVisitDate: "-",
    status: REFERRAL_STATUS_MAP[r.status] || "Pending Acceptance",
    createdDate: "-",
    currentStep: r.status === "COMPLETED" ? "Closed" : r.status === "ACCEPTED" || r.status === "IN_TRANSIT" ? "Accepted" : "Created",
  };
}
