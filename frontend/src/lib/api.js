import axios from "axios";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  (import.meta.env.PROD
    ? "https://servesmile-jobs-qrtable.ys7gan.easypanel.host"
    : "http://localhost:4000");

export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

// Attach token from localStorage as fallback (cookie is primary)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("qrt_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function formatError(err) {
  const detail = err?.response?.data?.detail;
  const message = err?.response?.data?.message;
  const errors = err?.response?.data?.errors;
  if (typeof message === "string" && message.trim()) return message;
  if (Array.isArray(errors) && errors.length) {
    return errors.map((e) => e?.msg || e?.message || JSON.stringify(e)).join(" ");
  }
  if (!detail) return err?.message || "Something went wrong";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).join(" ");
  return String(detail);
}

export function wsUrl(path) {
  const url = new URL(BACKEND_URL);
  const protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${url.host}${path}`;
}
