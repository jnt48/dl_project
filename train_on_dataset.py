"""
train_on_dataset.py
Fast vectorized training script that loads real Indian currency note images,
trains a Deep Neural Network, extracts empirical prototypes, and exports calibrated weights.
"""

import os
import sys

# Configure UTF-8 stdout for Windows consoles
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

import glob
import math
import json
import numpy as np
from PIL import Image
import torch
import torch.nn as nn
import torch.optim as optim
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix

CLASSES = ['10', '20', '50', '100', '200', '500']
CLASS_TO_IDX = {c: i for i, c in enumerate(CLASSES)}

def extract_features_vectorized(img_path):
    try:
        img = Image.open(img_path).convert('RGB')
        img = img.resize((64, 64), Image.Resampling.BILINEAR)
        arr = np.array(img, dtype=np.float32)
    except Exception:
        return None

    # Exclude extreme outer 8% frame border
    arr = arr[5:59, 5:59]
    r = arr[:, :, 0]
    g = arr[:, :, 1]
    b = arr[:, :, 2]
    lum = 0.299 * r + 0.587 * g + 0.114 * b

    valid_mask = lum >= 25.0
    if np.sum(valid_mask) < 30:
        return None

    r_v = r[valid_mask]
    g_v = g[valid_mask]
    b_v = b[valid_mask]
    lum_v = lum[valid_mask]

    # Vectorized RGB to HSV
    r_n, g_n, b_n = r_v / 255.0, g_v / 255.0, b_v / 255.0
    mx = np.maximum(np.maximum(r_n, g_n), b_n)
    mn = np.minimum(np.minimum(r_n, g_n), b_n)
    df = mx - mn
    v_v = mx
    s_v = np.where(mx > 0, df / (mx + 1e-6), 0.0)

    # Hue angles in radians
    h_rad = np.zeros_like(mx)
    mask_r = (mx == r_n) & (df > 0.001)
    mask_g = (mx == g_n) & (df > 0.001)
    mask_b = (mx == b_n) & (df > 0.001)
    h_rad[mask_r] = ((g_n[mask_r] - b_n[mask_r]) / df[mask_r]) % 6.0
    h_rad[mask_g] = ((b_n[mask_g] - r_n[mask_g]) / df[mask_g]) + 2.0
    h_rad[mask_b] = ((r_n[mask_b] - g_n[mask_b]) / df[mask_b]) + 4.0
    h_rad = (h_rad / 6.0) * 2.0 * np.pi

    # Global channel ratios
    g_tot = np.sum(r_v) + np.sum(g_v) + np.sum(b_v)
    if g_tot < 1.0:
        return None
    nr = float(np.sum(r_v) / g_tot)
    ng = float(np.sum(g_v) / g_tot)
    nb = float(np.sum(b_v) / g_tot)
    mean_s = float(np.mean(s_v))
    mean_v = float(np.mean(v_v))

    # Chromatic saliency
    s85 = float(np.percentile(s_v, 85))
    s_thresh = max(0.12, min(0.22, s85 * 0.60))

    chroma_mask = (s_v >= s_thresh) & (lum_v >= 35.0) & (lum_v <= 248.0)
    n_chroma = np.sum(chroma_mask)
    chroma_frac = float(n_chroma / len(r_v))

    if chroma_frac >= 0.08 and n_chroma >= 15:
        c_r = r_v[chroma_mask]
        c_g = g_v[chroma_mask]
        c_b = b_v[chroma_mask]
        c_tot = np.sum(c_r) + np.sum(c_g) + np.sum(c_b)
        c_nr = float(np.sum(c_r) / c_tot)
        c_ng = float(np.sum(c_g) / c_tot)
        c_nb = float(np.sum(c_b) / c_tot)
        c_s = float(np.mean(s_v[chroma_mask]))
        sin_h_mean = float(np.mean(np.sin(h_rad[chroma_mask])))
        cos_h_mean = float(np.mean(np.cos(h_rad[chroma_mask])))
        norm = math.hypot(sin_h_mean, cos_h_mean)
        sin_h = sin_h_mean / norm if norm > 0.01 else 0.0
        cos_h = cos_h_mean / norm if norm > 0.01 else 0.0
    else:
        c_nr, c_ng, c_nb = nr, ng, nb
        c_s = mean_s
        sin_h, cos_h = 0.0, 0.0

    return [nr, ng, nb, mean_s, mean_v, chroma_frac, c_nr, c_ng, c_nb, c_s, sin_h, cos_h]

def load_dataset():
    X, y = [], []
    data_roots = [
        os.path.join('assets', 'data'),
        os.path.join('dataset', 'hf_currency', 'data'),
    ]

    for root in data_roots:
        if not os.path.exists(root):
            continue
        print(f"Loading images from: {root}")
        for cls_name in CLASSES:
            folder = os.path.join(root, cls_name)
            if not os.path.exists(folder):
                continue
            files = glob.glob(os.path.join(folder, '*.png')) + glob.glob(os.path.join(folder, '*.jpg'))
            cnt = 0
            for f in files:
                feat = extract_features_vectorized(f)
                if feat is not None:
                    X.append(feat)
                    y.append(CLASS_TO_IDX[cls_name])
                    cnt += 1
            print(f"  Class Rs.{cls_name:>3}: processed {cnt}/{len(files)} images")

    X = np.array(X, dtype=np.float32)
    y = np.array(y, dtype=np.int64)
    print(f"\nTotal valid feature vectors loaded: {len(X)}")
    return X, y

class CurrencyDeepMLP(nn.Module):
    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(12, 32),
            nn.BatchNorm1d(32),
            nn.ReLU(),
            nn.Dropout(0.15),
            nn.Linear(32, 16),
            nn.ReLU(),
            nn.Linear(16, 6)
        )
    def forward(self, x):
        return self.net(x)

def main():
    print("=" * 60)
    print("TRAINING MODEL DIRECTLY ON INDIAN CURRENCY DATASET")
    print("=" * 60)
    sys.stdout.flush()

    X, y = load_dataset()
    if len(X) == 0:
        print("ERROR: No images found.")
        return

    # Train/Test Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f"Training set: {len(X_train)} samples, Test set: {len(X_test)} samples")
    sys.stdout.flush()

    # Compute Empirical Prototypes directly from the dataset
    prototypes = {}
    stds = {}
    print("\n--- Empirical Dataset Prototypes (Centroids) ---")
    for cls_name in CLASSES:
        idx = CLASS_TO_IDX[cls_name]
        cls_samples = X_train[y_train == idx]
        mean_vec = np.mean(cls_samples, axis=0)
        std_vec = np.std(cls_samples, axis=0) + 1e-4
        prototypes[cls_name] = [round(float(v), 4) for v in mean_vec]
        stds[cls_name] = [round(float(v), 4) for v in std_vec]
        print(f"Rs.{cls_name:>3}: {prototypes[cls_name]}")
    sys.stdout.flush()

    # Optimal feature weights (Fisher Criterion: between-class / within-class variance)
    overall_mean = np.mean(X_train, axis=0)
    between_var = np.zeros(12)
    within_var = np.zeros(12)
    for cls_name in CLASSES:
        idx = CLASS_TO_IDX[cls_name]
        cls_samples = X_train[y_train == idx]
        between_var += len(cls_samples) * (np.mean(cls_samples, axis=0) - overall_mean) ** 2
        within_var += np.sum((cls_samples - np.mean(cls_samples, axis=0)) ** 2, axis=0)

    fisher = between_var / (within_var + 1e-5)
    norm_w = fisher / np.mean(fisher)
    metric_weights = [round(float(max(2.0, min(10.0, w * 4.5))), 2) for w in norm_w]
    print(f"\nEmpirical Metric Distance Weights: {metric_weights}")
    sys.stdout.flush()

    # Train PyTorch Deep Neural Network
    torch.manual_seed(42)
    model = CurrencyDeepMLP()
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=0.005, weight_decay=1e-4)

    dataset_train = torch.utils.data.TensorDataset(
        torch.from_numpy(X_train), torch.from_numpy(y_train)
    )
    train_loader = torch.utils.data.DataLoader(dataset_train, batch_size=32, shuffle=True)

    print("\nTraining Deep Neural Network for 45 Epochs...")
    sys.stdout.flush()
    model.train()
    for epoch in range(45):
        for bx, by in train_loader:
            optimizer.zero_grad()
            out = model(bx)
            loss = criterion(out, by)
            loss.backward()
            optimizer.step()

    # Evaluate on Test Set
    model.eval()
    with torch.no_grad():
        test_logits = model(torch.from_numpy(X_test))
        preds = torch.argmax(test_logits, dim=1).numpy()
        acc = (preds == y_test).mean() * 100.0

    print(f"\n=======================================================")
    print(f"[SUCCESS] MODEL TRAINED! Test Accuracy on Dataset: {acc:.2f}%")
    print(f"=======================================================\n")
    print("Classification Report:")
    print(classification_report(y_test, preds, target_names=[f"Rs.{c}" for c in CLASSES]))
    sys.stdout.flush()

    # Save PyTorch model state dict
    pt_path = os.path.join("assets", "model", "currency_model.pt")
    os.makedirs(os.path.dirname(pt_path), exist_ok=True)
    torch.save(model.state_dict(), pt_path)
    print(f"Saved PyTorch weights checkpoint to: {pt_path}")

    # Fold BatchNorm into Linear layer 0 for ultra-fast, zero-dependency inference
    w0 = model.net[0].weight.detach().numpy()
    b0 = model.net[0].bias.detach().numpy()
    gamma = model.net[1].weight.detach().numpy()
    beta = model.net[1].bias.detach().numpy()
    mean = model.net[1].running_mean.detach().numpy()
    var = model.net[1].running_var.detach().numpy()
    eps = 1e-5

    scale = gamma / np.sqrt(var + eps)
    w0_folded = (w0 * scale[:, None]).tolist()
    b0_folded = ((b0 - mean) * scale + beta).tolist()

    w1 = model.net[4].weight.detach().numpy().tolist()
    b1 = model.net[4].bias.detach().numpy().tolist()

    w2 = model.net[6].weight.detach().numpy().tolist()
    b2 = model.net[6].bias.detach().numpy().tolist()

    # Export trained configuration
    export_data = {
        "model_name": "IndianCurrencyDataset_Trained_v1",
        "num_classes": 6,
        "classes": CLASSES,
        "test_accuracy": round(float(acc), 2),
        "total_images_trained": int(len(X)),
        "prototypes": prototypes,
        "metric_weights": metric_weights,
        "neural_network": {
            "w0": w0_folded,
            "b0": b0_folded,
            "w1": w1,
            "b1": b1,
            "w2": w2,
            "b2": b2
        }
    }

    out_paths = [
        os.path.join("assets", "model", "trained_dataset_model.json"),
        os.path.join("NoteReaderApp", "src", "services", "trained_model.json")
    ]
    for out_json in out_paths:
        os.makedirs(os.path.dirname(out_json), exist_ok=True)
        with open(out_json, "w") as f:
            json.dump(export_data, f, indent=2)
        print(f"Exported trained dataset model to: {out_json}")
    sys.stdout.flush()

if __name__ == '__main__':
    main()
