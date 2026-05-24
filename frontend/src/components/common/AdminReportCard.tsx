import React from "react";
import { Eye, CheckCircle, Shield, Trash2, MapPin, Calendar, Clock } from "lucide-react";
import Badge from "./Badge";
import Button from "./Button";

interface Report {
  id: number;
  problem_type: string;
  location: string;
  description: string;
  timestamp: string;
  status: string;
 image_url?: string;
  is_danger?: number;
}

interface AdminReportCardProps {
 report: Report;
  onView: (report: Report) => void;
  onResolve: (id: number) => void;
  onDelete: (id: number) => void;
}

export default function AdminReportCard({ 
 report, 
  onView, 
  onResolve, 
  onDelete 
}: AdminReportCardProps) {
 const getStatusVariant = () => {
    if (report.is_danger) return 'danger';
    switch (report.status.toLowerCase()) {
      case 'resolved': return 'success';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

 const getProblemIcon = () => {
    if (report.is_danger) return '🚨';
    switch (report.problem_type.toLowerCase()) {
      case 'pothole': return '🕳️';
      case 'graffiti': return '🎨';
      case 'damage': return '⚠️';
      case 'debris': return '🗑️';
      default: return '📍';
    }
  };

 return (
    <div className="admin-report-card">
      {/* Image Preview */}
      <div className="report-image-container">
        {report.image_url ? (
          <img 
            src={report.image_url} 
            alt={report.problem_type} 
            className="report-image"
          />
        ) : (
          <div className="report-image-placeholder">
            <span style={{ fontSize: '2rem' }}>{getProblemIcon()}</span>
          </div>
        )}
        {report.is_danger && (
          <Badge variant="danger" size="sm" dot className="danger-badge">
            DANGER
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="report-content">
        <div className="report-header">
          <div className="report-type">
            <span className="report-emoji">{getProblemIcon()}</span>
            <h3 className="report-title">{report.problem_type}</h3>
          </div>
          <Badge variant={getStatusVariant()} size="sm" dot>
            {report.status}
          </Badge>
        </div>

        <p className="report-description">{report.description}</p>

        <div className="report-meta">
          <div className="meta-item">
            <MapPin size={14} />
            <span>{report.location}</span>
          </div>
          <div className="meta-item">
            <Calendar size={14} />
            <span>{new Date(report.timestamp).toLocaleDateString()}</span>
          </div>
          <div className="meta-item">
            <Clock size={14} />
            <span>{new Date(report.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="report-actions">
          <Button
            variant="ghost"
            size="sm"
            icon={<Eye size={16} />}
           onClick={() => onView(report)}
          >
            View
          </Button>
          {report.status !== 'Resolved' && (
            <Button
              variant="success"
              size="sm"
              icon={<CheckCircle size={16} />}
             onClick={() => onResolve(report.id)}
            >
              Resolve
            </Button>
          )}
          {report.is_danger && (
            <Button
              variant="primary"
              size="sm"
              icon={<Shield size={16} />}
             onClick={() => onView(report)}
            >
              Alert
            </Button>
          )}
          <Button
            variant="danger"
            size="sm"
            icon={<Trash2 size={16} />}
           onClick={() => onDelete(report.id)}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
