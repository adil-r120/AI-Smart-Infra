import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'danger' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  className?: string;
}

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className = ''
}: BadgeProps) {
 return (
    <span className={`badge-v2 badge-${variant} badge-${size} ${className}`}>
      {dot && <span className="badge-dot"></span>}
      {children}
    </span>
  );
}
