/**
 * ═══════════════════════════════════════════════════════════════
 *  API Client — Fetch wrapper with JWT auto-refresh
 *  All admin panel API calls go through this module.
 * ═══════════════════════════════════════════════════════════════
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

// ═══ TOKEN STORAGE ═══

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_access_token");
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_refresh_token");
}

export function setTokens(tokens: TokenPair): void {
  localStorage.setItem("admin_access_token", tokens.access_token);
  localStorage.setItem("admin_refresh_token", tokens.refresh_token);
  // Store expiry time for proactive refresh
  const expiresAt = Date.now() + tokens.expires_in * 1000;
  localStorage.setItem("admin_token_expires_at", expiresAt.toString());
}

export function clearTokens(): void {
  localStorage.removeItem("admin_access_token");
  localStorage.removeItem("admin_refresh_token");
  localStorage.removeItem("admin_token_expires_at");
}

function isTokenExpiringSoon(): boolean {
  const expiresAt = localStorage.getItem("admin_token_expires_at");
  if (!expiresAt) return true;
  // Refresh 60 seconds before expiry
  return Date.now() > parseInt(expiresAt) - 60_000;
}

// ═══ TOKEN REFRESH ═══

let refreshPromise: Promise<void> | null = null;

async function refreshAccessToken(): Promise<void> {
  // Avoid concurrent refreshes
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearTokens();
      throw new Error("No refresh token");
    }

    const res = await fetch(`${API_BASE}/api/v1/admin-auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
      clearTokens();
      throw new Error("Token refresh failed");
    }

    const tokens: TokenPair = await res.json();
    setTokens(tokens);
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

// ═══ API FETCH ═══

export interface ApiError {
  status: number;
  detail: string;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  // Proactively refresh if token is expiring soon
  if (getAccessToken() && isTokenExpiringSoon()) {
    try {
      await refreshAccessToken();
    } catch {
      // If refresh fails, continue with existing token
    }
  }

  const token = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // Handle 401 — try refresh once (except on login/refresh endpoints)
  if (res.status === 401 && token && !path.includes("/admin-auth/login") && !path.includes("/admin-auth/refresh")) {
    try {
      await refreshAccessToken();
      const newToken = getAccessToken();
      if (newToken) {
        headers["Authorization"] = `Bearer ${newToken}`;
        const retryRes = await fetch(`${API_BASE}${path}`, {
          ...options,
          headers,
        });
        if (!retryRes.ok) {
          const error = await retryRes.json().catch(() => ({ detail: "Erro desconhecido" }));
          throw { status: retryRes.status, detail: error.detail || "Erro na requisição" } as ApiError;
        }
        return retryRes.json();
      }
    } catch {
      clearTokens();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw { status: 401, detail: "Sessão expirada" } as ApiError;
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Erro desconhecido" }));
    throw { status: res.status, detail: error.detail || "Erro na requisição" } as ApiError;
  }

  // Handle 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json();
}

// ═══ CONVENIENCE METHODS ═══

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),

  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string) =>
    apiFetch<T>(path, { method: "DELETE" }),
};
