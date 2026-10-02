// Guided-tour and Help & Support text. These entries are spread into the
// existing `translationDictionary` (see translations.ts), so they are read
// through the same `useLanguage().t(key)` as every other string. A missing
// key falls back to English automatically.

export type TourTextMap = Record<string, string>;

const en: TourTextMap = {
  // Welcome + controls
  "tour.welcome.title": "Welcome to SwasthyaSetu!",
  "tour.welcome.description":
    "Let us show you around and help you discover the healthcare services available to you.",
  "tour.welcome.start": "Start Tour",
  "tour.welcome.skip": "Skip",
  "tour.ui.next": "Next",
  "tour.ui.back": "Back",
  "tour.ui.skip": "Skip Tour",
  "tour.ui.finish": "Finish",
  "tour.ui.stepOf": "{current} of {total}",
  "tour.ui.dialogLabel": "SwasthyaSetu guided tour",
  "tour.restart": "Take a Tour Again",

  // Patient
  "tour.dashboard.title": "Your dashboard",
  "tour.dashboard.description":
    "This is your SwasthyaSetu dashboard. You can access your healthcare journey and important health information from here.",
  "tour.journey.title": "Your health journey",
  "tour.journey.description":
    "This area shows your personal healthcare journey, step by step, so you always know what comes next.",
  "tour.appointments.title": "Book an appointment",
  "tour.appointments.description":
    "Find healthcare services and book an appointment with a doctor or facility here.",
  "tour.teleconsultation.title": "Talk to a doctor from home",
  "tour.teleconsultation.description":
    "When you book an appointment, you can choose Teleconsultation to speak with an eligible doctor remotely.",
  "tour.records.title": "Your health records",
  "tour.records.description":
    "Open your health records and healthcare information whenever you need them.",
  "tour.referrals.title": "Care requests",
  "tour.referrals.description":
    "Track your referrals and see the next steps in your care journey.",
  "tour.medicines.title": "Medicines",
  "tour.medicines.description":
    "See your medicines and check whether they are available at nearby facilities.",
  "tour.followUps.title": "Next visits",
  "tour.followUps.description":
    "See your follow-up visits so you do not miss your next check-up.",

  // Health worker
  "tour.hw.dashboard.title": "Health worker dashboard",
  "tour.hw.dashboard.description":
    "This is your dashboard. See your patients, care requests and work for the day in one place.",
  "tour.hw.register.title": "Register a patient",
  "tour.hw.register.description": "Add a new patient to SwasthyaSetu from here.",
  "tour.hw.patients.title": "Patient records",
  "tour.hw.patients.description":
    "Open the list of your patients and view their records.",
  "tour.hw.triage.title": "Health check (triage)",
  "tour.hw.triage.description":
    "Choose a patient to record a health check and see how urgent their care is.",
  "tour.hw.highRisk.title": "Patients needing urgent attention",
  "tour.hw.highRisk.description":
    "See the patients who need your attention first.",
  "tour.hw.referrals.title": "Care requests (referrals)",
  "tour.hw.referrals.description":
    "Send and track care requests that move patients to the right doctor or facility.",
  "tour.hw.followUps.title": "Visits due and missed",
  "tour.hw.followUps.description":
    "Find patients whose follow-up visits are due or missed, so no one is left behind.",
  "tour.hw.queue.title": "Facility queue",
  "tour.hw.queue.description":
    "Add a patient to a facility's waiting queue and see which doctor and facility they are going to.",

  // Doctor
  "tour.doctor.dashboard.title": "Doctor dashboard",
  "tour.doctor.dashboard.description":
    "This is your dashboard. See patients waiting for review, care requests and open time slots.",
  "tour.doctor.review.title": "Patients to review",
  "tour.doctor.review.description":
    "See the patients who are waiting for your review, with urgent ones first.",
  "tour.doctor.schedule.title": "Appointments",
  "tour.doctor.schedule.description":
    "Check today's schedule and your appointments here.",
  "tour.doctor.records.title": "Patient records",
  "tour.doctor.records.description":
    "Open a patient's record to see their history before you consult.",
  "tour.doctor.consult.title": "Consultations",
  "tour.doctor.consult.description":
    "Accept teleconsultation requests and start video consultations. A number shows requests waiting for you.",
  "tour.doctor.referrals.title": "Care requests (referrals)",
  "tour.doctor.referrals.description":
    "See care requests sent to you and respond to them.",
  "tour.doctor.queue.title": "Your patient queue",
  "tour.doctor.queue.description":
    "See the patients waiting in your queue and call the next one.",

  // Shared: help
  "tour.help.title": "Help and support",
  "tour.help.description":
    "If you need help using SwasthyaSetu, tap here to contact our support team.",

  // Help & Support panel
  "support.button": "Need Help?",
  "support.navLabel": "Help",
  "support.title": "Need Help?",
  "support.intro": "Having trouble using SwasthyaSetu?",
  "support.callPrompt": "Call our toll-free support number:",
  "support.callNow": "Call Now",
  "support.unavailable": "Support number currently unavailable.",
  "support.emailLabel": "Or email us:",
  "support.helpWithHeading": "You can contact support for help with:",
  "support.help.use": "Using SwasthyaSetu",
  "support.help.appointments": "Booking appointments",
  "support.help.teleconsultation": "Teleconsultation",
  "support.help.referrals": "Referrals",
  "support.help.navigation": "Finding healthcare services",
  "support.emergencyNote":
    "This number is only for help using SwasthyaSetu. It is not an emergency service. In a medical emergency, call 108 or use Emergency Help right away.",
  "support.close": "Close",
};

const hi: TourTextMap = {
  "tour.welcome.title": "स्वास्थ्यसेतु में आपका स्वागत है!",
  "tour.welcome.description":
    "हम आपको यहाँ घुमाकर दिखाएँगे और आपके लिए उपलब्ध स्वास्थ्य सेवाओं को समझने में मदद करेंगे।",
  "tour.welcome.start": "टूर शुरू करें",
  "tour.welcome.skip": "छोड़ें",
  "tour.ui.next": "आगे",
  "tour.ui.back": "पीछे",
  "tour.ui.skip": "टूर छोड़ें",
  "tour.ui.finish": "समाप्त करें",
  "tour.ui.stepOf": "{total} में से {current}",
  "tour.ui.dialogLabel": "स्वास्थ्यसेतु गाइडेड टूर",
  "tour.restart": "टूर फिर से देखें",

  "tour.dashboard.title": "आपका डैशबोर्ड",
  "tour.dashboard.description":
    "यह आपका डैशबोर्ड है। यहाँ से आप अपनी स्वास्थ्य सेवाओं और महत्वपूर्ण स्वास्थ्य जानकारी को देख सकते हैं।",
  "tour.journey.title": "आपकी स्वास्थ्य यात्रा",
  "tour.journey.description":
    "यहाँ आपकी अपनी स्वास्थ्य यात्रा चरण-दर-चरण दिखती है, ताकि आपको पता रहे कि आगे क्या होना है।",
  "tour.appointments.title": "अपॉइंटमेंट बुक करें",
  "tour.appointments.description":
    "यहाँ आप स्वास्थ्य सेवाएँ खोज सकते हैं और डॉक्टर या अस्पताल में अपॉइंटमेंट बुक कर सकते हैं।",
  "tour.teleconsultation.title": "घर बैठे डॉक्टर से बात करें",
  "tour.teleconsultation.description":
    "अपॉइंटमेंट बुक करते समय आप टेलीकंसल्टेशन चुन सकते हैं और योग्य डॉक्टर से दूर से बात कर सकते हैं।",
  "tour.records.title": "आपके स्वास्थ्य रिकॉर्ड",
  "tour.records.description":
    "जब भी ज़रूरत हो, अपने स्वास्थ्य रिकॉर्ड और स्वास्थ्य जानकारी यहाँ देखें।",
  "tour.referrals.title": "देखभाल अनुरोध",
  "tour.referrals.description":
    "अपने रेफ़रल देखें और जानें कि आपकी देखभाल में आगे क्या होगा।",
  "tour.medicines.title": "दवाइयाँ",
  "tour.medicines.description":
    "अपनी दवाइयाँ देखें और जानें कि वे आस-पास के अस्पतालों में उपलब्ध हैं या नहीं।",
  "tour.followUps.title": "अगली मुलाकातें",
  "tour.followUps.description":
    "अपनी अगली जाँच की तारीख़ें देखें ताकि कोई मुलाकात छूट न जाए।",

  "tour.hw.dashboard.title": "स्वास्थ्य कार्यकर्ता डैशबोर्ड",
  "tour.hw.dashboard.description":
    "यह आपका डैशबोर्ड है। अपने मरीज़, देखभाल अनुरोध और आज का काम एक ही जगह देखें।",
  "tour.hw.register.title": "मरीज़ पंजीकृत करें",
  "tour.hw.register.description": "यहाँ से स्वास्थ्यसेतु में नया मरीज़ जोड़ें।",
  "tour.hw.patients.title": "मरीज़ों के रिकॉर्ड",
  "tour.hw.patients.description": "अपने मरीज़ों की सूची खोलें और उनके रिकॉर्ड देखें।",
  "tour.hw.triage.title": "स्वास्थ्य जाँच (ट्राइएज)",
  "tour.hw.triage.description":
    "किसी मरीज़ को चुनकर उसकी स्वास्थ्य जाँच दर्ज करें और देखें कि देखभाल कितनी ज़रूरी है।",
  "tour.hw.highRisk.title": "तुरंत ध्यान चाहने वाले मरीज़",
  "tour.hw.highRisk.description": "वे मरीज़ देखें जिन पर सबसे पहले ध्यान देना है।",
  "tour.hw.referrals.title": "देखभाल अनुरोध (रेफ़रल)",
  "tour.hw.referrals.description":
    "मरीज़ों को सही डॉक्टर या अस्पताल तक पहुँचाने वाले देखभाल अनुरोध भेजें और उन पर नज़र रखें।",
  "tour.hw.followUps.title": "देय और छूटी हुई मुलाकातें",
  "tour.hw.followUps.description":
    "उन मरीज़ों को खोजें जिनकी अगली मुलाकात देय है या छूट गई है, ताकि कोई पीछे न रहे।",
  "tour.hw.queue.title": "अस्पताल की कतार",
  "tour.hw.queue.description":
    "मरीज़ को अस्पताल की प्रतीक्षा कतार में जोड़ें और देखें कि वे किस डॉक्टर और अस्पताल में जा रहे हैं।",

  "tour.doctor.dashboard.title": "डॉक्टर डैशबोर्ड",
  "tour.doctor.dashboard.description":
    "यह आपका डैशबोर्ड है। समीक्षा के इंतज़ार में मरीज़, देखभाल अनुरोध और खाली समय देखें।",
  "tour.doctor.review.title": "समीक्षा के लिए मरीज़",
  "tour.doctor.review.description":
    "वे मरीज़ देखें जो आपकी समीक्षा का इंतज़ार कर रहे हैं, ज़रूरी मरीज़ सबसे ऊपर।",
  "tour.doctor.schedule.title": "अपॉइंटमेंट",
  "tour.doctor.schedule.description": "यहाँ आज का कार्यक्रम और अपने अपॉइंटमेंट देखें।",
  "tour.doctor.records.title": "मरीज़ों के रिकॉर्ड",
  "tour.doctor.records.description":
    "परामर्श से पहले मरीज़ का रिकॉर्ड खोलकर उनका इतिहास देखें।",
  "tour.doctor.consult.title": "परामर्श",
  "tour.doctor.consult.description":
    "टेलीकंसल्टेशन अनुरोध स्वीकार करें और वीडियो परामर्श शुरू करें। आपके इंतज़ार में अनुरोधों की संख्या दिखती है।",
  "tour.doctor.referrals.title": "देखभाल अनुरोध (रेफ़रल)",
  "tour.doctor.referrals.description":
    "आपको भेजे गए देखभाल अनुरोध देखें और उन पर जवाब दें।",
  "tour.doctor.queue.title": "आपकी मरीज़ कतार",
  "tour.doctor.queue.description":
    "अपनी कतार में प्रतीक्षा कर रहे मरीज़ देखें और अगले मरीज़ को बुलाएँ।",

  "tour.help.title": "मदद और सहायता",
  "tour.help.description":
    "स्वास्थ्यसेतु इस्तेमाल करने में मदद चाहिए तो यहाँ दबाकर हमारी सहायता टीम से संपर्क करें।",

  "support.button": "मदद चाहिए?",
  "support.navLabel": "मदद",
  "support.title": "मदद चाहिए?",
  "support.intro": "क्या स्वास्थ्यसेतु इस्तेमाल करने में परेशानी हो रही है?",
  "support.callPrompt": "हमारे टोल-फ़्री सहायता नंबर पर कॉल करें:",
  "support.callNow": "अभी कॉल करें",
  "support.unavailable": "सहायता नंबर अभी उपलब्ध नहीं है।",
  "support.emailLabel": "या हमें ईमेल करें:",
  "support.helpWithHeading": "इन बातों में आप सहायता से संपर्क कर सकते हैं:",
  "support.help.use": "स्वास्थ्यसेतु का उपयोग",
  "support.help.appointments": "अपॉइंटमेंट बुक करना",
  "support.help.teleconsultation": "टेलीकंसल्टेशन",
  "support.help.referrals": "रेफ़रल",
  "support.help.navigation": "स्वास्थ्य सेवाएँ खोजना",
  "support.emergencyNote":
    "यह नंबर केवल स्वास्थ्यसेतु इस्तेमाल करने में मदद के लिए है। यह आपातकालीन सेवा नहीं है। चिकित्सा आपात स्थिति में तुरंत 108 पर कॉल करें या आपातकालीन सहायता का उपयोग करें।",
  "support.close": "बंद करें",
};

const mr: TourTextMap = {
  "tour.welcome.title": "स्वास्थ्यसेतूमध्ये आपले स्वागत आहे!",
  "tour.welcome.description":
    "आम्ही तुम्हाला सर्व काही फिरून दाखवू आणि तुम्हाला उपलब्ध असलेल्या आरोग्य सेवा समजून घ्यायला मदत करू.",
  "tour.welcome.start": "टूर सुरू करा",
  "tour.welcome.skip": "वगळा",
  "tour.ui.next": "पुढे",
  "tour.ui.back": "मागे",
  "tour.ui.skip": "टूर वगळा",
  "tour.ui.finish": "पूर्ण करा",
  "tour.ui.stepOf": "{total} पैकी {current}",
  "tour.ui.dialogLabel": "स्वास्थ्यसेतू मार्गदर्शक टूर",
  "tour.restart": "टूर पुन्हा पहा",

  "tour.dashboard.title": "तुमचा डॅशबोर्ड",
  "tour.dashboard.description":
    "हा तुमचा डॅशबोर्ड आहे. येथून तुम्ही तुमच्या आरोग्य सेवा आणि महत्त्वाची आरोग्य माहिती पाहू शकता.",
  "tour.journey.title": "तुमचा आरोग्य प्रवास",
  "tour.journey.description":
    "येथे तुमचा स्वतःचा आरोग्य प्रवास टप्प्याटप्प्याने दिसतो, म्हणजे पुढे काय होणार हे तुम्हाला नेहमी कळते.",
  "tour.appointments.title": "अपॉइंटमेंट बुक करा",
  "tour.appointments.description":
    "येथे तुम्ही आरोग्य सेवा शोधू शकता आणि डॉक्टर किंवा रुग्णालयात अपॉइंटमेंट बुक करू शकता.",
  "tour.teleconsultation.title": "घरबसल्या डॉक्टरांशी बोला",
  "tour.teleconsultation.description":
    "अपॉइंटमेंट बुक करताना तुम्ही टेलीकन्सल्टेशन निवडून पात्र डॉक्टरांशी दुरून बोलू शकता.",
  "tour.records.title": "तुमच्या आरोग्य नोंदी",
  "tour.records.description":
    "गरज असेल तेव्हा तुमच्या आरोग्य नोंदी आणि आरोग्य माहिती येथे पहा.",
  "tour.referrals.title": "काळजी विनंत्या",
  "tour.referrals.description":
    "तुमचे रेफरल पहा आणि तुमच्या काळजीच्या प्रवासात पुढे काय आहे ते जाणून घ्या.",
  "tour.medicines.title": "औषधे",
  "tour.medicines.description":
    "तुमची औषधे पहा आणि जवळच्या रुग्णालयांत ती उपलब्ध आहेत का ते तपासा.",
  "tour.followUps.title": "पुढील भेटी",
  "tour.followUps.description":
    "तुमच्या पुढील तपासणीच्या तारखा पहा, म्हणजे कोणतीही भेट चुकणार नाही.",

  "tour.hw.dashboard.title": "आरोग्य कार्यकर्ता डॅशबोर्ड",
  "tour.hw.dashboard.description":
    "हा तुमचा डॅशबोर्ड आहे. तुमचे रुग्ण, काळजी विनंत्या आणि आजचे काम एकाच ठिकाणी पहा.",
  "tour.hw.register.title": "रुग्ण नोंदवा",
  "tour.hw.register.description": "येथून स्वास्थ्यसेतूमध्ये नवीन रुग्ण जोडा.",
  "tour.hw.patients.title": "रुग्णांच्या नोंदी",
  "tour.hw.patients.description": "तुमच्या रुग्णांची यादी उघडा आणि त्यांच्या नोंदी पहा.",
  "tour.hw.triage.title": "आरोग्य तपासणी (ट्रायाज)",
  "tour.hw.triage.description":
    "रुग्ण निवडून त्यांची आरोग्य तपासणी नोंदवा आणि काळजी किती तातडीची आहे ते पहा.",
  "tour.hw.highRisk.title": "तातडीने लक्ष हवे असलेले रुग्ण",
  "tour.hw.highRisk.description": "ज्या रुग्णांकडे सर्वात आधी लक्ष द्यायचे आहे ते पहा.",
  "tour.hw.referrals.title": "काळजी विनंत्या (रेफरल)",
  "tour.hw.referrals.description":
    "रुग्णांना योग्य डॉक्टर किंवा रुग्णालयापर्यंत पोहोचवणाऱ्या काळजी विनंत्या पाठवा आणि त्यांचा मागोवा घ्या.",
  "tour.hw.followUps.title": "येणाऱ्या आणि चुकलेल्या भेटी",
  "tour.hw.followUps.description":
    "ज्यांची पुढची भेट देय आहे किंवा चुकली आहे असे रुग्ण शोधा, म्हणजे कोणीही मागे राहणार नाही.",
  "tour.hw.queue.title": "रुग्णालयाची रांग",
  "tour.hw.queue.description":
    "रुग्णाला रुग्णालयाच्या प्रतीक्षा रांगेत जोडा आणि ते कोणत्या डॉक्टर व रुग्णालयात जात आहेत ते पहा.",

  "tour.doctor.dashboard.title": "डॉक्टर डॅशबोर्ड",
  "tour.doctor.dashboard.description":
    "हा तुमचा डॅशबोर्ड आहे. तपासणीची वाट पाहणारे रुग्ण, काळजी विनंत्या आणि रिकामा वेळ पहा.",
  "tour.doctor.review.title": "तपासणीसाठी रुग्ण",
  "tour.doctor.review.description":
    "तुमच्या तपासणीची वाट पाहणारे रुग्ण पहा, तातडीचे रुग्ण सर्वात वर.",
  "tour.doctor.schedule.title": "अपॉइंटमेंट",
  "tour.doctor.schedule.description": "येथे आजचे वेळापत्रक आणि तुमच्या अपॉइंटमेंट पहा.",
  "tour.doctor.records.title": "रुग्णांच्या नोंदी",
  "tour.doctor.records.description":
    "सल्ला देण्यापूर्वी रुग्णाची नोंद उघडून त्यांचा इतिहास पहा.",
  "tour.doctor.consult.title": "सल्लामसलत",
  "tour.doctor.consult.description":
    "टेलीकन्सल्टेशन विनंत्या स्वीकारा आणि व्हिडिओ सल्लामसलत सुरू करा. तुमच्यासाठी थांबलेल्या विनंत्यांची संख्या दिसते.",
  "tour.doctor.referrals.title": "काळजी विनंत्या (रेफरल)",
  "tour.doctor.referrals.description":
    "तुम्हाला पाठवलेल्या काळजी विनंत्या पहा आणि त्यांना उत्तर द्या.",
  "tour.doctor.queue.title": "तुमची रुग्ण रांग",
  "tour.doctor.queue.description":
    "तुमच्या रांगेत थांबलेले रुग्ण पहा आणि पुढच्या रुग्णाला बोलवा.",

  "tour.help.title": "मदत आणि सहाय्य",
  "tour.help.description":
    "स्वास्थ्यसेतू वापरण्यात मदत हवी असल्यास येथे दाबून आमच्या सहाय्य टीमशी संपर्क साधा.",

  "support.button": "मदत हवी आहे?",
  "support.navLabel": "मदत",
  "support.title": "मदत हवी आहे?",
  "support.intro": "स्वास्थ्यसेतू वापरताना अडचण येत आहे का?",
  "support.callPrompt": "आमच्या टोल-फ्री सहाय्य क्रमांकावर कॉल करा:",
  "support.callNow": "आता कॉल करा",
  "support.unavailable": "सहाय्य क्रमांक सध्या उपलब्ध नाही.",
  "support.emailLabel": "किंवा आम्हाला ईमेल करा:",
  "support.helpWithHeading": "या गोष्टींसाठी तुम्ही सहाय्याशी संपर्क साधू शकता:",
  "support.help.use": "स्वास्थ्यसेतू वापरणे",
  "support.help.appointments": "अपॉइंटमेंट बुक करणे",
  "support.help.teleconsultation": "टेलीकन्सल्टेशन",
  "support.help.referrals": "रेफरल",
  "support.help.navigation": "आरोग्य सेवा शोधणे",
  "support.emergencyNote":
    "हा क्रमांक फक्त स्वास्थ्यसेतू वापरण्यासाठी मदतीसाठी आहे. ही आपत्कालीन सेवा नाही. वैद्यकीय आणीबाणीत लगेच 108 वर कॉल करा किंवा आपत्कालीन मदत वापरा.",
  "support.close": "बंद करा",
};

// The existing "local" option is Roman-script Hindi (Hinglish), matching the
// rest of its dictionary.
const local: TourTextMap = {
  "tour.welcome.title": "SwasthyaSetu me aapka swagat hai!",
  "tour.welcome.description":
    "Hum aapko yahan ghumakar dikhayenge aur aapke liye uplabdh swasthya sevaon ko samajhne me madad karenge.",
  "tour.welcome.start": "Tour shuru karein",
  "tour.welcome.skip": "Chhodein",
  "tour.ui.next": "Aage",
  "tour.ui.back": "Peeche",
  "tour.ui.skip": "Tour chhodein",
  "tour.ui.finish": "Khatam karein",
  "tour.ui.stepOf": "{total} me se {current}",
  "tour.ui.dialogLabel": "SwasthyaSetu guided tour",
  "tour.restart": "Tour phir se dekhein",

  "tour.dashboard.title": "Aapka dashboard",
  "tour.dashboard.description":
    "Yeh aapka dashboard hai. Yahan se aap apni swasthya sevayein aur zaroori swasthya jaankari dekh sakte hain.",
  "tour.journey.title": "Aapki swasthya yatra",
  "tour.journey.description":
    "Yahan aapki apni swasthya yatra step-by-step dikhti hai, taaki aapko pata rahe ki aage kya hona hai.",
  "tour.appointments.title": "Appointment book karein",
  "tour.appointments.description":
    "Yahan aap swasthya sevayein dhoondh sakte hain aur doctor ya hospital me appointment book kar sakte hain.",
  "tour.teleconsultation.title": "Ghar baithe doctor se baat karein",
  "tour.teleconsultation.description":
    "Appointment book karte samay aap Teleconsultation chun kar yogya doctor se door se baat kar sakte hain.",
  "tour.records.title": "Aapke swasthya records",
  "tour.records.description":
    "Zarurat padne par apne swasthya records aur jaankari yahan dekhein.",
  "tour.referrals.title": "Care requests",
  "tour.referrals.description":
    "Apne referral dekhein aur jaanein ki aapki dekhbhal me aage kya hoga.",
  "tour.medicines.title": "Dawaiyan",
  "tour.medicines.description":
    "Apni dawaiyan dekhein aur jaanein ki woh paas ke hospital me milti hain ya nahi.",
  "tour.followUps.title": "Agli mulaqatein",
  "tour.followUps.description":
    "Apni agli jaanch ki tareekhein dekhein, taaki koi visit chhoot na jaye.",

  "tour.hw.dashboard.title": "Health worker dashboard",
  "tour.hw.dashboard.description":
    "Yeh aapka dashboard hai. Apne mareez, care requests aur aaj ka kaam ek hi jagah dekhein.",
  "tour.hw.register.title": "Mareez register karein",
  "tour.hw.register.description": "Yahan se SwasthyaSetu me naya mareez jodein.",
  "tour.hw.patients.title": "Mareezon ke records",
  "tour.hw.patients.description": "Apne mareezon ki list kholein aur unke records dekhein.",
  "tour.hw.triage.title": "Health check (triage)",
  "tour.hw.triage.description":
    "Mareez chun kar uski health check darj karein aur dekhein ki dekhbhal kitni zaroori hai.",
  "tour.hw.highRisk.title": "Turant dhyan chahne wale mareez",
  "tour.hw.highRisk.description": "Woh mareez dekhein jin par sabse pehle dhyan dena hai.",
  "tour.hw.referrals.title": "Care requests (referral)",
  "tour.hw.referrals.description":
    "Mareezon ko sahi doctor ya hospital tak pahunchane wali care requests bhejein aur track karein.",
  "tour.hw.followUps.title": "Baaki aur chhooti hui visits",
  "tour.hw.followUps.description":
    "Un mareezon ko dhoondhein jinki agli visit baaki hai ya chhoot gayi hai, taaki koi peeche na rahe.",
  "tour.hw.queue.title": "Hospital queue",
  "tour.hw.queue.description":
    "Mareez ko hospital ki waiting queue me jodein aur dekhein ki woh kis doctor aur hospital me ja rahe hain.",

  "tour.doctor.dashboard.title": "Doctor dashboard",
  "tour.doctor.dashboard.description":
    "Yeh aapka dashboard hai. Review ka intezaar karte mareez, care requests aur khaali time slots dekhein.",
  "tour.doctor.review.title": "Review ke liye mareez",
  "tour.doctor.review.description":
    "Woh mareez dekhein jo aapke review ka intezaar kar rahe hain, zaroori mareez sabse upar.",
  "tour.doctor.schedule.title": "Appointments",
  "tour.doctor.schedule.description": "Yahan aaj ka schedule aur apne appointments dekhein.",
  "tour.doctor.records.title": "Mareezon ke records",
  "tour.doctor.records.description":
    "Consult se pehle mareez ka record kholkar unka itihaas dekhein.",
  "tour.doctor.consult.title": "Consultations",
  "tour.doctor.consult.description":
    "Teleconsultation requests accept karein aur video consultation shuru karein. Aapke intezaar me requests ki sankhya dikhti hai.",
  "tour.doctor.referrals.title": "Care requests (referral)",
  "tour.doctor.referrals.description":
    "Aapko bheji gayi care requests dekhein aur unka jawab dein.",
  "tour.doctor.queue.title": "Aapki mareez queue",
  "tour.doctor.queue.description":
    "Aapki queue me intezaar kar rahe mareez dekhein aur agle mareez ko bulayein.",

  "tour.help.title": "Madad aur support",
  "tour.help.description":
    "SwasthyaSetu use karne me madad chahiye to yahan dabakar hamari support team se sampark karein.",

  "support.button": "Madad chahiye?",
  "support.navLabel": "Madad",
  "support.title": "Madad chahiye?",
  "support.intro": "Kya SwasthyaSetu use karne me pareshani ho rahi hai?",
  "support.callPrompt": "Hamare toll-free support number par call karein:",
  "support.callNow": "Abhi call karein",
  "support.unavailable": "Support number abhi uplabdh nahi hai.",
  "support.emailLabel": "Ya hamein email karein:",
  "support.helpWithHeading": "In baaton me aap support se sampark kar sakte hain:",
  "support.help.use": "SwasthyaSetu ka upyog",
  "support.help.appointments": "Appointment book karna",
  "support.help.teleconsultation": "Teleconsultation",
  "support.help.referrals": "Referral",
  "support.help.navigation": "Swasthya sevayein dhoondhna",
  "support.emergencyNote":
    "Yeh number sirf SwasthyaSetu use karne me madad ke liye hai. Yeh emergency service nahi hai. Medical emergency me turant 108 par call karein ya Emergency Help use karein.",
  "support.close": "Band karein",
};

export const tourTranslations = { en, hi, mr, local };
