import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Camera, MapPin, Send, CheckCircle, Navigation, Info, Upload, X, AlertCircle, Loader, Calendar, Video, Download } from "lucide-react";
import { API_BASE } from "../api/config";
import { useAuth } from "../context/AuthContext";

const CATEGORIES = [
    { id: "pothole", label: "Pothole", icon: "🕳️" },
    { id: "broken_streetlight", label: "Broken Streetlight", icon: "💡" },
    { id: "fallen_tree", label: "Fallen Tree", icon: "🌳" },
    { id: "flooding", label: "Flooding", icon: "🌊" },
    { id: "traffic_signal", label: "Traffic Signal", icon: "🚦" },
    { id: "garbage_dump", label: "Garbage Dump", icon: "🗑️" },
    { id: "road_damage", label: "Road Damage", icon: "🛣️" },
    { id: "other", label: "Other", icon: "📋" }
];

interface ReportIssueProps {
    onReturn?: () => void;
}

const ReportIssue: React.FC<ReportIssueProps> = ({ onReturn }) => {
    const { token } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [location, setLocation] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [detectedIssue, setDetectedIssue] = useState<string | null>(null);
    const [locating, setLocating] = useState(false);
    const [errors, setErrors] = useState<{ file?: string; location?: string; category?: string; description?: string }>({});
    const [dragActive, setDragActive] = useState(false);
    const [webcamActive, setWebcamActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const handleExportDatabase = () => {
        window.open(`${API_BASE}/export`, '_blank');
    };

    const startWebcam = (e: React.MouseEvent) => {
        e.stopPropagation();
        setWebcamActive(true);
        setErrors(prev => ({ ...prev, file: undefined }));
        
        // Wait for React to mount the <video> element
        setTimeout(async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch(err => console.error("[CAM] Play error:", err));
                }
                streamRef.current = stream;
            } catch (err) {
                console.error("[CAM] getUserMedia failed:", err);
                setErrors(prev => ({ ...prev, file: 'Camera access denied or unavailable.' }));
                setWebcamActive(false);
            }
        }, 120);
    };

    const stopWebcam = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setWebcamActive(false);
    };

    const capturePhoto = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(videoRef.current, 0, 0);

        canvas.toBlob((blob) => {
            if (blob) {
                const capturedFile = new File([blob], "capture.jpg", { type: "image/jpeg" });
                setFile(capturedFile);
                setPreview(URL.createObjectURL(blob));
                stopWebcam();
            }
        }, "image/jpeg", 0.8);
    };

    useEffect(() => {
        return () => stopWebcam();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) {
            if (!selected.type.startsWith('image/')) {
                setErrors(prev => ({ ...prev, file: 'Please select a valid image file' }));
                return;
            }
            if (selected.size > 10 * 1024 * 1024) {
                setErrors(prev => ({ ...prev, file: 'Image size should be less than 10MB' }));
                return;
            }
            setFile(selected);
            setPreview(URL.createObjectURL(selected));
            setErrors(prev => ({ ...prev, file: undefined }));
        }
    };

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            setErrors(prev => ({ ...prev, location: 'Geolocation is not supported by your browser' }));
            return;
        }
        setLocating(true);
        setErrors(prev => ({ ...prev, location: undefined }));
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const coords = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
                setLocation(coords);
                setLocating(false);
            },
            (error) => {
                setErrors(prev => ({ ...prev, location: 'Unable to retrieve your location. Please enable location access.' }));
                setLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleCategoryClick = (catId: string) => {
        setSelectedCategory(catId);
        setErrors(prev => ({ ...prev, category: undefined }));

        const category = CATEGORIES.find(c => c.id === catId);
        if (category) {
            setDescription(prev => {
                const val = prev.trim();
                if (val.length === 0) return `${category.label} - `;
                if (val.startsWith(`${category.label} -`)) return prev;
                return `${category.label} - ${val}`;
            });
        }
    };

    const validateForm = () => {
        const newErrors: typeof errors = {};

        if (!file) {
            newErrors.file = 'Please upload an image of the issue';
        }
        if (!location.trim()) {
            newErrors.location = 'Please provide the location of the issue';
        }
        if (!selectedCategory) {
            newErrors.category = 'Please select a category for the issue';
        }
        if (!description.trim()) {
            newErrors.description = 'Please provide a description of the issue';
        } else if (description.trim().length < 10) {
            newErrors.description = 'Description must be at least 10 characters long';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setErrors({});

        const formData = new FormData();
        formData.append("image", file!);
        formData.append("location", location);
        formData.append("report_type", selectedCategory!);
        formData.append("description", description);

        try {
            const res = await axios.post(`${API_BASE}/report`, formData, {
                headers: { 
                    'Content-Type': 'multipart/form-data',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                timeout: 30000
            });
            setSuccess(true);
            setDetectedIssue(res.data.detected_issue);
            resetForm();
        } catch (err: any) {
            console.error("Failed to submit report", err);

            let errorMsg = "Error submitting report. Please try again.";

            if (err.response?.data?.detail) {
                const detail = err.response.data.detail;
                if (Array.isArray(detail)) {
                    errorMsg = detail.map(d => d.msg || JSON.stringify(d)).join(", ");
                } else if (typeof detail === 'string') {
                    errorMsg = detail;
                }
            } else if (err.message) {
                errorMsg = err.message;
            }

            setErrors(prev => ({ ...prev, description: `Submission failed: ${errorMsg}` }));
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFile(null);
        setPreview(null);
        setLocation("");
        setSelectedCategory(null);
        setDescription("");
        setErrors({});
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile && droppedFile.type.startsWith('image/')) {
            setFile(droppedFile);
            setPreview(URL.createObjectURL(droppedFile));
            setErrors(prev => ({ ...prev, file: undefined }));
        } else {
            setErrors(prev => ({ ...prev, file: 'Please drop a valid image file' }));
        }
    };

    const removeFile = () => {
        setFile(null);
        setPreview(null);
        setErrors(prev => ({ ...prev, file: undefined }));
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <>
            {success ? (
                <div className="report-success-container animate-in">
                    <div className="report-success-card">
                        {/* Animated Success Icon */}
                        <div className="success-animation-wrapper">
                            <div className="success-icon-wrapper">
                                <CheckCircle size={80} strokeWidth={2.5} />
                            </div>
                            <div className="success-ring"></div>
                        </div>

                        {/* Main Success Message */}
                        <h2 className="success-main-title">🎉 Report Submitted Successfully!</h2>
                        <p className="success-hero-text">
                            Thank you for being an active citizen and helping improve our city!
                        </p>

                        {/* AI Detection Result */}
                        <div className="ai-detection-section">
                            <div className="ai-badge">
                                <span className="ai-icon">🤖</span>
                                <span>AI Analysis Complete</span>
                            </div>

                            <div className="detection-result-card">
                                <div className="detection-header">
                                    <span className="detection-label">Detected Issue Type:</span>
                                    <span className="detection-confidence">High Confidence</span>
                                </div>
                                <div className="detected-issue-display">
                                    <span className="issue-emoji">{detectedIssue?.includes('Pothole') ? '📍' : detectedIssue?.includes('Vehicle') ? '🚗' : detectedIssue?.includes('Tree') ? '🌳' : detectedIssue?.includes('Flood') ? '🌊' : '🏙️'}</span>
                                    <span className="issue-text">{detectedIssue || "Infrastructure Anomaly"}</span>
                                </div>
                                <div className="detection-info">
                                    <Info size={16} />
                                    <span>Our Neural AI has analyzed your submission and classified the issue</span>
                                </div>
                            </div>
                        </div>

                        {/* Next Steps */}
                        <div className="next-steps-section">
                            <h3 className="next-steps-title">What Happens Next?</h3>
                            <div className="steps-grid">
                                <div className="step-card">
                                    <div className="step-number">1</div>
                                    <div className="step-content">
                                        <strong>Review Process</strong>
                                        <span>City administrators will review your report within 24-48 hours</span>
                                    </div>
                                </div>
                                <div className="step-card">
                                    <div className="step-number">2</div>
                                    <div className="step-content">
                                        <strong>Assessment</strong>
                                        <span>Technical team will assess the severity and required resources</span>
                                    </div>
                                </div>
                                <div className="step-card">
                                    <div className="step-number">3</div>
                                    <div className="step-content">
                                        <strong>Action</strong>
                                        <span>Maintenance crew will be dispatched to resolve the issue</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Reference Info */}
                        <div className="reference-info">
                            <div className="info-row">
                                <Calendar size={16} />
                                <span>Submitted: {new Date().toLocaleString()}</span>
                            </div>
                            <div className="info-row">
                                <CheckCircle size={16} />
                                <span>Status: <strong>Pending Review</strong></span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="success-actions">
                            <button className="btn btn-primary btn-large" onClick={() => { setSuccess(false); resetForm(); }}>
                                Report Another Issue
                            </button>
                            <button className="btn btn-ghost btn-large" onClick={onReturn || (() => window.location.href = '/')}>
                                Return to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="report-page animate-in">
                    <div className="section-header" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2 className="section-title">Public Help Desk</h2>
                            <p className="section-subtitle" style={{ marginBottom: 0 }}>Help us improve the city. Upload an image of the problem and our AI will analyze it.</p>
                        </div>
                        <button type="button" className="dash-action-btn secondary" onClick={handleExportDatabase} title="Export full database to CSV" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '10px', height: 'fit-content' }}>
                            <Download size={18} /><span>Master Export</span>
                        </button>
                    </div>

                    <div className="report-grid">
                        {/* LEFT COLUMN: UPLOAD */}
                        <div className="upload-column">
                            <div
                                className={`image-upload-zone premium-zone ${dragActive ? 'drag-active' : ''} ${file || webcamActive ? 'has-file' : ''}`}
                                onClick={() => !webcamActive && fileInputRef.current?.click()}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                            >
                                {webcamActive ? (
                                    <div className="webcam-container" onClick={(e) => e.stopPropagation()} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#000', borderRadius: '18px', overflow: 'hidden', position: 'absolute', inset: 0 }}>
                                        <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <div style={{ position: 'absolute', bottom: '20px', display: 'flex', gap: '16px', zIndex: 10 }}>
                                            <button type="button" className="btn btn-primary" onClick={capturePhoto} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '30px', fontWeight: 'bold' }}>
                                                <Camera size={18} /> Capture
                                            </button>
                                            <button type="button" className="btn btn-ghost" onClick={stopWebcam} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '30px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : preview ? (
                                    <div className="preview-container">
                                        <img src={preview} alt="Preview" className="upload-preview" />
                                        <button className="remove-file-btn" onClick={(e) => { e.stopPropagation(); removeFile(); }}>
                                            <X size={20} />
                                        </button>
                                        <div className="preview-overlay">
                                            <Camera size={24} />
                                            <span>Change Photo</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="upload-placeholder">
                                        <div className="upload-icon-ring"><Upload size={32} /></div>
                                        <h3>Capture or Upload Evidence</h3>
                                        <p>Drag & drop, click to browse, or capture</p>
                                        <button type="button" className="btn btn-ghost" onClick={startWebcam} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '8px', fontSize: '0.85rem', marginTop: '10px' }}>
                                            <Video size={16} /> Open Web Camera
                                        </button>
                                        <p className="upload-hint">Supports: JPG, PNG (Max 10MB)</p>
                                    </div>
                                )}
                                <input
                                    ref={fileInputRef}
                                    id="image-upload"
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handleFileChange}
                                    style={{ display: 'none' }}
                                />
                            </div>

                            {errors.file && (
                                <div className="error-message">
                                    <AlertCircle size={16} />
                                    <span>{errors.file}</span>
                                </div>
                            )}

                            <div className="info-box">
                                <Info size={16} className="info-icon" />
                                <p>Our AI will automatically scan the uploaded image to classify severity and detect common anomalies.</p>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: FORM DETAILS */}
                        <div className="form-column">
                            <form onSubmit={handleSubmit} className="report-form">
                                <div className="form-group">
                                    <label>Exact Location <span className="required">*</span></label>
                                    <div className="location-input-group">
                                        <div className="input-with-icon" style={{ flex: 1 }}>
                                            <MapPin size={18} className="input-icon" />
                                            <input
                                                type="text"
                                                placeholder="Street name, landmark, or coordinates"
                                                value={location}
                                                onChange={(e) => setLocation(e.target.value)}
                                                className={errors.location ? 'input-error' : ''}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            className="btn btn-ghost loc-btn"
                                            onClick={handleGetLocation}
                                            disabled={locating}
                                            title="Use my current GPS location"
                                        >
                                            {locating ? <Loader size={18} className="spinner-icon" /> : <Navigation size={18} />}
                                            <span className="loc-text">Locate Me</span>
                                        </button>
                                    </div>
                                    {errors.location && (
                                        <div className="error-message small">
                                            <AlertCircle size={14} />
                                            <span>{errors.location}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label>Issue Category <span className="required">*</span></label>
                                    <div className="category-chips">
                                        {CATEGORIES.map(cat => (
                                            <button
                                                type="button"
                                                key={cat.id}
                                                className={`cat-chip ${selectedCategory === cat.id ? 'selected' : ''}`}
                                                onClick={() => handleCategoryClick(cat.id)}
                                            >
                                                <span className="chip-icon">{cat.icon}</span>
                                                {cat.label}
                                            </button>
                                        ))}
                                    </div>
                                    {errors.category && (
                                        <div className="error-message small">
                                            <AlertCircle size={14} />
                                            <span>{errors.category}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <label>Detailed Description <span className="required">*</span></label>
                                    <textarea
                                        placeholder="Briefly describe the issue, its severity, and any landmarks... (minimum 10 characters)"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className={errors.description ? 'input-error' : ''}
                                        style={{ flex: 1, minHeight: '120px', resize: 'vertical' }}
                                    ></textarea>
                                    {errors.description && (
                                        <div className="error-message small">
                                            <AlertCircle size={14} />
                                            <span>{errors.description}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="form-submit-row">
                                    <button type="submit" className="btn btn-premium btn-submit" disabled={loading}>
                                        {loading ? (
                                            <span className="flex-center gap-2">
                                                <Loader size={18} className="spinner-icon" /> Processing with Neural AI...
                                            </span>
                                        ) : (
                                            <span className="flex-center gap-2">
                                                <Send size={18} /> Submit Issue Report
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .section-title {
                    font-size: 2.25rem;
                    font-weight: 800;
                    margin-bottom: 4px;
                    color: var(--text-main);
                    letter-spacing: -0.01em;
                }
                .section-subtitle {
                    font-size: 1.1rem;
                    color: var(--text-muted);
                    margin-bottom: 24px;
                }

            .report-page {
                    min-height: 100%;
                    display: flex;
                    flex-direction: column;
                    padding: 24px;
                    padding-bottom: 40px;
                    box-sizing: border-box;
                    max-width: 1200px;
                    margin: 0 auto;
                    width: 100%;
                }
                
                .report-grid {
                    display: grid;
                    grid-template-columns: 1fr 1.2fr;
                    gap: 32px;
                    flex: 1;
                    min-height: 0;
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 24px;
                    padding: 32px;
                    box-shadow: var(--shadow-lg);
                }

                @media (max-width: 900px) {
                    .report-grid {
                        grid-template-columns: 1fr;
                        overflow-y: auto;
                        padding: 24px;
                    }
                    .report-page { padding: 16px; }
                }

                /* Left Column: Image */
                .upload-column {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }

                .image-upload-zone.premium-zone {
                    flex: 1;
                    min-height: 300px;
                    border: 2px dashed rgba(59, 130, 246, 0.4);
                    border-radius: 20px;
                    background: var(--bg-card-solid);
                    position: relative;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    cursor: pointer;
                }

                .image-upload-zone.premium-zone.drag-active {
                    border-color: var(--primary);
                    background: var(--primary-glow);
                    transform: scale(1.02);
                    box-shadow: 0 15px 40px rgba(59, 130, 246, 0.2);
                }

                .image-upload-zone.premium-zone:hover {
                    border-color: var(--primary);
                    background: var(--primary-glow);
                    transform: translateY(-2px);
                    box-shadow: 0 10px 30px rgba(59, 130, 246, 0.1);
                }

                .upload-placeholder {
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    gap: 16px;
                    padding: 20px;
                }

                .upload-icon-ring {
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    background: var(--bg-hover);
                    color: var(--primary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    transition: all 0.3s;
                }

                .image-upload-zone:hover .upload-icon-ring {
                    transform: scale(1.1) rotate(5deg);
                    background: var(--primary);
                    color: white;
                }

                .upload-placeholder h3 {
                    font-size: 1.125rem;
                    color: var(--text-main);
                    margin: 0;
                    font-weight: 700;
                }
                .upload-placeholder p {
                    font-size: 0.9rem;
                    color: var(--text-muted);
                    margin: 0;
                }
                .upload-hint {
                    font-size: 0.8rem !important;
                    color: var(--text-secondary) !important;
                    margin-top: 4px !important;
                }

                .preview-container {
                    width: 100%;
                    height: 100%;
                    position: relative;
                    border-radius: 18px;
                    overflow: hidden;
                }
                .upload-preview {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                    background: #000;
                }
                .remove-file-btn {
                    position: absolute;
                    top: 12px;
                    right: 12px;
                    background: rgba(239, 68, 68, 0.95);
                    color: white;
                    border: none;
                    border-radius: 50%;
                    width: 36px;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    z-index: 10;
                    backdrop-filter: blur(4px);
                }
                .remove-file-btn:hover {
                    background: rgba(220, 38, 38, 1);
                    transform: scale(1.1);
                }
                .preview-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(0,0,0,0.6);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    color: white;
                    opacity: 0;
                    transition: opacity 0.2s;
                    backdrop-filter: blur(4px);
                }
                .image-upload-zone:hover .preview-overlay {
                    opacity: 1;
                }

                .error-message {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 14px;
                    background: rgba(239, 68, 68, 0.08);
                    border-left: 3px solid rgba(239, 68, 68, 0.6);
                    border-radius: 8px;
                    color: rgba(239, 68, 68, 0.9);
                    font-size: 0.85rem;
                    animation: slideIn 0.3s ease;
                }
                .error-message.small {
                    padding: 6px 10px;
                    font-size: 0.8rem;
                    margin-top: 6px;
                }
                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(-5px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .info-box {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    padding: 16px;
                    background: rgba(59, 130, 246, 0.08);
                    border-left: 4px solid var(--primary);
                    border-radius: 8px;
                }
                .info-icon {
                    color: var(--primary);
                    flex-shrink: 0;
                    margin-top: 2px;
                }
                .info-box p {
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                    margin: 0;
                    line-height: 1.5;
                }

                /* Right Column: Form */
                .form-column {
                    display: flex;
                    flex-direction: column;
                }
                
                .report-form {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    gap: 24px;
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .form-group label {
                    font-weight: 700;
                    font-size: 0.9rem;
                    color: var(--text-main);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .required {
                    color: rgba(239, 68, 68, 0.8);
                    font-size: 1rem;
                }

                .location-input-group {
                    display: flex;
                    gap: 12px;
                }
                
                .btn-ghost {
                    background: var(--bg-hover);
                    border: 1px solid var(--border);
                    color: var(--text-primary);
                }
                .btn-ghost:hover:not(:disabled) {
                    background: var(--primary-glow);
                    border-color: var(--primary);
                    color: var(--primary);
                }
                .loc-btn {
                    padding: 0 20px;
                }
                .spinner-icon {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                @media (max-width: 600px) {
                    .loc-text { display: none; }
                    .loc-btn { padding: 0 16px; }
                }

                .input-with-icon { position: relative; }
                .input-icon {
                    position: absolute;
                    left: 14px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--text-muted);
                }
                .input-with-icon input { padding-left: 44px; }
                .input-with-icon input,
                textarea {
                    transition: all 0.2s;
                }
                .input-with-icon input:focus,
                textarea:focus {
                    outline: none;
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }
                .input-error {
                    border-color: rgba(239, 68, 68, 0.6) !important;
                    background: rgba(239, 68, 68, 0.02) !important;
                }
                .input-error:focus {
                    border-color: rgba(239, 68, 68, 0.8) !important;
                    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
                }

                .category-chips {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
                    gap: 10px;
                }
                .cat-chip {
                    background: var(--bg-hover);
                    border: 1px solid var(--border);
                    color: var(--text-secondary);
                    padding: 10px 16px;
                    border-radius: 12px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    text-align: left;
                }
                .chip-icon {
                    font-size: 1.1rem;
                }
                .cat-chip:hover {
                    background: var(--primary-glow);
                    border-color: var(--primary);
                    color: var(--primary);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
                }
                .cat-chip.selected {
                    background: var(--primary);
                    border-color: var(--primary);
                    color: white;
                    box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
                }

                .form-submit-row {
                    margin-top: auto;
                    padding-top: 24px;
                }
                .btn-submit {
                    padding: 16px;
                    font-size: 1.05rem;
                    border-radius: 16px;
                    font-weight: 700;
                    transition: all 0.3s;
                }
                .btn-submit:not(:disabled):hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 24px rgba(59, 130, 246, 0.3);
                }
                .btn-submit:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }

                /* ═══════════════════════════════════════════════════
                   SUCCESS SCREEN: LIGHT/DARK THEME REWORK
                   ═══════════════════════════════════════════════════ */
                .report-success-container {
                    min-height: calc(100vh - 80px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 40px 24px;
                    background: radial-gradient(circle at center, rgba(59, 130, 246, 0.05) 0%, transparent 70%);
                }

                .report-success-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 24px;
                    padding: 40px;
                    max-width: 550px;
                    width: 100%;
                    box-shadow: var(--shadow-lg);
                    text-align: center;
                    position: relative;
                    animation: cardSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
                }

                @keyframes cardSlideUp {
                    from { opacity: 0; transform: translateY(30px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }

                /* Success Animation Engine */
                .success-animation-wrapper {
                    position: relative;
                    display: inline-block;
                    margin-bottom: 24px;
                }

                .success-icon-wrapper {
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #10b981, #3b82f6);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    box-shadow: 0 8px 24px rgba(16, 185, 129, 0.25);
                    position: relative;
                    z-index: 2;
                    animation: iconPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }

                @keyframes iconPop {
                    0% { transform: scale(0); rotate: -45deg; }
                    100% { transform: scale(1); rotate: 0; }
                }

                .success-main-title {
                    font-size: 1.8rem;
                    font-weight: 850;
                    margin: 0 0 12px 0;
                    color: var(--text-main);
                }

                .success-hero-text {
                    font-size: 1rem;
                    color: var(--text-secondary);
                    margin: 0 0 32px 0;
                    line-height: 1.5;
                }

                /* AI Analysis Readout */
                .ai-detection-section {
                    background: var(--bg-body);
                    border: 1px solid rgba(139, 92, 246, 0.2);
                    border-radius: 20px;
                    padding: 20px;
                    margin-bottom: 32px;
                    position: relative;
                }

                .ai-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    background: rgba(139, 92, 246, 0.1);
                    border: 1px solid rgba(139, 92, 246, 0.2);
                    color: #8b5cf6;
                    padding: 6px 14px;
                    border-radius: 10px;
                    font-weight: 700;
                    font-size: 0.7rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    margin-bottom: 16px;
                }

                .detection-result-card {
                    background: var(--bg-hover);
                    border-radius: 12px;
                    padding: 16px;
                    text-align: left;
                    border: 1px solid var(--border);
                }

                .detection-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 12px;
                }

                .detection-label { font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; }
                .detection-confidence { color: #10b981; font-weight: 800; font-size: 0.75rem; }

                .detected-issue-display {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 12px;
                }

                .issue-emoji { font-size: 2rem; }
                .issue-text { font-size: 1.4rem; font-weight: 800; color: var(--text-main); }

                .detection-info {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 14px;
                    background: var(--bg-body);
                    border-radius: 8px;
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                }

                /* Next Steps Roadmap */
                .next-steps-section { text-align: left; margin-bottom: 32px; }
                .next-steps-title { font-size: 1.15rem; font-weight: 800; color: var(--text-main); margin-bottom: 20px; }

                .steps-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 16px;
                }

                .step-card {
                    background: var(--bg-hover);
                    border: 1px solid var(--border);
                    border-radius: 16px;
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    transition: all 0.2s;
                }

                .step-number {
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    background: var(--primary);
                    color: white;
                    font-weight: 800;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.9rem;
                }

                .step-content strong { display: block; color: var(--text-main); font-size: 0.85rem; margin-bottom: 4px; }
                .step-content span { font-size: 0.75rem; color: var(--text-secondary); line-height: 1.4; }

                /* Reference Footer */
                .reference-info {
                    display: flex;
                    justify-content: center;
                    gap: 20px;
                    padding: 16px;
                    background: var(--bg-hover);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    margin-bottom: 32px;
                }

                .info-row { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: var(--text-muted); }
                .info-row strong { color: var(--text-main); }

                /* Button Grid */
                .success-actions { display: flex; flex-direction: column; gap: 12px; }
                .btn-large { padding: 14px; border-radius: 12px; font-weight: 700; font-size: 0.9rem; width: 100%; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
                
                .btn-primary { 
                    background: var(--primary); 
                    color: white; 
                    box-shadow: 0 4px 14px rgba(59, 130, 246, 0.25); 
                }
                .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(59, 130, 246, 0.35); }
                
                .btn-ghost { 
                    background: var(--bg-hover); 
                    border: 1px solid var(--border); 
                    color: var(--text-primary);
                }
                .btn-ghost:hover { background: var(--border); color: var(--text-main); }

                /* Core Utilities */
                .animate-in { animation: fadeIn 0.8s ease-out; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

                @media (max-width: 800px) {
                    .steps-grid { grid-template-columns: 1fr; }
                    .report-success-card { padding: 40px 24px; }
                    .success-actions { flex-direction: column; }
                    .success-main-title { font-size: 1.75rem; }
                }

                .flex-center { display: flex; align-items: center; justify-content: center; }
                .gap-2 { gap: 8px; }
            `}</style>
        </>
    );
};

export default ReportIssue;
