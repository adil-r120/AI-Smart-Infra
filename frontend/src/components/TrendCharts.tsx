import React from 'react';
// Explicit separate imports to force a full re-index
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { Stats } from '../types';

interface TrendChartsProps {
    stats: Stats | null;
}

const TrendCharts: React.FC<TrendChartsProps> = ({ stats }) => {
    if (!stats) return null;

    // Derive values for the 4 Gauges
    const integrityValue = stats.road_health_score;
    const precisionValue = Math.round((stats.avg_confidence || 0.85) * 100);

    // Transform hourly stats into Recharts format
    const hourlyStats = stats.hourly_stats || {};
    const data = Object.keys(hourlyStats).sort().map(hour => ({
        name: hour,
        detections: hourlyStats[hour] || 0,
    }));

    return (
        <div className="trend-charts-container" style={{ width: '100%', marginTop: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16, padding: '0 4px' }}>
                <div>
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-main)', marginBottom: 2, letterSpacing: '-0.03em', textTransform: 'uppercase' }}>Neural Detection Velocity (24h)</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Temporal analysis of urban anomaly density</p>
                </div>
                <div style={{ display: 'flex', gap: '24px' }}>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Peak Flow</p>
                        <p style={{ fontSize: '1.3rem', fontWeight: 900, color: '#06b6d4' }}>{Math.max(...data.map(d => d.detections), 0)}<span style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.6 }}>/hr</span></p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Momentum</p>
                        <p style={{ fontSize: '1.3rem', fontWeight: 900, color: '#10b981' }}>{(data.reduce((a, b) => a + b.detections, 0) / (data.length || 1)).toFixed(1)}</p>
                    </div>
                </div>
            </div>

            <div style={{
                width: '100%',
                padding: '32px 24px 20px 12px',
                background: 'var(--bg-card)',
                borderRadius: '28px',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-premium)'
            }}>
                <div style={{ width: '100%', height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                            <BarChart data={data} barSize={24}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.5} />
                                <XAxis
                                    dataKey="name"
                                    stroke="var(--text-muted)"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    interval={3}
                                    tick={{ fill: 'var(--text-muted)', fontWeight: 700 }}
                                />
                                <YAxis
                                    stroke="var(--text-muted)"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: 'var(--text-muted)', fontWeight: 700 }}
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(6, 182, 212, 0.1)' }}
                                    contentStyle={{
                                        backgroundColor: 'var(--bg-card)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '14px',
                                        fontSize: '12px',
                                        boxShadow: 'var(--shadow-premium)',
                                        padding: '12px'
                                    }}
                                    itemStyle={{ color: '#06b6d4', fontWeight: 800 }}
                                    labelStyle={{ color: 'var(--text-main)', fontWeight: 800, textTransform: 'uppercase', fontSize: '9px', marginBottom: '6px' }}
                                />
                                <Bar 
                                    dataKey="detections" 
                                    fill="#06b6d4" 
                                    radius={[8, 8, 0, 0]} 
                                    animationDuration={1500}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
    );
};

export default TrendCharts;
