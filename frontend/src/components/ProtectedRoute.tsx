import { useState, useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AlertCircle, Compass, Settings, CheckCircle } from "lucide-react";

export default function ProtectedRoute() {
    const { token, loading } = useAuth();
    const [gpsStatus, setGpsStatus] = useState<'loading' | 'prompt' | 'granted' | 'denied'>('loading');

    useEffect(() => {
        if (!token || loading) return;

        if (!navigator.geolocation) {
            setGpsStatus('denied');
            return;
        }

        const checkLocation = async () => {
            try {
                if (navigator.permissions && navigator.permissions.query) {
                    const result = await navigator.permissions.query({ name: 'geolocation' });
                    if (result.state === 'granted') {
                        setGpsStatus('granted');
                        // Warm up location
                        navigator.geolocation.getCurrentPosition(() => {}, () => {});
                        return;
                    } else if (result.state === 'denied') {
                        setGpsStatus('denied');
                        return;
                    }
                }
            } catch (error) {
                // Fallback if permissions API is not supported
            }

            setGpsStatus('prompt');

            // Try to get current position to trigger permission prompt
            navigator.geolocation.getCurrentPosition(
                () => {
                    setGpsStatus('granted');
                },
                (error) => {
                    console.error("GPS Error:", error);
                    setGpsStatus('denied');
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
            );
        };

        checkLocation();
    }, [token, loading]);

    if (loading || gpsStatus === 'loading') {
        return (
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                height: "100vh", background: "var(--bg-body)", color: "var(--text-muted)",
                fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "0.9rem", gap: "12px",
            }}>
                <div style={{
                    width: 20, height: 20, borderRadius: "50%",
                    border: "2.5px solid var(--primary)", borderTopColor: "transparent",
                    animation: "spin 0.8s linear infinite",
                }} />
                {loading ? 'Restoring session…' : 'Checking location…'}
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    if (gpsStatus === 'prompt') {
        return (
            <>
                <div style={{ filter: "blur(8px)", pointerEvents: "none", height: "100vh", overflow: "hidden" }}>
                    <Outlet />
                </div>
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", zIndex: 9999, padding: "20px"
                }}>
                    <div style={{
                        background: "var(--bg-card)", borderRadius: "24px", padding: "40px",
                        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)", maxWidth: "420px", textAlign: "center",
                        border: "1px solid var(--border)", position: "relative", overflow: "hidden",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: "24px"
                    }}>
                        <div style={{ position: "absolute", top: "-20%", left: "-20%", width: "60%", height: "60%", background: "var(--primary)", opacity: 0.1, filter: "blur(60px)", borderRadius: "50%", pointerEvents: "none" }} />

                        <div style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--primary-glow)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 30px var(--primary-glow)", zIndex: 1 }}>
                            <Compass size={40} color="var(--primary)" style={{ animation: "pulse 2s infinite" }} />
                        </div>

                        <div style={{ zIndex: 1 }}>
                            <h2 style={{ margin: "0 0 12px 0", fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-main)" }}>Location Required</h2>
                            <p style={{ margin: 0, color: "var(--text-muted)", lineHeight: 1.6, fontSize: "1rem" }}>
                                Smart-Infra requires your GPS location to accurately map and report infrastructure issues. Please click <strong>"Allow"</strong> on your browser's location prompt.
                            </p>
                        </div>
                        <style>{`
                            @keyframes pulse { 0% { transform: scale(0.95); opacity: 0.8; } 50% { transform: scale(1.05); opacity: 1; } 100% { transform: scale(0.95); opacity: 0.8; } }
                        `}</style>
                    </div>
                </div>
            </>
        );
    }

    if (gpsStatus === 'denied') {
        return (
            <>
                <div style={{ filter: "blur(10px)", pointerEvents: "none", height: "100vh", overflow: "hidden" }}>
                    <Outlet />
                </div>
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    background: "rgba(0,0,0,0.4)", backdropFilter: "blur(5.5px)", zIndex: 9999, padding: "20px"
                }}>
                    <div style={{
                        background: "var(--bg-card)", borderRadius: "20px", padding: "20px",
                        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)", maxWidth: "480px", textAlign: "center",
                        border: "1px solid var(--border)", position: "relative", overflow: "hidden",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: "12px"
                    }}>
                        <div style={{ position: "absolute", top: "-20%", right: "-20%", width: "60%", height: "60%", background: "#ef4444", opacity: 0.1, filter: "blur(60px)", borderRadius: "50%", pointerEvents: "none" }} />

                        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(239, 68, 68, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", boxShadow: "0 0 30px rgba(239, 68, 68, 0.2)", zIndex: 1 }}>
                            <AlertCircle size={24} strokeWidth={2.5} />
                        </div>

                        <div style={{ zIndex: 1, width: "100%" }}>
                            <h2 style={{ margin: "0 0 6px 0", fontSize: "1.3rem", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-main)" }}>Location Access Denied</h2>
                            <p style={{ margin: "0 auto 12px auto", color: "var(--text-muted)", lineHeight: 1.4, fontSize: "0.85rem" }}>
                                You must enable Location Services to use this application. Without your location, you cannot access the dashboard or submit new reports.
                            </p>

                            <div style={{
                                background: "var(--bg-body)", padding: "12px 16px",
                                borderRadius: "12px", border: "1px solid var(--border)", textAlign: "left",
                                display: "flex", flexDirection: "column", gap: "8px"
                            }}>
                                <h4 style={{ margin: 0, display: "flex", alignItems: "center", gap: "6px", fontSize: "0.9rem", color: "var(--text-main)", fontWeight: 700 }}><Settings size={14} color="var(--primary)" /> Quick Fix</h4>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px", color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: 1.4 }}>
                                    <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                                        <span style={{ background: "var(--primary)", color: "white", borderRadius: "50%", width: "18px", height: "18px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: "bold", flexShrink: 0, marginTop: "2px" }}>1</span>
                                        <span>Click the <strong>🔒 lock icon</strong> in your browser's top address bar.</span>
                                    </div>
                                    <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                                        <span style={{ background: "var(--primary)", color: "white", borderRadius: "50%", width: "18px", height: "18px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: "bold", flexShrink: 0, marginTop: "2px" }}>2</span>
                                        <span>Go to <strong>Site Settings</strong> or <strong>Permissions</strong>.</span>
                                    </div>
                                    <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                                        <span style={{ background: "var(--primary)", color: "white", borderRadius: "50%", width: "18px", height: "18px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: "bold", flexShrink: 0, marginTop: "2px" }}>3</span>
                                        <span>Find <strong>Location</strong> and change it to <strong style={{ color: "var(--primary)" }}>Allow</strong>.</span>
                                    </div>
                                    <div style={{ marginTop: "4px", padding: "8px 10px", background: "rgba(249, 115, 22, 0.1)", borderRadius: "8px", border: "1px solid rgba(249, 115, 22, 0.2)", fontSize: "0.8rem", color: "var(--text-main)" }}>
                                        <strong style={{ color: "#ea580c" }}>Still not working?</strong> Make sure Location is enabled in your device's <strong>System Settings</strong>.
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                background: "linear-gradient(135deg, var(--primary), #ea580c)", color: "white",
                                border: "none", padding: "10px 24px", borderRadius: "8px", fontWeight: "bold",
                                cursor: "pointer", fontSize: "0.95rem", width: "100%",
                                boxShadow: "0 10px 15px -3px rgba(249, 115, 22, 0.3)", transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)", zIndex: 1
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 15px 25px -5px rgba(249, 115, 22, 0.4)"; }}
                            onMouseOut={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(249, 115, 22, 0.3)"; }}
                        >
                            I have enabled it, reload page
                        </button>
                    </div>
                </div>
            </>
        );
    }

    return <Outlet />;
}
