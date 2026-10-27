// ─────────────────────────────────────────────────────────────────────────────
// i18n/translations.ts
// Single source of truth for every spoken/displayed string in the app.
// Adding a new language: add a new key here, update LANGUAGE_CODES below.
// ─────────────────────────────────────────────────────────────────────────────

export type Language = 'en' | 'hi' | 'mr';

export const LANGUAGE_CODES: Record<Language, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
};

export interface Strings {
  // Onboarding
  appReady: string;
  privacyNotice: string;

  // Camera screen
  scanInstruction: string;
  autoScanOn: string;
  autoScanOff: string;
  torchOn: string;
  torchOff: string;
  switchLanguage: string;
  openSettings: string;

  // Guidance cues (spoken while scanning)
  moveCloser: string;
  holdSteady: string;
  tooDark: string;
  tooBright: string;

  // Results
  result: (denomination: string) => string;
  notSure: string;
  noNote: string;
  genuineNote: string;
  fakeNoteWarning: string;
  photocopyWarning: string;

  // Currency denominations in native script
  denominations: Record<string, string>;

  // History
  historyTitle: string;
  historyEmpty: string;
  historyRead: string;
  historyClear: string;
  historyCleared: string;

  // Settings
  settingsTitle: string;
  languageLabel: string;
  confidenceLabel: string;
  autoScanLabel: string;
  consecutiveFramesLabel: string;

  // Permissions
  cameraPermissionRequest: string;
  cameraPermissionDenied: string;
  cameraPermissionGuide: string;

  // Voice missing
  voiceMissingHindi: string;
  voiceMissingMarathi: string;
  voiceFallbackEnglish: string;
  voiceInstallGuide: string;

  // Errors
  modelLoadError: string;
  inferenceError: string;
}

const en: Strings = {
  appReady: 'NoteReader is ready. Point the camera at a note and tap anywhere on the screen to scan.',
  privacyNotice: 'All scanning happens on your phone. No image ever leaves the device.',

  scanInstruction: 'Tap to scan. Double tap to repeat. Long press for settings.',
  autoScanOn: 'Auto scan is on.',
  autoScanOff: 'Auto scan is off.',
  torchOn: 'Torch on.',
  torchOff: 'Torch off.',
  switchLanguage: 'Language switched.',
  openSettings: 'Opening settings.',

  moveCloser: 'Move the note closer.',
  holdSteady: 'Hold steady.',
  tooDark: 'Too dark. Turning on the torch.',
  tooBright: 'Too bright. Try moving slightly.',

  result: (d) => `${d} rupees.`,
  notSure: 'Not sure. Please hold the note steady and try again.',
  noNote: 'No note found. Please hold the note closer to the camera.',
  genuineNote: 'Genuine note verified.',
  fakeNoteWarning: 'Warning! Suspicious note detected. Possible counterfeit or photocopy. Please check with caution.',
  photocopyWarning: 'Warning! This appears to be a photocopy, not a genuine note.',

  denominations: {
    '10':  'Ten rupees',
    '20':  'Twenty rupees',
    '50':  'Fifty rupees',
    '100': 'One hundred rupees',
    '200': 'Two hundred rupees',
    '500': 'Five hundred rupees',
  },

  historyTitle: 'Scan history.',
  historyEmpty: 'History is empty.',
  historyRead: 'Reading history.',
  historyClear: 'Clear history.',
  historyCleared: 'History cleared.',

  settingsTitle: 'Settings.',
  languageLabel: 'Language.',
  confidenceLabel: 'Confidence threshold.',
  autoScanLabel: 'Auto scan mode.',
  consecutiveFramesLabel: 'Consecutive frames required.',

  cameraPermissionRequest: 'NoteReader needs camera permission to scan currency notes. Please allow camera access.',
  cameraPermissionDenied: 'Camera access was denied. Please go to Settings and allow camera permission for NoteReader.',
  cameraPermissionGuide: 'To allow camera: open phone Settings, find NoteReader, tap Permissions, and enable Camera.',

  voiceMissingHindi: 'Hindi voice data is not installed.',
  voiceMissingMarathi: 'Marathi voice data is not installed.',
  voiceFallbackEnglish: 'Falling back to English.',
  voiceInstallGuide: 'To install voice: open phone Settings, find Text-to-speech, and download the language pack.',

  modelLoadError: 'Model could not be loaded. Please reinstall the app.',
  inferenceError: 'Scanning error. Please try again.',
};

const hi: Strings = {
  appReady: 'नोटरीडर तैयार है। कैमरे को नोट पर लाएं और स्कैन करने के लिए स्क्रीन पर कहीं भी टैप करें।',
  privacyNotice: 'सभी स्कैनिंग आपके फोन पर होती है। कोई भी फोटो डिवाइस से बाहर नहीं जाती।',

  scanInstruction: 'स्कैन करने के लिए टैप करें। दोहराने के लिए डबल टैप करें। सेटिंग्स के लिए लंबे समय तक दबाएं।',
  autoScanOn: 'ऑटो स्कैन चालू है।',
  autoScanOff: 'ऑटो स्कैन बंद है।',
  torchOn: 'टॉर्च चालू।',
  torchOff: 'टॉर्च बंद।',
  switchLanguage: 'भाषा बदली गई।',
  openSettings: 'सेटिंग्स खुल रही है।',

  moveCloser: 'नोट को कैमरे के पास लाएं।',
  holdSteady: 'हाथ स्थिर रखें।',
  tooDark: 'बहुत अंधेरा है। टॉर्च चालू कर रहे हैं।',
  tooBright: 'बहुत तेज रोशनी है। थोड़ा हटाएं।',

  result: (d) => `${d}`,
  notSure: 'सुनिश्चित नहीं। कृपया नोट को स्थिर रखें और फिर से कोशिश करें।',
  noNote: 'कोई नोट नहीं मिला। कृपया नोट को कैमरे के पास लाएं।',
  genuineNote: 'असली नोट सत्यापित।',
  fakeNoteWarning: 'सावधान! संदिग्ध नोट पाया गया। नकली या फोटोकॉपी हो सकता है। कृपया सावधानी से जाँचें।',
  photocopyWarning: 'सावधान! यह एक फोटोकॉपी लग रही है, असली नोट नहीं।',

  denominations: {
    '10':  'दस रुपये',
    '20':  'बीस रुपये',
    '50':  'पचास रुपये',
    '100': 'एक सौ रुपये',
    '200': 'दो सौ रुपये',
    '500': 'पाँच सौ रुपये',
  },

  historyTitle: 'स्कैन इतिहास।',
  historyEmpty: 'इतिहास खाली है।',
  historyRead: 'इतिहास पढ़ रहे हैं।',
  historyClear: 'इतिहास मिटाएं।',
  historyCleared: 'इतिहास मिटा दिया।',

  settingsTitle: 'सेटिंग्स।',
  languageLabel: 'भाषा।',
  confidenceLabel: 'विश्वास सीमा।',
  autoScanLabel: 'ऑटो स्कैन मोड।',
  consecutiveFramesLabel: 'आवश्यक लगातार फ्रेम।',

  cameraPermissionRequest: 'नोटरीडर को नोट स्कैन करने के लिए कैमरा अनुमति चाहिए। कृपया कैमरा एक्सेस दें।',
  cameraPermissionDenied: 'कैमरा एक्सेस अस्वीकार किया गया। सेटिंग्स में जाकर नोटरीडर के लिए कैमरा अनुमति दें।',
  cameraPermissionGuide: 'कैमरा अनुमति देने के लिए: फोन सेटिंग्स खोलें, नोटरीडर ढूंढें, अनुमतियाँ पर टैप करें, और कैमरा सक्षम करें।',

  voiceMissingHindi: 'हिंदी आवाज डेटा इंस्टॉल नहीं है।',
  voiceMissingMarathi: 'मराठी आवाज डेटा इंस्टॉल नहीं है।',
  voiceFallbackEnglish: 'अंग्रेजी पर वापस आ रहे हैं।',
  voiceInstallGuide: 'आवाज इंस्टॉल करने के लिए: फोन सेटिंग्स खोलें, टेक्स्ट-टू-स्पीच ढूंढें, और भाषा पैक डाउनलोड करें।',

  modelLoadError: 'मॉडल लोड नहीं हो सका। कृपया ऐप पुनः इंस्टॉल करें।',
  inferenceError: 'स्कैनिंग त्रुटि। कृपया पुनः प्रयास करें।',
};

const mr: Strings = {
  appReady: 'नोटरीडर तयार आहे। कॅमेरा नोटवर धरा आणि स्कॅन करण्यासाठी स्क्रीनवर कुठेही टॅप करा।',
  privacyNotice: 'सर्व स्कॅनिंग तुमच्या फोनवर होते. कोणतेही छायाचित्र डिव्हाइस सोडत नाही.',

  scanInstruction: 'स्कॅन करण्यासाठी टॅप करा. पुन्हा ऐकण्यासाठी दोनदा टॅप करा. सेटिंग्जसाठी दीर्घ दाबा.',
  autoScanOn: 'ऑटो स्कॅन चालू आहे.',
  autoScanOff: 'ऑटो स्कॅन बंद आहे.',
  torchOn: 'टॉर्च चालू.',
  torchOff: 'टॉर्च बंद.',
  switchLanguage: 'भाषा बदलली.',
  openSettings: 'सेटिंग्ज उघडत आहे.',

  moveCloser: 'नोट कॅमेऱ्याजवळ आणा.',
  holdSteady: 'हात स्थिर ठेवा.',
  tooDark: 'खूप अंधार आहे. टॉर्च चालू करत आहे.',
  tooBright: 'खूप जास्त प्रकाश आहे. थोडे बाजूला करा.',

  result: (d) => `${d}`,
  notSure: 'खात्री नाही. नोट स्थिर धरा आणि पुन्हा प्रयत्न करा.',
  noNote: 'कोणतीही नोट सापडली नाही. नोट कॅमेऱ्याजवळ आणा.',
  genuineNote: 'खऱ्या नोटेची पुष्टी झाली.',
  fakeNoteWarning: 'सावधान! संशयास्पद नोट आढळली. बनावट किंवा फोटोकॉपी असण्याची शक्यता आहे. कृपया काळजीपूर्वक तपासा.',
  photocopyWarning: 'सावधान! ही फोटोकॉपी वाटते, खरी नोट नाही.',

  denominations: {
    '10':  'दहा रुपये',
    '20':  'वीस रुपये',
    '50':  'पन्नास रुपये',
    '100': 'शंभर रुपये',
    '200': 'दोनशे रुपये',
    '500': 'पाचशे रुपये',
  },

  historyTitle: 'स्कॅन इतिहास.',
  historyEmpty: 'इतिहास रिकामा आहे.',
  historyRead: 'इतिहास वाचत आहे.',
  historyClear: 'इतिहास साफ करा.',
  historyCleared: 'इतिहास साफ केला.',

  settingsTitle: 'सेटिंग्ज.',
  languageLabel: 'भाषा.',
  confidenceLabel: 'विश्वास मर्यादा.',
  autoScanLabel: 'ऑटो स्कॅन मोड.',
  consecutiveFramesLabel: 'आवश्यक सलग फ्रेम.',

  cameraPermissionRequest: 'नोट स्कॅन करण्यासाठी नोटरीडरला कॅमेरा परवानगी हवी आहे. कृपया कॅमेरा प्रवेश द्या.',
  cameraPermissionDenied: 'कॅमेरा प्रवेश नाकारला गेला. सेटिंग्जमध्ये जाऊन नोटरीडरसाठी कॅमेरा परवानगी द्या.',
  cameraPermissionGuide: 'कॅमेरा परवानगी देण्यासाठी: फोन सेटिंग्ज उघडा, नोटरीडर शोधा, परवानग्यांवर टॅप करा, आणि कॅमेरा सक्षम करा.',

  voiceMissingHindi: 'हिंदी आवाज डेटा स्थापित नाही.',
  voiceMissingMarathi: 'मराठी आवाज डेटा स्थापित नाही.',
  voiceFallbackEnglish: 'इंग्रजीवर परत येत आहे.',
  voiceInstallGuide: 'आवाज स्थापित करण्यासाठी: फोन सेटिंग्ज उघडा, टेक्स्ट-टू-स्पीच शोधा, आणि भाषा पॅक डाउनलोड करा.',

  modelLoadError: 'मॉडेल लोड होऊ शकले नाही. कृपया ॲप पुन्हा स्थापित करा.',
  inferenceError: 'स्कॅनिंग त्रुटी. कृपया पुन्हा प्रयत्न करा.',
};

export const TRANSLATIONS: Record<Language, Strings> = { en, hi, mr };

export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  hi: 'हिंदी',
  mr: 'मराठी',
};

/** Get the native spoken label for a denomination in the given language */
export function getDenominationLabel(denomination: string, lang: Language): string {
  return TRANSLATIONS[lang].denominations[denomination] ?? denomination;
}
