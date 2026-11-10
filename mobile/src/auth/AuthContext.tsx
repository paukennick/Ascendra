import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { secureStorage } from "@/lib/secureStorage";
import { isBiometricAvailable, confirmBiometric, getBiometricLabel } from "@/lib/biometric";
import { backgroundHold, withBackgroundHold } from "@/lib/backgroundHold";
import {
  DEFAULT_LOCK_AFTER,
  LAST_SEEN_KEY,
  LOCK_AFTER_KEY,
  LOCKED_KEY,
  parseLockAfter,
  shouldLockOnColdStart,
  shouldLockOnReturn,
  shouldLockWhenIdle,
  unlockMethodFor,
  type LockAfter,
  type UnlockMethod,
} from "@/lib/autoLock";
import { localDataGuard, userLocalDataKeys } from "@/lib/localData";
import { api, ApiError, isReauthRefusal, registerAuthHooks } from "@/api/client";
import {
  BIOMETRIC_SESSION_KEY,
  launchStateFor,
  logoutCalls,
  planRefresh,
  refreshTokenToKeep,
  withRefreshLock,
} from "@/lib/sessionStore";
import { cancelStudyReminders } from "@/lib/reminderScheduler";
import { TERMS_VERSION } from "@/lib/legal";
import type { AuthUser } from "@/types";

// Removes one user's drafts, PBQ progress and lesson positions from the
// device (see src/lib/localData.ts). Draft writes for that user are blocked
// first, so a screen flushing on unmount can't put one back. The lesson
// screen writes its position straight to AsyncStorage, outside that guard,
// so a second sweep runs once the signed-in screens have unmounted. Best
// effort: storage errors never block the logout itself.
const LOCAL_DATA_RESWEEP_MS = 2000;
async function clearUserLocalData(userId: string): Promise<void> {
  localDataGuard.loggedOut(userId);
  // REQ-119: this user's study reminders stop on this phone with them.
  await cancelStudyReminders();
  const sweep = async () => {
    try {
      const mine = userLocalDataKeys(await AsyncStorage.getAllKeys(), userId);
      if (mine.length) await AsyncStorage.multiRemove(mine);
    } catch {
      // Leave it; the next logout sweeps again.
    }
  };
  await sweep();
  setTimeout(() => {
    if (localDataGuard.isLoggedOut(userId)) void sweep();
  }, LOCAL_DATA_RESWEEP_MS);
}

const REFRESH_TOKEN_KEY = "ascendra_refresh_token";
// A distinct key, not just a flag on the same one -- when biometric unlock is
// on, the refresh token lives ONLY here (write-protected by the OS itself via
// requireAuthentication), and REFRESH_TOKEN_KEY is deleted, so there is no
// plain copy anywhere that would make the gate skippable.
const REFRESH_TOKEN_SECURE_KEY = "ascendra_refresh_token_secure";
const BIOMETRIC_ENABLED_KEY = "ascendra_biometric_enabled";
// REQ-192: the web app keeps no refresh token (an httpOnly cookie holds it,
// src/lib/sessionStore.ts). REFRESH_TOKEN_KEY on web is only read to move
// a token left in sessionStorage by an earlier version into the cookie.
const IS_WEB = Platform.OS === "web";
const SEAL_OPTIONS = { requireAuthentication: true, authenticationPrompt: "Unlock Ascendra" };

// "locked" = a biometric-gated session exists on this device but hasn't been
// unlocked yet this app launch.
export type AuthStatus = "loading" | "signedOut" | "locked" | "signedIn";

export interface LoginResult {
  emailVerificationRequired?: boolean;
  mfaRequired?: boolean;
  challengeToken?: string;
  mfaMethods?: { totp: boolean; email: boolean };
}

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  // REQ-119: acceptedTermsVersion is sent only by a form whose "I agree" was ticked.
  register: (email: string, password: string, displayName?: string, acceptedTermsVersion?: string) => Promise<void>;
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
  // REQ-177: the lock after time away (src/lib/autoLock.ts). An overlay
  // over the signed-in screens, which stay mounted; `status` stays
  // "signedIn". ("locked" status is still the launch lock of a
  // biometric-enrolled device, which has nothing on screen to keep.)
  appLocked: boolean;
  unlockMethod: UnlockMethod;
  // Biometric: the OS prompt (device passcode as fallback). Password: the
  // password, a code, or a Google ID token (src/lib/reauth.ts reauthFields).
  unlockApp: (input?: { reauth?: string; googleIdToken?: string }) => Promise<{ ok: boolean; error?: string }>;
  lockAfter: LockAfter;
  setLockAfter: (setting: LockAfter) => Promise<void>;
  // Web only -- seconds until the 30-minute idle timeout signs the user out,
  // once inside its warning window; null the rest of the time. See the
  // idle-timeout effect below.
  webIdleWarningSecondsLeft: number | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

// REQ-192: true while the lock after time away covers the signed-in
// screens. A React Native Modal is its own native window and draws above any
// view, the lock overlay included, so every sheet hides while this is true
// (src/components/SheetModal.tsx). False outside the provider.
export function useLockCoversSheets(): boolean {
  const ctx = useContext(AuthContext);
  return !!ctx && ctx.status === "signedIn" && ctx.appLocked;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState("Biometric unlock");
  const [webIdleWarningSecondsLeft, setWebIdleWarningSecondsLeft] = useState<number | null>(null);
  const [appLocked, setAppLocked] = useState(false);
  const [lockAfter, setLockAfterState] = useState<LockAfter>(DEFAULT_LOCK_AFTER);
  const appLockedRef = useRef(false);
  const lockAfterRef = useRef<LockAfter>(DEFAULT_LOCK_AFTER);

  // Access token lives only in memory, never persisted. The refresh token is
  // cached in memory too once known for this app launch, so a biometric
  // unlock (or a normal login) only has to touch SecureStore once per
  // launch -- routine silent 401-retries during active use reuse this ref
  // instead of re-triggering a biometric prompt every ~15 minutes.
  const accessTokenRef = useRef<string | null>(null);
  const refreshTokenRef = useRef<string | null>(null);
  const biometricEnabledRef = useRef(false);
  const inFlightRefresh = useRef<Promise<boolean> | null>(null);
  const backgroundedAtRef = useRef<number | null>(null);
  // Web: last keyboard/mouse/touch input. A ref so unlocking can reset it.
  const webLastActivityRef = useRef(Date.now());
  // Read by logout, which must know whose local data to remove.
  const userRef = useRef<AuthUser | null>(null);
  userRef.current = user;
  useEffect(() => {
    if (user) localDataGuard.signedIn(user.id);
  }, [user]);

  useEffect(() => {
    // No .catch() here previously meant a thrown hasHardwareAsync/
    // isEnrolledAsync (e.g. missing USE_BIOMETRIC permission on Android)
    // failed completely silently -- biometricAvailable just stayed at its
    // false default forever, and the Settings toggle never appeared, with
    // nothing in the logs to explain why.
    isBiometricAvailable()
      .then(setBiometricAvailable)
      .catch((err) => console.warn("isBiometricAvailable failed:", err));
    getBiometricLabel()
      .then(setBiometricLabel)
      .catch((err) => console.warn("getBiometricLabel failed:", err));
  }, []);

  // REQ-177: the lock after time away. The last-seen time and an open lock
  // are kept on the device so a restart can't skip it (autoLock.ts).
  const persistLastSeen = useCallback((at: number = Date.now()) => {
    AsyncStorage.setItem(LAST_SEEN_KEY, String(at)).catch(() => undefined);
  }, []);
  const lockApp = useCallback(() => {
    if (appLockedRef.current) return;
    appLockedRef.current = true;
    setAppLocked(true);
    AsyncStorage.setItem(LOCKED_KEY, "1").catch(() => undefined);
  }, []);
  const releaseLock = useCallback(() => {
    appLockedRef.current = false;
    setAppLocked(false);
    webLastActivityRef.current = Date.now();
    AsyncStorage.removeItem(LOCKED_KEY).catch(() => undefined);
    persistLastSeen();
  }, [persistLastSeen]);

  useEffect(() => {
    AsyncStorage.getItem(LOCK_AFTER_KEY)
      .then((raw) => {
        const setting = parseLockAfter(raw);
        lockAfterRef.current = setting;
        setLockAfterState(setting);
      })
      .catch(() => undefined);
  }, []);

  const setLockAfter = useCallback(async (setting: LockAfter) => {
    lockAfterRef.current = setting;
    setLockAfterState(setting);
    await AsyncStorage.setItem(LOCK_AFTER_KEY, setting).catch(() => undefined);
  }, []);

  const clearAuth = useCallback(async () => {
    accessTokenRef.current = null;
    refreshTokenRef.current = null;
    appLockedRef.current = false;
    setAppLocked(false);
    setUser(null);
    setStatus("signedOut");
    await secureStorage.deleteItem(REFRESH_TOKEN_KEY).catch(() => undefined);
    await AsyncStorage.multiRemove([LOCKED_KEY, LAST_SEEN_KEY]).catch(() => undefined);
  }, []);

  // Drops biometric enrollment on this device -- for logoutAll (revoking
  // every session makes this device's local shortcut stale too) and for an
  // explicit "use password instead" (useFallbackSignIn). A plain logout no
  // longer calls this: see the comment on logout below.
  const clearBiometricEnrollment = useCallback(async () => {
    biometricEnabledRef.current = false;
    setBiometricEnabled(false);
    await secureStorage.deleteItem(REFRESH_TOKEN_SECURE_KEY).catch(() => undefined);
    await secureStorage.deleteItem(BIOMETRIC_ENABLED_KEY).catch(() => undefined);
    await secureStorage.deleteItem(BIOMETRIC_SESSION_KEY).catch(() => undefined);
  }, []);

  // Dedupes concurrent refresh attempts (e.g. several screens' requests all
  // 401 at once) into a single in-flight call. Never touches the
  // biometric-gated key -- that's only ever read by unlockWithBiometric,
  // once per app launch.
  const refresh = useCallback(async (): Promise<boolean> => {
    if (inFlightRefresh.current) return inFlightRefresh.current;
    const attempt = withRefreshLock(async () => {
      const storedRefreshToken =
        IS_WEB || !refreshTokenRef.current ? await secureStorage.getItem(REFRESH_TOKEN_KEY).catch(() => null) : null;
      const plan = planRefresh({ web: IS_WEB, memoryToken: refreshTokenRef.current, storedToken: storedRefreshToken });
      if (plan.kind === "none") {
        await clearAuth();
        return false;
      }
      // REQ-192: an old web tab's token leaves storage before it is sent, so
      // a failed exchange falls back to sign-in and is never tried again.
      if (plan.kind === "body" && plan.migratingLegacy) await secureStorage.deleteItem(REFRESH_TOKEN_KEY).catch(() => undefined);
      try {
        const res = await api.post<{ accessToken: string; refreshToken?: string }>(
          "/api/auth/refresh",
          plan.kind === "body" ? { refreshToken: plan.token } : undefined
        );
        accessTokenRef.current = res.accessToken;
        const keep = refreshTokenToKeep(IS_WEB, res);
        refreshTokenRef.current = keep;
        if (keep && biometricEnabledRef.current) {
          await secureStorage.setItem(REFRESH_TOKEN_SECURE_KEY, keep, SEAL_OPTIONS);
          await secureStorage.setItem(BIOMETRIC_SESSION_KEY, "1").catch(() => undefined);
        } else if (keep) {
          await secureStorage.setItem(REFRESH_TOKEN_KEY, keep);
        }
        return true;
      } catch {
        await clearAuth();
        return false;
      }
    }, IS_WEB ? undefined : null);
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
      // REQ-116: a fresh access token handed back after the server ended
      // every other session (password change, two-factor turned on).
      setAccessToken: (token) => {
        accessTokenRef.current = token;
      },
    });
  }, [refresh, clearAuth]);

  // Cold-start: resolve an existing session before rendering the app. If
  // biometric unlock is on, stop at "locked" instead of silently resuming --
  // the whole point is that opening the app requires the OS prompt first.
  //
  // Without biometrics, a cold start resumes the session via refresh(), the
  // same as web: a plain login is meant to survive a full app close, like a
  // "remember me" checkbox. (An earlier version treated every native cold
  // start as stale and revoked the token on sight, on the theory that a
  // swipe-away or OS kill skips the AppState "background" handler below and
  // so shouldn't count as an intentional close -- but that meant a plain
  // login never actually persisted on Android, which is the opposite of
  // what "remember me" is supposed to do. The background handler's own
  // intentional-close logout still runs first when it gets the chance, so
  // by the time a killed app reaches this effect again there is usually
  // nothing left in SecureStore for refresh() to find anyway.)
  useEffect(() => {
    (async () => {
      const biometricOn = (await secureStorage.getItem(BIOMETRIC_ENABLED_KEY)) === "1";
      biometricEnabledRef.current = biometricOn;
      setBiometricEnabled(biometricOn);
      // REQ-192: after a logout the preference stays on but no sealed
      // session is left, so the launch goes to sign-in, not the lock.
      const sessionFlag = biometricOn ? await secureStorage.getItem(BIOMETRIC_SESSION_KEY).catch(() => null) : null;
      if (launchStateFor(biometricOn, sessionFlag) === "locked") {
        setStatus("locked");
        return;
      }
      const refreshed = await refresh();
      if (!refreshed) return;
      try {
        const res = await api.get<{ user: AuthUser }>("/api/auth/me");
        // REQ-177: a resumed session (a restart, a reloaded tab) locks when
        // the learner was away long enough, or a lock was open.
        const [[, lastSeenAt], [, lockedFlag], [, setting]] = await AsyncStorage.multiGet([
          LAST_SEEN_KEY,
          LOCKED_KEY,
          LOCK_AFTER_KEY,
        ]).catch(() => [[LAST_SEEN_KEY, null], [LOCKED_KEY, null], [LOCK_AFTER_KEY, null]] as [string, string | null][]);
        if (shouldLockOnColdStart({ now: Date.now(), lastSeenAt, lockedFlag, setting: parseLockAfter(setting) })) lockApp();
        else persistLastSeen();
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
  const applySession = useCallback(async (res: { accessToken: string; refreshToken?: string; user: AuthUser }) => {
    accessTokenRef.current = res.accessToken;
    const keep = refreshTokenToKeep(IS_WEB, res);
    refreshTokenRef.current = keep;
    if (IS_WEB) {
      // REQ-192: the cookie holds it; drop any token an older version left.
      await secureStorage.deleteItem(REFRESH_TOKEN_KEY).catch(() => undefined);
    } else if (keep && biometricEnabledRef.current) {
      // Biometric unlock stayed on through the logout: seal the new session
      // so the next launch locks instead of losing it.
      // If sealing fails (a cancelled prompt), keep it like a plain sign-in;
      // the "0" flag sends the next launch through the plain token.
      try {
        await secureStorage.setItem(REFRESH_TOKEN_SECURE_KEY, keep, SEAL_OPTIONS);
        await secureStorage.setItem(BIOMETRIC_SESSION_KEY, "1");
        await secureStorage.deleteItem(REFRESH_TOKEN_KEY).catch(() => undefined);
      } catch {
        await secureStorage.setItem(REFRESH_TOKEN_KEY, keep);
        await secureStorage.setItem(BIOMETRIC_SESSION_KEY, "0").catch(() => undefined);
      }
    } else if (keep) {
      await secureStorage.setItem(REFRESH_TOKEN_KEY, keep);
    }
    // A sign-in just proved it's them.
    releaseLock();
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
  }, [releaseLock]);

  type LoginResponse =
    | { accessToken: string; refreshToken?: string; user: AuthUser; mfaRequired?: undefined }
    | { mfaRequired: true; challengeToken: string; mfaMethods: { totp: boolean; email: boolean } };

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    try {
      const res = await api.post<LoginResponse>("/api/auth/login", { email, password });
      if (res.mfaRequired) {
        return { mfaRequired: true, challengeToken: res.challengeToken, mfaMethods: res.mfaMethods };
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
    const res = await api.post<{ accessToken: string; refreshToken?: string; user: AuthUser }>(
      "/api/auth/mfa/verify",
      { challengeToken, code }
    );
    await applySession(res);
  }, [applySession]);

  const loginWithGoogle = useCallback(async (idToken: string): Promise<LoginResult> => {
    // REQ-119: the Google button sits above "By continuing you agree to the
    // Terms and Privacy Policy"; the server records it only for a new account.
    const res = await api.post<LoginResponse>("/api/auth/oauth/google", { idToken, acceptedTermsVersion: TERMS_VERSION });
    if (res.mfaRequired) {
      return { mfaRequired: true, challengeToken: res.challengeToken, mfaMethods: res.mfaMethods };
    }
    await applySession(res);
    return {};
  }, [applySession]);

  const refreshUser = useCallback(async () => {
    const res = await api.get<{ user: AuthUser }>("/api/auth/me");
    setUser(res.user);
  }, []);

  const register = useCallback(async (email: string, password: string, displayName?: string, acceptedTermsVersion?: string) => {
    await api.post("/api/auth/register", { email, password, displayName, acceptedTermsVersion });
  }, []);

  // A plain "Log out" ends this session but leaves the device's own
  // settings alone -- biometric unlock stays on, so logging back in doesn't
  // also mean re-enabling it. (Contrast logoutAll below, and
  // useFallbackSignIn, which are both an explicit choice to drop this
  // device's enrollment.)
  //
  // REQ-192: it always ends the session on the server too, on every
  // platform. Before, with biometric unlock on, the session was left live
  // for up to 30 days so the sealed copy of its token could unlock later.
  // Now the sealed copy is deleted with it and the "sealed session" flag set
  // to "0" (src/lib/sessionStore.ts), so the next launch goes to sign-in --
  // nothing replays a revoked token, which the server would read as theft.
  // Web ends the cookie session (DELETE /api/auth/refresh), which works
  // after the access token has expired (the 30-minute idle sign-out).
  //
  // endSession is that sign-out on its own, without removing the device's
  // drafts.
  const endSession = useCallback(async () => {
    const legacyWebToken = IS_WEB ? await secureStorage.getItem(REFRESH_TOKEN_KEY).catch(() => null) : null;
    const plainToken =
      !IS_WEB && !refreshTokenRef.current ? await secureStorage.getItem(REFRESH_TOKEN_KEY).catch(() => null) : null;
    const calls = logoutCalls({
      web: IS_WEB,
      refreshToken: IS_WEB ? null : refreshTokenRef.current ?? plainToken,
      legacyWebToken,
      hasAccessToken: !!accessTokenRef.current,
    });
    for (const call of calls) {
      await (call.method === "DELETE" ? api.delete(call.path) : api.post(call.path, "body" in call ? call.body : undefined)).catch(
        () => undefined
      );
    }
    if (!IS_WEB && biometricEnabledRef.current) {
      await secureStorage.deleteItem(REFRESH_TOKEN_SECURE_KEY).catch(() => undefined);
      await secureStorage.setItem(BIOMETRIC_SESSION_KEY, "0").catch(() => undefined);
    }
    await clearAuth();
  }, [clearAuth]);

  // An explicit "Log out" (and the web idle sign-out, meant for a browser
  // left unattended) also removes this user's drafts, PBQ progress and
  // lesson positions from the device. They are keyed per user, so another
  // account never saw them, but they sat in plain AsyncStorage/localStorage
  // after the owner had signed out (FAIL-070). Done before the session ends
  // so a screen still mounted can't be reading them as they go.
  const logout = useCallback(async () => {
    const userId = userRef.current?.id;
    if (userId) await clearUserLocalData(userId);
    await endSession();
  }, [endSession]);

  const logoutAll = useCallback(async () => {
    const userId = userRef.current?.id;
    await api.post("/api/auth/logout-all").catch(() => undefined);
    if (userId) await clearUserLocalData(userId);
    await clearBiometricEnrollment();
    await clearAuth();
  }, [clearAuth, clearBiometricEnrollment]);

  // REQ-177: native -- time in the background locks the app (an overlay;
  // the screens underneath stay mounted, so a half-answered lesson or an
  // open lab is still there after unlocking). Nothing happens on the way
  // out; on the way back, the time away is checked against the learner's
  // "Lock after" setting (src/lib/autoLock.ts). This replaces the 1.5 s
  // background sign-out (no biometrics) and re-lock (biometrics), which
  // threw away in-memory work.
  //
  // Android reports "background" for a permission dialog, the photo picker
  // and the Google sign-in tab, so absences under MIN_AWAY_MS never lock,
  // and a return inside a background hold (share sheet, picker; FAIL-062,
  // src/lib/backgroundHold.ts) doesn't either. iOS's transient "inactive"
  // (a call banner, control center) is not an absence at all.
  //
  // If the OS ends the app while it is away, the cold start above locks
  // from the last-seen time written here.
  useEffect(() => {
    if (Platform.OS === "web") return; // web has its own idle and hidden-tab lock, below
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "background" && status === "signedIn") {
        backgroundHold.noteBackground();
        if (backgroundedAtRef.current === null) backgroundedAtRef.current = Date.now();
        persistLastSeen();
      } else if (next === "active") {
        const at = backgroundedAtRef.current;
        backgroundedAtRef.current = null;
        const now = Date.now();
        const held = backgroundHold.isHeld(now);
        backgroundHold.clear();
        if (status !== "signedIn") return;
        if (at !== null && shouldLockOnReturn(now - at, lockAfterRef.current, held)) lockApp();
        else if (!appLockedRef.current) persistLastSeen(now);
      }
    });
    return () => sub.remove();
  }, [status, lockApp, persistLastSeen]);

  // Web's counterpart to the native lock above. REQ-177: after the "Lock
  // after" time without input, or with the tab hidden that long, the lock
  // screen asks for the password again (no biometrics on web) instead of
  // signing out. The hard sign-out after WEB_IDLE_LIMIT_MS without input is
  // unchanged and still runs while locked: input on the lock screen does not
  // count as activity until it unlocks. The last WEB_IDLE_WARNING_LEAD_MS
  // before it show a countdown (webIdleWarningSecondsLeft, rendered by the
  // root layout) while the app is unlocked.
  const WEB_IDLE_LIMIT_MS = 30 * 60 * 1000;
  const WEB_IDLE_WARNING_LEAD_MS = 60 * 1000;
  const WEB_LAST_SEEN_EVERY_MS = 15 * 1000;
  useEffect(() => {
    if (Platform.OS !== "web" || status !== "signedIn") {
      setWebIdleWarningSecondsLeft(null);
      return;
    }
    webLastActivityRef.current = Date.now();
    let lastPersisted = 0;
    let hiddenAt: number | null = null;
    const markActive = () => {
      if (appLockedRef.current) return;
      webLastActivityRef.current = Date.now();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        persistLastSeen(webLastActivityRef.current);
      } else if (hiddenAt !== null) {
        const away = Date.now() - hiddenAt;
        hiddenAt = null;
        if (shouldLockOnReturn(away, lockAfterRef.current)) lockApp();
      }
    };
    const activityEvents = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    activityEvents.forEach((evt) => window.addEventListener(evt, markActive, { passive: true }));
    document.addEventListener("visibilitychange", onVisibility);
    const interval = setInterval(() => {
      const now = Date.now();
      const idleFor = now - webLastActivityRef.current;
      if (idleFor >= WEB_IDLE_LIMIT_MS) {
        logout();
        return;
      }
      if (!appLockedRef.current && shouldLockWhenIdle(idleFor, lockAfterRef.current)) lockApp();
      if (!appLockedRef.current && now - lastPersisted >= WEB_LAST_SEEN_EVERY_MS) {
        lastPersisted = now;
        persistLastSeen(webLastActivityRef.current);
      }
      const remaining = WEB_IDLE_LIMIT_MS - idleFor;
      setWebIdleWarningSecondsLeft(
        !appLockedRef.current && remaining <= WEB_IDLE_WARNING_LEAD_MS ? Math.ceil(remaining / 1000) : null
      );
    }, 1000);
    return () => {
      activityEvents.forEach((evt) => window.removeEventListener(evt, markActive));
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(interval);
      setWebIdleWarningSecondsLeft(null);
    };
  }, [status, logout, lockApp, persistLastSeen]);

  // Enrollment: confirm the device can actually authenticate *before*
  // Ascendra starts relying on it, then move the refresh token to the
  // OS-protected key and delete the plain copy.
  const enableBiometric = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    const available = await isBiometricAvailable();
    if (!available) return { ok: false, error: "No biometric method is set up on this device." };
    if (!refreshTokenRef.current) return { ok: false, error: "Sign in again before enabling this." };

    const confirmed = await confirmBiometric("Confirm to enable biometric sign-in for Ascendra");
    if (!confirmed) return { ok: false, error: "Could not confirm biometrics." };

    await secureStorage.setItem(REFRESH_TOKEN_SECURE_KEY, refreshTokenRef.current, SEAL_OPTIONS);
    await secureStorage.deleteItem(REFRESH_TOKEN_KEY);
    await secureStorage.setItem(BIOMETRIC_ENABLED_KEY, "1");
    await secureStorage.setItem(BIOMETRIC_SESSION_KEY, "1");
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
    await secureStorage.deleteItem(BIOMETRIC_SESSION_KEY).catch(() => undefined);
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
      releaseLock();
      setUser(me.user);
      setStatus("signedIn");
      return true;
    } catch (err) {
      // A 401 means the server rejected the stored token, so it is spent
      // and this device can never unlock with it again -- retrying would
      // just replay it and read as theft again. Drop the enrolment and
      // make the user sign in once to mint a fresh one. Anything else -- a
      // cancelled prompt, no network -- leaves the enrolment alone so a
      // retry is still possible.
      if (err instanceof ApiError && err.status === 401) {
        await clearBiometricEnrollment();
        await clearAuth();
      }
      // Wrong/cancelled/unavailable -- stay on the lock screen so the user
      // can retry or fall back, never trapped and never silently signed in.
      return false;
    }
  }, [clearAuth, clearBiometricEnrollment, releaseLock]);

  // REQ-177: unlocking the lock after time away. The session is still live
  // in memory; this only confirms it's the learner. Biometric: the OS
  // prompt with the device passcode as its fallback, under a background
  // hold so the passcode screen (a separate activity on Android) can't
  // re-lock on "Immediately". Password: POST /api/auth/unlock. An access
  // token that expired while locked is refreshed once (the client never
  // refreshes /api/auth/* itself); a refused refresh signs out.
  const unlockMethod = unlockMethodFor(biometricEnabled, Platform.OS);
  const unlockApp = useCallback(
    async (input?: { reauth?: string; googleIdToken?: string }): Promise<{ ok: boolean; error?: string }> => {
      if (unlockMethodFor(biometricEnabledRef.current, Platform.OS) === "biometric" && !input) {
        const confirmed = await withBackgroundHold(() => confirmBiometric("Unlock Ascendra")).catch(() => false);
        if (!confirmed) return { ok: false, error: "Couldn't unlock. Try again." };
        releaseLock();
        return { ok: true };
      }
      const send = () => api.post("/api/auth/unlock", input ?? {});
      try {
        try {
          await send();
        } catch (err) {
          if (!(err instanceof ApiError) || err.status !== 401 || isReauthRefusal(err.data)) throw err;
          if (!(await refresh())) return { ok: false, error: "Your session ended. Sign in again." };
          await send();
        }
        releaseLock();
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "Couldn't unlock. Try again." };
      }
    },
    [refresh, releaseLock]
  );

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
        webIdleWarningSecondsLeft,
        appLocked,
        unlockMethod,
        unlockApp,
        lockAfter,
        setLockAfter,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
