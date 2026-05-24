import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import { Report, User, WorkOrder, AuditLogEntry } from "../types";
import { API_BASE } from "../api/config";
import { useAuth } from "../context/AuthContext";
import { CheckCircle, Trash2, Eye, EyeOff, MapPin, Calendar, Info, Search, Download, RefreshCw, BarChart3, TrendingUp, AlertTriangle, CheckSquare, Database, Camera, Users, Briefcase, Sparkles, Shield, Bell, X } from "lucide-react";
import UrbanAdvisorModal from "./UrbanAdvisorModal";

const getImageUrl = (path: string | null | undefined) => {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    const cleanPath = path.replace(/\\/g, '/').replace(/^\/+/, '');
    if (cleanPath.startsWith('uploads/')) return `${API_BASE}/${cleanPath}`;
    return `${API_BASE}/uploads/${cleanPath}`;
};

interface AdminConsoleProps {
    alerts?: any[];
    onDismissAlert?: (id: number) => void;
}

const AdminConsole: React.FC<AdminConsoleProps> = ({ alerts = [], onDismissAlert }) => {
    const { token, loading: authLoading } = useAuth();
    const authHeaders = useMemo(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);
    
    const [reports, setReports] = useState<Report[]>([]);
    const [filteredReports, setFilteredReports] = useState<Report[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;
    const [selectedReports, setSelectedReports] = useState<number[]>([]);
    const [bulkAction, setBulkAction] = useState<"none" | "resolve" | "delete">("none");
    const [activeTab, setActiveTab] = useState<'issues' | 'personnel' | 'work-orders' | 'audit-logs' | 'alerts'>('issues');
    
    interface ToastMessage {
        id: number;
        message: string;
        type: 'success' | 'error' | 'info';
    }
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const [resolveModal, setResolveModal] = useState<{ reportId: number | 'bulk' } | null>(null);
    const [resolveNote, setResolveNote] = useState("");
    const [isBriefingOpen, setIsBriefingOpen] = useState(false);
    const [inviteTokenModal, setInviteTokenModal] = useState<{ token: string; expiresAt: string } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3500);
    };

    const getSeverity = (type?: string) => {
        const safeType = type || 'other';
        switch(safeType.toLowerCase()) {
            case 'pothole':
            case 'road_damage':
                return { label: 'CRITICAL', conf: 96, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
            case 'traffic_signal':
            case 'broken_streetlight':
                return { label: 'HIGH', conf: 89, color: '#eab308', bg: 'rgba(234, 179, 8, 0.1)' };
            case 'flooding':
            case 'fallen_tree':
                return { label: 'SEVERE', conf: 92, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' };
            default:
                return { label: 'MODERATE', conf: 75, color: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)' };
        }
    };

    const ISSUE_LABELS: Record<string, string> = {
        'pothole': 'Pothole',
        'broken_streetlight': 'Streetlight',
        'fallen_tree': 'Fallen Tree',
        'flooding': 'Flooding',
        'traffic_signal': 'Traffic Signal',
        'garbage_dump': 'Garbage',
        'road_damage': 'Road Damage',
        'other': 'Other'
    };
    
    // Core stats from /admin/stats
    const [stats, setStats] = useState({ 
        total: 0, 
        pending: 0, 
        resolved: 0, 
        today: 0,
        users_count: 0,
        detections_count: 0,
        work_orders_count: 0
    });

    const fetchAdminData = useCallback(async () => {
        if (!token) {
            console.warn("No token available, skipping data fetch");
            return;
        }
        
        setLoading(true);
        try {
            console.log("Fetching admin data with token:", token.substring(0, 20) + "...");
            
            const [reportsRes, statsRes, usersRes, ordersRes, auditLogsRes] = await Promise.allSettled([
                axios.get(`${API_BASE}/reports`, { headers: authHeaders }),
                axios.get(`${API_BASE}/admin/stats`, { headers: authHeaders }),
                axios.get(`${API_BASE}/users`, { headers: authHeaders }),
                axios.get(`${API_BASE}/work-orders`, { headers: authHeaders }),
                axios.get(`${API_BASE}/admin/audit-logs`, { headers: authHeaders })
            ]);

            // Apply each result individually so partial failures don't block everything
            if (reportsRes.status === "fulfilled") {
                setReports(reportsRes.value.data);
            } else {
                console.error("Failed to load reports:", reportsRes.reason);
            }
            if (statsRes.status === "fulfilled") {
                setStats(statsRes.value.data);
            } else {
                console.error("Failed to load stats:", statsRes.reason);
            }
            if (usersRes.status === "fulfilled") {
                setUsers(usersRes.value.data);
            } else {
                console.error("Failed to load users:", usersRes.reason);
            }
            if (ordersRes.status === "fulfilled") {
                setWorkOrders(ordersRes.value.data);
            } else {
                console.error("Failed to load work orders:", ordersRes.reason);
            }
            if (auditLogsRes.status === "fulfilled") {
                setAuditLogs(auditLogsRes.value.data);
            } else {
                console.error("Failed to load audit logs:", auditLogsRes.reason);
            }

            const failures = [reportsRes, statsRes, usersRes, ordersRes, auditLogsRes].filter(
                r => r.status === "rejected"
            ) as PromiseRejectedResult[];

            if (failures.length > 0) {
                const firstErr = failures[0].reason;
                const status = firstErr?.response?.status;
                const detail = firstErr?.response?.data?.detail;
                const errorMessage =
                    status === 401
                        ? "Authentication expired. Please login again."
                        : status === 403
                        ? "Access denied. Admin privileges required."
                        : detail
                        ? `Sync error: ${detail}`
                        : `${failures.length} endpoint(s) failed to sync. Check console for details.`;
                showToast(errorMessage, "error");
            } else {
                console.log("Admin data fetched successfully");
            }
        } catch (err: any) {
            console.error("Unexpected error fetching admin data", err);
            showToast("Unexpected error loading admin console.", "error");
        } finally {
            setLoading(false);
        }
    }, [token, authHeaders]);

    const fetchReports = fetchAdminData; // Preserve name for existing calls

    useEffect(() => {
        console.log("Auth loading:", authLoading, "Token:", token ? "present" : "null");
        
        // Only fetch data when auth is done loading and we have a token
        if (!authLoading && token) {
            fetchAdminData();
        } else if (!authLoading && !token) {
            // Auth finished but no token - stop loading
            console.warn("No token after auth loaded");
            setLoading(false);
        }
    }, [authLoading, token, fetchAdminData]);

    useEffect(() => {
        let filtered = [...reports];

        // Apply status filter
        if (statusFilter !== "all") {
            filtered = filtered.filter(r => (r.status || "").toLowerCase() === statusFilter.toLowerCase());
        }

        // Apply type filter
        if (typeFilter !== "all") {
            filtered = filtered.filter(r => (r.problem_type || "").toLowerCase() === typeFilter.toLowerCase());
        }

        // Apply search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(r =>
                (r.problem_type || "").toLowerCase().includes(query) ||
                (r.location || "").toLowerCase().includes(query) ||
                (r.description || "").toLowerCase().includes(query) ||
                r.id.toString().includes(query)
            );
        }

        // Apply sort
        filtered.sort((a, b) => {
            const timeA = new Date(a.timestamp).getTime();
            const timeB = new Date(b.timestamp).getTime();
            return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
        });

        setFilteredReports(filtered);
        setCurrentPage(1); // Reset to page 1 on new filter
    }, [reports, searchQuery, statusFilter, typeFilter, sortOrder]);

    const totalPages = Math.ceil(filteredReports.length / itemsPerPage) || 1;
    const paginatedReports = filteredReports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const executeResolve = async (id: number, note: string) => {
        try {
            const formData = new FormData();
            formData.append("action", "resolve");
            if (note.trim()) formData.append("note", note);
            await axios.post(`${API_BASE}/reports/${id}/action`, formData, { headers: authHeaders });
            if (selectedReport?.id === id) {
                setSelectedReport(prev => prev ? { ...prev, status: "Resolved", description: prev.description + (note.trim() ? `\n\n✓ ADMIN RESOLUTION NOTE:\n${note}` : '') } : null);
            }
            setSelectedReports(prev => prev.filter(reportId => reportId !== id));
        } catch (err) {
            throw err;
        }
    };

    const handleResolveClick = (id: number) => {
        setResolveNote("");
        setResolveModal({ reportId: id });
    };

    const submitResolve = async () => {
        if (!resolveModal) return;
        try {
            if (resolveModal.reportId === 'bulk') {
                await Promise.all(selectedReports.map(id => executeResolve(id, resolveNote)));
                showToast(`Successfully resolved ${selectedReports.length} reports!`, 'success');
                setSelectedReports([]);
                setBulkAction("none");
                setSelectedReport(null);
            } else {
                await executeResolve(resolveModal.reportId as number, resolveNote);
                showToast(`Report #${resolveModal.reportId} marked as resolved!`, 'success');
            }
            fetchReports();
            setResolveModal(null);
        } catch (e) {
            showToast('Failed to resolve report(s)', 'error');
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this report? This action cannot be undone.")) return;
        try {
            const formData = new FormData();
            formData.append("action", "delete");
            await axios.post(`${API_BASE}/reports/${id}/action`, formData, { headers: authHeaders });
            fetchReports();
            if (selectedReport?.id === id) setSelectedReport(null);
            setSelectedReports(prev => prev.filter(reportId => reportId !== id));
            showToast(`Report #${id} deleted`, 'info');
        } catch (err) {
            showToast("Error deleting report", 'error');
        }
    };

    const handleBulkAction = async () => {
        if (selectedReports.length === 0) return;
        const action = bulkAction;
        if (action === "none") return;

        if (action === "resolve") {
            setResolveNote("");
            setResolveModal({ reportId: 'bulk' });
            return;
        }

        const confirmed = window.confirm(`Are you sure you want to delete ${selectedReports.length} selected report(s)?`);
        if (!confirmed) return;

        try {
            if (action === "delete") {
                await Promise.all(selectedReports.map(id => {
                    const formData = new FormData();
                    formData.append("action", "delete");
                    return axios.post(`${API_BASE}/reports/${id}/action`, formData, { headers: authHeaders });
                }));
                showToast(`Deleted ${selectedReports.length} reports`, 'info');
            }
            fetchReports();
            setSelectedReports([]);
            setBulkAction("none");
            setSelectedReport(null);
        } catch (err) {
            showToast(`Error performing bulk action`, 'error');
        }
    };

    const handleToggleRole = async (userId: number) => {
        try {
            await axios.patch(`${API_BASE}/users/${userId}/role`, null, { headers: authHeaders });
            showToast("User role updated successfully");
            fetchAdminData();
        } catch (err: any) {
            showToast(err.response?.data?.detail || "Error updating role", "error");
        }
    };

    const handleDeleteUser = async (userId: number) => {
        if (!window.confirm("Permanently delete this user? This cannot be undone.")) return;
        try {
            await axios.delete(`${API_BASE}/users/${userId}`, { headers: authHeaders });
            showToast("User account deleted", "info");
            fetchAdminData();
        } catch (err: any) {
            showToast(err.response?.data?.detail || "Error deleting user", "error");
        }
    };

    const toggleSelectReport = (id: number) => {
        setSelectedReports(prev =>
            prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedReports.length === filteredReports.length) {
            setSelectedReports([]);
        } else {
            setSelectedReports(filteredReports.map(r => r.id));
        }
    };

    const handleExport = () => {
        const csvContent = [
            ["ID", "Problem Type", "Location", "Status", "Description", "Timestamp"].join(","),
            ...filteredReports.map(r =>
                [r.id, r.problem_type, `"${(r.location || "").replace(/"/g, '""')}"`, r.status, `"${(r.description || "").replace(/"/g, '""')}"`, r.timestamp].join(",")
            )
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `infrastructure_reports_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const copyToClipboard = async (value: string) => {
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(value);
            } else {
                const tempInput = document.createElement("input");
                tempInput.value = value;
                document.body.appendChild(tempInput);
                tempInput.select();
                document.execCommand("copy");
                document.body.removeChild(tempInput);
            }
            showToast("Copied to clipboard", "success");
        } catch {
            showToast("Failed to copy token", "error");
        }
    };

    const handleGenerateAdminInvite = async () => {
        try {
            const res = await axios.post(`${API_BASE}/admin/invite-tokens`, null, { headers: authHeaders });
            setInviteTokenModal({ token: res.data.token, expiresAt: res.data.expires_at });
            showToast("One-time admin invite token generated", "success");
        } catch {
            showToast("Failed to generate admin invite token", "error");
        }
    };

    return (
        <div className="admin-page animate-in">
            {authLoading ? (
                <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    minHeight: '400px',
                    gap: '16px'
                }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        border: '3px solid var(--border)',
                        borderTop: '3px solid var(--primary)',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }}></div>
                    <p style={{ 
                        color: 'var(--text-muted)', 
                        fontSize: '0.9rem', 
                        fontWeight: 600 
                    }}>Authenticating session...</p>
                </div>
            ) : (
                <>
            <div className="section-header">
                <div>
                    <h2 className="section-title">Infrastructure Management Console</h2>
                    <p className="section-subtitle">Review and manage infrastructure issues reported by citizens.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        type="button"
                        className="dash-action-btn"
                        onClick={handleGenerateAdminInvite}
                        style={{ background: 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)', color: 'white', border: 'none' }}
                    >
                        <Shield size={16} />
                        <span>Generate Admin Invite</span>
                    </button>
                    <button 
                        type="button" 
                        className="dash-action-btn" 
                        onClick={() => setIsBriefingOpen(true)}
                        style={{ background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)', color: 'white', border: 'none' }}
                    >
                        <Sparkles size={16} />
                        <span>Generate AI Briefing</span>
                    </button>
                    <button type="button" className="dash-action-btn" onClick={fetchAdminData} disabled={loading} title="Refresh data">
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className={`stat-card stat-total ${activeTab === 'issues' ? 'active-filter' : ''}`} onClick={() => setActiveTab('issues')}>
                    <div className="stat-icon"><BarChart3 size={24} /></div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.total}</div>
                        <div className="stat-label">Infrastructure Reports</div>
                    </div>
                </div>
                <div className={`stat-card stat-pending ${activeTab === 'work-orders' ? 'active-filter' : ''}`} onClick={() => setActiveTab('work-orders')}>
                    <div className="stat-icon"><CheckSquare size={24} /></div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.work_orders_count}</div>
                        <div className="stat-label">Work Orders</div>
                    </div>
                </div>
                <div className={`stat-card stat-resolved ${activeTab === 'personnel' ? 'active-filter' : ''}`} onClick={() => setActiveTab('personnel')}>
                    <div className="stat-icon"><Users size={24} /></div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.users_count}</div>
                        <div className="stat-label">Staff Personnel</div>
                    </div>
                </div>
                <div className="stat-card stat-today">
                    <div className="stat-icon"><TrendingUp size={24} /></div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.detections_count}</div>
                        <div className="stat-label">AI Detections</div>
                    </div>
                </div>
                <div className={`stat-card stat-total ${activeTab === 'audit-logs' ? 'active-filter' : ''}`} onClick={() => setActiveTab('audit-logs')}>
                    <div className="stat-icon"><Shield size={24} /></div>
                    <div className="stat-content">
                        <div className="stat-value">{auditLogs.length}</div>
                        <div className="stat-label">Audit Logs</div>
                    </div>
                </div>
                <div className={`stat-card stat-pending ${activeTab === 'alerts' ? 'active-filter' : ''}`} onClick={() => setActiveTab('alerts')}>
                    <div className="stat-icon"><Bell size={24} /></div>
                    <div className="stat-content">
                        <div className="stat-value">{alerts.length}</div>
                        <div className="stat-label">System Alerts</div>
                    </div>
                </div>
            </div>

            {/* Filters & Actions Bar */}
            <div className="admin-toolbar">
                <div className="toolbar-left">
                    <div className="search-box">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search reports..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <select
                        className="admin-select"
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                    >
                        <option value="all">All Types</option>
                        {Object.keys(ISSUE_LABELS).map(key => (
                            <option key={key} value={key}>{ISSUE_LABELS[key]}</option>
                        ))}
                    </select>

                    <button
                        className="btn btn-ghost sort-btn"
                        onClick={() => setSortOrder(prev => prev === "newest" ? "oldest" : "newest")}
                        title="Sort by Date"
                    >
                        <TrendingUp size={16} style={{ transform: sortOrder === 'newest' ? 'none' : 'rotate(180deg)', transition: 'transform 0.2s' }} />
                    </button>
                </div>

                <div className="toolbar-right">
                    <div className="status-tabs">
                        {["all", "pending", "resolved"].map(status => (
                            <button
                                key={status}
                                className={`status-tab ${statusFilter === status ? 'active' : ''}`}
                                onClick={() => setStatusFilter(status)}
                            >
                                {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                        ))}
                    </div>

                    {selectedReports.length > 0 && (
                        <div className="bulk-actions">
                            <span className="selected-count">{selectedReports.length} selected</span>
                            <select
                                value={bulkAction}
                                onChange={(e) => setBulkAction(e.target.value as any)}
                                className="bulk-select"
                            >
                                <option value="none">Bulk Action</option>
                                <option value="resolve">Mark Resolved</option>
                                <option value="delete">Delete</option>
                            </select>
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={handleBulkAction}
                                disabled={bulkAction === "none"}
                            >
                                Apply
                            </button>
                        </div>
                    )}

                    <button className="btn btn-ghost action-badge export-btn" onClick={handleExport} title="Export to CSV">
                        <Download size={15} />
                        <span>EXPORT REPORTS</span>
                    </button>
                </div>
            </div>

            <div className="urban-health-hero glass-card">
                <div className="health-left">
                    <div className="health-score-ring">
                        <svg viewBox="0 0 36 36" className="circular-chart">
                            <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            <path className="circle" strokeDasharray={`${stats.resolved ? (stats.resolved/stats.total)*100 : 85}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            <text x="18" y="20.35" className="percentage">{stats.resolved ? Math.round((stats.resolved/stats.total)*100) : 85}%</text>
                        </svg>
                    </div>
                    <div className="health-text">
                        <h3 className="section-title" style={{ fontSize: '1.4rem', marginBottom: 0 }}>URBAN HEALTH INDEX</h3>
                        <p className="section-subtitle">Real-time infrastructure compliance & safety metric.</p>
                    </div>
                </div>
                <div className="health-right">
                    <div className="trend-badge positive">
                        <TrendingUp size={14} /> +4.2% VS PEER DISTRICTS
                    </div>
                    <div className="edge-metrics-hud">
                        <span className="hud-tag">EDGE-AI SAVINGS: <b>421.2 MB</b></span>
                        <span className="hud-tag">PRIVACY PASS: <b>100%</b></span>
                    </div>
                </div>
            </div>

            <div className="admin-grid">
                <div className="reports-table-container">
                    {loading ? (
                        <div className="loading-state container-placeholder">
                            <RefreshCw className="animate-spin" size={32} />
                            <p>Synchronizing infrastructure nodes...</p>
                        </div>
                    ) : activeTab === 'issues' ? (
                        filteredReports.length === 0 ? (
                            <div className="empty-state container-placeholder">
                                <Database size={40} strokeWidth={1.5} />
                                <h3>No Reports Found</h3>
                                <p>Try adjusting your search or filters.</p>
                            </div>
                        ) : (
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '40px' }}><input type="checkbox" checked={selectedReports.length === filteredReports.length} onChange={toggleSelectAll} className="select-all-checkbox" /></th>
                                        <th style={{ width: '60px' }}>ID</th>
                                        <th style={{ width: '50px' }}>Asset</th>
                                        <th>Issue Type</th>
                                        <th>Location</th>
                                        <th>Date</th>
                                        <th>Status</th>
                                        <th style={{ width: '120px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedReports.map((report) => (
                                        <tr key={report.id} className={selectedReport?.id === report.id ? 'selected' : ''}>
                                            <td><input type="checkbox" checked={selectedReports.includes(report.id)} onChange={() => toggleSelectReport(report.id)} className="row-checkbox" /></td>
                                            <td><span className="report-id">#{report.id}</span></td>
                                            <td>
                                                <div className="table-thumbnail-wrapper">
                                                    {report.image_path ? <img src={getImageUrl(report.image_path)} alt="thumb" /> : <Camera size={14} opacity={0.3} style={{ margin: 'auto' }} />}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <span className={`issue-badge issue-${(report.problem_type || 'other').toLowerCase().replace(/\s+/g, '-')}`}>
                                                        {report.problem_type || 'Unknown'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td><div className="flex-center gap-1" style={{ justifyContent: 'flex-start' }}><MapPin size={12} /> <span className="mono-text">{report.location}</span></div></td>
                                            <td><span className="timestamp-text">{new Date(report.timestamp).toLocaleDateString()}</span></td>
                                            <td><span className={`status-pill ${report.status.toLowerCase()}`}>{report.status}</span></td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button className="btn-icon" onClick={() => setSelectedReport(selectedReport?.id === report.id ? null : report)}><Eye size={13} /></button>
                                                    <button className="btn-icon success" onClick={() => handleResolveClick(report.id)} disabled={report.status === "Resolved"}><CheckCircle size={13} /></button>
                                                    <button className="btn-icon danger" onClick={() => handleDelete(report.id)}><Trash2 size={13} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )
                    ) : activeTab === 'personnel' ? (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '60px' }}>ID</th>
                                    <th>Personnel Name</th>
                                    <th>Secure Email</th>
                                    <th>Access Granted</th>
                                    <th>Role Classification</th>
                                    <th style={{ width: '100px' }}>Controls</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id}>
                                        <td><span className="report-id">#{u.id}</span></td>
                                        <td><div className="flex-center gap-2" style={{ justifyContent: 'flex-start' }}><Users size={16} /> <b>{u.name}</b></div></td>
                                        <td><span className="mono-text">{u.email}</span></td>
                                        <td>{new Date(u.created_at).toLocaleDateString()}</td>
                                        <td>
                                            <span className={`status-pill ${u.is_admin ? 'resolved' : 'pending'}`}>
                                                {u.is_admin ? 'ADMINISTRATOR' : 'STAFF USER'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button className="btn-icon" onClick={() => handleToggleRole(u.id)} title="Toggle Admin/User"><Shield size={14} /></button>
                                                <button className="btn-icon danger" onClick={() => handleDeleteUser(u.id)} title="Delete User"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : activeTab === 'work-orders' ? (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '60px' }}>ID</th>
                                    <th>Asset Reference</th>
                                    <th>Assigned Staff</th>
                                    <th>Priority</th>
                                    <th>Lifecycle Status</th>
                                    <th style={{ width: '100px' }}>Control</th>
                                </tr>
                            </thead>
                            <tbody>
                                {workOrders.map(wo => (
                                    <tr key={wo.id}>
                                        <td><span className="report-id">#{wo.id}</span></td>
                                        <td><span className="id-badge secondary">DET-{wo.detection_id}</span></td>
                                        <td>{users.find(u => u.id === wo.assigned_user_id)?.name || 'Unassigned'}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                { (wo.priority === 'High' || wo.priority === 'Critical') && <span className="priority-pulse" title="Immediate action required" /> }
                                                <span className={`severity-badge ${wo.priority.toLowerCase()}`} style={{ display: 'inline-block' }}>{wo.priority.toUpperCase()}</span>
                                            </div>
                                        </td>
                                        <td><span className={`status-pill ${wo.status.toLowerCase().replace(' ', '-')}`}>{wo.status}</span></td>
                                        <td>
                                            {wo.status !== "Repaired" && (
                                                <button className="btn btn-success btn-xs" onClick={async () => {
                                                    await axios.patch(`${API_BASE}/work-orders/${wo.id}`, { status: "Repaired"}, { headers: { ...authHeaders, 'Content-Type': 'application/json' } });
                                                    fetchAdminData();
                                                    showToast(`Work order #${wo.id} marked as repaired`);
                                                }}>Resolve</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : activeTab === 'alerts' ? (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '60px' }}>ID</th>
                                    <th>Severity</th>
                                    <th>Alert Category</th>
                                    <th>Signal Message</th>
                                    <th style={{ width: '180px' }}>Detected At</th>
                                    <th style={{ width: '80px' }}>Control</th>
                                </tr>
                            </thead>
                            <tbody>
                                {alerts.map(alert => (
                                    <tr key={alert.id}>
                                        <td><span className="report-id">#{alert.id}</span></td>
                                        <td>
                                            <span className={`severity-badge ${alert.type === 'danger' ? 'critical' : 'moderate'}`}>
                                                {alert.type?.toUpperCase() || 'INFO'}
                                            </span>
                                        </td>
                                        <td><b>{alert.title}</b></td>
                                        <td>{alert.message}</td>
                                        <td><span className="timestamp-text">{new Date(alert.timestamp).toLocaleString()}</span></td>
                                        <td>
                                            <button 
                                                className="btn-icon danger" 
                                                onClick={() => onDismissAlert?.(alert.id)}
                                                title="Dismiss Alert"
                                            >
                                                <X size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {alerts.length === 0 && (
                                    <tr>
                                        <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                            No active system alerts detected.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '60px' }}>ID</th>
                                    <th>Actor</th>
                                    <th>Action</th>
                                    <th>Entity</th>
                                    <th style={{ width: '90px' }}>Record</th>
                                    <th style={{ width: '180px' }}>Timestamp</th>
                                </tr>
                            </thead>
                            <tbody>
                                {auditLogs.map(log => (
                                    <tr key={log.id}>
                                        <td><span className="report-id">#{log.id}</span></td>
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span>{log.user_name || "System"}</span>
                                                <span className="mono-text">{log.user_email || "-"}</span>
                                            </div>
                                        </td>
                                        <td>{log.action}</td>
                                        <td><span className="id-badge secondary">{log.table_name}</span></td>
                                        <td>{log.record_id ?? "-"}</td>
                                        <td><span className="timestamp-text">{log.timestamp ? new Date(log.timestamp).toLocaleString() : "-"}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="pagination-footer">
                            <span className="pagination-info">Showing page {currentPage} of {totalPages} ({filteredReports.length} results)</span>
                            <div className="pagination-controls">
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >Prev</button>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >Next</button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="report-detail-panel">
                    {selectedReport ? (
                        <div className="detail-card animate-in">
                            <div className="detail-header">
                                <h3>Report #{selectedReport.id}</h3>
                                <span className={`status-pill ${selectedReport.status.toLowerCase()}`}>
                                    {selectedReport.status}
                                </span>
                            </div>
                            <div className="detail-image">
                                <img src={getImageUrl(selectedReport.image_path)} alt="Evidence" />
                            </div>
                            <div className="detail-info-grid">
                                <div className="detail-info-cell">
                                    <span className="label">AI Output Analysis</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                                        <span className="value issue-badge">{selectedReport.problem_type}</span>
                                        <span className="severity-badge" style={{ backgroundColor: getSeverity(selectedReport.problem_type).bg, color: getSeverity(selectedReport.problem_type).color, borderColor: getSeverity(selectedReport.problem_type).color }}>
                                            {getSeverity(selectedReport.problem_type).label} • {getSeverity(selectedReport.problem_type).conf}% CONF
                                        </span>
                                    </div>
                                </div>
                                <div className="detail-info-cell">
                                    <span className="label">Logged Date</span>
                                    <span className="value"><Calendar size={12} style={{ display: 'inline', marginRight: 4 }} />{new Date(selectedReport.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className="detail-info-cell full-width">
                                    <span className="label">GPS Location</span>
                                    <span className="value mono-text"><MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />{selectedReport.location}</span>
                                </div>
                            </div>
                            <div className="detail-desc">
                                <span className="label">AI/User Description</span>
                                <p>{selectedReport.description}</p>
                            </div>
                            <div className="detail-actions">
                                {selectedReport.status !== "Resolved" && (
                                    <button
                                        className="btn btn-success"
                                        onClick={() => handleResolveClick(selectedReport.id)}
                                    >
                                        <CheckCircle size={15} />
                                        Mark Resolved
                                    </button>
                                )}
                                <button
                                    className="btn btn-danger"
                                    onClick={() => handleDelete(selectedReport.id)}
                                >
                                    <Trash2 size={15} />
                                    Delete Report
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="detail-placeholder container-placeholder">
                            <div className="icon-wrapper">
                                <Search size={32} strokeWidth={1.5} />
                            </div>
                            <h3>No Report Selected</h3>
                            <p>Choose an item from the list to view full details and manage its status.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Resolution Modal */}
            {resolveModal && (
                <div className="modal-overlay animate-in">
                    <div className="modal-content">
                        <h3>Resolution Action</h3>
                        <p>Provide an optional note detailing how this issue was resolved. It will be permanently appended to the report.</p>
                        <textarea
                            value={resolveNote}
                            onChange={(e) => setResolveNote(e.target.value)}
                            placeholder="e.g., Dispatched maintenance crew, road patched successfully."
                            rows={3}
                            className="resolve-textarea"
                        />
                        <div className="modal-actions">
                            <button className="btn btn-ghost" onClick={() => setResolveModal(null)}>Cancel</button>
                            <button className="btn btn-success" onClick={submitResolve}>Confirm Resolution</button>
                        </div>
                    </div>
                </div>
            )}

            {inviteTokenModal && (
                <div className="modal-overlay animate-in">
                    <div className="modal-content">
                        <h3>Admin Invite Token</h3>
                        <p>Share this one-time token securely. It expires at {new Date(inviteTokenModal.expiresAt).toLocaleString()}.</p>
                        <textarea
                            value={inviteTokenModal.token}
                            onChange={(e) => setInviteTokenModal({ ...inviteTokenModal, token: e.target.value })}
                            rows={3}
                            className="resolve-textarea"
                            style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                        />
                        <div className="modal-actions">
                            <button className="btn btn-ghost" onClick={() => setInviteTokenModal(null)}>Close</button>
                            <button className="btn btn-success" onClick={() => copyToClipboard(inviteTokenModal.token)}>Copy Token</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Container */}
            <div className="toast-container">
                {toasts.map(toast => (
                    <div key={toast.id} className={`toast-message toast-${toast.type} animate-in`}>
                        {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                        <span>{toast.message}</span>
                    </div>
                ))}
            </div>

            <style>{`
                /* New Premium Components CSS */
                .severity-badge {
                    font-size: 0.5rem;
                    font-weight: 800;
                    padding: 1px 4px;
                    border-radius: 3px;
                    border: 1px solid;
                    letter-spacing: 0.05em;
                    white-space: nowrap;
                    display: inline-flex;
                    align-items: center;
                }
                
                .modal-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 1000;
                }
                .modal-content {
                    background: var(--bg-card); width: 400px; padding: 24px;
                    border-radius: 16px; border: 1px solid var(--border);
                    box-shadow: var(--shadow-premium);
                    display: flex; flex-direction: column; gap: 12px;
                }
                .modal-content h3 { font-size: 1.2rem; font-weight: 800; margin: 0; }
                .modal-content p { font-size: 0.8rem; color: var(--text-muted); margin: 0 0 8px 0; }
                .resolve-textarea {
                    width: 100%; border: 1px solid var(--border); border-radius: 8px;
                    padding: 12px; background: var(--bg-hover); color: var(--text-main);
                    font-size: 0.85rem; font-family: inherit; resize: none; margin-bottom: 8px;
                }
                .resolve-textarea:focus { outline: none; border-color: var(--primary); }
                .modal-actions { display: flex; justify-content: flex-end; gap: 8px; }

                .toast-container {
                    position: fixed; bottom: 24px; right: 24px;
                    display: flex; flex-direction: column; gap: 8px; z-index: 5000;
                    pointer-events: none;
                }
                .toast-message {
                    display: flex; align-items: center; gap: 10px; padding: 12px 20px;
                    border-radius: 10px; font-weight: 700; font-size: 0.85rem;
                    box-shadow: var(--shadow-md); pointer-events: auto;
                }
                .toast-success { background: #10b981; color: white; border: 1px solid #059669; }
                .toast-error { background: #ef4444; color: white; border: 1px solid #b91c1c; }
                .toast-info { background: #3b82f6; color: white; border: 1px solid #2563eb; }

                .admin-page {

                    min-height: 100%;
                    display: flex;
                    flex-direction: column;
                    padding: 24px;
                    padding-bottom: 40px;
                    box-sizing: border-box;
                    max-width: 1600px;
                    margin: 0 auto;
                    width: 100%;
                }
                
                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }
                .section-title { 
                    font-size: 2.25rem; 
                    font-weight: 800; 
                    margin-bottom: 4px; 
                    color: var(--text-main);
                    letter-spacing: -0.01em;
                }
                .section-subtitle { 
                    font-size: 1.1rem; 
                    color: var(--text-muted); 
                }

                .stat-card { cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); position: relative; overflow: hidden; }
                .stat-card:hover { transform: translateY(-3px); border-color: var(--primary); background: var(--bg-hover); }
                .stat-card.active-filter { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-glow); border-width: 2px; }

                .urban-health-hero {
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 16px;
                    padding: 24px;
                    margin: 16px 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background-image: radial-gradient(circle at top right, rgba(249, 115, 22, 0.05), transparent);
                }
                .health-left { display: flex; align-items: center; gap: 20px; }
                .health-score-ring { width: 80px; height: 80px; }
                .circular-chart { display: block; margin: 10px auto; max-width: 100%; max-height: 250px; }
                .circle-bg { fill: none; stroke: var(--border); stroke-width: 3; }
                .circle { fill: none; stroke-width: 3; stroke-linecap: round; stroke: var(--primary); animation: progress 1s ease-out forwards; }
                @keyframes progress { 0% { stroke-dasharray: 0 100; } }
                .percentage { fill: var(--text-main); font-family: 'Inter', sans-serif; font-size: 0.5rem; text-anchor: middle; font-weight: 800; }
                
                .health-right { text-align: right; display: flex; flex-direction: column; gap: 12px; }
                .trend-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; }
                .trend-badge.positive { background: rgba(16, 185, 129, 0.1); color: #10b981; }
                
                .edge-metrics-hud { display: flex; gap: 12px; justify-content: flex-end; }
                .hud-tag { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; background: var(--bg-body); padding: 4px 10px; border-radius: 6px; border: 1px solid var(--border); color: var(--text-muted); }
                .hud-tag b { color: var(--text-main); }

                .priority-pulse { width: 8px; height: 8px; background: #ef4444; border-radius: 50%; display: inline-block; box-shadow: 0 0 10px rgba(239, 68, 68, 0.5); animation: pulse-priority 1s infinite alternate; }
                @keyframes pulse-priority { from { transform: scale(0.8); opacity: 0.5; } to { transform: scale(1.2); opacity: 1; } }
                
                .admin-grid {
                    display: grid;
                    grid-template-columns: 2fr 1fr;
                    gap: 16px;
                    margin-top: 8px;
                    flex: 1;
                    align-items: flex-start;
                }
                
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
                    gap: 12px;
                    margin: 8px 0;
                }
                
                .stat-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 10px;
                    padding: 8px 12px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    box-shadow: var(--shadow-sm);
                }
                
                .stat-icon {
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                
                .stat-total .stat-icon { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
                .stat-pending .stat-icon { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
                .stat-resolved .stat-icon { background: rgba(16, 185, 129, 0.1); color: #10b981; }
                .stat-today .stat-icon { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
                
                .stat-value { font-size: 2rem; font-weight: 800; line-height: 1; color: var(--text-main); }
                .stat-label { font-size: 0.85rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; }
                
                .admin-toolbar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 16px;
                    background: var(--bg-card);
                    padding: 12px 16px;
                    border-radius: 12px;
                    border: 1px solid var(--border);
                    flex-wrap: nowrap;
                    overflow-x: auto;
                    white-space: nowrap;
                }
                
                .toolbar-left, .toolbar-right {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    flex-wrap: nowrap;
                }

                .bulk-actions { 
                    display: flex; 
                    align-items: center; 
                    gap: 8px; 
                    background: rgba(59, 130, 246, 0.08); 
                    padding: 4px 8px; 
                    border-radius: 8px; 
                    border: 1px solid rgba(59, 130, 246, 0.2); 
                    height: 42px;
                    box-sizing: border-box;
                }
                .selected-count { font-size: 0.8rem; font-weight: 800; color: #3b82f6; white-space: nowrap; }
                .bulk-select { 
                    height: 30px;
                    padding: 0 8px; 
                    border-radius: 6px; 
                    border: 1px solid var(--border); 
                    background: var(--bg-card-solid); 
                    color: var(--text-main); 
                    font-size: 0.75rem; 
                    font-weight: 700; 
                    outline: none; 
                    cursor: pointer;
                }

                .admin-toolbar .btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    flex-shrink: 0;
                    white-space: nowrap;
                    height: 42px;
                    padding: 0 16px;
                    font-size: 0.85rem;
                    border-radius: 8px;
                    font-weight: 700;
                    box-sizing: border-box;
                }

                .admin-toolbar .action-badge {
                    font-size: 0.75rem;
                    letter-spacing: 0.05em;
                    font-weight: 800;
                    padding: 0 14px;
                    gap: 6px;
                }

                .admin-toolbar .sort-btn {
                    padding: 0 12px;
                }
                
                .search-box { flex: 1; min-width: 220px; max-width: 320px; position: relative; flex-shrink: 0; height: 42px; }
                .search-box input {
                    width: 100%;
                    height: 100%;
                    box-sizing: border-box;
                    padding: 0 16px 0 36px;
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    background: var(--bg-hover);
                    color: var(--text-main);
                    font-size: 0.85rem;
                    transition: all 0.2s ease;
                }
                .search-box input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.15); background: var(--bg-card-solid); }
                .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }

                .admin-select {
                    height: 42px;
                    padding: 0 16px;
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    background: var(--bg-hover);
                    color: var(--text-main);
                    font-size: 0.85rem;
                    font-weight: 700;
                    cursor: pointer;
                    outline: none;
                    transition: border-color 0.2s ease;
                }
                .admin-select:focus { border-color: var(--primary); }
                
                .status-tabs { 
                    display: flex; 
                    background: var(--bg-hover); 
                    border: 1px solid var(--border); 
                    border-radius: 8px; 
                    padding: 4px; 
                    gap: 4px;
                    height: 42px;
                    box-sizing: border-box;
                    align-items: center;
                }
                .status-tab { 
                    height: 100%;
                    padding: 0 16px; 
                    border: none; 
                    background: transparent; 
                    color: var(--text-muted); 
                    font-size: 0.85rem; 
                    font-weight: 800; 
                    border-radius: 6px; 
                    cursor: pointer; 
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                }
                .status-tab:hover { color: var(--text-main); background: rgba(0,0,0,0.05); }
                .status-tab.active { background: var(--primary); color: white; box-shadow: 0 2px 8px rgba(249, 115, 22, 0.25); }
                
                .reports-table-container { background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; }
                .admin-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
                .admin-table th { 
                    text-align: left; 
                    padding: 12px; 
                    border-bottom: 1px solid var(--border); 
                    background: var(--bg-card-solid); 
                    color: var(--text-muted); 
                    font-size: 0.8rem; 
                    font-weight: 800; 
                    text-transform: uppercase; 
                    letter-spacing: 0.05em; 
                }
                .admin-table td { padding: 12px; border-bottom: 1px solid var(--border); font-size: 0.95rem; color: var(--text-secondary); vertical-align: middle; }
                .admin-table tr:hover { background: var(--bg-hover); }
                .admin-table tr.selected { background: rgba(249, 115, 22, 0.05); border-left: 3px solid var(--primary); }
                
                .report-id { font-family: 'JetBrains Mono', monospace; font-weight: 700; color: var(--primary); font-size: 0.9rem; }
                .mono-text { font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; color: var(--text-muted); }
                
                .issue-badge { padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 0.75rem; text-transform: uppercase; border: 1px solid var(--border); background: var(--bg-hover); color: var(--text-main); display: inline-block; }
                .issue-pothole, .issue-road-damage { color: #ef4444; border-color: rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.1); }
                .issue-broken-streetlight, .issue-traffic-signal { color: #eab308; border-color: rgba(234, 179, 8, 0.3); background: rgba(234, 179, 8, 0.1); }
                .issue-fallen-tree { color: #22c55e; border-color: rgba(34, 197, 94, 0.3); background: rgba(34, 197, 94, 0.1); }
                .issue-flooding { color: #3b82f6; border-color: rgba(59, 130, 246, 0.3); background: rgba(59, 130, 246, 0.1); }
                .issue-garbage-dump { color: #a855f7; border-color: rgba(168, 85, 247, 0.3); background: rgba(168, 85, 247, 0.1); }
                .issue-other { color: var(--text-secondary); border-color: var(--border); background: var(--bg-card); }
                
                .status-pill { padding: 4px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block; }
                .status-pill.pending { background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.2); }
                .status-pill.resolved { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }
                
                .action-buttons { display: flex; gap: 4px; }
                .btn-icon { background: var(--bg-card); border: 1px solid var(--border); color: var(--text-muted); width: 24px; height: 24px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
                .btn-icon:hover:not(:disabled) { background: var(--bg-hover); color: var(--text-main); border-color: var(--primary); }
                .btn-icon:disabled { opacity: 0.5; cursor: not-allowed; }
                .btn-icon.resolved-btn:disabled { opacity: 1; background: rgba(16, 185, 129, 0.1); color: #10b981; border-color: rgba(16, 185, 129, 0.3); }
                
                .report-detail-panel { position: sticky; top: 20px; min-width: 0; }
                .detail-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; }
                .detail-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
                .detail-card h3 { font-size: 1.1rem; font-weight: 800; color: var(--text-main); margin: 0; }
                .detail-image {
                    width: 100%;
                    height: 220px;
                    border-radius: 8px;
                    overflow: hidden;
                    margin-bottom: 16px;
                    background: var(--bg-body);
                    border: 1px solid var(--border);
                    cursor: pointer;
                }
                .detail-image img { width: 100%; height: 100%; object-fit: contain; background: black; }
                
                .detail-info-grid {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 12px;
                    margin-bottom: 16px;
                }
                .detail-info-cell {
                    display: flex;
                    flex-direction: column;
                    flex: 1;
                    min-width: 130px;
                    gap: 4px;
                    background: var(--bg-hover);
                    padding: 10px 12px;
                    border-radius: 8px;
                    border: 1px solid var(--border);
                }
                .detail-info-cell.full-width { flex: 0 0 100%; }
                
                .detail-desc { padding: 12px; background: var(--bg-hover); border-radius: 8px; border: 1px solid var(--border); }
                .detail-desc p { font-size: 0.8rem; line-height: 1.5; color: var(--text-secondary); margin-top: 6px; }
                
                .label { font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; }
                .value { font-size: 1rem; color: var(--text-main); font-weight: 700; }
                
                /* Table Overhaul Enhancements */
                .table-thumbnail-wrapper {
                    width: 32px; height: 32px;
                    border-radius: 6px;
                    overflow: hidden;
                    background: var(--bg-body);
                    border: 1px solid var(--border);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .table-thumbnail-wrapper img { width: 100%; height: 100%; object-fit: cover; }
                .timestamp-text { font-size: 0.70rem; color: var(--text-muted); white-space: nowrap; }
                
                .pagination-footer {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 12px 16px;
                    border-top: 1px solid var(--border);
                    background: var(--bg-card);
                    border-radius: 0 0 12px 12px;
                }
                .pagination-info { font-size: 0.75rem; color: var(--text-muted); font-weight: 500; }
                .pagination-controls { display: flex; gap: 8px; }
                
                .detail-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
                .btn { padding: 6px 14px; font-size: 0.7rem; font-weight: 800; border-radius: 6px; text-transform: uppercase; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
                
                .btn-primary { background: var(--primary); color: white; border: none; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.2); }
                .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(249, 115, 22, 0.4); }
                
                .btn-ghost { background: transparent; color: var(--text-main); border: 1px solid var(--border); }
                .btn-ghost:hover { background: var(--bg-hover); border-color: var(--primary); color: var(--primary); }
                
                .btn-success { background: #10b981; color: #fff; border: none; }
                .btn-success:hover { background: #059669; }
                .btn-danger { background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); }
                .btn-danger:hover { background: rgba(239,68,68,0.2); }
                
                .container-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 300px; color: var(--text-muted); text-align: center; background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border); padding: 40px; }
                .container-placeholder h3 { font-size: 1rem; color: var(--text-main); margin-top: 16px; margin-bottom: 8px; }
                .container-placeholder p { font-size: 0.8rem; max-width: 240px; }
                
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
                .animate-in { animation: fadeIn 0.3s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
            {/* Briefing Modal */}
            <UrbanAdvisorModal 
                isOpen={isBriefingOpen} 
                onClose={() => setIsBriefingOpen(false)} 
            />
                </>
            )}
        </div>
    );
};

export default AdminConsole;
