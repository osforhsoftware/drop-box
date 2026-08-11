import { useRef, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { buildAuthSecurityPayload, honeypotFieldProps, HONEYPOT_CLASS } from "../../lib/authSecurity";
import SiteLogo from "../../components/SiteLogo";

export default function AdminLogin() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const formLoadedAt = useRef(Date.now());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  if (user?.role === "admin") return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await login(
        email,
        password,
        buildAuthSecurityPayload(formLoadedAt.current, honeypot)
      );
      navigate("/admin");
    } catch (e) {
      setErr(e.response?.data?.detail || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="admin-login" className="min-h-screen grid place-items-center px-6">
      <form onSubmit={submit} className="glass rounded-2xl p-10 w-full max-w-md relative">
        <div className={HONEYPOT_CLASS} aria-hidden="true">
          <label htmlFor="admin-honeypot">Leave blank</label>
          <input id="admin-honeypot" {...honeypotFieldProps(honeypot, (e) => setHoneypot(e.target.value))} />
        </div>
        <div className="flex items-center gap-2 mb-8">
          <SiteLogo className="h-10" />
          <span className="text-xs text-white/40 font-mono uppercase tracking-wider">Admin</span>
        </div>
        <div className="label-eyebrow mb-2">Email</div>
        <input data-testid="login-email"
          type="email"
          autoComplete="username"
          value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 mb-4 focus:ring-1 focus:ring-brand focus:outline-none"
        />
        <div className="label-eyebrow mb-2">Password</div>
        <input data-testid="login-password" type="password"
          autoComplete="current-password"
          value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 mb-6 focus:ring-1 focus:ring-brand focus:outline-none"
        />
        {err && <div className="text-red-400 text-sm mb-3" data-testid="login-err">{err}</div>}
        <button data-testid="login-submit" disabled={busy} className="btn-primary w-full">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
