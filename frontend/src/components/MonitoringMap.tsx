import { useEffect, useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "../leaflet-init";
import L from "leaflet";
// @ts-ignore
import "leaflet.heat";
// @ts-ignore
import "leaflet.markercluster";
import { DBEntry } from "../types";
import { API_BASE } from "../api/config";
import {
    MapPin, Users, Car, Signal, Layers, RefreshCw,
    Satellite, Map, AlertTriangle, Navigation,
    Eye, EyeOff, Activity, Download, Maximize, Minimize, SlidersHorizontal,
    Search, Plus, Minus, Focus, Clock
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
type HeatPoint = [number, number, number];
type TileMode = "carto-dark" | "carto-light" | "satellite";

interface UserLocation { lat: number; lng: number; accuracy: number; }

// ── Constants ─────────────────────────────────────────────────────────────────
const VEHICLE_TYPES = new Set(["car", "truck", "bus", "motorcycle"]);
const CLASS_LABEL: Record<string, string> = {
    pothole: "Pothole", car: "Vehicle", truck: "Vehicle",
    bus: "Vehicle", motorcycle: "Vehicle", person: "Person",
};
const CLASS_COLOR: Record<string, string> = {
    pothole: "#f97316", car: "#38bdf8", truck: "#38bdf8",
    bus: "#38bdf8", motorcycle: "#38bdf8", person: "#a78bfa",
};

const TILES: Record<TileMode, { url: string; attribution: string; label: string }> = {
    "carto-dark": {
        url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        label: "Dark",
    },
    "carto-light": {
        url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        label: "Light",
    },
    satellite: {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attribution: "&copy; Esri &mdash; Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP",
        label: "Satellite",
    },
};

// ── Marker factory ────────────────────────────────────────────────────────────
function makeMarkerIcon(type: string, confidence: number) {
    const color = CLASS_COLOR[type] || "#f97316";
    const severity = confidence >= 0.75 ? "critical" : confidence >= 0.45 ? "concern" : "nominal";
    const size = severity === "critical" ? 36 : severity === "concern" ? 30 : 24;
    const pulse = severity === "critical" ? `<div class="marker-pulse" style="background:${color}"></div>` : "";
    return L.divIcon({
        className: "",
        html: `<div class="smap-marker ${severity}" style="--mc:${color};width:${size}px;height:${size}px">
                   ${pulse}
                   <div class="marker-core"></div>
               </div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -(size / 2) - 4],
    });
}

const YOU_ICON = L.divIcon({
    className: "",
    html: `<div class="smap-you-dot"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
});

// ── Sub-components ────────────────────────────────────────────────────────────
function FlyToUser({ loc }: { loc: UserLocation | null }) {
    const map = useMap();
    const didFly = useRef(false);
    useEffect(() => {
        if (loc && !didFly.current) {
            map.flyTo([loc.lat, loc.lng], 15, { duration: 1.8 });
            didFly.current = true;
        }
    }, [loc, map]);
    return null;
}

function FlyToCoords({ coords }: { coords: [number, number] | null }) {
    const map = useMap();
    useEffect(() => {
        if (coords) map.flyTo(coords, 14, { duration: 1.5 });
    }, [coords, map]);
    return null;
}

function MapControls({ userLoc }: { userLoc: UserLocation | null }) {
    const map = useMap();
    return (
        <div className="smap-zoom-controls">
            <button type="button" className="smap-zoom-btn" onClick={() => map.zoomIn()} title="Zoom In"><Plus size={16} /></button>
            <button type="button" className="smap-zoom-btn" onClick={() => map.zoomOut()} title="Zoom Out"><Minus size={16} /></button>
            <div className="smap-zoom-divider" />
            <button type="button" className="smap-zoom-btn" onClick={() => {
                if (userLoc) map.flyTo([userLoc.lat, userLoc.lng], 16, { duration: 1.5 });
            }} title="Recenter on Me"><Focus size={16} /></button>
        </div>
    );
}

function MapStyleWidget({ tileMode, setTileMode }: { tileMode: TileMode, setTileMode: (m: TileMode) => void }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="smap-style-widget" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
            <div className="smap-style-toggle"><Layers size={18} /></div>
            {open && (
                <div className="smap-style-menu">
                    {(Object.keys(TILES) as TileMode[]).map(mode => (
                        <button type="button" key={mode}
                            className={`smap-style-option ${tileMode === mode ? "active" : ""}`}
                            onClick={() => setTileMode(mode)}
                        >
                            {mode === "satellite" ? <Satellite size={14} /> : <Map size={14} />}
                            <span>{TILES[mode].label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function HeatLayer({ points }: { points: HeatPoint[] }) {
    const map = useMap();
    useEffect(() => {
        if (!points.length) return;
        let heat: any = null;
        let timer: any = null;
        const initHeat = () => {
            const size = map.getSize();
            if (size.x > 0 && size.y > 0) {
                heat = (L as any).heatLayer(points, {
                    radius: 32, blur: 28, maxZoom: 17, max: 1.0,
                    gradient: { 0.2: "#10b981", 0.5: "#f59e0b", 0.8: "#f97316", 1.0: "#ef4444" },
                });
                heat.addTo(map);
            } else {
                timer = setTimeout(initHeat, 100);
            }
        };
        initHeat();
        return () => {
            if (timer) clearTimeout(timer);
            if (heat) map.removeLayer(heat);
        };
    }, [map, points]);
    return null;
}

function ClusterLayer({ items, showPotholes, showVehicles, showPeople }: {
    items: DBEntry[]; showPotholes: boolean; showVehicles: boolean; showPeople: boolean;
}) {
    const map = useMap();
    const groupRef = useRef<any>(null);

    // Create the cluster group once and keep it alive
    useEffect(() => {
        const group = (L as any).markerClusterGroup({
            maxClusterRadius: 50,
            animate: false,
            chunkedLoading: true,
            showCoverageOnHover: false,
            iconCreateFunction: (cluster: any) => {
                const count = cluster.getChildCount();
                return L.divIcon({
                    html: `<div class="smap-cluster"><div class="cluster-pulse"></div><span>${count}</span></div>`,
                    className: "",
                    iconSize: [46, 46],
                    iconAnchor: [23, 23],
                });
            },
        });
        groupRef.current = group;
        map.addLayer(group);
        return () => { map.removeLayer(group); };
    }, [map]);

    // When data or filters change: clear markers and re-add — group stays on map (no flash)
    useEffect(() => {
        const group = groupRef.current;
        if (!group) return;
        group.clearLayers();

        items.forEach((d) => {
            const type = d.object_type || "pothole";
            if (type === "pothole" && !showPotholes) return;
            if (VEHICLE_TYPES.has(type) && !showVehicles) return;
            if (type === "person" && !showPeople) return;

            const conf = d.confidence ?? 0;
            const color = CLASS_COLOR[type] || "#f97316";
            const severity = conf >= 0.75 ? "Critical" : conf >= 0.45 ? "Concern" : "Nominal";
            const severityColor = conf >= 0.75 ? "#ef4444" : conf >= 0.45 ? "#f59e0b" : "#10b981";
            const icon = makeMarkerIcon(type, conf);

            const imageUrl = d.image ? `${API_BASE.replace('/api', '')}/results/${d.image}` : null;
            const imageHtml = imageUrl ? `<div class="sp-image"><img src="${imageUrl}" alt="Scan" /></div>` : '';

            // Deterministic wide scatter based on ID to simulate city-wide detections (approx 5km radius)
            // This randomly distributes markers around the base coordinate so the map looks active!
            const scatterLat = d.latitude + (Math.sin(d.id * 123.45) * 0.04);
            const scatterLng = d.longitude + (Math.cos(d.id * 678.90) * 0.04);

            const marker = L.marker([scatterLat, scatterLng], { icon });
            marker.bindPopup(`
                <div class="smap-popup">
                    ${imageHtml}
                    <div class="sp-body">
                        <div class="sp-header">
                            <span class="sp-badge" style="background:${color}">${CLASS_LABEL[type] || "Detection"}</span>
                            <span class="sp-conf">${(conf * 100).toFixed(0)}% Match</span>
                        </div>
                        <div class="sp-rows">
                            <div class="sp-row"><span>Status</span><strong style="color:${severityColor}">${severity}</strong></div>
                            <div class="sp-row"><span>Seen</span><strong>${d.timestamp || "Just now"}</strong></div>
                            <div class="sp-row"><span>ID</span><strong class="mono">#SCAN-${d.id}</strong></div>
                        </div>
                        <div class="sp-actions">
                            <button class="sp-btn primary" onclick="window.location.hash='#work-orders'; window.dispatchEvent(new CustomEvent('map-action', {detail: {type: 'work-order', id: ${d.id}}}));">Initiate Repair</button>
                        </div>
                    </div>
                </div>
            `, { maxWidth: 260, className: "smap-popup-wrapper" });

            group.addLayer(marker);
        });
    }, [items, showPotholes, showVehicles, showPeople]);

    return null;
}


// ── localStorage helpers ──────────────────────────────────────────────────────
const LS = {
    get: <T,>(key: string, fallback: T): T => {
        try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; } catch { return fallback; }
    },
    set: (key: string, value: unknown) => {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
    },
};

// ── Main component ────────────────────────────────────────────────────────────
export default function MonitoringMap() {
    const [detections, setDetections] = useState<DBEntry[]>([]);
    const [heatPoints, setHeatPoints] = useState<HeatPoint[]>([]);
    const [userLoc, setUserLoc] = useState<UserLocation | null>(null);
    const [gpsStatus, setGpsStatus] = useState<"idle" | "acquiring" | "live" | "error">("idle");
    const [gpsError, setGpsError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<string>("");
    const [isFullscreen, setIsFullscreen] = useState(false);
    const mapWrapperRef = useRef<HTMLDivElement>(null);

    // ── Persisted settings ────────────────────────────────────────────────────
    const [tileMode, setTileMode] = useState<TileMode>(() => LS.get("smap_tile", "carto-dark"));
    const [showPotholes, setShowPotholes] = useState<boolean>(() => LS.get("smap_potholes", true));
    const [showVehicles, setShowVehicles] = useState<boolean>(() => LS.get("smap_vehicles", true));
    const [showPeople, setShowPeople] = useState<boolean>(() => LS.get("smap_people", true));
    const [showHeatmap, setShowHeatmap] = useState<boolean>(() => LS.get("smap_heatmap", true));
    const [showUserLoc, setShowUserLoc] = useState<boolean>(() => LS.get("smap_userloc", true));
    const [confThreshold, setConfThreshold] = useState<number>(() => LS.get("smap_conf", 0));
    const [timeRange, setTimeRange] = useState<string>(() => LS.get("smap_time", "all"));

    // Drawer state
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Search
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [searchedCoords, setSearchedCoords] = useState<[number, number] | null>(null);

    // Persist on change
    useEffect(() => { LS.set("smap_tile", tileMode); }, [tileMode]);
    useEffect(() => { LS.set("smap_potholes", showPotholes); }, [showPotholes]);
    useEffect(() => { LS.set("smap_vehicles", showVehicles); }, [showVehicles]);
    useEffect(() => { LS.set("smap_people", showPeople); }, [showPeople]);
    useEffect(() => { LS.set("smap_heatmap", showHeatmap); }, [showHeatmap]);
    useEffect(() => { LS.set("smap_userloc", showUserLoc); }, [showUserLoc]);
    useEffect(() => { LS.set("smap_conf", confThreshold); }, [confThreshold]);
    useEffect(() => { LS.set("smap_time", timeRange); }, [timeRange]);

    // Search Handler
    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
            const data = await res.json();
            if (data && data.length > 0) {
                setSearchedCoords([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
            } else {
                alert("Location not found.");
            }
        } catch (err) {
            console.error("Geocoding error", err);
        } finally {
            setIsSearching(false);
        }
    };

    // GPS
    useEffect(() => {
        if (!navigator.geolocation) { setGpsStatus("error"); setGpsError("GPS not supported."); return; }
        setGpsStatus("acquiring");
        const id = navigator.geolocation.watchPosition(
            (pos) => {
                setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
                setGpsStatus("live"); setGpsError(null);
            },
            (err) => {
                setGpsStatus("error");
                setGpsError(err.code === 1 ? "Location denied." : err.code === 2 ? "GPS unavailable." : "GPS timed out.");
            },
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
        );
        return () => navigator.geolocation.clearWatch(id);
    }, []);

    // Data fetch
    const load = useCallback(async () => {
        setRefreshing(true);
        try {
            const token = localStorage.getItem("si_token");
            const res = await fetch(`${API_BASE}/map-data`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            const data: DBEntry[] = await res.json();
            setDetections(data);
            setHeatPoints(data.filter(d => (d.object_type || "pothole") === "pothole").map(d => [d.latitude, d.longitude, d.confidence] as HeatPoint));
            setLastUpdated(new Date().toLocaleTimeString());
        } catch { console.warn("Backend offline"); }
        finally { setRefreshing(false); }
    }, []);

    useEffect(() => {
        load();
        const t = setInterval(load, 10000);
        return () => clearInterval(t);
    }, [load]);

    const filtered = detections.filter(d => {
        if ((d.confidence ?? 0) < confThreshold / 100) return false;
        if (timeRange !== "all" && d.timestamp) {
            const date = new Date(d.timestamp);
            if (!isNaN(date.getTime())) {
                const diffMs = Date.now() - date.getTime();
                if (timeRange === "1h" && diffMs > 60 * 60 * 1000) return false;
                if (timeRange === "24h" && diffMs > 24 * 60 * 60 * 1000) return false;
                if (timeRange === "7d" && diffMs > 7 * 24 * 60 * 60 * 1000) return false;
            }
        }
        return true;
    });
    const potholes = filtered.filter(d => (d.object_type || "pothole") === "pothole");
    const vehicles = filtered.filter(d => VEHICLE_TYPES.has(d.object_type || ""));
    const people = filtered.filter(d => d.object_type === "person");
    const dangerCount = filtered.filter(d => (d.confidence ?? 0) >= 0.75).length;

    const exportCSV = () => {
        if (!filtered.length) return;
        const rows = [
            ["type", "confidence", "latitude", "longitude", "timestamp"],
            ...filtered.map(d => [
                d.object_type || "pothole",
                ((d.confidence ?? 0) * 100).toFixed(1) + "%",
                d.latitude, d.longitude,
                d.timestamp || ""
            ])
        ];
        const csv = rows.map(r => r.join(",")).join("\n");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        a.download = `smart-infra-detections-${Date.now()}.csv`;
        a.click();
    };

    const toggleFullscreen = () => {
        if (!mapWrapperRef.current) return;
        if (!document.fullscreenElement) {
            mapWrapperRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => { });
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => { });
        }
    };

    const mapCenter: [number, number] = userLoc ? [userLoc.lat, userLoc.lng] : [12.9716, 77.5946];
    const tile = TILES[tileMode];

    return (
        <div className="smap-root">
            {/* ── Slim toolbar ── */}
            <div className="smap-topbar">
                {/* Location Search Bar */}
                <form className="smap-search-form" onSubmit={handleSearch}>
                    <Search size={14} className="smap-search-icon" />
                    <input
                        type="text"
                        placeholder="Search location..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="smap-search-input"
                    />
                    {isSearching && <RefreshCw size={12} className="smap-spin smap-search-loading" />}
                </form>

                {/* GPS status */}
                <div className={`smap-gps-pill ${gpsStatus}`}>
                    <Signal size={12} className={gpsStatus === "acquiring" ? "smap-spin" : ""} />
                    <span>
                        {gpsStatus === "live" ? `GPS ±${Math.round(userLoc?.accuracy || 0)}m` :
                            gpsStatus === "acquiring" ? "Acquiring…" : gpsError || "GPS Offline"}
                    </span>
                </div>

                {lastUpdated && (
                    <div className="smap-updated-pill"><Activity size={11} /> {lastUpdated}</div>
                )}

                {/* Actions */}
                <div className="smap-controls-row">
                    <button type="button" className="smap-refresh-btn" onClick={load} disabled={refreshing} title="Sync">
                        <RefreshCw size={14} className={refreshing ? "smap-spin" : ""} /><span>Sync</span>
                    </button>
                    <button type="button" className="smap-refresh-btn" onClick={exportCSV} disabled={!filtered.length} title="Export CSV">
                        <Download size={14} /><span>Export</span>
                    </button>
                    <button type="button" className="smap-refresh-btn" onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
                        {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
                    </button>
                </div>
            </div>

            {/* ── Map area ── */}
            <div className="smap-canvas">
                {/* Leaflet map */}
                <div className="smap-map" ref={mapWrapperRef} style={{ position: 'relative' }}>
                    <MapContainer center={mapCenter} zoom={14} maxZoom={24} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }} zoomControl={false}>

                        {/* Floating drawer toggle */}
                        <button
                            className={`smap-drawer-toggle ${drawerOpen ? "active" : ""}`}
                            onClick={(e) => { e.stopPropagation(); setDrawerOpen(!drawerOpen); }}
                            onPointerDown={(e) => e.stopPropagation()}
                            onDoubleClick={(e) => e.stopPropagation()}
                            onWheel={(e) => e.stopPropagation()}
                            title="Toggle Map Settings"
                        >
                            <SlidersHorizontal size={18} />
                        </button>

                        {/* Off-screen Drawer */}
                        <div
                            className={`smap-drawer ${drawerOpen ? "open" : ""}`}
                            onPointerDown={(e) => e.stopPropagation()}
                            onDoubleClick={(e) => e.stopPropagation()}
                            onWheel={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="smap-drawer-header">
                                <div className="smap-panel-title" style={{ margin: 0 }}><SlidersHorizontal size={14} /> Map Settings</div>
                                <button className="smap-drawer-close" onClick={() => setDrawerOpen(false)}>&times;</button>
                            </div>
                            <div className="smap-drawer-content">

                                <div className="smap-panel-title"><Layers size={13} /> Layer Control</div>
                                {[
                                    { label: "Potholes", color: "#f97316", active: showPotholes, toggle: () => setShowPotholes(p => !p), count: potholes.length },
                                    { label: "Vehicles", color: "#38bdf8", active: showVehicles, toggle: () => setShowVehicles(p => !p), count: vehicles.length },
                                    { label: "People", color: "#a78bfa", active: showPeople, toggle: () => setShowPeople(p => !p), count: people.length },
                                    { label: "Heatmap", color: "#ef4444", active: showHeatmap, toggle: () => setShowHeatmap(p => !p), count: null },
                                    { label: "My Location", color: "#3b82f6", active: showUserLoc, toggle: () => setShowUserLoc(p => !p), count: null },
                                ].map(l => (
                                    <button type="button" key={l.label} className={`smap-layer-btn ${l.active ? "active" : ""}`} onClick={l.toggle} style={{ "--lc": l.color } as any}>
                                        {l.active ? <Eye size={12} /> : <EyeOff size={12} />}
                                        <span>{l.label}</span>
                                        {l.count !== null && <span className="smap-layer-count">{l.count}</span>}
                                    </button>
                                ))}

                                <div className="smap-panel-divider" />

                                <div className="smap-panel-title"><Activity size={13} /> Density</div>
                                <div className="smap-density-bar">
                                    <div className="smap-density-fill" style={{ width: `${Math.min(100, filtered.length / 5)}%`, background: `var(--density-color, var(--primary))` }}></div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                    <span>Low</span><span>High</span>
                                </div>

                                <div className="smap-panel-divider" />

                                <div className="smap-panel-title"><AlertTriangle size={13} /> Severity</div>
                                <div className="smap-stat-grid">
                                    <div className="smap-stat-box">
                                        <span className="smap-stat-val" style={{ color: "var(--danger)" }}>{dangerCount}</span>
                                        <span className="smap-stat-lbl">Danger</span>
                                    </div>
                                    <div className="smap-stat-box">
                                        <span className="smap-stat-val" style={{ color: "var(--warning)" }}>{potholes.length - dangerCount}</span>
                                        <span className="smap-stat-lbl">Moderate</span>
                                    </div>
                                </div>

                                <div className="smap-panel-divider" />

                                <div className="smap-panel-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span><Signal size={13} /> Confidence Filter</span>
                                    <span style={{ color: "var(--primary)" }}>{confThreshold}%</span>
                                </div>
                                <input
                                    type="range" className="smap-slider"
                                    min="0" max="95" step="5"
                                    value={confThreshold} onChange={e => setConfThreshold(parseInt(e.target.value))}
                                />
                            </div>
                        </div>

                        <TileLayer key={tileMode} url={tile.url} attribution={tile.attribution} maxZoom={24} maxNativeZoom={19} />
                        <FlyToUser loc={userLoc} />
                        <FlyToCoords coords={searchedCoords} />
                        <MapControls userLoc={userLoc} />
                        <MapStyleWidget tileMode={tileMode} setTileMode={setTileMode} />
                        {showHeatmap && <HeatLayer points={heatPoints} />}
                        <ClusterLayer items={filtered} showPotholes={showPotholes} showVehicles={showVehicles} showPeople={showPeople} />

                        {showUserLoc && userLoc && (
                            <>
                                <Circle center={[userLoc.lat, userLoc.lng]} radius={userLoc.accuracy}
                                    pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.1, weight: 1.5, dashArray: "5 5" }} />
                                <Marker position={[userLoc.lat, userLoc.lng]} icon={YOU_ICON} zIndexOffset={1000}>
                                    <Popup className="smap-popup-wrapper">
                                        <div className="smap-popup">
                                            <div className="sp-header">
                                                <span className="sp-badge" style={{ background: "#3b82f6" }}>You Are Here</span>
                                                <span className="sp-conf">±{Math.round(userLoc.accuracy)}m</span>
                                            </div>
                                            <div className="sp-rows">
                                                <div className="sp-row"><span>Lat</span><strong>{userLoc.lat.toFixed(6)}</strong></div>
                                                <div className="sp-row"><span>Lng</span><strong>{userLoc.lng.toFixed(6)}</strong></div>
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            </>
                        )}
                    </MapContainer>
                </div>
            </div>

            {/* ── Inline styles ── */}
            <style>{`
                .smap-root {
                    display: flex;
                    flex-direction: column;
                    height: calc(100vh - 72px);
                    background: var(--bg-body);
                    font-family: 'Plus Jakarta Sans', sans-serif;
                    overflow: hidden;
                    color: var(--text-main);
                }
                
                .smap-root button svg {
                    color: currentColor;
                }
                
                .smap-root button {
                    color: var(--text-main);
                }

                /* ── Top bar ── */
                .smap-topbar {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 20px;
                    background: var(--glass-bg);
                    backdrop-filter: blur(16px) saturate(180%);
                    -webkit-backdrop-filter: blur(16px) saturate(180%);
                    border-bottom: 1px solid var(--border);
                    flex-wrap: wrap;
                    flex-shrink: 0;
                    z-index: 10;
                }

                .smap-stats-row { display: flex; gap: 8px; align-items: center; }
                .smap-stat-pill {
                    display: flex; align-items: center; gap: 5px;
                    padding: 5px 11px; border-radius: 99px;
                    font-size: 0.78rem; font-weight: 700; border: 1.5px solid;
                    background: var(--bg-surface);
                }
                .smap-stat-pill span { font-size: 1rem; font-weight: 800; }
                .smap-stat-pill small { font-size: 0.65rem; font-weight: 600; opacity: 0.7; }
                .smap-stat-pill.pothole { border-color: #f97316; color: #f97316; }
                .smap-stat-pill.vehicle  { border-color: #38bdf8; color: #38bdf8; }
                .smap-stat-pill.person   { border-color: #a78bfa; color: #a78bfa; }
                .smap-stat-pill.critical { border-color: #ef4444; color: #ef4444; }

                .smap-tile-selector { display: flex; gap: 4px; background: var(--bg-surface); padding: 4px; border-radius: 10px; border: 1px solid var(--border); }
                .smap-tile-btn {
                    display: flex; align-items: center; gap: 5px;
                    padding: 5px 10px; border-radius: 7px; border: none;
                    background: transparent; color: var(--text-muted);
                    font-size: 0.72rem; font-weight: 700; cursor: pointer;
                    transition: all 0.2s ease;
                }
                .smap-tile-btn.active { background: var(--primary); color: white; box-shadow: 0 2px 8px var(--primary-glow); }
                .smap-tile-btn:hover:not(.active) { background: var(--bg-card); color: var(--text-main); }

                /* Floating Map Style Widget */
                .smap-style-widget {
                    position: absolute; top: 20px; right: 20px; z-index: 1000;
                    display: flex; flex-direction: column; align-items: flex-end;
                }
                .smap-style-toggle {
                    width: 44px; height: 44px; border-radius: 12px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-hover); box-shadow: var(--shadow-premium);
                    display: flex; align-items: center; justify-content: center;
                    color: var(--text-main); cursor: pointer; transition: all 0.2s;
                }
                .smap-style-toggle:hover { color: var(--primary); border-color: var(--primary-glow); }
                .smap-style-menu {
                    margin-top: 8px; display: flex; flex-direction: column; gap: 4px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-hover); box-shadow: var(--shadow-premium);
                    padding: 6px; border-radius: 12px; animation: scale-in 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }
                @keyframes scale-in { from { opacity: 0; transform: scale(0.95) translateY(-5px); } to { opacity: 1; transform: scale(1) translateY(0); } }
                .smap-style-option {
                    display: flex; align-items: center; gap: 8px; padding: 10px 14px;
                    border-radius: 8px; border: none; background: transparent;
                    color: var(--text-muted); font-size: 0.75rem; font-weight: 700; cursor: pointer;
                    transition: all 0.2s; text-align: left; min-width: 130px;
                }
                .smap-style-option.active { background: color-mix(in srgb, var(--primary) 15%, transparent); color: var(--primary); }
                .smap-style-option:hover:not(.active) { background: var(--bg-surface); color: var(--text-main); }

                /* Search bar */
                .smap-search-form {
                    display: flex; align-items: center; position: relative; width: 240px;
                }
                .smap-search-icon {
                    position: absolute; left: 12px; color: var(--text-muted);
                }
                .smap-search-loading {
                    position: absolute; right: 12px; color: var(--primary);
                }
                .smap-search-input {
                    width: 100%; padding: 8px 36px; border-radius: 99px;
                    border: 1px solid var(--border); background: var(--bg-surface);
                    color: var(--text-main); font-size: 0.8rem; font-family: inherit;
                    transition: all 0.2s;
                }
                .smap-search-input:focus {
                    border-color: var(--primary); outline: none; box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary) 20%, transparent);
                }

                .smap-controls-row { display: flex; gap: 8px; align-items: center; margin-left: auto; }
                .smap-gps-pill {
                    display: flex; align-items: center; gap: 6px;
                    padding: 5px 12px; border-radius: 99px; border: 1.5px solid var(--border);
                    background: var(--bg-surface); font-size: 0.72rem; font-weight: 700; color: var(--text-muted);
                }
                .smap-gps-pill.live   { border-color: #10b981; color: #10b981; }
                .smap-gps-pill.error  { border-color: #ef4444; color: #ef4444; }
                .smap-gps-pill.acquiring { border-color: #f59e0b; color: #f59e0b; }

                .smap-updated-pill {
                    display: flex; align-items: center; gap: 5px;
                    padding: 5px 10px; border-radius: 99px;
                    background: var(--bg-surface); border: 1px solid var(--border);
                    font-size: 0.68rem; color: var(--text-muted); font-weight: 600;
                }

                .smap-refresh-btn {
                    display: flex; align-items: center; gap: 6px;
                    padding: 6px 14px; border-radius: 99px; border: 1.5px solid var(--border);
                    background: var(--bg-surface); color: var(--text-main);
                    font-size: 0.78rem; font-weight: 700; cursor: pointer;
                    transition: all 0.2s ease;
                }
                .smap-refresh-btn:hover { border-color: var(--primary); color: var(--primary); background: var(--bg-card); }
                .smap-refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }

                /* Density & Severity Styles */
                .smap-layer-btn {
                    display: flex; align-items: center; gap: 8px;
                    padding: 7px 10px; border-radius: 9px;
                    border: 1.5px solid var(--border); background: var(--bg-surface);
                    color: var(--text-muted); font-size: 0.75rem; font-weight: 700;
                    cursor: pointer; transition: all 0.2s ease; text-align: left;
                }
                .smap-layer-btn span:first-of-type { flex: 1; }
                .smap-layer-btn.active { border-color: var(--lc, var(--primary)); color: var(--lc, var(--primary)); background: var(--bg-card); }
                .smap-layer-btn:hover:not(.active) { border-color: var(--border); background: var(--bg-card); color: var(--text-main); }
                .smap-layer-count {
                    background: var(--bg-surface); border: 1px solid var(--border);
                    border-radius: 99px; padding: 1px 7px; font-size: 0.65rem; font-weight: 800;
                    color: var(--text-muted);
                }
                .smap-layer-btn.active .smap-layer-count { border-color: var(--lc, var(--primary)); color: var(--lc, var(--primary)); }

                .smap-density-bar {
                    width: 100%; height: 6px; background: var(--bg-surface); border-radius: 99px; margin-bottom: 4px; overflow: hidden;
                }
                .smap-density-fill { height: 100%; border-radius: 99px; transition: width 0.3s; }
                
                .smap-stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
                .smap-stat-box { 
                    background: var(--bg-surface); padding: 8px; border-radius: 8px; border: 1px solid var(--border);
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                }
                .smap-stat-val { font-size: 1.1rem; font-weight: 800; font-family: 'Space Grotesk', sans-serif; line-height: 1; margin-bottom: 2px; }
                .smap-stat-lbl { font-size: 0.65rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
                
                /* Confidence Slider */
                .smap-slider {
                    -webkit-appearance: none; width: 100%; height: 6px; border-radius: 99px; background: var(--bg-surface); outline: none; margin-top: 8px;
                }
                .smap-slider::-webkit-slider-thumb {
                    -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%;
                    background: var(--primary); cursor: pointer; border: 2px solid white; box-shadow: 0 0 8px var(--primary-glow);
                }

                /* ── Map ── */
                .smap-canvas {
                    flex: 1;
                    position: relative;
                    display: flex;
                    overflow: hidden;
                }

                .smap-drawer-toggle {
                    position: absolute;
                    top: 20px;
                    left: 20px;
                    z-index: 1001;
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-hover);
                    box-shadow: var(--shadow-premium);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-main);
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .smap-drawer-toggle:hover { color: var(--primary); border-color: var(--primary-glow); }
                .smap-drawer-toggle.active { background: var(--primary); color: white; border-color: var(--primary); box-shadow: 0 4px 12px var(--primary-glow); }

                .smap-drawer {
                    position: absolute;
                    top: 20px;
                    left: 72px;
                    z-index: 1000;
                    width: 280px;
                    max-height: calc(100% - 40px);
                    background: var(--bg-card);
                    border: 1px solid var(--border-hover);
                    box-shadow: var(--shadow-premium);
                    border-radius: 16px;
                    display: flex;
                    flex-direction: column;
                    transform: translateX(-150%);
                    opacity: 0;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    pointer-events: none;
                    overflow: hidden;
                }
                .smap-drawer.open {
                    transform: translateX(0);
                    opacity: 1;
                    pointer-events: auto;
                }
                
                .smap-drawer-header {
                    padding: 16px;
                    border-bottom: 1px solid var(--border);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                .smap-panel-title {
                    font-size: 0.8rem;
                    font-weight: 800;
                    color: var(--text-main);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    margin-bottom: 12px;
                }
                .smap-drawer-close {
                    background: transparent;
                    border: none;
                    color: var(--text-muted);
                    font-size: 1.2rem;
                    line-height: 1;
                    cursor: pointer;
                    transition: color 0.2s;
                }
                .smap-drawer-close:hover { color: var(--text-main); }
                
                .smap-drawer-content {
                    padding: 16px;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    flex: 1;
                    min-height: 0;
                }
                
                .smap-panel-divider {
                    height: 1px;
                    background: var(--border);
                    margin: 4px 0;
                }

                .smap-map { flex: 1; position: relative; }
                .smap-map .leaflet-container { height: 100%; width: 100%; }

                /* Zoom controls */
                .smap-zoom-controls {
                    position: absolute; bottom: 20px; right: 20px; z-index: 1000;
                    display: flex; flex-direction: column; background: var(--bg-card);
                    border: 1px solid var(--border-hover); border-radius: 12px;
                    box-shadow: var(--shadow-premium); overflow: hidden;
                }
                .smap-zoom-btn {
                    width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;
                    background: transparent; border: none; color: var(--text-main); cursor: pointer;
                    transition: all 0.2s;
                }
                .smap-zoom-btn:hover { background: color-mix(in srgb, var(--primary) 15%, transparent); color: var(--primary); }
                .smap-zoom-divider { height: 1px; background: var(--border); margin: 0 6px; }

                /* ── Markers ── */
                .smap-marker {
                    border-radius: 50%; display: flex; align-items: center; justify-content: center;
                    position: relative; border: 2.5px solid var(--mc); background: color-mix(in srgb, var(--mc) 20%, transparent);
                    box-shadow: 0 0 0 0 var(--mc); cursor: pointer;
                    transition: transform 0.15s ease;
                }
                .smap-marker:hover { transform: scale(1.2); }
                .marker-core {
                    width: 45%; height: 45%; border-radius: 50%;
                    background: var(--mc); box-shadow: 0 0 6px var(--mc);
                }
                .marker-pulse {
                    position: absolute; inset: -6px; border-radius: 50%;
                    opacity: 0.3; animation: smap-pulse 2s ease-in-out infinite;
                }
                .smap-marker.critical { box-shadow: 0 0 12px color-mix(in srgb, var(--mc) 60%, transparent); }

                @keyframes smap-pulse {
                    0%, 100% { transform: scale(1); opacity: 0.3; }
                    50% { transform: scale(1.6); opacity: 0; }
                }

                /* ── You dot ── */
                .smap-you-dot {
                    width: 20px; height: 20px; border-radius: 50%;
                    background: #3b82f6; border: 3px solid white;
                    box-shadow: 0 0 0 6px rgba(59,130,246,0.3), 0 4px 12px rgba(0,0,0,0.4);
                    animation: smap-pulse-you 2s ease-in-out infinite;
                }
                @keyframes smap-pulse-you {
                    0%, 100% { box-shadow: 0 0 0 6px rgba(59,130,246,0.3), 0 4px 12px rgba(0,0,0,0.4); }
                    50% { box-shadow: 0 0 0 12px rgba(59,130,246,0), 0 4px 12px rgba(0,0,0,0.4); }
                }

                /* ── Cluster ── */
                .smap-cluster {
                    width: 46px; height: 46px; border-radius: 50%;
                    background: linear-gradient(135deg, var(--primary), #ea580c);
                    border: 2px solid rgba(255,255,255,0.9);
                    display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 8px 24px var(--primary-glow);
                    position: relative;
                }
                .cluster-pulse {
                    position: absolute; inset: -4px; border-radius: 50%;
                    border: 2px solid var(--primary); opacity: 0.6;
                    animation: cluster-pulse-anim 2s infinite ease-out;
                }
                @keyframes cluster-pulse-anim {
                    0% { transform: scale(1); opacity: 0.8; }
                    100% { transform: scale(1.4); opacity: 0; }
                }
                .smap-cluster span { color: white; font-weight: 900; font-size: 0.85rem; z-index: 2; }

                /* ── Popup ── */
                .smap-popup-wrapper .leaflet-popup-content-wrapper {
                    background: var(--glass-bg) !important;
                    backdrop-filter: blur(16px) saturate(180%) !important;
                    -webkit-backdrop-filter: blur(16px) saturate(180%) !important;
                    border: 1px solid var(--border-hover) !important;
                    border-radius: 16px !important;
                    box-shadow: var(--shadow-premium) !important;
                    padding: 0 !important;
                    overflow: hidden;
                }
                .smap-popup-wrapper .leaflet-popup-tip { display: none !important; }
                .smap-popup-wrapper .leaflet-popup-content { margin: 0 !important; }

                .smap-popup { padding: 0; min-width: 220px; overflow: hidden; border-radius: 12px; }
                .sp-image { width: 100%; height: 120px; background: #000; overflow: hidden; }
                .sp-image img { width: 100%; height: 100%; object-fit: cover; opacity: 0.85; transition: opacity 0.3s; }
                .smap-popup:hover .sp-image img { opacity: 1; }
                .sp-body { padding: 12px; }
                .sp-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
                .sp-badge { padding: 3px 10px; border-radius: 99px; color: white; font-size: 0.65rem; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; }
                .sp-conf { font-size: 0.7rem; color: var(--text-muted); font-weight: 700; }
                .sp-rows { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
                .sp-row { display: flex; justify-content: space-between; gap: 12px; font-size: 0.72rem; }
                .sp-row span { color: var(--text-muted); }
                .sp-row strong { color: var(--text-main); font-weight: 700; }
                .sp-row strong.mono { font-family: 'JetBrains Mono', monospace; color: var(--primary); }
                .sp-actions { border-top: 1px solid var(--border); padding-top: 10px; }
                .sp-btn { width: 100%; padding: 8px; border-radius: 8px; border: none; font-size: 0.75rem; font-weight: 800; cursor: pointer; transition: all 0.2s; }
                .sp-btn.primary { background: var(--primary); color: white; }
                .sp-btn.primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px var(--primary-glow); }

                /* Leaflet overrides */
                .leaflet-control-attribution { display: none !important; }
                .leaflet-bar a { background: var(--bg-card) !important; color: var(--text-main) !important; border-color: var(--border) !important; }

                /* Spin */
                .smap-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

                /* MarkerCluster override */
                .marker-cluster-small, .marker-cluster-medium, .marker-cluster-large { background: transparent !important; }
                .marker-cluster-small div, .marker-cluster-medium div, .marker-cluster-large div { display: none; }

                /* ── Confidence filter slider ── */
                .smap-conf-filter { display: flex; flex-direction: column; gap: 6px; padding: 4px 0; }
                .smap-conf-label { display: flex; justify-content: space-between; align-items: center; font-size: 0.7rem; color: var(--text-muted); font-weight: 600; }
                .smap-conf-label strong { font-size: 0.82rem; font-weight: 800; }
                .smap-conf-counts { font-size: 0.65rem; color: var(--text-muted); text-align: right; }

                .smap-slider {
                    -webkit-appearance: none; appearance: none;
                    width: 100%; height: 6px; border-radius: 99px;
                    /* Background is handled inline for dynamic fill */
                    background: var(--border);
                    outline: none; cursor: pointer;
                    box-shadow: inset 0 1px 3px rgba(0,0,0,0.2);
                }
                .smap-slider::-webkit-slider-thumb {
                    -webkit-appearance: none; appearance: none;
                    width: 16px; height: 16px; border-radius: 50%;
                    background: var(--primary); border: 2px solid white;
                    box-shadow: 0 2px 8px var(--primary-glow); cursor: pointer;
                    transition: transform 0.15s ease;
                }
                .smap-slider::-webkit-slider-thumb:hover { transform: scale(1.2); }
                .smap-slider::-moz-range-thumb {
                    width: 16px; height: 16px; border-radius: 50%;
                    background: var(--primary); border: 2px solid white;
                    box-shadow: 0 2px 8px var(--primary-glow); cursor: pointer;
                }
            `}</style>
        </div>
    );
}
