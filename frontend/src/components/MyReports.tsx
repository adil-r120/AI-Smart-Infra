import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { API_BASE } from "../api/config";
import { useAuth } from "../context/AuthContext";
import {
    ClipboardList, RefreshCw, Clock, CheckCircle2,
    AlertCircle, MapPin, Calendar, ChevronDown,
    ChevronUp, FileText, Loader2, Plus, ShieldAlert,
    Wrench, CheckCheck, Radio, Activity, Eye, Sparkles, UserCheck
} from "lucide-react";
import "./MyReports.css";

interface Report {
    id: number;
    problem_type: string;
    location: string;
    description: string;
    status: "Pending" | "Approved" | "Resolved" | string;
    priority_level: string;
    deterioration_score: number;
    timestamp: string;
    image_path: string | null;
    assigned_worker?: string | null;
    worker_notes?: string | null;
    assigned_at?: string | null;
}

const CATEGORY_ICONS: Record<string, string> = {
    pothole: "🕳️",
    broken_streetlight: "💡",
    fallen_tree: "🌳",
    flooding: "🌊",
    traffic_signal: "🚦",
    garbage_dump: "🗑️",
    road_damage: "🛣️",
    other: "📋",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
    Pending:  { label: "Pending",  color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  Icon: Clock         },
    Approved: { label: "Approved", color: "#3b82f6", bg: "rgba(59,130,246,0.12)",  Icon: Wrench        },
    Resolved: { label: "Resolved", color: "#10b981", bg: "rgba(16,185,129,0.12)",  Icon: CheckCircle2  },
};

const PRIORITY_COLOR: Record<string, string> = {
    Low: "#10b981", 
    Medium: "#f59e0b", 
    High: "#ef4444", 
    Critical: "#8b5cf6",
};

const TRACKER_MILESTONES = [
    { key: "Submitted", label: "Submitted", sublabel: "Logged & AI Checked", icon: FileText },
    { key: "Pending",   label: "Under Review", sublabel: "Dept. Assessment", icon: Clock },
    { key: "Approved",  label: "Crew Dispatched", sublabel: "Assigned & In Progress", icon: Wrench },
    { key: "Resolved",  label: "Resolved", sublabel: "Completed & Verified", icon: CheckCheck },
];

const getStepProgress = (status: string) => {
    switch (status) {
        case "Resolved": return { activeIndex: 3, percentage: 100 };
        case "Approved": return { activeIndex: 2, percentage: 66 };
        case "Pending":  return { activeIndex: 1, percentage: 33 };
        default:         return { activeIndex: 0, percentage: 5 };
    }
};

const MyReports: React.FC<{ onReportNew: () => void }> = ({ onReportNew }) => {
    const { token } = useAuth();
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>("All");
    const [wsConnected, setWsConnected] = useState(false);

    const getAuthConfig = useCallback(() =>
        token ? { headers: { Authorization: `Bearer ${token}` } } : {},
    [token]);

    const autoExpandedRef = useRef(false);

    const fetchReports = useCallback(async (showSpinner = false) => {
        if (showSpinner) setRefreshing(true);
        try {
            const res = await axios.get(`${API_BASE}/reports`, getAuthConfig());
            setReports(res.data);
            if (res.data.length > 0 && !autoExpandedRef.current) {
                autoExpandedRef.current = true;
                setExpandedId(res.data[0].id);
            }
            setError(null);
        } catch {
            setError("Could not load your reports. Please check your connection.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [getAuthConfig]);

    useEffect(() => {
        fetchReports();
        const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const isDev = window.location.port === "5173" || window.location.port === "5174";
        const wsHost = isDev ? `${window.location.hostname}:8000` : window.location.host;
        const wsUrl = `${wsProtocol}//${wsHost}/ws`;
        const socket = new WebSocket(wsUrl);

        socket.onopen = () => setWsConnected(true);
        socket.onclose = () => setWsConnected(false);

        socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === "new_report" || message.type === "report_updated" || message.type === "notification") {
                    fetchReports();
                }
            } catch (err) { }
        };
        return () => {
            if (socket.readyState === WebSocket.CONNECTING) {
                socket.onopen = () => socket.close();
            } else {
                socket.close();
            }
        };
    }, [fetchReports]);

    const filtered = filterStatus === "All"
        ? reports
        : reports.filter(r => r.status === filterStatus);

    const counts = {
        all: reports.length,
        pending: reports.filter(r => r.status === "Pending").length,
        approved: reports.filter(r => r.status === "Approved").length,
        resolved: reports.filter(r => r.status === "Resolved").length,
    };

    const formatDate = (ts: string) => {
        try {
            const d = new Date(ts);
            return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                + " · " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
        } catch { return ts; }
    };

    return (
        <div className="my-reports-root animate-in">
            {/* ── Subheader Bar ── */}
            <div className="myreports-subheader">
                <div className="myreports-subheader-left">
                    <h3 className="myreports-sub-title">
                        <span>Incident Resolution Telemetry</span>
                        <span className="myreports-live-badge">
                            <Radio size={11} className={wsConnected ? "text-emerald" : ""} />
                            {wsConnected ? "LIVE SYNC ACTIVE" : "SYNC READY"}
                        </span>
                    </h3>
                    <p className="myreports-sub-desc">
                        Real-time 4-stage tracking, engineering assessments, and field work order verifications.
                    </p>
                </div>

                <div className="myreports-subheader-actions">
                    <button
                        type="button"
                        className="myreports-btn-refresh"
                        onClick={() => fetchReports(true)}
                        disabled={refreshing}
                        title="Fetch latest updates from the server"
                    >
                        <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                        <span>Refresh</span>
                    </button>
                    <button
                        type="button"
                        className="myreports-btn-new"
                        onClick={onReportNew}
                    >
                        <Plus size={15} />
                        <span>New Report</span>
                    </button>
                </div>
            </div>

            {/* ── KPI Telemetry Metrics ── */}
            <div className="myreports-kpi-grid">
                {[
                    { label: "Total Reports", count: counts.all, color: "var(--primary)", icon: "📋", meta: "100% Logged" },
                    { label: "Under Review", count: counts.pending, color: "#f59e0b", icon: "⏳", meta: `${counts.all ? Math.round((counts.pending / counts.all) * 100) : 0}% Active` },
                    { label: "Crew Dispatched", count: counts.approved, color: "#3b82f6", icon: "👷", meta: `${counts.all ? Math.round((counts.approved / counts.all) * 100) : 0}% Assigned` },
                    { label: "Resolved Work", count: counts.resolved, color: "#10b981", icon: "🎉", meta: `${counts.all ? Math.round((counts.resolved / counts.all) * 100) : 0}% Fixed` },
                ].map(stat => (
                    <div key={stat.label} className="myreports-kpi-card">
                        <div className="myreports-kpi-header">
                            <div className="myreports-kpi-icon-wrap">{stat.icon}</div>
                            <span className="myreports-kpi-val" style={{ color: stat.color }}>
                                {stat.count}
                            </span>
                        </div>
                        <div className="myreports-kpi-footer">
                            <span className="myreports-kpi-label">{stat.label}</span>
                            <span className="myreports-kpi-meta">{stat.meta}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Filter Tabs ── */}
            <div className="myreports-filter-strip">
                {["All", "Pending", "Approved", "Resolved"].map(s => (
                    <button
                        type="button"
                        key={s}
                        className={`myreports-filter-btn ${filterStatus === s ? 'active' : ''}`}
                        onClick={() => setFilterStatus(s)}
                    >
                        <span>{s === "Approved" ? "Dispatched" : s}</span>
                        <span className="myreports-count-pill">
                            {s === "All" ? counts.all : counts[s.toLowerCase() as keyof typeof counts]}
                        </span>
                    </button>
                ))}
            </div>

            {/* ── Content View ── */}
            {loading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 80, gap: 12, color: "var(--text-muted)" }}>
                    <Loader2 size={24} className="animate-spin text-primary" />
                    <span style={{ fontSize: "0.9rem", fontWeight: 700 }}>Synchronizing incident milestones & field updates...</span>
                </div>
            ) : error ? (
                <div style={{ textAlign: "center", padding: 60, color: "#ef4444" }}>
                    <AlertCircle size={36} style={{ marginBottom: 12, opacity: 0.8 }} />
                    <p style={{ fontSize: "0.9rem", fontWeight: 700 }}>{error}</p>
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: "center", padding: "64px 24px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20 }}>
                    <FileText size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
                    <h4 style={{ margin: "0 0 8px", fontWeight: 800, fontSize: "1.15rem", color: "var(--text-main)" }}>
                        {filterStatus === "All" ? "No infrastructure incidents reported yet" : `No ${filterStatus} reports found`}
                    </h4>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", maxWidth: 460, margin: "0 auto 24px", lineHeight: 1.5 }}>
                        {filterStatus === "All"
                            ? "Once you submit an incident report, its entire municipal resolution lifecycle will be tracked across all 4 stages."
                            : "Try switching to another status tab or report a new infrastructure issue."}
                    </p>
                    <button
                        type="button"
                        className="myreports-btn-new"
                        onClick={onReportNew}
                        style={{ padding: "10px 22px", fontSize: "0.85rem" }}
                    >
                        <Plus size={16} /> Submit Your First Report
                    </button>
                </div>
            ) : (
                <div className="myreports-cards-list">
                    {filtered.map(report => {
                        const sc = STATUS_CONFIG[report.status] || STATUS_CONFIG.Pending;
                        const StatusIcon = sc.Icon;
                        const isExpanded = expandedId === report.id;
                        const catIcon = CATEGORY_ICONS[report.problem_type] || "📋";
                        const catLabel = report.problem_type.replace(/_/g, " ");
                        const { activeIndex, percentage } = getStepProgress(report.status);

                        return (
                            <div
                                key={report.id}
                                className={`myreports-card ${isExpanded ? 'expanded' : ''}`}
                            >
                                {/* Card Header Summary */}
                                <div
                                    className="myreports-card-header"
                                    onClick={() => setExpandedId(isExpanded ? null : report.id)}
                                >
                                    {/* Icon Avatar */}
                                    <div className="myreports-card-avatar">
                                        {catIcon}
                                    </div>

                                    {/* Info Column */}
                                    <div className="myreports-card-info">
                                        <div className="myreports-card-title-row">
                                            <span className="myreports-card-title">
                                                {catLabel}
                                            </span>
                                            <span
                                                className="myreports-priority-pill"
                                                style={{
                                                    borderColor: PRIORITY_COLOR[report.priority_level] || "#f59e0b",
                                                    color: PRIORITY_COLOR[report.priority_level] || "#f59e0b",
                                                    backgroundColor: `${PRIORITY_COLOR[report.priority_level] || "#f59e0b"}15`
                                                }}
                                            >
                                                {report.priority_level || "Medium"} Priority
                                            </span>
                                            <span className="myreports-id-tag">
                                                #{report.id}
                                            </span>
                                            {report.assigned_worker && (
                                                <span className="myreports-worker-tag">
                                                    <UserCheck size={11} /> {report.assigned_worker}
                                                </span>
                                            )}
                                        </div>

                                        <div className="myreports-card-location-row">
                                            <MapPin size={13} />
                                            <span>{report.location}</span>
                                        </div>
                                    </div>

                                    {/* Right Status Badge & Toggle Button */}
                                    <div className="myreports-card-status-col">
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                                            <span
                                                className="myreports-status-pill"
                                                style={{
                                                    color: sc.color,
                                                    backgroundColor: sc.bg,
                                                    borderColor: sc.color
                                                }}
                                            >
                                                <StatusIcon size={12} />
                                                {sc.label}
                                            </span>
                                            <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 600 }}>
                                                {formatDate(report.timestamp)}
                                            </span>
                                        </div>

                                        <button
                                            type="button"
                                            className="myreports-toggle-details-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setExpandedId(isExpanded ? null : report.id);
                                            }}
                                        >
                                            <span>{isExpanded ? "Hide Details" : "Track Steps"}</span>
                                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </button>
                                    </div>
                                </div>

                                {/* ── 4-Stage Stepper Progress Track ── */}
                                <div className="myreports-stepper-wrap">
                                    <div className="myreports-stepper-meta">
                                        <span className="myreports-stepper-label">
                                            <Activity size={12} /> Incident Resolution Lifecycle
                                        </span>
                                        <span className="myreports-stepper-stage-txt" style={{ color: sc.color }}>
                                            Stage {activeIndex + 1} of 4: {sc.label}
                                        </span>
                                    </div>

                                    <div className="myreports-stepper-container">
                                        {/* Background Track Line */}
                                        <div className="myreports-track-bg" />

                                        {/* Filled Connecting Line */}
                                        <div
                                            className="myreports-track-fill"
                                            style={{
                                                width: `calc(${percentage}% - 40px)`,
                                                maxWidth: "calc(100% - 72px)"
                                            }}
                                        />

                                        {/* Milestone Nodes */}
                                        <div className="myreports-nodes-row">
                                            {TRACKER_MILESTONES.map((step, idx) => {
                                                const isCompleted = idx < activeIndex;
                                                const isCurrent = idx === activeIndex;

                                                return (
                                                    <div key={step.key} className="myreports-step-node">
                                                        <div
                                                            className={`myreports-node-circle ${isCompleted ? 'completed' : isCurrent ? 'current' : ''}`}
                                                            style={isCurrent ? { borderColor: sc.color, color: sc.color } : {}}
                                                        >
                                                            {isCompleted ? (
                                                                <CheckCircle2 size={16} />
                                                            ) : isCurrent ? (
                                                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: sc.color }} />
                                                            ) : (
                                                                idx + 1
                                                            )}
                                                        </div>

                                                        <span className={`myreports-node-title ${isCurrent ? 'active' : ''}`}>
                                                            {step.label}
                                                        </span>
                                                        <span className="myreports-node-sub">
                                                            {isCompleted ? "Verified" : isCurrent ? "In Progress" : "Pending"}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* ── Expanded Deep Detail Drawer ── */}
                                {isExpanded && (
                                    <div className="myreports-drawer">
                                        {/* Work Done Celebratory Banner */}
                                        {report.status === "Resolved" && (
                                            <div className="myreports-resolved-banner">
                                                <div className="myreports-resolved-orb">
                                                    🎉
                                                </div>
                                                <div>
                                                    <h4 className="myreports-resolved-title">
                                                        Repair Successfully Verified &amp; Completed!
                                                    </h4>
                                                    <p className="myreports-resolved-desc">
                                                        The reported issue at <strong>{report.location}</strong> has been resolved by our maintenance division. Thank you for contributing to safer city roads!
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Description */}
                                        <div>
                                            <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                                                Incident Description
                                            </div>
                                            <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--text-main)", lineHeight: 1.6 }}>
                                                {report.description || "No specific details provided."}
                                            </p>
                                        </div>

                                        {/* Telemetry Metadata Grid */}
                                        <div className="myreports-meta-grid">
                                            <div className="myreports-meta-tile">
                                                <div className="myreports-meta-label">Ticket ID</div>
                                                <div className="myreports-meta-val">#{report.id}</div>
                                            </div>
                                            <div className="myreports-meta-tile">
                                                <div className="myreports-meta-label">Classification</div>
                                                <div className="myreports-meta-val">{catLabel}</div>
                                            </div>
                                            <div className="myreports-meta-tile">
                                                <div className="myreports-meta-label">Priority Code</div>
                                                <div className="myreports-meta-val">{report.priority_level || "Medium"}</div>
                                            </div>
                                            <div className="myreports-meta-tile">
                                                <div className="myreports-meta-label">AI Deterioration</div>
                                                <div className="myreports-meta-val">
                                                    {(report.deterioration_score ?? 0).toFixed(1)}% Score
                                                </div>
                                            </div>
                                        </div>

                                        {/* Dispatched Field Worker Details */}
                                        {report.assigned_worker && (
                                            <div className="myreports-worker-card">
                                                <div className="myreports-worker-header">
                                                    <span style={{ fontSize: "1.25rem" }}>👷</span>
                                                    <span className="myreports-worker-name">
                                                        Field Crew: {report.assigned_worker}
                                                    </span>
                                                    {report.assigned_at && (
                                                        <span className="myreports-worker-time">
                                                            • Dispatched {formatDate(report.assigned_at)}
                                                        </span>
                                                    )}
                                                </div>
                                                {report.worker_notes && (
                                                    <div style={{ fontSize: "0.8rem", color: "var(--text-main)", marginTop: 4 }}>
                                                        <strong>Work Instructions:</strong> {report.worker_notes}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Photo Evidence */}
                                        {report.image_path && (
                                            <div>
                                                <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                                                    Attached Photographic Evidence
                                                </div>
                                                <img
                                                    src={`${API_BASE}/uploads/${report.image_path}`}
                                                    alt="Incident proof"
                                                    className="myreports-evidence-img"
                                                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MyReports;
