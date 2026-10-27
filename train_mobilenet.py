"""
train_mobilenet.py  –  Phase 1 / Step 3
MobileNetV2 transfer-learning on the group-stratified split.

Outputs
-------
models/mobilenet_v1.pth           – best checkpoint (val macro-F1)
reports/phase1_confusion_matrix.png
reports/phase1_metrics.json
"""

import os, sys, json, random, time
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, WeightedRandomSampler
from torchvision import datasets, transforms, models
from sklearn.metrics import (
    classification_report, confusion_matrix, f1_score
)
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

# ── reproducibility ─────────────────────────────────────────────────────────
SEED = 42
random.seed(SEED); np.random.seed(SEED); torch.manual_seed(SEED)

CLASSES   = ['10','20','50','100','200','500','2000','not_a_note']
TRAIN_DIR = os.path.join('data','processed','train')
VAL_DIR   = os.path.join('data','processed','val')
MODEL_DIR = 'models'
REPORT_DIR= 'reports'
os.makedirs(MODEL_DIR,  exist_ok=True)
os.makedirs(REPORT_DIR, exist_ok=True)

DEVICE    = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
IMG_SIZE  = 224
BATCH     = 32

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD  = [0.229, 0.224, 0.225]

# ── 1. shared preprocess (SAME function used for camera + gallery + training) ─
def preprocess_for_model(img_size=224):
    """Returns the deterministic preprocess transform.  Use this everywhere."""
    return transforms.Compose([
        transforms.Resize((img_size, img_size)),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ])

# ── 2. augmentation (train only) ─────────────────────────────────────────────
train_aug = transforms.Compose([
    transforms.Resize((int(IMG_SIZE*1.15), int(IMG_SIZE*1.15))),
    transforms.RandomCrop(IMG_SIZE),
    transforms.RandomHorizontalFlip(p=0.3),          # safe for Indian notes
    transforms.RandomRotation(25),
    transforms.RandomPerspective(distortion_scale=0.3, p=0.5),
    transforms.ColorJitter(brightness=0.4, contrast=0.4,
                           saturation=0.15, hue=0.04),   # hue jitter tiny!
    transforms.RandomGrayscale(p=0.05),
    transforms.GaussianBlur(kernel_size=3, sigma=(0.1, 2.0)),
    transforms.ToTensor(),
    transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    transforms.RandomErasing(p=0.25, scale=(0.02, 0.15)),  # partial crop
])

val_tf = preprocess_for_model(IMG_SIZE)

# ── 3. data loaders ──────────────────────────────────────────────────────────
def make_loaders():
    train_ds = datasets.ImageFolder(TRAIN_DIR, transform=train_aug)
    val_ds   = datasets.ImageFolder(VAL_DIR,   transform=val_tf)

    # Weighted sampler to handle class imbalance
    class_counts  = np.array([len(os.listdir(os.path.join(TRAIN_DIR, c)))
                               for c in train_ds.classes])
    sample_weights= 1.0 / class_counts[train_ds.targets]
    sampler = WeightedRandomSampler(sample_weights, len(sample_weights),
                                    replacement=True)

    train_loader = DataLoader(train_ds, batch_size=BATCH, sampler=sampler,
                              num_workers=0, pin_memory=False)
    val_loader   = DataLoader(val_ds,   batch_size=BATCH, shuffle=False,
                              num_workers=0, pin_memory=False)
    return train_loader, val_loader, train_ds.classes

# ── 4. model ─────────────────────────────────────────────────────────────────
def build_model(num_classes, unfreeze=False):
    m = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.IMAGENET1K_V1)
    # Freeze backbone
    for p in m.features.parameters():
        p.requires_grad = False
    if unfreeze:
        # Unfreeze last 3 InvertedResidual blocks (layers 16,17,18)
        for layer in m.features[16:]:
            for p in layer.parameters():
                p.requires_grad = True
    # Replace classifier head
    in_features = m.classifier[1].in_features
    m.classifier = nn.Sequential(
        nn.Dropout(p=0.3),
        nn.Linear(in_features, 256),
        nn.ReLU(),
        nn.Dropout(p=0.2),
        nn.Linear(256, num_classes),
    )
    return m.to(DEVICE)

# ── 5. label-smoothed cross-entropy ──────────────────────────────────────────
class LabelSmoothingCE(nn.Module):
    def __init__(self, classes, smoothing=0.1):
        super().__init__()
        self.smoothing = smoothing
        self.cls = classes

    def forward(self, pred, target):
        confidence = 1.0 - self.smoothing
        smooth_val  = self.smoothing / (self.cls - 1)
        with torch.no_grad():
            onehot = torch.full_like(pred, smooth_val)
            onehot.scatter_(1, target.unsqueeze(1), confidence)
        log_probs = torch.nn.functional.log_softmax(pred, dim=1)
        loss = -(onehot * log_probs).sum(dim=1).mean()
        return loss

# ── 6. training loop ─────────────────────────────────────────────────────────
def train_one_epoch(model, loader, criterion, optimizer, scheduler=None):
    model.train()
    total_loss, correct, total = 0., 0, 0
    for imgs, labels in loader:
        imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
        optimizer.zero_grad()
        out = model(imgs)
        loss = criterion(out, labels)
        loss.backward()
        nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()
        if scheduler: scheduler.step()
        total_loss += loss.item() * imgs.size(0)
        preds = out.argmax(1)
        correct += (preds == labels).sum().item()
        total   += imgs.size(0)
    return total_loss/total, correct/total

@torch.no_grad()
def evaluate(model, loader, criterion, class_names):
    model.eval()
    total_loss, all_preds, all_labels = 0., [], []
    for imgs, labels in loader:
        imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
        out  = model(imgs)
        loss = criterion(out, labels)
        total_loss += loss.item() * imgs.size(0)
        all_preds.extend(out.argmax(1).cpu().numpy())
        all_labels.extend(labels.cpu().numpy())
    n = len(all_labels)
    acc = np.mean(np.array(all_preds)==np.array(all_labels))
    f1  = f1_score(all_labels, all_preds, average='macro', zero_division=0)
    return total_loss/n, acc, f1, all_preds, all_labels

# ── 7. confusion matrix ───────────────────────────────────────────────────────
def save_confusion_matrix(labels, preds, class_names, path, title):
    cm = confusion_matrix(labels, preds)
    fig, ax = plt.subplots(figsize=(9, 7))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=class_names, yticklabels=class_names, ax=ax)
    ax.set_xlabel('Predicted', fontsize=11)
    ax.set_ylabel('True',      fontsize=11)
    ax.set_title(title,        fontsize=13)
    plt.tight_layout()
    plt.savefig(path, dpi=130)
    plt.close()
    print(f"Saved confusion matrix: {path}")

# ── 8. main ───────────────────────────────────────────────────────────────────
def main():
    print(f"Device: {DEVICE}")
    print(f"PyTorch: {torch.__version__}")
    train_loader, val_loader, class_names = make_loaders()
    NUM_CLASSES = len(class_names)
    print(f"Classes ({NUM_CLASSES}): {class_names}\n")

    criterion = LabelSmoothingCE(NUM_CLASSES, smoothing=0.1)

    # ── Phase A: freeze backbone, train head only (10 epochs) ───────────────
    print("=" * 60)
    print("PHASE A: Frozen backbone – training head only (10 epochs)")
    print("=" * 60)
    model = build_model(NUM_CLASSES, unfreeze=False)
    optimizer_a = optim.AdamW(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=3e-3, weight_decay=1e-4
    )
    sched_a = optim.lr_scheduler.OneCycleLR(
        optimizer_a, max_lr=3e-3,
        steps_per_epoch=len(train_loader), epochs=10
    )

    best_f1, best_state = 0., None
    history = {'phase': 'A', 'train_loss': [], 'val_loss': [],
               'train_acc': [], 'val_acc': [], 'val_f1': []}

    for epoch in range(1, 11):
        t0 = time.time()
        tr_loss, tr_acc = train_one_epoch(model, train_loader, criterion,
                                          optimizer_a, sched_a)
        vl_loss, vl_acc, vl_f1, _, _ = evaluate(model, val_loader,
                                                  criterion, class_names)
        elapsed = time.time() - t0
        history['train_loss'].append(round(tr_loss, 4))
        history['val_loss'].append(round(vl_loss, 4))
        history['train_acc'].append(round(tr_acc, 4))
        history['val_acc'].append(round(vl_acc, 4))
        history['val_f1'].append(round(vl_f1, 4))
        print(f"A-Ep {epoch:02d} | tr_loss={tr_loss:.4f} tr_acc={tr_acc:.3f}"
              f" | val_loss={vl_loss:.4f} val_acc={vl_acc:.3f}"
              f" val_macroF1={vl_f1:.3f} | {elapsed:.1f}s")

        if vl_f1 > best_f1:
            best_f1 = vl_f1
            best_state = {k: v.cpu().clone()
                          for k, v in model.state_dict().items()}

    print(f"\nPhase A best val macro-F1: {best_f1:.4f}")
    model.load_state_dict(best_state)

    # ── Phase B: unfreeze top 3 blocks, fine-tune at 10× lower LR (10 epochs)─
    print("\n" + "=" * 60)
    print("PHASE B: Unfreeze top 3 blocks – fine-tune (10 epochs)")
    print("=" * 60)
    model_b = build_model(NUM_CLASSES, unfreeze=True)
    model_b.load_state_dict({k: v.to(DEVICE) for k, v in best_state.items()})
    optimizer_b = optim.AdamW([
        {'params': model_b.features[16:].parameters(), 'lr': 3e-4},
        {'params': model_b.classifier.parameters(),     'lr': 3e-4},
    ], weight_decay=1e-4)
    sched_b = optim.lr_scheduler.CosineAnnealingLR(optimizer_b, T_max=10)

    best_f1_b, best_state_b = 0., None
    history_b = {'phase': 'B', 'train_loss': [], 'val_loss': [],
                 'train_acc': [], 'val_acc': [], 'val_f1': []}

    for epoch in range(1, 11):
        t0 = time.time()
        tr_loss, tr_acc = train_one_epoch(model_b, train_loader, criterion,
                                          optimizer_b, None)
        sched_b.step()
        vl_loss, vl_acc, vl_f1, vl_preds, vl_labels = evaluate(
            model_b, val_loader, criterion, class_names)
        elapsed = time.time() - t0
        history_b['train_loss'].append(round(tr_loss, 4))
        history_b['val_loss'].append(round(vl_loss, 4))
        history_b['train_acc'].append(round(tr_acc, 4))
        history_b['val_acc'].append(round(vl_acc, 4))
        history_b['val_f1'].append(round(vl_f1, 4))
        print(f"B-Ep {epoch:02d} | tr_loss={tr_loss:.4f} tr_acc={tr_acc:.3f}"
              f" | val_loss={vl_loss:.4f} val_acc={vl_acc:.3f}"
              f" val_macroF1={vl_f1:.3f} | {elapsed:.1f}s")

        if vl_f1 > best_f1_b:
            best_f1_b = vl_f1
            best_state_b = {k: v.cpu().clone()
                            for k, v in model_b.state_dict().items()}
            final_preds  = list(vl_preds)
            final_labels = list(vl_labels)

    print(f"\nPhase B best val macro-F1: {best_f1_b:.4f}")
    model_b.load_state_dict(best_state_b)

    # ── save checkpoint ──────────────────────────────────────────────────────
    ckpt_path = os.path.join(MODEL_DIR, 'mobilenet_v1.pth')
    torch.save({
        'state_dict': best_state_b,
        'class_names': class_names,
        'val_macro_f1': best_f1_b,
        'img_size': IMG_SIZE,
    }, ckpt_path)
    print(f"\nCheckpoint saved: {ckpt_path}")

    # ── per-class report ─────────────────────────────────────────────────────
    print("\n--- Provisional Val Set Classification Report ---")
    print("(⚠ PROVISIONAL – no real phone photos in val set yet)")
    report = classification_report(
        final_labels, final_preds,
        target_names=class_names, zero_division=0
    )
    print(report)

    # ── confusion matrix ─────────────────────────────────────────────────────
    cm_path = os.path.join(REPORT_DIR, 'phase1_confusion_matrix.png')
    save_confusion_matrix(
        final_labels, final_preds, class_names, cm_path,
        "Phase 1 – Provisional Val CM (NO real phone photos yet)"
    )

    # ── data shortage report ─────────────────────────────────────────────────
    print("\n--- DATA SHORTAGE ANALYSIS ---")
    TARGET_PER_CLASS = 150
    train_counts = {c: len(os.listdir(os.path.join(TRAIN_DIR, c)))
                    for c in class_names}
    for cls, cnt in train_counts.items():
        gap = max(0, TARGET_PER_CLASS - cnt)
        label = f"Rs.{cls}" if cls != 'not_a_note' else cls
        status = "✅ OK" if gap == 0 else f"❌ NEED {gap} MORE"
        print(f"  {label:<14}: {cnt:>4} train images  {status}")

    # ── save metrics JSON ────────────────────────────────────────────────────
    metrics = {
        "warning": "PROVISIONAL – based on grouped Kaggle split only. No real phone photos tested.",
        "best_val_macro_f1": round(best_f1_b, 4),
        "history_phase_a": history,
        "history_phase_b": history_b,
        "data_counts_train": train_counts,
    }
    with open(os.path.join(REPORT_DIR, 'phase1_metrics.json'), 'w') as f:
        json.dump(metrics, f, indent=2)
    print(f"\nMetrics saved: {os.path.join(REPORT_DIR, 'phase1_metrics.json')}")

if __name__ == '__main__':
    main()
