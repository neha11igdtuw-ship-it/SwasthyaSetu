export type LanguageOption = "en" | "hi" | "local";

export interface LanguageContextType {
  language: LanguageOption;
  setLanguage: (lang: LanguageOption) => void;
  t: (key: string) => string;
}

export const translationDictionary: Record<LanguageOption, Record<string, string>> = {
  en: {
    // Brand & Header
    platformName: "SwasthyaSetu",
    platformSubtitle: "Rural Care Continuity Platform",
    changeLanguage: "Change Language",
    savedOnDevice: "Saved on this device",
    offlineReady: "Saved on device",
    
    // Roles
    patientRole: "Patient",
    healthWorkerRole: "Health Worker",
    doctorRole: "Doctor",
    facilityRole: "Healthcare Facility",

    // Navigation Labels
    homeNav: "Home",
    symptomsNav: "Tell Symptoms",
    recordsNav: "My Health Records",
    referralsNav: "Care Requests",
    followUpsNav: "Next Visits",
    settingsNav: "Settings",
    voiceNav: "Voice Assistance",
    appointmentsNav: "Appointments",
    diagnosticsNav: "Lab Tests",
    medicinesNav: "Medicines",
    emergencyNav: "Emergency Help",
    documentsNav: "Upload Records",
    facilitiesNav: "Nearby Hospitals",
    
    // Health Worker Nav
    hwDashboard: "Overview",
    hwRegister: "Register Person",
    hwTriage: "Initial Health Check",
    hwRecords: "People Records",
    hwReferrals: "Care Requests",
    hwHighRisk: "High Priority Cases",
    hwSync: "Device Records",

    // Common Action Buttons & Statuses
    open: "Open",
    openDashboard: "Open Demo Overview",
    viewDetails: "View Details",
    markCompleted: "Mark Completed",
    needHelp: "Ask for Help",
    urgent: "Urgent Action Required",
    waitingForAction: "Waiting for action",
    savedInformation: "Saved information",
    updateInformation: "Update information",
    informationWaiting: "Information waiting to be sent",
    savedWithoutInternet: "Information saved without internet",
    
    // Safety Disclaimer
    safetyDisclaimer:
      "AI provides preliminary assistance only. Final clinical decisions remain with qualified health workers and doctors.",
    screeningLabel: "Preliminary Health Check",
    initialCheck: "Initial Health Check",
  },
  hi: {
    // Brand & Header
    platformName: "स्वास्थ्यसेतु",
    platformSubtitle: "ग्रामीण निरंतर देखभाल मंच",
    changeLanguage: "भाषा बदलें",
    savedOnDevice: "इस फोन पर सुरक्षित",
    offlineReady: "फोन पर सुरक्षित",
    
    // Roles
    patientRole: "मरीज़",
    healthWorkerRole: "स्वास्थ्य कार्यकर्ता (आशा/एएनएम)",
    doctorRole: "डॉक्टर",
    facilityRole: "स्वास्थ्य केंद्र / अस्पताल",

    // Navigation Labels
    homeNav: "मुख्य पृष्ठ",
    symptomsNav: "लक्षण बताएं",
    recordsNav: "मेरे स्वास्थ्य रिकॉर्ड",
    referralsNav: "अस्पताल सलाह",
    followUpsNav: "अगली जांच/दौरा",
    settingsNav: "सेटिंग्स",
    voiceNav: "आवाज सहायता (बोलकर बताएं)",
    appointmentsNav: "डॉक्टर से मिलने का समय",
    diagnosticsNav: "लैब जांच",
    medicinesNav: "दवाइयां",
    emergencyNav: "आपातकालीन सहायता",
    documentsNav: "कागजात अपलोड करें",
    facilitiesNav: "पास के अस्पताल",
    
    // Health Worker Nav
    hwDashboard: "मुख्य विवरण",
    hwRegister: "नया पंजीकरण करें",
    hwTriage: "प्रारंभिक स्वास्थ्य जांच",
    hwRecords: "गांव के मरीज",
    hwReferrals: "अस्पताल सलाह सूची",
    hwHighRisk: "विशेष देखभाल सूची",
    hwSync: "सुरक्षित रिकॉर्ड",

    // Common Action Buttons & Statuses
    open: "खोलें",
    openDashboard: "मुख्य विवरण देखें",
    viewDetails: "विवरण देखें",
    markCompleted: "पूरा हो गया",
    needHelp: "सहायता मांगें",
    urgent: "तुरंत ध्यान दें",
    waitingForAction: "कार्रवाई की प्रतीक्षा",
    savedInformation: "सुरक्षित जानकारी",
    updateInformation: "जानकारी अद्यतन करें",
    informationWaiting: "भेजने के लिए तैयार जानकारी",
    savedWithoutInternet: "बिना इंटरनेट फोन में सुरक्षित",
    
    // Safety Disclaimer
    safetyDisclaimer:
      "एआई केवल प्रारंभिक सहायता प्रदान करता है। अंतिम स्वास्थ्य निर्णय केवल डॉक्टर या स्वास्थ्य कार्यकर्ता द्वारा ही लिया जाएगा।",
    screeningLabel: "प्रारंभिक स्वास्थ्य जांच",
    initialCheck: "प्रारंभिक स्वास्थ्य जांच",
  },
  local: {
    // Brand & Header
    platformName: "SwasthyaSetu",
    platformSubtitle: "Rural Care Continuity Platform",
    changeLanguage: "Local / क्षेत्रीय भाषा",
    savedOnDevice: "Saved on this device",
    offlineReady: "Saved on device",
    
    // Roles
    patientRole: "Patient",
    healthWorkerRole: "Health Worker",
    doctorRole: "Doctor",
    facilityRole: "Healthcare Facility",

    // Navigation Labels
    homeNav: "Home",
    symptomsNav: "Tell Symptoms",
    recordsNav: "My Health Records",
    referralsNav: "Care Requests",
    followUpsNav: "Next Visits",
    settingsNav: "Settings",
    voiceNav: "Voice Assistance",
    appointmentsNav: "Appointments",
    diagnosticsNav: "Lab Tests",
    medicinesNav: "Medicines",
    emergencyNav: "Emergency Help",
    documentsNav: "Upload Records",
    facilitiesNav: "Nearby Hospitals",

    // Health Worker Nav
    hwDashboard: "Overview",
    hwRegister: "Register Person",
    hwTriage: "Initial Health Check",
    hwRecords: "People Records",
    hwReferrals: "Care Requests",
    hwHighRisk: "High Priority Cases",
    hwSync: "Device Records",

    // Common Action Buttons & Statuses
    open: "Open",
    openDashboard: "Open Demo Overview",
    viewDetails: "View Details",
    markCompleted: "Mark Completed",
    needHelp: "Ask for Help",
    urgent: "Urgent Action Required",
    waitingForAction: "Waiting for action",
    savedInformation: "Saved information",
    updateInformation: "Update information",
    informationWaiting: "Information waiting to be sent",
    savedWithoutInternet: "Information saved without internet",
    
    // Safety Disclaimer
    safetyDisclaimer:
      "AI provides preliminary assistance only. Final clinical decisions remain with qualified health workers and doctors.",
    screeningLabel: "Preliminary Health Check",
    initialCheck: "Initial Health Check",
  },
};
