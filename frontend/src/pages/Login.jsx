import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../lib/auth";
import { API_BASE } from "../lib/api";
import SiteLogo from "../components/SiteLogo";
import { LOGIN } from "../constants/testIds/auth";
import { ADMIN_LOGIN_PATH } from "../constants/nav";

function GoogleGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

const ERROR_MESSAGES = {
  google: "Google sign-in failed. Please try again.",
  denied: "Google sign-in was cancelled.",
  admin: "Admin accounts must sign in with email and password.",
  unverified: "Please use a verified Google account.",
  rate_limit: "Too many sign-in attempts. Please try again later.",
  google_not_configured: "Google sign-in is not configured yet.",
};

export default function Login() {
  const { user, loading, completeGoogleLogin, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState("");
  const exchangeStarted = useRef(false);
  const next = searchParams.get("next") || "/";
  const oauthCode = searchParams.get("code");
  const oauthError = searchParams.get("error");
  const checkoutHint = next === "/checkout";

  useEffect(() => {
    if (!oauthError) return;
    const message = ERROR_MESSAGES[oauthError] || ERROR_MESSAGES.google;
    setBanner(message);
    toast.error(message);
    const params = new URLSearchParams(searchParams);
    params.delete("error");
    const search = params.toString();
    navigate({ pathname: "/login", search: search ? `?${search}` : "" }, { replace: true });
  }, [oauthError, searchParams, navigate]);

  useEffect(() => {
    if (!oauthCode || exchangeStarted.current) return;
    exchangeStarted.current = true;
    setBusy(true);
    (async () => {
      try {
        await completeGoogleLogin(oauthCode);
        navigate(next, { replace: true });
      } catch {
        const session = await refreshUser();
        if (session) {
          navigate(next, { replace: true });
          return;
        }
        toast.error("Google sign-in failed. Please try again.");
      } finally {
        setBusy(false);
      }
    })();
  }, [oauthCode, completeGoogleLogin, refreshUser, navigate, next]);

  if (!loading && user && !oauthCode) {
    return <Navigate to={next} replace />;
  }

  const startGoogle = () => {
    const params = new URLSearchParams();
    if (next.startsWith("/") && !next.startsWith("//")) {
      params.set("next", next);
    }
    window.location.assign(`${API_BASE}/auth/google?${params.toString()}`);
  };

  return (
    <div data-testid="login-page" className="min-h-[calc(100vh-4rem)] grid place-items-center px-6 py-12">
      <div className="glass rounded-2xl p-10 w-full max-w-md text-center">
        <div className="mb-2 flex justify-center">
          <SiteLogo className="h-10" />
        </div>
        <h1 className="font-display text-3xl mt-4 mb-2">Welcome Back</h1>
        <p className="text-white/50 text-sm mb-8">
          {checkoutHint
            ? "Sign in to complete your order."
            : "Fast and secure sign in"}
        </p>

        <button
          data-testid={LOGIN.googleButton}
          type="button"
          disabled={busy || loading}
          onClick={startGoogle}
          className="w-full inline-flex items-center justify-center gap-3 rounded-full bg-white text-neutral-800 font-medium py-3.5 px-4 hover:bg-white/90 transition-colors disabled:opacity-60"
        >
          <GoogleGlyph />
          {busy ? "Signing in…" : "Continue with Google"}
        </button>

        {banner ? (
          <div className="mt-4 space-y-2">
            <p className="text-red-400 text-sm" data-testid="login-err">{banner}</p>
            {banner === ERROR_MESSAGES.admin ? (
              <Link to={ADMIN_LOGIN_PATH} className="text-sm text-brand-light hover:text-brand-accent transition-colors">
                Continue to admin sign in
              </Link>
            ) : null}
          </div>
        ) : null}

        <p className="text-center text-xs text-white/45 mt-8 leading-relaxed">
          By continuing, you agree to our{" "}
          <Link to="/terms" className="text-brand-light hover:text-brand-accent transition-colors">
            Terms
          </Link>
          {" "}&{" "}
          <Link to="/privacy" className="text-brand-light hover:text-brand-accent transition-colors">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
