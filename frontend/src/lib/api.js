import axios from "axios";

function normalizeBackendUrl(raw) {
  const url = (raw || "http://localhost:8000").trim().replace(/\/$/, "");
  if (/^https?:\/\//i.test(url)) return url;
  const host = url.split(/[/?#]/)[0];
  if (
    host === "localhost" ||
    host.startsWith("127.0.0.1") ||
    /^192\.168\./.test(host) ||
    /^10\./.test(host)
  ) {
    return `http://${url}`;
  }
  return `https://${url}`;
}

function resolveRuntimeBackendUrl() {
  const envUrl = normalizeBackendUrl(
    import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL
  );
  if (typeof window === "undefined") return envUrl;
  // In dev, call /api on this page (Vite proxies it to port 8000).
  // A direct call to localhost:8000 fails when the browser picks IPv6.
  if (import.meta.env.DEV) {
    return window.location.origin.replace(/\/$/, "");
  }
  return envUrl;
}

export const BACKEND_URL = resolveRuntimeBackendUrl();
export const API_BASE = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// Attach token from localStorage if present (fallback for environments where cookies cross-origin fail)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("form_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const apiUrl = (path) => `${API_BASE}${path}`;

/** Turn stored upload paths into loadable image URLs in dev and prod. */
export function resolveMediaUrl(url) {
  if (!url) return null;
  if (url.startsWith("data:")) return url;

  const backend = BACKEND_URL || "http://localhost:8000";

  // Stored URLs may wrongly use the frontend host (e.g. PUBLIC_BASE_URL=http://localhost:3000).
  const uploadsMatch = url.match(/\/api\/(uploads\/.+)$/);
  if (uploadsMatch) {
    return `${backend}/api/${uploadsMatch[1]}`;
  }

  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("uploads/")) return `${backend}/api/${url}`;
  return url.startsWith("/") ? `${backend}${url}` : `${backend}/${url}`;
}
