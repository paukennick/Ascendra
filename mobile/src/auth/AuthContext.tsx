import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { secureStorage } from "@/lib/secureStorage";
import { api, ApiError, registerAuthHooks } from "@/api/client";
import type { AuthUser } from "@/types";

const REFRESH_TOKEN_KEY = "ascendra_refresh_token";

export type AuthStatus = "loading" | "signedOut" | "signedIn";

export interface LoginResult {
  emailVerificationRequired?: boolean;
}

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  // Access token lives only in memory (this ref), never persisted — only the
  // opaque refresh token is written to SecureStore.
  const accessTokenRef = useRef<string | null>(null);
  const inFlightRefresh = useRef<Promise<boolean> | null>(null);

  const clearAuth = useCallback(async () => {
    accessTokenRef.current = null;
    setUser(null);
    setStatus("signedOut");
    await secureStorage.deleteItem(REFRESH_TOKEN_KEY).catch(() => undefined);
  }, []);

  // Dedupes concurrent refresh attempts (e.g. several screens' requests all
  // 401 at once) into a single in-flight call.
  const refresh = useCallback(async (): Promise<boolean> => {
    if (inFlightRefresh.current) return inFlightRefresh.current;
    const attempt = (async () => {
      const storedRefreshToken = await secureStorage.getItem(REFRESH_TOKEN_KEY);
      if (!storedRefreshToken) {
        await clearAuth();
        return false;
      }
      try {
        const res = await api.post<{ accessToken: string; refreshToken: string }>("/api/auth/refresh", {
          refreshToken: storedRefreshToken,
        });
        accessTokenRef.current = res.accessToken;
        await secureStorage.setItem(REFRESH_TOKEN_KEY, res.refreshToken);
        return true;
      } catch {
        await clearAuth();
        return false;
      }
    })();
    inFlightRefresh.current = attempt;
    try {
      return await attempt;
    } finally {
      inFlightRefresh.current = null;
    }
  }, [clearAuth]);

  useEffect(() => {
    registerAuthHooks({
      getAccessToken: () => accessTokenRef.current,
      refresh,
      onAuthExpired: () => {
        clearAuth();
      },
    });
  }, [refresh, clearAuth]);

  // Cold-start: try to resolve an existing session before rendering the app.
  useEffect(() => {
    (async () => {
      const refreshed = await refresh();
      if (!refreshed) return;
      try {
        const res = await api.get<{ user: AuthUser }>("/api/auth/me");
        setUser(res.user);
        setStatus("signedIn");
      } catch {
        await clearAuth();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    try {
      const res = await api.post<{ accessToken: string; refreshToken: string; user: AuthUser }>(
        "/api/auth/login",
        { email, password }
      );
      accessTokenRef.current = res.accessToken;
      await secureStorage.setItem(REFRESH_TOKEN_KEY, res.refreshToken);
      setUser(res.user);
      setStatus("signedIn");
      return {};
    } catch (err) {
      if (err instanceof ApiError && err.status === 403 && (err.data as { emailVerificationRequired?: boolean })?.emailVerificationRequired) {
        return { emailVerificationRequired: true };
      }
      throw err;
    }
  }, []);

  const register = useCallback(async (email: string, password: string, displayName?: string) => {
    await api.post("/api/auth/register", { email, password, displayName });
  }, []);

  const logout = useCallback(async () => {
    const storedRefreshToken = await secureStorage.getItem(REFRESH_TOKEN_KEY);
    if (storedRefreshToken) {
      await api.post("/api/auth/logout", { refreshToken: storedRefreshToken }).catch(() => undefined);
    }
    await clearAuth();
  }, [clearAuth]);

  const logoutAll = useCallback(async () => {
    await api.post("/api/auth/logout-all").catch(() => undefined);
    await clearAuth();
  }, [clearAuth]);

  return (
    <AuthContext.Provider value={{ status, user, login, register, logout, logoutAll }}>
      {children}
    </AuthContext.Provider>
  );
}
