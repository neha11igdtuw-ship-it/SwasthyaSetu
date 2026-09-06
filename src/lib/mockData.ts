export interface PatientProfile {
  id: string;
  name: string;
  age: number;
  location: string;
  pregnancyWeek: number;
  assignedASHA: string;
  assignedASHAPhone: string;
  selectedLanguage: string;
  vitals: {
    bp: string;
    hemoglobin: string;
    weight: string;
    pulse: string;
  };
}

export interface CareStatusInfo {
  label: string;
  riskStatus: "High Risk" | "Watch / Moderate" | "Low Risk";
  reasons: string[];
  disclaimer: string;
}

export interface NextActionInfo {
  recommendedAction: string;
  recommendedFacility: string;
  facilityType: string;
  distance: string;
  availableServices: string[];
  doctorAvailability: string;
  lastUpdated: string;
  isLive: boolean;
}

export type ReferralStep =
  | "Created"
  | "Accepted"
  | "Patient Visit"
  | "Test Completed"
  | "Treatment Started"
  | "Follow-up Due"
  | "Closed";

export interface ReferralInfo {
  id: string;
  facilityName: string;
  reason: string;
  priority: "High" | "Medium" | "Routine";
  expectedVisitDate: string;
  currentStep: ReferralStep;
  steps: { name: ReferralStep; status: "completed" | "current" | "pending"; date?: string }[];
}

export interface FollowUpItem {
  id: string;
  title: string;
  type: "Medicine" | "Diagnostic" | "ASHA Visit" | "Doctor Visit";
  dueDate: string;
  status: "Due" | "Completed" | "Overdue";
  instructions: string;
}

export interface DiagnosticItem {
  id: string;
  testName: string;
  status: "Recommended" | "Booked" | "Completed" | "Report Available";
  facilityName: string;
  scheduledDate?: string;
  reportSummary?: string;
}

export interface MedicineItem {
  id: string;
  name: string;
  dosage: string;
  timing: string;
  availability: "In Stock" | "Limited" | "Out of Stock";
  nearbyFacility: string;
  received: boolean;
}

export interface AppointmentItem {
  id: string;
  facilityName: string;
  doctorName: string;
  specialty: string;
  dateTime: string;
  status: "Confirmed" | "Pending" | "Completed";
}

export interface TimelineVisit {
  id: string;
  date: string;
  type: string;
  provider: string;
  summary: string;
  bp: string;
  hb: string;
}

export interface NearbyFacility {
  id: string;
  name: string;
  type: "Sub-Centre" | "Primary Health Centre" | "Community Health Centre" | "District Hospital";
  distance: string;
  availableServices: string[];
  doctorAvailability: string;
  status: "Available" | "Unavailable";
  lastUpdated: string;
}

export interface HealthWorkerPatient {
  id: string;
  name: string;
  age: number;
  village: string;
  phone: string;
  pregnancyWeek?: number;
  edd?: string;
  carePathway: "Maternal Care" | "Hypertension" | "Diabetes" | "General Primary Care";
  riskLevel: "High Risk" | "Watch / Moderate" | "Low Risk" | "Normal";
  lastVisit: string;
  nextFollowUp: string;
  referralStatus: "None" | "Waiting for action" | "Accepted" | "Completed";
  careGaps: string[];
  requiredAction: string;
  preferredLanguage: string;
  vitals: {
    bp: string;
    hemoglobin: string;
  };
  latestSymptoms: string[];
  uploadedDocuments: string[];
}

export interface HWReferral {
  id: string;
  patientId: string;
  patientName: string;
  facilityName: string;
  reason: string;
  priority: "High" | "Medium" | "Routine";
  createdDate: string;
  expectedVisitDate: string;
  status: "Pending Acceptance" | "Accepted" | "Completed" | "Awaiting Visit";
  currentStep: ReferralStep;
}

export interface HWFollowUp {
  id: string;
  patientId: string;
  patientName: string;
  village: string;
  phone: string;
  dueDate: string;
  type: "ASHA Home Visit" | "Lab Test" | "Medicine Collection" | "Hospital Visit";
  status: "Due Today" | "Missed" | "Upcoming" | "Completed";
  actionNeeded: string;
  reasonIfMissed?: string;
}

// Full Priya Sharma Dataset
export const priyaPatientMock = {
  profile: {
    id: "P-7821",
    name: "Priya Sharma",
    age: 24,
    location: "Rampur Village, Sub-Centre Rampur",
    pregnancyWeek: 28,
    assignedASHA: "Meena Devi",
    assignedASHAPhone: "+91 98765 43210",
    selectedLanguage: "Hindi (हिंदी)",
    vitals: {
      bp: "145/92 mmHg",
      hemoglobin: "9.2 g/dL",
      weight: "58 kg",
      pulse: "82 bpm",
    },
  } as PatientProfile,

  careStatus: {
    label: "Initial Health Check",
    riskStatus: "High Risk",
    reasons: [
      "Blood pressure reading 145/92 mmHg at 28 weeks gestation",
      "Hemoglobin 9.2 g/dL indicates moderate anemia",
      "Reported symptoms: persistent headache and blurred vision",
    ],
    disclaimer:
      "This is an initial health check, not a final medical decision. Review by a qualified health worker or doctor is required.",
  } as CareStatusInfo,

  nextAction: {
    recommendedAction: "Visit District Hospital for specialist doctor checkup and BP monitoring",
    recommendedFacility: "District Civil Hospital & Maternal Care Centre",
    facilityType: "District Hospital",
    distance: "8.5 km",
    availableServices: ["Obstetrician Duty", "Blood Bank", "High-Risk Pregnancy Ward", "Ultrasound"],
    doctorAvailability: "Dr. Ananya Rao (Senior Gynecologist) on duty till 4:00 PM",
    lastUpdated: "Today at 9:30 AM",
    isLive: false,
  } as NextActionInfo,

  referral: {
    id: "REF-2026-0891",
    facilityName: "District Civil Hospital",
    reason: "Pre-eclampsia screening & Anemia Management",
    priority: "High",
    expectedVisitDate: "Tomorrow, 10:00 AM",
    currentStep: "Accepted",
    steps: [
      { name: "Created", status: "completed", date: "Sep 5, 2026" },
      { name: "Accepted", status: "completed", date: "Sep 6, 2026" },
      { name: "Patient Visit", status: "pending" },
      { name: "Test Completed", status: "pending" },
      { name: "Treatment Started", status: "pending" },
      { name: "Follow-up Due", status: "pending" },
      { name: "Closed", status: "pending" },
    ],
  } as ReferralInfo,

  followUps: [
    {
      id: "FU-101",
      title: "Iron Sucrose Injection Dose 2",
      type: "Doctor Visit",
      dueDate: "Tomorrow at 10:00 AM",
      status: "Due",
      instructions: "Visit District Hospital OPD Room 4 with ANC Card.",
    },
    {
      id: "FU-102",
      title: "ASHA Home BP Check",
      type: "ASHA Visit",
      dueDate: "Sep 8, 2026",
      status: "Due",
      instructions: "ASHA Meena Devi will visit home for morning BP check.",
    },
    {
      id: "FU-103",
      title: "Repeat Hemoglobin Test",
      type: "Diagnostic",
      dueDate: "Sep 12, 2026",
      status: "Due",
      instructions: "Give blood sample at Primary Health Centre.",
    },
  ] as FollowUpItem[],

  diagnostics: [
    {
      id: "DIAG-01",
      testName: "Complete Blood Count & Serum Ferritin",
      status: "Report Available",
      facilityName: "District Hospital Lab",
      scheduledDate: "Sep 4, 2026",
      reportSummary: "Hemoglobin 9.2 g/dL (Moderate Anemia). Iron studies recommended.",
    },
    {
      id: "DIAG-02",
      testName: "Obstetric Ultrasound (Growth Scan)",
      status: "Booked",
      facilityName: "District Hospital Diagnostic Wing",
      scheduledDate: "Tomorrow, 11:30 AM",
      reportSummary: "Pending ultrasound appointment at District Hospital.",
    },
    {
      id: "DIAG-03",
      testName: "Urine Albumin & Protein Test",
      status: "Recommended",
      facilityName: "Sub-Centre Rampur",
      scheduledDate: "Sep 8, 2026",
      reportSummary: "Recommended during next ASHA home visit.",
    },
  ] as DiagnosticItem[],

  medicines: [
    {
      id: "MED-01",
      name: "Iron & Folic Acid (IFA) Tablets",
      dosage: "1 tablet daily after food",
      timing: "Morning after breakfast",
      availability: "In Stock",
      nearbyFacility: "Sub-Centre Rampur",
      received: true,
    },
    {
      id: "MED-02",
      name: "Calcium & Vitamin D3 Tablets",
      dosage: "1 tablet daily",
      timing: "Night after dinner",
      availability: "In Stock",
      nearbyFacility: "Sub-Centre Rampur",
      received: true,
    },
    {
      id: "MED-03",
      name: "Labetalol 100mg (Antihypertensive)",
      dosage: "1 tablet twice daily if BP > 140/90",
      timing: "Morning and Evening",
      availability: "Limited",
      nearbyFacility: "District Hospital Pharmacy",
      received: false,
    },
  ] as MedicineItem[],

  appointments: [
    {
      id: "APT-501",
      facilityName: "District Civil Hospital",
      doctorName: "Dr. Ananya Rao",
      specialty: "Gynecology & High-Risk ANC",
      dateTime: "Tomorrow, 10:30 AM",
      status: "Confirmed",
    },
  ] as AppointmentItem[],

  timeline: [
    {
      id: "TIM-01",
      date: "Sep 5, 2026",
      type: "ASHA Home Visit",
      provider: "Meena Devi (ASHA)",
      summary: "High BP recorded (145/92 mmHg). Patient advised rest and referred for hospital checkup.",
      bp: "145/92",
      hb: "9.2",
    },
    {
      id: "TIM-02",
      date: "Aug 20, 2026",
      type: "Sub-Centre ANC Visit 2",
      provider: "ANM Sunita Devi",
      summary: "ANC Checkup 2 completed. Tetanus Toxoid (TT-2) dose administered.",
      bp: "132/84",
      hb: "9.5",
    },
    {
      id: "TIM-03",
      date: "Jul 10, 2026",
      type: "First ANC Registration",
      provider: "Sub-Centre Rampur",
      summary: "Pregnancy registered. MCP card issued and basic vitals logged.",
      bp: "120/80",
      hb: "10.1",
    },
  ] as TimelineVisit[],

  nearbyFacilities: [
    {
      id: "FAC-01",
      name: "District Civil Hospital & Maternal Care Centre",
      type: "District Hospital",
      distance: "8.5 km",
      availableServices: ["Obstetrician Duty", "Blood Bank", "Ultrasound", "High-Risk ICU"],
      doctorAvailability: "3 Gynecologists Available",
      status: "Available",
      lastUpdated: "Today at 9:00 AM",
    },
    {
      id: "FAC-02",
      name: "Community Health Centre (CHC) Kalyanpur",
      type: "Community Health Centre",
      distance: "4.2 km",
      availableServices: ["Medical Officer", "Labor Room", "Basic Diagnostics"],
      doctorAvailability: "Medical Officer on Duty",
      status: "Available",
      lastUpdated: "Today at 8:30 AM",
    },
    {
      id: "FAC-03",
      name: "Sub-Centre Rampur",
      type: "Sub-Centre",
      distance: "0.8 km",
      availableServices: ["ANM Checkup", "IFA Meds", "BP Monitoring"],
      doctorAvailability: "ANM Sunita Devi Available",
      status: "Available",
      lastUpdated: "Today at 8:00 AM",
    },
  ] as NearbyFacility[],

  emergencySymptoms: [
    "Severe vaginal bleeding or watery discharge",
    "Persistent severe headache with blurred vision or double vision",
    "Convulsions, fits, or loss of consciousness",
    "High fever with chills or stiffness",
    "Severe pain in upper abdomen or below ribs",
    "Reduced or absent fetal movement for more than 12 hours",
  ],
};

// Health Worker Mock Patients List
export const hwPatientsList: HealthWorkerPatient[] = [
  {
    id: "P-7821",
    name: "Priya Sharma",
    age: 24,
    village: "Rampur",
    phone: "+91 98765 43210",
    pregnancyWeek: 28,
    edd: "2026-11-28",
    carePathway: "Maternal Care",
    riskLevel: "High Risk",
    lastVisit: "Sep 5, 2026",
    nextFollowUp: "Tomorrow, 10:00 AM",
    referralStatus: "Accepted",
    careGaps: ["BP monitoring required daily", "Anemia medication collection pending"],
    requiredAction: "Accompany for District Hospital referral checkup",
    preferredLanguage: "Hindi",
    vitals: { bp: "145/92", hemoglobin: "9.2" },
    latestSymptoms: ["Headache", "Blurred vision"],
    uploadedDocuments: ["Mother_Protection_Card.pdf", "Lab_Report_Sep4.jpg"],
  },
  {
    id: "P-9012",
    name: "Pooja Sharma",
    age: 22,
    village: "Kalyanpur",
    phone: "+91 98765 22110",
    pregnancyWeek: 32,
    edd: "2026-11-02",
    carePathway: "Maternal Care",
    riskLevel: "High Risk",
    lastVisit: "Sep 3, 2026",
    nextFollowUp: "Sep 7, 2026",
    referralStatus: "Waiting for action",
    careGaps: ["Hospital referral delayed > 24 hours"],
    requiredAction: "Follow up on hospital care request status",
    preferredLanguage: "Bhojpuri",
    vitals: { bp: "150/96", hemoglobin: "8.8" },
    latestSymptoms: ["Severe swelling in feet", "Dizziness"],
    uploadedDocuments: ["MCP_Card_Pooja.pdf"],
  },
  {
    id: "P-3341",
    name: "Sunita Verma",
    age: 29,
    village: "Rampur",
    phone: "+91 98765 33445",
    pregnancyWeek: 16,
    edd: "2027-02-14",
    carePathway: "Maternal Care",
    riskLevel: "Watch / Moderate",
    lastVisit: "Aug 28, 2026",
    nextFollowUp: "Sep 10, 2026",
    referralStatus: "None",
    careGaps: ["TT-2 vaccination due"],
    requiredAction: "Administer TT-2 dose during next sub-centre visit",
    preferredLanguage: "Hindi",
    vitals: { bp: "128/82", hemoglobin: "10.4" },
    latestSymptoms: ["Mild fatigue"],
    uploadedDocuments: ["ANC_Reg_Slip.pdf"],
  },
  {
    id: "P-5521",
    name: "Asha Devi",
    age: 31,
    village: "Sundarpur",
    phone: "+91 98765 55667",
    pregnancyWeek: 36,
    edd: "2026-10-05",
    carePathway: "Maternal Care",
    riskLevel: "Normal",
    lastVisit: "Sep 1, 2026",
    nextFollowUp: "Sep 15, 2026",
    referralStatus: "None",
    careGaps: ["Delivery plan check pending"],
    requiredAction: "Confirm institutional delivery arrangement at CHC",
    preferredLanguage: "Maithili",
    vitals: { bp: "118/78", hemoglobin: "11.2" },
    latestSymptoms: ["None"],
    uploadedDocuments: ["AshaDevi_ANC_Card.pdf"],
  },
  {
    id: "P-4410",
    name: "Ramesh Chandra",
    age: 58,
    village: "Rampur",
    phone: "+91 98765 44100",
    carePathway: "Hypertension",
    riskLevel: "High Risk",
    lastVisit: "Aug 15, 2026",
    nextFollowUp: "Overdue (Sep 2)",
    referralStatus: "None",
    careGaps: ["Follow-up visit missed by 4 days", "Medication refill overdue"],
    requiredAction: "Home visit for BP check and medication refill",
    preferredLanguage: "Hindi",
    vitals: { bp: "160/100", hemoglobin: "13.5" },
    latestSymptoms: ["Headache", "Chest tightness"],
    uploadedDocuments: ["NCD_Card_Ramesh.pdf"],
  },
];

// Health Worker Referrals List
export const hwReferralsList: HWReferral[] = [
  {
    id: "REF-2026-0891",
    patientId: "P-7821",
    patientName: "Priya Sharma",
    facilityName: "District Civil Hospital",
    reason: "Pre-eclampsia screening & Anemia Management",
    priority: "High",
    createdDate: "Sep 5, 2026",
    expectedVisitDate: "Sep 7, 2026",
    status: "Accepted",
    currentStep: "Accepted",
  },
  {
    id: "REF-2026-0895",
    patientId: "P-9012",
    patientName: "Pooja Sharma",
    facilityName: "District Civil Hospital",
    reason: "Severe Pre-eclampsia & High BP",
    priority: "High",
    createdDate: "Sep 6, 2026",
    expectedVisitDate: "Sep 6, 2026",
    status: "Pending Acceptance",
    currentStep: "Created",
  },
  {
    id: "REF-2026-0880",
    patientId: "P-3341",
    patientName: "Sunita Verma",
    facilityName: "CHC Kalyanpur",
    reason: "Routine Second Trimester Ultrasound",
    priority: "Routine",
    createdDate: "Aug 28, 2026",
    expectedVisitDate: "Sep 10, 2026",
    status: "Accepted",
    currentStep: "Accepted",
  },
];

// Health Worker Follow-ups List
export const hwFollowUpsList: HWFollowUp[] = [
  {
    id: "HW-FU-01",
    patientId: "P-7821",
    patientName: "Priya Sharma",
    village: "Rampur",
    phone: "+91 98765 43210",
    dueDate: "Today, 10:00 AM",
    type: "ASHA Home Visit",
    status: "Due Today",
    actionNeeded: "Home visit for morning BP check and ensure hospital transport",
  },
  {
    id: "HW-FU-02",
    patientId: "P-4410",
    patientName: "Ramesh Chandra",
    village: "Rampur",
    phone: "+91 98765 44100",
    dueDate: "Sep 2, 2026",
    type: "ASHA Home Visit",
    status: "Missed",
    actionNeeded: "Home visit for high BP monitoring and refill check",
    reasonIfMissed: "Patient was out of village visiting relatives",
  },
  {
    id: "HW-FU-03",
    patientId: "P-9012",
    patientName: "Pooja Sharma",
    village: "Kalyanpur",
    phone: "+91 98765 22110",
    dueDate: "Today, 2:00 PM",
    type: "Hospital Visit",
    status: "Due Today",
    actionNeeded: "Confirm arrival at District Hospital OPD",
  },
];

export const mockPatientData = priyaPatientMock.profile;

export const mockHealthWorkerData = {
  workerName: "Sunita Devi",
  assignedSubCenter: "Sub-Centre Rampur",
  assignedBlock: "Kalyanpur Block",
  totalPatients: 142,
  highRiskPatients: 12,
  pendingReferrals: 7,
  followUpsDueToday: 5,
  missedFollowUps: 3,
  unsyncedRecordsCount: 2,
  currentDate: "Sunday, Sep 6, 2026",
  actionPatients: [
    {
      id: "P-7821",
      name: "Priya Sharma",
      age: 24,
      village: "Rampur",
      pregnancyWeek: 28,
      riskLevel: "High Risk" as const,
      actionNeeded: "Accompany for hospital transfer checkup",
      dueTime: "Today at 10:30 AM",
    },
    {
      id: "P-9012",
      name: "Pooja Sharma",
      age: 22,
      village: "Kalyanpur",
      pregnancyWeek: 32,
      riskLevel: "High Risk" as const,
      actionNeeded: "Urgent BP monitoring and referral follow-up",
      dueTime: "Today at 12:00 PM",
    },
    {
      id: "P-4410",
      name: "Ramesh Chandra",
      age: 58,
      village: "Rampur",
      riskLevel: "High Risk" as const,
      actionNeeded: "Overdue home visit for hypertension check",
      dueTime: "Overdue by 4 days",
    },
  ],
};

export const mockDoctorData = {
  doctorName: "Dr. Ananya Rao",
  qualification: "MBBS, MD (Obstetrics & Gynecology)",
  facility: "District Civil Hospital & Maternal Care Centre",
  casesAwaitingReview: 8,
  highRiskCases: 5,
  pendingReferrals: 5,
  todaysFollowUpsCount: 14,
  recentCases: [
    {
      id: "P-7821",
      patientName: "Priya Sharma",
      age: 24,
      referredBy: "ANM Sunita Devi (Sub-Centre Rampur)",
      preliminaryRisk: "High Risk" as const,
      aiSummaryDraft:
        "28-week pregnant female with BP 145/92 mmHg, Hb 9.2 g/dL, persistent headache and blurred vision. High priority pre-eclampsia check required.",
      status: "Waiting for doctor review",
    },
    {
      id: "P-9012",
      patientName: "Pooja Sharma",
      age: 22,
      referredBy: "ASHA Meena Devi (Sub-Centre Kalyanpur)",
      preliminaryRisk: "High Risk" as const,
      aiSummaryDraft:
        "32-week pregnant female with BP 150/96 mmHg, severe pedal edema, and dizziness. Immediate evaluation required.",
      status: "Waiting for hospital response",
    },
  ],
};

export const mockFacilityData = {
  facilityName: "District Civil Hospital & Maternal Care Centre",
  type: "District Hospital",
  district: "Kalyanpur District",
  incomingReferralsCount: 12,
  acceptedReferralsCount: 8,
  patientsExpectedToday: 5,
  pendingFacilityResponsesCount: 4,
  bedOccupancyRate: "38 / 50 Beds Occupied",
  availableServices: [
    { name: "24/7 Maternity Emergency & Labor Room", status: "Available", onDutyStaff: "2 Obstetricians, 4 Midwives" },
    { name: "Blood Bank (O-Negative & B-Positive)", status: "In Stock", onDutyStaff: "Lab Tech On Duty" },
    { name: "Ultrasound & Growth Scan Facility", status: "Available", onDutyStaff: "Radiologist On Duty till 4 PM" },
    { name: "Special Newborn Care Unit (SNCU)", status: "Limited", onDutyStaff: "Pediatrician On Duty" },
  ],
  incomingReferrals: [
    {
      id: "REF-2026-0895",
      patientName: "Pooja Sharma",
      referringSubCenter: "Sub-Centre Kalyanpur",
      urgency: "Immediate High Priority",
      reason: "Severe Pre-Eclampsia & High BP",
      status: "Pending Acceptance" as const,
    },
    {
      id: "REF-2026-0891",
      patientName: "Priya Sharma",
      referringSubCenter: "Sub-Centre Rampur",
      urgency: "High Priority",
      reason: "Pre-eclampsia screening & Anemia Management",
      status: "Accepted" as const,
    },
  ],
  stockAvailability: {
    bloodBankUnits: 24,
    maternalIcuBeds: 4,
    oxytocinAvailability: "Adequate",
    essentialMeds: "In Stock" as const,
  },
};
