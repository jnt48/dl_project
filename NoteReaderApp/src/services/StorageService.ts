// ─────────────────────────────────────────────────────────────────────────────
// services/StorageService.ts
//
// Manages scan history and user settings using @react-native-async-storage.
// Keeps the last 10 scan results plus a settings object.
// ─────────────────────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language } from '../i18n/translations';

export interface ScanRecord {
  id: string;
  denomination: string;
  confidence: number;         // 0..1
  timestamp: number;          // Date.now()
  language: Language;
}

export interface AppSettings {
  language: Language;
  confidenceThreshold: number;  // 0..1, default 0.70
  autoScanMode: boolean;
  consecutiveFrames: number;    // default 3
  privacyNoticeSeen: boolean;
}

const HISTORY_KEY  = '@notereader/history';
const SETTINGS_KEY = '@notereader/settings';
const MAX_HISTORY  = 10;

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'en',
  confidenceThreshold: 0.70,
  autoScanMode: false,
  consecutiveFrames: 3,
  privacyNoticeSeen: false,
};

class StorageService {
  // ── History ────────────────────────────────────────────────────────────────

  async getHistory(): Promise<ScanRecord[]> {
    try {
      const raw = await AsyncStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  async addScan(record: Omit<ScanRecord, 'id'>): Promise<void> {
    try {
      const history = await this.getHistory();
      const newRecord: ScanRecord = { ...record, id: Date.now().toString() };
      // Keep only the most recent MAX_HISTORY records
      const updated = [newRecord, ...history].slice(0, MAX_HISTORY);
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('[StorageService] addScan error:', err);
    }
  }

  async clearHistory(): Promise<void> {
    await AsyncStorage.removeItem(HISTORY_KEY);
  }

  // ── Settings ───────────────────────────────────────────────────────────────

  async getSettings(): Promise<AppSettings> {
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_KEY);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  async saveSettings(settings: Partial<AppSettings>): Promise<void> {
    try {
      const current = await this.getSettings();
      await AsyncStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({ ...current, ...settings }),
      );
    } catch (err) {
      console.warn('[StorageService] saveSettings error:', err);
    }
  }
}

export const storageService = new StorageService();
