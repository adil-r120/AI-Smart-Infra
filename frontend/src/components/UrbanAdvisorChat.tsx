import React, { useState, useEffect, useRef } from 'react';
import { 
    Bot, Send, User, X, Minimize2, Sparkles, Terminal, 
    Camera, AlertTriangle, CloudRain, ShieldCheck, HelpCircle, 
    ChevronRight, ArrowRight, CheckCircle2 
} from 'lucide-react';

interface Message {
    id: number;
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
    tag?: 'ADVISORY' | 'GUIDE' | 'STATUS' | 'SAFETY';
    actionTab?: string;
    actionLabel?: string;
}

interface UrbanAdvisorChatProps {
    setActiveTab?: (tab: string) => void;
}

const UrbanAdvisorChat: React.FC<UrbanAdvisorChatProps> = ({ setActiveTab }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 1,
            text: "Hello! I am your Smart AI Advisor. I'm here to help you report road hazards, scan potholes with your camera, and track repair updates.",
            sender: 'ai',
            tag: 'GUIDE',
            timestamp: new Date()
        }
    ]);

    const chatEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const suggestions = [
        { label: "Report a Pothole", query: "How do I report a pothole or road issue?", tab: "Report" },
        { label: "Live Camera Scan", query: "How does the live camera detection work?", tab: "Webcam" },
        { label: "Upload Photo", query: "How do I scan an image from my phone?", tab: "Scanner" },
        { label: "What AI Detects", query: "What kind of road damage can Smart-Infra detect?", tab: undefined }
    ];

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isTyping, isOpen]);

    const handleSend = (textToUse?: string) => {
        const text = (textToUse || input).trim();
        if (!text) return;

        const userMsg: Message = {
            id: Date.now(),
            text,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsTyping(true);

        setTimeout(() => {
            const { response, tag, actionTab, actionLabel } = generateAdvisorResponse(text);
            const aiMsg: Message = {
                id: Date.now() + 1,
                text: response,
                sender: 'ai',
                tag,
                timestamp: new Date(),
                actionTab,
                actionLabel
            };
            setMessages(prev => [...prev, aiMsg]);
            setIsTyping(false);
        }, 800);
    };

    const generateAdvisorResponse = (query: string): { 
        response: string; 
        tag?: 'ADVISORY' | 'GUIDE' | 'STATUS' | 'SAFETY'; 
        actionTab?: string; 
        actionLabel?: string; 
    } => {
        const q = query.toLowerCase();

        if (q.includes('report') || q.includes('submit') || q.includes('complaint')) {
            return {
                response: "To report a road issue: Click 'Report Pothole', upload a photo of the damaged road, specify the severity, and confirm your location. Your report will be instantly verified by our AI and forwarded to city road repair teams.",
                tag: 'GUIDE',
                actionTab: 'Report',
                actionLabel: 'Open Report Form'
            };
        }

        if (q.includes('camera') || q.includes('live') || q.includes('webcam') || q.includes('realtime') || q.includes('real time')) {
            return {
                response: "The Live Feed feature lets you mount your smartphone or dashcam while driving. Our Edge AI analyzes incoming video at 30 FPS, highlighting potholes and cracks in real-time with bounding boxes and confidence scores.",
                tag: 'GUIDE',
                actionTab: 'Webcam',
                actionLabel: 'Open Live Camera Feed'
            };
        }

        if (q.includes('upload') || q.includes('image') || q.includes('photo') || q.includes('scanner') || q.includes('scan')) {
            return {
                response: "You can drag and drop any road photo or dashcam snapshot into the 'Upload Issues' scanner. The AI model checks it in under 1 second for surface cracks, potholes, and depth estimations.",
                tag: 'GUIDE',
                actionTab: 'Scanner',
                actionLabel: 'Go to Photo Scanner'
            };
        }

        if (q.includes('detect') || q.includes('what kind') || q.includes('type') || q.includes('damage') || q.includes('crack')) {
            return {
                response: "Smart-Infra's neural network is trained to detect: \n• Potholes & deep craters\n• Longitudinal & alligator road cracks\n• Water puddles & surface leakages\n• Roadway debris and hazards\nAll with over 90%+ detection accuracy.",
                tag: 'ADVISORY'
            };
        }

        if (q.includes('track') || q.includes('my report') || q.includes('status')) {
            return {
                response: "You can check the status of all your submitted reports in the 'Report & Track' section. Statuses range from 'Pending Verification' to 'Work Scheduled' and 'Repair Completed'.",
                tag: 'STATUS',
                actionTab: 'Report',
                actionLabel: 'View My Reports'
            };
        }

        if (q.includes('weather') || q.includes('rain') || q.includes('heat') || q.includes('stress')) {
            return {
                response: "Extreme summer heat and monsoon water accumulation are the #1 cause of asphalt joint expansion and pothole formation. During heavy rains, drive cautiously as standing water often hides deep potholes.",

            };
        }

        if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
            return {
                response: "Hello! How can I assist your travel today? You can ask me how to report a pothole, start a live road scan, or check our detection capabilities.",

            };
        }

        return {
            response: "I'm your Smart-Infra AI assistant. You can use this platform to spot road damage with your camera, upload photos for instant AI analysis, and submit reports to help keep our city roads safe.",

        };
    };

    return (
        <div className="urban-advisor-citizen-root" style={{ position: 'fixed', bottom: '28px', right: '28px', zIndex: 9999 }}>
            {/* FLOATING CHAT WINDOW */}
            {isOpen && (
                <div 
                    className="uac-window"
                    style={{
                        position: 'absolute',
                        bottom: '80px',
                        right: '0',
                        width: '420px',
                        height: '600px',
                        maxWidth: 'calc(100vw - 36px)',
                        maxHeight: 'calc(100vh - 110px)',
                        background: '#ffffff',
                        borderRadius: '24px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.18), 0 0 25px rgba(99, 102, 241, 0.12)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        animation: 'uac-pop-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: '16px 20px',
                        background: '#ffffff',
                        borderBottom: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '12px',
                                background: '#0a0f1e',
                                border: '1px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                padding: '2px',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
                            }}>
                                <img 
                                    src="/smart-infra-logo-v1.jpg" 
                                    alt="Smart-Infra AI" 
                                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', borderRadius: '10px' }} 
                                />
                            </div>
                            <div>
                                <h3 style={{
                                    margin: 0,
                                    fontSize: '0.98rem',
                                    fontWeight: 800,
                                    color: '#0f172a',
                                    letterSpacing: '-0.01em',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                    Smart AI Advisor
                                </h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                    <span style={{
                                        width: '7px',
                                        height: '7px',
                                        borderRadius: '50%',
                                        background: '#10b981',
                                        boxShadow: '0 0 6px rgba(16, 185, 129, 0.6)',
                                        display: 'inline-block'
                                    }} />
                                    <span style={{
                                        fontSize: '0.68rem',
                                        color: '#059669',
                                        fontWeight: 700,
                                        letterSpacing: '0.06em',
                                        textTransform: 'uppercase'
                                    }}>
                                        Online
                                    </span>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={() => setIsOpen(false)}
                            title="Close Advisor"
                            style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: '#f1f5f9',
                                border: '1px solid #e2e8f0',
                                color: '#64748b',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Minimize2 size={16} />
                        </button>
                    </div>

                    {/* Messages Body */}
                    <div 
                        ref={scrollContainerRef}
                        style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px',
                            background: '#f8fafc'
                        }}
                    >
                        {messages.map((msg) => (
                            <div 
                                key={msg.id}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                                    gap: '4px'
                                }}
                            >
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '8px',
                                    maxWidth: '88%',
                                    flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row'
                                }}>
                                    {msg.sender === 'ai' && (
                                        <div style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '8px',
                                            background: '#0a0f1e',
                                            border: '1px solid #e2e8f0',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            marginTop: '2px',
                                            padding: '1px',
                                            overflow: 'hidden',
                                            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)'
                                        }}>
                                            <img 
                                                src="/smart-infra-logo-v1.jpg" 
                                                alt="AI" 
                                                style={{ 
                                                    width: '100%', 
                                                    height: '100%', 
                                                    objectFit: 'contain', 
                                                    borderRadius: '6px',
                                                    display: 'block'
                                                }} 
                                            />
                                        </div>
                                    )}

                                    <div style={{
                                        padding: '12px 16px',
                                        borderRadius: '16px',
                                        fontSize: '0.9rem',
                                        lineHeight: 1.55,
                                        background: msg.sender === 'user' 
                                            ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' 
                                            : '#ffffff',
                                        color: msg.sender === 'user' ? '#ffffff' : '#1e293b',
                                        border: msg.sender === 'user'
                                            ? '1px solid rgba(99, 102, 241, 0.4)'
                                            : '1px solid #e2e8f0',
                                        borderTopRightRadius: msg.sender === 'user' ? '4px' : '16px',
                                        borderTopLeftRadius: msg.sender === 'ai' ? '4px' : '16px',
                                        boxShadow: msg.sender === 'user'
                                            ? '0 4px 14px rgba(99, 102, 241, 0.28)'
                                            : '0 2px 8px rgba(0, 0, 0, 0.05)',
                                        whiteSpace: 'pre-line'
                                    }}>
                                        {msg.text}

                                        {/* Action button if answer offers direct app navigation */}
                                        {msg.actionTab && setActiveTab && (
                                            <button
                                                onClick={() => {
                                                    setActiveTab(msg.actionTab!);
                                                    setIsOpen(false);
                                                }}
                                                style={{
                                                    marginTop: '10px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '7px 14px',
                                                    borderRadius: '8px',
                                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                                    border: 'none',
                                                    color: '#ffffff',
                                                    fontWeight: 700,
                                                    fontSize: '0.78rem',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 2px 10px rgba(99, 102, 241, 0.35)'
                                                }}
                                            >
                                                <span>{msg.actionLabel || 'Navigate'}</span>
                                                <ArrowRight size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <span style={{
                                    fontSize: '0.64rem',
                                    color: '#94a3b8',
                                    marginTop: '2px',
                                    padding: '0 4px',
                                    marginLeft: msg.sender === 'ai' ? '34px' : '0'
                                }}>
                                    {msg.sender === 'ai' ? 'Smart-Infra AI' : 'You'} • {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ))}

                        {isTyping && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', width: 'fit-content', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)' }}>
                                <img src="/smart-infra-logo-v1.jpg" alt="AI" style={{ width: '20px', height: '20px', borderRadius: '6px', objectFit: 'contain', background: '#0a0f1e', padding: '1px' }} />
                                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Advisor is thinking...</span>
                            </div>
                        )}

                        <div ref={chatEndRef} />
                    </div>

                    {/* Quick Suggestions Chips */}
                    <div style={{
                        padding: '10px 16px',
                        display: 'flex',
                        gap: '8px',
                        overflowX: 'auto',
                        background: '#ffffff',
                        borderTop: '1px solid #e2e8f0'
                    }}>
                        {suggestions.map((item, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleSend(item.query)}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '99px',
                                    background: '#f8fafc',
                                    border: '1px solid #cbd5e1',
                                    color: '#334155',
                                    fontSize: '0.74rem',
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
                                }}
                            >
                                <Sparkles size={11} color="#6366f1" />
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Input Bar */}
                    <div style={{
                        padding: '14px 16px',
                        background: '#ffffff',
                        borderTop: '1px solid #e2e8f0'
                    }}>
                        <form 
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSend();
                            }}
                            style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
                        >
                            <div style={{ flex: 1, position: 'relative' }}>
                                <input 
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask anything about safety..."
                                    style={{
                                        width: '100%',
                                        background: '#f8fafc',
                                        border: '1.5px solid #cbd5e1',
                                        borderRadius: '12px',
                                        padding: '11px 14px 11px 36px',
                                        color: '#0f172a',
                                        fontSize: '0.88rem',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <Terminal size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6366f1' }} />
                            </div>

                            <button 
                                type="submit"
                                disabled={!input.trim()}
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '12px',
                                    background: input.trim() 
                                        ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' 
                                        : '#f1f5f9',
                                    color: input.trim() ? '#ffffff' : '#94a3b8',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: input.trim() ? 'pointer' : 'default',
                                    transition: 'all 0.2s',
                                    boxShadow: input.trim() ? '0 4px 14px rgba(99, 102, 241, 0.4)' : 'none',
                                    flexShrink: 0
                                }}
                            >
                                <Send size={16} />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* FLOATING ACTION BUTTON (FAB) */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                title="Smart-Infra AI Advisor"
                aria-label="Smart-Infra AI Advisor"
                style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '16px',
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    color: '#0f172a',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15), 0 0 20px rgba(99, 102, 241, 0.25)',
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    position: 'relative',
                    padding: '3px',
                    overflow: 'visible'
                }}
            >
                {isOpen ? (
                    <X size={26} color="#6366f1" />
                ) : (
                    <>
                        <div style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '12px',
                            background: '#0a0f1e',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <img 
                                src="/smart-infra-logo-v1.jpg" 
                                alt="Smart-Infra AI" 
                                style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    objectFit: 'contain', 
                                    display: 'block' 
                                }} 
                            />
                        </div>
                        {/* Pulse dot */}
                        <span style={{
                            position: 'absolute',
                            top: '-3px',
                            right: '-3px',
                            width: '13px',
                            height: '13px',
                            borderRadius: '50%',
                            background: '#10b981',
                            border: '2.5px solid #ffffff',
                            boxShadow: '0 0 8px #10b981'
                        }} />
                    </>
                )}
            </button>

            <style>{`
                @keyframes uac-pop-in {
                    from {
                        opacity: 0;
                        transform: translateY(20px) scale(0.96);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
            `}</style>
        </div>
    );
};

export default UrbanAdvisorChat;
