import React from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: string;
  trend?: 'up' | 'down' | 'neutral';
  onClick?: () => void;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  color = 'var(--primary)',
  trend,
  onClick
}: StatCardProps) {
  return (
    <div className="stat-card-v2" onClick={onClick}>
      <div className="stat-card-header">
        <div className="stat-icon-wrapper" style={{ color }}>
          {icon}
        </div>
        {trend && (
          <span className={`stat-trend ${trend}`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
          </span>
        )}
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-title">{title}</div>
      {subtitle && <div className="stat-subtitle">{subtitle}</div>}
    </div>
  );
}
