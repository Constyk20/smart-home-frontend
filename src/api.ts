import axios from "axios";

export const api = axios.create({
  baseURL: " https://smart-home-backend-e9zs.onrender.com/api/v1",
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
