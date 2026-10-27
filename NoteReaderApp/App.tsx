// ─────────────────────────────────────────────────────────────────────────────
// App.tsx – Root component
//
// Responsibilities:
//   1. Load the TFLite model at startup (before any screen renders).
//   2. Check TTS voice availability and warn about missing Hindi/Marathi.
//   3. Set up gesture handler and safe-area providers.
//   4. Mount the AppNavigator.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider }       from 'react-native-safe-area-context';

import { AppNavigator }     from './src/navigation/AppNavigator';
import { inferenceService } from './src/services/InferenceService';
import { speechService }    from './src/services/SpeechService';
import { storageService }   from './src/services/StorageService';

type AppState = 'loading' | 'ready' | 'error';

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function init() {
      try {
        // ── 1. Load TFLite model ─────────────────────────────────────────────
        await inferenceService.loadModel();

        // ── 2. Check voice availability ──────────────────────────────────────
        const settings = await storageService.getSettings();
        const lang     = settings.language;
        const voices   = await speechService.checkVoiceAvailability();

        if (lang === 'hi' && !voices.hi) {
          // Warn the user that Hindi TTS is missing; fall back to English
          setTimeout(() => {
            speechService.speak(
              'Hindi voice data is not installed. Falling back to English. ' +
              'To install voice: open phone Settings, find Text-to-speech, ' +
              'and download the Hindi language pack.',
              'en',
              true,
            );
          }, 2000);
        } else if (lang === 'mr' && !voices.mr) {
          setTimeout(() => {
            speechService.speak(
              'Marathi voice data is not installed. Falling back to English. ' +
              'To install: open phone Settings, find Text-to-speech, ' +
              'and download the Marathi language pack.',
              'en',
              true,
            );
          }, 2000);
        }

        // ── 3. Set speech language ────────────────────────────────────────────
        speechService.setLanguage(lang);
        setAppState('ready');
      } catch (err: any) {
        console.error('[App] Initialization error:', err);
        setErrorMessage(err?.message ?? 'Unknown error');
        setAppState('error');
        // Speak the error aloud
        speechService.speak(
          'Model could not be loaded. Please reinstall the app.',
          'en',
          true,
        );
      }
    }

    init();
  }, []);

  if (appState === 'loading') {
    return (
      <View style={styles.splash}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.splashTitle}>NoteReader</Text>
        <Text style={styles.splashSub}>Indian Currency Speaker</Text>
        <Text style={styles.splashNote}>Loading model…</Text>
      </View>
    );
  }

  if (appState === 'error') {
    return (
      <View style={styles.splash}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.errorText}>❌ Model load failed</Text>
        <Text style={styles.splashNote}>{errorMessage}</Text>
        <Text style={styles.splashNote}>Please reinstall the app.</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" />
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1, backgroundColor: '#000',
    justifyContent: 'center', alignItems: 'center', gap: 12,
  },
  splashTitle: {
    color: '#FFD700', fontSize: 48, fontWeight: '900', letterSpacing: 3,
  },
  splashSub: { color: '#fff', fontSize: 20 },
  splashNote: { color: '#aaa', fontSize: 16 },
  errorText: { color: '#ff4444', fontSize: 24, fontWeight: '700' },
});
