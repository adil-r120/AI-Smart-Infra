import React from "react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
 image?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
 image
}: EmptyStateProps) {
 return (
    <div className="empty-state-v2">
      {image && <img src={image} alt={title} className="empty-state-image" />}
      {!image && icon && <div className="empty-state-icon">{icon}</div>}
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-description">{description}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}
