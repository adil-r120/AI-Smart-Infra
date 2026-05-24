import { useEffect, useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
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
    Eye, EyeOff, Activity, Download, Maximize, Minimize, SlidersHorizontal
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

function HeatLayer({ points }: { points: HeatPoint[] }) {
    const map = useMap();
    useEffect(() => {
        if (!points.length) return;
        const heat = (L as any).heatLayer(points, {
            radius: 32, blur: 28, maxZoom: 17, max: 1.0,
            gradient: { 0.2: "#10b981", 0.5: "#f59e0b", 0.8: "#f97316", 1.0: "#ef4444" },
        });
        heat.addTo(map);
        return () => { map.removeLayer(heat); };
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

            const marker = L.marker([d.latitude, d.longitude], { icon });
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
    const [tileMode, setTileMode]       = useState<TileMode>(() => LS.get("smap_tile", "carto-dark"));
    const [showPotholes, setShowPotholes] = useState<boolean>(() => LS.get("smap_potholes", true));
    const [showVehicles, setShowVehicles] = useState<boolean>(() => LS.get("smap_vehicles", true));
    const [showPeople, setShowPeople]   = useState<boolean>(() => LS.get("smap_people", true));
    const [showHeatmap, setShowHeatmap] = useState<boolean>(() => LS.get("smap_heatmap", true));
    const [showUserLoc, setShowUserLoc] = useState<boolean>(() => LS.get("smap_userloc", true));
    const [confThreshold, setConfThreshold] = useState<number>(() => LS.get("smap_conf", 0));

    // Persist on change
    useEffect(() => { LS.set("smap_tile",     tileMode);       }, [tileMode]);
    useEffect(() => { LS.set("smap_potholes", showPotholes);   }, [showPotholes]);
    useEffect(() => { LS.set("smap_vehicles", showVehicles);   }, [showVehicles]);
    useEffect(() => { LS.set("smap_people",   showPeople);     }, [showPeople]);
    useEffect(() => { LS.set("smap_heatmap",  showHeatmap);    }, [showHeatmap]);
    useEffect(() => { LS.set("smap_userloc",  showUserLoc);    }, [showUserLoc]);
    useEffect(() => { LS.set("smap_conf",     confThreshold);  }, [confThreshold]);

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

    const filtered = detections.filter(d => (d.confidence ?? 0) >= confThreshold / 100);
    const potholes = filtered.filter(d => (d.object_type || "pothole") === "pothole");
    const vehicles = filtered.filter(d => VEHICLE_TYPES.has(d.object_type || ""));
    const people = filtered.filter(d => d.object_type === "person");
    const critical = filtered.filter(d => (d.confidence ?? 0) >= 0.75);

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
                {/* Tile mode selector */}
                <div className="smap-tile-selector">
                    {(Object.keys(TILES) as TileMode[]).map(mode => (
                        <button type="button" key={mode}
                            className={`smap-tile-btn ${tileMode === mode ? "active" : ""}`}
                            onClick={() => setTileMode(mode)} title={TILES[mode].label}
                        >
                            {mode === "satellite" ? <Satellite size={13} /> : <Map size={13} />}
                            {TILES[mode].label}
                        </button>
                    ))}
                </div>

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
                {/* Side panel */}
                <div className="smap-panel">
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

                    <div className="smap-panel-title"><Navigation size={13} /> Density</div>
                    <div className="smap-legend">
                        <div className="smap-legend-bar" />
                        <div className="smap-legend-labels">
                            <span>Low</span><span>High</span>
                        </div>
                    </div>

                    <div className="smap-panel-divider" />

                    <div className="smap-panel-title"><AlertTriangle size={13} /> Severity</div>
                    {[
                        { label: "Critical ≥75%", color: "#ef4444" },
                        { label: "Concern ≥45%", color: "#f59e0b" },
                        { label: "Nominal <45%", color: "#10b981" },
                    ].map(s => (
                        <div key={s.label} className="smap-severity-row">
                            <span className="smap-sev-dot" style={{ background: s.color }} />
                            <span>{s.label}</span>
                        </div>
                    ))}

                    <div className="smap-panel-divider" />

                    <div className="smap-panel-title"><SlidersHorizontal size={13} /> Confidence Filter</div>
                    <div className="smap-conf-filter">
                        <div className="smap-conf-label">
                            <span>Min confidence</span>
                            <strong style={{ color: confThreshold >= 75 ? '#ef4444' : confThreshold >= 45 ? '#f59e0b' : '#10b981' }}>
                                {confThreshold}%
                            </strong>
                        </div>
                        <input
                            type="range" min={0} max={90} step={5}
                            value={confThreshold}
                            onChange={e => setConfThreshold(Number(e.target.value))}
                            className="smap-slider"
                            style={{ background: `linear-gradient(to right, var(--primary) ${(confThreshold / 90) * 100}%, var(--border) ${(confThreshold / 90) * 100}%)` }}
                        />
                        <div className="smap-conf-counts">
                            <span>{filtered.length} of {detections.length} shown</span>
                        </div>
                    </div>
                </div>

                {/* Leaflet map */}
                <div className="smap-map" ref={mapWrapperRef} style={{ position: 'relative' }}>
                    <MapContainer center={mapCenter} zoom={13} style={{ height: "100%", width: "100%" }} zoomControl={false}>
                        <TileLayer key={tileMode} url={tile.url} attribution={tile.attribution} />
                        <FlyToUser loc={userLoc} />
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
                }

                /* ── Top bar ── */
                .smap-topbar {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 10px 20px;
                    background: var(--bg-card);
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

                /* ── Canvas ── */
                .smap-canvas { display: flex; flex: 1; overflow: hidden; position: relative; }

                /* ── Floating Controls Panel ── */
                .smap-panel {
                    position: absolute;
                    top: 20px;
                    left: 20px;
                    width: 230px;
                    max-height: calc(100% - 40px);
                    background: var(--glass-bg);
                    backdrop-filter: blur(16px) saturate(180%);
                    -webkit-backdrop-filter: blur(16px) saturate(180%);
                    border: 1px solid var(--border-hover);
                    border-radius: 20px;
                    padding: 24px 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    overflow-y: auto;
                    z-index: 1000;
                    box-shadow: var(--shadow-premium);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .smap-panel:hover {
                    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
                    border-color: var(--primary-glow);
                }
                .smap-panel-title {
                    display: flex; align-items: center; gap: 6px;
                    font-size: 0.65rem; font-weight: 800; text-transform: uppercase;
                    letter-spacing: 0.08em; color: var(--text-muted);
                    margin-top: 4px; margin-bottom: 4px;
                }
                .smap-panel-divider { height: 1px; background: var(--border); margin: 8px 0; }

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

                /* Density legend */
                .smap-legend { padding: 4px 0; }
                .smap-legend-bar { height: 8px; border-radius: 99px; background: linear-gradient(to right, #10b981, #f59e0b, #ef4444); margin-bottom: 4px; }
                .smap-legend-labels { display: flex; justify-content: space-between; font-size: 0.62rem; color: var(--text-muted); font-weight: 600; }

                /* Severity rows */
                .smap-severity-row { display: flex; align-items: center; gap: 8px; font-size: 0.72rem; color: var(--text-muted); font-weight: 600; padding: 2px 0; }
                .smap-sev-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

                /* ── Map ── */
                .smap-map { flex: 1; position: relative; }
                .smap-map .leaflet-container { height: 100%; width: 100%; }

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
