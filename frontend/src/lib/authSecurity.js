/** Bot/spam protection payload for auth API requests. */
export function buildAuthSecurityPayload(formLoadedAt, honeypot = "") {
  return {
    _formLoadedAt: formLoadedAt,
    _honeypot: honeypot,
  };
}

/** Props for a hidden honeypot field — bots often fill visible-looking traps. */
export function honeypotFieldProps(value, onChange) {
  return {
    type: "text",
    tabIndex: -1,
    autoComplete: "off",
    "aria-hidden": true,
    value,
    onChange,
    // Obscure name — "website" triggers browser/password-manager autofill and false bot blocks.
    name: "company_fax",
    readOnly: true,
    onFocus: (e) => {
      e.target.readOnly = false;
    },
    "data-lpignore": "true",
    "data-1p-ignore": true,
    "data-bwignore": "",
    "data-form-type": "other",
  };
}

export const HONEYPOT_CLASS =
  "absolute left-[-9999px] w-px h-px overflow-hidden opacity-0 pointer-events-none";
