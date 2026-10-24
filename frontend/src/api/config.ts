// In development with Vite, defaults to http://127.0.0.1:8000.
// In containerized/Nginx environments (PROD), defaults to "" (same-origin)
// so requests are proxied via Nginx without cross-origin issues or port exposure.
export const API_BASE =
  import.meta.env.VITE_API_BASE !== undefined
    ? import.meta.env.VITE_API_BASE
    : import.meta.env.PROD
    ? ""
    : "http://127.0.0.1:8000";
