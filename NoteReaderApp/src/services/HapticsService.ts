// ─────────────────────────────────────────────────────────────────────────────
// services/HapticsService.ts
//
// Distinct vibration patterns for different scan outcomes.
// Pattern design principles:
//   - Success: two short pulses (recognisable as "yes")
//   - Not sure: one long buzz (a question mark feeling)
//   - Error:    three rapid short pulses (an alarm pattern)
// ─────────────────────────────────────────────────────────────────────────────

import { Vibration, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export type HapticType = 'success' | 'notSure' | 'error' | 'tap' | 'doubleTap';

// Vibration patterns: [wait, vibrate, wait, vibrate, ...]
const PATTERNS: Record<HapticType, number[]> = {
  success:   [0, 80, 100, 80],          // two short pulses
  notSure:   [0, 400],                   // one long buzz
  error:     [0, 50, 50, 50, 50, 50],   // three rapid pulses
  tap:       [0, 30],                    // single light tap
  doubleTap: [0, 30, 60, 30],           // two quick taps
};

class HapticsService {
  vibrate(type: HapticType): void {
    if (Platform.OS === 'ios') {
      // iOS: use Haptics engine for better feel
      switch (type) {
        case 'success':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'error':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        case 'notSure':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        default:
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } else {
      // Android: use the Vibration API with our custom patterns
      Vibration.vibrate(PATTERNS[type]);
    }
  }
}

export const hapticsService = new HapticsService();
