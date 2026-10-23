import React, { useEffect, useState, useRef } from "react";
import { 
    Upload, RefreshCcw, Database, ShieldAlert, Download, 
    Eye, EyeOff, AlertTriangle, CheckCircle2, Cpu, Zap, 
    Image as ImageIcon, Layers, FileText, Activity, ShieldCheck, Sparkles, X
} from "lucide-react";
import { Detection, DetectionResult } from "../types";
import { API_BASE } from "../api/config";
import "./AiScanner.css";

interface AiScannerProps {
    result: DetectionResult | null;
    loading: boolean;
    scannerStatus: string | null;
    isDragging: boolean;
    preview: string | null;
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
        url: `${API_BASE}/results/scan_20261015_164523_293.jpg`,
        icon: "🕳️"
    },
    {
        id: "sample-traffic",
        title: "Surface Hazards & Traffic",
        meta: "Multi-vehicle urban street scan",
        url: `${API_BASE}/results/scan_20261015_164525_689.jpg`,
        icon: "🚗"
    },
    {
        id: "sample-crack",
        title: "Pavement & Road Cracks",
        meta: "Structural asphalt inspection",
        url: `${API_BASE}/results/scan_20261023_182552_260.jpg`,
        icon: "⚡"
    }
];

function AiScanner({
    result, loading, scannerStatus, isDragging, preview,
    fileInputRef, imageRef, canvasRef,
    onFileChange, handleDragOver, handleDragLeave, handleDrop,
    drawDetections, resetScanner, onDetectionsChange, onSelectSample
}: AiScannerProps) {
    const [showBoxes, setShowBoxes] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [filterCategory, setFilterCategory] = useState<"all" | "potholes" | "hazards" | "traffic">("all");
    const [previewError, setPreviewError] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

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
                <div className="aiscanner-loading-card animate-in">
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
        </section>
    );
}

export default AiScanner;
