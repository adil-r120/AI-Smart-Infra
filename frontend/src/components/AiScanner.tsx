import React, { useEffect, useState, useRef } from "react";
import { 
    Upload, RefreshCcw, Database, ShieldAlert, Download, 
    Eye, EyeOff, AlertTriangle, CheckCircle2, Cpu, Zap, 
    Image as ImageIcon, Layers, FileText, Activity, ShieldCheck, Sparkles, X,
    Send, MapPin, Loader2, CheckCircle
} from "lucide-react";
import axios from "axios";
import { Detection, DetectionResult } from "../types";
import { API_BASE } from "../api/config";
import "./AiScanner.css";

interface AiScannerProps {
    result: DetectionResult | null;
    loading: boolean;
    scannerStatus: string | null;
    isDragging: boolean;
    preview: string | null;
    file?: File | null;
    fileInputRef: React.RefObject<HTMLInputElement>;
    imageRef: React.RefObject<HTMLImageElement>;
    canvasRef: React.RefObject<HTMLCanvasElement>;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleDragOver: (e: React.DragEvent) => void;
    handleDragLeave: () => void;
    handleDrop: (e: React.DragEvent) => void;
    drawDetections: () => void;
    resetScanner: () => void;
    onDetectionsChange?: (newDetections: any[]) => void;
    onSelectSample?: (sampleUrl: string) => void;
}

const CLASS_COLORS: Record<string, string> = {
    pothole: "#ef4444",      // Vibrant red
    car: "#38bdf8",          // Sky blue
    truck: "#f59e0b",        // Amber
    bus: "#f97316",          // Orange
    motorcycle: "#06b6d4",   // Cyan
    person: "#a855f7",       // Purple
    bicycle: "#84cc16",      // Lime
    garbage: "#10b981",      // Emerald
    leakage: "#0284c7",      // Blue
    crack: "#ec4899",        // Pink
    danger: "#dc2626",       // Deep Red
};

const CLASS_EMOJI: Record<string, string> = {
    pothole: "🕳️",
    car: "🚗",
    truck: "🚛",
    bus: "🚌",
    motorcycle: "🏍️",
    person: "👤",
    bicycle: "🚲",
    garbage: "🗑️",
    leakage: "💧",
    crack: "⚡",
    danger: "⚠️",
};

const SAMPLE_ROADWAYS = [
    {
        id: "sample-pothole",
        title: "Pothole & Surface Damage",
        meta: "High-resolution roadway scan",
        url: "/samples/pothole.jpg",
        icon: "🕳️"
    },
    {
        id: "sample-traffic",
        title: "Surface Hazards & Traffic",
        meta: "Multi-vehicle urban street scan",
        url: "/samples/traffic.jpg",
        icon: "🚗"
    },
    {
        id: "sample-crack",
        title: "Pavement & Road Cracks",
        meta: "Structural asphalt inspection",
        url: "/samples/road.jpg",
        icon: "⚡"
    }
];

function AiScanner({
    result, loading, scannerStatus, isDragging, preview, file,
    fileInputRef, imageRef, canvasRef,
    onFileChange, handleDragOver, handleDragLeave, handleDrop,
    drawDetections, resetScanner, onDetectionsChange, onSelectSample
}: AiScannerProps) {
    const [showBoxes, setShowBoxes] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [filterCategory, setFilterCategory] = useState<"all" | "potholes" | "hazards" | "traffic">("all");
    const [previewError, setPreviewError] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Reporting to Admin states
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportCategory, setReportCategory] = useState("pothole");
    const [reportPriority, setReportPriority] = useState<"Low" | "Medium" | "High" | "Critical">("High");
    const [reportLocation, setReportLocation] = useState("12.9716, 77.5946");
    const [reportDescription, setReportDescription] = useState("");
    const [submittingReport, setSubmittingReport] = useState(false);
    const [reportSuccess, setReportSuccess] = useState<string | null>(null);
    const [reportError, setReportError] = useState<string | null>(null);
    const [locatingGps, setLocatingGps] = useState(false);

    useEffect(() => {
        setPreviewError(false);
    }, [preview]);

    // Merge potholes + objects + infra_detections for full spatial telemetry
    const allDetections: Detection[] = result
        ? [
            ...(result.potholes ?? []),
            ...(result.objects ?? []),
            ...(result.infra_detections ?? [])
          ]
        : [];

    // Notify parent of new detections
    useEffect(() => {
        if (result && (result.potholes?.length || result.objects?.length || result.infra_detections?.length)) {
            if (onDetectionsChange) {
                onDetectionsChange([
                    ...(result.potholes || []),
                    ...(result.infra_detections || [])
                ]);
            }
        }
    }, [result, onDetectionsChange]);

    // ResizeObserver ensures canvas redraws accurately when image or window resizes
    useEffect(() => {
        const img = imageRef.current;
        if (!img) return;

        const observer = new ResizeObserver(() => {
            if (showBoxes) {
                drawDetections();
            }
        });

        observer.observe(img);
        return () => observer.disconnect();
    }, [imageRef, drawDetections, showBoxes, result]);

    // Toggle box visibility
    const toggleBoxes = () => {
        const nextState = !showBoxes;
        setShowBoxes(nextState);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        if (!nextState) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        } else {
            drawDetections();
        }
    };

    // Export annotated canvas + image composite
    const handleDownloadAnnotated = () => {
        const img = imageRef.current;
        const canvas = canvasRef.current;
        if (!img || !canvas) return;

        setDownloading(true);
        try {
            const exportCanvas = document.createElement("canvas");
            exportCanvas.width = canvas.width || img.naturalWidth || 800;
            exportCanvas.height = canvas.height || img.naturalHeight || 600;
            const ctx = exportCanvas.getContext("2d");
            if (!ctx) return;

            // Draw base image
            ctx.drawImage(img, 0, 0, exportCanvas.width, exportCanvas.height);
            // Overlay detections
            if (showBoxes) {
                ctx.drawImage(canvas, 0, 0);
            }

            // Watermark
            ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
            ctx.fillRect(0, exportCanvas.height - 32, exportCanvas.width, 32);
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 12px 'JetBrains Mono', monospace";
            ctx.fillText(`SMART-INFRA AI DAMAGE SCANNER • ${new Date().toISOString()} • DETECTIONS: ${allDetections.length}`, 16, exportCanvas.height - 11);

            const link = document.createElement("a");
            link.download = `smart_infra_scan_${Date.now()}.png`;
            link.href = exportCanvas.toDataURL("image/png");
            link.click();
        } catch (e) {
            console.error("Export failed", e);
        } finally {
            setDownloading(false);
        }
    };

    // Metrics calculations
    const potholeCount = result?.potholes?.length ?? 0;
    const vehicleCount = result?.objects?.filter(d => ["car", "truck", "bus", "motorcycle"].includes(d.class.toLowerCase())).length ?? 0;
    const peopleCount = result?.objects?.filter(d => d.class.toLowerCase() === "person").length ?? 0;
    const infraHazardCount = (result?.infra_detections?.length ?? 0) + 
        (result?.objects?.filter(d => ["garbage", "leakage", "crack"].includes(d.class.toLowerCase())).length ?? 0);

    // Filter detections by category
    const filteredDetections = allDetections.filter(d => {
        const cKey = d.class.toLowerCase();
        if (filterCategory === "potholes") return cKey === "pothole";
        if (filterCategory === "hazards") return ["garbage", "leakage", "crack", "danger"].includes(cKey);
        if (filterCategory === "traffic") return ["car", "truck", "bus", "motorcycle", "person", "bicycle"].includes(cKey);
        return true;
    });

    const hasError = scannerStatus && (
        scannerStatus.toLowerCase().includes("error") || 
        scannerStatus.toLowerCase().includes("fail") ||
        scannerStatus.toLowerCase().includes("too large")
    );

    const handleOpenReportModal = () => {
        // Auto-determine category
        let defaultCat = "structural";
        if (potholeCount > 0) defaultCat = "pothole";
        else if (infraHazardCount > 0) defaultCat = "road_hazard";
        else if (vehicleCount > 0) defaultCat = "traffic";
        setReportCategory(defaultCat);

        // Auto-determine priority
        let defaultPriority: "Low" | "Medium" | "High" | "Critical" = "Medium";
        if (potholeCount > 2 || allDetections.some(d => d.confidence > 0.85)) {
            defaultPriority = "Critical";
        } else if (potholeCount > 0 || infraHazardCount > 1) {
            defaultPriority = "High";
        }
        setReportPriority(defaultPriority);

        // Auto-generate detailed description based on neural findings
        const findings: string[] = [];
        if (potholeCount > 0) findings.push(`${potholeCount} pothole(s) detected`);
        if (infraHazardCount > 0) findings.push(`${infraHazardCount} road hazard(s)/crack(s) detected`);
        if (vehicleCount > 0) findings.push(`${vehicleCount} vehicle(s) observed in area`);
        const findingsSummary = findings.length > 0 ? findings.join(", ") : "Infrastructure anomaly detected by AI scan";
        
        setReportDescription(`Automated AI Scan Report: ${findingsSummary}. Requesting field crew assessment and repair dispatch.`);
        setReportError(null);
        setReportSuccess(null);
        setShowReportModal(true);

        // Try getting live GPS coordinates automatically
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setReportLocation(`${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`);
                },
                () => {},
                { timeout: 5000 }
            );
        }
    };

    const handleGetGpsLocation = () => {
        if (!navigator.geolocation) {
            setReportError("Geolocation is not supported by this browser.");
            return;
        }
        setLocatingGps(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setReportLocation(`${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`);
                setLocatingGps(false);
            },
            (err) => {
                console.warn("GPS error:", err);
                setLocatingGps(false);
            },
            { enableHighAccuracy: true, timeout: 8000 }
        );
    };

    const handleSubmitReport = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmittingReport(true);
        setReportError(null);
        setReportSuccess(null);

        try {
            const token = localStorage.getItem("si_token");
            const formData = new FormData();

            // Image handling: Use file prop or extract from preview/canvas
            let fileToSend: File | null = file || null;
            if (!fileToSend && preview) {
                try {
                    const res = await fetch(preview);
                    const blob = await res.blob();
                    fileToSend = new File([blob], `ai_scan_${Date.now()}.jpg`, { type: blob.type || "image/jpeg" });
                } catch (e) {
                    console.warn("Could not convert preview to File", e);
                }
            }

            if (fileToSend) {
                formData.append("image", fileToSend);
            }
            formData.append("report_type", reportCategory);
            formData.append("description", reportDescription.trim() || `AI Scan Detected: ${reportCategory}`);
            formData.append("location", reportLocation.trim() || "Smart City Grid");
            formData.append("priority_level", reportPriority);

            const res = await axios.post(`${API_BASE}/report`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                timeout: 30000
            });

            const ticketId = res.data?.id ? `#TKT-${res.data.id}` : `#TKT-${Math.floor(1000 + Math.random() * 9000)}`;
            setReportSuccess(`Report successfully sent to Admin! Ticket ${ticketId} created.`);
            setTimeout(() => {
                setShowReportModal(false);
                setReportSuccess(null);
            }, 2500);
        } catch (err: any) {
            console.error("Report submit error:", err);
            const msg = err.response?.data?.detail || err.message || "Failed to submit report to Admin";
            setReportError(typeof msg === "string" ? msg : JSON.stringify(msg));
        } finally {
            setSubmittingReport(false);
        }
    };

    return (
        <section className="aiscanner-root" ref={containerRef}>
            {/* ── Header Cockpit Bar ── */}
            <div className="aiscanner-header-bar">
                <div className="aiscanner-header-left">
                    <div className={`aiscanner-header-badge ${result ? "active" : ""}`}>
                        <Layers size={22} />
                    </div>
                    <div>
                        <h2 className="aiscanner-title">
                            Neural Damage &amp; Infrastructure Scanner
                            <span className="aiscanner-status-pill">
                                <span className="aiscanner-pulse-orb" />
                                {result ? "ANALYSIS COMPLETE" : loading ? "INFERENCE RUNNING" : "READY TO UPLOAD"}
                            </span>
                        </h2>
                        <p className="aiscanner-subtitle">
                            Automated computer vision inference for pavement cracks, potholes, roadway hazards &amp; traffic density
                        </p>
                    </div>
                </div>

                <div className="aiscanner-header-actions">
                    <div className="aiscanner-engine-chip">
                        <ShieldAlert size={14} className="text-primary" />
                        <span>{result?.multi_model_active ? "TRIPLE-MODEL PIPELINE" : "Upload Issue Images"}</span>
                    </div>

                    {result && (
                        <button className="aiscanner-action-btn" onClick={resetScanner} title="Start New Scan">
                            <RefreshCcw size={14} />
                            <span>New Scan</span>
                        </button>
                    )}
                </div>
            </div>

            {/* ── DROPZONE / UPLOAD STATE ── */}
            {!result && !loading && (
                <div className="aiscanner-drop-card animate-in">
                    <div
                        className={`aiscanner-dropzone ${isDragging ? "dragging" : ""}`}
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={onFileChange} 
                            hidden 
                            accept="image/*" 
                        />
                        
                        {preview && !previewError ? (
                            <div className="aiscanner-preview-wrapper" onClick={(e) => e.stopPropagation()}>
                                <img 
                                    src={preview} 
                                    alt="Selected preview" 
                                    className="aiscanner-preview-img"
                                    onError={() => setPreviewError(true)}
                                />
                                <div 
                                    className="aiscanner-preview-overlay"
                                    onClick={() => fileInputRef.current?.click()}
                                    title="Click to choose a different image"
                                >
                                    <Upload size={18} /> Click or drop new image to replace
                                </div>
                                <button
                                    type="button"
                                    className="aiscanner-preview-close"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        resetScanner();
                                    }}
                                    title="Remove image and reset"
                                >
                                    <X size={15} />
                                </button>
                            </div>
                        ) : (
                            <div>
                                <div className="aiscanner-portal-orb">
                                    <Upload size={34} />
                                </div>
                                <h3 className="aiscanner-drop-title">
                                    {isDragging ? "Release Image to Run Neural Analysis" : "Drop Street or Aerial Imagery Here"}
                                </h3>
                                <p className="aiscanner-drop-desc">
                                    Upload roadway snapshots, drone captures, or dashcam images to automatically detect potholes, road cracks, vehicle density, and pedestrians.
                                </p>
                                <button 
                                    type="button" 
                                    className="aiscanner-browse-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        fileInputRef.current?.click();
                                    }}
                                >
                                    <Upload size={15} /> Select Image File
                                </button>
                                <div className="aiscanner-format-tags">
                                    <span className="aiscanner-format-pill">JPG</span>
                                    <span className="aiscanner-format-pill">PNG</span>
                                    <span className="aiscanner-format-pill">WEBP</span>
                                    <span className="aiscanner-format-pill">UP TO 25MB</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Error Notice with dismiss button */}
                    {hasError && (
                        <div className="aiscanner-error-alert">
                            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                            <span style={{ flex: 1 }}>{scannerStatus}</span>
                            <button
                                type="button"
                                className="aiscanner-error-dismiss"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    resetScanner();
                                }}
                                title="Dismiss and reset"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )}

                    {/* Quick Test Samples Shelf */}
                    {onSelectSample && (
                        <div className="aiscanner-samples-section">
                            <span className="aiscanner-samples-label">
                                <Zap size={13} className="text-primary" /> Instant Test Preset Images
                            </span>
                            <div className="aiscanner-samples-grid">
                                {SAMPLE_ROADWAYS.map(sample => (
                                    <div 
                                        key={sample.id}
                                        className="aiscanner-sample-card"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectSample(sample.url);
                                        }}
                                        title={`Analyze ${sample.title}`}
                                    >
                                        <div className="aiscanner-sample-icon">{sample.icon}</div>
                                        <div>
                                            <p className="aiscanner-sample-name">{sample.title}</p>
                                            <p className="aiscanner-sample-meta">{sample.meta}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── NEURAL INFERENCE LOADING STATE ── */}
            {loading && (
                <div className="aiscanner-loading-container animate-in">
                    {preview ? (
                        <div className="aiscanner-viewport-frame aiscanner-scanning-frame">
                            {/* Sci-Fi Corner Brackets */}
                            <div className="hud-corner hud-corner-tl" />
                            <div className="hud-corner hud-corner-tr" />
                            <div className="hud-corner hud-corner-bl" />
                            <div className="hud-corner hud-corner-br" />

                            <img 
                                src={preview} 
                                alt="Scanning in progress" 
                                className="aiscanner-viewport-image"
                            />

                            {/* Active Digital Laser Scanning Line */}
                            <div className="scanning-line" />

                            {/* Tactical Reticle in Center */}
                            <div className="livefeed-reticle">
                                <div className="livefeed-reticle-ring" />
                                <div className="livefeed-reticle-cross-h" />
                                <div className="livefeed-reticle-cross-v" />
                            </div>

                            {/* Scanning HUD Status Banner */}
                            <div className="aiscanner-scanning-hud-banner">
                                <div className="aiscanner-scanning-hud-title">
                                    <Sparkles size={16} className="text-primary animate-pulse" />
                                    <span>{scannerStatus || "RUNNING NEURAL EDGE INFERENCE..."}</span>
                                </div>
                                <div className="aiscanner-pipeline-pills" style={{ marginTop: 6 }}>
                                    <span className="aiscanner-pipeline-pill active">✓ Preprocessing</span>
                                    <span className="aiscanner-pipeline-pill active">● Damage Detection</span>
                                    <span className="aiscanner-pipeline-pill">○ Spatial Telemetry</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="aiscanner-loading-card">
                            <div className="aiscanner-radar-loader">
                                <div className="aiscanner-loader-ring" />
                                <div className="aiscanner-loader-inner">
                                    <Cpu size={24} />
                                </div>
                            </div>
                            <h3 className="aiscanner-loading-title">
                                {scannerStatus || "Running Neural Edge Inference..."}
                            </h3>
                            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", maxWidth: 460, margin: "0 auto" }}>
                                Applying Model A (Pothole custom weights), Model B (COCO objects), and spatial bounding coordinate mapping.
                            </p>
                            <div className="aiscanner-pipeline-pills">
                                <span className="aiscanner-pipeline-pill active">✓ Preprocessing</span>
                                <span className="aiscanner-pipeline-pill active">● Damage Detection</span>
                                <span className="aiscanner-pipeline-pill">○ Spatial Telemetry</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── RESULTS INTELLIGENCE VIEW ── */}
            {result && (
                <div className="aiscanner-results-grid animate-in">
                    {/* Left: Viewport Frame */}
                    <div className="aiscanner-viewport-frame">
                        {/* Sci-Fi Corner Brackets */}
                        <div className="hud-corner hud-corner-tl" />
                        <div className="hud-corner hud-corner-tr" />
                        <div className="hud-corner hud-corner-bl" />
                        <div className="hud-corner hud-corner-br" />

                        <img 
                            ref={imageRef} 
                            src={preview || (result.image_url ? (result.image_url.startsWith("http") ? result.image_url : `${API_BASE}/results/${result.image_url.replace(/^\/?results\//, '')}`) : "")} 
                            alt="Damage Analysis Result" 
                            onLoad={drawDetections}
                            className="aiscanner-viewport-image"
                        />
                        <canvas 
                            ref={canvasRef} 
                            className="aiscanner-overlay-canvas"
                        />

                        {/* Top HUD Controls overlay on image */}
                        <div className="aiscanner-viewport-hud">
                            <button 
                                className={`aiscanner-hud-btn ${showBoxes ? 'active' : ''}`}
                                onClick={toggleBoxes}
                                title="Toggle Bounding Boxes Layer"
                            >
                                {showBoxes ? <Eye size={13} /> : <EyeOff size={13} />}
                                <span>{showBoxes ? "Hide HUD" : "Show HUD"}</span>
                            </button>
                            <button 
                                className="aiscanner-hud-btn"
                                onClick={handleDownloadAnnotated}
                                disabled={downloading}
                                title="Export Annotated Image with Detections"
                            >
                                <Download size={13} />
                                <span>{downloading ? "Exporting..." : "Export PNG"}</span>
                            </button>
                        </div>
                    </div>

                    {/* Right: Telemetry Intelligence Panel */}
                    <div className="aiscanner-telemetry-panel">
                        {/* 4 KPI Metrics */}
                        <div className="aiscanner-kpi-grid">
                            <div className="aiscanner-kpi-card potholes">
                                <span className="aiscanner-kpi-label">⚠️ Potholes</span>
                                <span className="aiscanner-kpi-val">{potholeCount}</span>
                            </div>
                            <div className="aiscanner-kpi-card hazards">
                                <span className="aiscanner-kpi-label">💧 Road Hazards</span>
                                <span className="aiscanner-kpi-val">{infraHazardCount}</span>
                            </div>
                            <div className="aiscanner-kpi-card vehicles">
                                <span className="aiscanner-kpi-label">🚗 Vehicles</span>
                                <span className="aiscanner-kpi-val">{vehicleCount}</span>
                            </div>
                            <div className="aiscanner-kpi-card pedestrians">
                                <span className="aiscanner-kpi-label">👤 Pedestrians</span>
                                <span className="aiscanner-kpi-val">{peopleCount}</span>
                            </div>
                        </div>

                        {/* Spatial Telemetry Feed with category filters */}
                        <div className="aiscanner-feed-card">
                            <div className="aiscanner-feed-header">
                                <div className="aiscanner-feed-title">
                                    <Database size={13} className="text-primary" />
                                    <span>Spatial Telemetry Feed</span>
                                    <span className="aiscanner-feed-badge">
                                        {allDetections.length} Total
                                    </span>
                                </div>
                            </div>

                            {/* Category Filter Pills */}
                            <div className="aiscanner-filter-row">
                                <button 
                                    className={`aiscanner-filter-btn ${filterCategory === "all" ? "active" : ""}`}
                                    onClick={() => setFilterCategory("all")}
                                >
                                    All ({allDetections.length})
                                </button>
                                <button 
                                    className={`aiscanner-filter-btn ${filterCategory === "potholes" ? "active" : ""}`}
                                    onClick={() => setFilterCategory("potholes")}
                                >
                                    Potholes ({potholeCount})
                                </button>
                                <button 
                                    className={`aiscanner-filter-btn ${filterCategory === "hazards" ? "active" : ""}`}
                                    onClick={() => setFilterCategory("hazards")}
                                >
                                    Hazards ({infraHazardCount})
                                </button>
                                <button 
                                    className={`aiscanner-filter-btn ${filterCategory === "traffic" ? "active" : ""}`}
                                    onClick={() => setFilterCategory("traffic")}
                                >
                                    Traffic ({vehicleCount + peopleCount})
                                </button>
                            </div>

                            {/* Detection Items List */}
                            <div className="aiscanner-feed-list custom-scrollbar">
                                {filteredDetections.map((d: Detection, i: number) => {
                                    const cKey = d.class.toLowerCase();
                                    const col = CLASS_COLORS[cKey] || "var(--primary)";
                                    const em = CLASS_EMOJI[cKey] || "📍";
                                    const isHigh = d.confidence >= 0.7;
                                    const isMed = d.confidence >= 0.4 && d.confidence < 0.7;
                                    const confColor = isHigh ? "#10b981" : isMed ? "#f59e0b" : "#ef4444";

                                    return (
                                        <div 
                                            key={i} 
                                            className="aiscanner-detection-item"
                                            style={{ borderLeftColor: col }}
                                        >
                                            <span className="aiscanner-item-class" style={{ color: col }}>
                                                <span>{em}</span>
                                                <span>{d.class}</span>
                                            </span>

                                            <div className="aiscanner-item-conf-box">
                                                <div className="aiscanner-conf-meter">
                                                    <div 
                                                        className="aiscanner-conf-fill"
                                                        style={{ 
                                                            width: `${d.confidence * 100}%`,
                                                            backgroundColor: confColor 
                                                        }} 
                                                    />
                                                </div>
                                                <span className="aiscanner-item-pct" style={{ color: confColor }}>
                                                    {Math.round(d.confidence * 100)}%
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}

                                {filteredDetections.length === 0 && allDetections.length > 0 && (
                                    <div style={{ padding: "16px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                                        No detections found in this category.
                                    </div>
                                )}

                                {allDetections.length === 0 && (
                                    <div className="aiscanner-nominal-banner">
                                        <CheckCircle2 size={24} />
                                        <span>STATUS NOMINAL: NO ROAD OR STRUCTURAL ANOMALIES DETECTED</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons Row */}
                        <div className="aiscanner-actions-row">
                            <button 
                                className="aiscanner-btn-report-admin" 
                                onClick={handleOpenReportModal}
                                title="Transmit detected issue directly to City Admin & Maintenance Dispatch"
                            >
                                <Send size={15} /> Send Issue to Admin
                            </button>
                            <button 
                                className="aiscanner-btn-primary" 
                                onClick={resetScanner}
                            >
                                <RefreshCcw size={15} /> Analyze Another Image
                            </button>
                            <button 
                                className="aiscanner-btn-secondary" 
                                onClick={handleDownloadAnnotated}
                                disabled={downloading}
                            >
                                <Download size={15} /> Export PNG
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── SEND ISSUE TO ADMIN MODAL ── */}
            {showReportModal && (
                <div className="aiscanner-modal-backdrop" onClick={() => !submittingReport && setShowReportModal(false)}>
                    <div className="aiscanner-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="aiscanner-modal-header">
                            <div className="aiscanner-modal-title-group">
                                <div className="aiscanner-modal-icon-badge">
                                    <ShieldAlert size={20} />
                                </div>
                                <div>
                                    <h3 className="aiscanner-modal-title">Send Issue to Admin</h3>
                                    <p className="aiscanner-modal-subtitle">Transmits AI scan findings and evidence to Municipal Admin &amp; Work Orders</p>
                                </div>
                            </div>
                            <button 
                                className="aiscanner-modal-close"
                                onClick={() => !submittingReport && setShowReportModal(false)}
                                title="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {reportSuccess ? (
                            <div className="aiscanner-modal-success-card">
                                <CheckCircle size={44} className="text-emerald" />
                                <h4>Issue Transmitted to Admin Console</h4>
                                <p>{reportSuccess}</p>
                                <p className="aiscanner-modal-success-hint">Admin personnel have been notified. Work order generation is pending.</p>
                                <button 
                                    className="aiscanner-btn-primary"
                                    onClick={() => setShowReportModal(false)}
                                    style={{ marginTop: 12 }}
                                >
                                    Done
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmitReport}>
                                <div className="aiscanner-modal-body">
                                    {reportError && (
                                        <div className="aiscanner-error-alert" style={{ margin: 0 }}>
                                            <AlertTriangle size={16} />
                                            <span>{reportError}</span>
                                        </div>
                                    )}

                                    {/* Scan Highlights Banner */}
                                    <div className="aiscanner-modal-highlights">
                                        <div className="aiscanner-modal-highlight-item">
                                            <span className="label">⚠️ Potholes</span>
                                            <span className="val">{potholeCount}</span>
                                        </div>
                                        <div className="aiscanner-modal-highlight-item">
                                            <span className="label">💧 Hazards</span>
                                            <span className="val">{infraHazardCount}</span>
                                        </div>
                                        <div className="aiscanner-modal-highlight-item">
                                            <span className="label">🚗 Traffic</span>
                                            <span className="val">{vehicleCount + peopleCount}</span>
                                        </div>
                                    </div>

                                    {/* Category Select */}
                                    <div className="aiscanner-modal-form-group">
                                        <label className="aiscanner-modal-label">Issue Category</label>
                                        <select 
                                            className="aiscanner-modal-select"
                                            value={reportCategory}
                                            onChange={(e) => setReportCategory(e.target.value)}
                                            required
                                        >
                                            <option value="pothole">Pothole / Road Surface Crater</option>
                                            <option value="crack">Pavement &amp; Asphalt Cracks</option>
                                            <option value="road_hazard">Road Hazard / Obstruction</option>
                                            <option value="leakage">Water / Sewer Leakage</option>
                                            <option value="garbage">Garbage / Waste Overflow</option>
                                            <option value="traffic">Traffic Bottleneck / Congestion</option>
                                            <option value="structural">General Structural Damage</option>
                                        </select>
                                    </div>

                                    {/* Severity / Priority */}
                                    <div className="aiscanner-modal-form-group">
                                        <label className="aiscanner-modal-label">Severity Level</label>
                                        <div className="aiscanner-modal-priority-strip">
                                            {(["Low", "Medium", "High", "Critical"] as const).map(p => (
                                                <button
                                                    key={p}
                                                    type="button"
                                                    className={`aiscanner-modal-priority-btn priority-${p.toLowerCase()} ${reportPriority === p ? "active" : ""}`}
                                                    onClick={() => setReportPriority(p)}
                                                >
                                                    {p}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Location */}
                                    <div className="aiscanner-modal-form-group">
                                        <label className="aiscanner-modal-label">Location / GPS Coordinates</label>
                                        <div className="aiscanner-modal-loc-row">
                                            <input 
                                                type="text" 
                                                className="aiscanner-modal-input"
                                                value={reportLocation}
                                                onChange={(e) => setReportLocation(e.target.value)}
                                                placeholder="e.g. 12.9716, 77.5946 or Brigade Road, Bangalore"
                                                required
                                            />
                                            <button 
                                                type="button"
                                                className="aiscanner-modal-loc-btn"
                                                onClick={handleGetGpsLocation}
                                                disabled={locatingGps}
                                                title="Detect current GPS coordinates"
                                            >
                                                {locatingGps ? <Loader2 size={13} className="animate-spin" /> : <MapPin size={13} />}
                                                <span>{locatingGps ? "Locating..." : "GPS"}</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div className="aiscanner-modal-form-group">
                                        <label className="aiscanner-modal-label">Description &amp; Maintenance Notes</label>
                                        <textarea 
                                            className="aiscanner-modal-textarea"
                                            value={reportDescription}
                                            onChange={(e) => setReportDescription(e.target.value)}
                                            placeholder="Provide details about the defect, road urgency, or repair crew notes..."
                                            rows={3}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="aiscanner-modal-footer">
                                    <button 
                                        type="button"
                                        className="aiscanner-btn-secondary"
                                        onClick={() => setShowReportModal(false)}
                                        disabled={submittingReport}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        className="aiscanner-btn-report-admin"
                                        disabled={submittingReport}
                                    >
                                        {submittingReport ? (
                                            <>
                                                <Loader2 size={15} className="animate-spin" />
                                                <span>Transmitting...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Send size={15} />
                                                <span>Transmit to Admin</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}

export default AiScanner;
