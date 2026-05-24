"""
Smart-Infra — Multi-Class Dataset Downloader
=============================================
Downloads three public Roboflow datasets and merges them into a single
unified dataset for training a multi-class infrastructure detector.

Classes:
  0 — pothole
  1 — garbage
  2 — leakage

Usage:
    pip install roboflow
    python download_datasets.py

Datasets used (all public, free on Roboflow Universe):
  - Pothole  : roboflow.com/roboflow-100/pothole-detection
  - Garbage  : roboflow.com/material-characteristics-3/garbage-classification-3
  - Leakage  : roboflow.com/water-leakage/water-pipe-leakage-detection

NOTE: If Roboflow API key is needed, create a free account at roboflow.com
      and paste your key when prompted (or set ROBOFLOW_KEY in .env).
"""

import os
import sys
import shutil
import yaml
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent.resolve()
DATASETS_DIR = SCRIPT_DIR / ".." / "datasets" / "multi_class"
DATASETS_DIR.mkdir(parents=True, exist_ok=True)

# ── Class Mapping ────────────────────────────────────────────────────────────
CLASS_NAMES = {
    0: "pothole",
    1: "garbage",
    2: "leakage",
}

def download_via_roboflow():
    """Download datasets using roboflow SDK (requires API key)."""
    try:
        from roboflow import Roboflow
    except ImportError:
        print("[ERROR] roboflow not installed. Run: pip install roboflow")
        sys.exit(1)

    api_key = os.getenv("ROBOFLOW_KEY") or input(
        "\nEnter your Roboflow API key (free at roboflow.com): "
    ).strip()

    rf = Roboflow(api_key=api_key)

    print("\n[1/3] Downloading Pothole dataset...")
    # Public pothole dataset - Roboflow 100
    project = rf.workspace("roboflow-100").project("pothole-detection-7fy0q")
    dataset = project.version(1).download("yolov8", location=str(DATASETS_DIR / "pothole"))

    print("\n[2/3] Downloading Garbage dataset...")
    # Public garbage detection dataset
    project = rf.workspace("material-characteristics-3").project("garbage-classification-3")
    dataset = project.version(2).download("yolov8", location=str(DATASETS_DIR / "garbage"))

    print("\n[3/3] Downloading Water Leakage dataset...")
    # Public water leakage dataset
    project = rf.workspace("water-leakage").project("water-pipe-leakage-detection")
    dataset = project.version(1).download("yolov8", location=str(DATASETS_DIR / "leakage"))


def remap_labels(src_label_dir: Path, dst_label_dir: Path, new_class_id: int):
    """Remap all class IDs in YOLO label files to a new class ID."""
    dst_label_dir.mkdir(parents=True, exist_ok=True)
    count = 0
    for label_file in src_label_dir.glob("*.txt"):
        lines = label_file.read_text().strip().split("\n")
        new_lines = []
        for line in lines:
            if not line.strip():
                continue
            parts = line.split()
            # Replace whatever class_id was there with the new unified one
            parts[0] = str(new_class_id)
            new_lines.append(" ".join(parts))
        (dst_label_dir / label_file.name).write_text("\n".join(new_lines))
        count += 1
    return count


def merge_datasets():
    """
    Merge the three downloaded datasets into a single unified dataset
    with remapped class IDs.
    """
    merged_dir = DATASETS_DIR / ".." / "merged"
    merged_dir = merged_dir.resolve()

    for split in ["train", "valid", "test"]:
        (merged_dir / "images" / split).mkdir(parents=True, exist_ok=True)
        (merged_dir / "labels" / split).mkdir(parents=True, exist_ok=True)

    source_map = [
        # (dataset_folder, new_class_id)
        ("pothole", 0),
        ("garbage", 1),
        ("leakage", 2),
    ]

    totals = {split: {"images": 0, "labels": 0} for split in ["train", "valid", "test"]}

    for folder_name, new_id in source_map:
        src_base = DATASETS_DIR / folder_name
        if not src_base.exists():
            print(f"[WARN] {folder_name} dataset not found at {src_base}. Skipping.")
            continue

        for split in ["train", "valid", "test"]:
            src_img = src_base / split / "images"
            src_lbl = src_base / split / "labels"

            if not src_img.exists():
                # Try alternate structure
                src_img = src_base / "images" / split
                src_lbl = src_base / "labels" / split

            if not src_img.exists():
                print(f"  [WARN] No {split} images found for {folder_name}. Skipping split.")
                continue

            dst_img = merged_dir / "images" / split
            dst_lbl = merged_dir / "labels" / split

            # Copy images (prefix with class name to avoid filename collisions)
            img_count = 0
            for img_file in src_img.glob("*.[jJpPgGbBwW][pPnNiImMeEbB][gGpPfFpP]*"):
                new_name = f"{folder_name}_{img_file.name}"
                shutil.copy2(img_file, dst_img / new_name)
                img_count += 1

            # Remap and copy labels
            lbl_count = 0
            if src_lbl.exists():
                for label_file in src_lbl.glob("*.txt"):
                    new_name = f"{folder_name}_{label_file.name}"
                    lines = label_file.read_text().strip().split("\n")
                    new_lines = []
                    for line in lines:
                        if not line.strip():
                            continue
                        parts = line.split()
                        parts[0] = str(new_id)
                        new_lines.append(" ".join(parts))
                    (dst_lbl / new_name).write_text("\n".join(new_lines))
                    lbl_count += 1

            totals[split]["images"] += img_count
            totals[split]["labels"] += lbl_count
            print(f"  [{folder_name}] {split}: {img_count} images, {lbl_count} labels → class {new_id}")

    # Write data.yaml
    data_yaml = {
        "path": str(merged_dir),
        "train": "images/train",
        "val":   "images/valid",
        "test":  "images/test",
        "nc": 3,
        "names": list(CLASS_NAMES.values()),
    }
    yaml_path = merged_dir / "data.yaml"
    with open(yaml_path, "w") as f:
        yaml.dump(data_yaml, f, default_flow_style=False)

    print(f"\n[MERGED DATASET STATS]")
    print(f"  Train : {totals['train']['images']} images")
    print(f"  Valid : {totals['valid']['images']} images")
    print(f"  Test  : {totals['test']['images']} images")
    print(f"  Classes: {list(CLASS_NAMES.values())}")
    print(f"\n[SAVED] data.yaml written to: {yaml_path}")
    return str(yaml_path)


if __name__ == "__main__":
    print("=" * 60)
    print("  Smart-Infra — Multi-Class Dataset Downloader & Merger")
    print("=" * 60)

    mode = input("\nChoose mode:\n  [1] Download from Roboflow (requires API key)\n  [2] Merge already-downloaded datasets\n  [3] Show manual download instructions\nEnter 1, 2, or 3: ").strip()

    if mode == "1":
        download_via_roboflow()
        yaml_path = merge_datasets()
        print(f"\n✅ Done! Use this for training:\n   python train_multiclass.py --data {yaml_path}")

    elif mode == "2":
        print("\n[Merging existing datasets...]")
        yaml_path = merge_datasets()
        print(f"\n✅ Done! Use this for training:\n   python train_multiclass.py --data {yaml_path}")

    else:
        print("""
Manual Download Instructions
=============================
1. Go to https://universe.roboflow.com
2. Search for and download each dataset in YOLOv8 format:

   POTHOLE:
     https://universe.roboflow.com/roboflow-100/pothole-detection-7fy0q
     → Place at: backend/datasets/multi_class/pothole/

   GARBAGE:
     https://universe.roboflow.com/material-characteristics-3/garbage-classification-3
     → Place at: backend/datasets/multi_class/garbage/

   LEAKAGE:
     https://universe.roboflow.com/water-leakage/water-pipe-leakage-detection
     OR search "water leakage detection" on Roboflow Universe
     → Place at: backend/datasets/multi_class/leakage/

3. Each folder should contain:
     images/train/   images/valid/   images/test/
     labels/train/   labels/valid/   labels/test/

4. Then run: python download_datasets.py  (choose option 2)
   This will merge and create the unified data.yaml
""")
