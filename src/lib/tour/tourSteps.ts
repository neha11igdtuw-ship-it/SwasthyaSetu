import type { Role } from "@/lib/api/types";

export type TourRole = "patient" | "hw" | "doctor";

export interface TourStepDef {
  id: string;
  /** Value of the `data-tour` attribute on the element to highlight. */
  target: string;
  titleKey: string;
  descriptionKey: string;
}

/** Only roles with a dedicated dashboard get a tour. */
export function tourRoleForUserRole(role: Role | string | null | undefined): TourRole | null {
  switch (role) {
    case "PATIENT":
      return "patient";
    case "HEALTH_WORKER":
      return "hw";
    case "DOCTOR":
      return "doctor";
    default:
      return null;
  }
}

export const TOUR_DASHBOARD_PATH: Record<TourRole, string> = {
  patient: "/patient/dashboard",
  hw: "/hw/dashboard",
  doctor: "/doctor/dashboard",
};

/** The tour only starts once this element is on screen (e.g. after patient
 * onboarding is done and the dashboard has finished loading). */
export const TOUR_READY_TARGET = "dashboard-header";

const nav = (labelKey: string) => `nav:${labelKey}`;

// Targets are the REAL elements in the app. Steps whose element is not on
// screen for this user (hidden feature, closed menu, different pathway) are
// dropped when the tour starts, so nothing points at a missing element.
const PATIENT_STEPS: TourStepDef[] = [
  { id: "dashboard", target: "dashboard-header", titleKey: "tour.dashboard.title", descriptionKey: "tour.dashboard.description" },
  { id: "journey", target: "care-journey", titleKey: "tour.journey.title", descriptionKey: "tour.journey.description" },
  { id: "appointments", target: nav("appointments"), titleKey: "tour.appointments.title", descriptionKey: "tour.appointments.description" },
  { id: "teleconsultation", target: nav("appointments"), titleKey: "tour.teleconsultation.title", descriptionKey: "tour.teleconsultation.description" },
  { id: "records", target: nav("records"), titleKey: "tour.records.title", descriptionKey: "tour.records.description" },
  { id: "referrals", target: nav("referrals"), titleKey: "tour.referrals.title", descriptionKey: "tour.referrals.description" },
  { id: "medicines", target: nav("medicines"), titleKey: "tour.medicines.title", descriptionKey: "tour.medicines.description" },
  { id: "followUps", target: nav("followUps"), titleKey: "tour.followUps.title", descriptionKey: "tour.followUps.description" },
  { id: "help", target: "help", titleKey: "tour.help.title", descriptionKey: "tour.help.description" },
];

const HW_STEPS: TourStepDef[] = [
  { id: "dashboard", target: "dashboard-header", titleKey: "tour.hw.dashboard.title", descriptionKey: "tour.hw.dashboard.description" },
  { id: "register", target: nav("hwRegister"), titleKey: "tour.hw.register.title", descriptionKey: "tour.hw.register.description" },
  { id: "patients", target: nav("hwPatients"), titleKey: "tour.hw.patients.title", descriptionKey: "tour.hw.patients.description" },
  { id: "triage", target: nav("hwScreening"), titleKey: "tour.hw.triage.title", descriptionKey: "tour.hw.triage.description" },
  { id: "highRisk", target: nav("hwHighRisk"), titleKey: "tour.hw.highRisk.title", descriptionKey: "tour.hw.highRisk.description" },
  { id: "referrals", target: nav("hwReferrals"), titleKey: "tour.hw.referrals.title", descriptionKey: "tour.hw.referrals.description" },
  { id: "followUps", target: nav("hwFollowUps"), titleKey: "tour.hw.followUps.title", descriptionKey: "tour.hw.followUps.description" },
  { id: "queue", target: "hw-queue", titleKey: "tour.hw.queue.title", descriptionKey: "tour.hw.queue.description" },
  { id: "help", target: "help", titleKey: "tour.help.title", descriptionKey: "tour.help.description" },
];

const DOCTOR_STEPS: TourStepDef[] = [
  { id: "dashboard", target: "dashboard-header", titleKey: "tour.doctor.dashboard.title", descriptionKey: "tour.doctor.dashboard.description" },
  { id: "review", target: nav("patientsToReview"), titleKey: "tour.doctor.review.title", descriptionKey: "tour.doctor.review.description" },
  { id: "schedule", target: nav("todaysSchedule"), titleKey: "tour.doctor.schedule.title", descriptionKey: "tour.doctor.schedule.description" },
  { id: "records", target: nav("records"), titleKey: "tour.doctor.records.title", descriptionKey: "tour.doctor.records.description" },
  { id: "consult", target: nav("teleconsultations"), titleKey: "tour.doctor.consult.title", descriptionKey: "tour.doctor.consult.description" },
  { id: "referrals", target: nav("referrals"), titleKey: "tour.doctor.referrals.title", descriptionKey: "tour.doctor.referrals.description" },
  { id: "queue", target: "doctor-queue", titleKey: "tour.doctor.queue.title", descriptionKey: "tour.doctor.queue.description" },
  { id: "help", target: "help", titleKey: "tour.help.title", descriptionKey: "tour.help.description" },
];

export function getTourSteps(role: TourRole): TourStepDef[] {
  switch (role) {
    case "patient":
      return PATIENT_STEPS;
    case "hw":
      return HW_STEPS;
    case "doctor":
      return DOCTOR_STEPS;
  }
}
