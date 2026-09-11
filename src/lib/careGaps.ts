import { HealthWorkerPatient, HWReferral, HWFollowUp, MedicineItem } from "./mockData";

/**
 * Derived care gap detection engine.
 * Computes live care gaps based on patient vitals, referral status, missed visits, and uncollected medicines.
 */
export function derivePatientGaps(
  patient: HealthWorkerPatient,
  referralsList: HWReferral[] = [],
  followUpsList: HWFollowUp[] = [],
  medicinesList: MedicineItem[] = []
): string[] {
  const gaps: string[] = [];

  // 1. Referral delay check
  const patientRef = referralsList.find((r) => r.patientId === patient.id);
  if (patientRef && (patientRef.status === "Pending Acceptance" || (patientRef.status as string) === "Waiting for action")) {
    gaps.push("Hospital care request response pending > 24 hours");
  }

  // 2. Overdue / Missed follow-up check
  const hasMissedVisit = followUpsList.some(
    (f) => f.patientId === patient.id && (f.status === "Missed" || f.dueDate.toLowerCase().includes("overdue"))
  );
  if (hasMissedVisit || patient.nextFollowUp.toLowerCase().includes("overdue")) {
    gaps.push("Follow-up visit missed or overdue");
  }

  // 3. Uncollected medicine check
  const uncollected = medicinesList.some((m) => !m.received && m.availability === "In Stock");
  if (uncollected) {
    gaps.push("Prescribed medicine collection pending at health center");
  }

  // 4. High BP check
  if (patient.vitals?.bp) {
    const [sys, dia] = patient.vitals.bp.split("/").map((v) => parseInt(v.trim()));
    if (sys >= 140 || dia >= 90) {
      gaps.push("High BP reading; daily vitals monitoring required");
    }
  }

  // 5. Low Hemoglobin check
  if (patient.vitals?.hemoglobin) {
    const hb = parseFloat(patient.vitals.hemoglobin);
    if (!isNaN(hb) && hb < 10.0) {
      gaps.push("Moderate anemia; IFA medication & nutritional check required");
    }
  }

  // Fallback to existing mock careGaps if no live gaps derived
  if (gaps.length === 0 && patient.careGaps && patient.careGaps.length > 0) {
    return patient.careGaps;
  }

  return gaps.length > 0 ? gaps : ["Care schedule up to date"];
}
