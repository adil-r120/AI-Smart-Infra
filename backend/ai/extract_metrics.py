"""
Smart-Infra — Real Metrics Extractor
=====================================
This script evaluates the existing best.pt model on its validation set
and prints a full paper-ready metrics table (Precision, Recall, F1, mAP@0.5, mAP@0.5:0.95).

Usage:
    python extract_metrics.py --data path/to/data.yaml
    python extract_metrics.py --data ../datasets/data.yaml

Output:
    - Console: Full table ready to paste into the IEEE paper
    - metrics_report.txt: Saved text report
    - metrics_curves/ : Saved P-R curve and confusion matrix images
"""

import os
import sys
import argparse
from pathlib import Path
from ultralytics import YOLO

def main():
    parser = argparse.ArgumentParser(description="Extract real metrics from best.pt")
    parser.add_argument(
        "--data",
        type=str,
        default=None,
        help="Path to your dataset data.yaml. If not given, will search common locations."
    )
    parser.add_argument(
        "--model",
        type=str,
        default=None,
        help="Path to .pt model file. Defaults to best.pt in this directory."
    )
    args = parser.parse_args()

    script_dir = Path(__file__).parent.resolve()

    # ── Locate the model ────────────────────────────────────────────────────
    if args.model:
        model_path = Path(args.model)
    else:
        model_path = script_dir / "best.pt"

    if not model_path.exists():
        print(f"[ERROR] Model not found at: {model_path}")
        sys.exit(1)

    print(f"[INFO] Loading model: {model_path}")
    model = YOLO(str(model_path))

    # ── Locate the dataset config ────────────────────────────────────────────
    if args.data:
        data_yaml = Path(args.data)
    else:
        # Search common locations
        candidates = [
            script_dir / ".." / "datasets" / "data.yaml",
            script_dir / ".." / ".." / "datasets" / "data.yaml",
            Path("ai_model") / "datasets" / "data.yaml",
        ]
        data_yaml = None
        for c in candidates:
            if c.exists():
                data_yaml = c.resolve()
                break

    if data_yaml is None or not Path(data_yaml).exists():
        print("\n[ERROR] Could not find data.yaml automatically.")
        print("Please run with: python extract_metrics.py --data path/to/data.yaml")
        print("\nIf you no longer have the dataset, see the section below:")
        print("=" * 60)
        _print_no_dataset_guide(model, script_dir)
        return

    print(f"[INFO] Using dataset config: {data_yaml}")
    print("[INFO] Running validation — this may take a few minutes on CPU...\n")

    # ── Run Validation ───────────────────────────────────────────────────────
    output_dir = script_dir / "metrics_curves"
    output_dir.mkdir(exist_ok=True)

    results = model.val(
        data=str(data_yaml),
        imgsz=416,
        conf=0.25,
        iou=0.5,
        save_json=True,
        project=str(output_dir),
        name="eval",
        exist_ok=True,
        verbose=True,
    )

    # ── Extract and Format Metrics ───────────────────────────────────────────
    mp   = float(results.box.mp)    # Mean Precision
    mr   = float(results.box.mr)    # Mean Recall
    map50  = float(results.box.map50)   # mAP@0.5
    map5095 = float(results.box.map)    # mAP@0.5:0.95
    f1   = 2 * (mp * mr) / (mp + mr + 1e-9)

    # Per-class results
    class_names = model.names
    per_class_p  = results.box.p   # list
    per_class_r  = results.box.r   # list
    per_class_ap = results.box.ap50  # per-class mAP@0.5

    report_lines = [
        "=" * 65,
        "  Smart-Infra — IEEE Paper Metrics Report",
        "=" * 65,
        f"  Model      : {model_path.name}",
        f"  Dataset    : {Path(data_yaml).name}",
        f"  Image Size : 416 × 416",
        f"  Conf Thresh: 0.25   IoU Thresh: 0.50",
        "=" * 65,
        "",
        "  OVERALL PERFORMANCE",
        "  " + "-" * 52,
        f"  {'Metric':<25} {'Value':>10}",
        "  " + "-" * 52,
        f"  {'Precision (P)':<25} {mp*100:>9.2f}%",
        f"  {'Recall (R)':<25} {mr*100:>9.2f}%",
        f"  {'F1 Score':<25} {f1*100:>9.2f}%",
        f"  {'mAP @ IoU=0.50':<25} {map50*100:>9.2f}%",
        f"  {'mAP @ IoU=0.50:0.95':<25} {map5095*100:>9.2f}%",
        "  " + "-" * 52,
        "",
        "  PER-CLASS BREAKDOWN",
        "  " + "-" * 62,
        f"  {'Class':<20} {'Precision':>10} {'Recall':>8} {'mAP@0.5':>10}",
        "  " + "-" * 62,
    ]

    for i, name in class_names.items():
        p_val  = float(per_class_p[i])  if i < len(per_class_p)  else 0.0
        r_val  = float(per_class_r[i])  if i < len(per_class_r)  else 0.0
        ap_val = float(per_class_ap[i]) if i < len(per_class_ap) else 0.0
        report_lines.append(
            f"  {name:<20} {p_val*100:>9.2f}% {r_val*100:>7.2f}% {ap_val*100:>9.2f}%"
        )

    report_lines += [
        "  " + "-" * 62,
        "",
        "  IEEE TABLE FORMAT (copy-paste ready)",
        "  " + "-" * 62,
        f"  | {'Class':<15} | {'Precision':>9} | {'Recall':>6} | {'F1':>6} | {'mAP@0.5':>7} |",
        "  " + "|" + "-"*17 + "|" + "-"*11 + "|" + "-"*8 + "|" + "-"*8 + "|" + "-"*9 + "|",
    ]

    for i, name in class_names.items():
        p_val  = float(per_class_p[i])  if i < len(per_class_p)  else 0.0
        r_val  = float(per_class_r[i])  if i < len(per_class_r)  else 0.0
        ap_val = float(per_class_ap[i]) if i < len(per_class_ap) else 0.0
        f1_val = 2 * (p_val * r_val) / (p_val + r_val + 1e-9)
        report_lines.append(
            f"  | {name:<15} | {p_val*100:>8.2f}% | {r_val*100:>5.2f}% | {f1_val*100:>5.2f}% | {ap_val*100:>6.2f}% |"
        )

    report_lines += [
        f"  | {'**Overall**':<15} | {mp*100:>8.2f}% | {mr*100:>5.2f}% | {f1*100:>5.2f}% | {map50*100:>6.2f}% |",
        "=" * 65,
        "",
        f"  Curves saved to: {output_dir / 'eval'}",
        "=" * 65,
    ]

    report_text = "\n".join(report_lines)
    print(report_text)

    # Save to file
    report_file = script_dir / "metrics_report.txt"
    report_file.write_text(report_text, encoding="utf-8")
    print(f"\n[SAVED] Report written to: {report_file}")

def _print_no_dataset_guide(model, script_dir):
    """
    If the dataset is lost, provide instructions to run inference-based
    metrics on a small test set the user can collect manually.
    """
    print("""
[GUIDE] Dataset Not Found — Alternative Approach
=================================================
Your trained best.pt exists but the original dataset is gone.
Here is what to do:

OPTION A — Re-download from Roboflow (if you used Roboflow):
  1. Log in at https://app.roboflow.com
  2. Open your project > Versions > Download (YOLOv8 format)
  3. Place the downloaded folder at: backend/datasets/
  4. Re-run: python extract_metrics.py --data ../datasets/data.yaml

OPTION B — Collect a small test set manually (minimum viable):
  1. Collect 30–50 pothole images from Google Images or your camera
  2. Annotate them using https://www.makesense.ai (free, no install)
     - Export as YOLO format
  3. Create backend/test_images/ with sub-folders:
       test_images/images/test/
       test_images/labels/test/
  4. Run inference and check detections visually — report qualitative results

OPTION C — Use the Ultralytics benchmark on demo images:
  python -c "
from ultralytics import YOLO
model = YOLO('best.pt')
results = model.predict('test_valid.jpg', conf=0.25, verbose=True)
print(results[0].boxes)
  "
""")


if __name__ == "__main__":
    main()
