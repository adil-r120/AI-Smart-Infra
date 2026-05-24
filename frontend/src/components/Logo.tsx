import React, { useState, useEffect } from "react";
import { Sun, Moon, Cloud, CloudRain, Snowflake, CloudLightning, Wind, Clock } from "lucide-react";

interface LogoProps {
    size?: "small" | "medium" | "large";
    showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({
    size = "medium",
    showText = true
}) => {
    const sizeMap = {
        small: { icon: 24, text: "1rem" },
        medium: { icon: 32, text: "1.25rem" },
        large: { icon: 40, text: "1.5rem" }
    };

    const { icon, text } = sizeMap[size];

    return (
        <div className="logo-container" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="logo-icon-wrapper">
                <img src="/favicon.png" alt="Smart Infra Logo" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", borderRadius: "10px" }} />
            </div>
            {showText && (
                <div className="logo-text" style={{ fontSize: text, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="logo-main">AI Smart</span>
                    <span className="logo-accent">Infra</span>
                </div>
            )}

            <style>{`
                .logo-container {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .logo-icon-wrapper {
                    width: ${icon + 8}px;
                    height: ${icon + 8}px;
                    border-radius: 12px;
                    background: transparent;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                }

                .logo-text {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-weight: 800;
                    line-height: 1;
                }

                .logo-main {
                    color: var(--text-main);
                }

                .logo-accent {
                    background: linear-gradient(135deg, var(--primary), #8b5cf6);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .logo-weather-badge {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    margin-left: 10px;
                    padding: 5px 12px;
                    background: var(--bg-surface);
                    border: 1px solid var(--border);
                    border-radius: 99px;
                    font-size: 0.6em;
                    font-weight: 800;
                    color: var(--text-muted);
                    transition: all 0.3s;
                }

                .logo-weather-badge:hover {
                    color: var(--text-main);
                    border-color: var(--primary);
                }

                @media (max-width: 768px) {
                    .logo-text {
                        font-size: ${parseInt(text) * 0.8}rem !important;
                    }
                    .logo-weather-badge {
                        display: none; /* Hide on very small screens to save header space */
                    }
                }
            `}</style>
        </div>
    );
};

export default Logo;
