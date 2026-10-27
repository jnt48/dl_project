// __tests__/currencyClassifier.test.ts
// v5 — Tests for Lighting-Invariant Ratio Classifier
// ─────────────────────────────────────────────────────────────────────────────

import { runNeuralForwardPass, rgbToHsv, computeSoftmax } from '../src/services/InferenceService';

describe('rgbToHsv', () => {
  it('pure red → H≈0°, S=1, V=1', () => {
    const { h, s, v } = rgbToHsv(255, 0, 0);
    expect(h).toBeCloseTo(0, 0);
    expect(s).toBeCloseTo(1, 2);
    expect(v).toBeCloseTo(1, 2);
  });
  it('grey → S≈0', () => {
    const { s } = rgbToHsv(165, 170, 163);
    expect(s).toBeLessThan(0.05);
  });
  it('cyan → H≈180°', () => {
    const { h } = rgbToHsv(0, 200, 200);
    expect(h).toBeCloseTo(180, 0);
  });
});

describe('computeSoftmax', () => {
  it('probabilities sum to 1', () => {
    const p = computeSoftmax([0.1, 0.5, 0.9, 1.2, 0.3, 0.8]);
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1.0, 4);
  });
  it('smallest distance → largest probability', () => {
    const p = computeSoftmax([0.9, 0.2, 0.7, 1.0, 1.1, 0.8]);
    expect(p[1]).toBeGreaterThan(p[0]);
  });
});

// ─── CHANNEL RATIO FIXTURES ───────────────────────────────────────────────────
// nr = R/total, ng = G/total, nb = B/total, total=R+G+B
// These ratios are LIGHTING-INVARIANT (immune to brightness/white-balance)

describe('₹500 Stone Grey — chromaticity < 0.07', () => {
  it('standard indoor light: R≈G≈B balanced', () => {
    // nr=0.325 ng=0.333 nb=0.321 → chromaticity=0.012 → ₹500
    const res = runNeuralForwardPass(165, 170, 163, 26, 0.01, undefined, 0.04, 0.65);
    expect(res).not.toBeNull();
    expect(res!.label).toBe('500');
  });
  it('cool LED light (slight blue cast on grey)', () => {
    // Grey note under cool light: R=155, G=162, B=168 → nr=0.32, nb=0.35, chr=0.03 → ₹500
    const res = runNeuralForwardPass(155, 162, 168, 24, 0.01, undefined, 0.04, 0.64);
    expect(res).not.toBeNull();
    expect(res!.label).toBe('500');
  });
  it('warm incandescent light (slight warm cast on grey)', () => {
    // R=175 G=168 B=155 → nr=0.35 ng=0.33 nb=0.31 chromaticity=0.04 → ₹500
    const res = runNeuralForwardPass(175, 168, 155, 22, 0.01, undefined, 0.04, 0.66);
    expect(res).not.toBeNull();
    expect(res!.label).toBe('500');
  });
});

describe('₹50 Cyan/Teal — nb >> nr', () => {
  it('standard cyan note', () => {
    // nr=0.18 ng=0.40 nb=0.42 → nb > nr + 0.12 → ₹50
    const res = runNeuralForwardPass(75, 178, 218, 26, 0.01, undefined, 0.60, 0.82);
    expect(res).not.toBeNull();
    expect(res!.label).toBe('50');
  });
  it('NOT confused with ₹500: ₹50 has clear blue dominance', () => {
    const res = runNeuralForwardPass(75, 178, 218, 26, 0.01, undefined, 0.60, 0.82);
    expect(res!.label).not.toBe('500');
  });
});

describe('₹200 Saffron/Orange — nr >> nb, warm, bright', () => {
  it('vivid saffron — nr=0.52, nb=0.13, warmth=0.39', () => {
    // nr=228/422=0.54, ng=152/422=0.36, nb=42/422=0.10 → warm + bright → ₹200
    const res = runNeuralForwardPass(228, 152, 42, 26, 0.01, undefined, 0.70, 0.88);
    expect(res).not.toBeNull();
    expect(res!.label).toBe('200');
  });
  it('NOT confused with ₹500: saffron has very different ratios', () => {
    const res = runNeuralForwardPass(228, 152, 42, 26, 0.01, undefined, 0.70, 0.88);
    expect(res!.label).not.toBe('500');
  });
  it('₹200 under warm light (orange-red shift)', () => {
    // Under warm light, ₹200 saffron shifts more orange: R=240 G=140 B=48
    const res = runNeuralForwardPass(240, 140, 48, 24, 0.01, undefined, 0.72, 0.90);
    expect(res).not.toBeNull();
    expect(res!.label).toBe('200');
  });
});

describe('₹10 Brown — nr > nb, warm but dark/muted', () => {
  it('dark chocolate brown — nr=0.47, nb=0.18, V=0.50', () => {
    // nr=145/295=0.49, ng=100/295=0.34, nb=50/295=0.17 → warm but less bright → ₹10
    const res = runNeuralForwardPass(145, 100, 50, 24, 0.01, undefined, 0.40, 0.50);
    expect(res).not.toBeNull();
    expect(res!.label).toBe('10');
  });
  it('₹10 NOT confused with ₹200 — critical test', () => {
    const res = runNeuralForwardPass(145, 100, 50, 24, 0.01, undefined, 0.40, 0.50);
    expect(res!.label).not.toBe('200');
  });
});

describe('₹20 Yellow-Green — ng≥nr, nb very low', () => {
  it('lime yellow-green — ng=0.45, nr=0.41, nb=0.14', () => {
    const res = runNeuralForwardPass(182, 198, 68, 26, 0.01, undefined, 0.56, 0.80);
    expect(res).not.toBeNull();
    expect(res!.label).toBe('20');
  });
});

describe('₹100 Lavender — nb>ng, balanced RB', () => {
  it('lavender/purple — nb=0.38, nr=0.33, ng=0.29', () => {
    const res = runNeuralForwardPass(158, 140, 188, 26, 0.01, undefined, 0.24, 0.72);
    expect(res).not.toBeNull();
    expect(res!.label).toBe('100');
  });
});

describe('Edge cases', () => {
  it('pitch black → null', () => {
    const res = runNeuralForwardPass(5, 5, 5, 2, 0.001);
    expect(res).toBeNull();
  });
  it('photocopy (high glare) → suspicious', () => {
    const res = runNeuralForwardPass(165, 170, 163, 5.5, 0.16, undefined, 0.04, 0.65);
    expect(res).not.toBeNull();
    expect(res!.isGenuine).toBe(false);
    expect(res!.securityFlag).toBe('photocopy_alert');
  });
  it('genuine grey note passes authenticity check', () => {
    const res = runNeuralForwardPass(165, 170, 163, 25, 0.01, undefined, 0.04, 0.65);
    expect(res!.isGenuine).toBe(true);
    expect(res!.securityFlag).toBe('verified');
  });
});
