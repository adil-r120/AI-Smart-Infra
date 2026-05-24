import React from "react";
import { Search, Filter, X } from "lucide-react";
import Button from "./Button";
import Badge from "./Badge";

interface FilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  classFilter: string;
  onClassFilterChange: (value: string) => void;
 confidenceFilter?: string;
  onConfidenceFilterChange?: (value: string) => void;
  onRefresh: () => void;
  onExport: () => void;
 refreshing?: boolean;
}

export default function FilterBar({
  searchValue,
  onSearchChange,
  classFilter,
  onClassFilterChange,
 confidenceFilter,
  onConfidenceFilterChange,
  onRefresh,
  onExport,
 refreshing = false
}: FilterBarProps) {
 return (
    <div className="detection-filter-bar">
      {/* Search */}
      <div className="search-container">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          placeholder="Search by ID, type, timestamp, or coordinates..."
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="search-input"
        />
        {searchValue && (
          <button className="clear-search" onClick={() => onSearchChange("")}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="filter-group">
        <select
          value={classFilter}
          onChange={(e) => onClassFilterChange(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Types</option>
          <option value="pothole">Potholes</option>
          <option value="vehicle">Vehicles</option>
          <option value="person">People</option>
          <option value="danger">Danger Alerts</option>
        </select>

        {confidenceFilter !== undefined && onConfidenceFilterChange && (
          <select
            value={confidenceFilter}
            onChange={(e) => onConfidenceFilterChange(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Confidence</option>
            <option value="high">High (&gt;70%)</option>
            <option value="medium">Medium (40-70%)</option>
            <option value="low">Low (&lt;40%)</option>
          </select>
        )}

        <Badge variant="default" size="sm">
          <Filter size={12} />
          Filters Active
        </Badge>
      </div>

      {/* Actions */}
      <div className="filter-actions">
        <Button
          variant="ghost"
          size="sm"
          icon={<span className={refreshing ? 'spin' : ''}>⟳</span>}
          onClick={onRefresh}
          disabled={refreshing}
        >
          Refresh
        </Button>
        <Button
          variant="primary"
          size="sm"
          icon={<span>↓</span>}
          onClick={onExport}
        >
          Export
        </Button>
      </div>
    </div>
  );
}
