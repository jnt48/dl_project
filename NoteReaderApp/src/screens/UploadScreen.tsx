// ─────────────────────────────────────────────────────────────────────────────
// screens/UploadScreen.tsx
//
// Direct Image Upload & Gallery Classifier:
// Allows users to select currency note photos directly from their phone gallery
// or file manager, runs the Deep Learning classifier, and speaks the denomination aloud.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  StatusBar,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useAppSettings } from '../hooks/useAppSettings';
import { TRANSLATIONS, getDenominationLabel } from '../i18n/translations';
import { speechService } from '../services/SpeechService';
import { hapticsService } from '../services/HapticsService';
import { storageService } from '../services/StorageService';
import { inferenceService, PredictionResult } from '../services/InferenceService';

export function UploadScreen() {
  const { settings } = useAppSettings();
  const lang = settings.language;
  const t = TRANSLATIONS[lang];

  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);

  // Pick an image from the user's gallery
  const pickImage = useCallback(async () => {
    hapticsService.vibrate('tap');
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        speechService.speak(
          lang === 'hi'
            ? 'गैलरी एक्सेस की अनुमति नहीं मिली।'
            : lang === 'mr'
            ? 'गॅलरी प्रवेश परवानगी नाकारली.'
            : 'Gallery permission was denied.',
          lang,
          true,
        );
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
        return;
      }

      const asset = pickerResult.assets[0];
      setSelectedImageUri(asset.uri);
      setIsProcessing(true);
      setResult(null);

      // Announce processing
      const analyzingMsg =
        lang === 'hi'
          ? 'फोटो का विश्लेषण कर रहे हैं…'
          : lang === 'mr'
          ? 'छायाचित्राचे विश्लेषण करत आहे…'
          : 'Analyzing note photo…';
      speechService.speak(analyzingMsg, lang, true);

      // Resize to 64x64 for Deep Learning inference
      const manipulated = await manipulateAsync(
        asset.uri,
        [{ resize: { width: 64, height: 64 } }],
        { compress: 0.85, format: SaveFormat.JPEG, base64: true },
      );

      // Run inference
      const prediction = inferenceService.predict(manipulated.base64);

      if (prediction) {
        setResult(prediction);
        const localized = getDenominationLabel(prediction.label, lang);

        if (prediction.isGenuine) {
          const fullAnnouncement = `${localized}. ${t.genuineNote}`;
          speechService.speak(fullAnnouncement, lang, true);
          hapticsService.vibrate('success');
        } else {
          const warningMsg =
            prediction.securityFlag === 'photocopy_alert'
              ? `${localized}. ${t.photocopyWarning}`
              : `${localized}. ${t.fakeNoteWarning}`;
          speechService.speak(warningMsg, lang, true);
          hapticsService.vibrate('error');
        }

        // Save scan to history
        storageService.addScan({
          denomination: prediction.label,
          confidence: prediction.confidence,
          timestamp: Date.now(),
          language: lang,
        });
      } else {
        speechService.speak(t.noNote, lang, true);
        hapticsService.vibrate('notSure');
      }
    } catch (err) {
      console.error('[UploadScreen] Pick/process error:', err);
      speechService.speak(t.notSure, lang, true);
      hapticsService.vibrate('error');
    } finally {
      setIsProcessing(false);
    }
  }, [lang, t]);

  // Repeat announcement of current result
  const repeatAnnouncement = useCallback(() => {
    if (!result) return;
    hapticsService.vibrate('tap');
    const localized = getDenominationLabel(result.label, lang);
    speechService.speak(localized, lang, true);
  }, [lang, result]);

  // Demo simulator for testing all 6 denominations
  const simulateNote = useCallback(
    (denom: string) => {
      hapticsService.vibrate('tap');
      const sim = inferenceService.simulateScan(denom);
      setResult(sim);
      setSelectedImageUri(null);
      const localized = getDenominationLabel(denom, lang);
      speechService.speak(`${localized}. ${t.genuineNote}`, lang, true);
      storageService.addScan({
        denomination: denom,
        confidence: sim.confidence,
        timestamp: Date.now(),
        language: lang,
      });
    },
    [lang, t],
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>🖼️</Text>
        <Text style={styles.headerTitle}>Upload Note Photo</Text>
        <Text style={styles.headerSubtitle}>
          Select any currency note photo from your gallery to identify the denomination offline.
        </Text>
      </View>

      {/* Main Upload Button */}
      <TouchableOpacity
        style={styles.uploadButton}
        onPress={pickImage}
        disabled={isProcessing}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Choose note photo from gallery"
        accessibilityHint="Opens photo library to select a currency note image"
      >
        <Text style={styles.uploadButtonIcon}>📁</Text>
        <Text style={styles.uploadButtonText}>Choose Photo from Gallery</Text>
        <Text style={styles.uploadButtonSubtext}>Supports JPG, PNG · Analyzed 100% On-Device</Text>
      </TouchableOpacity>

      {/* Processing Loader */}
      {isProcessing && (
        <View style={styles.processingCard}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.processingText}>Analyzing with Deep Learning…</Text>
        </View>
      )}

      {/* Image Preview & Prediction Result Card */}
      {result && !isProcessing && (
        <View style={styles.resultCard}>
          {selectedImageUri && (
            <Image source={{ uri: selectedImageUri }} style={styles.imagePreview} resizeMode="contain" />
          )}

          {/* Big Denomination Output */}
          <View style={styles.denominationBadge}>
            <Text style={styles.currencySymbol}>₹</Text>
            <Text style={styles.denominationText}>{result.label}</Text>
          </View>

          <Text style={styles.denominationSpoken}>
            {getDenominationLabel(result.label, lang)}
          </Text>

          {/* Confidence Badge */}
          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Text style={styles.statLabel}>Confidence</Text>
              <Text style={styles.statValue}>{(result.confidence * 100).toFixed(1)}%</Text>
            </View>

            <View
              style={[
                styles.statPill,
                result.isGenuine ? styles.genuinePill : styles.warningPill,
              ]}
            >
              <Text style={styles.statLabel}>Status</Text>
              <Text style={styles.statValue}>
                {result.isGenuine ? '✓ Genuine' : '⚠️ Suspicious'}
              </Text>
            </View>
          </View>

          {/* Repeat Audio Announcement Button */}
          <TouchableOpacity
            style={styles.repeatButton}
            onPress={repeatAnnouncement}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Repeat denomination announcement"
          >
            <Text style={styles.repeatButtonText}>🔊 Repeat Voice Output</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Test Samples (Great for DL Lab Viva & Demonstrations) */}
      <View style={styles.demoSection}>
        <Text style={styles.demoTitle}>🧪 Test Quick Denominations (Lab Demo)</Text>
        <Text style={styles.demoSubtitle}>
          Tap any denomination below to test speech output & model behavior:
        </Text>
        <View style={styles.demoGrid}>
          {['10', '20', '50', '100', '200', '500'].map((denom) => (
            <TouchableOpacity
              key={denom}
              style={styles.demoButton}
              onPress={() => simulateNote(denom)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Test ₹${denom} note`}
            >
              <Text style={styles.demoButtonText}>₹{denom}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  headerIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#AAA',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  uploadButton: {
    backgroundColor: '#1C1C1E',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 18,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 20,
  },
  uploadButtonIcon: {
    fontSize: 42,
    marginBottom: 10,
  },
  uploadButtonText: {
    color: '#FFD700',
    fontSize: 19,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  uploadButtonSubtext: {
    color: '#888',
    fontSize: 12,
  },
  processingCard: {
    backgroundColor: '#161616',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  processingText: {
    color: '#EEE',
    marginTop: 12,
    fontSize: 15,
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: '#18181A',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00E676',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#000',
  },
  denominationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencySymbol: {
    fontSize: 34,
    color: '#FFD700',
    fontWeight: 'bold',
    marginRight: 4,
  },
  denominationText: {
    fontSize: 48,
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 1,
  },
  denominationSpoken: {
    fontSize: 18,
    color: '#00E676',
    fontWeight: 'bold',
    marginTop: 4,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
    gap: 12,
  },
  statPill: {
    flex: 1,
    backgroundColor: '#242426',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  genuinePill: {
    backgroundColor: '#003314',
    borderWidth: 1,
    borderColor: '#00E676',
  },
  warningPill: {
    backgroundColor: '#331A00',
    borderWidth: 1,
    borderColor: '#FF9100',
  },
  statLabel: {
    color: '#888',
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: 2,
  },
  statValue: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  repeatButton: {
    backgroundColor: '#FFD700',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  repeatButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '900',
  },
  demoSection: {
    backgroundColor: '#141416',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2E',
  },
  demoTitle: {
    color: '#FFD700',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  demoSubtitle: {
    color: '#888',
    fontSize: 12,
    marginBottom: 14,
    lineHeight: 16,
  },
  demoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  demoButton: {
    width: '30%',
    backgroundColor: '#202024',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#38383E',
  },
  demoButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
