import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { secureStorage } from "@/lib/secureStorage";
import { isBiometricAvailable, confirmBiometric, getBiometricLabel } from "@/lib/biometric";
import { api, ApiError, registerAuthHooks } from "@/api/client";
import type { AuthUser } from "@/types";

const REFRESH_TOKEN_KEY = "ascendra_refresh_token";
// A distinct key, not just a flag on the same one -- when biometric unlock is
// on, the refresh token lives ONLY here (write-protected by the OS itself via
// requireAuthentication), and REFRESH_TOKEN_KEY is deleted, so there is no
// plain copy anywhere that would make the gate skippable.
const REFRESH_TOKEN_SECURE_KEY = "ascendra_refresh_token_secure";
const BIOMETRIC_ENABLED_KEY = "ascendra_biometric_enabled";

// "locked" = a biometric-gated session exists on this device but hasn't been
// unlocked yet this app launch.
export type AuthStatus = "loading" | "signedOut" | "locked" | "signedIn";

export interface LoginResult {
  emailVerificationRequired?: boolean;
  mfaRequired?: boolean;
  challengeToken?: string;
}

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  completeMfaLogin: (challengeToken: string, code: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<LoginResult>;
  refreshUser: () => Promise<void>;
  // Biometric session unlock -- see src/lib/biometric.ts for what this is
  // (and isn't: Ascendra never receives raw biometric data, only a pass/fail
  // result from the OS).
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  biometricLabel: string;
  enableBiometric: () => Promise<{ ok: boolean; error?: string }>;
  disableBiometric: () => Promise<void>;
  unlockWithBiometric: () => Promise<boolean>;
  useFallbackSignIn: () => Promise<void>;
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
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState("Biometric unlock");

  // Access token lives only in memory, never persisted. The refresh token is
  // cached in memory too once known for this app launch, so a biometric
  // unlock (or a normal login) only has to touch SecureStore once per
  // launch -- routine silent 401-retries during active use reuse this ref
  // instead of re-triggering a biometric prompt every ~15 minutes.
  const accessTokenRef = useRef<string | null>(null);
  const refreshTokenRef = useRef<string | null>(null);
  const biometricEnabledRef = useRef(false);
  const inFlightRefresh = useRef<Promise<boolean> | null>(null);

  useEffect(() => {
    isBiometricAvailable().then(setBiometricAvailable);
    getBiometricLabel().then(setBiometricLabel);
  }, []);

  const clearAuth = useCallback(async () => {
    accessTokenRef.current = null;
    refreshTokenRef.current = null;
    setUser(null);
    setStatus("signedOut");
    await secureStorage.deleteItem(REFRESH_TOKEN_KEY).catch(() => undefined);
  }, []);

  // Full sign-out: also drops biometric enrollment on this device. Simpler
  // and safer than trying to decide when a stale enrollment is still valid
  // (e.g. a different account signing in on a shared device next).
  const clearBiometricEnrollment = useCallback(async () => {
    biometricEnabledRef.current = false;
    setBiometricEnabled(false);
    await secureStorage.deleteItem(REFRESH_TOKEN_SECURE_KEY).catch(() => undefined);
    await secureStorage.deleteItem(BIOMETRIC_ENABLED_KEY).catch(() => undefined);
  }, []);

  // Dedupes concurrent refresh attempts (e.g. several screens' requests all
  // 401 at once) into a single in-flight call. Never touches the
  // biometric-gated key -- that's only ever read by unlockWithBiometric,
  // once per app launch.
  const refresh = useCallback(async (): Promise<boolean> => {
    if (inFlightRefresh.current) return inFlightRefresh.current;
    const attempt = (async () => {
      const storedRefreshToken = refreshTokenRef.current ?? (await secureStorage.getItem(REFRESH_TOKEN_KEY));
      if (!storedRefreshToken) {
        await clearAuth();
        return false;
      }
      try {
        const res = await api.post<{ accessToken: string; refreshToken: string }>("/api/auth/refresh", {
          refreshToken: storedRefreshToken,
        });
        accessTokenRef.current = res.accessToken;
        refreshTokenRef.current = res.refreshToken;
        if (biometricEnabledRef.current) {
          await secureStorage.setItem(REFRESH_TOKEN_SECURE_KEY, res.refreshToken, {
            requireAuthentication: true,
            authenticationPrompt: "Unlock Ascendra",
          });
        } else {
          await secureStorage.setItem(REFRESH_TOKEN_KEY, res.refreshToken);
        }
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

  // Cold-start: resolve an existing session before rendering the app. If
  // biometric unlock is on, stop at "locked" instead of silently resuming --
  // the whole point is that opening the app requires the OS prompt first.
  useEffect(() => {
    (async () => {
      const biometricOn = (await secureStorage.getItem(BIOMETRIC_ENABLED_KEY)) === "1";
      biometricEnabledRef.current = biometricOn;
      setBiometricEnabled(biometricOn);
      if (biometricOn) {
        setStatus("locked");
        return;
      }
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

  // Shared by login, Google sign-in, and the MFA challenge -- all three end
  // the same way once a real session comes back from the backend.
  const applySession = useCallback(async (res: { accessToken: string; refreshToken: string; user: AuthUser }) => {
    accessTokenRef.current = res.accessToken;
    refreshTokenRef.current = res.refreshToken;
    await secureStorage.setItem(REFRESH_TOKEN_KEY, res.refreshToken);
    setUser(res.user);
    setStatus("signedIn");
    // The login/register/MFA responses only carry the minimal user shape;
    // fetch the full profile (avatar, etc.) once now rather than teaching
    // every auth endpoint to return it.
    try {
      const full = await api.get<{ user: AuthUser }>("/api/auth/me");
      setUser(full.user);
    } catch {
      // Non-fatal -- the minimal user object from the auth response still works.
    }
  }, []);

  type LoginResponse =
    | { accessToken: string; refreshToken: string; user: AuthUser; mfaRequired?: undefined }
    | { mfaRequired: true; challengeToken: string };

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    try {
      const res = await api.post<LoginResponse>("/api/auth/login", { email, password });
      if (res.mfaRequired) {
        return { mfaRequired: true, challengeToken: res.challengeToken };
      }
      await applySession(res);
      return {};
    } catch (err) {
      if (err instanceof ApiError && err.status === 403 && (err.data as { emailVerificationRequired?: boolean })?.emailVerificationRequired) {
        return { emailVerificationRequired: true };
      }
      throw err;
    }
  }, [applySession]);

  const completeMfaLogin = useCallback(async (challengeToken: string, code: string) => {
    const res = await api.post<{ accessToken: string; refreshToken: string; user: AuthUser }>(
      "/api/auth/mfa/verify",
      { challengeToken, code }
    );
    await applySession(res);
  }, [applySession]);

  const loginWithGoogle = useCallback(async (idToken: string): Promise<LoginResult> => {
    const res = await api.post<LoginResponse>("/api/auth/oauth/google", { idToken });
    if (res.mfaRequired) {
      return { mfaRequired: true, challengeToken: res.challengeToken };
    }
    await applySession(res);
    return {};
  }, [applySession]);

  const refreshUser = useCallback(async () => {
    const res = await api.get<{ user: AuthUser }>("/api/auth/me");
    setUser(res.user);
  }, []);

  const register = useCallback(async (email: string, password: string, displayName?: string) => {
    await api.post("/api/auth/register", { email, password, displayName });
  }, []);

  const logout = useCallback(async () => {
    const storedRefreshToken = refreshTokenRef.current ?? (await secureStorage.getItem(REFRESH_TOKEN_KEY));
    if (storedRefreshToken) {
      await api.post("/api/auth/logout", { refreshToken: storedRefreshToken }).catch(() => undefined);
    }
    await clearBiometricEnrollment();
    await clearAuth();
  }, [clearAuth, clearBiometricEnrollment]);

  const logoutAll = useCallback(async () => {
    await api.post("/api/auth/logout-all").catch(() => undefined);
    await clearBiometricEnrollment();
    await clearAuth();
  }, [clearAuth, clearBiometricEnrollment]);

  // Enrollment: confirm the device can actually authenticate *before*
  // Ascendra starts relying on it, then move the refresh token to the
  // OS-protected key and delete the plain copy.
  const enableBiometric = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    const available = await isBiometricAvailable();
    if (!available) return { ok: false, error: "No biometric method is set up on this device." };
    if (!refreshTokenRef.current) return { ok: false, error: "Sign in again before enabling this." };

    const confirmed = await confirmBiometric("Confirm to enable biometric sign-in for Ascendra");
    if (!confirmed) return { ok: false, error: "Could not confirm biometrics." };

    await secureStorage.setItem(REFRESH_TOKEN_SECURE_KEY, refreshTokenRef.current, {
      requireAuthentication: true,
      authenticationPrompt: "Unlock Ascendra",
    });
    await secureStorage.deleteItem(REFRESH_TOKEN_KEY);
    await secureStorage.setItem(BIOMETRIC_ENABLED_KEY, "1");
    biometricEnabledRef.current = true;
    setBiometricEnabled(true);
    return { ok: true };
  }, []);

  // Disable: the current refresh token is already in memory (the user is
  // signed in to reach this setting), so this just moves it back to the
  // plain key -- no extra biometric prompt needed to turn the feature off.
  const disableBiometric = useCallback(async () => {
    if (refreshTokenRef.current) {
      await secureStorage.setItem(REFRESH_TOKEN_KEY, refreshTokenRef.current);
    }
    await secureStorage.deleteItem(REFRESH_TOKEN_SECURE_KEY);
    await secureStorage.deleteItem(BIOMETRIC_ENABLED_KEY);
    biometricEnabledRef.current = false;
    setBiometricEnabled(false);
  }, []);

  // The one place the OS biometric/passcode prompt actually happens for
  // returning users -- reading this key is what SecureStore gates.
  const unlockWithBiometric = useCallback(async (): Promise<boolean> => {
    try {
      const token = await secureStorage.getItem(REFRESH_TOKEN_SECURE_KEY, {
        requireAuthentication: true,
        authenticationPrompt: "Unlock Ascendra",
      });
      if (!token) {
        await clearBiometricEnrollment();
        await clearAuth();
        return false;
      }
      refreshTokenRef.current = token;
      const res = await api.post<{ accessToken: string; refreshToken: string }>("/api/auth/refresh", {
        refreshToken: token,
      });
      accessTokenRef.current = res.accessToken;
      refreshTokenRef.current = res.refreshToken;
      await secureStorage.setItem(REFRESH_TOKEN_SECURE_KEY, res.refreshToken, {
        requireAuthentication: true,
        authenticationPrompt: "Unlock Ascendra",
      });
      const me = await api.get<{ user: AuthUser }>("/api/auth/me");
      setUser(me.user);
      setStatus("signedIn");
      return true;
    } catch {
      // Wrong/cancelled/unavailable -- stay on the lock screen so the user
      // can retry or fall back, never trapped and never silently signed in.
      return false;
    }
  }, [clearAuth, clearBiometricEnrollment]);

  // "Use password instead" from the lock screen: drop the biometric
  // enrollment and go to the normal sign-in flow. Doesn't touch the account
  // itself -- just this device's local shortcut to it.
  const useFallbackSignIn = useCallback(async () => {
    await clearBiometricEnrollment();
    await clearAuth();
  }, [clearAuth, clearBiometricEnrollment]);

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        login,
        register,
        logout,
        logoutAll,
        completeMfaLogin,
        loginWithGoogle,
        refreshUser,
        biometricAvailable,
        biometricEnabled,
        biometricLabel,
        enableBiometric,
        disableBiometric,
        unlockWithBiometric,
        useFallbackSignIn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
