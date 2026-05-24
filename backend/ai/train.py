from ultralytics import YOLO
import os
import sys

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_path  = os.path.abspath(os.path.join(script_dir, "..", "datasets", "data.yaml"))

    if not os.path.exists(data_path):
        print(f"Error: Could not find config file at {data_path}")
        sys.exit(1)

    # Load pre-trained model as requested
    model = YOLO('yolov8n.pt')

    print(f"Training on: {data_path}")
    print("Heavy augmentation enabled for real-world Indian road conditions.")

    try:
        model.train(
            data=data_path,
            epochs=35,
            imgsz=640,
            batch=4,
            patience=8,          # Stop if no improvement for 8 epochs
            device="cpu",

            # ── Augmentations for mud / water / cracks / side-angle ─────────
            hsv_h=0.020,          # hue shift  — simulate lighting changes
            hsv_s=0.80,           # saturation — mud / wet tarmac
            hsv_v=0.50,           # brightness — overcast / shadow
            degrees=15.0,         # rotation   — camera tilt / slope
            translate=0.15,       # crop shift — off-centre scenes
            scale=0.60,           # zoom range — close-up vs far potholes
            shear=8.0,            # perspective shear — side-angle roads
            perspective=0.0005,   # perspective warp  — dashcam angle
            flipud=0.05,          # occasional vertical flip
            fliplr=0.50,          # horizontal mirror (road symmetry)
            mosaic=1.0,           # paste 4 images → more scene diversity
            mixup=0.15,           # blend two images → handles overlapping holes
            copy_paste=0.10,      # paste pothole crops onto new backgrounds
            erasing=0.40,         # random occlusion → partial potholes visible
        )
    except Exception as e:
        print(f"Training failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
