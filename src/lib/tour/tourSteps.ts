import type { Role } from "@/lib/api/types";

export type TourRole = "patient" | "hw" | "doctor" | "hospital";

export interface TourStepDef {
  id: string;
  /** Value of the `data-tour` attribute on the element to highlight. */
  target: string;
  titleKey: string;
  descriptionKey: string;
  /** Optional real application route to open before highlighting the step. */
  path?: string;
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
    // Hospital/facility accounts are their own role — never the doctor tour.
    case "FACILITY_ADMIN":
    case "FACILITY_STAFF":
      return "hospital";
    default:
      return null;
  }
}

export const TOUR_DASHBOARD_PATH: Record<TourRole, string> = {
  patient: "/patient/dashboard",
  hw: "/hw/dashboard",
  doctor: "/doctor/dashboard",
  hospital: "/facility/dashboard",
};

/** The tour only starts once this element is on screen (e.g. after patient
 * onboarding is done and the dashboard has finished loading). */
export const TOUR_READY_TARGET = "dashboard-header";

// Targets are the REAL elements in the app. Route steps navigate to the
// corresponding existing section before highlighting its page content.
const PATIENT_STEPS: TourStepDef[] = [
  { id: "dashboard", target: "dashboard-header", path: "/patient/dashboard", titleKey: "tour.dashboard.title", descriptionKey: "tour.dashboard.description" },
  { id: "journey", target: "care-journey", path: "/patient/dashboard", titleKey: "tour.journey.title", descriptionKey: "tour.journey.description" },
  { id: "voice", target: "page-content", path: "/patient/voice-assistant", titleKey: "voice", descriptionKey: "demoTourPatientFlow" },
  { id: "appointments", target: "page-content", path: "/patient/appointments", titleKey: "appointments", descriptionKey: "tour.appointments.description" },
  { id: "records", target: "page-content", path: "/patient/records", titleKey: "records", descriptionKey: "tour.records.description" },
  { id: "messages", target: "page-content", path: "/patient/messages", titleKey: "messages", descriptionKey: "demoTourPatientFlow" },
  { id: "referrals", target: "page-content", path: "/patient/referrals", titleKey: "referrals", descriptionKey: "tour.referrals.description" },
  { id: "diagnostics", target: "page-content", path: "/patient/diagnostics", titleKey: "diagnostics", descriptionKey: "demoTourPatientFlow" },
  { id: "medicines", target: "page-content", path: "/patient/medicines", titleKey: "medicines", descriptionKey: "tour.medicines.description" },
  { id: "followUps", target: "page-content", path: "/patient/follow-ups", titleKey: "followUps", descriptionKey: "tour.followUps.description" },
  { id: "emergency", target: "page-content", path: "/patient/emergency-help", titleKey: "emergencyHelp", descriptionKey: "tour.emergency.description" },
  { id: "symptoms", target: "page-content", path: "/patient/symptoms", titleKey: "symptoms", descriptionKey: "demoTourPatientFlow" },
  { id: "documents", target: "page-content", path: "/patient/documents", titleKey: "uploadReport", descriptionKey: "demoTourPatientFlow" },
  { id: "facilities", target: "page-content", path: "/patient/facilities", titleKey: "nearbyFacilities", descriptionKey: "demoTourPatientFlow" },
  { id: "help", target: "help", titleKey: "tour.help.title", descriptionKey: "tour.help.description" },
];

const HW_STEPS: TourStepDef[] = [
  { id: "dashboard", target: "dashboard-header", path: "/hw/dashboard", titleKey: "tour.hw.dashboard.title", descriptionKey: "tour.hw.dashboard.description" },
  { id: "patients", target: "page-content", path: "/hw/patients", titleKey: "hwPatients", descriptionKey: "demoTourWorkerFlow" },
  { id: "register", target: "page-content", path: "/hw/patients/register", titleKey: "hwRegister", descriptionKey: "tour.hw.register.description" },
  { id: "messages", target: "page-content", path: "/hw/messages", titleKey: "hwMessages", descriptionKey: "demoTourWorkerFlow" },
  { id: "highRisk", target: "page-content", path: "/hw/high-risk", titleKey: "hwHighRisk", descriptionKey: "tour.hw.highRisk.description" },
  { id: "referrals", target: "page-content", path: "/hw/referrals", titleKey: "hwReferrals", descriptionKey: "tour.hw.referrals.description" },
  { id: "followUps", target: "page-content", path: "/hw/follow-ups", titleKey: "hwFollowUps", descriptionKey: "tour.hw.followUps.description" },
  { id: "sync", target: "page-content", path: "/hw/sync", titleKey: "hwUpdateInfo", descriptionKey: "demoTourWorkerFlow" },
  { id: "queue", target: "hw-queue", path: "/hw/dashboard", titleKey: "tour.hw.queue.title", descriptionKey: "tour.hw.queue.description" },
  { id: "help", target: "help", titleKey: "tour.help.title", descriptionKey: "tour.help.description" },
];

const DOCTOR_STEPS: TourStepDef[] = [
  { id: "dashboard", target: "dashboard-header", path: "/doctor/dashboard", titleKey: "tour.doctor.dashboard.title", descriptionKey: "tour.doctor.dashboard.description" },
  { id: "review", target: "page-content", path: "/doctor/patients-to-review", titleKey: "patientsToReview", descriptionKey: "tour.doctor.review.description" },
  { id: "records", target: "page-content", path: "/doctor/patients", titleKey: "doctorRecords", descriptionKey: "tour.doctor.records.description" },
  { id: "messages", target: "page-content", path: "/doctor/messages", titleKey: "doctorMessages", descriptionKey: "demoTourDoctorFlow" },
  { id: "referrals", target: "page-content", path: "/doctor/care-requests", titleKey: "doctorCareRequests", descriptionKey: "tour.doctor.referrals.description" },
  { id: "schedule", target: "page-content", path: "/doctor/schedule", titleKey: "todaysSchedule", descriptionKey: "tour.doctor.schedule.description" },
  { id: "consult", target: "page-content", path: "/doctor/teleconsultations", titleKey: "teleconsultationsNav", descriptionKey: "tour.doctor.consult.description" },
  { id: "queue", target: "doctor-queue", path: "/doctor/dashboard", titleKey: "tour.doctor.queue.title", descriptionKey: "tour.doctor.queue.description" },
  { id: "help", target: "help", titleKey: "tour.help.title", descriptionKey: "tour.help.description" },
];

const HOSPITAL_STEPS: TourStepDef[] = [
  { id: "dashboard", target: "dashboard-header", path: "/facility/dashboard", titleKey: "tour.hospital.dashboard.title", descriptionKey: "tour.hospital.dashboard.description" },
  { id: "referrals", target: "page-content", path: "/facility/care-requests", titleKey: "facilityCareRequests", descriptionKey: "tour.hospital.referrals.description" },
  { id: "patients", target: "page-content", path: "/facility/patients", titleKey: "facilityPatientsToday", descriptionKey: "tour.hospital.patients.description" },
  { id: "labs", target: "page-content", path: "/facility/lab-results", titleKey: "facilityLabResults", descriptionKey: "tour.hospital.labs.description" },
  { id: "medicines", target: "page-content", path: "/facility/medicines", titleKey: "facilityMedicineStock", descriptionKey: "tour.hospital.medicines.description" },
  { id: "queue", target: "facility-queue", path: "/facility/dashboard", titleKey: "tour.hospital.queue.title", descriptionKey: "tour.hospital.queue.description" },
  { id: "resources", target: "facility-resources", path: "/facility/dashboard", titleKey: "tour.hospital.resources.title", descriptionKey: "tour.hospital.resources.description" },
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
    case "hospital":
      return HOSPITAL_STEPS;
  }
}
