# NoteReader – Indian Currency Speaker for the Blind
### RCOEM, Nagpur · CSE Deep Learning Lab Project

---

## Table of Contents
1. [Project Overview](#overview)
2. [Dataset Setup](#dataset)
3. [Part A: Running the Notebooks](#part-a)
4. [Part B: Building and Installing the App](#part-b)
5. [Troubleshooting](#troubleshooting)
6. [Architecture Notes](#architecture)

---

## 1. Project Overview <a name="overview"></a>

A blind or low-vision person points the phone camera at an Indian currency note.  
A deep-learning model running **fully on-device** (no internet) recognises the denomination  
and **speaks it aloud** in Hindi, Marathi or English.

| Layer | Technology |
|-------|-----------|
| Model training | TensorFlow/Keras (MobileNetV2, INT8 TFLite) |
| Camera | react-native-vision-camera v4 |
| Inference | react-native-fast-tflite (frame processor worklet) |
| Speech | expo-speech (hi-IN / mr-IN / en-IN) |
| Navigation | React Navigation v6 |

---

## 2. Dataset Setup <a name="dataset"></a>

### Option A – Kaggle download
```bash
pip install kaggle
# Copy kaggle.json to ~/.kaggle/
kaggle datasets download -d mishra1993/indian-currency-dataset
# Extract into dataset/raw/ with sub-folders named: 10 20 50 100 200 500
```

### Option B – Capture your own images
Place at least 80 images per class in `dataset/raw/<denomination>/`.  
See the capture guide inside `notebooks/P6_CNN_Scratch.ipynb` (Section 2) for exact instructions.

---

## 3. Part A: Running the Notebooks <a name="part-a"></a>

### Installation
```bash
cd dl_lab
pip install -r requirements.txt
jupyter notebook
```

### Execution order (IMPORTANT — same dataset split used across all)
| Step | Notebook | Maps to |
|------|----------|---------|
| 1 | `P6_CNN_Scratch.ipynb` | Practical 6 – CNN |
| 2 | `P4_Optimizers.ipynb` | Practical 4 – Optimizers |
| 3 | `P5_Regularizers.ipynb` | Practical 5 – Regularizers |
| 4 | `P7_TransferLearning.ipynb` | Practical 7 – Transfer Learning |
| 5 | `Export_TFLite.ipynb` | TFLite export & quantisation |

After step 5, copy the outputs to the app:
```bash
cp assets/currency_detector.tflite NoteReaderApp/assets/model/
cp assets/labels.json              NoteReaderApp/assets/model/
cp assets/model_config.json        NoteReaderApp/assets/model/
```

---

## 4. Part B: Building and Installing the App <a name="part-b"></a>

### Why NOT Expo Go?
`react-native-fast-tflite` and `react-native-vision-camera` contain native C++/Java modules.  
Expo Go does not support custom native modules. You need a **development build** or a signed APK.

### Prerequisites
- Node.js ≥ 18
- Android Studio with SDK 33+ and NDK installed
- A physical Android device (emulators have no real camera)
- ADB enabled and phone connected via USB

### Install dependencies
```bash
cd NoteReaderApp
npm install
```

### Development build (recommended for testing)
```bash
# Option A: local build (Android Studio required)
npx expo prebuild --platform android
cd android && ./gradlew assembleDebug
# APK will be at: android/app/build/outputs/apk/debug/app-debug.apk

# Option B: EAS Build (requires Expo account, builds in cloud)
npm install -g eas-cli
eas login
eas build --platform android --profile development
```

### Install debug APK on your phone
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### Release APK (for distribution)
```bash
cd android
./gradlew assembleRelease
# Sign the APK with your keystore:
# jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
#   -keystore my-release-key.jks app-release-unsigned.apk alias_name
adb install android/app/build/outputs/apk/release/app-release.apk
```

### Run unit tests
```bash
npx jest
```

---

## 5. Troubleshooting <a name="troubleshooting"></a>

| Problem | Solution |
|---------|----------|
| `react-native-fast-tflite` build error | Ensure NDK 25+ is installed in Android Studio |
| Camera permission denied | App will speak guidance; go to Settings > Apps > NoteReader > Permissions |
| Hindi/Marathi voice not working | App warns you and falls back to English. Go to Settings > Text-to-speech > Install language |
| Model not found crash | Copy `currency_detector.tflite` to `NoteReaderApp/assets/model/` before building |
| Frame processor crashes | Confirm `babel.config.js` has `react-native-reanimated/plugin` listed last |
| Very slow inference | Enable NNAPI delegate: add `delegate: 'nnapi'` in `loadTensorflowModel()` options |
| Gradlew fails on Windows | Run `./gradlew.bat assembleDebug` instead |

---

## 6. Architecture Notes <a name="architecture"></a>

```
Phone Camera  →  Vision Camera frame processor (C++ worklet thread)
                        ↓
                resize-plugin (224×224 RGB → [-1,1] Float32)
                        ↓
                fast-tflite.runSync()  ← MobileNetV2 INT8 TFLite
                        ↓
              6 softmax probabilities
                        ↓
              Confidence threshold (>70%)
                        ↓
              3-consecutive-frames filter
                        ↓
              JS thread: expo-speech + Vibration
```

**No data ever leaves the phone.** All processing is on-device.  
The TFLite model (~4 MB after INT8 quantisation) runs in ~20–50 ms on a mid-range Android CPU.
