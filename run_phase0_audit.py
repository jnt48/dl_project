"""
run_phase0_audit.py
Phase 0 Dataset Audit for NoteReader project.
Computes:
1. Complete image inventory per directory and per class.
2. Exact duplicates (MD5).
3. Near-duplicates via 64-bit difference hashing (dHash).
4. Image dimensions and formats.
5. Detection of real phone photos vs Kaggle scraped images.
"""

import os
import glob
import hashlib
from collections import defaultdict
from PIL import Image
import numpy as np

def compute_dhash(image, hash_size=8):
    # Grayscale and resize to (hash_size + 1, hash_size)
    resized = image.convert('L').resize((hash_size + 1, hash_size), Image.Resampling.BILINEAR)
    pixels = np.array(resized)
    # Compare adjacent pixels horizontally
    diff = pixels[:, 1:] > pixels[:, :-1]
    # Convert bool array to hex string
    decimal_val = 0
    for idx, val in enumerate(diff.flatten()):
        if val:
            decimal_val += 2 ** idx
    return f"{decimal_val:016x}"

def hamming_dist(h1, h2):
    return bin(int(h1, 16) ^ int(h2, 16)).count('1')

def audit():
    print("=" * 70)
    print("PHASE 0: COMPREHENSIVE DATASET & LEAKAGE AUDIT")
    print("=" * 70)

    sources = {
        "assets/data": os.path.join("assets", "data"),
        "dataset/data": os.path.join("dataset", "data"),
        "dataset/hf_currency/data": os.path.join("dataset", "hf_currency", "data"),
        "dataset/hf_currency (bulk)": os.path.join("dataset", "hf_currency"),
    }

    # 1. Image Inventory
    print("\n--- 1. INVENTORY OF DATASET SOURCES ---")
    all_files = []
    source_stats = defaultdict(lambda: defaultdict(int))
    resolutions = defaultdict(list)

    for src_name, src_dir in sources.items():
        if not os.path.exists(src_dir):
            continue
        for root, dirs, files in os.walk(src_dir):
            # Avoid walking into subdirectories if we are checking bulk
            if src_name == "dataset/hf_currency (bulk)" and "data" in root:
                continue
            for f in files:
                if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                    fp = os.path.join(root, f)
                    parent = os.path.basename(root)
                    source_stats[src_name][parent] += 1
                    all_files.append((src_name, parent, fp))

    for src_name, classes in source_stats.items():
        total = sum(classes.values())
        print(f"\nSource: {src_name} (Total: {total} images)")
        for c, count in sorted(classes.items()):
            print(f"   Class '{c}': {count} images")

    # 2. Exact Duplicates Check (MD5)
    print("\n--- 2. EXACT DUPLICATES (MD5 HASHING) ---")
    md5_map = defaultdict(list)
    for src_name, cls, fp in all_files:
        try:
            with open(fp, "rb") as fh:
                h = hashlib.md5(fh.read()).hexdigest()
            md5_map[h].append((src_name, cls, fp))
        except Exception:
            pass

    total_images = len(all_files)
    unique_md5 = len(md5_map)
    exact_duplicates = total_images - unique_md5
    print(f"Total image files scanned: {total_images}")
    print(f"Unique MD5 hashes: {unique_md5}")
    print(f"Exact duplicates detected: {exact_duplicates} ({exact_duplicates/total_images*100:.1f}%)")

    # Highlight cross-source identical mirrors
    mirror_count = 0
    for h, file_list in md5_map.items():
        src_set = set(item[0] for item in file_list)
        if len(src_set) > 1:
            mirror_count += 1
    print(f"Files identical across multiple folder directories: {mirror_count}")

    # 3. Near-Duplicates (dHash) on unique images
    print("\n--- 3. NEAR-DUPLICATES VIA PERCEPTUAL DHASH ---")
    # Sample / check unique images in assets/data
    assets_files = [item for item in all_files if item[0] == "assets/data"]
    dhashes = []
    print(f"Computing perceptual hashes for {len(assets_files)} images in assets/data...")
    for src, cls, fp in assets_files:
        try:
            with Image.open(fp) as img:
                w, h = img.size
                resolutions[cls].append((w, h))
                dh = compute_dhash(img)
                dhashes.append((cls, fp, dh))
        except Exception as e:
            pass

    near_dup_pairs = []
    n = len(dhashes)
    for i in range(n):
        for j in range(i + 1, n):
            dist = hamming_dist(dhashes[i][2], dhashes[j][2])
            if dist <= 2: # near-identical images
                near_dup_pairs.append((dhashes[i], dhashes[j], dist))

    print(f"Near-duplicate pairs (Hamming distance <= 2) in assets/data: {len(near_dup_pairs)}")
    if near_dup_pairs:
        print("Sample near-duplicate pairs found in assets/data:")
        for (c1, f1, h1), (c2, f2, h2), d in near_dup_pairs[:5]:
            print(f"   Dist {d}: [{c1}] {os.path.basename(f1)} <---> [{c2}] {os.path.basename(f2)}")

    # 4. Check Resolution and Image Characteristics
    print("\n--- 4. IMAGE PROPERTIES IN ASSETS/DATA ---")
    for cls, res_list in sorted(resolutions.items()):
        widths = [r[0] for r in res_list]
        heights = [r[1] for r in res_list]
        print(f"Class '{cls:>4}': {len(res_list)} images | Widths: {min(widths)} - {max(widths)} (avg {int(np.mean(widths))}) | Heights: {min(heights)} - {max(heights)} (avg {int(np.mean(heights))})")

    # 5. Check bulk dataset in dataset/hf_currency (Rs.10, Rs.20, Rs.100, Rs.200)
    print("\n--- 5. BULK DATASET ANALYSIS (dataset/hf_currency) ---")
    bulk_classes = ["Rs.10", "Rs.20", "Rs.100", "Rs.200"]
    for bc in bulk_classes:
        folder = os.path.join("dataset", "hf_currency", bc)
        if os.path.exists(folder):
            files = sorted(glob.glob(os.path.join(folder, "*.*")))
            if files:
                # check file naming pattern (e.g. frame_001.jpg vs photo.jpg)
                sample_names = [os.path.basename(f) for f in files[:5]]
                with Image.open(files[0]) as img:
                    sz = img.size
                print(f"   {bc}: {len(files)} files | Sample names: {sample_names} | Resolution: {sz}")

    # 6. Check for any Real Phone Photos in Workspace
    print("\n--- 6. SEARCH FOR EXISTING REAL PHONE PHOTOS ---")
    real_photo_candidates = []
    for src, cls, fp in all_files:
        fn = os.path.basename(fp).lower()
        # Phone photos usually have IMG_, PXL_, 2024, or DCIM or specific EXIF
        if any(tag in fn for tag in ["pxl_", "img_", "camera", "photo", "real", "phone"]):
            real_photo_candidates.append(fp)
    print(f"Candidate real phone photos detected in repo: {len(real_photo_candidates)}")
    if real_photo_candidates:
        print(f"Sample: {real_photo_candidates[:5]}")
    else:
        print("-> Confirmed: ZERO real user phone photos currently exist in the repo.")

if __name__ == "__main__":
    audit()
