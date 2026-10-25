import React, { useState, useRef } from "react";
import {
    Camera,
    Scan,
    FileText,
    Map as MapIcon,
    ArrowRight,
    Sparkles,
    CheckCircle2,
    Zap,
    ShieldCheck,
    Play,
    Clock,
    AlertCircle,
    Film,
    UploadCloud,
    Link as LinkIcon,
    RotateCcw
} from "lucide-react";
import "./EditorialHome.css";

interface EditorialHomeProps {
    setActiveTab: (tab: string) => void;
}

const EditorialHome: React.FC<EditorialHomeProps> = ({ setActiveTab }) => {
    // Video State: can be local object URL, public video path, or custom web link
    const [videoSrc, setVideoSrc] = useState<string>("");
    const [videoTitle, setVideoTitle] = useState<string>("Smart-Infra AI Explanation & Walkthrough");
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [urlInputVal, setUrlInputVal] = useState("");
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setVideoSrc(url);
            setVideoTitle(file.name);
            setShowUrlInput(false);
        }
    };

    const handleApplyUrl = (e: React.FormEvent) => {
        e.preventDefault();
        if (urlInputVal.trim()) {
            setVideoSrc(urlInputVal.trim());
            setVideoTitle("Online Video Walkthrough");
            setShowUrlInput(false);
        }
    };

    const handleResetVideo = () => {
        setVideoSrc("");
        setVideoTitle("Smart-Infra AI Explanation & Walkthrough");
        setUrlInputVal("");
        setShowUrlInput(false);
    };

    return (
        <div className="simple-home-root">
            {/* Ambient Background Glows */}
            <div className="ambient-blob blob-blue" />
            <div className="ambient-blob blob-purple" />
            <div className="ambient-blob blob-green" />

            {/* Hidden File Input for Video Upload */}
            <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/ogg,video/quicktime"
                style={{ display: "none" }}
                onChange={handleFileSelect}
            />

            {/* ── TOP HERO BANNER ── */}
            <header className="simple-hero">
                <h1 className="hero-heading">
                    Make Roads Safer, <br />
                    <span className="animated-gradient-text">One Click at a Time.</span>
                </h1>

                <p className="hero-subtext">
                    Smart-Infra AI uses smart camera scanning to detect potholes, find road damage, and help your city fix them faster. Simple, fast, and completely free to use.
                </p>

                {/* Live Quick Stats */}
                <div className="stats-pill-grid">
                    <div className="stat-pill">
                        <Zap size={18} className="pill-icon text-cyan" />
                        <div>
                            <strong>Instant</strong>
                            <span>Live Camera AI</span>
                        </div>
                    </div>
                    <div className="stat-pill">
                        <CheckCircle2 size={18} className="pill-icon text-green" />
                        <div>
                            <strong>99% Accuracy</strong>
                            <span>Potholes & Cracks</span>
                        </div>
                    </div>
                    <div className="stat-pill">
                        <Clock size={18} className="pill-icon text-purple" />
                        <div>
                            <strong>Real-Time</strong>
                            <span>Repair Tracking</span>
                        </div>
                    </div>
                    <div className="stat-pill">
                        <ShieldCheck size={18} className="pill-icon text-orange" />
                        <div>
                            <strong>Community</strong>
                            <span>Safer Travel</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* ── VIDEO FRAME SECTION (REPLACED 3D WITH DEDICATED FRAME) ── */}
            <section className="video-frame-section">
                <div className="video-outer-card">
                    <div className="video-card-header">
                        <div className="video-title-group">
                            <span className="live-ping-dot" />
                            <h3>{videoTitle}</h3>
                        </div>

                        {videoSrc && (
                            <button
                                className="change-video-btn"
                                onClick={handleResetVideo}
                                type="button"
                                title="Change or remove current video"
                            >
                                <RotateCcw size={14} />
                                <span>Change Video</span>
                            </button>
                        )}
                    </div>

                    {/* 16:9 Video Frame */}
                    <div className="video-screen-frame">
                        {videoSrc ? (
                            <video
                                ref={videoRef}
                                src={videoSrc}
                                controls
                                autoPlay
                                className="html-video-player"
                            >
                                Your browser does not support the video tag.
                            </video>
                        ) : (
                            <div className="video-placeholder-box">
                                <div className="video-play-ring" onClick={() => fileInputRef.current?.click()}>
                                    <Play size={42} className="play-triangle-icon" />
                                </div>

                                <h4>Explanation & Demo Video</h4>
                                <p>
                                    Watch how this application works!
                                </p>

                                <div className="video-cta-group">
                                    <button
                                        className="btn-upload-video"
                                        onClick={() => fileInputRef.current?.click()}
                                        type="button"
                                    >
                                        <UploadCloud size={16} />
                                        <span>Upload Video File (MP4 / WebM)</span>
                                    </button>

                                    <button
                                        className="btn-link-video"
                                        onClick={() => setShowUrlInput(!showUrlInput)}
                                        type="button"
                                    >
                                        <LinkIcon size={16} />
                                        <span>{showUrlInput ? "Hide Link Input" : "Paste Video URL"}</span>
                                    </button>
                                </div>

                                {showUrlInput && (
                                    <form onSubmit={handleApplyUrl} className="url-form-row">
                                        <input
                                            type="url"
                                            placeholder="Paste video link (e.g., https://example.com/demo.mp4)"
                                            value={urlInputVal}
                                            onChange={(e) => setUrlInputVal(e.target.value)}
                                            className="url-input-field"
                                            required
                                        />
                                        <button type="submit" className="url-btn-apply">Play Video</button>
                                    </form>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* ── 4 SIMPLE STEPS (HOW TO USE) ── */}
            <section className="steps-section">
                <div className="steps-header">
                    <h2>How It Works In 4 Simple Steps</h2>
                    <p>Anyone can use this app to spot damage and keep their neighborhood roads safe.</p>
                </div>

                <div className="simple-cards-grid">
                    {/* Step 1 */}
                    <div className="animated-action-card card-blue" onClick={() => setActiveTab("Webcam")}>
                        <div className="card-step-chip">STEP 1</div>
                        <div className="card-icon-circle bg-blue">
                            <Camera size={26} />
                        </div>
                        <h3>1. Open Live Camera</h3>
                        <p>Turn on your laptop webcam, phone camera, or dashcam to scan the road in real-time as you drive or walk.</p>
                        <div className="card-cta">
                            <span>Open Camera</span>
                            <ArrowRight size={16} className="cta-arrow" />
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="animated-action-card card-purple" onClick={() => setActiveTab("Scanner")}>
                        <div className="card-step-chip">STEP 2</div>
                        <div className="card-icon-circle bg-purple">
                            <Scan size={26} />
                        </div>
                        <h3>2. Upload Any Photo</h3>
                        <p>Already have photos or videos of potholes? Just drag and drop them here for instant AI detection.</p>
                        <div className="card-cta">
                            <span>Upload Photos</span>
                            <ArrowRight size={16} className="cta-arrow" />
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="animated-action-card card-orange" onClick={() => setActiveTab("Report")}>
                        <div className="card-step-chip">STEP 3</div>
                        <div className="card-icon-circle bg-orange">
                            <FileText size={26} />
                        </div>
                        <h3>3. Report Pothole</h3>
                        <p>Click once to save the location with GPS. Your report is sent directly to municipal road repair teams.</p>
                        <div className="card-cta">
                            <span>Report Issue</span>
                            <ArrowRight size={16} className="cta-arrow" />
                        </div>
                    </div>

                    {/* Step 4 */}
                    <div className="animated-action-card card-green" onClick={() => setActiveTab("Map")}>
                        <div className="card-step-chip">STEP 4</div>
                        <div className="card-icon-circle bg-green">
                            <MapIcon size={26} />
                        </div>
                        <h3>4. View Map & Track</h3>
                        <p>See where all road damage is located on a live interactive map and watch repair status updates.</p>
                        <div className="card-cta">
                            <span>View Live Map</span>
                            <ArrowRight size={16} className="cta-arrow" />
                        </div>
                    </div>
                </div>
            </section>

            {/* ── SIMPLE QUESTION / HELPFUL FAQ ── */}
            <section className="helpful-tips-section">
                <div className="tips-card">
                    <div className="tips-icon-wrap">
                        <AlertCircle size={28} />
                    </div>
                    <div className="tips-content">
                        <h3>Why was this app created?</h3>
                        <p>
                            Bad roads and sudden potholes cause thousands of accidents and vehicle repairs every day. Smart-Infra AI allows ordinary citizens and drivers to spot hazards automatically using AI, alerting cities before accidents happen.
                        </p>
                    </div>
                    <button className="tips-btn" onClick={() => setActiveTab("Scanner")}>
                        <span>Try Scanner Now</span>
                        <ArrowRight size={16} />
                    </button>
                </div>
            </section>
        </div>
    );
};

export default EditorialHome;
