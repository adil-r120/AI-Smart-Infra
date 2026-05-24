/** Normalize FastAPI `detail` (string or validation array) for UI messages */
export function apiErrorMessage(body: unknown, fallback: string): string {
    if (!body || typeof body !== "object") return fallback;
    const detail = (body as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.length > 0) {
        const first = detail[0];
        if (first && typeof first === "object" && "msg" in first) {
            return String((first as { msg: string }).msg);
        }
    }
    return fallback;
}
