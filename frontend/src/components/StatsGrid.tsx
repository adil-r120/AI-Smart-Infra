import { Stats } from "../types";
import { ChartBar, AlertTriangle, Truck, Users, AlertOctagon, Activity } from "lucide-react";
import StatCard from "./common/StatCard";

const HEALTH_COLOR = (score: number) =>
    score >= 75 ? "var(--success)" : score >= 50 ? "#f59e0b" : "var(--danger)";

interface StatsGridProps {
    stats: Stats | null;
}

function StatsGrid({ stats }: StatsGridProps) {
    const health = stats?.road_health_score ?? 0;

    return (
        <div>
            <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <h3 style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                    AI Infrastructure Analytics
                </h3>
                <span style={{
                    fontSize: "0.7rem", padding: "2px 8px", borderRadius: 99,
                    background: "rgba(16,185,129,0.12)", color: "var(--success)",
                    border: "1px solid rgba(16,185,129,0.3)", fontWeight: 700,
                }}>● LIVE</span>
            </div>

            <div className="dashboard-grid">
                {/* Detections */}
                <StatCard
                    title="Total Detections"
                    value={stats?.total_detections ?? 0}
                    subtitle="Infrastructure Event Count"
                    icon={<ChartBar size={24} />}
                    color="var(--primary)"
                />

                {/* Potholes */}
                <StatCard
                    title="Potholes"
                    value={stats?.total_potholes ?? 0}
                    subtitle="Surface Anomalies"
                    icon={<AlertTriangle size={24} />}
                    color="#f97316"
                />

                {/* Vehicles */}
                <StatCard
                    title="Cars & Trucks"
                    value={(stats?.total_cars ?? 0) + (stats?.total_trucks ?? 0)}
                    subtitle="Traffic Monitoring"
                    icon={<Truck size={24} />}
                    color="#38bdf8"
                />

                {/* People */}
                <StatCard
                    title="People"
                    value={stats?.total_people ?? 0}
                    subtitle="Pedestrian Count"
                    icon={<Users size={24} />}
                    color="#a78bfa"
                />

                {/* Danger Alerts */}
                <StatCard
                    title="Danger Alerts"
                    value={stats?.total_danger ?? 0}
                    subtitle="Critical Security Threats"
                    icon={<AlertOctagon size={24} />}
                    color="var(--danger)"
                />

                {/* Road health */}
                <div className="stat-card">
                    <div className="stat-card-header" style={{ marginBottom: 12 }}>
                        <div className="stat-icon-wrapper" style={{
                            color: HEALTH_COLOR(health),
                            background: `${HEALTH_COLOR(health)}1a`,
                            width: 38, height: 38, borderRadius: 10,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: `1px solid ${HEALTH_COLOR(health)}33`
                        }}>
                            <Activity size={20} />
                        </div>
                    </div>
                    <div className="stat-value">
                        {health}<span style={{ fontSize: "1.2rem", opacity: 0.6, marginLeft: 2 }}>%</span>
                    </div>
                    <div className="stat-title">
                        Infrastructure Health
                    </div>
                    <div style={{ height: 6, background: "var(--bg-surface)", borderRadius: 99, marginTop: 12, overflow: "hidden", border: '1px solid var(--border)' }}>
                        <div style={{
                            height: "100%", width: `${health}%`, background: HEALTH_COLOR(health), transition: "width 1s ease-in-out",
                            boxShadow: `0 0 12px ${HEALTH_COLOR(health)}44`
                        }} />
                    </div>
                </div>

            </div>
        </div>
    );
}

export default StatsGrid;
