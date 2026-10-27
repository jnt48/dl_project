// ─────────────────────────────────────────────────────────────────────────────
// screens/HistoryScreen.tsx
// Shows the last 10 scans. Can be read aloud by pressing "Read aloud" button.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
} from 'react-native';
import { storageService, ScanRecord } from '../services/StorageService';
import { speechService } from '../services/SpeechService';
import { useAppSettings } from '../hooks/useAppSettings';
import { TRANSLATIONS, getDenominationLabel } from '../i18n/translations';

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export function HistoryScreen() {
  const { settings } = useAppSettings();
  const lang = settings.language;
  const t = TRANSLATIONS[lang];

  const [history, setHistory] = useState<ScanRecord[]>([]);

  const load = useCallback(async () => {
    const h = await storageService.getHistory();
    setHistory(h);
  }, []);

  useEffect(() => { load(); }, [load]);

  const readAloud = useCallback(() => {
    speechService.speak(t.historyRead, lang, true);
    if (history.length === 0) {
      setTimeout(() => speechService.speak(t.historyEmpty, lang), 1200);
      return;
    }
    let delay = 1200;
    history.forEach((rec, i) => {
      const label = getDenominationLabel(rec.denomination, lang);
      const spoken = `${i + 1}. ${label}, ${formatTime(rec.timestamp)}.`;
      setTimeout(() => speechService.speak(spoken, lang), delay);
      delay += 1800;
    });
  }, [history, lang, t]);

  const clearHistory = useCallback(async () => {
    await storageService.clearHistory();
    setHistory([]);
    speechService.speak(t.historyCleared, lang, true);
  }, [lang, t]);

  return (
    <View style={styles.container}>
      <Text style={styles.heading} accessibilityRole="header">{t.historyTitle}</Text>

      {history.length === 0 ? (
        <Text style={styles.emptyText} accessibilityRole="text">{t.historyEmpty}</Text>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <View
              style={styles.card}
              accessible={true}
              accessibilityLabel={`${index + 1}. ${getDenominationLabel(item.denomination, lang)}, ${formatTime(item.timestamp)}, ${Math.round(item.confidence * 100)} percent confident`}
              accessibilityRole="text"
            >
              <Text style={styles.denomination}>
                ₹{item.denomination}
              </Text>
              <Text style={styles.detail}>{getDenominationLabel(item.denomination, lang)}</Text>
              <Text style={styles.meta}>
                {formatTime(item.timestamp)}  ·  {Math.round(item.confidence * 100)}%
              </Text>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 120 }}
        />
      )}

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={readAloud}
          accessibilityRole="button"
          accessibilityLabel={t.historyRead}
          accessibilityHint="Reads the scan history aloud"
        >
          <Text style={styles.actionBtnText}>🔊 {t.historyRead}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.clearBtn]}
          onPress={clearHistory}
          accessibilityRole="button"
          accessibilityLabel={t.historyClear}
          accessibilityHint="Clears all scan history permanently"
        >
          <Text style={[styles.actionBtnText, { color: '#000' }]}>🗑 {t.historyClear}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111', padding: 20, paddingTop: 56 },
  heading: { color: '#FFD700', fontSize: 28, fontWeight: '900', marginBottom: 20 },
  emptyText: { color: '#aaa', fontSize: 20, marginTop: 40, textAlign: 'center' },
  card: {
    backgroundColor: '#1e1e1e', borderRadius: 14, padding: 18,
    marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#FFD700',
  },
  denomination: { color: '#FFD700', fontSize: 36, fontWeight: '900' },
  detail: { color: '#fff', fontSize: 18, marginTop: 2 },
  meta: { color: '#888', fontSize: 14, marginTop: 4 },
  actions: {
    position: 'absolute', bottom: 32, left: 20, right: 20,
    flexDirection: 'row', gap: 12,
  },
  actionBtn: {
    flex: 1, backgroundColor: '#222', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', minHeight: 56,
    borderWidth: 1, borderColor: '#FFD700',
  },
  clearBtn: { backgroundColor: '#FFD700' },
  actionBtnText: { color: '#FFD700', fontSize: 16, fontWeight: '700' },
});
