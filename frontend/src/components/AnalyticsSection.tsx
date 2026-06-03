import React from "react";
// Explicit separate imports to force a full re-index by Vite/Babel
import { LineChart } from "recharts";
import { Line } from "recharts";
import { XAxis as ReXAxis } from "recharts";
import { YAxis as ReYAxis } from "recharts";
import { CartesianGrid } from "recharts";
import { Tooltip as RechartsTooltip } from "recharts";
import { ResponsiveContainer } from "recharts";
import { BarChart } from "recharts";
import { Bar } from "recharts";
import { Cell } from "recharts";
import { RadarChart } from "recharts";
import { Radar } from "recharts";
import { PolarGrid } from "recharts";
import { PolarAngleAxis } from "recharts";
import { PolarRadiusAxis } from "recharts";

import { Stats } from "../types";
import TrendCharts from "./TrendCharts";

interface AnalyticsSectionProps {
    stats: Stats | null;
}

const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({ stats }) => {
    if (!stats) return null;

    // Derive Radar Data from real stats (Synced with Backend Weights)
    const integrity = stats.road_health_score;
    const precision = Math.round((stats.avg_confidence || 0.85) * 100);
    const flow = Math.min(100, (stats.total_cars + stats.total_trucks) * 5);
    const safety = Math.max(0, 100 - (stats.total_danger * 15));
    const depth = Math.min(100, (stats.total_detections * 2));

    const radarData = [
        { subject: 'Integrity', A: integrity, fullMark: 100 },
        { subject: 'Precision', A: precision, fullMark: 100 },
        { subject: 'Flow', A: flow, fullMark: 100 },
        { subject: 'Safety', A: safety, fullMark: 100 },
        { subject: 'Depth', A: depth, fullMark: 100 },
    ];

    // Process distribution data for the Bar Chart
    const distribution = stats.distribution || {};
    const distData = Object.keys(distribution).map(key => ({
        name: key.toUpperCase(),
        value: distribution[key] || 0
    })).sort((a, b) => b.value - a.value);

    return (
        <div className="analytics-section">
            <div className="dashboard-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "24px" }}>
                
                {/* Infrastructure Integrity Profile - Radar Chart */}
                <div className="stat-card" style={{ display: "flex", flexDirection: "column", padding: "24px", borderRadius: '28px', position: 'relative', overflow: 'hidden' }}>
                    {stats.total_danger > 0 && (
                        <div style={{ 
                            position: 'absolute', 
                            top: 0, 
                            left: 0, 
                            right: 0, 
                            background: 'rgba(239, 68, 68, 0.1)', 
                            borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
                            padding: '8px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            zIndex: 10
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite' }} />
                                <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Critical Threat Active</span>
                            </div>
                            <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#ef4444' }}>{stats.total_danger} DETECTIONS</span>
                        </div>
                    )}
                    <div style={{ marginBottom: 20, marginTop: stats.total_danger > 0 ? 35 : 0 }}>
                        <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "900", color: "var(--text-main)", textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
                            🕸️ Infrastructure Integrity Profile
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Multi-dimensional infrastructure health analysis</p>
                    </div>
                    
                    <div style={{ height: "300px", width: '100%', position: 'relative' }}>
                        <ResponsiveContainer width="99%" height="100%" minWidth={100} minHeight={100}>
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                <PolarGrid stroke="var(--border)" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 800 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar
                                    name="Infrastructure"
                                    dataKey="A"
                                    stroke="#06b6d4"
                                    fill="#06b6d4"
                                    fillOpacity={0.3}
                                    dot={{ r: 4, fill: '#06b6d4' }}
                                />
                                <RechartsTooltip 
                                    contentStyle={{ 
                                        backgroundColor: 'var(--bg-card)', 
                                        border: '1px solid var(--border)',
                                        borderRadius: '12px',
                                        fontSize: '11px'
                                    }}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Distribution - Premium Bar Chart Upgrade */}
                <div className="stat-card" style={{ display: "flex", flexDirection: "column", padding: "24px", borderRadius: '28px' }}>
                    <div style={{ marginBottom: 20 }}>
                        <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "900", color: "var(--text-main)", textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
                            📊 Object Distribution
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Classification breakdown across infrastructure</p>
                    </div>

                    <div style={{ height: "300px", width: '100%' }}>
                        <ResponsiveContainer width="99%" height="100%" minWidth={100} minHeight={100}>
                            <BarChart data={distData}>
                                <defs>
                                    <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.2}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.3} />
                                <ReXAxis 
                                    dataKey="name" 
                                    stroke="var(--text-muted)" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false}
                                    tick={{ fill: 'var(--text-main)', fontWeight: 800 }}
                                />
                                <ReYAxis 
                                    stroke="var(--text-muted)" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false}
                                    tick={{ fill: 'var(--text-muted)', fontWeight: 700 }}
                                />
                                <RechartsTooltip 
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{ 
                                        backgroundColor: 'var(--bg-card)', 
                                        border: '1px solid var(--border)',
                                        borderRadius: '12px',
                                        fontSize: '11px',
                                        boxShadow: 'var(--shadow-premium)'
                                    }}
                                    itemStyle={{ color: '#06b6d4', fontWeight: 800 }}
                                    labelStyle={{ color: 'var(--text-main)', fontWeight: 800, marginBottom: '4px' }}
                                />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40} animationDuration={1500}>
                                    {distData.map((entry, index) => {
                                        const colorMap: { [key: string]: string } = {
                                            'POTHOLE': '#f97316',
                                            'CAR': '#06b6d4',
                                            'PERSON': '#a78bfa',
                                            'TRUCK': '#ef4444',
                                            'BUS': '#fbbf24',
                                            'MOTORCYCLE': '#10b981'
                                        };
                                        return <Cell key={`cell-${index}`} fill={colorMap[entry.name] || '#6366f1'} fillOpacity={0.9} />;
                                    })}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "12px 20px" }}>
                         {distData.map((entry) => {
                             const colorMap: { [key: string]: string } = {
                                 'POTHOLE': '#f97316',
                                 'CAR': '#06b6d4',
                                 'PERSON': '#a78bfa',
                                 'TRUCK': '#ef4444',
                                 'BUS': '#fbbf24',
                                 'MOTORCYCLE': '#10b981'
                             };
                             return (
                                 <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                    <div style={{ width: 8, height: 8, borderRadius: 2, background: colorMap[entry.name] || '#6366f1', boxShadow: `0 0 6px ${colorMap[entry.name] || '#6366f1'}66` }} /> 
                                    {entry.name}
                                 </div>
                             );
                         })}
                    </div>
                </div>
            </div>

            <div className="stat-card" style={{ marginTop: 24, padding: "24px", borderRadius: '28px' }}>
                <TrendCharts stats={stats} />
            </div>
            <style>{`
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.3); opacity: 0.5; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default AnalyticsSection;
