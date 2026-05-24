import React, { useEffect } from "react";
import { Upload, RefreshCcw, Database, ShieldAlert } from "lucide-react";
import { Detection, DetectionResult } from "../types";

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
}

const CLASS_COLORS: Record<string, string> = {
    pothole: "#d81717ff",   // orange
    car: "#13d49aff",   // sky blue
    truck: "#d1eb0cff",
    bus: "#19c376ff",
    motorcycle: "#1addddff",
    person: "#e632f3ff",   // purple
};

const CLASS_EMOJI: Record<string, string> = {
    pothole: "🕳️",
    car: "🚗",
    truck: "🚛",
    bus: "🚌",
    motorcycle: "🏍️",
    person: "👤",
};

function AiScanner({
    result, loading, scannerStatus, isDragging, preview,
    fileInputRef, imageRef, canvasRef,
    onFileChange, handleDragOver, handleDragLeave, handleDrop,
    drawDetections, resetScanner, onDetectionsChange
}: AiScannerProps) {

    // Merge potholes + objects for summary count
    const allDetections: Detection[] = result
        ? [...(result.potholes ?? []), ...(result.objects ?? [])]
        : [];

    // Notify parent of new detections
    useEffect(() => {
        if (result && (result.potholes?.length || result.objects?.length)) {
            if (onDetectionsChange) {
                // We only want to send data that matches what the dashboard expects
                // For now, let's send the potholes as they are the primary "alerts"
                onDetectionsChange(result.potholes || []);
            }
        }
    }, [result, onDetectionsChange]);

    return (
        <section className="section">
            <div className="section-header">
                <h2 className="section-title">Neural Structural Scanner</h2>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "0.75rem", color: "var(--success)", fontWeight: 700 }}>
                    <ShieldAlert size={14} /> DUAL-MODEL ACTIVE
                </div>
            </div>

            <div className="scanner-card glass-card">
                {/* DROPZONE */}
                {!result && !loading && (
                    <div
                        className={`scanner-dropzone ${isDragging ? "dragging" : ""}`}
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <input type="file" ref={fileInputRef} onChange={onFileChange} hidden accept="image/*" />
                        {preview ? (
                            <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", overflow: "hidden", borderRadius: "12px", marginBottom: "20px" }}>
                                <img src={preview} alt="Selected" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700 }}>
                                    Click or Drop to Replace
                                </div>
                            </div>
                        ) : (
                            <div style={{ marginBottom: "20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                                <div className={`stack-icon ${isDragging ? "animate-bounce" : ""}`} style={{ width: 80, height: 80 }}>
                                    <Upload size={40} />
                                </div>
                                <p style={{ marginTop: 12, fontWeight: 700, fontSize: "1.1rem" }}>
                                    {isDragging ? "Release to Analyze" : "Upload Street or Aerial Imagery"}
                                </p>
                                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                                    Detects potholes · vehicles · people
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* LOADING */}
                {loading && (
                    <div style={{ padding: "60px" }}>
                        <div className="loader"></div>
                        <p style={{ fontWeight: 700, fontSize: "1.1rem" }}>{scannerStatus}</p>
                        <p style={{ color: "var(--text-muted)", marginTop: "8px" }}>
                            Running Model A (Pothole) + Model B (Objects)…
                        </p>
                    </div>
                )}

                {/* RESULT */}
                {result && (
                    <div className="result-container animate-in">
                        <div className="result-image-wrapper">
                            <img ref={imageRef} src={preview || ""} alt="Analysis" onLoad={drawDetections} />
                            <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }} />


                        </div>
                        <div className="result-meta">
                            {/* Summary row */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                                <div className="stat-card" style={{ padding: "14px", textAlign: "center" }}>
                                    <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Potholes</p>
                                    <p style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--primary)" }}>{result.potholes?.length ?? 0}</p>
                                </div>
                                <div className="stat-card" style={{ padding: "14px", textAlign: "center" }}>
                                    <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Vehicles</p>
                                    <p style={{ fontSize: "1.6rem", fontWeight: 800, color: "#38bdf8" }}>
                                        {result.objects?.filter(d => ["car", "truck", "bus", "motorcycle"].includes(d.class)).length ?? 0}
                                    </p>
                                </div>
                                <div className="stat-card" style={{ padding: "14px", textAlign: "center" }}>
                                    <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>People</p>
                                    <p style={{ fontSize: "1.6rem", fontWeight: 800, color: "#a78bfa" }}>
                                        {result.objects?.filter(d => d.class === "person").length ?? 0}
                                    </p>
                                </div>
                            </div>

                            {/* Telemetry log */}
                            <div className="telemetry-log custom-scrollbar" style={{ maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                                <div style={{ marginBottom: "14px", fontSize: "10px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                    <Database size={14} className="animate-pulse" /> SPATIAL TELEMETRY FEED [LIVE]
                                </div>
                                {allDetections.map((d: Detection, i: number) => (
                                    <div key={i} className="log-entry" style={{ 
                                        borderLeft: `3px solid ${CLASS_COLORS[d.class] || "#fff"}`, 
                                        padding: "8px 12px", 
                                        margin: "6px 0",
                                        background: 'rgba(255,255,255,0.02)',
                                        borderRadius: '0 8px 8px 0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px'
                                    }}>
                                        <span className="log-timestamp" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem', color: 'var(--text-muted)', minWidth: '65px' }}>
                                            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </span>
                                        <span className="log-type" style={{ color: CLASS_COLORS[d.class] || "#fff", fontWeight: 900, minWidth: '90px', fontSize: '0.75rem' }}>
                                            {CLASS_EMOJI[d.class] || "📍"} {d.class.toUpperCase()}
                                        </span>
                                        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>
                                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', fontWeight: 700 }}>
                                            <span style={{ color: "var(--text-muted)", marginRight: 4 }}>CONF:</span>
                                            <span style={{ color: d.confidence > 0.8 ? "#10b981" : "#f59e0b" }}>{(d.confidence * 100).toFixed(1)}%</span>
                                        </span>
                                    </div>
                                ))}
                                {allDetections.length === 0 && (
                                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--success)', fontWeight: 700, fontSize: '0.8rem', background: 'rgba(16, 185, 129, 0.03)', borderRadius: '12px' }}>
                                        ✓ SYSTEM STATUS NOMINAL: NO ANOMALIES DETECTED
                                    </div>
                                )}
                            </div>

                            <button className="btn-premium" onClick={resetScanner}>
                                <RefreshCcw size={16} /> New Scan
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style>{`

            `}</style>
        </section>
    );
}

export default AiScanner;
