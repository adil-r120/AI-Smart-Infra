import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Bot, User, CloudRain, Thermometer, Activity, AlertTriangle, Sparkles, X, Minimize2, Wind, Droplets, Sun, Moon, Cloud, CloudLightning, Snowflake, ShieldCheck, TrendingDown, Eye, Gauge, Zap, ChevronDown, Terminal, Cpu } from 'lucide-react';

interface Message {
    id: number;
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
    tag?: 'ADVISORY' | 'INSIGHT' | 'CRITICAL' | 'SYSTEM';
}

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

const IntelligenceHub: React.FC<IntelligenceHubProps> = ({ detections = [], systemStats }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showScrollBtn, setShowScrollBtn] = useState(false);
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
    
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 1,
            text: "Initializing Urban AI Core... Syncing Satellite Telemetry... [DONE]",
            sender: 'ai',
            tag: 'SYSTEM',
            timestamp: new Date()
        },
        {
            id: 2,
            text: "Welcome Supervisor. I am monitoring 4,200+ infrastructure nodes. System is NOMINAL. How can I assist?",
            sender: 'ai',
            tag: 'INSIGHT',
            timestamp: new Date()
        }
    ]);
    
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const suggestions = [
        { label: "Scan Report", icon: Eye, query: "Provide latest scan analysis" },
        { label: "Weather Stress", icon: CloudRain, query: "Current weather impact on roads" },
        { label: "Infrastructure Health", icon: Activity, query: "System health check" }
    ];

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 100);
    };

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

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

    useEffect(() => {
        if (!showScrollBtn) scrollToBottom();
    }, [messages, isTyping]);

    const handleSend = async (textToUse?: string) => {
        const text = textToUse || input;
        if (!text.trim()) return;
        
        const userMsg: Message = { id: Date.now(), text: text, sender: 'user', timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsTyping(true);
        
        setTimeout(() => {
            const { response, tag } = getAiIntelligence(text);
            const aiMsg: Message = { id: Date.now() + 1, text: response, sender: 'ai', tag, timestamp: new Date() };
            setMessages(prev => [...prev, aiMsg]);
            setIsTyping(false);
        }, 1500);
    };

    const getAiIntelligence = (query: string): { response: string; tag: any } => {
        const q = query.toLowerCase();
        
        if (q.includes('scanner') || q.includes('detection') || q.includes('report')) {
            if (detections.length > 0) {
                const potholes = detections.filter(d => d.class === 'pothole').length;
                return { 
                    response: `AUDIT COMPLETE: I've cross-referenced current detections with our GIS database. ${potholes} critical potholes identified. I recommend dispatching repair drones to Sector 4 immediately.`,
                    tag: 'CRITICAL'
                };
            }
            return { response: "SCANNER OFFLINE: Awaiting spatial data input. Please provide a satellite or camera feed for Neural analysis.", tag: 'SYSTEM' };
        }

        if (q.includes('weather') || q.includes('stress') || q.includes('heat')) {
            return { 
                response: `PREDICTIVE MODEL: Current ${weather.temp}°C surface temp is causing a ${weather.stressLevel}% expansion rate in road joints. Estimated life impact is ${weather.lifeImpact} per cycle.`,
                tag: 'ADVISORY'
            };
        }

        if (q.includes('health') || q.includes('stats') || q.includes('risk')) {
            return { 
                response: `GLOBAL STATUS: Infrastructure Health at ${systemStats?.health || '94.2%'}. No catastrophic failures detected. 12 preventive maintenance tickets generated for review.`,
                tag: 'INSIGHT'
            };
        }

        return { response: "QUERY PROCESSED: Cross-referencing live Edge-AI datasets. Everything appears to be within normal operating parameters. What's next?", tag: 'INSIGHT' };
    };

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
        <>
            {/* Live HUD - Theme Aware */}
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
            </div>

            {/* AI Advisor Chat - Enhanced Logo Colors */}
            <div className="floating-ai-advisor" style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 9999 }}>
                {isOpen && (
                    <div className="chat-window-float animate-chat-in" style={{ 
                        position: 'absolute', bottom: '85px', right: '0', width: '440px', height: '650px', 
                        maxWidth: 'calc(100vw - 60px)', maxHeight: 'calc(100vh - 120px)',
                        background: 'var(--bg-card)', borderRadius: '36px', border: '1px solid var(--border)',
                        boxShadow: 'var(--shadow-premium)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
                        backdropFilter: 'blur(40px)'
                    }}>
                        {/* Premium Header with Branded Logo Color */}
                        <div style={{ padding: '24px 28px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div className="header-logo-container" style={{ 
                                width: 48, height: 48, borderRadius: '14px', 
                                background: 'linear-gradient(135deg, var(--primary), #8b5cf6)', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                                boxShadow: '0 8px 25px var(--primary-glow)' 
                            }}>
                                <Bot size={28} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '0.02em' }}>URBAN ADVISOR</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 10px var(--success)' }}></span>
                                    <span style={{ fontSize: '0.65rem', color: 'var(--success)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Neural Core: Online</span>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--border)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Minimize2 size={18} />
                            </button>
                        </div>

                        {/* Message Feed */}
                        <div 
                            ref={scrollContainerRef}
                            onScroll={handleScroll}
                            style={{ flex: 1, overflowY: 'auto', padding: '28px', display: 'flex', flexDirection: 'column', gap: '32px' }} 
                            className="custom-scrollbar"
                        >
                            {messages.map(msg => (
                                <div key={msg.id} style={{ 
                                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                                    maxWidth: '88%',
                                    display: 'flex',
                                    gap: 14,
                                    flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row'
                                }}>
                                    {msg.sender === 'ai' && (
                                        <div style={{ width: 34, height: 34, borderRadius: '10px', background: 'var(--primary-glow)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <Bot size={18} style={{ color: 'var(--primary)' }} />
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                                        {msg.tag && <span style={{ 
                                            fontSize: '0.6rem', fontWeight: 900, letterSpacing: '0.1em', marginBottom: 8, padding: '3px 10px', borderRadius: '5px',
                                            background: msg.tag === 'CRITICAL' ? 'var(--danger)' : 'var(--primary)',
                                            color: 'white', opacity: 0.9
                                        }}>{msg.tag}</span>}
                                        <div style={{ 
                                            padding: '16px 22px', borderRadius: '24px', fontSize: '0.92rem', fontWeight: 500, lineHeight: 1.6,
                                            background: msg.sender === 'user' ? 'var(--primary)' : 'var(--bg-surface)',
                                            color: msg.sender === 'user' ? 'white' : 'var(--text-main)',
                                            border: '1px solid var(--border)',
                                            borderTopLeftRadius: msg.sender === 'ai' ? '4px' : '24px',
                                            borderTopRightRadius: msg.sender === 'user' ? '4px' : '24px',
                                            boxShadow: msg.sender === 'user' ? 'var(--shadow-md)' : 'none'
                                        }}>
                                            {msg.text}
                                        </div>
                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                            {msg.sender === 'ai' ? 'NEURAL ADVISOR' : 'SUPERVISOR'} • {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {isTyping && (
                                <div style={{ alignSelf: 'flex-start', display: 'flex', gap: 14 }}>
                                    <div style={{ width: 34, height: 34, borderRadius: '10px', background: 'var(--bg-surface)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Bot size={18} style={{ color: 'var(--primary)' }} />
                                    </div>
                                    <div style={{ padding: '18px 24px', background: 'var(--bg-surface)', borderRadius: '4px 24px 24px 24px', border: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', gap: 5 }}>
                                            <span className="typing-dot" style={{ background: 'var(--primary)' }}></span>
                                            <span className="typing-dot" style={{ background: 'var(--primary)' }}></span>
                                            <span className="typing-dot" style={{ background: 'var(--primary)' }}></span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Quick Suggestions - Theme Aware */}
                        <div style={{ padding: '0 24px 20px 24px', display: 'flex', gap: 10, overflowX: 'auto' }} className="no-scrollbar">
                            {suggestions.map((s, i) => (
                                <button key={i} onClick={() => handleSend(s.query)} style={{ 
                                    padding: '10px 18px', borderRadius: '14px', background: 'var(--bg-surface)', border: '1px solid var(--border)',
                                    color: 'var(--text-main)', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s'
                                }}>
                                    <s.icon size={13} color="var(--primary)" /> {s.label}
                                </button>
                            ))}
                        </div>

                        {/* Input Area - Theme Aware */}
                        <div style={{ padding: '24px 28px 28px 28px', background: 'var(--bg-body)', borderTop: '1px solid var(--border)', opacity: 0.95 }}>
                            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                                <div style={{ flex: 1, position: 'relative' }}>
                                    <input 
                                        type="text" placeholder="Audit system telemetry..." value={input} 
                                        onChange={(e) => setInput(e.target.value)}
                                        style={{ 
                                            width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', 
                                            borderRadius: '18px', padding: '16px 22px 16px 52px', color: 'var(--text-main)', 
                                            fontSize: '1rem', outline: 'none', transition: 'all 0.3s' 
                                        }}
                                    />
                                    <Terminal size={18} style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                </div>
                                <button type="submit" style={{ 
                                    width: 56, height: 56, borderRadius: '18px', background: 'var(--primary)', 
                                    color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                    cursor: 'pointer', transition: 'all 0.3s', boxShadow: 'var(--shadow-md)' 
                                }}>
                                    <Send size={24} />
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* FAB - Branded Logo Color */}
                <button 
                    onClick={() => setIsOpen(!isOpen)} 
                    style={{ 
                        width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--bg-body), var(--bg-card))', 
                        border: '1px solid var(--border)', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        boxShadow: 'var(--shadow-premium)', transition: 'all 0.4s', position: 'relative',
                        transform: isOpen ? 'rotate(180deg) scale(0.9)' : 'scale(1)'
                    }}
                >
                    {isOpen ? <X size={28} /> : (
                        <div style={{ 
                            width: 52, height: 52, borderRadius: '50%', 
                            background: 'linear-gradient(135deg, var(--primary), #8b5cf6)', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                            boxShadow: '0 8px 20px var(--primary-glow)'
                        }}>
                            <Bot size={36} />
                        </div>
                    )}
                    {!isOpen && <span style={{ position: 'absolute', top: '14px', right: '14px', width: 12, height: 12, background: 'var(--success)', borderRadius: '50%', border: '2px solid var(--bg-body)', boxShadow: '0 0 15px var(--success)' }}></span>}
                </button>
            </div>

            <style>{`
                .animate-chat-in { animation: cinematic-in 0.5s cubic-bezier(0.165, 0.84, 0.44, 1); }
                @keyframes cinematic-in { from { opacity: 0; transform: translateY(30px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
                
                .typing-dot { width: 5px; height: 5px; border-radius: 50%; animation: bounce-mini 1.4s infinite; opacity: 0.8; margin: 0 1px; }
                .typing-dot:nth-child(2) { animation-delay: 0.2s; }
                .typing-dot:nth-child(3) { animation-delay: 0.4s; }
                @keyframes bounce-mini { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-7px); } }

                .custom-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
            `}</style>
        </>
    );
};

export default IntelligenceHub;
