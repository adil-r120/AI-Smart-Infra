import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
    const { token, loading } = useAuth();

    if (loading) {
        return (
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                height: "100vh", background: "var(--bg-body)", color: "var(--text-muted)",
                fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "0.9rem", gap: "12px",
            }}>
                <div style={{
                    width: 20, height: 20, borderRadius: "50%",
                    border: "2.5px solid var(--primary)", borderTopColor: "transparent",
                    animation: "spin 0.8s linear infinite",
                }} />
                Restoring session…
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return token ? <Outlet /> : <Navigate to="/login" replace />;
}
