// Adapters that map real backend API shapes (PatientOut, ReferralOut) onto the
// richer mock-data shapes (HealthWorkerPatient, HWReferral) the existing UI expects.
// The backend does not yet track risk level, vitals, care pathway, etc. — those
// fields are filled with safe defaults until the backend schema grows them.

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
  return {
    id: p.id,
    name: p.full_name,
    age: calcAge(p.date_of_birth),
    village: p.village || "-",
    phone: p.phone || "-",
    carePathway: "General Primary Care",
    riskLevel: "Low Risk",
    lastVisit: "-",
    nextFollowUp: "-",
    referralStatus: "None",
    careGaps: [],
    requiredAction: "",
    preferredLanguage: "Hindi",
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
    currentStep: r.status === "COMPLETED" ? "Closed" : r.status === "ACCEPTED" ? "Accepted" : "Created",
  };
}
