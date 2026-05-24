import React, { useState, useEffect } from "react";
import {
  SlidersHorizontal, Target, Zap, Save, RotateCcw,
  CheckCircle, Trash2, Sun, Moon, AlertTriangle, Cpu, MapPin,
  HelpCircle, ChevronDown, Shield
} from "lucide-react";
import axios from "axios";
import { API_BASE } from "../api/config";

interface Config {
  confidence: number;   // % — detector threshold
  iou: number;          // % — NMS overlap threshold
  imageSize: number;    // px — YOLO input size
  maxDetections: number;
  pollInterval: number; // seconds
  theme: "dark" | "light";
  gpsLat: number;
  gpsLng: number;
  gpsScatter: number;   // metres ×10
  privacyMode: boolean;
}

const DEFAULTS: Config = {
  confidence: 20,
  iou: 40,
  imageSize: 640,
  maxDetections: 50,
  pollInterval: 10,
  theme: "light",
  gpsLat: 12.9716,
  gpsLng: 77.5946,
  gpsScatter: 10,
  privacyMode: false,
};

const CITY_PRESETS = [
  { name: "Bangalore", lat: 12.9716, lng: 77.5946 },
  { name: "Mumbai",    lat: 19.0760, lng: 72.8777 },
  { name: "Delhi",     lat: 28.7041, lng: 77.1025 },
  { name: "Chennai",   lat: 13.0827, lng: 80.2707 },
];

function load(): Config {
  try {
    const raw = localStorage.getItem("ai_config");
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

/* ── Small reusable slider ─────────────────── */
function Slider({
  label, hint, value, min, max, step, unit, accent,
  onChange,
}: {
  label: string; hint: string; value: number; min: number; max: number;
  step: number; unit: string; accent?: string; onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const color = accent || "var(--primary)";
  return (
    <div className="aic-row">
      <div className="aic-row-header">
        <span className="aic-row-label">{label}</span>
        <span className="aic-row-value" style={{ color }}>{value}{unit}</span>
      </div>
      <div className="aic-track">
        <div className="aic-fill" style={{ width: `${pct}%`, background: color }} />
        <input
          type="range" min={min} max={max} step={step} value={value}
          className="aic-input"
          onChange={e => onChange(Number(e.target.value))}
        />
      </div>
      <div className="aic-ticks">
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
      <p className="aic-hint">{hint}</p>
    </div>
  );
}

/* ── Chip selector ─────────────────────────── */
function Chips({
  label, hint, options, value, onChange,
}: {
  label: string; hint: string; options: (string | number)[];
  value: string | number; onChange: (v: any) => void;
}) {
  return (
    <div className="aic-row">
      <span className="aic-row-label" style={{ marginBottom: 10 }}>{label}</span>
      <div className="aic-chips">
        {options.map(o => (
          <button
            key={o} type="button"
            className={`aic-chip ${o === value ? "active" : ""}`}
            onClick={() => onChange(o)}
          >{o}</button>
        ))}
      </div>
      <p className="aic-hint">{hint}</p>
    </div>
  );
}

/* ══════════════════════════════════════════ */
export default function AiConfig({
  theme, toggleTheme, user
}: { theme: "dark" | "light"; toggleTheme: () => void; user: any }) {
  const [cfg, setCfg] = useState<Config>(load);
  const [saved, setSaved] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearDone, setClearDone] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const set = <K extends keyof Config>(k: K, v: Config[K]) =>
    setCfg(prev => ({ ...prev, [k]: v }));

  /* Persist on every change */
  useEffect(() => {
    localStorage.setItem("ai_config", JSON.stringify(cfg));
  }, [cfg]);

  const handleSave = () => {
    localStorage.setItem("ai_config", JSON.stringify(cfg));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    if (!window.confirm("Reset all AI parameters to factory defaults?")) return;
    setCfg(DEFAULTS);
  };

  const handleClearDB = async () => {
    if (!window.confirm("Permanently delete ALL stored detections and images?\nThis cannot be undone.")) return;
    setClearing(true);
    try {
      const token = localStorage.getItem("si_token");
      await axios.delete(`${API_BASE}/detections`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setClearDone(true);
      window.dispatchEvent(new Event("detections_cleared"));
      setTimeout(() => setClearDone(false), 3000);
    } catch {
      alert("Failed to clear. Make sure the AI server is running.");
    } finally {
      setClearing(false);
    }
  };

  const handleTogglePrivacy = () => {
    const newVal = !cfg.privacyMode;
    set("privacyMode", newVal);
    localStorage.setItem("si_privacy_mode", String(newVal));
    // Trigger a storage event so Dashboard.tsx picks it up immediately
    window.dispatchEvent(new Event("storage"));
  };

  return (
    <div className="aic-page">
      {/* Privacy Guard Floating CSS inlined for simplicity */}
      <style>{`
        .aic-toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          background: var(--bg-hover);
          border-radius: 12px;
          margin-top: 8px;
        }
        .aic-toggle-switch {
          position: relative;
          width: 44px;
          height: 24px;
          background: #334155;
          border-radius: 20px;
          cursor: pointer;
          transition: 0.3s;
        }
        .aic-toggle-switch.active { background: var(--primary); }
        .aic-toggle-handle {
          position: absolute;
          top: 3px; left: 3px;
          width: 18px; height: 18px;
          background: white;
          border-radius: 50%;
          transition: 0.3s;
        }
        .aic-toggle-switch.active .aic-toggle-handle { left: 23px; }
      `}</style>

      {/* ── Header ─────────────────────────────── */}
      <div className="aic-header">
        <div className="aic-header-left">
          <div className="aic-header-icon">
            <SlidersHorizontal size={20} />
          </div>
          <div>
            <h2 className="aic-title">AI Configuration</h2>
            <p className="aic-subtitle">YOLOv8-Nano inference &amp; dashboard settings</p>
          </div>
        </div>
        <div className="aic-header-actions">
          <button type="button" className="aic-btn-ghost" onClick={handleReset}>
            <RotateCcw size={15} /> Reset
          </button>
          <button type="button" className="aic-btn-primary" onClick={handleSave}>
            {saved ? <CheckCircle size={15} /> : <Save size={15} />}
            {saved ? "Saved!" : "Save Config"}
          </button>
        </div>
      </div>

      {/* ── Grid ───────────────────────────────── */}
      <div className="aic-grid">

        {/* Detection */}
        <div className="aic-card">
          <div className="aic-card-title">
            <Target size={16} style={{ color: "var(--primary)" }} />
            Detection
          </div>
          <Slider
            label="Confidence Threshold" unit="%"
            hint="Minimum score to accept a detection. 15–35% works best for road surfaces."
            value={cfg.confidence} min={5} max={95} step={1}
            accent="var(--primary)"
            onChange={v => set("confidence", v)}
          />
          <Slider
            label="IOU / NMS Threshold" unit="%"
            hint="Controls how overlapping boxes are merged. Higher = fewer merged boxes."
            value={cfg.iou} min={10} max={90} step={5}
            accent="#8b5cf6"
            onChange={v => set("iou", v)}
          />
        </div>

        {/* Model */}
        <div className="aic-card">
          <div className="aic-card-title">
            <Cpu size={16} style={{ color: "#38bdf8" }} />
            Model
          </div>
          <Chips
            label="Input Resolution"
            hint="640 px is optimal for CPU. 416 px is faster with slightly lower accuracy."
            options={[320, 416, 512, 640, 768]}
            value={cfg.imageSize}
            onChange={v => set("imageSize", v)}
          />
          <Slider
            label="Max Detections per Scan" unit=""
            hint="Caps how many bounding boxes are drawn per image."
            value={cfg.maxDetections} min={5} max={200} step={5}
            accent="#f59e0b"
            onChange={v => set("maxDetections", v)}
          />
        </div>

        {/* Dashboard */}
        <div className="aic-card">
          <div className="aic-card-title">
            <Zap size={16} style={{ color: "#10b981" }} />
            Dashboard
          </div>
          <Slider
            label="Live Polling Interval" unit="s"
            hint="How often the dashboard fetches new stats. 10 s is recommended."
            value={cfg.pollInterval} min={5} max={60} step={5}
            accent="#10b981"
            onChange={v => set("pollInterval", v)}
          />
          <div className="aic-row">
            <span className="aic-row-label" style={{ marginBottom: 12 }}>Display Theme</span>
            <div className="aic-theme-row">
              <button
                type="button"
                className={`aic-theme-btn ${theme === "light" ? "active" : ""}`}
                onClick={() => theme === "dark" && toggleTheme()}
              >
                <Sun size={16} /> Light
              </button>
              <button
                type="button"
                className={`aic-theme-btn ${theme === "dark" ? "active" : ""}`}
                onClick={() => theme === "light" && toggleTheme()}
              >
                <Moon size={16} /> Dark
              </button>
            </div>
          </div>
        </div>

        {/* GPS Simulation */}
        <div className="aic-card">
          <div className="aic-card-title">
            <MapPin size={16} style={{ color: "#10b981" }} />
            GPS Simulation
          </div>

          {/* City presets */}
          <div className="aic-row">
            <span className="aic-row-label" style={{ marginBottom: 10 }}>City Preset</span>
            <div className="aic-chips">
              {CITY_PRESETS.map(c => (
                <button
                  key={c.name} type="button"
                  className={`aic-chip ${
                    cfg.gpsLat === c.lat && cfg.gpsLng === c.lng ? "active" : ""
                  }`}
                  onClick={() => { set("gpsLat", c.lat); set("gpsLng", c.lng); }}
                >{c.name}</button>
              ))}
            </div>
          </div>

          {/* Lat / Lng inputs */}
          <div className="aic-coord-grid">
            <div className="aic-coord-field">
              <label className="aic-row-label">Latitude</label>
              <input
                type="number" step="0.0001"
                value={cfg.gpsLat}
                className="aic-coord-input"
                onChange={e => set("gpsLat", parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="aic-coord-field">
              <label className="aic-row-label">Longitude</label>
              <input
                type="number" step="0.0001"
                value={cfg.gpsLng}
                className="aic-coord-input"
                onChange={e => set("gpsLng", parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <Slider
            label="Scatter Radius" unit="m"
            hint="How far each detection is randomly offset from the base coordinate on the map."
            value={cfg.gpsScatter} min={1} max={100} step={1}
            accent="#10b981"
            onChange={v => set("gpsScatter", v)}
          />
        </div>

        {/* Ethics & Compliance */}
        <div className="aic-card">
          <div className="aic-card-title">
            <Shield size={16} style={{ color: "var(--primary)" }} />
            Ethics & Compliance
          </div>
          <p className="aic-hint" style={{ marginBottom: 15 }}>
            Automated redacting of Personal Identifiable Information (PII) at the edge.
          </p>
          <div className="aic-toggle-row">
            <div>
              <span className="aic-row-label">AI Privacy Guard</span>
              <p className="aic-hint" style={{ marginTop: 4 }}>Gaussian-blur faces &amp; vehicles</p>
            </div>
            <div 
              className={`aic-toggle-switch ${cfg.privacyMode ? 'active' : ''}`}
              onClick={handleTogglePrivacy}
            >
              <div className="aic-toggle-handle" />
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="aic-card aic-card-danger">
          <div className="aic-card-title" style={{ color: "var(--danger)" }}>
            <AlertTriangle size={16} /> Danger Zone
          </div>
          <div className="aic-danger-row">
            <div>
              <p className="aic-danger-label">Clear All Detections</p>
              <p className="aic-hint">
                Permanently removes all pothole records, images, and map pins from the database.
              </p>
            </div>
            <button
              type="button" className="aic-btn-danger"
              onClick={handleClearDB}
              disabled={clearing || clearDone || !user?.is_admin}
              style={!user?.is_admin ? { opacity: 0.5, cursor: "not-allowed" } : {}}
              title={!user?.is_admin ? "Only administrators can clear detection history" : ""}
            >
              {!user?.is_admin
                ? "Requires Admin Access"
                : clearing
                  ? <span className="loader" style={{ width: 15, height: 15, margin: 0 }} />
                  : clearDone
                    ? <><CheckCircle size={15} /> Done</>
                    : <><Trash2 size={15} /> Clear All</>
              }
            </button>
          </div>
        </div>

        {/* Help & FAQ */}
        <div className="aic-card">
          <div className="aic-card-title">
            <HelpCircle size={16} style={{ color: "#8b5cf6" }} />
            Help &amp; FAQ
          </div>
          {[
            {
              q: "What confidence threshold should I use?",
              a: "15–35% works best for road-surface monitoring. Lower = more detections but more false positives. Start at 20% and adjust."
            },
            {
              q: "What does IOU threshold do?",
              a: "Controls how overlapping bounding boxes are merged. 40% is a solid default. Higher values mean fewer boxes get merged together."
            },
            {
              q: "Which input resolution is best for my CPU?",
              a: "640px gives the best accuracy-to-speed ratio on Intel i5. Use 416px if inference is too slow, or 768px for maximum accuracy."
            },
            {
              q: "How does GPS simulation work?",
              a: "Each detection is randomly offset from your base coordinates by up to the scatter radius. Set your city center, then adjust the scatter to spread detections realistically on the map."
            },
            {
              q: "Will clearing detections delete my images?",
              a: "Yes. The 'Clear All' button permanently removes all records from the SQLite database and any saved annotated images from disk."
            },
            {
              q: "How does Privacy Guard work?",
              a: "When active, it identifies sensitive objects (people, cars) and applies a 51x51 Gaussian blur locally. Both the saved image and the live stream are secured."
            },
          ].map((item, i) => (
            <div key={i} className="aic-faq-item">
              <button
                type="button"
                className="aic-faq-q"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span>{item.q}</span>
                <ChevronDown
                  size={16}
                  style={{
                    transform: openFaq === i ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                    flexShrink: 0,
                    color: "var(--text-muted)"
                  }}
                />
              </button>
              {openFaq === i && (
                <p className="aic-faq-a">{item.a}</p>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
