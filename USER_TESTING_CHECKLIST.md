# User Testing Checklist – NoteReader
### Testing with Real Visually Impaired Users

> **Note**: Always obtain informed consent. Explain that this is a student research project.  
> Never share or retain the participant's personal data.

---

## Pre-Session Setup
- [ ] Phone charged to 100%
- [ ] TTS voice data installed (Settings → Text-to-speech → Install hi-IN / mr-IN)
- [ ] `currency_detector.tflite` model bundled and app installed
- [ ] Lighting condition confirmed (indoor fluorescent, ~300 lux preferred for baseline)
- [ ] Test notes prepared: ₹10, ₹20, ₹50, ₹100, ₹200, ₹500 (at least 2 of each)
- [ ] Note conditions: crisp, crumpled, partially folded, held in hand

---

## Onboarding / Startup (2 min)
- [ ] App speaks "NoteReader is ready" within 2 seconds of launch
- [ ] Privacy notice spoken once (only on first launch)
- [ ] Camera permission request spoken clearly

---

## Core Scanning – Blind User Tasks

### Task 1: Manual Scan (single tap)
- [ ] User can find the scan area without sight (whole screen = tap target)
- [ ] Single tap triggers scanning sound/vibration
- [ ] Correct denomination spoken within 3 seconds
- [ ] Result repeated on double-tap

### Task 2: Auto-Scan Mode
- [ ] User enables auto-scan via long-press → settings → voice
- [ ] Denomination announced when same note held for ~3 frames
- [ ] Announcement does NOT repeat while note is held still
- [ ] New announcement when a different note is presented

### Task 3: Low-Confidence Scenarios
- [ ] App says "Not sure, hold steady" for a very crumpled note
- [ ] Vibration pattern differs from a confident scan (long buzz vs two short)

### Task 4: Dark Room
- [ ] App detects low brightness and announces "Too dark, turning on torch"
- [ ] Torch activates automatically
- [ ] Scanning works after torch on

### Task 5: Language Switching
- [ ] Two-finger tap switches language (Hindi → Marathi → English → cycle)
- [ ] New language spoken in that language immediately
- [ ] Language setting persists after app restart

### Task 6: Held-in-Hand Notes
- [ ] Fingers partially covering note — app still recognises correctly
- [ ] Partial note (only 60%) — app says "not sure" or detects if confident enough

---

## Accessibility (TalkBack)
- [ ] All buttons have TalkBack labels
- [ ] Tab bar tabs are navigable with swipe
- [ ] Settings screen fully navigable by TalkBack alone
- [ ] History screen "Read aloud" button works without seeing the list

---

## Performance
- [ ] Result announced within 3 seconds on the test device
- [ ] No camera freezes or frame drops during 5-minute continuous use
- [ ] Battery drain measured: <15% per hour of continuous scanning

---

## Error Handling
- [ ] Camera permission denied → app speaks guidance and does not crash
- [ ] No note presented → app eventually says "no note found"
- [ ] App recovers after incorrect denomination (different note brought in)

---

## After Session: Feedback Questions (verbal, no reading required)
1. Was the app easy to use without looking at the screen?
2. Was the speech clear and fast enough?
3. Was the vibration feedback helpful?
4. Which language felt most natural?
5. Did the torch help in dark conditions?
6. What would you improve?

---

## Known Limitations
| Limitation | Status |
|-----------|--------|
| ₹2000 note not supported | Will be added once dataset available |
| Coins not detected | Future work |
| Fake note detection | Out of scope (requires hardware UV/IR) |
| Hindi/Marathi TTS requires installed voice data | User guided to install |
| Performance on phones < Android 7 (API 24) | Use CPU fallback |
| Very torn or defaced notes may not be recognised | Model limitation |
| No landscape mode | Portrait-only; easier for blind users |

---

## Future Work
1. **₹2000 note** — capture 150+ images and retrain.
2. **Coin recognition** — requires a separate dataset and possibly a second model.
3. **More regional languages** — Tamil, Telugu, Bengali, Gujarati (add to `translations.ts`).
4. **Bundled offline voices** — ship Hindi and Marathi TTS voice data with the APK.
5. **Guided capture mode** — voice instructions ("move note to the right") using real-time prediction confidence.
6. **Offline PWA** — web-based version with TFLite WASM for people without smartphones.
7. **Volume button scanning** — react to hardware volume buttons as an alternative tap.
8. **Android Wear / wearables** — vibration-only feedback for smartwatch users.
