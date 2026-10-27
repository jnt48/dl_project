// ─────────────────────────────────────────────────────────────────────────────
// screens/HowItWorksScreen.tsx
//
// Sighted helper screen showing the NumPy forward-pass demo from P6,
// convolution and pooling animations in text/ASCII art, and a brief explanation
// of the full pipeline. Not required for blind users to navigate.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MODEL_CONFIG } from '../constants/modelConfig';

// ── Static NumPy demo results (mirrors P6 notebook output) ────────────────────
const NUMPY_DEMO = {
  input: [
    [1, 2, 3, 0],
    [0, 1, 2, 3],
    [3, 0, 1, 2],
    [2, 3, 0, 1],
  ],
  kernel: [
    [ 1,  0, -1],
    [ 1,  0, -1],
    [ 1,  0, -1],
  ],
  featureMap: [
    [1 + 0 - 2 + 1 + 0 - 1 + 3 + 0 - 1, 2 + 0 - 0 + 1 + 0 - 3 + 0 + 0 - 2],
    [0 + 0 - 3 + 3 + 0 - 1 + 2 + 0 - 0, 1 + 0 - 2 + 0 + 0 - 2 + 3 + 0 - 1],
  ],
  W: [0.5, -0.3, 0.8, 0.1],
  b: 0.2,
};

function matToStr(mat: number[][]): string {
  return mat.map((row) => `  [${row.join(', ')}]`).join('\n');
}

const z = NUMPY_DEMO.featureMap.flat().reduce((s, v, i) => s + NUMPY_DEMO.W[i] * v, NUMPY_DEMO.b);
const sigmoid = 1 / (1 + Math.exp(-z));
const mse = Math.pow(sigmoid - 1.0, 2);

export function HowItWorksScreen() {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: '1. Convolution',
      content: `A 3×3 kernel slides over the 4×4 input:\n\nInput:\n${matToStr(NUMPY_DEMO.input)}\n\nKernel:\n${matToStr(NUMPY_DEMO.kernel)}\n\nOutput (feature map) = dot product at each position:\n${matToStr(NUMPY_DEMO.featureMap)}\n\nShape: (4-3+1) × (4-3+1) = 2×2`,
    },
    {
      title: '2. ReLU + Pooling',
      content: `ReLU: max(0, x) zeros out negative values.\n\nMax-Pool 2×2 keeps the largest value:\n  max(${NUMPY_DEMO.featureMap.flat().join(', ')}) = ${Math.max(...NUMPY_DEMO.featureMap.flat())}\n\nPooling reduces spatial size, adds translation invariance.\n(A partially obstructed note still gets detected.)`,
    },
    {
      title: '3. Flatten',
      content: `Flatten reshapes the 2×2 map to a 1-D vector:\n  [${NUMPY_DEMO.featureMap.flat().join(', ')}]\n\nThis vector feeds into the Dense (fully-connected) layer.\n\nWHY: Dense layers expect 1-D input; convolution outputs 3-D.`,
    },
    {
      title: '4. Dense + Sigmoid (demo)',
      content: `Weights W = [${NUMPY_DEMO.W.join(', ')}]\nBias b = ${NUMPY_DEMO.b}\n\nz = W·x + b\n  = ${NUMPY_DEMO.featureMap.flat().map((v, i) => `${NUMPY_DEMO.W[i]}×${v}`).join(' + ')} + ${NUMPY_DEMO.b}\n  = ${z.toFixed(4)}\n\nσ(z) = 1/(1+e^-z) = ${sigmoid.toFixed(4)}\n\nMSE Loss = (ŷ - y)² = (${sigmoid.toFixed(4)} - 1)² = ${mse.toFixed(4)}`,
    },
    {
      title: '5. Real pipeline',
      content: `Real model: MobileNetV2 (${MODEL_CONFIG.base_architecture})\nInput: ${MODEL_CONFIG.input_size[0]}×${MODEL_CONFIG.input_size[1]} RGB\nNormalisation: pixel × ${1 / MODEL_CONFIG.normalization.scale} + (${MODEL_CONFIG.normalization.offset}) → [-1, 1]\nOutput: 6 softmax probabilities\nClasses: ₹10, ₹20, ₹50, ₹100, ₹200, ₹500\nQuantisation: ${MODEL_CONFIG.quantization}\nConfidence threshold: ${MODEL_CONFIG.confidence_threshold * 100}%`,
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading} accessibilityRole="header">How It Works</Text>
      <Text style={styles.subtitle}>Step-by-step CNN forward pass (from P6 notebook)</Text>

      {/* Step-by-step walkthrough */}
      <View style={styles.stepNav}>
        {steps.map((_, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.stepBtn, step === i && styles.stepBtnActive]}
            onPress={() => setStep(i)}
            accessibilityRole="tab"
            accessibilityState={{ selected: step === i }}
            accessibilityLabel={`Step ${i + 1}`}
          >
            <Text style={[styles.stepBtnText, step === i && styles.stepBtnTextActive]}>
              {i + 1}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle} accessibilityRole="header">
          {steps[step].title}
        </Text>
        <Text style={styles.cardBody} accessibilityRole="text" selectable>
          {steps[step].content}
        </Text>
      </View>

      {/* Navigation buttons */}
      <View style={styles.navRow}>
        {step > 0 && (
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => setStep(step - 1)}
            accessibilityRole="button"
            accessibilityLabel="Previous step"
          >
            <Text style={styles.navBtnText}>← Prev</Text>
          </TouchableOpacity>
        )}
        {step < steps.length - 1 && (
          <TouchableOpacity
            style={[styles.navBtn, styles.navBtnNext]}
            onPress={() => setStep(step + 1)}
            accessibilityRole="button"
            accessibilityLabel="Next step"
          >
            <Text style={styles.navBtnText}>Next →</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  content: { padding: 20, paddingTop: 56, paddingBottom: 60 },
  heading: { color: '#FFD700', fontSize: 28, fontWeight: '900', marginBottom: 6 },
  subtitle: { color: '#aaa', fontSize: 14, marginBottom: 28 },
  stepNav: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  stepBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#222',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#555',
  },
  stepBtnActive: { backgroundColor: '#FFD700', borderColor: '#FFD700' },
  stepBtnText: { color: '#fff', fontWeight: '700' },
  stepBtnTextActive: { color: '#000' },
  card: {
    backgroundColor: '#1a1a1a', borderRadius: 16, padding: 20,
    borderLeftWidth: 4, borderLeftColor: '#FFD700',
  },
  cardTitle: { color: '#FFD700', fontSize: 20, fontWeight: '800', marginBottom: 14 },
  cardBody: {
    color: '#e0e0e0', fontSize: 14, fontFamily: 'monospace',
    lineHeight: 22,
  },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, gap: 12 },
  navBtn: {
    flex: 1, backgroundColor: '#222', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', minHeight: 56,
    borderWidth: 1, borderColor: '#FFD700',
  },
  navBtnNext: { backgroundColor: '#FFD700' },
  navBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
