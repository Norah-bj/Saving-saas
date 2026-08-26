import { useAuthStore } from "@/lib/store/auth-store";
import type { AuthResponse } from "@/lib/store/auth-store";

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8080/api/v1";

/** Mirrors the backend's common.PageResponse<T> — shared by every paginated list endpoint. */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export class ApiError extends Error {
  status: number;
  error: string;
  details?: Record<string, string> | null;

  constructor(status: number, error: string, message: string, details?: Record<string, string> | null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.error = error;
    this.details = details;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, setTokens, logout } = useAuthStore.getState();
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      logout();
      return null;
    }
    const data = (await res.json()) as AuthResponse;
    setTokens(data);
    return data.accessToken;
  } catch {
    logout();
    return null;
  }
}

async function request<T>(path: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
  const { accessToken } = useAuthStore.getState();
  const headers: Record<string, string> = { ...(options.headers as Record<string, string> | undefined) };
  let body: BodyInit | undefined;
  if (options.body instanceof FormData) {
    // Leave Content-Type unset — fetch fills in the multipart boundary
    // itself; setting it manually would drop the boundary parameter.
    body = options.body;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers, body });

  // /auth/* 401s are real "invalid credentials"/"session revoked" responses,
  // not an expired-access-token signal — retrying via refresh here would
  // mask a bad-login-attempt error behind a misleading "session expired".
  const isAuthEndpoint = path.startsWith("/auth/");
  if (res.status === 401 && !isRetry && !isAuthEndpoint) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }
    const newToken = await refreshPromise;
    if (newToken) {
      return request<T>(path, options, true);
    }
    throw new ApiError(401, "unauthorized", "Your session has expired. Please log in again.");
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const err = data as { error?: string; message?: string; details?: Record<string, string> } | undefined;
    throw new ApiError(res.status, err?.error ?? "error", err?.message ?? "Something went wrong.", err?.details);
  }

  return data as T;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),
};
