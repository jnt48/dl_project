// ─────────────────────────────────────────────────────────────────────────────
// hooks/useConsecutiveFrames.ts
//
// Implements the "3 consecutive frames" stability logic.
//
// WHY this exists:
//   A single-frame prediction can be wrong due to:
//     - Motion blur as a blind user adjusts the phone
//     - Partial occlusion (finger covering part of the note)
//     - Lighting transients
//   We only announce a denomination if the same label appears in
//   N consecutive frames (N configurable, default 3).
//   This eliminates flickering announcements.
//
// UNIT TESTED in __tests__/useConsecutiveFrames.test.ts
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useCallback } from 'react';

export interface ConsecutiveResult {
  label: string;
  confirmed: boolean;   // true when the same label has appeared N times in a row
  count: number;        // current streak length
}

/**
 * useConsecutiveFrames
 *
 * @param required  Number of consecutive identical detections needed to confirm.
 * @returns         A function push(label) → ConsecutiveResult
 */
export function useConsecutiveFrames(required: number) {
  // We use refs (not state) because this runs in a frame processor context —
  // we cannot trigger React re-renders mid-frame.
  const lastLabel = useRef<string | null>(null);
  const streak    = useRef<number>(0);

  /**
   * Call this on every frame with the predicted label (or null if below threshold).
   * Returns whether the label has been seen `required` times in a row.
   */
  const push = useCallback(
    (label: string | null): ConsecutiveResult => {
      if (label === null) {
        // Reset on no-detection frames
        lastLabel.current = null;
        streak.current = 0;
        return { label: '', confirmed: false, count: 0 };
      }

      if (label === lastLabel.current) {
        // Same label — increment streak
        streak.current += 1;
      } else {
        // Different label — reset streak
        lastLabel.current = label;
        streak.current = 1;
      }

      const confirmed = streak.current >= required;
      return { label, confirmed, count: streak.current };
    },
    [required],
  );

  /** Reset streak (call after announcing a confirmed result) */
  const reset = useCallback(() => {
    lastLabel.current = null;
    streak.current = 0;
  }, []);

  return { push, reset };
}
