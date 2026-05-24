"""
Smart-Infra — Multi-Class Infrastructure Detector Training
===========================================================
Trains YOLOv8 to detect all 3 infrastructure defect classes:
  Class 0 — pothole
  Class 1 — garbage
  Class 2 — leakage

Usage:
    python train_multiclass.py
    python train_multiclass.py --data ../datasets/merged/data.yaml
    python train_multiclass.py --resume  (continue from last checkpoint)

After training completes:
    → Best model saved to: runs/detect/smart_infra_v1/weights/best.pt
    → Run extract_metrics.py to get paper-ready numbers
    → Copy best.pt to backend/ai/best_multi.pt
"""

import os
import sys
import argparse
from pathlib import Path
from ultralytics import YOLO

SCRIPT_DIR = Path(__file__).parent.resolve()
DEFAULT_DATA = SCRIPT_DIR / ".." / "datasets" / "merged" / "data.yaml"
DEFAULT_MODEL_OUT = SCRIPT_DIR / "best_multi.pt"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=str, default=str(DEFAULT_DATA),
                        help="Path to merged data.yaml")
    parser.add_argument("--base", type=str, default="yolov8n.pt",
                        help="Base model: yolov8n.pt (fastest, good for CPU), yolov8s.pt (better accuracy, needs GPU)")
    parser.add_argument("--epochs", type=int, default=30,
                        help="Training epochs. 30 is enough for a valid paper result on CPU.")
    parser.add_argument("--resume", action="store_true",
                        help="Resume training from last checkpoint")
    parser.add_argument("--device", type=str, default="cpu",
                        help="Device: 'cpu' for CPU (default), '0' for NVIDIA GPU")
    args = parser.parse_args()

    data_path = Path(args.data)
    if not data_path.exists():
        print(f"[ERROR] data.yaml not found at: {data_path}")
        print("Run download_datasets.py first to prepare the merged dataset.")
        sys.exit(1)

    print("=" * 60)
    print("  Smart-Infra Multi-Class Training")
    print("=" * 60)
    print(f"  Dataset : {data_path}")
    print(f"  Base    : {args.base}")
    print(f"  Epochs  : {args.epochs}")
    print(f"  Device  : {args.device}")
    print("=" * 60)

    if args.resume:
        # Find the last run to resume
        runs_dir = SCRIPT_DIR / "runs" / "detect" / "smart_infra_v1"
        last_weights = runs_dir / "weights" / "last.pt"
        if not last_weights.exists():
            print("[ERROR] No checkpoint found to resume from. Start a fresh training run first.")
            sys.exit(1)
        model = YOLO(str(last_weights))
        print(f"[INFO] Resuming from: {last_weights}")
    else:
        model = YOLO(args.base)
        print(f"[INFO] Starting fresh training from: {args.base}")

    # ── Training Configuration ───────────────────────────────────────────────
    is_cpu = str(args.device).lower() == "cpu"
    if is_cpu:
        print("\n[CPU MODE] Optimized settings applied for CPU training.")
        print("  imgsz=416, batch=4, workers=2")
        print("  Estimated time: 2–5 hours depending on dataset size.\n")

    results = model.train(
        data=str(data_path),
        epochs=args.epochs,
        imgsz=416 if is_cpu else 640,    # 416 is ~2.4x faster than 640 on CPU
        batch=4 if is_cpu else 8,        # Small batch for CPU memory
        workers=2 if is_cpu else 4,      # Fewer data-loader workers on CPU
        patience=8,
        device=args.device,
        project=str(SCRIPT_DIR / "runs" / "detect"),
        name="smart_infra_v1",
        exist_ok=args.resume,

        # Optimizer
        optimizer="AdamW",
        lr0=0.001,
        lrf=0.01,
        weight_decay=0.0005,
        warmup_epochs=2 if is_cpu else 3,

        # ── Augmentations (slightly reduced for CPU speed) ────────────────
        hsv_h=0.020,
        hsv_s=0.80,
        hsv_v=0.50,
        degrees=10.0,
        translate=0.10,
        scale=0.50,
        shear=5.0,
        perspective=0.0005,
        flipud=0.05,
        fliplr=0.50,
        mosaic=1.0,
        mixup=0.05 if is_cpu else 0.10,  # Reduced mixup on CPU
        copy_paste=0.0 if is_cpu else 0.10,  # Skip copy-paste on CPU (slow)

        # Evaluation settings
        val=True,
        save=True,
        save_period=5,
        plots=True,
    )

    # ── Post-Training Summary ────────────────────────────────────────────────
    best_model = SCRIPT_DIR / "runs" / "detect" / "smart_infra_v1" / "weights" / "best.pt"
    if best_model.exists():
        import shutil
        shutil.copy2(best_model, DEFAULT_MODEL_OUT)
        print(f"\n[SUCCESS] Best model copied to: {DEFAULT_MODEL_OUT}")

    # Quick validation run for paper metrics
    print("\n[INFO] Running final validation for paper metrics...")
    val_results = model.val(
        data=str(data_path),
        imgsz=640,
        conf=0.25,
        iou=0.5,
    )

    mp     = float(val_results.box.mp)
    mr     = float(val_results.box.mr)
    map50  = float(val_results.box.map50)
    map5095 = float(val_results.box.map)
    f1     = 2 * (mp * mr) / (mp + mr + 1e-9)

    print("\n" + "=" * 55)
    print("  FINAL PAPER METRICS")
    print("=" * 55)
    print(f"  Precision  : {mp*100:.2f}%")
    print(f"  Recall     : {mr*100:.2f}%")
    print(f"  F1 Score   : {f1*100:.2f}%")
    print(f"  mAP@0.50   : {map50*100:.2f}%")
    print(f"  mAP@0.50:0.95 : {map5095*100:.2f}%")
    print("=" * 55)

    # Per-class breakdown
    names = model.names
    per_p  = val_results.box.p
    per_r  = val_results.box.r
    per_ap = val_results.box.ap50
    print(f"\n  {'Class':<15} {'P':>7} {'R':>7} {'mAP50':>8}")
    print("  " + "-" * 42)
    for i, name in names.items():
        p_val  = float(per_p[i])  if i < len(per_p)  else 0.0
        r_val  = float(per_r[i])  if i < len(per_r)  else 0.0
        ap_val = float(per_ap[i]) if i < len(per_ap) else 0.0
        print(f"  {name:<15} {p_val*100:>6.1f}% {r_val*100:>6.1f}% {ap_val*100:>7.1f}%")

    print("\n[DONE] Copy these numbers into your IEEE paper Table II.")
    print(f"[INFO] Training plots saved at: {SCRIPT_DIR}/runs/detect/smart_infra_v1/")


if __name__ == "__main__":
    main()
