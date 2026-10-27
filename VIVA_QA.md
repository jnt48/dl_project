# Viva Q&A – NoteReader Deep Learning Project
### RCOEM, Nagpur · CSE Deep Learning Lab

---

## Practical 6 – CNN Architecture

**Q: What is a convolution operation?**  
A convolution slides a small learnable filter (kernel) across the input image. At each position it computes the element-wise dot product of the kernel weights and the local patch of pixels. This produces one value in the output feature map. Mathematically: `output[i,j] = Σ_m Σ_n I[i+m, j+n] × K[m,n]`. Different kernels learn to detect edges, colours, and textures.

**Q: What is pooling? What does it achieve?**  
Max-pooling takes the maximum value in a small window (usually 2×2, stride 2). This:
1. Reduces spatial dimensions (saves memory and computation).
2. Adds translation invariance — a slightly shifted note still gives the same max.
3. Acts as a mild regulariser by discarding less-active neurons.

**Q: Why do we need Flatten?**  
After convolution/pooling, the data is a 3-D tensor (H×W×C). Dense layers expect a 1-D vector. Flatten reshapes it: (H×W×C) → (H·W·C,).

**Q: What is softmax and why use it for multi-class classification?**  
Softmax converts raw logit scores to probabilities summing to 1:  
`P(class k) = exp(z_k) / Σ_j exp(z_j)`  
The highest probability is the predicted denomination. Cross-entropy loss penalises wrong predictions.

**Q: Step through the 4×4 NumPy demo (P6 manual exercise).**  
*(See P6 notebook Section 1 — walk through each printed output)*
- Input: 4×4 matrix.
- Kernel: 3×3. Output size = (4-3+1)×(4-3+1) = 2×2.
- Each element = dot product of kernel and local patch.
- Flatten → 4 values. Dense: z = W·x + b. σ(z) = sigmoid. MSE loss.

---

## Practical 4 – Optimizers

**Q: What is the difference between SGD and Adam?**  
- SGD: one global learning rate for all parameters. Updates: `θ ← θ - α·∇L`.
- Adam: per-parameter adaptive rates using exponential moving averages of gradient (m) and squared gradient (v) with bias correction. Converges faster, especially with sparse gradients.

**Q: Why does Adam converge faster than plain SGD?**  
Adam normalises the gradient by `√v_t` — parameters with noisy gradients get smaller steps (stability); parameters with consistent gradients get larger steps (speed). This is why Adam typically reaches >80% val accuracy several epochs before SGD.

**Q: What is Nesterov momentum?**  
Standard momentum: compute gradient at current position, then update. Nesterov: look ahead to where momentum would take you, compute gradient there, then update. This makes corrections earlier and reduces oscillation.

**Q: Why does batch size affect training?**  
Smaller batches → noisier gradient estimate → implicit regularisation, can escape sharp minima, but more update steps per epoch. Larger batches → smoother gradient, faster per-epoch, but may land in sharper minima with worse generalisation.

**Q: Which optimizer did you use for the final model and why?**  
Adam (lr=1e-3 for head training, lr=1e-5 for fine-tuning). It converges fastest and is most stable for our small dataset.

---

## Practical 5 – Regularization

**Q: What is L1 regularization?**  
Adds `λ·Σ|w|` to the loss. Gradient = ±λ (sign(w)), pushing small weights exactly to zero → sparse model.

**Q: What is L2 regularization?**  
Adds `λ·Σw²` to the loss. Gradient = 2λw, shrinking weights proportionally towards zero (weight decay). None become exactly zero — all features stay active but are penalised if too large.

**Q: What is Dropout?**  
During training, randomly zero out a fraction *p* of neurons at each forward pass. This prevents co-adaptation and acts like an ensemble of many sub-networks.

**Q: What is EarlyStopping and why use it?**  
Monitors `val_loss`. If it doesn't improve for `patience=3` consecutive epochs, training stops and the best weights are restored. Prevents wasting compute on overfitting without any hyperparameter cost.

**Q: Which regularisation worked best for our small dataset?**  
L2 (λ=0.001) + Dropout (0.3) + EarlyStopping. L1 is too aggressive for currency features; large dropout (0.5) hurts accuracy; no regularisation overfits quickly.

---

## Practical 7 – Transfer Learning

**Q: What is transfer learning?**  
A model pre-trained on a large dataset (ImageNet, 1.2M images) has already learned general visual features (edges, textures, shapes). We transfer those by keeping the base frozen and training only a new classification head on our 6-class dataset. This requires far fewer images and epochs.

**Q: What is the difference between feature extraction and fine-tuning?**  
- Feature extraction: freeze all base weights, train only the new head (fast, works with little data).
- Fine-tuning: after head training, unfreeze the top N layers of the base and train with a very small LR (lr=1e-5) to adapt ImageNet features towards currency-specific patterns.

**Q: Why MobileNetV2 for the phone?**  
| Model | Size | Params | Phone-ready |
|-------|------|--------|------------|
| VGG16 | 528 MB | 138M | ✗ too large |
| ResNet50 | 98 MB | 25M | marginal |
| InceptionV3 | 92 MB | 23M | marginal |
| MobileNetV2 | 14 MB | 3.4M | ✓ designed for mobile |

MobileNetV2 uses depthwise-separable convolutions (factorised into depthwise + pointwise), reducing multiply-adds by ~8-9×. After INT8 quantisation: ~4 MB, ~20 ms inference.

**Q: What is depthwise-separable convolution?**  
Standard conv: D_F × D_F × M × N filters (M input channels, N output channels).  
Depthwise-separable splits into:  
1. Depthwise conv: D_F × D_F × 1 filter per channel (M filters total).  
2. Pointwise conv: 1×1 × M × N filters (combines channels).  
Cost reduction factor ≈ 1/N + 1/D_F². For N=32, D_F=3: ~9× fewer ops.

---

## TFLite & On-Device Inference

**Q: Why TFLite instead of running Keras on the phone?**  
TFLite is a stripped-down runtime optimised for mobile:  
- Model is serialised to a FlatBuffer (not Python pickle).
- Supports INT8 quantisation → 4× smaller, faster SIMD execution on ARM CPUs.
- No TensorFlow Python stack needed; tiny ~2 MB C++ runtime.
- Supports hardware delegates: NNAPI (Android), CoreML (iOS), GPU.

**Q: What is INT8 post-training quantisation?**  
FP32 weights (4 bytes each) are mapped to INT8 (1 byte):  
`int8_val = round(float32_val / scale) + zero_point`  
Scale/zero-point are computed per layer from a calibration dataset (~100 representative images).  
Result: ~75% size reduction, ~75% less memory bandwidth, with typically <1-2% accuracy drop.

**Q: Why run inference on the frame processor worklet thread?**  
Vision Camera's frame processor runs on a dedicated C++ thread. If we moved inference to the React JS/UI thread it would block the UI — causing dropped frames and a slow, unresponsive app. The `'worklet'` directive (from react-native-reanimated) marks the function to run on the C++ thread.

**Q: What are the limitations of this app?**  
1. No Rs 2000 note (not in any public dataset; also demonetised).  
2. No coins detected.  
3. Does not detect fake notes.  
4. Performance degrades with extremely crumpled or torn notes.  
5. Hindi/Marathi TTS requires the user to have voice data installed.  
6. Requires Android 7+ (Nougat) for NNAPI; older phones use CPU fallback.

**Q: What are future improvements?**  
1. Rs 2000 note support (capture dataset of new notes).  
2. Coin detection (requires separate model / training data).  
3. Marathi/Hindi offline voices bundled in the app.  
4. Automated capture guidance (voice instructions to help blind user frame the note).  
5. More languages: Tamil, Telugu, Bengali, Gujarati.  
6. Fake-note detection (requires dedicated IR/UV analysis hardware).
