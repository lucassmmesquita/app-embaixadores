/**
 * ═══════════════════════════════════════════════════════════════
 *  Auth Context — Manages admin authentication state
 *  Provides login, logout, and current admin user info.
 * ═══════════════════════════════════════════════════════════════
 */

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, clearTokens, setTokens } from "@/lib/api";

// ═══ TYPES ═══

interface Permission {
  id: string;
  resource: string;
  action: string;
  granted: boolean;
}

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url: string | null;
  permissions: Permission[];
  is_super_admin: boolean;
}

interface AuthContextType {
  admin: AdminUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (resource: string, action: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ═══ PROVIDER ═══

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check auth on mount
  useEffect(() => {
    const token = localStorage.getItem("admin_access_token");
    if (token) {
      fetchMe();
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchMe = async () => {
    try {
      const data = await api.get<AdminUser>("/api/v1/admin-auth/me");
      setAdmin(data);
    } catch {
      clearTokens();
      setAdmin(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await api.post<{
      access_token: string;
      refresh_token: string;
      expires_in: number;
    }>("/api/v1/admin-auth/login", { email, password });

    setTokens(tokens);
    await fetchMe();
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/api/v1/admin-auth/logout");
    } catch {
      // Ignore errors on logout
    }
    clearTokens();
    setAdmin(null);
  }, []);

  const hasPermission = useCallback(
    (resource: string, action: string): boolean => {
      if (!admin) return false;
      if (admin.is_super_admin) return true;
      return admin.permissions.some(
        (p) => p.resource === resource && p.action === action && p.granted
      );
    },
    [admin]
  );

  return (
    <AuthContext.Provider
      value={{
        admin,
        isLoading,
        isAuthenticated: !!admin,
        login,
        logout,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ═══ HOOK ═══

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
