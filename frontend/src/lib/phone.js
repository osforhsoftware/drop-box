export const INDIAN_PHONE_LEN = 10;

export const PHONE_HINT = "10-digit mobile number (without country code)";

export function sanitizePhoneInput(value) {
  return String(value || "").replace(/\D/g, "").slice(0, INDIAN_PHONE_LEN);
}

export function isValidIndianPhone(phone) {
  return /^[6-9]\d{9}$/.test(String(phone || ""));
}
