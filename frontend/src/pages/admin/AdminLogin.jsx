import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { Sparkles } from "lucide-react";

export default function AdminLogin() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@casecraft.com");
  const [password, setPassword] = useState("Admin@123");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await login(email, password);
      navigate("/admin");
    } catch (e) {
      setErr(e.response?.data?.detail || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="admin-login" className="min-h-screen grid place-items-center px-6">
      <form onSubmit={submit} className="glass rounded-2xl p-10 w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-md bg-[#ff4f00] grid place-items-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-display text-xl">FORM Admin</span>
        </div>
        <div className="label-eyebrow mb-2">Email</div>
        <input data-testid="login-email"
          value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 mb-4 focus:ring-1 focus:ring-[#ff4f00] focus:outline-none"
        />
        <div className="label-eyebrow mb-2">Password</div>
        <input data-testid="login-password" type="password"
          value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 mb-6 focus:ring-1 focus:ring-[#ff4f00] focus:outline-none"
        />
        {err && <div className="text-red-400 text-sm mb-3" data-testid="login-err">{err}</div>}
        <button data-testid="login-submit" disabled={busy} className="btn-primary w-full">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
