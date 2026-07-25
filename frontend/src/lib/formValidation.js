import { INDIAN_PHONE_LEN } from "./phone";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRequired(value, label = "This field") {
  if (!String(value || "").trim()) return `${label} is required`;
  return null;
}

export function validateEmail(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "Email is required";
  if (!EMAIL_RE.test(trimmed)) return "Enter a valid email address";
  return null;
}

export function validatePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "Phone number is required";
  if (digits.length < INDIAN_PHONE_LEN) {
    return `Phone number must be exactly ${INDIAN_PHONE_LEN} digits`;
  }
  if (digits.length > INDIAN_PHONE_LEN) {
    return `Phone number must be exactly ${INDIAN_PHONE_LEN} digits`;
  }
  if (!/^[6-9]/.test(digits)) return "Enter a valid mobile number";
  return null;
}

export function validatePincode(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "Pincode is required";
  if (!/^\d{6}$/.test(digits)) return "Pincode must be 6 digits";
  return null;
}

export function validatePassword(value) {
  const pw = String(value || "");
  if (!pw) return "Password is required";
  if (pw.length < 8) return "Password must be at least 8 characters";
  if (pw.length > 128) return "Password must be at most 128 characters";
  return null;
}

export function validatePasswordConfirm(password, confirm) {
  if (!confirm) return "Please confirm your password";
  if (password !== confirm) return "Passwords do not match";
  return null;
}

export function collectErrors(fields) {
  const errors = {};
  for (const [key, message] of Object.entries(fields)) {
    if (message) errors[key] = message;
  }
  return errors;
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}
