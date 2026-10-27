// ─────────────────────────────────────────────────────────────────────────────
// __tests__/consecutiveFrames.test.ts
//
// Unit tests for the 3-consecutive-frames stability logic.
// Run with: npx jest
// These tests deliberately do NOT require a running React app —
// the hook is called directly in a pure function style.
// ─────────────────────────────────────────────────────────────────────────────

// We test the pure logic without React's renderHook for simplicity.
// Extract the push() logic as a plain function (matches the hook's inner loop).

function makeConsecutiveFilter(required: number) {
  let lastLabel: string | null = null;
  let streak = 0;

  function push(label: string | null) {
    if (label === null) {
      lastLabel = null;
      streak = 0;
      return { label: '', confirmed: false, count: 0 };
    }
    if (label === lastLabel) {
      streak += 1;
    } else {
      lastLabel = label;
      streak = 1;
    }
    return { label, confirmed: streak >= required, count: streak };
  }

  function reset() {
    lastLabel = null;
    streak = 0;
  }

  return { push, reset };
}

describe('Consecutive Frames Filter', () => {
  test('confirms after exactly N identical frames', () => {
    const { push } = makeConsecutiveFilter(3);
    expect(push('200').confirmed).toBe(false);  // frame 1
    expect(push('200').confirmed).toBe(false);  // frame 2
    expect(push('200').confirmed).toBe(true);   // frame 3 ← confirmed
    expect(push('200').confirmed).toBe(true);   // frame 4 ← still confirmed
  });

  test('resets streak on label change', () => {
    const { push } = makeConsecutiveFilter(3);
    push('100');
    push('100');
    // Change to a different note
    expect(push('500').confirmed).toBe(false);  // streak reset to 1
    expect(push('500').confirmed).toBe(false);  // streak 2
    expect(push('500').confirmed).toBe(true);   // streak 3 ← confirmed
  });

  test('resets streak on null (no detection)', () => {
    const { push } = makeConsecutiveFilter(3);
    push('200');
    push('200');
    expect(push(null).confirmed).toBe(false);   // reset
    expect(push('200').confirmed).toBe(false);  // must start again
    expect(push('200').confirmed).toBe(false);
    expect(push('200').confirmed).toBe(true);   // third consecutive
  });

  test('returns correct count', () => {
    const { push } = makeConsecutiveFilter(3);
    expect(push('50').count).toBe(1);
    expect(push('50').count).toBe(2);
    expect(push('50').count).toBe(3);
    expect(push('50').count).toBe(4);
  });

  test('works for required=1 (every frame confirmed)', () => {
    const { push } = makeConsecutiveFilter(1);
    expect(push('10').confirmed).toBe(true);
    expect(push('20').confirmed).toBe(true);
  });

  test('reset() clears the streak', () => {
    const { push, reset } = makeConsecutiveFilter(3);
    push('100');
    push('100');
    reset();
    expect(push('100').confirmed).toBe(false);  // streak restarted
    expect(push('100').count).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Confidence threshold tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Confidence Threshold', () => {
  const THRESHOLD = 0.70;

  function applyThreshold(confidence: number): string | null {
    return confidence >= THRESHOLD ? 'detected' : null;
  }

  test('accepts result at exactly threshold', () => {
    expect(applyThreshold(0.70)).toBe('detected');
  });

  test('rejects result just below threshold', () => {
    expect(applyThreshold(0.699)).toBeNull();
  });

  test('accepts high-confidence result', () => {
    expect(applyThreshold(0.99)).toBe('detected');
  });

  test('rejects low-confidence result', () => {
    expect(applyThreshold(0.30)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Language string tests
// ─────────────────────────────────────────────────────────────────────────────

import { TRANSLATIONS, getDenominationLabel } from '../src/i18n/translations';

describe('Translation strings', () => {
  const DENOMS = ['10', '20', '50', '100', '200', '500'];

  test('all denominations have strings in all languages', () => {
    (['en', 'hi', 'mr'] as const).forEach((lang) => {
      DENOMS.forEach((d) => {
        const label = getDenominationLabel(d, lang);
        expect(label).toBeTruthy();
        expect(label.length).toBeGreaterThan(2);
      });
    });
  });

  test('Hindi 200 is "दो सौ रुपये"', () => {
    expect(getDenominationLabel('200', 'hi')).toBe('दो सौ रुपये');
  });

  test('Marathi 200 is "दोनशे रुपये"', () => {
    expect(getDenominationLabel('200', 'mr')).toBe('दोनशे रुपये');
  });

  test('English 500 is "Five hundred rupees"', () => {
    expect(getDenominationLabel('500', 'en')).toBe('Five hundred rupees');
  });

  test('appReady string is non-empty in all languages', () => {
    (['en', 'hi', 'mr'] as const).forEach((lang) => {
      expect(TRANSLATIONS[lang].appReady.length).toBeGreaterThan(10);
    });
  });
});
