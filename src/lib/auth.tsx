"use client";

import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, ApiError, refreshAccessToken, setAccessToken, setSessionLostHandler } from "./api";
import type { Person, Role } from "./types";

type AuthState = {
  user: Person | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    setSessionLostHandler(clearSession);

    (async () => {
      try {
        if (await refreshAccessToken()) setUser(await api<Person>("/user/me"));
      } catch {
        clearSession();
      } finally {
        setLoading(false);
      }
    })();
  }, [clearSession]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch("/api/session/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new ApiError(payload?.message ?? "Could not sign in.", response.status);

    setAccessToken(payload.accessToken);
    setUser(await api<Person>("/user/me"));
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/session/logout", { method: "POST" }).catch(() => {});
    clearSession();
  }, [clearSession]);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

/** Mirrors the API's rules so the UI only offers what will actually work. */
export const can = {
  manageAccounts: (role?: Role) => role === "SUPER_ADMIN" || role === "ADMIN",
  createRole: (viewer: Role | undefined, target: Role) => {
    if (viewer === "SUPER_ADMIN") return target !== "SUPER_ADMIN";
    if (viewer === "ADMIN") return target === "MANAGER" || target === "EMPLOYEE" || target === "DISTRIBUTOR";
    return viewer === "MANAGER" && target === "EMPLOYEE";
  },
  editPerson: (viewer: Role | undefined, target: Role) => {
    if (viewer === "SUPER_ADMIN") return true;
    return viewer === "ADMIN" && (target === "MANAGER" || target === "EMPLOYEE" || target === "DISTRIBUTOR");
  },
};
