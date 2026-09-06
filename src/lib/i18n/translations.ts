export type LanguageOption = "en" | "hi" | "local";

export interface LanguageContextType {
  language: LanguageOption;
  setLanguage: (lang: LanguageOption) => void;
  t: (key: string) => string;
}

export const translationDictionary: Record<LanguageOption, Record<string, string>> = {
  en: {
    // Brand & Application
    appName: "SwasthyaSetu",
    platformSubtitle: "Rural Care Continuity Platform",
    tagline: "Care should continue, even when connectivity does not.",
    landingHeroDescription:
      "SwasthyaSetu connects rural patients, frontline health workers, doctors and healthcare facilities through one coordinated care journey—even in low-connectivity areas.",
    corePurposeTag: "Core Purpose",
    corePurposeStatement: "From first symptom to completed care request and follow-up visit.",
    fourStakeholders: "Four Healthcare Stakeholders",
    selectRoleSub: "Select a role to view the intended workflow responsibilities",
    demoPathwayTag: "Demonstration Pathway: High-Risk Maternal Care",

    // Roles
    patient: "Patient",
    healthWorker: "Health Worker",
    doctor: "Doctor",
    healthcareFacility: "Healthcare Facility / Hospital",

    // Navigation & Common Actions
    home: "Home",
    overview: "Overview",
    navigation: "Navigation",
    changeLanguage: "Change language",
    language: "Language",
    languageEnglish: "English",
    languageHindi: "Hindi",
    multilingualLocalLanguage: "Multilingual / Local language",
    localMode: "Local language mode",
    savedOnThisDevice: "Saved on this device",
    informationSavedOnThisDevice: "Essential patient and care details are saved on this phone and sent automatically when internet returns.",
    lastUpdated: "Last updated",
    todayAt: "Today at",

    // Patient Portal Header
    pregnancyWeek: "Pregnancy Week",
    yourCareOverview: "Your care overview",
    personalMaternalPortal: "Personal Maternal Care Portal",
    preferredLanguageLabel: "Preferred Language",

    // Voice Assistance Card
    voiceAssistance: "Voice assistance",
    speakInYourLanguage: "Speak In Your Language",
    askVoiceAssistant: "Ask Voice Assistant",
    voiceGuidanceRequiresReview: "Voice guidance requires doctor review",
    voicePromptExample: "Speak your symptoms naturally in your local language.",

    // Care Priority / Status Card
    carePriority: "Care Priority",
    initialHealthCheck: "Initial health check",
    highRisk: "High Risk",
    mediumRisk: "Watch / Moderate",
    lowRisk: "Low Risk",
    normal: "Normal",
    reasonsForCarePriority: "Reasons for Care Priority:",
    bloodPressureReading: "Blood pressure reading",
    hemoglobin: "Hemoglobin",
    reportedSymptoms: "Reported symptoms",
    persistentHeadache: "Persistent headache",
    blurredVision: "Blurred vision",
    moderateAnemia: "Moderate anemia",

    // Next Action Card
    whatYouShouldDoNext: "What You Should Do Next",
    visitDistrictHospital: "Visit District Hospital for specialist doctor checkup and BP monitoring",
    specialistDoctorCheckup: "Specialist doctor checkup",
    bpMonitoring: "BP monitoring",
    recommendedHospital: "Recommended Hospital / Health Center",
    healthCentre: "Health Center",
    distanceAway: "away",
    doctorAvailability: "Doctor Availability:",
    servicesAvailable: "Services Available:",
    savedInformation: "Saved information",

    // Referral Progress & Stepper
    activeCareRequestProgress: "Active Care Request Progress",
    careRequestProgress: "Care Request Progress",
    created: "Created",
    accepted: "Accepted",
    patientVisit: "Patient Visit",
    testCompleted: "Test Completed",
    treatmentStarted: "Treatment Started",
    followUpDue: "Follow-up Due",
    closed: "Closed",
    stepAccepted: "Step 2: Hospital Accepted",

    // Quick Actions & Buttons
    quickActionsHeading: "Quick Healthcare Actions",
    bookAppointment: "Book Appointment",
    uploadReport: "Upload Report",
    viewCareRequest: "View Care Request",
    viewLabTests: "View Lab Tests",
    viewMedicines: "View Medicines",
    emergencyHelp: "Emergency Help",
    viewDetails: "View details",
    submit: "Submit",
    save: "Save",
    cancel: "Cancel",
    back: "Back",
    openOverview: "Open Overview",
    requestReferral: "Request Care Transfer",
    viewNearbyFacilities: "View Nearby Hospitals",

    // Follow Up Card
    upcomingFollowUpPriority: "Upcoming Follow-up Priority",
    nextFollowUp: "Next Visit",
    followUpType: "Follow-up Type",
    reminderStatus: "Reminder Status",
    markCompleted: "Mark Completed",

    // Safety Notices
    importantSafetyNotice: "Important Safety Notice",
    aiPreliminaryNotice: "AI provides preliminary assistance only. Final clinical decisions remain with qualified health workers and doctors.",
    requiresProfessionalValidation: "Health worker or doctor review required.",

    // Facility & Emergency Cards
    emergencyProtocolTitle: "EMERGENCY ASSISTANCE PROTOCOL",
    maternalDangerSignsTitle: "Maternal Danger Signs — Get Help Immediately",
    callASHA: "Call ASHA Worker",
    viewHospitalDetails: "View Hospital Details",
    distance: "Distance",
    updated: "Updated",
    available: "Available",
    unavailable: "Unavailable",
  },
  hi: {
    // Brand & Application
    appName: "स्वास्थ्यसेतु",
    platformSubtitle: "ग्रामीण देखभाल मंच",
    tagline: "देखभाल जारी रहनी चाहिए, भले ही इंटरनेट न हो।",
    landingHeroDescription:
      "स्वास्थ्यसेतु ग्रामीण मरीजों, स्वास्थ्य कार्यकर्ताओं, डॉक्टरों और अस्पतालों को एक समन्वित देखभाल यात्रा से जोड़ता है—कम इंटरनेट वाले क्षेत्रों में भी।",
    corePurposeTag: "मुख्य उद्देश्य",
    corePurposeStatement: "पहले लक्षण से लेकर अस्पताल रेफ़रल और अगली मुलाकात पूरा होने तक।",
    fourStakeholders: "चार स्वास्थ्य सहभागी",
    selectRoleSub: "अपनी जिम्मेदारी का विवरण देखने के लिए भूमिका चुनें",
    demoPathwayTag: "प्रदर्शन मार्ग: उच्च-जोखिम मातृ देखभाल",

    // Roles
    patient: "मरीज",
    healthWorker: "स्वास्थ्य कार्यकर्ता",
    doctor: "डॉक्टर",
    healthcareFacility: "स्वास्थ्य केंद्र / अस्पताल",

    // Navigation & Common Actions
    home: "होम",
    overview: "अवलोकन",
    navigation: "नेविगेशन",
    changeLanguage: "भाषा बदलें",
    language: "भाषा",
    languageEnglish: "अंग्रेज़ी",
    languageHindi: "हिंदी",
    multilingualLocalLanguage: "बहुभाषी / स्थानीय भाषा",
    localMode: "स्थानीय भाषा मोड",
    savedOnThisDevice: "इस फोन पर सुरक्षित",
    informationSavedOnThisDevice: "जरूरी स्वास्थ्य जानकारी इस फोन पर सुरक्षित है और इंटरनेट आने पर खुद ही भेजी जाएगी।",
    lastUpdated: "आखिरी बार अपडेट",
    todayAt: "आज",

    // Patient Portal Header
    pregnancyWeek: "गर्भावस्था का सप्ताह",
    yourCareOverview: "आपकी देखभाल का विवरण",
    personalMaternalPortal: "व्यक्तिगत मातृ स्वास्थ्य पोर्टल",
    preferredLanguageLabel: "पसंदीदा भाषा",

    // Voice Assistance Card
    voiceAssistance: "आवाज़ से सहायता",
    speakInYourLanguage: "अपनी भाषा में बोलें",
    askVoiceAssistant: "आवाज़ से सहायता लें",
    voiceGuidanceRequiresReview: "आवाज़ से मिली जानकारी की डॉक्टर द्वारा समीक्षा आवश्यक है",
    voicePromptExample: "अपनी स्थानीय भाषा में अपने लक्षण सहजता से बताएं।",

    // Care Priority / Status Card
    carePriority: "देखभाल की प्राथमिकता",
    initialHealthCheck: "प्रारंभिक स्वास्थ्य जांच",
    highRisk: "अधिक जोखिम",
    mediumRisk: "मध्यम जोखिम",
    lowRisk: "कम जोखिम",
    normal: "सामान्य",
    reasonsForCarePriority: "देखभाल की प्राथमिकता के कारण:",
    bloodPressureReading: "रक्तचाप की रीडिंग",
    hemoglobin: "हीमोग्लोबिन",
    reportedSymptoms: "बताए गए लक्षण",
    persistentHeadache: "लगातार सिरदर्द",
    blurredVision: "धुंधला दिखाई देना",
    moderateAnemia: "मध्यम खून की कमी",

    // Next Action Card
    whatYouShouldDoNext: "अब आपको क्या करना चाहिए",
    visitDistrictHospital: "विशेषज्ञ डॉक्टर की जांच और बीपी जांच के लिए जिला अस्पताल जाएं",
    specialistDoctorCheckup: "विशेषज्ञ डॉक्टर से जांच",
    bpMonitoring: "रक्तचाप की जांच",
    recommendedHospital: "सुझाया गया अस्पताल / स्वास्थ्य केंद्र",
    healthCentre: "स्वास्थ्य केंद्र",
    distanceAway: "दूरी पर",
    doctorAvailability: "डॉक्टर की उपलब्धता:",
    servicesAvailable: "उपलब्ध सेवाएं:",
    savedInformation: "सुरक्षित जानकारी",

    // Referral Progress & Stepper
    activeCareRequestProgress: "सक्रिय देखभाल अनुरोध की स्थिति",
    careRequestProgress: "देखभाल अनुरोध की स्थिति",
    created: "बनाया गया",
    accepted: "स्वीकार किया गया",
    patientVisit: "मरीज की मुलाकात",
    testCompleted: "जांच पूरी",
    treatmentStarted: "इलाज शुरू",
    followUpDue: "अगली मुलाकात बाकी",
    closed: "पूरा हुआ",
    stepAccepted: "चरण 2: अस्पताल द्वारा स्वीकृत",

    // Quick Actions & Buttons
    quickActionsHeading: "त्वरित स्वास्थ्य सेवाएं",
    bookAppointment: "अपॉइंटमेंट बुक करें",
    uploadReport: "रिपोर्ट अपलोड करें",
    viewCareRequest: "रेफ़रल स्थिति देखें",
    viewLabTests: "जांच रिपोर्ट देखें",
    viewMedicines: "दवाइयां देखें",
    emergencyHelp: "आपातकालीन सहायता",
    viewDetails: "विवरण देखें",
    submit: "जमा करें",
    save: "सेव करें",
    cancel: "रद्द करें",
    back: "वापस",
    openOverview: "विवरण खोलें",
    requestReferral: "अस्पताल ट्रांसफर का अनुरोध करें",
    viewNearbyFacilities: "पास के अस्पताल देखें",

    // Follow Up Card
    upcomingFollowUpPriority: "अगली मुलाकात की प्राथमिकता",
    nextFollowUp: "अगली मुलाकात",
    followUpType: "मुलाकात का प्रकार",
    reminderStatus: "याद दिलाने की स्थिति",
    markCompleted: "पूरा हुआ बताएं",

    // Safety Notices
    importantSafetyNotice: "महत्वपूर्ण स्वास्थ्य सुरक्षा सूचना",
    aiPreliminaryNotice: "एआई केवल प्रारंभिक सहायता प्रदान करता है। अंतिम निर्णय योग्य स्वास्थ्यकर्मी या डॉक्टर ही लेंगे।",
    requiresProfessionalValidation: "स्वास्थ्यकर्मी या डॉक्टर की जांच आवश्यक है।",

    // Facility & Emergency Cards
    emergencyProtocolTitle: "आपातकालीन सहायता व्यवस्था",
    maternalDangerSignsTitle: "मातृ खतरे के लक्षण — तुरंत सहायता लें",
    callASHA: "आशा कार्यकर्ता को कॉल करें",
    viewHospitalDetails: "अस्पताल की जानकारी देखें",
    distance: "दूरी",
    updated: "अपडेट",
    available: "उपलब्ध",
    unavailable: "अनुपलब्ध",
  },
  local: {
    // Brand & Application (Local / Hinglish Mixed Mode)
    appName: "SwasthyaSetu",
    platformSubtitle: "Rural Care Portal",
    tagline: "Care shuru rahegi, connectivity na hone par bhi.",
    landingHeroDescription:
      "SwasthyaSetu connects rural patients, ASHA workers, doctors and hospitals ek sath.",
    corePurposeTag: "Main Purpose",
    corePurposeStatement: "Pehle symptom se hospital referral aur follow-up complete karne tak.",
    fourStakeholders: "4 Healthcare Stakeholders",
    selectRoleSub: "Apna role select karke dashboard kholen",
    demoPathwayTag: "Maternal Care Pathway",

    // Roles
    patient: "Patient (मरीज)",
    healthWorker: "Health Worker (आशा / ANM)",
    doctor: "Doctor (डॉक्टर)",
    healthcareFacility: "Hospital / Center (स्वास्थ्य केंद्र)",

    // Navigation & Common Actions
    home: "Home (मुख्य पृष्ठ)",
    overview: "Overview",
    navigation: "Navigation",
    changeLanguage: "Change Language",
    language: "Language",
    languageEnglish: "English",
    languageHindi: "Hindi",
    multilingualLocalLanguage: "Multilingual / Local mode",
    localMode: "Local mode active",
    savedOnThisDevice: "Device par saved",
    informationSavedOnThisDevice: "Aapka health data is phone par safe hai.",
    lastUpdated: "Last updated",
    todayAt: "Today at",

    // Patient Portal Header
    pregnancyWeek: "Pregnancy Week",
    yourCareOverview: "Your Care Overview",
    personalMaternalPortal: "Maternal Care Portal",
    preferredLanguageLabel: "Selected Language",

    // Voice Assistance Card
    voiceAssistance: "Voice Assistance (बोलकर बताएं)",
    speakInYourLanguage: "Bolkar Symptoms Batayein",
    askVoiceAssistant: "Ask Voice Assistant",
    voiceGuidanceRequiresReview: "Doctor review required for voice symptoms",
    voicePromptExample: "Apni local bhasha me bolkar symptoms batayein.",

    // Care Priority / Status Card
    carePriority: "Care Priority (जोखिम स्तर)",
    initialHealthCheck: "Initial Health Check",
    highRisk: "High Priority (अधिक जोखिम)",
    mediumRisk: "Watch / Moderate",
    lowRisk: "Low Risk (सामान्य)",
    normal: "Normal",
    reasonsForCarePriority: "Priority Reasons:",
    bloodPressureReading: "Blood pressure Reading",
    hemoglobin: "Hemoglobin",
    reportedSymptoms: "Reported symptoms",
    persistentHeadache: "Sir dard (Headache)",
    blurredVision: "Dhundhla dikhna (Blurred vision)",
    moderateAnemia: "Anemia (Khoon ki kami)",

    // Next Action Card
    whatYouShouldDoNext: "What You Should Do Next (अगला कदम)",
    visitDistrictHospital: "Hospital jakar doctor checkup aur BP check karayein",
    specialistDoctorCheckup: "Specialist doctor checkup",
    bpMonitoring: "BP Check",
    recommendedHospital: "Recommended Hospital",
    healthCentre: "Health Center",
    distanceAway: "distance",
    doctorAvailability: "Doctor Duty:",
    servicesAvailable: "Available Services:",
    savedInformation: "Saved data",

    // Referral Progress & Stepper
    activeCareRequestProgress: "Referral Progress (केस स्थिति)",
    careRequestProgress: "Care Request Progress",
    created: "Created",
    accepted: "Accepted by Hospital",
    patientVisit: "Patient Visit",
    testCompleted: "Test Done",
    treatmentStarted: "Treatment Started",
    followUpDue: "Follow-up Due",
    closed: "Closed",
    stepAccepted: "Step 2: Accepted",

    // Quick Actions & Buttons
    quickActionsHeading: "Quick Actions",
    bookAppointment: "Book Appointment",
    uploadReport: "Upload Report",
    viewCareRequest: "View Referral",
    viewLabTests: "View Lab Tests",
    viewMedicines: "View Medicines",
    emergencyHelp: "Emergency Help",
    viewDetails: "View Details",
    submit: "Submit",
    save: "Save",
    cancel: "Cancel",
    back: "Back",
    openOverview: "Open Dashboard",
    requestReferral: "Request Hospital Transfer",
    viewNearbyFacilities: "View Nearby Hospitals",

    // Follow Up Card
    upcomingFollowUpPriority: "Next Visit Schedule",
    nextFollowUp: "Next Visit",
    followUpType: "Visit Type",
    reminderStatus: "Reminder",
    markCompleted: "Mark Done",

    // Safety Notices
    importantSafetyNotice: "Safety Notice",
    aiPreliminaryNotice: "Yeh preliminary support hai. Final decision doctor hi lenge.",
    requiresProfessionalValidation: "Health worker validation needed.",

    // Facility & Emergency Cards
    emergencyProtocolTitle: "EMERGENCY HELP",
    maternalDangerSignsTitle: "Maternal Danger Signs — Get Immediate Help",
    callASHA: "Call ASHA Worker",
    viewHospitalDetails: "View Hospital Details",
    distance: "Distance",
    updated: "Updated",
    available: "Available",
    unavailable: "Unavailable",
  },
};
