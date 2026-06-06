import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
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
