import React from "react";
import { Home, Monitor, Calendar, Settings, Map as MapIcon, X, ShieldAlert, FileText, Camera, LogOut, ClipboardList, Scan, LayoutDashboard } from "lucide-react";
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
    const allMenuItems = [
        ...(user?.is_admin ? [
            { id: "Dashboard", label: "Dashboard", Icon: LayoutDashboard },
            { id: "Admin", label: "Admin Console", Icon: ShieldAlert },
            { id: "History", label: "Detection Log", Icon: Calendar },
        ] : []),
        ...(!user?.is_admin ? [
            { id: "Home", label: "Home", Icon: Home },
            { id: "Webcam", label: "Live Feed", Icon: Camera },
            { id: "Scanner", label: "Upload Issues", Icon: Scan },
            { id: "Report", label: "Report & Track", Icon: FileText },
        ] : []),
        { id: "Map", label: "Map", Icon: MapIcon },
        { id: "Configuration", label: "Settings", Icon: Settings },
    ];
    const menuItems = allMenuItems;

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

                <div className="sidebar-footer-v2 has-button">
                    <button className="nav-item-v2 logout-btn" onClick={() => logout()}>
                        <LogOut size={20} />
                        <span>Log Out</span>
                    </button>
                </div>
            </aside>

            <style>{`
                .sidebar {
                    width: 260px;
                    height: 100vh;
                    background: var(--bg-card);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    border-right: 1px solid var(--border);
                    box-shadow: 2px 0 16px rgba(0, 0, 0, 0.04);
                    padding: 32px 18px;
                    display: flex;
                    flex-direction: column;
                    z-index: 100;
                    transition: var(--transition);
                    overflow-y: auto;
                    overflow-x: hidden;
                }

                .nav-list {
                    list-style: none;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    margin: 0;
                    padding: 0;
                }

                .nav-item-v2 {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                    border-radius: 12px;
                    color: var(--text-muted);
                    font-size: 0.875rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                    border: 1px solid transparent;
                    border-left: 3.5px solid transparent;
                    user-select: none;
                }

                .nav-item-v2 svg {
                    flex-shrink: 0;
                    transition: transform 0.2s ease, color 0.2s ease;
                }

                .nav-item-v2:hover {
                    color: var(--primary);
                    background: var(--bg-hover, rgba(249, 115, 22, 0.06));
                    border-color: rgba(249, 115, 22, 0.12);
                    transform: translateX(4px);
                }

                .nav-item-v2:hover svg {
                    transform: scale(1.08);
                    color: var(--primary);
                }

                .nav-item-v2.active {
                    background: var(--primary-glow);
                    color: var(--primary);
                    border-color: rgba(249, 115, 22, 0.25);
                    border-left: 3.5px solid var(--primary);
                    box-shadow: 0 4px 16px rgba(249, 115, 22, 0.12);
                    font-weight: 700;
                }

                .nav-item-v2.active svg {
                    color: var(--primary);
                    filter: drop-shadow(0 0 6px var(--primary-glow));
                    transform: scale(1.06);
                }

                .sidebar-nav {
                    flex: 1;
                    flex-shrink: 0;
                }

                .sidebar-footer-v2 {
                    margin: auto -18px 0 -18px; 
                    padding: 0 18px 32px 18px; 
                    border-top: 1px solid transparent;
                    flex-shrink: 0;
                    transition: var(--transition);
                }

                .sidebar-footer-v2.has-button {
                    border-top: 1px solid var(--border);
                    padding-top: 20px;
                }

                .logout-btn {
                    width: 100%;
                    height: auto;
                    background: none;
                    color: #ef4444;
                    border: 1px solid transparent;
                    border-left: 3.5px solid transparent;
                    font-size: 0.875rem;
                    font-weight: 600;
                    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                }

                .logout-btn:hover {
                    background: rgba(239, 68, 68, 0.08);
                    color: #f87171;
                    border-color: rgba(239, 68, 68, 0.2);
                    border-left: 3.5px solid #ef4444;
                    transform: translateX(4px);
                    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.1);
                }

                .logout-btn:active {
                    transform: scale(0.98);
                }

                @media (max-width: 900px) {
                    .sidebar { position: fixed; left: -260px; }
                    .sidebar.open { left: 0; }
                }
            `}</style>
        </>
    );
};

export default Sidebar;

