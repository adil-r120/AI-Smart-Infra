import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import { Report, User, WorkOrder, AuditLogEntry } from "../types";
import { API_BASE } from "../api/config";
import { useAuth } from "../context/AuthContext";
import { CheckCircle, Trash2, Eye, EyeOff, MapPin, Calendar, Info, Search, Download, RefreshCw, BarChart3, TrendingUp, AlertTriangle, CheckSquare, Database, Camera, Users, Briefcase, Sparkles, Shield, Bell, X } from "lucide-react";
import UrbanAdvisorModal from "./UrbanAdvisorModal";
import "./AdminConsole.css";

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
    const [assignWorkerModal, setAssignWorkerModal] = useState<Report | null>(null);
    const [workerName, setWorkerName] = useState("");
    const [workerNotes, setWorkerNotes] = useState("");
    const [workerPriority, setWorkerPriority] = useState("Medium");
    const [isAssigning, setIsAssigning] = useState(false);
    const [isBriefingOpen, setIsBriefingOpen] = useState(false);

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

    const handleAssignWorkerSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!assignWorkerModal || !workerName.trim()) return;

        setIsAssigning(true);
        try {
            const formData = new FormData();
            formData.append("worker_name", workerName.trim());
            if (workerNotes.trim()) formData.append("notes", workerNotes.trim());
            if (workerPriority) formData.append("priority", workerPriority);

            await axios.post(`${API_BASE}/reports/${assignWorkerModal.id}/assign`, formData, {
                headers: authHeaders
            });

            showToast(`Worker "${workerName.trim()}" dispatched to ${assignWorkerModal.location}!`, 'success');
            setAssignWorkerModal(null);
            setWorkerName("");
            setWorkerNotes("");
            fetchReports();
            if (selectedReport && selectedReport.id === assignWorkerModal.id) {
                setSelectedReport({
                    ...selectedReport,
                    status: "Approved",
                    assigned_worker: workerName.trim(),
                    worker_notes: workerNotes.trim(),
                    priority_level: workerPriority,
                    assigned_at: new Date().toISOString()
                });
            }
        } catch (err: any) {
            console.error("Error assigning worker:", err);
            showToast("Failed to assign worker. Please try again.", "error");
        } finally {
            setIsAssigning(false);
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
            {/* Executive Command Center Header */}
            <div className="admin-command-header">
                <div>
                    <h2 className="admin-command-title">Infrastructure Management Console</h2>
                    <p className="admin-command-subtitle">Real-time municipal oversight, automated edge telemetry, field crew dispatching, and audit workflows.</p>
                </div>
                <div className="admin-header-actions">
                    <button 
                        type="button" 
                        className="admin-action-btn-ai" 
                        onClick={() => setIsBriefingOpen(true)}
                    >
                        <Sparkles size={16} />
                        <span>Generate AI Opinion</span>
                    </button>
                    <button 
                        type="button" 
                        className="admin-action-btn-refresh" 
                        onClick={fetchAdminData} 
                        disabled={loading} 
                        title="Refresh live data"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Interactive Metrics Grid */}
            <div className="admin-stats-grid">
                <div 
                    className={`admin-stat-card stat-reports ${activeTab === 'issues' ? 'active-tab-filter' : ''}`} 
                    onClick={() => setActiveTab('issues')}
                >
                    <div className="admin-stat-icon-wrap"><BarChart3 size={22} /></div>
                    <div className="admin-stat-data">
                        <div className="admin-stat-number">{stats.total}</div>
                        <div className="admin-stat-title">Reports</div>
                    </div>
                </div>
                <div 
                    className={`admin-stat-card stat-workorders ${activeTab === 'work-orders' ? 'active-tab-filter' : ''}`} 
                    onClick={() => setActiveTab('work-orders')}
                >
                    <div className="admin-stat-icon-wrap"><CheckSquare size={22} /></div>
                    <div className="admin-stat-data">
                        <div className="admin-stat-number">{stats.work_orders_count}</div>
                        <div className="admin-stat-title">Work Orders</div>
                    </div>
                </div>
                <div 
                    className={`admin-stat-card stat-personnel ${activeTab === 'personnel' ? 'active-tab-filter' : ''}`} 
                    onClick={() => setActiveTab('personnel')}
                >
                    <div className="admin-stat-icon-wrap"><Users size={22} /></div>
                    <div className="admin-stat-data">
                        <div className="admin-stat-number">{stats.users_count}</div>
                        <div className="admin-stat-title">Personnel</div>
                    </div>
                </div>
                    
                <div 
                    className={`admin-stat-card stat-audit ${activeTab === 'audit-logs' ? 'active-tab-filter' : ''}`} 
                    onClick={() => setActiveTab('audit-logs')}
                >
                    <div className="admin-stat-icon-wrap"><Shield size={22} /></div>
                    <div className="admin-stat-data">
                        <div className="admin-stat-number">{auditLogs.length}</div>
                        <div className="admin-stat-title">Audit Logs</div>
                    </div>
                </div>
                <div 
                    className={`admin-stat-card stat-alerts ${activeTab === 'alerts' ? 'active-tab-filter' : ''}`} 
                    onClick={() => setActiveTab('alerts')}
                >
                    <div className="admin-stat-icon-wrap"><Bell size={22} /></div>
                    <div className="admin-stat-data">
                        <div className="admin-stat-number">{alerts.length}</div>
                        <div className="admin-stat-title">Alerts</div>
                    </div>
                </div>
            </div>

            {/* Segmented Navigation Strip */}
            <div className="admin-nav-strip">
                <button 
                    type="button" 
                    className={`admin-nav-pill ${activeTab === 'issues' ? 'active' : ''}`}
                    onClick={() => setActiveTab('issues')}
                >
                    <BarChart3 size={15} />
                    <span>Infrastructure Reports</span>
                    <span className="admin-nav-count">{stats.total}</span>
                </button>
                <button 
                    type="button" 
                    className={`admin-nav-pill ${activeTab === 'work-orders' ? 'active' : ''}`}
                    onClick={() => setActiveTab('work-orders')}
                >
                    <CheckSquare size={15} />
                    <span>Work Orders</span>
                    <span className="admin-nav-count">{stats.work_orders_count}</span>
                </button>
                <button 
                    type="button" 
                    className={`admin-nav-pill ${activeTab === 'personnel' ? 'active' : ''}`}
                    onClick={() => setActiveTab('personnel')}
                >
                    <Users size={15} />
                    <span>Personnel & Staff</span>
                    <span className="admin-nav-count">{stats.users_count}</span>
                </button>
                <button 
                    type="button" 
                    className={`admin-nav-pill ${activeTab === 'audit-logs' ? 'active' : ''}`}
                    onClick={() => setActiveTab('audit-logs')}
                >
                    <Shield size={15} />
                    <span>Security Audit Logs</span>
                    <span className="admin-nav-count">{auditLogs.length}</span>
                </button>
                <button 
                    type="button" 
                    className={`admin-nav-pill ${activeTab === 'alerts' ? 'active' : ''}`}
                    onClick={() => setActiveTab('alerts')}
                >
                    <Bell size={15} />
                    <span>System Alerts</span>
                    <span className="admin-nav-count">{alerts.length}</span>
                </button>
            </div>

            {/* Urban Health Hero Banner */}
            <div className="urban-health-hero">
                <div className="health-left">
                    <div className="health-score-ring">
                        <svg viewBox="0 0 36 36" className="circular-chart">
                            <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            <path className="circle" strokeDasharray={`${stats.resolved ? (stats.resolved/stats.total)*100 : 85}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            <text x="18" y="20.35" className="percentage">{stats.resolved ? Math.round((stats.resolved/stats.total)*100) : 85}%</text>
                        </svg>
                    </div>
                    <div className="health-text">
                        <h3>HEALTH INDEX</h3>
                        <p>Real-time infrastructure compliance & safety metric across municipal zones.</p>
                    </div>
                </div>
                <div className="health-right">
                    <div className="trend-badge">
                        <TrendingUp size={14} /> +4.2% VS PEER DISTRICTS
                    </div>
                    <div className="edge-metrics-hud">
                        {/* <span className="hud-tag">EDGE-AI SAVINGS: <b>421.2 MB</b></span> */}
                        <span className="hud-tag">PRIVACY PASS: <b>100%</b></span>
                    </div>
                </div>
            </div>

            {/* Toolbar for Reports */}
            {activeTab === 'issues' && (
                <div className="admin-toolbar-card">
                    <div className="toolbar-controls-left">
                        <div className="admin-search-wrapper">
                            <Search size={16} className="admin-search-icon" />
                            <input
                                type="text"
                                className="admin-search-input"
                                placeholder="Search by ID, location, worker, description..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <select
                            className="admin-filter-select"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                        >
                            <option value="all">All Issue Types</option>
                            {Object.keys(ISSUE_LABELS).map(key => (
                                <option key={key} value={key}>{ISSUE_LABELS[key]}</option>
                            ))}
                        </select>

                        <button
                            type="button"
                            className="admin-sort-toggle-btn"
                            onClick={() => setSortOrder(prev => prev === "newest" ? "oldest" : "newest")}
                            title={sortOrder === 'newest' ? 'Sorted Newest First' : 'Sorted Oldest First'}
                        >
                            <TrendingUp size={16} style={{ transform: sortOrder === 'newest' ? 'none' : 'rotate(180deg)', transition: 'transform 0.2s' }} />
                        </button>
                    </div>

                    <div className="toolbar-controls-right">
                        <div className="admin-status-segmented-group">
                            {["all", "pending", "resolved"].map(status => (
                                <button
                                    type="button"
                                    key={status}
                                    className={`admin-status-tab-btn ${statusFilter === status ? 'active' : ''}`}
                                    onClick={() => setStatusFilter(status)}
                                >
                                    {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                                </button>
                            ))}
                        </div>

                        {selectedReports.length > 0 && (
                            <div className="admin-bulk-actions-ribbon">
                                <span className="admin-bulk-count-label">{selectedReports.length} selected</span>
                                <select
                                    value={bulkAction}
                                    onChange={(e) => setBulkAction(e.target.value as any)}
                                    className="admin-bulk-action-select"
                                >
                                    <option value="none">Bulk Action</option>
                                    <option value="resolve">Mark Resolved</option>
                                    <option value="delete">Delete</option>
                                </select>
                                <button
                                    type="button"
                                    className="admin-bulk-apply-btn"
                                    onClick={handleBulkAction}
                                    disabled={bulkAction === "none"}
                                >
                                    Apply
                                </button>
                            </div>
                        )}

                        <button type="button" className="admin-export-csv-btn" onClick={handleExport} title="Export to CSV">
                            <Download size={14} />
                            <span>Export CSV</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Split Grid: Main Surface & Inspector Panel */}
            <div className={`admin-content-split-grid ${activeTab === 'issues' && selectedReport ? 'with-sidebar' : ''}`}>
                <div className="admin-table-surface">
                    {loading ? (
                        <div className="loading-state container-placeholder">
                            <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--primary)' }} />
                            <h3>Synchronizing Network...</h3>
                            <p>Loading real-time state from municipal edge nodes.</p>
                        </div>
                    ) : activeTab === 'issues' ? (
                        filteredReports.length === 0 ? (
                            <div className="empty-state container-placeholder">
                                <Database size={40} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
                                <h3>No Reports Found</h3>
                                <p>Try adjusting your search criteria or filter tags.</p>
                            </div>
                        ) : (
                            <div className="admin-table-scroll-wrap">
                                <table className="admin-enterprise-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '36px', textAlign: 'center' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={filteredReports.length > 0 && selectedReports.length === filteredReports.length} 
                                                    onChange={toggleSelectAll} 
                                                    className="select-all-checkbox" 
                                                />
                                            </th>
                                            <th style={{ width: '48px' }}>ID</th>
                                            <th style={{ width: '46px', textAlign: 'center' }}>Asset</th>
                                            <th>Issue Type</th>
                                            <th>Location</th>
                                            <th>Reported By</th>
                                            <th>Assigned Worker</th>
                                            <th>Logged Date</th>
                                            <th>Status</th>
                                            <th style={{ width: '120px', textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedReports.map((report) => (
                                            <tr key={report.id} className={selectedReport?.id === report.id ? 'selected-row' : ''}>
                                                <td style={{ textAlign: 'center' }}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedReports.includes(report.id)} 
                                                        onChange={() => toggleSelectReport(report.id)} 
                                                        className="row-checkbox" 
                                                    />
                                                </td>
                                                <td><span className="admin-table-id-pill">#{report.id}</span></td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <div 
                                                        className="admin-table-thumb"
                                                        onClick={() => setSelectedReport(selectedReport?.id === report.id ? null : report)}
                                                        title="Click to view details"
                                                    >
                                                        {report.image_path ? (
                                                            <img src={getImageUrl(report.image_path)} alt="thumb" />
                                                        ) : (
                                                            <Camera size={14} opacity={0.35} />
                                                        )}
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`admin-issue-badge issue-${(report.problem_type || 'other').toLowerCase().replace(/\s+/g, '-')}`}>
                                                        {report.problem_type || 'Unknown'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="admin-location-pill" title={report.location}>
                                                        <MapPin size={12} style={{ flexShrink: 0 }} />
                                                        <span>{report.location}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span 
                                                        style={{ 
                                                            fontSize: '0.78125rem', 
                                                            fontWeight: 600, 
                                                            color: 'var(--text-main)',
                                                            maxWidth: '100px',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            display: 'inline-block',
                                                            verticalAlign: 'middle'
                                                        }}
                                                        title={report.user_name || 'Citizen'}
                                                    >
                                                        {report.user_name || 'Citizen'}
                                                    </span>
                                                </td>
                                                <td>
                                                    {report.assigned_worker ? (
                                                        <span className="admin-worker-badge">
                                                            👷 {report.assigned_worker}
                                                        </span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            className="admin-worker-assign-trigger"
                                                            onClick={() => {
                                                                setAssignWorkerModal(report);
                                                                setWorkerPriority(report.priority_level || "Medium");
                                                            }}
                                                        >
                                                            + Dispatch
                                                        </button>
                                                    )}
                                                </td>
                                                <td><span className="timestamp-text">{new Date(report.timestamp).toLocaleDateString()}</span></td>
                                                <td><span className={`admin-status-pill ${report.status.toLowerCase()}`}>{report.status}</span></td>
                                                <td>
                                                    <div className="admin-row-actions-group" style={{ justifyContent: 'flex-end' }}>
                                                        <button 
                                                            type="button" 
                                                            className="admin-row-action-btn" 
                                                            title="Inspect Details" 
                                                            onClick={() => setSelectedReport(selectedReport?.id === report.id ? null : report)}
                                                        >
                                                            <Eye size={13} />
                                                        </button>
                                                        <button 
                                                            type="button" 
                                                            className="admin-row-action-btn" 
                                                            title="Dispatch Worker" 
                                                            onClick={() => { 
                                                                setAssignWorkerModal(report); 
                                                                setWorkerPriority(report.priority_level || "Medium"); 
                                                            }} 
                                                            style={{ color: 'var(--primary)' }}
                                                        >
                                                            <Briefcase size={13} />
                                                        </button>
                                                        <button 
                                                            type="button" 
                                                            className="admin-row-action-btn success" 
                                                            title="Resolve Report" 
                                                            onClick={() => handleResolveClick(report.id)} 
                                                            disabled={report.status === "Resolved"}
                                                        >
                                                            <CheckCircle size={13} />
                                                        </button>
                                                        <button 
                                                            type="button" 
                                                            className="admin-row-action-btn danger" 
                                                            title="Delete Report" 
                                                            onClick={() => handleDelete(report.id)}
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    ) : activeTab === 'personnel' ? (
                        <div className="admin-table-scroll-wrap">
                            <table className="admin-enterprise-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '50px' }}>ID</th>
                                        <th>Personnel Name</th>
                                        <th>Secure Email</th>
                                        <th>Access Granted</th>
                                        <th>Role Classification</th>
                                        <th style={{ width: '90px', textAlign: 'right' }}>Controls</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={u.id}>
                                            <td><span className="admin-table-id-pill">#{u.id}</span></td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Users size={15} style={{ color: 'var(--primary)' }} />
                                                    <b style={{ color: 'var(--text-main)' }}>{u.name}</b>
                                                </div>
                                            </td>
                                            <td><span className="mono-text" style={{ fontSize: '0.8125rem' }}>{u.email}</span></td>
                                            <td><span className="timestamp-text">{new Date(u.created_at).toLocaleDateString()}</span></td>
                                            <td>
                                                <span className={`admin-status-pill ${u.is_admin ? 'resolved' : 'pending'}`}>
                                                    {u.is_admin ? 'ADMINISTRATOR' : 'STAFF USER'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="admin-row-actions-group" style={{ justifyContent: 'flex-end' }}>
                                                    <button type="button" className="admin-row-action-btn" onClick={() => handleToggleRole(u.id)} title="Toggle Admin / Staff Role">
                                                        <Shield size={13} />
                                                    </button>
                                                    <button type="button" className="admin-row-action-btn danger" onClick={() => handleDeleteUser(u.id)} title="Revoke & Delete User">
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {users.length === 0 && (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                                No staff members currently registered.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : activeTab === 'work-orders' ? (
                        <div className="admin-table-scroll-wrap">
                            <table className="admin-enterprise-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '50px' }}>ID</th>
                                        <th>Asset Reference</th>
                                        <th>Assigned Staff</th>
                                        <th>Priority</th>
                                        <th>Lifecycle Status</th>
                                        <th style={{ width: '100px', textAlign: 'right' }}>Control</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {workOrders.map(wo => (
                                        <tr key={wo.id}>
                                            <td><span className="admin-table-id-pill">#{wo.id}</span></td>
                                            <td><span className="admin-worker-badge" style={{ background: 'var(--bg-hover)', color: 'var(--text-main)', borderColor: 'var(--border)' }}>DET-{wo.detection_id}</span></td>
                                            <td><b style={{ color: 'var(--text-main)' }}>{users.find(u => u.id === wo.assigned_user_id)?.name || 'Unassigned'}</b></td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span className={`admin-issue-badge ${wo.priority.toLowerCase() === 'critical' ? 'issue-pothole' : wo.priority.toLowerCase() === 'high' ? 'issue-traffic-signal' : 'issue-other'}`}>
                                                        {wo.priority.toUpperCase()}
                                                    </span>
                                                </div>
                                            </td>
                                            <td><span className={`admin-status-pill ${wo.status.toLowerCase().replace(/\s+/g, '-')}`}>{wo.status}</span></td>
                                            <td style={{ textAlign: 'right' }}>
                                                {wo.status !== "Repaired" && (
                                                    <button 
                                                        type="button" 
                                                        className="admin-bulk-apply-btn"
                                                        style={{ background: '#10b981' }}
                                                        onClick={async () => {
                                                            await axios.patch(`${API_BASE}/work-orders/${wo.id}`, { status: "Repaired"}, { headers: { ...authHeaders, 'Content-Type': 'application/json' } });
                                                            fetchAdminData();
                                                            showToast(`Work order #${wo.id} marked as repaired`);
                                                        }}
                                                    >
                                                        Resolve
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {workOrders.length === 0 && (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                                No active work orders dispatched.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : activeTab === 'alerts' ? (
                        <div className="admin-table-scroll-wrap">
                            <table className="admin-enterprise-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '50px' }}>ID</th>
                                        <th style={{ width: '80px' }}>Severity</th>
                                        <th>Alert Category</th>
                                        <th>Signal Message</th>
                                        <th style={{ width: '160px' }}>Detected At</th>
                                        <th style={{ width: '70px', textAlign: 'right' }}>Control</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {alerts.map(alert => (
                                        <tr key={alert.id}>
                                            <td><span className="admin-table-id-pill">#{alert.id}</span></td>
                                            <td>
                                                <span className={`admin-issue-badge ${alert.type === 'danger' ? 'issue-pothole' : 'issue-traffic-signal'}`}>
                                                    {alert.type?.toUpperCase() || 'INFO'}
                                                </span>
                                            </td>
                                            <td><b style={{ color: 'var(--text-main)' }}>{alert.title}</b></td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{alert.message}</td>
                                            <td><span className="timestamp-text">{new Date(alert.timestamp).toLocaleString()}</span></td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button 
                                                    type="button"
                                                    className="admin-row-action-btn danger" 
                                                    onClick={() => onDismissAlert?.(alert.id)}
                                                    title="Dismiss Alert"
                                                >
                                                    <X size={13} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {alerts.length === 0 && (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                                No active telemetry alerts detected.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="admin-table-scroll-wrap">
                            <table className="admin-enterprise-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '50px' }}>ID</th>
                                        <th>Actor</th>
                                        <th>Action Executed</th>
                                        <th>Entity Domain</th>
                                        <th style={{ width: '80px' }}>Record ID</th>
                                        <th style={{ width: '160px' }}>Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {auditLogs.map(log => (
                                        <tr key={log.id}>
                                            <td><span className="admin-table-id-pill">#{log.id}</span></td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{log.user_name || "System Automated"}</span>
                                                    <span className="mono-text" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.user_email || "-"}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="admin-issue-badge issue-other" style={{ textTransform: 'none' }}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td><span className="mono-text" style={{ fontSize: '0.8125rem' }}>{log.table_name}</span></td>
                                            <td><span className="admin-table-id-pill">{log.record_id ?? "-"}</span></td>
                                            <td><span className="timestamp-text">{log.timestamp ? new Date(log.timestamp).toLocaleString() : "-"}</span></td>
                                        </tr>
                                    ))}
                                    {auditLogs.length === 0 && (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                                No security audit entries recorded yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination Footer */}
                    {activeTab === 'issues' && totalPages > 1 && (
                        <div className="admin-table-pagination-bar">
                            <span className="admin-pagination-status-text">
                                Page <b>{currentPage}</b> of <b>{totalPages}</b> ({filteredReports.length} total reports)
                            </span>
                            <div className="admin-pagination-buttons-group">
                                <button
                                    type="button"
                                    className="admin-page-nav-btn"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    Previous
                                </button>
                                <button
                                    type="button"
                                    className="admin-page-nav-btn"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Selected Report Inspector Panel */}
                {activeTab === 'issues' && selectedReport && (
                    <div className="admin-detail-side-panel animate-in">
                        <div className="admin-detail-header-row">
                            <h3 className="admin-detail-title">Report #{selectedReport.id}</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className={`admin-status-pill ${selectedReport.status.toLowerCase()}`}>
                                    {selectedReport.status}
                                </span>
                                <button 
                                    type="button" 
                                    className="admin-detail-close-btn" 
                                    onClick={() => setSelectedReport(null)}
                                    title="Close details"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {selectedReport.image_path && (
                            <div className="admin-detail-image-box">
                                <img src={getImageUrl(selectedReport.image_path)} alt="Evidence" />
                            </div>
                        )}

                        <div className="admin-detail-chips-grid">
                            <div className="admin-detail-cell">
                                <span className="admin-detail-cell-label">AI Classification</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                                    <span className="admin-issue-badge">{selectedReport.problem_type}</span>
                                    <span className="severity-badge" style={{ backgroundColor: getSeverity(selectedReport.problem_type).bg, color: getSeverity(selectedReport.problem_type).color, borderColor: getSeverity(selectedReport.problem_type).color }}>
                                        {getSeverity(selectedReport.problem_type).label} • {getSeverity(selectedReport.problem_type).conf}% CONF
                                    </span>
                                </div>
                            </div>

                            <div className="admin-detail-cell">
                                <span className="admin-detail-cell-label">Logged Date</span>
                                <span className="admin-detail-cell-value">
                                    <Calendar size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                                    {new Date(selectedReport.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>

                            <div className="admin-detail-cell full-width">
                                <span className="admin-detail-cell-label">GPS Location</span>
                                <span className="admin-detail-cell-value mono-text" style={{ wordBreak: 'break-all', fontSize: '0.8125rem' }}>
                                    <MapPin size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                                    {selectedReport.location}
                                </span>
                            </div>

                            <div className="admin-detail-cell">
                                <span className="admin-detail-cell-label">Reported By</span>
                                <span className="admin-detail-cell-value" style={{ fontSize: '0.8125rem' }}>
                                    👤 {selectedReport.user_name || 'Citizen Reporter'}
                                </span>
                            </div>

                            <div className="admin-detail-cell">
                                <span className="admin-detail-cell-label">Assigned Field Worker</span>
                                <span className="admin-detail-cell-value" style={{ fontSize: '0.8125rem', color: selectedReport.assigned_worker ? 'var(--primary)' : 'var(--text-muted)' }}>
                                    {selectedReport.assigned_worker ? `👷 ${selectedReport.assigned_worker}` : 'Unassigned'}
                                </span>
                            </div>
                        </div>

                        <div className="admin-detail-desc-box">
                            <span className="admin-detail-cell-label">Description</span>
                            <p style={{ margin: '6px 0 0', color: 'var(--text-main)', fontSize: '0.8125rem', lineHeight: 1.5 }}>
                                {selectedReport.description}
                            </p>
                        </div>

                        {selectedReport.worker_notes && (
                            <div className="admin-detail-desc-box" style={{ borderLeft: '3px solid var(--primary)' }}>
                                <span className="admin-detail-cell-label" style={{ color: 'var(--primary)' }}>Worker Instructions</span>
                                <p style={{ margin: '6px 0 0', color: 'var(--text-main)', fontSize: '0.8125rem', lineHeight: 1.5 }}>
                                    {selectedReport.worker_notes}
                                </p>
                            </div>
                        )}

                        <div className="admin-detail-actions-footer">
                            <button
                                type="button"
                                className="admin-detail-cta-btn primary"
                                onClick={() => {
                                    setAssignWorkerModal(selectedReport);
                                    setWorkerPriority(selectedReport.priority_level || "Medium");
                                }}
                            >
                                <Briefcase size={14} />
                                <span>{selectedReport.assigned_worker ? "Reassign Worker" : "Dispatch Worker"}</span>
                            </button>
                            {selectedReport.status !== "Resolved" && (
                                <button
                                    type="button"
                                    className="admin-detail-cta-btn"
                                    style={{ background: '#10b981', color: 'white' }}
                                    onClick={() => handleResolveClick(selectedReport.id)}
                                >
                                    <CheckCircle size={14} />
                                    <span>Mark Resolved</span>
                                </button>
                            )}
                            <button
                                type="button"
                                className="admin-detail-cta-btn danger"
                                onClick={() => handleDelete(selectedReport.id)}
                            >
                                <Trash2 size={14} />
                                <span>Delete</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Assign Worker to Location Modal */}
            {assignWorkerModal && (
                <div className="admin-modal-overlay">
                    <div className="admin-modal-card">
                        <div className="admin-modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--primary-glow)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Briefcase size={20} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Dispatch Field Worker</h3>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Issue #{assignWorkerModal.id} • {assignWorkerModal.problem_type}</p>
                                </div>
                            </div>
                            <button 
                                type="button" 
                                className="admin-detail-close-btn" 
                                onClick={() => setAssignWorkerModal(null)}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleAssignWorkerSubmit}>
                            <div className="admin-modal-body">
                                {/* Location Preview Card */}
                                <div style={{ padding: '10px 14px', background: 'var(--bg-hover)', borderRadius: '10px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <MapPin size={18} color="var(--primary)" />
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                        <div style={{ fontSize: '0.6875rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Target Location</div>
                                        <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{assignWorkerModal.location}</div>
                                    </div>
                                </div>

                                <div className="admin-modal-field">
                                    <label className="admin-modal-label">
                                        Select or Enter Worker / Field Crew *
                                    </label>
                                    <input
                                        type="text"
                                        list="registered-workers-list"
                                        className="admin-modal-input"
                                        value={workerName}
                                        onChange={(e) => setWorkerName(e.target.value)}
                                        placeholder="e.g., Road Repair Unit Alpha, John Doe, Electrical Crew #2"
                                        required
                                    />
                                    <datalist id="registered-workers-list">
                                        {users.map(u => (
                                            <option key={u.id} value={`${u.name} (${u.email})`} />
                                        ))}
                                        <option value="Road Maintenance Unit Alpha" />
                                        <option value="Municipal Drainage Team" />
                                        <option value="Streetlight & Electrical Crew" />
                                        <option value="Rapid Pothole Patch Squad" />
                                        <option value="Traffic Signal Tech Division" />
                                    </datalist>
                                    <div className="admin-quick-template-chips">
                                        {["Road Unit Alpha", "Drainage Team", "Electrical Crew", "Rapid Patch Squad"].map(unit => (
                                            <button 
                                                key={unit} 
                                                type="button" 
                                                className="admin-quick-chip"
                                                onClick={() => setWorkerName(unit)}
                                            >
                                                + {unit}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="admin-modal-field">
                                    <label className="admin-modal-label">Priority Level</label>
                                    <select
                                        value={workerPriority}
                                        onChange={(e) => setWorkerPriority(e.target.value)}
                                        className="admin-modal-input"
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <option value="Low">Low Priority</option>
                                        <option value="Medium">Medium Priority</option>
                                        <option value="High">High Priority</option>
                                        <option value="Critical">Critical (Immediate Dispatch)</option>
                                    </select>
                                </div>

                                <div className="admin-modal-field">
                                    <label className="admin-modal-label">Work Order Instructions / Notes (Optional)</label>
                                    <textarea
                                        value={workerNotes}
                                        onChange={(e) => setWorkerNotes(e.target.value)}
                                        placeholder="Instructions for the assigned team (e.g. Inspect pothole depth, apply asphalt patch, replace broken bulb)..."
                                        rows={3}
                                        className="admin-modal-textarea"
                                    />
                                </div>
                            </div>

                            <div className="admin-modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={() => setAssignWorkerModal(null)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={isAssigning || !workerName.trim()}>
                                    {isAssigning ? "Dispatching..." : "Confirm & Dispatch Worker"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Resolution Modal */}
            {resolveModal && (
                <div className="admin-modal-overlay">
                    <div className="admin-modal-card">
                        <div className="admin-modal-header">
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Resolution Confirmation</h3>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {resolveModal.reportId === 'bulk' ? `Resolving ${selectedReports.length} reports` : `Resolving report #${resolveModal.reportId}`}
                                </p>
                            </div>
                            <button 
                                type="button" 
                                className="admin-detail-close-btn" 
                                onClick={() => setResolveModal(null)}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="admin-modal-body">
                            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                                Provide an optional note detailing how this issue was resolved. It will be permanently recorded into the audit trail.
                            </p>
                            <textarea
                                value={resolveNote}
                                onChange={(e) => setResolveNote(e.target.value)}
                                placeholder="e.g., Dispatched maintenance crew, road patched successfully with asphalt filler."
                                rows={3}
                                className="admin-modal-textarea"
                            />
                        </div>
                        <div className="admin-modal-footer">
                            <button type="button" className="btn btn-ghost" onClick={() => setResolveModal(null)}>Cancel</button>
                            <button type="button" className="btn btn-success" onClick={submitResolve}>Confirm Resolution</button>
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
