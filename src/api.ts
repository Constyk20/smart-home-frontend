import axios from "axios";

/**
 * Where the backend lives. Set API_URL (for example https://my-app.onrender.com)
 * in `.env` or in your hosting settings; it falls back to the local server.
 */
const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
const RAW_ORIGIN: string = env?.API_URL || "https://smart-home-backend-e9zs.onrender.com";
export const API_ORIGIN = RAW_ORIGIN.replace(/\/+$/, "");
export const WS_ORIGIN = API_ORIGIN.replace(/^http/, "ws");

export const api = axios.create({
  baseURL: `${API_ORIGIN}/api/v1`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export type House = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

/** The server's own explanation (FastAPI "detail") when it gave one, otherwise the fallback. */
export function errorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
  }
  return fallback;
}

/**
 * A plain-English reason for a failed sign-in or registration request.
 * `fallbacks` are the messages used when the server answers with a specific status.
 */
export function authErrorMessage(
  error: unknown,
  fallbacks: { rejected: string; invalid?: string; conflict?: string },
): string {
  if (!axios.isAxiosError(error)) return "Something unexpected went wrong. Please try again.";

  if (!error.response) {
    return error.code === "ECONNABORTED"
      ? "The server took too long to respond. It may still be starting up, so wait a few seconds and try again."
      : "Cannot reach the server. Check your internet connection, or wait a moment if the server is starting up.";
  }

  const status = error.response.status;
  const detail = error.response.data?.detail;

  if (status >= 500) return "The server ran into a problem. Please try again in a moment.";
  if (status === 429) return "Too many attempts. Please wait a minute and try again.";
  if (status === 409 && fallbacks.conflict) return fallbacks.conflict;
  if (status === 422) {
    // FastAPI validation errors come back as a list of { msg }.
    if (Array.isArray(detail) && typeof detail[0]?.msg === "string") return detail[0].msg;
    return fallbacks.invalid ?? fallbacks.rejected;
  }
  if (typeof detail === "string" && status !== 401) return detail;
  return fallbacks.rejected;
}
