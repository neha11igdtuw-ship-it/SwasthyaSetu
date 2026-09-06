export interface PatientMockData {
  id: string;
  name: string;
  age: number;
  gestationalAgeWeeks: number;
  location: string;
  careStatus: string;
  preliminaryRiskStatus: "High Risk" | "Watch / Moderate" | "Normal";
  nextFollowUp: string;
  referralStatus: string;
  recommendedFacility: string;
  assignedASHA: string;
  vitals: {
    bloodPressure: string;
    hemoglobin: string;
    weight: string;
    pulse: string;
  };
  offlineSyncStatus: {
    lastSynced: string;
    pendingOfflineChanges: number;
  };
}

export interface HealthWorkerMockData {
  ashaName: string;
  subCenter: string;
  totalPatients: number;
  highRiskPatients: number;
  pendingReferrals: number;
  followUpsDueToday: number;
  missedFollowUps: number;
  unsyncedRecordsCount: number;
  actionPatients: Array<{
    id: string;
    name: string;
    village: string;
    riskLevel: "High Risk" | "Watch / Moderate" | "Normal";
    actionNeeded: string;
    dueTime: string;
  }>;
}

export interface DoctorMockData {
  doctorName: string;
  qualification: string;
  facility: string;
  casesAwaitingReview: number;
  highRiskCases: number;
  pendingReferrals: number;
  todaysFollowUpsCount: number;
  recentCases: Array<{
    id: string;
    patientName: string;
    age: number;
    pathway: string;
    preliminaryRisk: "High Risk" | "Watch / Moderate" | "Normal";
    referredBy: string;
    aiSummaryDraft: string;
    status: string;
  }>;
}

export interface FacilityMockData {
  facilityName: string;
  district: string;
  type: string;
  incomingReferralsCount: number;
  acceptedReferralsCount: number;
  patientsExpectedToday: number;
  pendingFacilityResponsesCount: number;
  bedOccupancyRate: string;
  incomingReferrals: Array<{
    id: string;
    patientName: string;
    age: number;
    referringSubCenter: string;
    urgency: "High Risk - Priority" | "Moderate" | "Routine";
    reason: string;
    status: "Pending Acceptance" | "Accepted" | "Redirected";
  }>;
  availableServices: Array<{
    name: string;
    status: "Available" | "Limited" | "Unavailable";
    onDutyStaff: string;
  }>;
  stockAvailability: {
    bloodBankUnits: number;
    maternalIcuBeds: number;
    essentialMeds: "In Stock" | "Low Stock" | "Critical";
    oxytocinAvailability: string;
  };
}

export const mockPatientData: PatientMockData = {
  id: "P-8842",
  name: "Sunita Devi",
  age: 24,
  gestationalAgeWeeks: 28,
  location: "Rampur Sub-Centre, Ward 4",
  careStatus: "Under High-Risk ANC Pathway Monitoring",
  preliminaryRiskStatus: "High Risk",
  nextFollowUp: "Tomorrow, 10:00 AM (Hemoglobin & BP Re-check)",
  referralStatus: "Referred to District Civil Hospital (OB/GYN OPD)",
  recommendedFacility: "Community Health Centre (CHC) Rampur / District Hospital",
  assignedASHA: "Meena Devi (ASHA)",
  vitals: {
    bloodPressure: "148/92 mmHg",
    hemoglobin: "8.2 g/dL (Severe Anemia)",
    weight: "52 kg",
    pulse: "88 bpm",
  },
  offlineSyncStatus: {
    lastSynced: "10 mins ago (Local IndexedDB Cache Active)",
    pendingOfflineChanges: 0,
  },
};

export const mockHealthWorkerData: HealthWorkerMockData = {
  ashaName: "Meena Devi",
  subCenter: "Rampur Sub-Centre (Sector 2)",
  totalPatients: 142,
  highRiskPatients: 18,
  pendingReferrals: 7,
  followUpsDueToday: 9,
  missedFollowUps: 3,
  unsyncedRecordsCount: 2,
  actionPatients: [
    {
      id: "P-8842",
      name: "Sunita Devi",
      village: "Rampur",
      riskLevel: "High Risk",
      actionNeeded: "Urgent BP re-check & Iron Sucrose referral follow-up",
      dueTime: "Today (Overdue by 2 hrs)",
    },
    {
      id: "P-9012",
      name: "Pooja Sharma",
      village: "Kalyanpur",
      riskLevel: "High Risk",
      actionNeeded: "Missed 3rd ANC visit; visit home for vitals check",
      dueTime: "Today",
    },
    {
      id: "P-7731",
      name: "Kavita Rani",
      village: "Rampur",
      riskLevel: "Watch / Moderate",
      actionNeeded: "Deliver IFA tablets & schedule tetanus toxoid booster",
      dueTime: "Today",
    },
    {
      id: "P-6620",
      name: "Aniti Kumari",
      village: "Sundarpur",
      riskLevel: "Normal",
      actionNeeded: "Routine 2nd trimester ANC counselling session",
      dueTime: "Tomorrow",
    },
  ],
};

export const mockDoctorData: DoctorMockData = {
  doctorName: "Dr. Ananya Rao",
  qualification: "MD (Obstetrics & Gynecology)",
  facility: "District Civil Hospital, Medical Unit 2",
  casesAwaitingReview: 12,
  highRiskCases: 8,
  pendingReferrals: 5,
  todaysFollowUpsCount: 15,
  recentCases: [
    {
      id: "P-8842",
      patientName: "Sunita Devi",
      age: 24,
      pathway: "High-Risk Maternal Care (28 Wks)",
      preliminaryRisk: "High Risk",
      referredBy: "Meena Devi (ASHA, Rampur)",
      aiSummaryDraft:
        "Draft AI Summary: 28-week primigravida presenting with elevated BP (148/92 mmHg) and Hb 8.2 g/dL. Preliminary risk flags: Gestational Hypertension + Anemia. Doctor validation required.",
      status: "Pending Clinical Validation & Admission Order",
    },
    {
      id: "P-9012",
      patientName: "Pooja Sharma",
      age: 29,
      pathway: "High-Risk Maternal Care (32 Wks)",
      preliminaryRisk: "High Risk",
      referredBy: "Sunita Verma (ANM, Kalyanpur)",
      aiSummaryDraft:
        "Draft AI Summary: 32-week multigravida with reported pedal edema and headache. Blood pressure 152/96 mmHg. Preliminary risk flag: Preeclampsia screening alert.",
      status: "Teleconsultation Scheduled",
    },
    {
      id: "P-7731",
      patientName: "Kavita Rani",
      age: 22,
      pathway: "Maternal Care (18 Wks)",
      preliminaryRisk: "Watch / Moderate",
      referredBy: "Meena Devi (ASHA)",
      aiSummaryDraft:
        "Draft AI Summary: Routine trimester evaluation with mild fatigue. Hb 10.1 g/dL. Preliminary risk flag: Mild Anemia.",
      status: "Oral IFA Prescribed",
    },
  ],
};

export const mockFacilityData: FacilityMockData = {
  facilityName: "District Civil Hospital & Maternal Care Centre",
  district: "Rampur District Central",
  type: "Tertiary Referral & First Referral Unit (FRU)",
  incomingReferralsCount: 24,
  acceptedReferralsCount: 19,
  patientsExpectedToday: 14,
  pendingFacilityResponsesCount: 5,
  bedOccupancyRate: "78% (12 Maternal ICU Beds Free)",
  incomingReferrals: [
    {
      id: "REF-2026-0901",
      patientName: "Sunita Devi (P-8842)",
      age: 24,
      referringSubCenter: "Rampur Sub-Centre",
      urgency: "High Risk - Priority",
      reason: "Gestational Hypertension + Severe Anemia (Hb 8.2)",
      status: "Pending Acceptance",
    },
    {
      id: "REF-2026-0904",
      patientName: "Pooja Sharma (P-9012)",
      age: 29,
      referringSubCenter: "Kalyanpur Health Post",
      urgency: "High Risk - Priority",
      reason: "Suspected Preeclampsia with severe headache",
      status: "Pending Acceptance",
    },
    {
      id: "REF-2026-0899",
      patientName: "Asha Devi (P-5521)",
      age: 31,
      referringSubCenter: "Sundarpur Sub-Centre",
      urgency: "Routine",
      reason: "Ultrasonography (USG) appointment booking",
      status: "Accepted",
    },
  ],
  availableServices: [
    {
      name: "Emergency Obstetric Care (EmOC)",
      status: "Available",
      onDutyStaff: "Dr. Ananya Rao & Resident Team",
    },
    {
      name: "Blood Bank & Transfusion Unit",
      status: "Available",
      onDutyStaff: "24/7 Duty Technician",
    },
    {
      name: "Ultrasonography (USG - Maternal)",
      status: "Limited",
      onDutyStaff: "Sonologist (9 AM - 2 PM)",
    },
    {
      name: "Maternal ICU (HDU)",
      status: "Available",
      onDutyStaff: "ICU Specialist Nurse",
    },
  ],
  stockAvailability: {
    bloodBankUnits: 14,
    maternalIcuBeds: 12,
    essentialMeds: "In Stock",
    oxytocinAvailability: "Sufficient Stock",
  },
};
