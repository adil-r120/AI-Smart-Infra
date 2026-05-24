import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_BASE } from "../api/config";
import { apiErrorMessage } from "../api/errors";
import { Eye, EyeOff, Shield, Wifi, Activity, Lock, Mail, User } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { useTranslation } from "react-i18next";

type Mode = "signin" | "signup";

export default function LoginPage() {
    const { t } = useTranslation();
    const { login, loginWithGoogle } = useAuth();
    const navigate = useNavigate();
    const emailRef = useRef<HTMLInputElement>(null);

    const [mode, setMode] = useState<Mode>("signin");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [accountType, setAccountType] = useState<"user" | "admin">("user");
    const [adminSignupCode, setAdminSignupCode] = useState("");
    const [adminInviteToken, setAdminInviteToken] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isShaking, setIsShaking] = useState(false);
    const [toast, setToast] = useState<string | null>(null);


    useEffect(() => {
        const pageTitle = mode === "signin" ? "AI Smart Infra - Sign In" : "AI Smart Infra - Sign Up";
        document.title = pageTitle;

        // Basic SEO Meta Description
        let meta = document.querySelector('meta[name="description"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('name', 'description');
            document.head.appendChild(meta);
        }
        meta.setAttribute('content', `Access the AI Smart-Infra platform to monitor infrastructure health in real-time. ${mode === "signin" ? "Login to your account." : "Create a new secure account."}`);

        if (emailRef.current) emailRef.current.focus();
    }, [mode]);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const triggerShake = () => {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
    };

    const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        if (mode === "signup") {
            if (!name.trim()) { setError("Full name is required"); triggerShake(); setLoading(false); return; }
            if (!validateEmail(email)) { setError("Please enter a valid email address"); triggerShake(); setLoading(false); return; }
            if (password.length < 8) { setError("Password must be at least 8 characters"); triggerShake(); setLoading(false); return; }
            if (password !== confirmPassword) { setError("Passwords do not match"); triggerShake(); setLoading(false); return; }
            if (accountType === "admin" && !adminSignupCode.trim() && !adminInviteToken.trim()) {
                setError("Provide an admin signup code or invite token");
                triggerShake();
                setLoading(false);
                return;
            }

            try {
                const res = await fetch(`${API_BASE}/auth/register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name,
                        email,
                        password,
                        account_type: accountType,
                        admin_signup_code: accountType === "admin" ? adminSignupCode : undefined,
                        admin_invite_token: accountType === "admin" ? adminInviteToken : undefined,
                    }),
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(apiErrorMessage(err, "Registration failed"));
                }
            } catch (err: any) {
                setError(err.message || "Something went wrong");
                triggerShake();
                setLoading(false);
                return;
            }
        }

        try {
            await login(email, password);
            localStorage.setItem("si_active_tab", "Home");
            navigate("/dashboard", { replace: true });
        } catch (err: any) {
            setError(err.message || "Invalid credentials. Please try again.");
            triggerShake();
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse: any) => {
        if (!credentialResponse.credential) return;

        setLoading(true);
        setError(null);
        showToast("Establishing encrypted connection...");

        try {
            await loginWithGoogle(credentialResponse.credential);
            localStorage.setItem("si_active_tab", "Home");
            navigate("/dashboard", { replace: true });
        } catch (err: any) {
            setError(err.message || "Google Authentication failed");
            triggerShake();
        } finally {
            setLoading(false);
        }
    };

    const getStrength = (p: string) => {
        if (!p) return 0;
        let s = 0;
        if (p.length >= 8) s += 1;
        if (/[A-Z]/.test(p)) s += 1;
        if (/[0-9]/.test(p)) s += 1;
        if (/[^A-Za-z0-9]/.test(p)) s += 1;
        return s;
    };
    const strength = getStrength(password);

    return (
        <div className="lp-root">
            {/* Background elements removed for immersive logo background */}

            {toast && (
                <div className="lp-toast">
                    <Activity size={14} className="lp-toast-icon" />
                    <span>{toast}</span>
                </div>
            )}

            <div className="lp-brand">
                <div className="lp-brand-inner">
                    <div className="lp-logo">
                        <img src="/favicon.png" alt="Smart Infra Logo" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    </div>
                    <h1 className="lp-product">{t("auth.brand.title")}</h1>
                    <p className="lp-tagline">{t("auth.brand.tagline")}</p>

                    <div className="lp-feature-list">
                        {[
                            { icon: <Activity size={16} />, label: t("auth.brand.features.aiDetection") },
                            { icon: <Wifi size={16} />, label: t("auth.brand.features.gpsMonitoring") },
                            { icon: <Shield size={16} />, label: t("auth.brand.features.securePipeline") },
                        ].map(f => (
                            <div key={f.label} className="lp-feature">
                                {f.icon}
                                <span>{f.label}</span>
                            </div>
                        ))}
                    </div>

                    <div className="lp-status-bar">
                        <span className="lp-status-dot" />
                        <span>{t("auth.brand.systemStatus")}</span>
                    </div>
                </div>
            </div>

            <div className="lp-auth">
                <div className={`lp-card ${isShaking ? "lp-shake" : ""}`}>
                    <div className="lp-toggle">
                        <button type="button" className={mode === "signin" ? "active" : ""} onClick={() => { setMode("signin"); setError(null); }}>
                            {t("auth.tabs.signIn")}
                        </button>
                        <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setError(null); }}>
                            {t("auth.tabs.signUp")}
                        </button>
                    </div>

                    <h2 className="lp-card-title">
                        {mode === "signin" ? t("auth.login.title") : t("auth.register.title")}
                    </h2>
                    <p className="lp-card-sub">
                        {mode === "signin" ? t("auth.login.subtitle") : t("auth.register.subtitle")}
                    </p>

                    <form onSubmit={handleSubmit} className="lp-form">
                        <div className={`lp-signup-fields ${mode === "signup" ? "active" : ""}`}>
                            <div className="lp-field">
                                <label>{t("auth.fields.accountType")}</label>
                                <div className="lp-role-toggle">
                                    <button
                                        type="button"
                                        className={accountType === "user" ? "active" : ""}
                                        onClick={() => setAccountType("user")}
                                    >
                                        {t("auth.fields.roleUser")}
                                    </button>
                                    <button
                                        type="button"
                                        className={accountType === "admin" ? "active" : ""}
                                        onClick={() => setAccountType("admin")}
                                    >
                                        {t("auth.fields.roleAdmin")}
                                    </button>
                                </div>
                            </div>
                            <div className="lp-field">
                                <label>{t("auth.fields.fullName")}</label>
                                <div className="lp-input-wrap">
                                    <User size={15} className="lp-input-icon" />
                                    <input
                                        id="name" name="name"
                                        type="text"
                                        value={name} onChange={e => setName(e.target.value)}
                                        autoComplete="name"
                                    />
                                </div>
                            </div>
                            {accountType === "admin" && (
                                <>
                                    <div className="lp-field">
                                        <label>{t("auth.fields.adminInviteToken")}</label>
                                        <div className="lp-input-wrap">
                                            <Shield size={15} className="lp-input-icon" />
                                            <input
                                                id="adminInviteToken" name="adminInviteToken"
                                                type="text"

                                                value={adminInviteToken}
                                                onChange={e => setAdminInviteToken(e.target.value)}
                                                autoComplete="off"
                                            />
                                        </div>
                                    </div>
                                    <div className="lp-field">
                                        <label>{t("auth.fields.adminSignupCode")}</label>
                                        <div className="lp-input-wrap">
                                            <Shield size={15} className="lp-input-icon" />
                                            <input
                                                id="adminSignupCode" name="adminSignupCode"
                                                type="password"

                                                value={adminSignupCode}
                                                onChange={e => setAdminSignupCode(e.target.value)}
                                                autoComplete="off"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="lp-field">
                            <label>{t("auth.fields.email")}</label>
                            <div className="lp-input-wrap">
                                <Mail size={15} className="lp-input-icon" />
                                <input
                                    id="email" name="email"
                                    ref={emailRef}
                                    type="email"
                                    placeholder="Enter your email"
                                    value={email} onChange={e => setEmail(e.target.value)}
                                    required autoComplete="email"
                                />
                            </div>
                        </div>

                        <div className="lp-field">
                            <label>{t("auth.fields.password")}</label>
                            <div className="lp-input-wrap">
                                <Lock size={15} className="lp-input-icon" />
                                <input
                                    id="password" name="password"
                                    type={showPass ? "text" : "password"}
                                    placeholder="Enter your password"
                                    value={password} onChange={e => setPassword(e.target.value)}
                                    required autoComplete={mode === "signup" ? "new-password" : "current-password"}
                                />
                                <button type="button" className="lp-eye" onClick={() => setShowPass(p => !p)} aria-label={t("auth.actions.togglePassword")}>
                                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>

                            {mode === "signup" && password.length > 0 && (
                                <div className="lp-strength">
                                    <div className="lp-strength-bars">
                                        {[1, 2, 3, 4].map(s => (
                                            <div key={s} className={`lp-strength-bar ${strength >= s ? "active" : ""}`} />
                                        ))}
                                    </div>
                                    <span className="lp-strength-text">
                                        {strength < 2 ? t("auth.passwordStrength.weak") : strength < 4 ? t("auth.passwordStrength.medium") : t("auth.passwordStrength.strong")}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className={`lp-signup-fields ${mode === "signup" ? "active" : ""}`}>
                            <div className="lp-field">
                                <label>{t("auth.fields.confirmPassword")}</label>
                                <div className="lp-input-wrap">
                                    <Lock size={15} className="lp-input-icon" />
                                    <input
                                        id="confirmPassword" name="confirmPassword"
                                        type={showConfirmPass ? "text" : "password"}

                                        value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                                        required={mode === "signup"} autoComplete="new-password"
                                    />
                                    <button type="button" className="lp-eye" onClick={() => setShowConfirmPass(p => !p)} aria-label={t("auth.actions.toggleConfirmPassword")}>
                                        {showConfirmPass ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="lp-extras">
                            <label className="lp-remember">
                                <input id="remember" name="remember" type="checkbox" />
                                <span>{t("auth.actions.rememberMe")}</span>
                            </label>
                            <button type="button" className="lp-forgot" onClick={() => showToast(t("auth.actions.forgotPasswordToast", "Password reset feature coming soon"))}>
                                {t("auth.actions.forgotPassword")}
                            </button>
                        </div>

                        {error && (
                            <div className="lp-error">
                                <Shield size={13} />
                                <span>{error}</span>
                            </div>
                        )}

                        <button type="submit" className="lp-submit" disabled={loading}>
                            {loading ? (
                                <><div className="lp-spinner" /> {mode === "signin" ? t("auth.login.loading") : t("auth.register.loading")}</>
                            ) : (
                                mode === "signin" ? t("auth.login.button") : t("auth.register.button")
                            )}
                        </button>
                    </form>

                    <div className="lp-social">
                        <div className="lp-social-div"><span>{t("auth.actions.orSecureAccessVia")}</span></div>
                        <div className="lp-social-btns">
                            <div className="lp-google-wrapper">
                                <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={() => {
                                        setError(t("auth.errors.googleSignInFailed", "Google Sign-In failed"));
                                        triggerShake();
                                    }}
                                    useOneTap
                                    theme="filled_black"
                                    shape="pill"
                                    size="large"
                                    text="continue_with"
                                    width="100%"
                                />
                            </div>
                        </div>
                    </div>

                    <p className="lp-switch">
                        {mode === "signin" ? t("auth.login.noAccount") : t("auth.register.hasAccount")}
                        <button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}>
                            {mode === "signin" ? t("auth.login.switchAction") : t("auth.register.switchAction")}
                        </button>
                    </p>

                    <div className="lp-legal">
                        <button type="button" onClick={() => showToast(t("auth.actions.termsToast", "Terms of Service viewing coming soon"))}>{t("auth.actions.termsOfService")}</button>
                        <span className="lp-legal-sep">&bull;</span>
                        <button type="button" onClick={() => showToast(t("auth.actions.privacyToast", "Privacy Policy viewing coming soon"))}>{t("auth.actions.privacyPolicy")}</button>
                    </div>
                </div>
            </div>

            <style>{`
                .lp-root {
                    display: flex; min-height: 100vh; width: 100%; overflow-y: auto; overflow-x: hidden;
                    position: relative; 
                    background: linear-gradient(rgba(9,9,15,0.7), rgba(9,9,15,0.85)), url('/favicon.png');
                    background-size: cover; background-position: center; background-attachment: fixed;
                    font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
                }

                /* Removed old background elements */

                /* ── Toast ── */
                .lp-toast {
                    position: absolute; top: 24px; left: 50%; transform: translateX(-50%);
                    z-index: 100; display: flex; align-items: center; gap: 10px;
                    padding: 10px 18px; border-radius: 12px;
                    background: rgba(99,102,241,0.95); color: white;
                    font-size: 0.85rem; font-weight: 700;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
                    animation: lp-slide-down 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes lp-slide-down { from { transform: translate(-50%, -20px); opacity: 0; } }
                .lp-toast-icon { animation: lp-pulse 1s ease-in-out infinite; }

                /* ── Brand panel ── */
                .lp-brand {
                    flex: 1; display: flex; align-items: center; justify-content: center;
                    padding: clamp(32px, 5vw, 64px); position: relative; z-index: 1; min-height: 100vh;
                }
                .lp-brand-inner { 
                    max-width: 480px; 
                    display: flex; flex-direction: column; align-items: center; 
                    text-align: center;
                }
                .lp-logo {
                    width: clamp(80px, 15vw, 120px); height: clamp(80px, 15vw, 120px); 
                    border-radius: clamp(20px, 4vw, 28px);
                    overflow: hidden;
                    display: flex; align-items: center; justify-content: center;
                    color: white; margin-bottom: clamp(16px, 4vh, 32px);
                    box-shadow: 0 12px 48px rgba(0,0,0,0.6);
                }
                .lp-product {
                    font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 900; color: white;
                    letter-spacing: -0.04em; margin: 0 0 12px;
                    background: linear-gradient(135deg, #fff 40%, #a5b4fc);
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                }
                .lp-tagline { font-size: clamp(1rem, 2vw, 1.2rem); color: rgba(255,255,255,0.5); line-height: 1.6; margin: 0; }
                .lp-feature-list { display: flex; flex-direction: column; gap: 14px; margin-bottom: 40px; }
                .lp-feature { display: flex; align-items: center; gap: 12px; color: rgba(255,255,255,0.7); font-size: 0.88rem; font-weight: 500; }
                .lp-feature svg { color: #818cf8; }

                .lp-status-bar {
                    display: inline-flex; align-items: center; gap: 8px;
                    padding: 7px 14px; border-radius: 99px;
                    border: 1px solid rgba(16,185,129,0.3); background: rgba(16,185,129,0.08);
                    color: #10b981; font-size: 0.75rem; font-weight: 700;
                }
                .lp-status-dot {
                    width: 7px; height: 7px; border-radius: 50%; background: #10b981;
                    box-shadow: 0 0 0 3px rgba(16,185,129,0.2); animation: lp-pulse 2s ease-in-out infinite;
                }
                @keyframes lp-pulse { 0%,100% { box-shadow: 0 0 0 3px rgba(16,185,129,0.2); } 50% { box-shadow: 0 0 0 6px rgba(16,185,129,0); } }

                /* ── Auth panel ── */
                .lp-auth {
                    width: clamp(380px, 35vw, 480px); flex-shrink: 0; 
                    display: flex; flex-direction: column; align-items: center;
                    padding: clamp(32px, 8vh, 64px) 32px 80px; position: relative; z-index: 1; min-height: 100vh;
                    background: rgba(255,255,255,0.02); border-left: 1px solid rgba(255,255,255,0.06);
                    backdrop-filter: blur(24px);
                }
                .lp-card {
                    width: 100%;
                    max-width: 380px;
                    transition: transform 0.3s;
                    margin: auto 0;
                    max-height: calc(100vh - 40px);
                    overflow-y: auto;
                    overflow-x: hidden;
                    padding-right: 4px;
                }
                .lp-shake { animation: lp-shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
                @keyframes lp-shake {
                    10%, 90% { transform: translate3d(-1px, 0, 0); }
                    20%, 80% { transform: translate3d(2px, 0, 0); }
                    30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
                    40%, 60% { transform: translate3d(4px, 0, 0); }
                }

                .lp-toggle {
                    display: flex; background: rgba(255,255,255,0.05);
                    border-radius: 12px; padding: 4px; margin-bottom: 28px;
                    border: 1px solid rgba(255,255,255,0.08);
                }
                .lp-toggle button {
                    flex: 1; padding: 9px; border: none; border-radius: 9px;
                    background: transparent; color: rgba(255,255,255,0.45);
                    font-size: 0.82rem; font-weight: 700; cursor: pointer;
                    transition: all 0.2s ease; font-family: inherit;
                }
                .lp-toggle button.active {
                    background: rgba(99,102,241,0.2); color: #a5b4fc;
                    box-shadow: 0 2px 8px rgba(99,102,241,0.2);
                }

                .lp-card-title { font-size: 1.6rem; font-weight: 800; color: white; margin: 0 0 6px; letter-spacing: -0.02em; }
                .lp-card-sub { font-size: 0.85rem; color: rgba(255,255,255,0.4); margin: 0 0 28px; }

                /* ── Form ── */
                .lp-form { display: flex; flex-direction: column; gap: 12px; min-height: 250px; }
                .lp-signup-fields { 
                    max-height: 0; overflow: hidden; opacity: 0; 
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .lp-signup-fields.active { max-height: 460px; opacity: 1; margin-bottom: 0px; }

                .lp-field { display: flex; flex-direction: column; gap: 6px; }
                .lp-field label { font-size: 0.72rem; font-weight: 800; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.08em; }
                .lp-role-toggle {
                    display: flex;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 10px;
                    padding: 4px;
                    gap: 4px;
                }
                .lp-role-toggle button {
                    flex: 1;
                    border: none;
                    border-radius: 8px;
                    background: transparent;
                    color: rgba(255,255,255,0.5);
                    font-size: 0.8rem;
                    font-weight: 700;
                    cursor: pointer;
                    padding: 8px 10px;
                    transition: all 0.2s ease;
                    font-family: inherit;
                }
                .lp-role-toggle button.active {
                    background: rgba(99,102,241,0.25);
                    color: #c7d2fe;
                }
                .lp-input-wrap { position: relative; display: flex; align-items: center; width: 100%; box-sizing: border-box; }
                .lp-input-icon { position: absolute; left: 14px; color: rgba(255,255,255,0.25); pointer-events: none; }
                .lp-input-wrap input {
                    width: 100%; padding: 10px 14px 10px 42px; box-sizing: border-box;
                    background: rgba(255,255,255,0.04); border: 1.5px solid rgba(255,255,255,0.08);
                    border-radius: 12px; color: white; font-size: 0.9rem; font-family: inherit;
                    outline: none; transition: all 0.2s;
                }
                .lp-input-wrap input:focus {
                    border-color: #6366f1; background: rgba(99,102,241,0.06);
                    box-shadow: inset 0 0 10px rgba(99,102,241,0.1), 0 0 0 2px rgba(99,102,241,0.3);
                }
                .lp-input-wrap input:focus-visible { outline: none; }
                .lp-input-icon.error { color: #f87171 !important; transform: scale(1.1); transition: 0.2s; }
                .lp-field-error { font-size: 0.68rem; font-weight: 700; color: #fca5a5; margin-top: 4px; display: flex; align-items: center; gap: 4px; }

                .lp-eye {
                    position: absolute; right: 12px; background: none; border: none;
                    color: rgba(255,255,255,0.3); cursor: pointer; padding: 4px; display: flex;
                }

                /* ── Password Strength ── */
                .lp-strength { margin-top: 8px; display: flex; align-items: center; gap: 12px; }
                .lp-strength-bars { display: flex; gap: 4px; flex: 1; }
                .lp-strength-bar { height: 4px; flex: 1; border-radius: 2px; background: rgba(255,255,255,0.08); transition: all 0.3s; }
                .lp-strength-bar.active:nth-child(1) { background: #ef4444; }
                .lp-strength-bar.active:nth-child(2) { background: #f59e0b; }
                .lp-strength-bar.active:nth-child(3) { background: #10b981; }
                .lp-strength-bar.active:nth-child(4) { background: #06b6d4; }
                .lp-strength-text { font-size: 0.7rem; font-weight: 700; color: rgba(255,255,255,0.4); text-transform: uppercase; width: 50px; text-align: right; }
                
                .lp-extras { display: flex; align-items: center; justify-content: space-between; margin-top: -4px; }
                .lp-remember { 
                    display: flex; align-items: center; gap: 10px; 
                    cursor: pointer; user-select: none;
                    transition: var(--transition);
                }
                .lp-remember:hover span { color: rgba(255,255,255,0.6); }
                
                .lp-remember input { 
                    appearance: none; -webkit-appearance: none;
                    width: 14px; height: 14px; border-radius: 4px;
                    border: 1.5px solid rgba(255,255,255,0.15);
                    background: rgba(255,255,255,0.03);
                    cursor: pointer; position: relative;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    flex-shrink: 0; margin: 0;
                }
                
                .lp-remember input:checked {
                    background: #6366f1;
                    border-color: #6366f1;
                    box-shadow: 0 0 10px rgba(99,102,241,0.3);
                }
                
                .lp-remember input:checked::after {
                    content: '';
                    position: absolute;
                    left: 4px; top: 1.5px;
                    width: 3.5px; height: 7px;
                    border: solid white;
                    border-width: 0 1.5px 1.5px 0;
                    transform: rotate(45deg);
                    animation: lp-check-pop 0.2s ease-out;
                }
                
                @keyframes lp-check-pop {
                    from { transform: rotate(45deg) scale(0.5); opacity: 0; }
                    to { transform: rotate(45deg) scale(1); opacity: 1; }
                }
                
                .lp-remember span { 
                    font-size: 0.8rem; font-weight: 600; 
                    color: rgba(255,255,255,0.4); 
                    transition: color 0.2s;
                }
                .lp-forgot { background: none; border: none; color: #a5b4fc; font-size: 0.75rem; font-weight: 700; cursor: pointer; padding: 0; }
                .lp-forgot:hover { text-decoration: underline; }

                /* ── Social ── */
                .lp-social { margin-top: 24px; }
                .lp-social-div {
                    display: flex; align-items: center; gap: 12px;
                    font-size: 0.72rem; color: rgba(255,255,255,0.3);
                    text-transform: uppercase; font-weight: 700; margin-bottom: 16px;
                }
                .lp-social-div::before, .lp-social-div::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.06); }
                .lp-social-btns { display: flex; gap: 12px; justify-content: center; }
                .lp-google-wrapper { 
                    width: 100%; display: flex; justify-content: center; 
                    transform: scale(0.95); transition: transform 0.2s;
                }
                .lp-google-wrapper:hover { transform: scale(1); }

                .lp-error {
                    display: flex; align-items: center; gap: 8px; padding: 10px 14px;
                    border-radius: 10px; background: rgba(239,68,68,0.12);
                    border: 1px solid rgba(239,68,68,0.3); color: #fca5a5; font-size: 0.8rem; font-weight: 600;
                }

                .lp-submit {
                    margin-top: 4px; padding: 13px;
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    border: none; border-radius: 12px; color: white;
                    font-size: 0.92rem; font-weight: 800; cursor: pointer;
                    display: flex; align-items: center; justify-content: center; gap: 8px;
                    transition: all 0.2s; box-shadow: 0 4px 20px rgba(99,102,241,0.4);
                }
                .lp-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 28px rgba(99,102,241,0.55); }
                .lp-submit:disabled { opacity: 0.6; cursor: not-allowed; }
                .lp-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.4); border-top-color: white; border-radius: 50%; animation: lp-spin 0.6s linear infinite; }
                @keyframes lp-spin { to { transform: rotate(360deg); } }

                .lp-switch { text-align: center; margin: 24px 0 16px; font-size: 0.85rem; color: rgba(255,255,255,0.3); }
                .lp-switch button { background: none; border: none; color: #a5b4fc; font-weight: 700; cursor: pointer; font-family: inherit; font-size: inherit; }
                .lp-switch button:hover { text-decoration: underline; color: white; }

                .lp-legal { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 24px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.06); }
                .lp-legal button { background: none; border: none; color: rgba(255,255,255,0.2); font-size: 0.68rem; font-weight: 700; cursor: pointer; font-family: inherit; transition: 0.2s; }
                .lp-legal button:hover { color: rgba(255,255,255,0.5); }
                .lp-legal-sep { color: rgba(255,255,255,0.1); font-size: 0.6rem; }

                @media (max-width: 1024px) {
                    .lp-auth { width: 420px; }
                    .lp-product { font-size: 2.8rem; }
                }

                @media (max-width: 900px) {
                    .lp-auth { width: 380px; }
                }

                @media (max-width: 768px) {
                    .lp-brand { display: none; }
                    .lp-auth { width: 100%; border-left: none; padding: 32px 20px; }
                    .lp-card { max-width: 100%; }
                    .lp-card-title { font-size: 1.4rem; }
                    .lp-card-sub { margin-bottom: 16px; }
                    .lp-toggle { margin-bottom: 18px; }
                    .lp-field label { font-size: 0.66rem; }
                    .lp-role-toggle button { font-size: 0.75rem; padding: 7px 8px; }
                    .lp-input-wrap input { font-size: 0.85rem; }
                }
            `}</style>
        </div>
    );
}

