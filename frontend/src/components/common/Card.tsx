import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  padding?: 'sm' | 'md' | 'lg' | 'none';
  hover?: boolean;
  onClick?: () => void;
}

export default function Card({ 
  children, 
  className = '',
  title,
  icon,
  action,
  padding = 'md',
  hover = false,
  onClick
}: CardProps) {
  const paddingClass = padding === 'none' ? '' : 
                       padding === 'sm' ? 'card-padding-sm' :
                       padding === 'lg' ? 'card-padding-lg' : 'card-padding-md';
  
 return (
    <div 
      className={`card-v2 ${paddingClass} ${hover ? 'card-hoverable' : ''} ${className}`}
      onClick={onClick}
    >
      {(title || icon || action) && (
        <div className="card-header">
          <div className="card-header-start">
            {icon && <span className="card-header-icon">{icon}</span>}
            {title && <h3 className="card-title">{title}</h3>}
          </div>
          {action && <div className="card-header-action">{action}</div>}
        </div>
      )}
      <div className="card-content">
        {children}
      </div>
    </div>
  );
}
