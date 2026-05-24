// Shared TypeScript interfaces used across components

// ── Per-detection item from /detect ─────────────────────────────────────────
export interface Detection {
    bbox: number[];
    class: string;
    confidence: number;
    lat?: number;
    lng?: number;
    is_danger?: boolean;
}

// ── Response from /detect (dual-model) ──────────────────────────────────────
export interface DetectionResult {
    image_url: string;
    potholes: Detection[];
    objects: Detection[];
}

// ── Row from /detections or /map-data ───────────────────────────────────────
export interface DBEntry {
    id: number;
    latitude: number;
    longitude: number;
    confidence: number;
    object_type: string;
    timestamp: string | null;
    image?: string | null;
    is_danger?: number;
    camera_id?: string;
}

// ── /stats response ──────────────────────────────────────────────────────────
export interface Stats {
    total_detections: number;
    total_potholes: number;
    total_cars: number;
    total_people: number;
    total_bikes: number;
    total_trucks: number;
    total_danger: number;
    road_health_score: number;
    distribution: Record<string, number>;
    hourly_stats: Record<string, number>;
    system_health: string;
    ai_engine: string;
    avg_confidence: number;
}

export interface User {
    id: number;
    name: string;
    email: string;
    created_at: string;
    is_admin: boolean;
}

export interface WorkOrder {
    id: number;
    detection_id: number;
    assigned_user_id: number | null;
    status: string;
    priority: string;
    notes: string | null;
    assigned_at: string;
    completed_at: string | null;
}

export interface Report {
    id: number;
    problem_type: string;
    description: string;
    location: string;
    status: string;
    timestamp: string;
    image_path?: string | null;
}

export interface AuditLogEntry {
    id: number;
    user_id: number | null;
    user_name: string;
    user_email: string;
    action: string;
    table_name: string;
    record_id: number | null;
    timestamp: string | null;
}
