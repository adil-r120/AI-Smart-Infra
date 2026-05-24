import React, { useMemo } from "react";

interface IntegritySphereProps {
    hazardCount: number;
    scanning: boolean;
}

const IntegritySphere: React.FC<IntegritySphereProps> = ({ hazardCount, scanning }) => {
    // Determine the state of the sphere based on hazard count
    const status = useMemo(() => {
        if (hazardCount === 0) return { color: "#06b6d4", speed: "8s", label: "STABLE", shadow: "0 0 40px rgba(6, 182, 212, 0.3)" };
        if (hazardCount < 5) return { color: "#f59e0b", speed: "4s", label: "ADVISORY", shadow: "0 0 50px rgba(245, 158, 11, 0.4)" };
        return { color: "#ef4444", speed: "1.5s", label: "CRITICAL", shadow: "0 0 60px rgba(239, 68, 68, 0.5)" };
    }, [hazardCount]);

    return (
        <div className="integrity-sphere-container">
            <div className="sphere-wrapper">
                {/* The Outer Rings */}
                <div className="sphere-ring ring-1" style={{ borderColor: `${status.color}33`, animationDuration: status.speed }}></div>
                <div className="sphere-ring ring-2" style={{ borderColor: `${status.color}22`, animationDuration: `calc(${status.speed} * 1.5)` }}></div>
                
                {/* The Main Pulsing Core */}
                <div 
                    className={`sphere-core ${scanning ? 'scanning' : ''}`}
                    style={{ 
                        background: `radial-gradient(circle at 30% 30%, ${status.color}, ${status.color}99)`,
                        boxShadow: status.shadow
                    }}
                >
                    <div className="core-glimmer"></div>
                    <div className="core-noise"></div>
                </div>

                {/* Data Particles */}
                {[...Array(6)].map((_, i) => (
                    <div 
                        key={i} 
                        className="data-particle" 
                        style={{ 
                            background: status.color,
                            animationDelay: `${i * 0.5}s`,
                            transform: `rotate(${i * 60}deg) translateX(50px)`
                        }}
                    ></div>
                ))}
            </div>

            <div className="sphere-meta">
                <span className="meta-label">INTEGRITY CORE</span>
                <span className="meta-status" style={{ color: status.color }}>
                    {scanning ? 'ANALYZING...' : status.label}
                </span>
            </div>

            <style>{`
                .integrity-sphere-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    background: rgba(15, 23, 42, 0.3);
                    border: 1px solid var(--border);
                    border-radius: 20px;
                    min-width: 180px;
                    position: relative;
                    overflow: hidden;
                    height: 100%;
                }

                .sphere-wrapper {
                    position: relative;
                    width: 100px;
                    height: 100px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 15px;
                }

                .sphere-core {
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    position: relative;
                    z-index: 5;
                    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                    animation: pulse-glow 2s infinite alternate ease-in-out;
                }

                .sphere-core.scanning {
                    animation: scanning-jitter 0.2s infinite;
                }

                .core-glimmer {
                    position: absolute;
                    top: 15%;
                    left: 15%;
                    width: 30%;
                    height: 30%;
                    background: rgba(255, 255, 255, 0.4);
                    border-radius: 50%;
                    filter: blur(4px);
                }

                .sphere-ring {
                    position: absolute;
                    border: 1px solid;
                    border-radius: 50%;
                    animation: rotate-ring linear infinite;
                }

                .ring-1 { width: 80px; height: 80px; }
                .ring-2 { width: 110px; height: 110px; }

                .data-particle {
                    position: absolute;
                    width: 3px;
                    height: 3px;
                    border-radius: 50%;
                    opacity: 0;
                    animation: particle-float 3s infinite ease-out;
                }

                .sphere-meta {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 2px;
                }

                .meta-label {
                    font-size: 0.6rem;
                    font-weight: 800;
                    color: var(--text-muted);
                    letter-spacing: 0.1em;
                }

                .meta-status {
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 0.85rem;
                    font-weight: 800;
                    letter-spacing: -0.02em;
                }

                @keyframes pulse-glow {
                    from { transform: scale(0.95); opacity: 0.8; }
                    to { transform: scale(1.05); opacity: 1; }
                }

                @keyframes rotate-ring {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                @keyframes scanning-jitter {
                    0% { transform: translate(0, 0) scale(1.1); }
                    25% { transform: translate(2px, -2px) scale(1.1); }
                    50% { transform: translate(-2px, 2px) scale(1.1); }
                    75% { transform: translate(2px, 2px) scale(1.1); }
                    100% { transform: translate(0, 0) scale(1.1); }
                }

                @keyframes particle-float {
                    0% { transform: rotate(var(--rot)) translateX(30px); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: rotate(var(--rot)) translateX(70px); opacity: 0; }
                }
            `}</style>
        </div>
    );
};

export default IntegritySphere;
