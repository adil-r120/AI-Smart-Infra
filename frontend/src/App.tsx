import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import LoginPage from "./pages/LoginPage";
import "./App.css";

const App: React.FC = () => {
    return (
        <AuthProvider>
            <Router>
                <div className="app-shell">
                    <div className="app-container">
                        <Routes>
                            <Route path="/login" element={<LoginPage />} />
                            <Route element={<ProtectedRoute />}>
                                <Route path="/dashboard" element={<Dashboard />} />
                            </Route>
                            {/* Redirect root to dashboard (ProtectedRoute handles redirect to /login if needed) */}
                            <Route path="/" element={<Navigate to="/dashboard" replace />} />
                            <Route path="*" element={<Navigate to="/dashboard" replace />} />
                        </Routes>
                    </div>
                </div>

                <style>{`
                    .app-shell {
                        display: flex;
                        flex-direction: column;
                        height: 100vh;
                    }

                    .app-container {
                        flex: 1;
                        overflow: hidden;
                        position: relative;
                    }
                `}</style>
            </Router>
        </AuthProvider>
    );
};

export default App;
