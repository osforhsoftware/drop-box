import { useRef, useState } from "react";
import { Link, useNavigate, Navigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../lib/auth";
import { buildAuthSecurityPayload, honeypotFieldProps, HONEYPOT_CLASS } from "../lib/authSecurity";
import { INDIAN_PHONE_LEN, PHONE_HINT, sanitizePhoneInput } from "../lib/phone";
import {
  collectErrors,
  hasErrors,
  validateEmail,
  validatePassword,
  validatePasswordConfirm,
  validatePhone,
  validateRequired,
} from "../lib/formValidation";
import { fieldInputClass, FieldError } from "../components/FormField";
import SiteLogo from "../components/SiteLogo";
import { REGISTER } from "../constants/testIds/auth";

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const formLoadedAt = useRef(Date.now());
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

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
      name: validateRequired(name, "Name"),
      email: validateEmail(email),
      phone: validatePhone(phone),
      password: validatePassword(password),
      confirm: validatePasswordConfirm(password, confirm),
    });
    setFieldErrors(errors);
    if (hasErrors(errors)) {
      toast.error("Please fix the errors below");
      return;
    }
    setBusy(true);
    try {
      await register(
        name,
        email,
        password,
        phone,
        buildAuthSecurityPayload(formLoadedAt.current, honeypot)
      );
      navigate(searchParams.get("next") || "/");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="register-page" className="min-h-[calc(100vh-4rem)] grid place-items-center px-6 py-12">
      <form onSubmit={submit} className="glass rounded-2xl p-10 w-full max-w-md relative">
        <div className={HONEYPOT_CLASS} aria-hidden="true">
          <label htmlFor="register-honeypot">Leave blank</label>
          <input id="register-honeypot" {...honeypotFieldProps(honeypot, (e) => setHoneypot(e.target.value))} />
        </div>
        <div className="mb-2">
          <SiteLogo className="h-10" />
        </div>
        <p className="text-white/50 text-sm mb-8">Create an account to get started.</p>

        <div className="label-eyebrow mb-2">Name</div>
        <input
          data-testid={REGISTER.nameInput}
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => { setName(e.target.value); clearError("name"); }}
          className={`${fieldInputClass(fieldErrors.name)} mb-1`}
        />
        <FieldError error={fieldErrors.name} />
        <div className="mb-4" />

        <div className="label-eyebrow mb-2">Email</div>
        <input
          data-testid={REGISTER.emailInput}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); clearError("email"); }}
          className={`${fieldInputClass(fieldErrors.email)} mb-1`}
        />
        <FieldError error={fieldErrors.email} />
        <div className="mb-4" />

        <div className="label-eyebrow mb-2">Phone number</div>
        <input
          data-testid={REGISTER.phoneInput}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={INDIAN_PHONE_LEN}
          value={phone}
          onChange={(e) => { setPhone(sanitizePhoneInput(e.target.value)); clearError("phone"); }}
          className={`${fieldInputClass(fieldErrors.phone)} mb-1`}
        />
        {fieldErrors.phone ? (
          <FieldError error={fieldErrors.phone} />
        ) : (
          <p className="text-white/40 text-xs mt-1">{PHONE_HINT}</p>
        )}
        <div className="mb-4" />

        <div className="label-eyebrow mb-2">Password</div>
        <input
          data-testid={REGISTER.passwordInput}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); clearError("password"); }}
          className={`${fieldInputClass(fieldErrors.password)} mb-1`}
        />
        <FieldError error={fieldErrors.password} />
        <div className="mb-4" />

        <div className="label-eyebrow mb-2">Confirm password</div>
        <input
          data-testid={REGISTER.passwordConfirmInput}
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => { setConfirm(e.target.value); clearError("confirm"); }}
          className={`${fieldInputClass(fieldErrors.confirm)} mb-1`}
        />
        <FieldError error={fieldErrors.confirm} />
        <div className="mb-6" />

        <button
          data-testid={REGISTER.submitButton}
          type="submit"
          disabled={busy}
          className="btn-primary w-full"
        >
          {busy ? "Creating account…" : "Sign up"}
        </button>
        <p className="text-center text-sm text-white/50 mt-6">
          Already have an account?{" "}
          <Link
            data-testid={REGISTER.loginLink}
            to={searchParams.get("next") ? `/login?next=${encodeURIComponent(searchParams.get("next"))}` : "/login"}
            className="text-brand-light hover:text-brand-accent transition-colors"
          >
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
