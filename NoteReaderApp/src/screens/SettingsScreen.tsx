// ─────────────────────────────────────────────────────────────────────────────
// screens/SettingsScreen.tsx
// Accessible settings panel — navigable entirely by voice via TalkBack/VoiceOver.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, Switch, TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppSettings } from '../hooks/useAppSettings';
import { speechService } from '../services/SpeechService';
import { TRANSLATIONS, Language, LANGUAGE_NAMES } from '../i18n/translations';

const LANGUAGES: Language[] = ['en', 'hi', 'mr'];

export function SettingsScreen() {
  const { settings, updateSettings } = useAppSettings();
  const navigation = useNavigation();
  const lang = settings.language;
  const t = TRANSLATIONS[lang];

  const setLang = useCallback(
    async (l: Language) => {
      await updateSettings({ language: l });
      speechService.setLanguage(l);
      speechService.speak(TRANSLATIONS[l].switchLanguage, l, true);
    },
    [updateSettings],
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading} accessibilityRole="header">{t.settingsTitle}</Text>

      {/* ── Language ─────────────────────────────────────────────────────── */}
      <SectionLabel label={t.languageLabel} />
      <View style={styles.row}>
        {LANGUAGES.map((l) => (
          <TouchableOpacity
            key={l}
            style={[styles.langBtn, lang === l && styles.langBtnActive]}
            onPress={() => setLang(l)}
            accessibilityRole="radio"
            accessibilityState={{ selected: lang === l }}
            accessibilityLabel={LANGUAGE_NAMES[l]}
            accessibilityHint={`Switch app language to ${LANGUAGE_NAMES[l]}`}
          >
            <Text style={[styles.langBtnText, lang === l && styles.langBtnTextActive]}>
              {LANGUAGE_NAMES[l]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Auto-scan mode ────────────────────────────────────────────────── */}
      <SectionLabel label={t.autoScanLabel} />
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>{settings.autoScanMode ? 'ON' : 'OFF'}</Text>
        <Switch
          value={settings.autoScanMode}
          onValueChange={(v) => {
            updateSettings({ autoScanMode: v });
            speechService.speak(v ? t.autoScanOn : t.autoScanOff, lang, true);
          }}
          thumbColor={settings.autoScanMode ? '#FFD700' : '#aaa'}
          trackColor={{ true: '#7a6500', false: '#444' }}
          accessibilityLabel={t.autoScanLabel}
          accessibilityRole="switch"
          accessibilityState={{ checked: settings.autoScanMode }}
        />
      </View>

      {/* ── Confidence threshold ──────────────────────────────────────────── */}
      <SectionLabel label={`${t.confidenceLabel}  ${Math.round(settings.confidenceThreshold * 100)}%`} />
      <View style={styles.row}>
        {[0.60, 0.70, 0.80, 0.90, 0.95].map((pct) => (
          <TouchableOpacity
            key={pct}
            style={[styles.langBtn, Math.abs(settings.confidenceThreshold - pct) < 0.01 && styles.langBtnActive]}
            onPress={() => updateSettings({ confidenceThreshold: pct })}
            accessibilityRole="radio"
            accessibilityState={{ selected: Math.abs(settings.confidenceThreshold - pct) < 0.01 }}
            accessibilityLabel={`${Math.round(pct * 100)} percent`}
          >
            <Text style={[styles.langBtnText, Math.abs(settings.confidenceThreshold - pct) < 0.01 && styles.langBtnTextActive]}>
              {`${Math.round(pct * 100)}%`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Consecutive frames ────────────────────────────────────────────── */}
      <SectionLabel label={`${t.consecutiveFramesLabel}  ${settings.consecutiveFrames}`} />
      <View style={styles.row}>
        {[2, 3, 4, 5].map((n) => (
          <TouchableOpacity
            key={n}
            style={[styles.langBtn, settings.consecutiveFrames === n && styles.langBtnActive]}
            onPress={() => updateSettings({ consecutiveFrames: n })}
            accessibilityRole="radio"
            accessibilityState={{ selected: settings.consecutiveFrames === n }}
            accessibilityLabel={`${n} frames`}
          >
            <Text style={[styles.langBtnText, settings.consecutiveFrames === n && styles.langBtnTextActive]}>
              {n}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Back ─────────────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel="Back to camera"
        accessibilityHint="Returns to the scanning screen"
      >
        <Text style={styles.backBtnText}>← Back to Camera</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel} accessibilityRole="header">{label}</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  content: { padding: 24, paddingTop: 56, paddingBottom: 60 },
  heading: { color: '#FFD700', fontSize: 30, fontWeight: '900', marginBottom: 32 },
  sectionLabel: { color: '#FFD700', fontSize: 18, fontWeight: '700', marginTop: 24, marginBottom: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  langBtn: {
    backgroundColor: '#222', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 14,
    borderWidth: 2, borderColor: '#444', minWidth: 80, alignItems: 'center', minHeight: 48,
  },
  langBtnActive: { backgroundColor: '#FFD700', borderColor: '#FFD700' },
  langBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  langBtnTextActive: { color: '#000' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  switchLabel: { color: '#fff', fontSize: 18, minWidth: 40 },
  sliderRow: { flexDirection: 'row', alignItems: 'center' },
  sliderEdge: { color: '#aaa', fontSize: 14 },
  backBtn: {
    marginTop: 48, backgroundColor: '#FFD700', borderRadius: 14,
    paddingVertical: 18, alignItems: 'center', minHeight: 56,
  },
  backBtnText: { color: '#000', fontSize: 18, fontWeight: '800' },
});
