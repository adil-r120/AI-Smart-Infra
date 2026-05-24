import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { API_BASE } from "../api/config";
import { apiErrorMessage } from "../api/errors";

// ── Types ─────────────────────────────────────────────────────────────────────
interface AuthUser { id: number; name: string; email: string; is_admin: boolean; }
interface AuthContextValue {
    user: AuthUser | null;
    token: string | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    loginWithGoogle: (credential: string) => Promise<void>;
    logout: () => void;
}

// ── Context ───────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue>({} as AuthContextValue);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(() => localStorage.getItem("si_token"));
    const [loading, setLoading] = useState(true);
    const [initialized, setInitialized] = useState(false);

    // On mount — restore session from stored token
    useEffect(() => {
        // Don't re-run if already initialized (e.g., after login navigation)
        if (initialized) return;
        
        const stored = localStorage.getItem("si_token");
        if (!stored) { 
            setLoading(false); 
            setInitialized(true);
            return; 
        }
        
        let mounted = true;
        
        fetch(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${stored}` },
        })
            .then(r => r.ok ? r.json() : null)
            .then(data => { 
                if (mounted) {
                    if (data) { 
                        setUser(data); 
                        setToken(stored); 
                    } else { 
                        localStorage.removeItem("si_token"); 
                        setToken(null); 
                    }
                    setLoading(false);
                    setInitialized(true);
                }
            })
            .catch(() => { 
                if (mounted) {
                    localStorage.removeItem("si_token"); 
                    setToken(null);
                    setLoading(false);
                    setInitialized(true);
                }
            });
        
        return () => { mounted = false; };
    }, [initialized]);

    const login = useCallback(async (email: string, password: string) => {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(apiErrorMessage(err, "Login failed"));
        }
        const { access_token } = await res.json();
        localStorage.setItem("si_token", access_token);
        setToken(access_token);
        setLoading(false);
        setInitialized(true);

        const me = await fetch(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${access_token}` },
        });
        if (me.ok) {
            const userData = await me.json();
            setUser(userData);
        }
    }, []);

    const loginWithGoogle = useCallback(async (credential: string) => {
        const res = await fetch(`${API_BASE}/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credential }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(apiErrorMessage(err, "Google Login failed"));
        }
        const { access_token } = await res.json();
        localStorage.setItem("si_token", access_token);
        setToken(access_token);
        setLoading(false);
        setInitialized(true);

        const me = await fetch(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${access_token}` },
        });
        if (me.ok) {
            const userData = await me.json();
            setUser(userData);
        }
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem("si_token");
        setToken(null);
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, token, loading, login, loginWithGoogle, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
