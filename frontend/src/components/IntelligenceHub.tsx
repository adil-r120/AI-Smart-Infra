import React, { useState, useEffect } from 'react';
import { Activity, Wind, Droplets, Sun, Moon, Cloud, CloudLightning, Snowflake, TrendingDown, Gauge, CloudRain } from 'lucide-react';

interface WeatherData {
    temp: number;
    humidity: number;
    wind: number;
    uv: number;
    stress: string;
    stressLevel: number;
    lifeImpact: string;
    condition: string;
    icon: any;
}

interface Detection {
    class: string;
    confidence: number;
    lat?: number;
    lng?: number;
}

interface IntelligenceHubProps {
    detections?: Detection[];
    systemStats?: {
        potholes: number;
        cracks: number;
        health: string;
        riskLevel: string;
    };
}

const IntelligenceHub: React.FC<IntelligenceHubProps> = () => {
    const [weather, setWeather] = useState<WeatherData>({
        temp: 24,
        humidity: 45,
        wind: 10,
        uv: 4.2,
        stress: 'NORMAL',
        stressLevel: 30,
        lifeImpact: '-0.2%',
        condition: 'Clear',
        icon: Sun
    });

    // REAL-TIME WEATHER FETCHING
    useEffect(() => {
        const fetchRealWeather = async (lat: number, lon: number) => {
            try {
                const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,is_day,weather_code&daily=uv_index_max&timezone=auto`);
                const data = await response.json();
                const currentTemp = data.current.temperature_2m;
                const currentHumidity = data.current.relative_humidity_2m;
                const currentWind = data.current.wind_speed_10m;
                const currentUV = data.daily?.uv_index_max?.[0] || 5.0;
                const weatherCode = data.current.weather_code;
                const isDay = data.current.is_day === 1;

                // WMO Weather interpretation codes
                let condition = 'Clear';
                let WeatherIcon = isDay ? Sun : Moon;
                
                if (weatherCode <= 1) { condition = 'Clear'; WeatherIcon = isDay ? Sun : Moon; }
                else if (weatherCode <= 3) { condition = 'Cloudy'; WeatherIcon = Cloud; }
                else if (weatherCode <= 49) { condition = 'Foggy'; WeatherIcon = Wind; }
                else if (weatherCode <= 69) { condition = 'Rainy'; WeatherIcon = CloudRain; }
                else if (weatherCode <= 79) { condition = 'Snow'; WeatherIcon = Snowflake; }
                else if (weatherCode <= 99) { condition = 'Storm'; WeatherIcon = CloudLightning; }

                let stress = 'LOW';
                let stressLevel = 20;
                if (currentTemp > 35 || currentHumidity > 80 || currentWind > 40 || weatherCode >= 95) {
                    stress = 'CRITICAL'; stressLevel = 90;
                } else if (currentTemp > 30 || currentHumidity > 70 || currentWind > 25 || (weatherCode >= 61 && weatherCode <= 69)) {
                    stress = 'HIGH'; stressLevel = 70;
                } else if (currentTemp > 25) {
                    stress = 'MODERATE'; stressLevel = 45;
                }

                const impact = (stressLevel / 20).toFixed(1);
                setWeather({
                    temp: currentTemp, humidity: currentHumidity, wind: currentWind, uv: currentUV,
                    stress: stress, stressLevel: stressLevel, lifeImpact: `-${impact}%`,
                    condition: condition, icon: WeatherIcon
                });
            } catch (error) {
                console.error("Weather sync failed", error);
            }
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => fetchRealWeather(pos.coords.latitude, pos.coords.longitude),
                () => fetchRealWeather(28.6139, 77.2090)
            );
        } else {
            fetchRealWeather(28.6139, 77.2090);
        }
    }, []);

    const Metric = ({ icon: Icon, label, value, color, percent }: any) => (
        <div className="resilience-metric-compact" style={{ 
            display: 'flex', flexDirection: 'column', padding: '12px 16px', background: 'var(--bg-surface)', 
            borderRadius: '16px', border: '1px solid var(--border)', flex: 1, minWidth: '140px', opacity: 0.9
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Icon size={14} color={color} />
                <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-main)', marginBottom: 6 }}>{value}</div>
            <div style={{ height: 2, background: 'var(--border)', borderRadius: 1 }}>
                <div style={{ width: `${percent}%`, height: '100%', background: color, boxShadow: `0 0 8px ${color}44` }}></div>
            </div>
        </div>
    );

    return (
        <div className="intelligence-hub" style={{ marginTop: '24px' }}>
            <div className="stat-card" style={{ 
                padding: '20px 24px', borderRadius: '28px', border: '1px solid var(--border)', 
                background: 'var(--bg-card)', boxShadow: 'var(--shadow-premium)' 
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'var(--primary-glow)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Gauge size={20} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 900, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.12em', lineHeight: 1.2 }}>
                            LIVE RESILIENCE HUD
                        </h3>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="status-badge-static" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', padding: '5px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px var(--success)' }}></span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--success)', fontWeight: 900, letterSpacing: '0.05em' }}>SYNCHRONIZED</span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '6px' }} className="custom-scrollbar">
                    <Metric icon={weather.icon} label="Surface" value={`${weather.temp}°C`} color="#3b82f6" percent={weather.temp * 2} />
                    <Metric icon={Droplets} label="Humidity" value={`${weather.humidity}%`} color="#06b6d4" percent={weather.humidity} />
                    <Metric icon={Wind} label="Wind" value={`${weather.wind}km/h`} color="#a78bfa" percent={weather.wind * 2} />
                    <Metric icon={Activity} label="Stress" value={weather.stress} color={weather.stress === 'CRITICAL' ? 'var(--danger)' : 'var(--success)'} percent={weather.stressLevel} />
                    <Metric icon={Sun} label="Solar" value={`UV ${weather.uv}`} color="#f59e0b" percent={weather.uv * 10} />
                    <Metric icon={TrendingDown} label="Aging" value={weather.lifeImpact} color="#fb7185" percent={weather.stressLevel / 2} />
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { display: none; }
            `}</style>
        </div>
    );
};

export default IntelligenceHub;
