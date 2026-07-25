import { useRef, useState } from "react";
import { Link, useNavigate, Navigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../lib/auth";
import { buildAuthSecurityPayload, honeypotFieldProps, HONEYPOT_CLASS } from "../lib/authSecurity";
import { collectErrors, hasErrors, validateEmail, validateRequired } from "../lib/formValidation";
import { fieldInputClass, FieldError } from "../components/FormField";
import SiteLogo from "../components/SiteLogo";
import { LOGIN } from "../constants/testIds/auth";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const formLoadedAt = useRef(Date.now());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);

  if (user) {
    const next = searchParams.get("next") || "/";
    return <Navigate to={next} replace />;
  }

  const clearError = (field) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const errors = collectErrors({
      email: validateEmail(email),
      password: validateRequired(password, "Password"),
    });
    setFieldErrors(errors);
    if (hasErrors(errors)) {
      toast.error("Please fix the errors below");
      return;
    }
    setBusy(true);
    try {
      await login(
        email,
        password,
        buildAuthSecurityPayload(formLoadedAt.current, honeypot)
      );
      navigate(searchParams.get("next") || "/");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="login-page" className="min-h-[calc(100vh-4rem)] grid place-items-center px-6 py-12">
      <form onSubmit={submit} className="glass rounded-2xl p-10 w-full max-w-md relative">
        <div className={HONEYPOT_CLASS} aria-hidden="true">
          <label htmlFor="login-honeypot">Leave blank</label>
          <input id="login-honeypot" {...honeypotFieldProps(honeypot, (e) => setHoneypot(e.target.value))} />
        </div>
        <div className="mb-2">
          <SiteLogo className="h-10" />
        </div>
        <p className="text-white/50 text-sm mb-8">
          {searchParams.get("next") === "/checkout"
            ? "Sign in to complete your order."
            : "Welcome back — sign in to your account."}
        </p>

        <div className="label-eyebrow mb-2">Email</div>
        <input
          data-testid={LOGIN.emailInput}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); clearError("email"); }}
          className={`${fieldInputClass(fieldErrors.email)} mb-1`}
        />
        <FieldError error={fieldErrors.email} testid="login-err-email" />
        <div className="mb-4" />

        <div className="label-eyebrow mb-2">Password</div>
        <input
          data-testid={LOGIN.passwordInput}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); clearError("password"); }}
          className={`${fieldInputClass(fieldErrors.password)} mb-1`}
        />
        <FieldError error={fieldErrors.password} testid="login-err-password" />
        <div className="mb-6" />

        <button
          data-testid={LOGIN.submitButton}
          type="submit"
          disabled={busy}
          className="btn-primary w-full"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="text-center text-sm text-white/50 mt-6">
          {searchParams.get("next") === "/checkout" ? (
            <>
              Create an account to get started.{" "}
              <Link
                data-testid={LOGIN.registerLink}
                to={`/register?next=${encodeURIComponent(searchParams.get("next"))}`}
                className="text-brand-light hover:text-brand-accent transition-colors"
              >
                Sign up
              </Link>
            </>
          ) : (
            <>
              Don&apos;t have an account?{" "}
              <Link
                data-testid={LOGIN.registerLink}
                to="/register"
                className="text-brand-light hover:text-brand-accent transition-colors"
              >
                Sign up
              </Link>
            </>
          )}
        </p>
      </form>
    </div>
  );
}
