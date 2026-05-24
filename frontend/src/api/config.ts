// Use 127.0.0.1 (not "localhost") so it matches Vite's host and avoids Windows
// resolving localhost to ::1 while uvicorn listens on IPv4-only 127.0.0.1.
export const API_BASE = "http://127.0.0.1:8000";
