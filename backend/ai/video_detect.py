import cv2
from ultralytics import YOLO
import os, sys, requests, time
import numpy as np
from datetime import datetime
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from tracker import CentroidTracker

# ── Configuration ─────────────────────────────────────────────
_dir = os.path.dirname(__file__)
API_URL = "http://localhost:8000/add_detection"
METRIC_URL = "http://localhost:8000/analytics/edge"

# Global States
last_sent = {} 
current_gps = {"lat": 12.9716, "lon": 77.5946, "last_update": 0}
COOLDOWN = 15
edge_health = {"latency": [], "saved_kb": 0}

# Models
pothole_model = YOLO(os.path.join(_dir, "best.pt"))
general_model = YOLO(os.path.join(_dir, "yolov8n.pt"))

# Trackers
pothole_tracker = CentroidTracker(maxDisappeared=15)
general_tracker = CentroidTracker(maxDisappeared=20)
reported_ids = set() # Set of (type, id) that have been sent to backend

# COCO classes we care about (yolov8n)
GENERAL_CLASSES = {0: "person", 2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}
PRIVACY_CLASSES = {"person", "car", "motorcycle", "bus", "truck", "face"}
CLASS_COLORS = {
    "pothole":    (0,  165, 249),   # orange
    "car":        (249, 189, 56),   # sky blue
    "truck":      (249, 189, 56),
    "bus":        (249, 189, 56),
    "motorcycle": (249, 189, 56),
    "person":     (250, 139, 167),  # purple
}

def log_debug(msg):
    with open(os.path.join(_dir, "vid_debug.log"), "a") as f:
        f.write(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}\n")

def redact_sensitive_info(img, obj_type, bbox):
    """
    Applies Gaussian blurring to the specific bounding box if it matches a privacy class.
    """
    if obj_type.lower() not in PRIVACY_CLASSES:
        return img, False
    
    h, w = img.shape[:2]
    x1, y1, x2, y2 = [int(v) for v in bbox]
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w, x2), min(h, y2)
    
    if x2 <= x1 or y2 <= y1: return img, False
    
    roi = img[y1:y2, x1:x2]
    # Strong edge-blur for research-grade privacy
    roi = cv2.GaussianBlur(roi, (51, 51), 30)
    img[y1:y2, x1:x2] = roi
    return img, True

def get_live_gps(source_url):
    global current_gps
    now = time.time()
    if now - current_gps["last_update"] < 5:
        return current_gps["lat"], current_gps["lon"]
        
    try:
        if "http" in str(source_url):
            base_url = "/".join(str(source_url).split("/")[:3])
            sensors_url = f"{base_url}/sensors.json?sense=gps"
            resp = requests.get(sensors_url, timeout=1)
            if resp.status_code == 200:
                data = resp.json()
                if "gps" in data and "data" in data["gps"] and len(data["gps"]["data"]) > 0:
                    latest = data["gps"]["data"][-1][1]
                    current_gps["lat"] = float(latest[0])
                    current_gps["lon"] = float(latest[1])
                    current_gps["last_update"] = now
    except Exception:
        pass
    return current_gps["lat"], current_gps["lon"]

def send_detection_to_backend(obj_type, confidence, source, frame=None, bbox=None):
    global last_sent
    now = time.time()
    
    if obj_type in last_sent:
        elapsed = now - last_sent[obj_type]
        if elapsed < COOLDOWN:
            return
    
    try:
        cid = "Mobile-Node-AI" if "http" in str(source) else "Webcam-Local"
        lat, lon = get_live_gps(source)
        
        # Redaction: If it's a person/vehicle, blur it locally before sending
        send_frame = frame.copy() if frame is not None else None
        if send_frame is not None and bbox is not None:
            send_frame, _ = redact_sensitive_info(send_frame, obj_type, bbox)

        _, img_encoded = cv2.imencode(".jpg", send_frame if send_frame is not None else frame)
        files = {"file": ("snapshot.jpg", img_encoded.tobytes(), "image/jpeg")}
        data = {
            "latitude": lat,
            "longitude": lon,
            "confidence": float(confidence),
            "object_type": obj_type,
            "camera_id": cid
        }
        
        resp = requests.post(API_URL, data=data, files=files, timeout=5)
        if resp.status_code == 200:
            last_sent[obj_type] = now
            log_debug(f"SENT (SECURED): {obj_type}")
    except Exception as e:
        log_debug(f"Sync Error: {e}")

def start_realtime_detection(source=0):
    log_debug(f"Opening source: {source}")
    if isinstance(source, str) and source.isdigit():
        source = int(source)

    # List of sources to try (original + common IP suffixes)
    sources_to_try = [source]
    if isinstance(source, str) and source.startswith("http"):
        # Common mobile IP camera paths
        if not any(source.endswith(s) for s in ["/video", "/mjpeg", "video.mjpg", "/stream"]):
            sources_to_try.append(source.rstrip("/") + "/video")
            sources_to_try.append(source.rstrip("/") + "/mjpeg")

    cap = None
    final_source = source

    for s in sources_to_try:
        log_debug(f"Attempting source: {s}")
        # Use CAP_DSHOW for local cameras on Windows (fixes "failed to grab frame")
        cap = cv2.VideoCapture(s, cv2.CAP_DSHOW if isinstance(s, int) else cv2.CAP_ANY)
        
        if cap.isOpened():
            # Try grabbing a frame 3 times to wake up the sensor
            success = False
            for _ in range(3):
                ret, _ = cap.read()
                if ret: 
                    success = True
                    break
                time.sleep(0.5)
            
            if success:
                log_debug(f"SUCCESS: Opened and grabbed frame from {s}")
                final_source = s
                break
            else:
                log_debug(f"FAIL: Opened {s} but could NOT grab frame.")
                cap.release()
                cap = None
        else:
            log_debug(f"FAIL: Could not open {s}")
            cap = None

    if not cap or not cap.isOpened():
        log_debug(f"FATAL: All sources failed for {source}")
        return

    log_debug(f"ACTIVE: Started AI on {final_source}")
    frame_count = 0
    
    while True:
        start_perf = time.perf_counter()
        ret, frame = cap.read()
        if not ret:
            log_debug("Lost connection to camera source.")
            break

        frame_count += 1
        curr_pothole_rects = []
        curr_general_rects = []
        curr_general_metas = []

        # Pothole Detection (High-accuracy filtering, every 3rd frame)
        if frame_count % 3 == 0:
            results = pothole_model.predict(frame, conf=0.45, verbose=False)
            for r in results:
                for box in r.boxes:
                    rect = [int(v) for v in box.xyxy[0]]
                    curr_pothole_rects.append(rect)
            
            # Update Pothole Tracker
            tracked_potholes = pothole_tracker.update(curr_pothole_rects)
            for (obj_id, centroid) in tracked_potholes.items():
                if ("pothole", obj_id) not in reported_ids:
                    # New Pothole!
                    # Find the original rect to pass as bbox
                    rect = curr_pothole_rects[obj_id] if isinstance(obj_id, int) and obj_id < len(curr_pothole_rects) else None
                    if not rect: # Fallback search
                        rect = next((r for r in curr_pothole_rects), None)
                    
                    send_detection_to_backend("pothole", 0.9, source, frame=frame, bbox=rect)
                    reported_ids.add(("pothole", obj_id))
                    cv2.putText(frame, f"NEW POTHOLE ID:{obj_id}", (centroid[0]-10, centroid[1]-10), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, CLASS_COLORS["pothole"], 2)

        # General Object Detection (High-accuracy filtering, every 10th frame)
        if frame_count % 10 == 0:
            results = general_model.predict(frame, conf=0.45, verbose=False)
            for r in results:
                for box in r.boxes:
                    cls_id = int(box.cls)
                    if cls_id in GENERAL_CLASSES:
                        cls_name = GENERAL_CLASSES[cls_id]
                        rect = [int(v) for v in box.xyxy[0]]
                        curr_general_rects.append(rect)
                        curr_general_metas.append(cls_name)
            
            # Update General Tracker
            tracked_objects = general_tracker.update(curr_general_rects, metadatas=curr_general_metas)
            for (obj_id, centroid) in tracked_objects.items():
                obj_type = general_tracker.metadata.get(obj_id, "object")
                if (obj_type, obj_id) not in reported_ids:
                    # New Object!
                    # Find the original rect
                    rect = curr_general_rects[obj_id] if isinstance(obj_id, int) and obj_id < len(curr_general_rects) else None
                    if not rect: # Fallback search
                        rect = next((r for r in curr_general_rects), None)
                        
                    send_detection_to_backend(obj_type, 0.85, source, frame=frame, bbox=rect)
                    reported_ids.add((obj_type, obj_id))
                    cv2.putText(frame, f"TRACKING {obj_type.upper()} #{obj_id}", (centroid[0]-10, centroid[1]-10), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, CLASS_COLORS.get(obj_type, (255,255,255)), 2)

        # cv2.imshow("Smart Infra AI — Standard Mode", frame)
        # if cv2.waitKey(1) & 0xFF == ord('q'):
        #     break
        
        # Performance Metrics Logic (Industry-Unique)
        inf_ms = (time.perf_counter() - start_perf) * 1000
        edge_health["latency"].append(inf_ms)
        
        if frame_count % 30 == 0 and len(edge_health["latency"]) > 0:
            avg_lat = sum(edge_health["latency"]) / len(edge_health["latency"])
            # Assuming 1080p raw is ~3MB, vs local processing + tiny meta sync
            saved = 2950 * (frame_count / 10) # Simple estimate for research display
            try:
                requests.post(METRIC_URL, data={
                    "bandwidth_saved": saved,
                    "inference_ms": avg_lat,
                    "device_id": "Edge-i5-Station"
                }, timeout=1)
            except: pass
            edge_health["latency"] = []

        # In background mode, we just need a sleep to yield
        time.sleep(0.01)

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else 0
    start_realtime_detection(src)
