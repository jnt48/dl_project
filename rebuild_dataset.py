"""
rebuild_dataset.py
Rebuilds the entire dataset with strict Group-Stratified Train/Val split:
1. Uses ONLY assets/data for Kaggle notes (drops redundant copies).
2. Uses dHash (Hamming <= 4) + prefix matching to form immutable Note Groups.
3. Subsamples dataset/hf_currency bulk data grouped by root video sequence.
4. Generates a realistic 'not_a_note' background class (~150 images).
5. Splits by group (80/20) with zero leakage.
6. Resizes all images to 224x224 RGB and exports to data/processed/.
"""

import os
import re
import glob
import json
import random
import shutil
from collections import defaultdict
from PIL import Image, ImageFilter, ImageDraw
import numpy as np

random.seed(42)
np.random.seed(42)

CLASSES = ['10', '20', '50', '100', '200', '500', '2000', 'not_a_note']

def compute_dhash(img, hash_size=8):
    resized = img.convert('L').resize((hash_size + 1, hash_size), Image.Resampling.BILINEAR)
    pixels = np.array(resized)
    diff = pixels[:, 1:] > pixels[:, :-1]
    decimal_val = 0
    for idx, val in enumerate(diff.flatten()):
        if val:
            decimal_val += 2 ** idx
    return f"{decimal_val:016x}"

def hamming_dist(h1, h2):
    return bin(int(h1, 16) ^ int(h2, 16)).count('1')

def get_base_id(filename):
    # E.g. "301_cb.png" -> "301", "301_sharp.png" -> "301", "301.png" -> "301"
    name = os.path.splitext(filename)[0]
    name = re.sub(r'(_cb|_sharp|_blur|_aug\d*)$', '', name)
    return name

def group_kaggle_images(class_folder):
    files = glob.glob(os.path.join(class_folder, '*.png')) + glob.glob(os.path.join(class_folder, '*.jpg'))
    file_hashes = {}
    base_groups = defaultdict(list)

    for f in files:
        base = get_base_id(os.path.basename(f))
        base_groups[base].append(f)
        try:
            with Image.open(f) as img:
                file_hashes[f] = compute_dhash(img)
        except Exception:
            pass

    # Connected components using base prefixes + dHash distance <= 4
    file_list = list(file_hashes.keys())
    parent = {f: f for f in file_list}

    def find(x):
        if parent[x] != x:
            parent[x] = find(parent[x])
        return parent[x]

    def union(x, y):
        rx, ry = find(x), find(y)
        if rx != ry:
            parent[rx] = ry

    # Union files with same base filename prefix
    for base, flist in base_groups.items():
        for i in range(1, len(flist)):
            if flist[0] in parent and flist[i] in parent:
                union(flist[0], flist[i])

    # Union files with perceptual dHash Hamming distance <= 4
    n = len(file_list)
    for i in range(n):
        f1 = file_list[i]
        h1 = file_hashes[f1]
        for j in range(i + 1, n):
            f2 = file_list[j]
            h2 = file_hashes[f2]
            if hamming_dist(h1, h2) <= 4:
                union(f1, f2)

    groups = defaultdict(list)
    for f in file_list:
        root = find(f)
        groups[root].append(f)

    return list(groups.values())

def group_hf_currency(class_name, target_count=150):
    folder_name = f"Rs.{class_name}"
    folder_path = os.path.join('dataset', 'hf_currency', folder_name)
    if not os.path.exists(folder_path):
        return []

    files = sorted(glob.glob(os.path.join(folder_path, '*.jpg')) + glob.glob(os.path.join(folder_path, '*.png')))
    if not files:
        return []

    # Group by video sequence: extract sequence prefix before the UUID
    seq_groups = defaultdict(list)
    for f in files:
        bn = os.path.basename(f)
        # E.g. "10_original_1.jpg_ac34d49b-..." -> "10_original_1"
        match = re.match(r'^(.*?\.(?:jpg|png))_[a-f0-9\-]+', bn, re.IGNORECASE)
        seq_id = match.group(1) if match else bn.split('_')[0]
        seq_groups[seq_id].append(f)

    # Subsample frames evenly across sequences to get ~target_count
    total_avail = len(files)
    step = max(1, total_avail // target_count)
    selected_groups = []

    for seq_id, seq_files in seq_groups.items():
        sub = seq_files[::step]
        if sub:
            selected_groups.append(sub)

    return selected_groups

def generate_not_a_note_images(out_dir, count=160):
    """Generates non-note background images (tables, fabrics, hands, desk objects)."""
    os.makedirs(out_dir, exist_ok=True)
    images = []

    # 1. Harvest background corners from high-res dataset photos
    hf_samples = glob.glob(os.path.join('dataset', 'hf_currency', '**', '*.jpg'), recursive=True)
    random.shuffle(hf_samples)
    harvested = 0
    for hf_img in hf_samples[:100]:
        if harvested >= 80:
            break
        try:
            with Image.open(hf_img) as im:
                w, h = im.size
                if w >= 800 and h >= 800:
                    # Top-left corner (typically pure background table/floor)
                    crop_tl = im.crop((0, 0, int(w * 0.28), int(h * 0.28))).resize((224, 224), Image.Resampling.BILINEAR)
                    fn = f"bg_table_corner_tl_{harvested}.jpg"
                    crop_tl.save(os.path.join(out_dir, fn), quality=92)
                    images.append(os.path.join(out_dir, fn))
                    harvested += 1

                    # Bottom-right corner
                    crop_br = im.crop((int(w * 0.72), int(h * 0.72), w, h)).resize((224, 224), Image.Resampling.BILINEAR)
                    fn2 = f"bg_table_corner_br_{harvested}.jpg"
                    crop_br.save(os.path.join(out_dir, fn2), quality=92)
                    images.append(os.path.join(out_dir, fn2))
                    harvested += 1
        except Exception:
            pass

    # 2. Synthesize varied desk, wood, fabric, and hand textures
    wood_colors = [(180, 115, 60), (139, 90, 43), (210, 160, 110), (110, 75, 45), (70, 50, 35)]
    skin_colors = [(224, 172, 105), (198, 134, 66), (141, 85, 36), (241, 194, 125)]
    cloth_colors = [(40, 60, 100), (180, 190, 200), (80, 80, 80), (190, 70, 70), (220, 220, 210)]

    for i in range(harvested, count):
        arr = np.zeros((224, 224, 3), dtype=np.uint8)
        mode_idx = i % 4

        if mode_idx == 0:  # Wood desk texture
            base_col = random.choice(wood_colors)
            noise = np.random.normal(0, 14, (224, 224, 3))
            arr[:, :] = np.clip(np.array(base_col) + noise, 0, 255)
            # Add horizontal wood grain streaks
            for y in range(0, 224, random.randint(4, 12)):
                arr[y:y+2, :] = np.clip(arr[y:y+2, :] * 0.85, 0, 255)
            img = Image.fromarray(arr).filter(ImageFilter.GaussianBlur(1.0))
            fn = f"synth_wood_desk_{i}.jpg"

        elif mode_idx == 1:  # Cloth / Bedsheet
            base_col = random.choice(cloth_colors)
            noise = np.random.normal(0, 18, (224, 224, 3))
            arr[:, :] = np.clip(np.array(base_col) + noise, 0, 255)
            img = Image.fromarray(arr).filter(ImageFilter.GaussianBlur(1.2))
            fn = f"synth_bedsheet_{i}.jpg"

        elif mode_idx == 2:  # Hand / Fingers
            base_col = random.choice(skin_colors)
            arr[:, :] = base_col
            img = Image.fromarray(arr)
            draw = ImageDraw.Draw(img)
            # Draw finger shapes / curves
            for f in range(3):
                x = random.randint(20, 180)
                draw.rectangle([x, 40, x + 35, 224], fill=(base_col[0] - 20, base_col[1] - 15, base_col[2] - 10))
            img = img.filter(ImageFilter.GaussianBlur(3.0))
            fn = f"synth_hand_fingers_{i}.jpg"

        else:  # Paper / White desk with shadows
            arr[:, :] = np.random.randint(220, 250, (224, 224, 3), dtype=np.uint8)
            img = Image.fromarray(arr)
            draw = ImageDraw.Draw(img)
            draw.line([(0, 80), (224, 160)], fill=(150, 150, 150), width=6)
            img = img.filter(ImageFilter.GaussianBlur(4.0))
            fn = f"synth_paper_desk_{i}.jpg"

        img.save(os.path.join(out_dir, fn), quality=90)
        images.append(os.path.join(out_dir, fn))

    # Group not_a_note files into groups of 3
    not_note_groups = []
    for g in range(0, len(images), 3):
        not_note_groups.append(images[g:g+3])
    return not_note_groups

def main():
    print("=" * 70)
    print("REBUILDING DATASET WITH GROUP-STRATIFIED SPLIT")
    print("=" * 70)

    out_root = os.path.join('data', 'processed')
    train_dir = os.path.join(out_root, 'train')
    val_dir = os.path.join(out_root, 'val')
    temp_bg_dir = os.path.join('data', 'temp_not_a_note')

    # Clean existing processed directory if present
    if os.path.exists(out_root):
        shutil.rmtree(out_root)
    os.makedirs(train_dir, exist_ok=True)
    os.makedirs(val_dir, exist_ok=True)

    manifest = {
        "dataset_name": "NoteReader_GroupStratified_v1",
        "classes": CLASSES,
        "split_ratio": "80% Train Groups / 20% Val Groups",
        "stats": {}
    }

    print("\nProcessing Denominations...")
    for cls in CLASSES:
        os.makedirs(os.path.join(train_dir, cls), exist_ok=True)
        os.makedirs(os.path.join(val_dir, cls), exist_ok=True)

        groups = []
        if cls == 'not_a_note':
            groups = generate_not_a_note_images(temp_bg_dir, count=150)
        else:
            # 1. Kaggle groups from assets/data
            k_folder = os.path.join('assets', 'data', cls)
            if os.path.exists(k_folder):
                k_groups = group_kaggle_images(k_folder)
                groups.extend(k_groups)

            # 2. Bulk HF groups from dataset/hf_currency
            hf_groups = group_hf_currency(cls, target_count=120)
            groups.extend(hf_groups)

        random.shuffle(groups)
        num_groups = len(groups)
        n_train = max(1, int(num_groups * 0.80))

        train_groups = groups[:n_train]
        val_groups = groups[n_train:]

        train_imgs = []
        val_imgs = []

        # Process and save Train images
        for g_idx, grp in enumerate(train_groups):
            for f_idx, fpath in enumerate(grp):
                try:
                    with Image.open(fpath) as img:
                        img = img.convert('RGB').resize((224, 224), Image.Resampling.BILINEAR)
                        out_fn = f"{cls}_tr_g{g_idx:03d}_f{f_idx:02d}.jpg"
                        img.save(os.path.join(train_dir, cls, out_fn), quality=92)
                        train_imgs.append(out_fn)
                except Exception as e:
                    pass

        # Process and save Val images
        for g_idx, grp in enumerate(val_groups):
            for f_idx, fpath in enumerate(grp):
                try:
                    with Image.open(fpath) as img:
                        img = img.convert('RGB').resize((224, 224), Image.Resampling.BILINEAR)
                        out_fn = f"{cls}_val_g{g_idx:03d}_f{f_idx:02d}.jpg"
                        img.save(os.path.join(val_dir, cls, out_fn), quality=92)
                        val_imgs.append(out_fn)
                except Exception as e:
                    pass

        manifest["stats"][cls] = {
            "total_groups": num_groups,
            "train_groups": len(train_groups),
            "val_groups": len(val_groups),
            "train_images": len(train_imgs),
            "val_images": len(val_imgs)
        }

    # Clean temporary background folder
    if os.path.exists(temp_bg_dir):
        shutil.rmtree(temp_bg_dir)

    manifest_path = os.path.join('data', 'splits_manifest.json')
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)

    # Print summary table
    print("\n" + "=" * 70)
    print(f"{'Class':<12} | {'Total Groups':<13} | {'Train Grp':<10} | {'Val Grp':<10} | {'Train Imgs':<10} | {'Val Imgs':<10}")
    print("-" * 70)
    tot_tr_g, tot_val_g, tot_tr_i, tot_val_i = 0, 0, 0, 0
    for cls in CLASSES:
        s = manifest["stats"][cls]
        tot_tr_g += s["train_groups"]
        tot_val_g += s["val_groups"]
        tot_tr_i += s["train_images"]
        tot_val_i += s["val_images"]
        print(f"{cls:<12} | {s['total_groups']:<13} | {s['train_groups']:<10} | {s['val_groups']:<10} | {s['train_images']:<10} | {s['val_images']:<10}")
    print("-" * 70)
    print(f"{'TOTAL':<12} | {tot_tr_g + tot_val_g:<13} | {tot_tr_g:<10} | {tot_val_g:<10} | {tot_tr_i:<10} | {tot_val_i:<10}")
    print("=" * 70)
    print(f"\nManifest saved to: {manifest_path}")

if __name__ == '__main__':
    main()
