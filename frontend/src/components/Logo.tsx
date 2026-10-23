import React, { useState, useEffect } from "react";
import { Sun, Moon, Cloud, CloudRain, Snowflake, CloudLightning, Wind } from "lucide-react";

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

    // ── Real-time weather state ──────────────────────────────────────────────
    const [weather, setWeather] = useState<{
        temp: number | null;
        condition: string;
        WeatherIcon: any;
    }>({ temp: null, condition: "Clear", WeatherIcon: Sun });

    useEffect(() => {
        const fetchWeather = async (lat: number, lon: number) => {
            try {
                const res = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&timezone=auto`
                );
                const data = await res.json();
                const code: number = data.current.weather_code;
                const isDay: boolean = data.current.is_day === 1;
                const temp: number = Math.round(data.current.temperature_2m);

                let condition = "Clear";
                let WeatherIcon: any = isDay ? Sun : Moon;
                if (code <= 1) { condition = "Clear"; WeatherIcon = isDay ? Sun : Moon; }
                else if (code <= 3) { condition = "Cloudy"; WeatherIcon = Cloud; }
                else if (code <= 49) { condition = "Foggy"; WeatherIcon = Wind; }
                else if (code <= 69) { condition = "Rainy"; WeatherIcon = CloudRain; }
                else if (code <= 79) { condition = "Snow"; WeatherIcon = Snowflake; }
                else if (code <= 99) { condition = "Storm"; WeatherIcon = CloudLightning; }

                setWeather({ temp, condition, WeatherIcon });
            } catch {
                // silently fail — badge just won't show
            }
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
                () => fetchWeather(28.6139, 77.2090)   // default: New Delhi
            );
        } else {
            fetchWeather(28.6139, 77.2090);
        }
    }, []);

    const WeatherIcon = weather.WeatherIcon;

    return (
        <div className="logo-container" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="logo-icon-wrapper">
                <img src="/smart-infra-logo.svg" alt="Smart Infra Logo" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
            </div>
            {showText && (
                <div className="logo-text" style={{ fontSize: text, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="logo-main">AI Smart</span>
                    <span className="logo-accent">Infra</span>
                </div>
            )}

            {/* Live weather badge — always visible in header */}
            {weather.temp !== null && (
                <div className="logo-weather-badge" title={`${weather.condition} — live local weather`}>
                    <WeatherIcon size={12} />
                    <span>{weather.temp}°C</span>
                    <span style={{ opacity: 0.7 }}>{weather.condition}</span>
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
                    margin-left: 4px;
                    padding: 5px 12px;
                    background: var(--bg-surface);
                    border: 1px solid var(--border);
                    border-radius: 99px;
                    font-size: 0.72rem;
                    font-weight: 700;
                    color: var(--text-muted);
                    transition: all 0.3s;
                    cursor: default;
                    white-space: nowrap;
                }

                .logo-weather-badge:hover {
                    color: var(--text-main);
                    border-color: var(--primary);
                    background: var(--primary-glow);
                }

                @media (max-width: 768px) {
                    .logo-text {
                        font-size: ${parseInt(text) * 0.8}rem !important;
                    }
                    .logo-weather-badge {
                        display: none;
                    }
                }
            `}</style>
        </div>
    );
};

export default Logo;
