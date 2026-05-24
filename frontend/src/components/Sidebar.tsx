import React from "react";
import { Home, Monitor, Calendar, Settings, Map as MapIcon, X, ShieldAlert, FileText, Camera, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    cameraActive: boolean;
    handleCameraToggle: () => void;
    isOpen?: boolean;
    toggleSidebar?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, cameraActive, handleCameraToggle, isOpen, toggleSidebar }) => {
    const { logout, user } = useAuth();
    const menuItems = [
        { id: "Home", label: "Dashboard", Icon: Home },
        { id: "Map", label: "Monitoring Map", Icon: MapIcon },
        { id: "History", label: "Detection Log", Icon: Calendar },
        { id: "Report", label: "Report Issue", Icon: FileText },
        { id: "Webcam", label: "Live Webcam", Icon: Camera },
        { id: "Configuration", label: "AI Config", Icon: Settings },
    ];

    return (
        <>
            <div
                className={`sidebar-overlay ${isOpen ? "open" : ""}`}
                onClick={toggleSidebar}
            />
            <aside className={`sidebar glass-sidebar ${isOpen ? "open" : ""}`}>
                <nav className="sidebar-nav">
                    <ul className="nav-list">
                        {menuItems.map(({ id, label, Icon }) => (
                            <li
                                key={id}
                                className={`nav-item-v2 ${activeTab === id ? "active" : ""}`}
                                onClick={() => { setActiveTab(id); toggleSidebar?.(); }}
                            >
                                <Icon size={20} />
                                <span>{label}</span>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className={`sidebar-footer-v2 ${activeTab === "Home" ? "has-button" : ""}`}>
                    {activeTab === "Home" && (
                        <button className="nav-item-v2 logout-btn" onClick={() => logout()}>
                            <LogOut size={20} />
                            <span>Log Out</span>
                        </button>
                    )}
                </div>
            </aside>

            <style>{`
                .sidebar {
                    width: 260px; height: 100vh; background: var(--bg-card);
                    border-right: 1px solid var(--border); padding: 32px 20px;
                    display: flex; flex-direction: column; z-index: 100; transition: var(--transition);
                    overflow-y: auto; overflow-x: hidden;
                }

                .nav-list { list-style: none; display: flex; flex-direction: column; gap: 6px; }
                .nav-item-v2 {
                    display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 12px;
                    color: var(--text-muted); font-size: 0.875rem; font-weight: 600; cursor: pointer;
                    transition: var(--transition); border: 1px solid transparent;
                }
                .nav-item-v2:hover { color: var(--primary); }
                .nav-item-v2.active { background: var(--primary-glow); color: var(--primary); border-color: rgba(249, 115, 22, 0.2); box-shadow: inset 0 0 100px rgba(249, 115, 22, 0.05); }

                .sidebar-nav { flex-shrink: 0; }
                .sidebar-footer-v2 {
                    margin: auto -20px 0 -20px; 
                    padding: 0 20px 40px 20px; 
                    border-top: 1px solid transparent;
                    flex-shrink: 0; transition: var(--transition);
                }
                .sidebar-footer-v2.has-button {
                    border-top: 1px solid var(--border);
                    padding-top: 24px;
                }
                .logout-btn {
                    width: 100%; height: auto; background: none; transition: 0.2s;
                    color: #ef4444; border: 1px solid transparent;
                }
                .logout-btn:hover {
                    background: rgba(239, 68, 68, 0.1); color: #f87171; border-color: rgba(239, 68, 68, 0.2);
                }
                
                .btn-camera-toggle {
                    width: 100%; padding: 12px; border-radius: 12px; border: 1px solid var(--border);
                    background: var(--bg-surface); color: var(--text-main); font-weight: 700;
                    display: flex; align-items: center; justify-content: center; gap: 10px;
                    cursor: pointer; transition: var(--transition); font-size: 0.75rem;
                }
                .btn-camera-toggle:hover { border-color: var(--primary); }
                .btn-camera-toggle.active { background: var(--primary); color: white; border-color: var(--primary); box-shadow: 0 4px 15px var(--primary-glow); }
                
                .status-orb { width: 8px; height: 8px; border-radius: 50%; background: #64748b; transition: var(--transition); }
                .status-orb.online { background: #fff; box-shadow: 0 0 10px #fff; }
                
                .session-pill {
                    margin-top: 12px; padding: 6px; background: rgba(16,185,129,0.1);
                    color: var(--success); font-size: 0.65rem; font-weight: 800; border-radius: 6px;
                    text-align: center; border: 1px solid rgba(16,185,129,0.2);
                }
                .blink { animation: blink 1.5s infinite; margin-right: 4px; }
                @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

                @media (max-width: 900px) {
                    .sidebar { position: fixed; left: -260px; }
                    .sidebar.open { left: 0; }
                }
            `}</style>
        </>
    );
};

export default Sidebar;

