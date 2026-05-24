import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
    Search, Download, RefreshCw, Filter, MapPin,
    ChevronUp, ChevronDown, AlertCircle, CheckCircle,
    Eye, Calendar, TrendingUp, Database, BarChart3, AlertTriangle,
    Layers, Trash2, ExternalLink, ZoomIn, Car, Users
} from "lucide-react";
import { DBEntry } from "../types";

import { API_BASE } from "../api/config";
import { useAuth } from "../context/AuthContext";

type SortKey = "id" | "confidence" | "timestamp" | "latitude" | "longitude" | "object_type";
type SortDir = "asc" | "desc";
type ClassFilter = "all" | "pothole" | "vehicle" | "person" | "danger";
type TimeFilter = "all" | "today" | "week" | "month";

const VEHICLE_TYPES = new Set(["car", "truck", "bus", "motorcycle"]);

const CONF_COLOR = (c: number) =>
    c >= 0.7 ? "#10b981" : c >= 0.4 ? "#f59e0b" : "#ef4444";

const CONF_LABEL = (c: number) =>
    c >= 0.7 ? "High" : c >= 0.4 ? "Medium" : "Low";

const CLASS_COLOR: Record<string, string> = {
    pothole: "var(--primary)",
    car: "#38bdf8", truck: "#38bdf8", bus: "#38bdf8", motorcycle: "#38bdf8",
    person: "#a78bfa",
};

const getClassIcon = (type: string, size = 16) => {
    if (type === "pothole") return <MapPin size={size} />;
    if (VEHICLE_TYPES.has(type)) return <Car size={size} />;
    if (type === "person") return <Users size={size} />;
    return <Layers size={size} />;
};

function normalizeClass(t: string): ClassFilter {
    if (!t || t === "pothole") return "pothole";
    if (VEHICLE_TYPES.has(t)) return "vehicle";
    if (t === "person") return "person";
    return "pothole";
}

export default function DetectionLog() {
    const { token } = useAuth();
    const authHeaders = React.useMemo(() => token ? { headers: { Authorization: `Bearer ${token}` } } : {}, [token]);

    const [rows, setRows] = useState<DBEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState("");
    const [classFilter, setClassFilter] = useState<ClassFilter>("all");
    const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
    const [sortKey, setSortKey] = useState<SortKey>("id");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [page, setPage] = useState(1);
    const [viewMode, setViewMode] = useState<"table" | "grid">("table");
    const PAGE_SIZE = 15;

    const fetchData = useCallback(async (quiet = false) => {
        if (!quiet) setLoading(true); else setRefreshing(true);
        try {
            // Use /detections (new endpoint) falling back to /potholes
            const res = await axios.get<DBEntry[]>(`${API_BASE}/detections`, authHeaders);
            setRows(res.data);
        } catch {
            try {
                const res = await axios.get<DBEntry[]>(`${API_BASE}/potholes`, authHeaders);
                setRows(res.data);
            } catch {
                console.error("Detection log fetch failed");
            }
        } finally {
            setLoading(false); setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => {
            fetchData(true); // Background refresh
        }, 15000); // 15 seconds for more "live" feel, adjusted from 30s
        return () => clearInterval(interval);
    }, [fetchData]);

    // ── Derived data ─────────────────────────────────────────────
    const filtered = rows
        .filter(r => {
            const q = search.toLowerCase();
            const matchSearch = !q ||
                r.id.toString().includes(q) ||
                (r.object_type || "").toLowerCase().includes(q) ||
                (r.timestamp || "").toLowerCase().includes(q) ||
                r.latitude.toString().includes(q) ||
                r.longitude.toString().includes(q);

            const nc = normalizeClass(r.object_type || "pothole");
            const matchClass =
                classFilter === "all" ||
                (classFilter === "pothole" && nc === "pothole") ||
                (classFilter === "vehicle" && nc === "vehicle") ||
                (classFilter === "person" && nc === "person") ||
                (classFilter === "danger" && r.is_danger === 1);

            // Time filter
            let matchTime = true;
            if (timeFilter !== "all" && r.timestamp) {
                const now = new Date();
                const rDate = new Date(r.timestamp);
                if (timeFilter === "today") {
                    matchTime = rDate.toDateString() === now.toDateString();
                } else if (timeFilter === "week") {
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    matchTime = rDate >= weekAgo;
                } else if (timeFilter === "month") {
                    matchTime = rDate.getMonth() === now.getMonth() && rDate.getFullYear() === now.getFullYear();
                }
            }

            return matchSearch && matchClass && matchTime;
        })
        .sort((a, b) => {
            let av: number | string =
                sortKey === "object_type" ? (a.object_type || "") :
                    sortKey === "timestamp" ? (a.timestamp || "") :
                        (a as never)[sortKey] ?? "";
            let bv: number | string =
                sortKey === "object_type" ? (b.object_type || "") :
                    sortKey === "timestamp" ? (b.timestamp || "") :
                        (b as never)[sortKey] ?? "";
            if (av < bv) return sortDir === "asc" ? -1 : 1;
            if (av > bv) return sortDir === "asc" ? 1 : -1;
            return 0;
        });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    // ── Stats strip ──────────────────────────────────────────────
    const avgConf = rows.length ? (rows.reduce((s, r) => s + (r.confidence || 0), 0) / rows.length * 100).toFixed(1) : "0.0";
    const potholeCount = rows.filter(r => (r.object_type || "pothole") === "pothole").length;
    const vehicleCount = rows.filter(r => VEHICLE_TYPES.has(r.object_type || "")).length;
    const peopleCount = rows.filter(r => (r.object_type || "") === "person").length;
    const dangerCount = rows.filter(r => r.is_danger === 1).length;
    const todayCount = rows.filter(r => {
        if (!r.timestamp) return false;
        return new Date(r.timestamp).toDateString() === new Date().toDateString();
    }).length;

    // ── Sorting ──────────────────────────────────────────────────
    const handleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortKey(key); setSortDir("desc"); }
    };
    const SortIcon = ({ col }: { col: SortKey }) =>
        sortKey === col
            ? (sortDir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />)
            : <span style={{ opacity: 0.2 }}><ChevronDown size={13} /></span>;

    // ── Selection ────────────────────────────────────────────────
    const toggleSelect = (id: number) =>
        setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const toggleAll = () =>
        setSelectedIds(selectedIds.size === paginated.length ? new Set() : new Set(paginated.map(r => r.id)));

    // ── CSV Export ───────────────────────────────────────────────
    const exportCSV = () => {
        const toExport = selectedIds.size > 0 ? filtered.filter(r => selectedIds.has(r.id)) : filtered;
        const header = "ID,Type,Latitude,Longitude,Confidence,Severity,Timestamp,Camera ID\n";
        const body = toExport.map(r =>
            `${r.id},${r.object_type || "pothole"},${r.latitude},${r.longitude},${((r.confidence || 0) * 100).toFixed(1)}%,${CONF_LABEL(r.confidence || 0)},${r.timestamp ?? ""},${r.camera_id || ""}`
        ).join("\n");
        const blob = new Blob([header + body], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url;
        a.download = `smart_city_detections_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click(); URL.revokeObjectURL(url);
    };

    // ── Bulk Delete ──────────────────────────────────────────────
    const handleBulkDelete = () => {
        if (selectedIds.size === 0) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} selected detection(s)? This action cannot be undone.`)) return;
        // In real implementation, this would call an API endpoint
        console.log("Deleting IDs:", Array.from(selectedIds));
        alert("Bulk delete would be implemented with backend API support");
        setSelectedIds(new Set());
    };

    if (loading) return (
        <div className="log-loading">
            <div className="loader" />
            <p>Initializing system node forensics...</p>
        </div>
    );

    return (
        <div className="log-page animate-in">
            {/* Header Area */}
            <div className="log-header">
                <div>
                    <h1 className="log-title">Detection Intelligence</h1>
                    <p className="log-subtitle">Telemetry repository & infrastructure event analysis</p>
                </div>
                <div className="log-header-actions">
                    <button className="log-btn-ghost" onClick={() => fetchData(true)} disabled={refreshing}>
                        <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                        <span>Sync Node</span>
                    </button>
                    <button className="log-btn-export" onClick={exportCSV}>
                        <Download size={14} />
                        <span>Export</span>
                    </button>
                </div>
            </div>

            {/* Premium Stats Grid */}
            <div className="log-stats-grid">
                {[
                    { label: "System Records", value: rows.length, icon: <Database />, color: "primary" },
                    { label: "Critical Alerts", value: dangerCount, icon: <AlertTriangle />, color: "danger" },
                    { label: "Surface Hazards", value: potholeCount, icon: <MapPin />, color: "warning" },
                    { label: "Active Nodes", value: vehicleCount + peopleCount, icon: <Layers />, color: "info" },
                    { label: "System Confidence", value: `${avgConf}%`, icon: <TrendingUp />, color: "success" }
                ].map((s, i) => (
                    <div key={i} className={`log-stat-card stat-${s.color}`}>
                        <div className="stat-icon-bg">{s.icon}</div>
                        <div className="stat-content">
                            <span className="stat-value">{s.value}</span>
                            <span className="stat-label">{s.label}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Unified Main Container */}
            <div className="log-main-container">
                <div className="log-toolbar">
                    <div className="log-search-wrapper">
                        <Search size={16} />
                        <input
                            placeholder="Rapid search telemetry..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>

                    <div className="log-filters">
                        <span className="filter-label">Entities:</span>
                        {([
                            { id: "all", label: "All", icon: <Layers /> },
                            { id: "pothole", label: "Potholes", icon: <MapPin /> },
                            { id: "vehicle", label: "Vehicles", icon: <Car /> },
                            { id: "person", label: "People", icon: <Users /> }
                        ] as const).map(f => (
                            <button
                                key={f.id}
                                className={`log-chip ${classFilter === f.id ? 'active' : ''}`}
                                onClick={() => { setClassFilter(f.id); setPage(1); }}
                            >
                                {f.icon} {f.label}
                            </button>
                        ))}
                    </div>

                    {selectedIds.size > 0 && (
                        <div className="log-selection-bar slide-up">
                            <span>{selectedIds.size} Selected</span>
                            <button className="log-btn-danger-sm" onClick={handleBulkDelete}>
                                <Trash2 size={13} /> Delete
                            </button>
                        </div>
                    )}
                </div>

                <div className="log-table-area">
                    <table className="log-table">
                        <colgroup>
                            <col style={{ width: '44px' }} />
                            <col style={{ width: '200px' }} />
                            <col style={{ width: '120px' }} />
                            <col style={{ width: '110px' }} />
                            <col />
                            <col style={{ width: '140px' }} />
                            <col style={{ width: '100px' }} />
                        </colgroup>
                        <thead>
                            <tr>
                                <th><input type="checkbox" onChange={toggleAll} checked={selectedIds.size === paginated.length && paginated.length > 0} /></th>
                                <th>Incident Asset</th>
                                <th onClick={() => handleSort("confidence")} className="sortable">Confidence <SortIcon col="confidence" /></th>
                                <th>Severity</th>
                                <th>Geo-Telemetry</th>
                                <th onClick={() => handleSort("timestamp")} className="sortable">Timestamp <SortIcon col="timestamp" /></th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.length === 0 ? (
                                <tr>
                                    <td colSpan={7}>
                                        <div className="log-empty-state">
                                            <Database size={40} />
                                            <h3>No matches located</h3>
                                            <p>Refine your security filters or sync node</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginated.map(row => {
                                const otype = row.object_type || "pothole";
                                const conf = row.confidence || 0;
                                return (
                                    <tr key={row.id} className={selectedIds.has(row.id) ? 'selected' : ''} onClick={() => toggleSelect(row.id)}>
                                        <td onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(row.id)} readOnly /></td>
                                        <td>
                                            <div className="log-entity-cell">
                                                <div className="log-thumb-box" onClick={(e) => { e.stopPropagation(); row.image && window.open(`${API_BASE}/results/${row.image}`, '_blank'); }}>
                                                    {row.image && (
                                                        <img
                                                            src={`${API_BASE}/results/${row.image}`}
                                                            alt=""
                                                            onLoad={(e) => { (e.target as HTMLImageElement).nextElementSibling!.classList.add('hidden'); }}
                                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                        />
                                                    )}
                                                    <div className="thumb-stub" style={{ color: CLASS_COLOR[otype] || 'var(--text-muted)' }}>
                                                        {getClassIcon(otype, 16)}
                                                    </div>
                                                    <div className="log-thumb-hover"><Eye size={14} /></div>
                                                </div>
                                                <div className="log-entity-meta">
                                                    <span className="entity-type">{getClassIcon(otype, 12)} {otype}</span>
                                                    <span className="entity-id">SCAN-{row.id}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="log-conf-viz">
                                                <div className="log-conf-details">
                                                    <span style={{ color: CONF_COLOR(conf) }}>{(conf * 100).toFixed(1)}%</span>
                                                </div>
                                                <div className="log-confbar">
                                                    <div className="fill" style={{ width: `${conf * 100}%`, background: CONF_COLOR(conf) }} />
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`log-sev-pill ${
                                                row.is_danger ? 'sev-danger' :
                                                conf > 0.7 ? 'sev-high' :
                                                conf > 0.4 ? 'sev-medium' : 'sev-low'
                                            }`}>
                                                {row.is_danger ? 'Critical' : conf > 0.7 ? 'High' : conf > 0.4 ? 'Medium' : 'Low'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="log-coord-stack">
                                                <span className="coords">{row.latitude.toFixed(4)}, {row.longitude.toFixed(4)}</span>
                                                <span className="source-node">GPS Module • {row.camera_id || 'Auto-Detect'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="log-time-stack">
                                                <span className="date">{row.timestamp ? new Date(row.timestamp).toLocaleDateString() : '--'}</span>
                                                <span className="time">{row.timestamp ? new Date(row.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</span>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div className="log-row-actions">
                                                <button className="log-row-btn" onClick={(e) => { e.stopPropagation(); window.open(`https://maps.google.com/?q=${row.latitude},${row.longitude}`, "_blank") }}>
                                                    <MapPin size={13} />
                                                </button>
                                                <button className="log-row-btn del" onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (!window.confirm(`Delete detection SCAN-${row.id}?`)) return;
                                                    try {
                                                        await axios.delete(`${API_BASE}/detections/${row.id}`, authHeaders);
                                                        fetchData(true);
                                                    } catch (err: any) {
                                                        const msg = err?.response?.data?.detail || err?.message || 'Delete failed';
                                                        alert(`Error: ${msg}`);
                                                    }
                                                }}>
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="log-footer">
                    <div className="log-footer-info">Showing {paginated.length} of {filtered.length} entries</div>
                    <div className="log-pagination">
                        <button className="log-pag-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹ Prev</button>
                        <span className="pag-page">{page} / {totalPages}</span>
                        <button className="log-pag-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next ›</button>
                    </div>
                </div>
            </div>

            <style>{`
                .log-page {
                    padding: 0; /* Removed horizontal padding since parent wrapper provides it */
                    max-width: 1400px;
                    margin: 0 auto;
                    color: var(--text-main);
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                    box-sizing: border-box;
                }

                .log-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .log-title { font-size: 1.9rem; font-weight: 800; letter-spacing: -0.02em; margin: 0; }
                .log-subtitle { color: var(--text-muted); margin: 4px 0 0; font-size: 0.9rem; font-weight: 500; }

                .log-header-actions { display: flex; gap: 12px; }

                .log-btn-ghost, .log-btn-export {
                    display: flex; align-items: center; gap: 8px; padding: 10px 16px; 
                    border-radius: 12px; font-weight: 600; font-size: 0.85rem; cursor: pointer;
                    transition: all 0.2s;
                }

                .log-btn-ghost { background: var(--bg-hover); border: 1px solid var(--border); color: var(--text-secondary); }
                .log-btn-ghost:hover:not(:disabled) { background: var(--primary-glow); border-color: var(--primary); color: var(--primary); }

                .log-btn-export { background: var(--primary); color: white; border: none; box-shadow: 0 4px 12px var(--primary-shadow); }
                .log-btn-export:hover { transform: translateY(-2px); box-shadow: 0 6px 16px var(--primary-shadow); }

                .log-stats-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; }

                .log-stat-card {
                    background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px;
                    padding: 12px 14px; display: flex; align-items: center; gap: 10px;
                    transition: transform 0.2s;
                }

                .log-stat-card:hover { transform: translateY(-3px); border-color: var(--primary-glow); }

                .stat-icon-bg {
                    width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center;
                    background: var(--bg-hover); color: var(--text-secondary); flex-shrink: 0;
                }

                .stat-primary .stat-icon-bg { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
                .stat-danger .stat-icon-bg { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
                .stat-warning .stat-icon-bg { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
                .stat-info .stat-icon-bg { background: rgba(167, 139, 250, 0.1); color: #a78bfa; }
                .stat-success .stat-icon-bg { background: rgba(16, 185, 129, 0.1); color: #10b981; }

                .stat-value { font-size: 1.1rem; font-weight: 800; display: block; line-height: 1.2; }
                .stat-label { font-size: 0.62rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; }

                /* ── Main container to allow natural growth ── */
                .log-main-container {
                    background: var(--bg-card);
                    border-radius: 20px;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 4px 24px rgba(0,0,0,0.05);
                    border: 1px solid var(--border);
                }

                .log-toolbar {
                    padding: 14px 24px; border-bottom: 1px solid var(--border);
                    display: flex; justify-content: space-between; align-items: center; gap: 24px;
                    background: rgba(255,255,255,0.01);
                }

                .log-search-wrapper { position: relative; flex: 1; max-width: 300px; }
                .log-search-wrapper svg { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
                .log-search-wrapper input {
                    width: 100%; padding: 9px 14px 9px 42px; background: var(--bg-hover);
                    border: 1px solid var(--border); border-radius: 10px; color: var(--text-main);
                    font-size: 0.85rem; outline: none; transition: all 0.2s; box-sizing: border-box;
                }
                .log-search-wrapper input:focus { border-color: var(--primary); background: rgba(255,255,255,0.02); }

                .log-filters { display: flex; align-items: center; gap: 8px; }
                .filter-label { font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.07em; margin-right: 4px; }

                .log-chip {
                    display: flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 8px;
                    background: var(--bg-hover); border: 1px solid var(--border); color: var(--text-secondary);
                    font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
                }
                .log-chip:hover { border-color: var(--text-muted); color: var(--text-main); }
                .log-chip.active { background: var(--primary); border-color: var(--primary); color: white; }

                .log-selection-bar {
                    display: flex; align-items: center; gap: 12px; padding: 4px 4px 4px 12px;
                    border-radius: 10px; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.1);
                }
                .log-selection-bar span { font-size: 0.8rem; font-weight: 700; color: #ef4444; }
                .log-btn-danger-sm {
                    padding: 6px 12px; background: #ef4444; border: none; border-radius: 6px;
                    color: white; font-weight: 700; font-size: 0.75rem; cursor: pointer;
                    display: flex; align-items: center; gap: 6px;
                }

                /* ── Table flows naturally ── */
                .log-table-area { width: 100%; overflow-x: auto; }
                .log-table { width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed; }
                .log-table colgroup col:nth-child(1) { width: 44px; }
                .log-table colgroup col:nth-child(2) { width: 200px; }
                .log-table colgroup col:nth-child(3) { width: 120px; }
                .log-table colgroup col:nth-child(4) { width: 110px; }
                .log-table colgroup col:nth-child(5) { width: 200px; }
                .log-table colgroup col:nth-child(6) { width: 140px; }
                .log-table colgroup col:nth-child(7) { width: 100px; }
                .log-table th {
                    text-align: left; padding: 13px 20px; border-bottom: 1px solid var(--border);
                    font-size: 0.68rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted);
                    letter-spacing: 0.1em; white-space: nowrap;
                    background: var(--bg-card); /* Remove static background */
                }
                .log-table th.sortable { cursor: pointer; transition: color 0.2s; }
                .log-table th.sortable:hover { color: var(--text-main); }

                .log-table td { padding: 11px 20px; border-bottom: 1px solid var(--border); vertical-align: middle; }
                .log-table tr:last-child td { border-bottom: none; }
                .log-table tr:hover td { background: rgba(125,125,125,0.05); }
                .log-table tr.selected td { background: var(--primary-glow); }

                .log-entity-cell { display: flex; align-items: center; gap: 12px; }
                .log-thumb-box {
                    width: 52px; height: 38px; border-radius: 8px; overflow: hidden; position: relative;
                    border: 1px solid var(--border); background: var(--bg-hover); cursor: pointer; flex-shrink: 0;
                }
                .log-thumb-box img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: block; position: relative; z-index: 1; }
                .log-thumb-hover { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; opacity: 0; transition: 0.2s; color: white; z-index: 2; }
                .log-thumb-box:hover img { transform: scale(1.15); }
                .log-thumb-box:hover .log-thumb-hover { opacity: 1; }
                .thumb-stub { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; position: absolute; inset: 0; z-index: 0; background: var(--bg-hover); }
                .thumb-stub.hidden { display: none; }

                .log-entity-meta { display: flex; flex-direction: column; min-width: 0; }
                .entity-type { font-size: 0.83rem; font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 5px; text-transform: capitalize; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .entity-id { font-family: 'JetBrains Mono', monospace; font-size: 0.68rem; color: var(--text-muted); font-weight: 600; margin-top: 2px; }

                .log-conf-viz { width: 90px; }
                .log-conf-details { display: flex; justify-content: space-between; font-size: 0.78rem; font-weight: 800; margin-bottom: 6px; }
                .log-confbar { height: 6px; background: rgba(125,125,125,0.15); border-radius: 4px; overflow: hidden; }
                .log-confbar .fill { height: 100%; border-radius: 4px; transition: width 0.8s ease-out; }

                .log-sev-pill {
                    display: inline-block;
                    padding: 4px 10px; border-radius: 6px; font-size: 0.65rem; font-weight: 800; text-transform: uppercase;
                    border: 1px solid transparent; letter-spacing: 0.06em; white-space: nowrap;
                }
                .sev-danger  { background: rgba(239, 68, 68, 0.12);  color: #ef4444; border-color: rgba(239, 68, 68, 0.25); }
                .sev-high    { background: rgba(245, 158, 11, 0.12); color: #f59e0b; border-color: rgba(245, 158, 11, 0.25); }
                .sev-medium  { background: rgba(251, 191, 36, 0.10); color: #fbbf24; border-color: rgba(251, 191, 36, 0.2); }
                .sev-low     { background: rgba(148, 163, 184, 0.10); color: #94a3b8; border-color: rgba(148, 163, 184, 0.2); }

                .log-coord-stack, .log-time-stack { display: flex; flex-direction: column; }
                .coords, .date { font-size: 0.82rem; font-weight: 700; font-family: 'JetBrains Mono', monospace; color: var(--text-secondary); }
                .source-node, .time { font-size: 0.68rem; color: var(--text-muted); font-weight: 600; margin-top: 2px; }

                .log-row-actions { display: flex; gap: 8px; justify-content: flex-end; }
                .log-row-btn {
                    width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--border);
                    background: transparent; color: var(--text-muted); cursor: pointer;
                    display: flex; align-items: center; justify-content: center; transition: all 0.2s;
                }
                .log-row-btn:hover { background: var(--bg-hover); color: var(--text-main); border-color: var(--text-secondary); }
                .log-row-btn.del:hover { color: #ef4444; background: rgba(239, 68, 68, 0.05); border-color: rgba(239, 68, 68, 0.2); }

                .log-footer {
                    padding: 13px 24px; border-top: 1px solid var(--border); background: rgba(255,255,255,0.01);
                    display: flex; justify-content: space-between; align-items: center;
                    border-radius: 0 0 20px 20px;
                }
                .log-footer-info { font-size: 0.8rem; color: var(--text-muted); font-weight: 500; }

                .log-pagination { display: flex; align-items: center; gap: 12px; }
                .log-pag-btn {
                    padding: 6px 14px; border-radius: 8px; border: 1px solid var(--border);
                    background: var(--bg-hover); color: var(--text-secondary); font-size: 0.8rem; font-weight: 700;
                    cursor: pointer; transition: 0.2s;
                }
                .log-pag-btn:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
                .log-pag-btn:disabled { opacity: 0.3; cursor: not-allowed; }
                .pag-page { font-size: 0.8rem; font-weight: 700; color: var(--text-main); background: var(--bg-hover); padding: 5px 12px; border-radius: 8px; border: 1px solid var(--border); }

                .log-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 0; color: var(--text-muted); text-align: center; }
                .log-empty-state h3 { font-size: 1.2rem; font-weight: 700; color: var(--text-secondary); margin: 14px 0 6px; }

                .log-loading { height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--bg-page); }
                .loader { width: 44px; height: 44px; border: 3px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 20px; }
                @keyframes spin { to { transform: rotate(360deg); } }
                .animate-in { animation: fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
                .slide-up { animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
                @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
                .spin { animation: spin 1s linear infinite; }
            `}</style>

        </div>
    );
}
