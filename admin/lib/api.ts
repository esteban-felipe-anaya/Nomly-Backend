import axios, { AxiosError } from "axios";
import { clearSession, getToken } from "./auth";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

/**
 * Resolves a stored image value for display. Absolute URLs (e.g. Unsplash) pass
 * through; server-relative media paths ("/media/...") are prefixed with the API
 * base URL. Anything else (or empty) is returned as-is.
 */
export function mediaUrl(path?: string | null): string {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("/")) return `${API_BASE_URL}${path}`;
  return path;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      clearSession();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

/**
 * Uploads a single file via multipart/form-data to /admin-api/upload and returns
 * the absolute media URL. The shared instance defaults to JSON, so we explicitly
 * send FormData and let the browser set the multipart boundary. The Bearer
 * interceptor still applies.
 */
export async function uploadImage(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<{ url: string }>("/admin-api/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    },
  });
  return data.url;
}

/** Updates the logged-in user's own profile (PATCH /auth/me) and returns the user. */
export async function updateProfile(payload: {
  name?: string;
  phone?: string;
  avatar?: string;
  password?: string;
}): Promise<import("./types").AuthUser> {
  const { data } = await api.patch<{ user: import("./types").AuthUser }>(
    "/auth/me",
    payload,
  );
  return data.user;
}

export function apiErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { detail?: string; [k: string]: unknown }
      | undefined;
    if (data?.detail) return data.detail;
    if (data && typeof data === "object") {
      const first = Object.entries(data)[0];
      if (first) {
        const [field, val] = first;
        const msg = Array.isArray(val) ? val.join(", ") : String(val);
        return `${field}: ${msg}`;
      }
    }
    return error.message || fallback;
  }
  return fallback;
}
