import os
import glob
import random
import json
import numpy as np
from train_on_dataset import extract_features_vectorized

with open(os.path.join('NoteReaderApp', 'src', 'services', 'trained_model.json')) as f:
    model_data = json.load(f)

nn = model_data['neural_network']
CLASSES = model_data['classes']

def run_mlp(x):
    w0 = np.array(nn['w0'])
    b0 = np.array(nn['b0'])
    h0 = np.maximum(0, np.dot(w0, x) + b0)

    w1 = np.array(nn['w1'])
    b1 = np.array(nn['b1'])
    h1 = np.maximum(0, np.dot(w1, h0) + b1)

    w2 = np.array(nn['w2'])
    b2 = np.array(nn['b2'])
    logits = np.dot(w2, h1) + b2
    exps = np.exp(logits - np.max(logits))
    return exps / np.sum(exps)

print("=" * 60)
print("TESTING TRAINED DEEP NEURAL NETWORK ON REAL DATASET IMAGES")
print("=" * 60)

total_correct = 0
total_tested = 0

for c in CLASSES:
    files = glob.glob(os.path.join('assets', 'data', c, '*.png')) + glob.glob(os.path.join('assets', 'data', c, '*.jpg'))
    random.seed(42)
    sample = random.sample(files, min(40, len(files)))
    c_correct = 0
    c_tested = 0
    for path in sample:
        feat = extract_features_vectorized(path)
        if feat is not None:
            probs = run_mlp(feat)
            pred = CLASSES[np.argmax(probs)]
            c_tested += 1
            if pred == c:
                c_correct += 1

    total_correct += c_correct
    total_tested += c_tested
    pct = (c_correct / c_tested * 100) if c_tested > 0 else 0
    print(f"Rs. {c:>3}: {c_correct}/{c_tested} correct ({pct:.1f}%)")

overall = (total_correct / total_tested * 100) if total_tested > 0 else 0
print(f"\nOverall sample accuracy: {total_correct}/{total_tested} = {overall:.1f}%")
