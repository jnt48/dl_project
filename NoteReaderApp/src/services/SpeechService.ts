// ─────────────────────────────────────────────────────────────────────────────
// services/SpeechService.ts
//
// Wraps expo-speech to provide language-aware TTS.
// Checks at startup whether the requested language voice is installed,
// and falls back to English if it is not.
// ─────────────────────────────────────────────────────────────────────────────

import * as Speech from 'expo-speech';
import { Language, LANGUAGE_CODES } from '../i18n/translations';

type VoiceAvailability = Record<Language, boolean>;

class SpeechService {
  private voiceAvailability: VoiceAvailability = { en: true, hi: false, mr: false };
  private currentLang: Language = 'en';
  private isSpeaking = false;

  /**
   * Check which TTS voices are installed.
   * expo-speech.getAvailableVoicesAsync() returns available voices.
   * If the BCP-47 language code is not present, we warn and fall back.
   */
  async checkVoiceAvailability(): Promise<VoiceAvailability> {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      const langs = voices.map((v) => v.language?.toLowerCase() ?? '');

      this.voiceAvailability = {
        en: true, // English is always available as the system default
        hi: langs.some((l) => l.startsWith('hi')),
        mr: langs.some((l) => l.startsWith('mr')),
      };
    } catch {
      // getAvailableVoicesAsync can throw on some Android versions.
      // Assume English only and let the app continue.
      this.voiceAvailability = { en: true, hi: false, mr: false };
    }
    return this.voiceAvailability;
  }

  isVoiceAvailable(lang: Language): boolean {
    return this.voiceAvailability[lang] ?? false;
  }

  setLanguage(lang: Language): void {
    this.currentLang = lang;
  }

  /**
   * Speak text in the given language (or the stored current language).
   * Stops any currently playing speech first.
   *
   * @param text    The string to speak.
   * @param lang    Override language (optional).
   * @param priority  If true, interrupt any current speech.
   */
  speak(text: string, lang?: Language, priority = false): void {
    const targetLang = lang ?? this.currentLang;

    // If the requested voice is not installed, fall back to English.
    const effectiveLang = this.voiceAvailability[targetLang] ? targetLang : 'en';
    const langCode = LANGUAGE_CODES[effectiveLang];

    if (priority) {
      Speech.stop();
    } else if (this.isSpeaking) {
      return; // Don't queue up speech during busy scans
    }

    this.isSpeaking = true;
    Speech.speak(text, {
      language: langCode,
      pitch: 1.0,
      rate: 0.95, // Slightly slower than default for clarity for blind users
      onDone: () => { this.isSpeaking = false; },
      onError: () => { this.isSpeaking = false; },
      onStopped: () => { this.isSpeaking = false; },
    });
  }

  stop(): void {
    Speech.stop();
    this.isSpeaking = false;
  }

  get busy(): boolean {
    return this.isSpeaking;
  }
}

export const speechService = new SpeechService();
