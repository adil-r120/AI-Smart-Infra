import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Sidebar from "../components/Sidebar";
import StatsGrid from "../components/StatsGrid";
import AiScanner from "../components/AiScanner";
import MonitoringMap from "../components/MonitoringMap";
import AiConfig from "../components/AiConfig";
import DetectionLog from "../components/DetectionLog";
import AnalyticsSection from "../components/AnalyticsSection";
import AdminConsole from "../components/AdminConsole";
import ReportIssue from "./ReportIssue";
import IntelligenceHub from "../components/IntelligenceHub";
import { Detection, DetectionResult, DBEntry, Stats } from "../types";
import { AlertTriangle, X, Activity, Camera, Database, Sun, Moon, RefreshCw, ShieldAlert, Scan, Download, Eye, Crosshair, Radio, Zap, Maximize, Minimize, Trash2, WifiOff, Shield, Bell } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";
import { API_BASE } from "../api/config";
import "./Dashboard.css";

const CLASS_BOX_COLORS = new Map<string, string>([
    ["pothole", "#f97316"],
    ["car", "#38bdf8"],
    ["truck", "#38bdf8"],
    ["bus", "#38bdf8"],
    ["motorcycle", "#38bdf8"],
    ["person", "#a78bfa"],
]);

const DANGER_CLASSES = new Set(["gun", "weapon", "knife", "Scissors", "pistol", "violence", "danger"]);
const PRIVACY_CLASSES = new Set(["person", "car", "motorcycle", "bus", "truck", "face"]);



const Dashboard: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [result, setResult] = useState<DetectionResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState(() => {
        const saved = localStorage.getItem("si_active_tab");
        const validTabs = ["Home", "Map", "History", "Admin", "Report", "Configuration", "Webcam"];
        return (saved && validTabs.includes(saved)) ? saved : "Home";
    });

    useEffect(() => {
        localStorage.setItem("si_active_tab", activeTab);
    }, [activeTab]);

    const [stats, setStats] = useState<Stats | null>(null);
    const [mapData, setMapData] = useState<DBEntry[]>([]);
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraSource, setCameraSource] = useState<string>(() => localStorage.getItem("si_camera_source") || "");
    const [theme, setTheme] = useState<"dark" | "light">(
        () => (localStorage.getItem("si_theme") as "dark" | "light") || "light"
    );
    const [isDragging, setIsDragging] = useState(false);
    const [scannerStatus, setScannerStatus] = useState<string | null>(null);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [dashRefreshing, setDashRefreshing] = useState(false);
    const [webcamPlaying, setWebcamPlaying] = useState(false);
    const [visualMode, setVisualMode] = useState<"Normal" | "Thermal" | "Infrared" | "Neural">("Normal");
    const [detectionHistory, setDetectionHistory] = useState<Detection[]>([]);
    const [snapshotDataUrl, setSnapshotDataUrl] = useState<string | null>(null);
    const [frameCount, setFrameCount] = useState(0);
    const [webcamTime, setWebcamTime] = useState("00:00");
    const [webcamError, setWebcamError] = useState<string | null>(null);
    const [ipCamActive, setIpCamActive] = useState(false);
    // ⚑ Ref mirrors ipCamActive so polling closures always read the live value
    const ipCamActiveRef = useRef(false);
    const [pollInterval, setPollInterval] = useState<1000 | 2000 | 5000>(2000);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [privacyMode, setPrivacyMode] = useState(() => localStorage.getItem("si_privacy_mode") === "true");
    const [sessionStats, setSessionStats] = useState({ potholes: 0, vehicles: 0, people: 0 });
    const webcamTimerRef = useRef<any>(null);
    const webcamSecondsRef = useRef(0);
    const webcamContainerRef = useRef<HTMLDivElement>(null);

    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const ipCamImgRef = useRef<HTMLImageElement>(null);
    const webcamStreamRef = useRef<MediaStream | null>(null);
    const webcamCanvasRef = useRef<HTMLCanvasElement>(null);

    const getAuthConfig = () => {
        const token = localStorage.getItem("si_token");
        return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    };

    const fetchStats = async () => {
        try {
            const cfg = getAuthConfig();
            const res = await axios.get(`${API_BASE}/stats`, cfg);
            setStats(res.data);
        } catch (err) { console.error("Stats fetch failed", err); }
    };

    const fetchMapData = async () => {
        try {
            const cfg = getAuthConfig();
            const res = await axios.get(`${API_BASE}/map-data`, cfg);
            setMapData(res.data);
        } catch { console.error("Map data fetch failed"); }
    };

    const [showNotifications, setShowNotifications] = useState(false);

    const dismissedAlertsRef = useRef<Set<number>>(new Set());

    const fetchAlerts = async () => {
        try {
            const res = await axios.get(`${API_BASE}/alerts`, getAuthConfig());
            setAlerts(prev => {
                const newAlerts = res.data.filter((a: any) =>
                    !prev.some(p => p.id === a.id) && !dismissedAlertsRef.current.has(a.id)
                );
                // Keep more history in the dropdown
                return [...newAlerts, ...prev].slice(0, 10);
            });
        } catch (err) {
        }
    };

    const handleDismissAlert = (id: number) => {
        dismissedAlertsRef.current.add(id);
        setAlerts(prev => prev.filter(a => a.id !== id));
    };

    const handleClearAllAlerts = () => {
        alerts.forEach(a => dismissedAlertsRef.current.add(a.id));
        setAlerts([]);
        setShowNotifications(false);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (showNotifications && !target.closest('.notifications-dropdown') && !target.closest('.theme-toggle-compact')) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showNotifications]);

    useEffect(() => {
        localStorage.setItem("si_theme", theme);
    }, [theme]);

    useEffect(() => {
        localStorage.setItem("si_privacy_mode", String(privacyMode));
    }, [privacyMode]);

    useEffect(() => {
        localStorage.setItem("si_camera_source", cameraSource);
    }, [cameraSource]);

    useEffect(() => {
        fetchStats(); fetchMapData(); fetchAlerts();

        const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${wsProtocol}//${window.location.hostname}:8000/ws`;
        const socket = new WebSocket(wsUrl);

        socket.onopen = () => console.log("[WS] Connected to Smart-Infra Backend");
        socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === "new_detection") {
                    fetchStats(); fetchMapData(); fetchAlerts();
                }
            } catch (err) { console.error("[WS] Message parsing error", err); }
        };

        const interval = setInterval(() => {
            fetchStats(); fetchAlerts(); fetchMapData();
        }, 30000);

        return () => {
            clearInterval(interval);
            if (socket.readyState === WebSocket.CONNECTING) {
                socket.onopen = () => socket.close();
            } else {
                socket.close();
            }
        };
    }, []);

    const drawDetections = () => {
        const canvas = canvasRef.current;
        const img = imageRef.current;
        if (!canvas || !img || !result) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        console.log("[SCANNER] Drawing detections:", result);

        // Set canvas internal resolution to match the element size
        canvas.width = img.clientWidth;
        canvas.height = img.clientHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (img.naturalWidth === 0 || img.naturalHeight === 0) {
            console.warn("[SCANNER] Image natural dimensions not ready");
            return;
        }

        const naturalRatio = img.naturalWidth / img.naturalHeight;
        const containerRatio = img.clientWidth / img.clientHeight;
        let renderedW, renderedH;

        if (naturalRatio > containerRatio) {
            renderedW = img.clientWidth;
            renderedH = img.clientWidth / naturalRatio;
        } else {
            renderedH = img.clientHeight;
            renderedW = img.clientHeight * naturalRatio;
        }

        const offsetX = (img.clientWidth - renderedW) / 2;
        const offsetY = (img.clientHeight - renderedH) / 2;
        const scaleX = renderedW / img.naturalWidth;
        const scaleY = renderedH / img.naturalHeight;

        const allDets: Detection[] = [...(result.potholes ?? []), ...(result.objects ?? [])];

        if (allDets.length === 0) {
            console.log("[SCANNER] No objects detected to draw.");
        }

        allDets.forEach((det: Detection) => {
            const [x1, y1, x2, y2] = det.bbox;
            const rx1 = x1 * scaleX + offsetX;
            const ry1 = y1 * scaleY + offsetY;
            const rw = (x2 - x1) * scaleX;
            const rh = (y2 - y1) * scaleY;
            const color = CLASS_BOX_COLORS.get(det.class) || "#f97316";
            const label = `${det.class.toUpperCase()} (${Math.round(det.confidence * 100)}%)`;

            console.log(`[SCANNER] Rendering ${det.class} at [${rx1}, ${ry1}, ${rw}, ${rh}]`);

            if (privacyMode && PRIVACY_CLASSES.has(det.class.toLowerCase())) {
                ctx.save();
                ctx.beginPath();
                ctx.rect(rx1, ry1, rw, rh);
                ctx.clip();
                ctx.filter = 'blur(15px)';
                ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, offsetX, offsetY, renderedW, renderedH);
                ctx.restore();
                ctx.fillStyle = "rgba(0,0,0,0.4)";
                ctx.fillRect(rx1, ry1, rw, rh);
            }

            ctx.strokeStyle = color;
            ctx.lineWidth = 5;
            ctx.lineJoin = "round";
            ctx.strokeRect(rx1, ry1, rw, rh);

            // Premium Label Drawing
            const fontSize = 10;
            ctx.font = `bold ${fontSize}px 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
            const textContent = label;
            const textMetrics = ctx.measureText(textContent);
            const textWidth = textMetrics.width;
            const labelPaddingX = 6;
            const labelPaddingY = 4;
            const labelHeight = fontSize + (labelPaddingY * 2);

            // Draw label background pill
            ctx.fillStyle = color;
            const labelY = ry1 - labelHeight < 0 ? ry1 : ry1 - labelHeight;

            // Create a rounded rectangle for the label
            ctx.beginPath();
            const radius = 3;
            ctx.roundRect(rx1, labelY, textWidth + (labelPaddingX * 2), labelHeight, radius);
            ctx.fill();

            // Draw label text
            ctx.fillStyle = "white";
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillText(textContent, rx1 + labelPaddingX, labelY + labelPaddingY);
        });
    };

    useEffect(() => {
        if (result) {
            drawDetections();
            setTimeout(drawDetections, 100);
            setTimeout(drawDetections, 500);
        }
    }, [result]);

    const startDetection = async (targetFile?: File) => {
        const fileToUpload = targetFile || file;
        if (!fileToUpload) return;
        setLoading(true);
        setScannerStatus("Analyzing Image...");
        const formData = new FormData();
        formData.append("file", fileToUpload);
        try {
            const response = await axios.post(`${API_BASE}/detect`, formData, getAuthConfig());
            if (response.data.error) {
                setScannerStatus(`Error: ${response.data.error}`);
            } else {
                setResult(response.data);
                setScannerStatus("Scan Complete");

                // Optimistic stats update
                const phs = (response.data.potholes ?? []);
                const objs = (response.data.objects ?? []);
                const count = phs.length + objs.length;

                if (count > 0) {
                    const cars = objs.filter((d: Detection) => d.class.toLowerCase() === 'car').length;
                    const trucks = objs.filter((d: Detection) => d.class.toLowerCase() === 'truck' || d.class.toLowerCase() === 'bus').length;
                    const bikes = objs.filter((d: Detection) => d.class.toLowerCase() === 'motorcycle' || d.class.toLowerCase() === 'bicycle').length;
                    const people = objs.filter((d: Detection) => d.class.toLowerCase() === 'person').length;
                    const danger = objs.filter((d: Detection) => d.is_danger).length;

                    setStats(prev => {
                        if (!prev) return prev;
                        const now = new Date();
                        const hourKey = `${String(now.getHours()).padStart(2, '0')}:00`;
                        const newHourly = { ...prev.hourly_stats };
                        newHourly[hourKey] = (newHourly[hourKey] || 0) + count;

                        // Dynamic Health Score: 100 - (potholes * 5), min 0
                        const phCount = phs.length;
                        const healthImpact = phCount * 5;
                        const newHealth = Math.max(0, 100 - healthImpact);

                        return {
                            ...prev,
                            total_potholes: prev.total_potholes + phCount,
                            total_cars: prev.total_cars + cars,
                            total_trucks: prev.total_trucks + trucks,
                            total_bikes: prev.total_bikes + bikes,
                            total_people: prev.total_people + people,
                            total_danger: prev.total_danger + danger,
                            total_detections: prev.total_detections + count,
                            road_health_score: newHealth,
                            hourly_stats: newHourly
                        };
                    });
                }
                fetchStats();
            }
        } catch (err: any) {
            console.error("[SCANNER] Request failed:", err);
            setScannerStatus(err.response?.status === 413 ? "File too large" : "Server Connection Error");
        }
        finally { setLoading(false); }
    };

    const handleRefresh = async () => {
        setDashRefreshing(true);
        try {
            await Promise.all([fetchStats(), fetchMapData(), fetchAlerts()]);
        } finally { setDashRefreshing(false); }
    };

    const processFile = async (selected: File) => {
        if (preview) URL.revokeObjectURL(preview);
        setFile(selected);
        setPreview(URL.createObjectURL(selected));
        setResult(null);
        await startDetection(selected);
    };

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) processFile(selected);
    };

    const handleCameraToggle = async () => {
        try {
            if (!cameraActive) {
                await axios.post(`${API_BASE}/start-camera?source=${cameraSource}`, null, getAuthConfig());
                setCameraActive(true);
                setWebcamPlaying(true);
                setActiveTab("Webcam");
            } else {
                await axios.post(`${API_BASE}/stop-camera`, null, getAuthConfig());
                setCameraActive(false);
                setWebcamPlaying(false);
            }
        } catch (err) { console.error(err); setWebcamPlaying(false); }
    };

    const startWebcam = async () => {
        try {
            if (cameraSource && cameraSource.startsWith("http")) {
                console.log("[WEBCAM] Starting IP Camera via direct URL...");
                ipCamActiveRef.current = true;
                setIpCamActive(true);
            } else {
                ipCamActiveRef.current = false;
                setIpCamActive(false);
                console.log("[WEBCAM] Requesting user media...");
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    webcamStreamRef.current = stream;
                    // Add a small delay for stable playing
                    setTimeout(() => {
                        videoRef.current?.play().catch(e => console.error("[WEBCAM] Play error:", e));
                    }, 100);
                    console.log("[WEBCAM] Stream active");
                }
            }
        } catch (err: any) {
            console.error("[WEBCAM] Permission or device error:", err);
            setWebcamPlaying(false);
            setWebcamError(
                err?.name === "NotAllowedError"
                    ? "Camera access denied. Please allow camera permissions in your browser and try again."
                    : err?.name === "NotFoundError"
                        ? "No camera device found. Please connect a camera and try again."
                        : "Unable to access camera. Ensure you are on localhost or HTTPS."
            );
        }
    };

    const stopWebcam = () => {
        if (webcamStreamRef.current) {
            webcamStreamRef.current.getTracks().forEach(track => track.stop());
            webcamStreamRef.current = null;
        }
        if (ipCamImgRef.current) {
            ipCamImgRef.current.src = "";
        }
        ipCamActiveRef.current = false;
        setIpCamActive(false);
        if (webcamTimerRef.current) clearInterval(webcamTimerRef.current);
        webcamSecondsRef.current = 0;
        setWebcamTime("00:00");
        setFrameCount(0);
    };

    const toggleFullscreen = () => {
        if (!webcamContainerRef.current) return;
        if (!document.fullscreenElement) {
            webcamContainerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => { });
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => { });
        }
    };

    const clearDetectionHistory = () => {
        setDetectionHistory([]);
        setSessionStats({ potholes: 0, vehicles: 0, people: 0 });
    };

    const startWebcamTimer = () => {
        if (webcamTimerRef.current) clearInterval(webcamTimerRef.current);
        webcamSecondsRef.current = 0;
        webcamTimerRef.current = setInterval(() => {
            webcamSecondsRef.current += 1;
            const m = String(Math.floor(webcamSecondsRef.current / 60)).padStart(2, '0');
            const s = String(webcamSecondsRef.current % 60).padStart(2, '0');
            setWebcamTime(`${m}:${s}`);
        }, 1000);
    };

    const captureSnapshot = () => {
        const targetElement = ipCamActive ? ipCamImgRef.current : videoRef.current;
        if (!targetElement || !webcamPlaying) return;
        if (ipCamActive && !(targetElement as HTMLImageElement).naturalWidth) return;
        try {
            const canvas = document.createElement('canvas');
            canvas.width = ipCamActive ? (targetElement as HTMLImageElement).naturalWidth || 1280 : (targetElement as HTMLVideoElement).videoWidth || 1280;
            canvas.height = ipCamActive ? (targetElement as HTMLImageElement).naturalHeight || 720 : (targetElement as HTMLVideoElement).videoHeight || 720;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.drawImage(targetElement, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
            setSnapshotDataUrl(dataUrl);
            // auto-download
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `smart-infra-snap-${Date.now()}.jpg`;
            a.click();
        } catch (err) {
            console.error(err);
            setWebcamError("Snapshot failed. If using an IP Camera, it may be blocking capture due to CORS.");
        }
    };

    const captureAndDetect = async () => {
        // Use ref so this closure always reads the real-time value, not a stale snapshot
        const isIpCam = ipCamActiveRef.current;
        const targetElement = isIpCam ? ipCamImgRef.current : videoRef.current;
        if (!targetElement) return;
        // Wait until the IP cam image has loaded at least one frame
        if (isIpCam && !(targetElement as HTMLImageElement).naturalWidth) return;
        try {
            const canvas = document.createElement("canvas");
            canvas.width = isIpCam ? (targetElement as HTMLImageElement).naturalWidth || 1280 : (targetElement as HTMLVideoElement).videoWidth || 1280;
            canvas.height = isIpCam ? (targetElement as HTMLImageElement).naturalHeight || 720 : (targetElement as HTMLVideoElement).videoHeight || 720;
            if (canvas.width === 0 || canvas.height === 0) return; // nothing to capture yet
            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            ctx.drawImage(targetElement, 0, 0);
            canvas.toBlob(async (blob) => {
                if (!blob) return;
                const formData = new FormData();
                formData.append("file", blob, "frame.jpg");
                try {
                    const response = await axios.post(`${API_BASE}/detect`, formData, getAuthConfig());
                    setResult(response.data);

                    const newDets: Detection[] = [...(response.data.potholes ?? []), ...(response.data.objects ?? [])];
                    if (newDets.length > 0) {
                        setDetectionHistory(prev => [...newDets, ...prev].slice(0, 12));
                        // accumulate session stats
                        const ph = (response.data.potholes ?? []).length;
                        const veh = (response.data.objects ?? []).filter((d: Detection) => ['car', 'truck', 'bus', 'motorcycle'].includes(d.class)).length;
                        const ppl = (response.data.objects ?? []).filter((d: Detection) => d.class === 'person').length;
                        setSessionStats(prev => ({ potholes: prev.potholes + ph, vehicles: prev.vehicles + veh, people: prev.people + ppl }));

                        // Optimistic stats update for velocity chart
                        setStats(prev => {
                            if (!prev) return prev;
                            const now = new Date();
                            const hourKey = `${String(now.getHours()).padStart(2, '0')}:00`;
                            const newHourly = { ...prev.hourly_stats };
                            newHourly[hourKey] = (newHourly[hourKey] || 0) + (ph + veh + ppl);

                            const cars = (response.data.objects ?? []).filter((d: Detection) => d.class.toLowerCase() === 'car').length;
                            const trucks = (response.data.objects ?? []).filter((d: Detection) => d.class.toLowerCase() === 'truck' || d.class.toLowerCase() === 'bus').length;
                            const bikes = (response.data.objects ?? []).filter((d: Detection) => d.class.toLowerCase() === 'motorcycle').length;

                            // Dynamic Health Score for webcam
                            const healthImpact = ph * 5;
                            const newHealth = Math.max(0, 100 - healthImpact);

                            return {
                                ...prev,
                                total_potholes: prev.total_potholes + ph,
                                total_cars: prev.total_cars + cars,
                                total_trucks: prev.total_trucks + trucks,
                                total_bikes: prev.total_bikes + bikes,
                                total_people: prev.total_people + ppl,
                                total_detections: prev.total_detections + (ph + veh + ppl),
                                road_health_score: newHealth,
                                hourly_stats: newHourly
                            };
                        });
                    }
                } catch (err) { console.error(err); }
            }, "image/jpeg", 0.7);
        } catch (err) {
            console.error(err);
            if (!webcamError) setWebcamError("AI capture failed. If using an IP Camera, it may be blocking local AI polling due to strict cross-origin (CORS) rules.");
        }
    };

    useEffect(() => {
        let interval: any;
        if (activeTab === "Webcam" && webcamPlaying) {
            setWebcamError(null);
            startWebcam();
            startWebcamTimer();
            interval = setInterval(() => {
                captureAndDetect();
                setFrameCount(prev => prev + 1);
            }, pollInterval);
        } else {
            stopWebcam();
        }
        return () => {
            if (interval) clearInterval(interval);
            stopWebcam();
        };
    }, [activeTab, webcamPlaying]);

    const drawWebcamDetections = () => {
        const canvas = webcamCanvasRef.current;
        const targetElement = ipCamActive ? ipCamImgRef.current : videoRef.current;
        if (!canvas || !targetElement || !result || !webcamPlaying) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        console.log("[WEBCAM] Drawing detections:", result);

        canvas.width = ipCamActive ? (targetElement as HTMLImageElement).naturalWidth || 1280 : (targetElement as HTMLVideoElement).videoWidth || 1280;
        canvas.height = ipCamActive ? (targetElement as HTMLImageElement).naturalHeight || 720 : (targetElement as HTMLVideoElement).videoHeight || 720;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const allDets: Detection[] = [...(result.potholes ?? []), ...(result.objects ?? [])];
        allDets.forEach((det: Detection) => {
            const [x1, y1, x2, y2] = det.bbox;
            const rw = x2 - x1;
            const rh = y2 - y1;
            const color = CLASS_BOX_COLORS.get(det.class) || "#f97316";
            const label = `${det.class.toUpperCase()} ${Math.round(det.confidence * 100)}%`;
            const cornerLen = Math.min(16, rw * 0.2, rh * 0.2);

            // Privacy Redaction Overlay
            if (privacyMode && PRIVACY_CLASSES.has(det.class.toLowerCase())) {
                ctx.save();
                ctx.beginPath();
                ctx.rect(x1, y1, rw, rh);
                ctx.clip();
                ctx.filter = 'blur(20px)';
                ctx.drawImage(targetElement, 0, 0, canvas.width, canvas.height);
                ctx.restore();

                // HUD Redaction Overlay
                ctx.fillStyle = "rgba(0,0,0,0.6)";
                ctx.fillRect(x1, y1, rw, rh);

                ctx.strokeStyle = "#fff";
                ctx.setLineDash([5, 5]);
                ctx.strokeRect(x1, y1, rw, rh);
                ctx.setLineDash([]);
            }

            // Dim bounding box fill
            ctx.fillStyle = `${color}18`;
            ctx.fillRect(x1, y1, rw, rh);

            // Main border
            ctx.strokeStyle = color;
            ctx.lineWidth = 4;
            ctx.strokeRect(x1, y1, rw, rh);

            // Corner brackets — all 4 corners
            ctx.strokeStyle = color;
            ctx.lineWidth = 6;
            ctx.beginPath();
            // TL
            ctx.moveTo(x1, y1 + cornerLen); ctx.lineTo(x1, y1); ctx.lineTo(x1 + cornerLen, y1);
            // TR
            ctx.moveTo(x2 - cornerLen, y1); ctx.lineTo(x2, y1); ctx.lineTo(x2, y1 + cornerLen);
            // BL
            ctx.moveTo(x1, y2 - cornerLen); ctx.lineTo(x1, y2); ctx.lineTo(x1 + cornerLen, y2);
            // BR
            ctx.moveTo(x2 - cornerLen, y2); ctx.lineTo(x2, y2); ctx.lineTo(x2, y2 - cornerLen);
            ctx.stroke();

            // Label pill
            ctx.font = "bold 11px 'JetBrains Mono', monospace";
            const textW = ctx.measureText(label).width;
            const padX = 6, padY = 4, labelH = 18;
            const bgX = Math.max(0, Math.min(x1, canvas.width - textW - padX * 2));
            const bgY = y1 > labelH + 4 ? y1 - labelH - 2 : y2 + 2;

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.roundRect(bgX, bgY, textW + padX * 2, labelH, 4);
            ctx.fill();

            ctx.fillStyle = "#fff";
            ctx.fillText(label, bgX + padX, bgY + labelH - padY);
        });
    };

    useEffect(() => {
        if (activeTab === "Webcam" && result) drawWebcamDetections();
    }, [result, activeTab]);

    return (
        <div className={`dashboard-root ${theme}-theme`}>

            <header className="top-full-header" style={{ flexShrink: 0, zIndex: 10 }}>
                <Logo size="medium" showText={true} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {user?.is_admin && (
                        <button
                            className={`header-nav-btn ${activeTab === 'Admin' ? 'active' : ''}`}
                            onClick={() => setActiveTab(activeTab === 'Admin' ? 'Home' : 'Admin')}
                        >
                            {activeTab === 'Admin' ? (
                                <><Activity size={18} /><span>{t("dashboard.nav.dashboard", "Dashboard")}</span></>
                            ) : (
                                <><ShieldAlert size={18} /><span>{t("dashboard.nav.adminConsole", "Admin Console")}</span></>
                            )}
                        </button>
                    )}
                    <div className="header-divider"></div>
                    <button
                        className="theme-toggle-compact"
                        onClick={() => { setActiveTab('Webcam'); setWebcamPlaying(true); setWebcamError(null); }}
                        title="Live Scanner"
                    >
                        <Camera size={18} />
                    </button>
                    <button
                        className="theme-toggle-compact"
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        title="Toggle Theme"
                    >
                        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    <div style={{ position: 'relative' }}>
                        <button
                            className={`theme-toggle-compact ${showNotifications ? 'active' : ''}`}
                            title="Notifications"
                            onClick={() => setShowNotifications(!showNotifications)}
                        >
                            <Bell size={18} />
                            {alerts.length > 0 && (
                                <span style={{
                                    position: 'absolute',
                                    top: -2,
                                    right: -2,
                                    width: 8,
                                    height: 8,
                                    background: '#ef4444',
                                    borderRadius: '50%',
                                    border: '1.5px solid var(--bg-card)',
                                    boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)'
                                }}></span>
                            )}
                        </button>

                        {showNotifications && (
                            <div className="notifications-dropdown glass-card animate-in" style={{
                                position: 'absolute',
                                top: '48px',
                                right: '0',
                                width: '320px',
                                maxHeight: '400px',
                                zIndex: 100,
                                padding: '16px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                                boxShadow: 'var(--shadow-premium)',
                                border: '1px solid var(--border)',
                                borderRadius: '16px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t("dashboard.alerts.recent", "Recent Alerts")}</h4>
                                    {alerts.length > 0 && (
                                        <button
                                            onClick={handleClearAllAlerts}
                                            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                                        >
                                            {t("dashboard.alerts.clearAll", "Clear All")}
                                        </button>
                                    )}
                                </div>

                                <div className="custom-scrollbar" style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {alerts.length === 0 ? (
                                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                            <Bell size={24} style={{ opacity: 0.2, marginBottom: 8 }} />
                                            <p>{t("dashboard.alerts.noNotifications", "No new notifications")}</p>
                                        </div>
                                    ) : (
                                        alerts.map(alert => (
                                            <div key={alert.id} className="notification-item" style={{
                                                padding: '10px',
                                                borderRadius: '10px',
                                                background: 'rgba(255,255,255,0.03)',
                                                borderLeft: `3px solid ${alert.type === 'danger' ? '#ef4444' : '#f97316'}`,
                                                position: 'relative'
                                            }}>
                                                <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 2 }}>{alert.title}</div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{alert.message}</div>
                                                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span>{new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    <button
                                                        onClick={() => handleDismissAlert(alert.id)}
                                                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="tab-container">
                {activeTab !== "Admin" && (
                    <Sidebar
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        cameraActive={cameraActive}
                        handleCameraToggle={handleCameraToggle}
                        isOpen={sidebarOpen}
                        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                    />
                )}

                <div className="main-content-area" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div className="tab-content-wrapper">
                        {activeTab === "Home" && (
                            <div className="animate-in dashboard-home">
                                <div className="dashboard-header">
                                    <div>
                                        <h1 className="dashboard-title">{t("dashboard.home.title", "AI SMART INFRA Dashboard")}</h1>
                                    </div>
                                    <div className="dashboard-actions">
                                        <button className="dash-action-btn" onClick={handleRefresh} disabled={dashRefreshing}>
                                            <RefreshCw size={18} className={dashRefreshing ? "animate-spin" : ""} /><span>{t("dashboard.actions.refresh", "Refresh")}</span>
                                        </button>
                                    </div>
                                </div>
                                <StatsGrid stats={stats} />

                                <IntelligenceHub
                                    detections={[...(result?.potholes ?? []), ...(result?.objects ?? [])]}
                                    systemStats={{
                                        potholes: stats?.total_potholes || 0,
                                        cracks: stats?.total_detections || 0,
                                        health: `${stats?.road_health_score || 94}%`,
                                        riskLevel: stats && stats.road_health_score < 70 ? 'HIGH' : 'LOW'
                                    }}
                                />

                                <div style={{ marginTop: 32 }}>
                                    <AnalyticsSection stats={stats} />
                                </div>

                                <div style={{ marginTop: 32 }}>
                                    <AiScanner
                                        result={result}
                                        loading={loading}
                                        scannerStatus={scannerStatus}
                                        isDragging={isDragging}
                                        preview={preview}
                                        fileInputRef={fileInputRef}
                                        imageRef={imageRef}
                                        canvasRef={canvasRef}
                                        onFileChange={onFileChange}
                                        handleDragOver={(e: any) => { e.preventDefault(); setIsDragging(true); }}
                                        handleDragLeave={() => setIsDragging(false)}
                                        handleDrop={(e: any) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
                                        drawDetections={drawDetections}
                                        resetScanner={() => { setFile(null); setPreview(null); setResult(null); }}
                                        onDetectionsChange={(newDetections: any[]) => {
                                            // Handle new detections if needed
                                            if (newDetections.length > 0) {
                                                const newAlerts = newDetections.map((d: any) => ({
                                                    id: Date.now() + Math.random(),
                                                    type: d.pothole_present ? 'pothole' : 'structural',
                                                    severity: d.pothole_present ? 'high' : 'medium',
                                                    message: d.pothole_present ? `Pothole detected in Sector ${Math.floor(Math.random() * 10) + 1}` : `Structural anomaly detected`,
                                                    timestamp: new Date().toISOString(),
                                                    location: 'Sector ' + (Math.floor(Math.random() * 10) + 1),
                                                    status: 'pending'
                                                }));
                                                setAlerts(prev => {
                                                    const now = Date.now();
                                                    const filteredNewAlerts = newAlerts.filter((newA: any) => {
                                                        // Prevent duplicate notifications of the same type and message within 10 seconds
                                                        const isDuplicate = prev.some(p =>
                                                            p.type === newA.type &&
                                                            p.message === newA.message &&
                                                            (now - new Date(p.timestamp).getTime() < 10000)
                                                        );
                                                        return !isDuplicate;
                                                    });

                                                    if (filteredNewAlerts.length === 0) return prev;
                                                    // Add new alerts and keep maximum of 20 in the history
                                                    return [...filteredNewAlerts, ...prev].slice(0, 20);
                                                });
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === "Map" && (
                            <div className="animate-in dashboard-home" style={{ padding: '24px' }}>
                                <div className="dashboard-header">
                                    <div>
                                        <h1 className="dashboard-title">{t("dashboard.map.title", "Monitoring Map")}</h1>
                                    </div>
                                </div>
                                <div style={{ marginTop: '24px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
                                    <MonitoringMap />
                                </div>
                            </div>
                        )}
                        {activeTab === "History" && <DetectionLog />}
                        {activeTab === "Admin" && <AdminConsole />}
                        {activeTab === "Report" && <ReportIssue onReturn={() => setActiveTab("Home")} />}
                        {activeTab === "Configuration" && <AiConfig theme={theme} toggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')} user={user} />}

                        {activeTab === "Webcam" && (
                            <div className="animate-in dashboard-home" style={{ padding: '24px' }}>
                                {/* ── Header ── */}
                                <div className="dashboard-header">
                                    <div>
                                        <h2 className="wcam-title"><Scan size={20} /> {t("dashboard.scanner.title", "AI Infrastructure Scanner")}</h2>
                                    </div>
                                    <div className="dashboard-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <input
                                            type="text"
                                            value={cameraSource}
                                            onChange={(e) => setCameraSource(e.target.value)}
                                            placeholder="Server Link (URL)"
                                            className="camera-input-small"
                                            style={{ width: '120px' }}
                                        />
                                        {webcamPlaying && (
                                            <button className="dash-action-btn" onClick={captureSnapshot} title="Save Snapshot">
                                                <Download size={16} /><span>{t("dashboard.scanner.snapshotBtn", "Snapshot")}</span>
                                            </button>
                                        )}

                                        <button
                                            className={`dash-action-btn ${webcamPlaying ? 'active' : ''}`}
                                            onClick={() => {
                                                if (!webcamPlaying && !cameraSource.trim()) {
                                                    alert("Please provide the server link.");
                                                    return;
                                                }
                                                setWebcamPlaying(!webcamPlaying);
                                                if (webcamPlaying) clearDetectionHistory();
                                            }}
                                        >
                                            <ShieldAlert size={18} />
                                            <span>{webcamPlaying ? t("dashboard.scanner.stop", "STOP SCAN") : t("dashboard.scanner.start", "START SCAN")}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* ── Poll Speed + Session Stats row ── */}
                                <div className="wcam-toolbar">
                                    <div className="wcam-poll-group">
                                        <span className="wcam-toolbar-label">{t("dashboard.scanner.rate", "SCAN RATE:")}</span>
                                        {([1000, 2000, 5000] as const).map(ms => (
                                            <button
                                                key={ms}
                                                className={`wcam-poll-btn ${pollInterval === ms ? 'active' : ''}`}
                                                onClick={() => setPollInterval(ms)}
                                            >
                                                {ms === 1000 ? t("dashboard.scanner.fast", "FAST") : ms === 2000 ? t("dashboard.scanner.normal", "NORMAL") : t("dashboard.scanner.slow", "SLOW")}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="wcam-session-stats">
                                        <div className="wcam-stat-chip" style={{ borderColor: '#f97316' }}>
                                            <span className="wcam-stat-val" style={{ color: '#f97316' }}>{sessionStats.potholes}</span>
                                            <span className="wcam-stat-lbl">{t("dashboard.stats.potholes", "Potholes")}</span>
                                        </div>
                                        <div className="wcam-stat-chip" style={{ borderColor: '#38bdf8' }}>
                                            <span className="wcam-stat-val" style={{ color: '#38bdf8' }}>{sessionStats.vehicles}</span>
                                            <span className="wcam-stat-lbl">{t("dashboard.stats.vehicles", "Vehicles")}</span>
                                        </div>
                                        <div className="wcam-stat-chip" style={{ borderColor: '#a78bfa' }}>
                                            <span className="wcam-stat-val" style={{ color: '#a78bfa' }}>{sessionStats.people}</span>
                                            <span className="wcam-stat-lbl">{t("dashboard.stats.people", "People")}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Camera error card ── */}
                                {webcamError && (
                                    <div className="wcam-error-card">
                                        <WifiOff size={20} />
                                        <div style={{ flex: 1 }}>
                                            <p className="wcam-error-title">{t("dashboard.camera.unavailable", "Camera Unavailable")}</p>
                                            <p className="wcam-error-desc">{webcamError}</p>
                                        </div>
                                        <button className="wcam-error-close" onClick={() => setWebcamError(null)}><X size={14} /></button>
                                    </div>
                                )}

                                {/* ── Camera viewport ── */}
                                <div
                                    ref={webcamContainerRef}
                                    className="webcam-hud-container"
                                    style={{ position: 'relative', minHeight: '340px' }}
                                >
                                    {/* Fullscreen button — top-right corner of viewport */}
                                    <button
                                        className="wcam-fullscreen-btn"
                                        onClick={toggleFullscreen}
                                        title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                                    >
                                        {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
                                    </button>
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className={`live-video-feed webcam-feed-video${visualMode === 'Thermal' ? ' feed-filter-thermal'
                                            : visualMode === 'Infrared' ? ' feed-filter-infrared'
                                                : visualMode === 'Neural' ? ' feed-filter-neural'
                                                    : ''
                                            }`}
                                        style={{ width: '100%', height: 'auto', display: webcamPlaying && !ipCamActive ? 'block' : 'none' }}
                                    />
                                    {ipCamActive && webcamPlaying && (
                                        <img
                                            ref={ipCamImgRef}
                                            src={`${API_BASE}/proxy-stream?url=${encodeURIComponent(cameraSource)}`}
                                            crossOrigin="anonymous"
                                            className={`live-video-feed webcam-feed-video${visualMode === 'Thermal' ? ' feed-filter-thermal'
                                                : visualMode === 'Infrared' ? ' feed-filter-infrared'
                                                    : visualMode === 'Neural' ? ' feed-filter-neural'
                                                        : ''
                                                }`}
                                            style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain' }}
                                            alt="IP Camera Feed"
                                            onError={() => {
                                                console.error("[WEBCAM] IP Camera stream failed to load.");
                                                setWebcamPlaying(false);
                                                setWebcamError("Failed to connect to IP Camera. The URL may be offline or invalid.");
                                                if (isFullscreen) document.exitFullscreen().catch(() => { });
                                            }}
                                        />
                                    )}
                                    <canvas
                                        ref={webcamCanvasRef}
                                        className="webcam-overlay-canvas"
                                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                                    />

                                    {webcamPlaying && (
                                        <div className="webcam-hud-overlay-pro">
                                            {/* Corner brackets */}
                                            <div className="hud-corner hud-corner-tl" />
                                            <div className="hud-corner hud-corner-tr" />
                                            <div className="hud-corner hud-corner-bl" />
                                            <div className="hud-corner hud-corner-br" />

                                            <div className="hud-edge-bar">
                                                <div className="hud-chip-group">
                                                    <div className="hud-micro-chip status-live">
                                                        <span className="status-dot active" /> LIVE
                                                    </div>
                                                    <div className="hud-micro-chip glow-data"><Radio size={11} /> {webcamTime}</div>
                                                    <div className="hud-micro-chip glow-data"><Zap size={11} /> {frameCount} FPS</div>
                                                    <div className="hud-micro-chip hud-health-chip">
                                                        <Activity size={11} /> Infra Health: {stats ? stats.road_health_score : 100}%
                                                    </div>
                                                </div>
                                                <div className="hud-mode-selector-strip">
                                                    {(['Normal', 'Thermal', 'Infrared', 'Neural'] as const).map(m => (
                                                        <button key={m} className={`mode-btn-small ${visualMode === m ? 'active' : ''}`} onClick={() => setVisualMode(m)}>{m}</button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="hud-edge-bar" style={{ marginTop: 'auto' }}>
                                                <div className="hud-intelligence-line">
                                                    <span className="hud-intel-box"><Eye size={11} /> MODE: {visualMode.toUpperCase()}</span>
                                                    <span className="hud-intel-box"><Crosshair size={11} /> TARGETS: {detectionHistory.length}</span>
                                                    {/* <span className="hud-intel-box brand">AI SMART-INFRA</span> */}
                                                </div>
                                                <div className="hud-action-strip">
                                                    <button className="hud-action-btn-pro" onClick={captureSnapshot}><Download size={12} /> {t("dashboard.camera.snapshot", "SNAPSHOT")}</button>
                                                    <button className="hud-action-btn-pro danger" onClick={() => setWebcamPlaying(false)}><X size={12} /> {t("dashboard.camera.endScan", "END SCAN")}</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {!webcamPlaying && (
                                        <div className="premium-standby-overlay">
                                            <div className="standby-content">
                                                <div className="pulse-ring"><Camera size={32} /></div>
                                                <p className="standby-status">{t("dashboard.camera.offline", "CAMERA LINK OFFLINE")}</p>
                                                <p className="standby-desc">{t("dashboard.camera.offlineDesc", "Click Activate Scanner to start the live feed")}</p>
                                                <button className="dash-action-btn" style={{ margin: '0 auto', pointerEvents: 'auto' }} onClick={() => setWebcamPlaying(true)}>
                                                    <Scan size={16} /> {t("dashboard.camera.activate", "Activate Scanner")}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* ── Detection History Panel ── */}
                                {detectionHistory.length > 0 && (
                                    <div style={{ marginTop: '20px', padding: '20px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                            <Database size={12} color="var(--text-muted)" /> {t("dashboard.log.title", "Live Detection Log")}
                                            <span style={{ marginLeft: 'auto', background: 'var(--primary)', color: '#fff', borderRadius: '99px', padding: '1px 8px', fontSize: '0.7rem' }}>
                                                {detectionHistory.length}
                                            </span>
                                            <button onClick={clearDetectionHistory} title={t("dashboard.log.clearTitle", "Clear log")} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem' }}>
                                                <Trash2 size={11} /> {t("dashboard.log.clear", "Clear")}
                                            </button>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '12px' }}>
                                             {detectionHistory.map((d, i) => {
                                                 const color = CLASS_BOX_COLORS.get(d.class) || '#f97316';
                                                 const isHigh = d.confidence >= 0.7;
                                                 const isMed = d.confidence >= 0.4 && d.confidence < 0.7;
                                                 const confidenceStatus = isHigh ? "High" : isMed ? "Medium" : "Low";
                                                 const statusColor = isHigh ? "#10b981" : isMed ? "#f59e0b" : "#ef4444";
                                                 const icon = d.class === 'person' ? '👤' : d.class === 'pothole' ? '🕳️' : '🚗';
                                                 
                                                 return (
                                                     <div 
                                                         key={i} 
                                                         style={{ 
                                                             padding: '14px', 
                                                             borderLeft: `4px solid ${color}`, 
                                                             display: 'flex', 
                                                             flexDirection: 'column', 
                                                             gap: '8px', 
                                                             background: 'var(--bg-surface)', 
                                                             border: '1px solid var(--border)', 
                                                             borderRadius: '12px',
                                                             boxShadow: 'var(--shadow-sm)',
                                                             position: 'relative',
                                                             overflow: 'hidden'
                                                         }}
                                                     >
                                                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                             <span style={{ 
                                                                 fontSize: '0.72rem', 
                                                                 color: 'var(--text-main)', 
                                                                 fontWeight: 800, 
                                                                 textTransform: 'uppercase', 
                                                                 letterSpacing: '0.04em',
                                                                 display: 'flex',
                                                                 alignItems: 'center',
                                                                 gap: '5px'
                                                             }}>
                                                                 {icon} {d.class}
                                                             </span>
                                                             <span style={{ 
                                                                 fontSize: '0.62rem', 
                                                                 fontWeight: 800, 
                                                                 color: statusColor,
                                                                 background: `${statusColor}15`,
                                                                 padding: '1px 6px',
                                                                 borderRadius: '4px',
                                                                 textTransform: 'uppercase',
                                                                 letterSpacing: '0.03em'
                                                             }}>
                                                                 {confidenceStatus}
                                                             </span>
                                                         </div>
                                                         
                                                         <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                                                             <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                                                                 {Math.round(d.confidence * 100)}%
                                                             </span>
                                                             <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t("dashboard.log.confidence", "confidence")}</span>
                                                         </div>
                                                         
                                                         <div style={{ height: '4px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden', marginTop: '2px' }}>
                                                             <div 
                                                                 style={{ 
                                                                     height: '100%', 
                                                                     width: `${d.confidence * 100}%`, 
                                                                     background: color, 
                                                                     borderRadius: '4px', 
                                                                     boxShadow: `0 0 6px ${color}80`,
                                                                     transition: 'width 0.4s' 
                                                                 }} 
                                                             />
                                                         </div>
                                                     </div>
                                                 );
                                             })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
