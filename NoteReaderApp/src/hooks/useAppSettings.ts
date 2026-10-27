// ─────────────────────────────────────────────────────────────────────────────
// hooks/useAppSettings.ts
//
// React hook that loads settings from storage and provides update functions.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { storageService, AppSettings, DEFAULT_SETTINGS } from '../services/StorageService';
import { Language } from '../i18n/translations';

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    storageService.getSettings().then((s) => {
      setSettings(s);
      setLoaded(true);
    });
  }, []);

  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    const updated = { ...settings, ...patch };
    setSettings(updated);
    await storageService.saveSettings(patch);
  }, [settings]);

  const setLanguage = useCallback(
    (lang: Language) => updateSettings({ language: lang }),
    [updateSettings],
  );

  return { settings, loaded, updateSettings, setLanguage };
}
