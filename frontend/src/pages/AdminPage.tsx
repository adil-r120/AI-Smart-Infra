import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Activity, Settings, Bell, LayoutDashboard, Database, ShieldAlert, Search } from 'lucide-react';

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState('overview');

    const sidebarItems = [
        { id: 'overview', icon: <LayoutDashboard size={20} />, label: 'Overview' },
        { id: 'users', icon: <Users size={20} />, label: 'User Management' },
        { id: 'system', icon: <Activity size={20} />, label: 'System Health' },
        { id: 'database', icon: <Database size={20} />, label: 'Data Hub' },
        { id: 'alerts', icon: <ShieldAlert size={20} />, label: 'Alerts & Security' },
        { id: 'settings', icon: <Settings size={20} />, label: 'Settings' },
    ];

    const stats = [
        { label: 'Total Active Users', value: '1,248', change: '+12%', color: 'from-blue-500 to-indigo-600' },
        { label: 'System Uptime', value: '99.9%', change: '+0.1%', color: 'from-emerald-500 to-teal-600' },
        { label: 'Pending Alerts', value: '23', change: '-5', color: 'from-orange-500 to-red-600' },
        { label: 'Network Load', value: '42%', change: 'Stable', color: 'from-purple-500 to-pink-600' },
    ];

    const renderOverview = () => (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="ap-overview"
        >
            <div className="ap-stats-grid">
                {stats.map((stat, i) => (
                    <motion.div 
                        key={stat.label}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className={`ap-stat-card`}
                    >
                        <div className={`ap-stat-bg bg-gradient-to-br ${stat.color}`} />
                        <div className="ap-stat-content">
                            <h3>{stat.label}</h3>
                            <div className="ap-stat-main">
                                <span className="ap-stat-val">{stat.value}</span>
                                <span className="ap-stat-change">{stat.change}</span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="ap-charts-area">
                <div className="ap-chart-placeholder">
                    <h4>Real-time Infrastructure Load</h4>
                    <div className="ap-mock-chart">
                        {[40, 60, 30, 80, 50, 70, 45, 90].map((h, i) => (
                            <motion.div 
                                key={i}
                                initial={{ height: 0 }}
                                animate={{ height: `${h}%` }}
                                transition={{ delay: 0.3 + i * 0.1, type: "spring" }}
                                className="ap-bar"
                            />
                        ))}
                    </div>
                </div>
                <div className="ap-recent-activity">
                    <h4>Recent Alerts</h4>
                    <ul>
                        {[
                            { id: 1, msg: "High latency detected in Zone B", time: "2 min ago" },
                            { id: 2, msg: "New admin user registered", time: "15 min ago" },
                            { id: 3, msg: "Database backup completed", time: "1 hour ago" },
                        ].map((alert, i) => (
                            <motion.li 
                                key={alert.id}
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.5 + i * 0.1 }}
                            >
                                <span className="ap-alert-dot" />
                                <span className="ap-alert-msg">{alert.msg}</span>
                                <span className="ap-alert-time">{alert.time}</span>
                            </motion.li>
                        ))}
                    </ul>
                </div>
            </div>
        </motion.div>
    );

    return (
        <div className="ap-layout">
            {/* Sidebar */}
            <motion.aside 
                initial={{ x: -250 }}
                animate={{ x: 0 }}
                className="ap-sidebar"
            >
                <div className="ap-brand">
                    <img src="/smart-infra-logo-v1.jpg" alt="Smart-Infra AI Logo" className="ap-logo" />
                    <h2>Smart-Infra AI</h2>
                </div>
                <nav className="ap-nav">
                    {sidebarItems.map(item => (
                        <button 
                            key={item.id}
                            className={`ap-nav-item ${activeTab === item.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(item.id)}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                            {activeTab === item.id && (
                                <motion.div layoutId="activeTab" className="ap-nav-active-bg" />
                            )}
                        </button>
                    ))}
                </nav>
            </motion.aside>

            {/* Main Content */}
            <main className="ap-main">
                {/* Header */}
                <header className="ap-header">
                    <div className="ap-search">
                        <Search size={18} />
                        <input type="text" placeholder="Search resources, users..." />
                    </div>
                    <div className="ap-header-actions">
                        <button className="ap-icon-btn">
                            <Bell size={20} />
                            <span className="ap-badge" />
                        </button>
                        <div className="ap-profile">
                            <div className="ap-avatar">AD</div>
                            <span>Admin</span>
                        </div>
                    </div>
                </header>

                {/* Dashboard Content */}
                <div className="ap-content">
                    <h1 className="ap-page-title">
                        {sidebarItems.find(i => i.id === activeTab)?.label}
                    </h1>
                    <AnimatePresence mode="wait">
                        {activeTab === 'overview' ? renderOverview() : (
                            <motion.div 
                                key={activeTab}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="ap-placeholder-page"
                            >
                                <Activity size={48} className="ap-placeholder-icon" />
                                <h2>{sidebarItems.find(i => i.id === activeTab)?.label} module</h2>
                                <p>This section is under construction.</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            <style>{`
                .ap-layout {
                    display: flex;
                    height: 100vh;
                    background-color: #020617;
                    color: #f8fafc;
                    font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
                    overflow: hidden;
                }

                /* Sidebar */
                .ap-sidebar {
                    width: 260px;
                    background: rgba(15, 23, 42, 0.6);
                    backdrop-filter: blur(20px);
                    border-right: 1px solid rgba(255, 255, 255, 0.05);
                    display: flex;
                    flex-direction: column;
                    padding: 24px 16px;
                    z-index: 10;
                }

                .ap-brand {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 40px;
                    padding: 0 8px;
                }

                .ap-logo {
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                    object-fit: contain;
                    background: #0a0f1e;
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
                    flex-shrink: 0;
                }

                .ap-brand h2 {
                    font-size: 1.2rem;
                    font-weight: 800;
                    margin: 0;
                    background: linear-gradient(135deg, #fff, #818cf8);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .ap-nav {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .ap-nav-item {
                    position: relative;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                    background: transparent;
                    border: none;
                    color: #94a3b8;
                    font-size: 0.95rem;
                    font-weight: 600;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: color 0.2s;
                    text-align: left;
                    font-family: inherit;
                }

                .ap-nav-item:hover {
                    color: #e2e8f0;
                }

                .ap-nav-item.active {
                    color: #fff;
                }

                .ap-nav-active-bg {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(90deg, rgba(99,102,241,0.2) 0%, rgba(99,102,241,0.05) 100%);
                    border-left: 3px solid #6366f1;
                    border-radius: 12px;
                    z-index: -1;
                }

                /* Main Content */
                .ap-main {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    background: radial-gradient(circle at top right, rgba(99,102,241,0.05), transparent 40%);
                }

                /* Header */
                .ap-header {
                    height: 72px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 32px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                }

                .ap-search {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    background: rgba(255, 255, 255, 0.03);
                    padding: 8px 16px;
                    border-radius: 20px;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    width: 300px;
                }

                .ap-search input {
                    background: transparent;
                    border: none;
                    color: #fff;
                    font-size: 0.9rem;
                    width: 100%;
                    outline: none;
                    font-family: inherit;
                }

                .ap-search input::placeholder {
                    color: #64748b;
                }

                .ap-header-actions {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                }

                .ap-icon-btn {
                    position: relative;
                    background: transparent;
                    border: none;
                    color: #94a3b8;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: color 0.2s;
                }
                
                .ap-icon-btn:hover { color: #fff; }

                .ap-badge {
                    position: absolute;
                    top: -2px;
                    right: -2px;
                    width: 8px;
                    height: 8px;
                    background: #ef4444;
                    border-radius: 50%;
                    box-shadow: 0 0 0 2px #020617;
                }

                .ap-profile {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-size: 0.9rem;
                    font-weight: 600;
                    cursor: pointer;
                }

                .ap-avatar {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 800;
                    color: #fff;
                }

                /* Content Area */
                .ap-content {
                    flex: 1;
                    padding: 32px;
                    overflow-y: auto;
                }

                .ap-page-title {
                    font-size: 1.8rem;
                    font-weight: 800;
                    margin: 0 0 32px;
                    color: #f1f5f9;
                }

                /* Overview Grid */
                .ap-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                    gap: 20px;
                    margin-bottom: 24px;
                }

                .ap-stat-card {
                    position: relative;
                    padding: 24px;
                    border-radius: 20px;
                    background: rgba(30, 41, 59, 0.4);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    overflow: hidden;
                }

                .ap-stat-bg {
                    position: absolute;
                    inset: 0;
                    opacity: 0.1;
                    z-index: 0;
                }

                .bg-gradient-to-br { background-image: linear-gradient(to bottom right, var(--tw-gradient-stops)); }
                .from-blue-500 { --tw-gradient-from: #3b82f6; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(59, 130, 246, 0)); }
                .to-indigo-600 { --tw-gradient-to: #4f46e5; }
                .from-emerald-500 { --tw-gradient-from: #10b981; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(16, 185, 129, 0)); }
                .to-teal-600 { --tw-gradient-to: #0d9488; }
                .from-orange-500 { --tw-gradient-from: #f97316; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(249, 115, 22, 0)); }
                .to-red-600 { --tw-gradient-to: #dc2626; }
                .from-purple-500 { --tw-gradient-from: #a855f7; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(168, 85, 247, 0)); }
                .to-pink-600 { --tw-gradient-to: #db2777; }

                .ap-stat-content {
                    position: relative;
                    z-index: 1;
                }

                .ap-stat-content h3 {
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: #94a3b8;
                    margin: 0 0 12px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .ap-stat-main {
                    display: flex;
                    align-items: baseline;
                    justify-content: space-between;
                }

                .ap-stat-val {
                    font-size: 2rem;
                    font-weight: 800;
                    color: #fff;
                }

                .ap-stat-change {
                    font-size: 0.85rem;
                    font-weight: 700;
                    color: #10b981;
                    background: rgba(16, 185, 129, 0.1);
                    padding: 4px 8px;
                    border-radius: 6px;
                }

                .ap-charts-area {
                    display: grid;
                    grid-template-columns: 2fr 1fr;
                    gap: 20px;
                }

                .ap-chart-placeholder, .ap-recent-activity {
                    background: rgba(30, 41, 59, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 20px;
                    padding: 24px;
                }

                .ap-chart-placeholder h4, .ap-recent-activity h4 {
                    margin: 0 0 24px;
                    font-size: 1.1rem;
                    font-weight: 700;
                }

                .ap-mock-chart {
                    height: 200px;
                    display: flex;
                    align-items: flex-end;
                    justify-content: space-around;
                    gap: 12px;
                }

                .ap-bar {
                    flex: 1;
                    background: linear-gradient(180deg, #6366f1, rgba(99,102,241,0.2));
                    border-radius: 6px 6px 0 0;
                }

                .ap-recent-activity ul {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .ap-recent-activity li {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .ap-alert-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: #6366f1;
                }

                .ap-alert-msg {
                    flex: 1;
                    font-size: 0.9rem;
                    color: #cbd5e1;
                }

                .ap-alert-time {
                    font-size: 0.75rem;
                    color: #64748b;
                }

                .ap-placeholder-page {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 400px;
                    color: #64748b;
                }

                .ap-placeholder-icon {
                    margin-bottom: 16px;
                    opacity: 0.5;
                }

                .ap-placeholder-page h2 {
                    margin: 0 0 8px;
                    color: #94a3b8;
                }

                @media (max-width: 1024px) {
                    .ap-charts-area {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
}
