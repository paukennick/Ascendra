// In-app handling of over-the-air updates.
//
// Why this exists: with the stock configuration the app checks on launch,
// downloads in the background, and applies the update on the *next* cold
// start. So a fix reaches a user one open late, and they get no signal that
// anything is waiting -- which is precisely wrong when the thing being fixed
// is sign-in being broken.
//
// Two behaviours, deliberately split:
//
//   Prompt (always): once an update is downloaded and ready, surface a quiet
//   bar the user can tap to restart. User-initiated, because a reload throws
//   away whatever they were in the middle of.
//
//   Silent apply (only when it is free): if the app has been in the
//   background long enough that they have lost their place anyway, apply on
//   return without asking. "Long enough" is five minutes.
//
// Two things this must not fight:
//
//   AuthContext runs its own AppState listener with a 1500ms grace timer that
//   locks or signs the user out on a genuine background. Reloading the app
//   mid-flight would race it, so silent apply happens on the foreground
//   transition, after that timer has either fired or been cancelled.
//
//   A lesson or PBQ holds answers that only exist in memory. Those routes are
//   never silently reloaded regardless of how long the user was away -- they
//   get the banner instead, and choose for themselves.

// REQ-177 (web): expo-updates is off on the web, so a tab left open kept its
// old bundle until reloaded. The web build now compares its bundled build id
// with GET /api/version on focus and every 10 minutes and shows the same
// banner, whose button reloads the page (src/lib/webVersion.ts). Never
// automatic: reloading is the learner's choice, as on native.

import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform, type AppStateStatus } from "react-native";
import { usePathname } from "expo-router";
import * as Updates from "expo-updates";
import { api } from "@/api/client";
import { compareBuild, holdsUnsavedWork, shouldCheckNow, WEB_VERSION_CHECK_MS } from "@/lib/webVersion";

// Baked into the web bundle by backend/scripts/build-webapp.sh.
const WEB_BUILD_ID = process.env.EXPO_PUBLIC_WEB_BUILD_ID ?? "";

/** Away for longer than this and a reload costs the user nothing. */
const SILENT_APPLY_AFTER_MS = 5 * 60 * 1000;

/** Don't re-check more often than this, however much the app is toggled. */
const MIN_CHECK_INTERVAL_MS = 60 * 1000;

export interface AppUpdatesState {
  /** An update is downloaded and ready to apply on reload. */
  updateReady: boolean;
  /** Apply it now. */
  applyUpdate: () => void;
  /** Hide the prompt without applying; it returns on the next foreground. */
  dismiss: () => void;
}

export function useAppUpdates(): AppUpdatesState {
  const pathname = usePathname();
  // isUpdatePending is only exposed through this hook, not as a module
  // constant. Taking it from here also means an update fetched by the stock
  // on-launch background check surfaces in the banner, rather than sitting
  // unannounced until the next cold start.
  const { isUpdatePending } = Updates.useUpdates();
  const [updateReady, setUpdateReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const pendingRef = useRef(isUpdatePending);
  pendingRef.current = isUpdatePending;

  const backgroundedAt = useRef<number | null>(null);
  const lastCheckedAt = useRef(0);
  const checking = useRef(false);
  // Read through a ref so the AppState effect does not resubscribe on every
  // navigation, which would drop the backgroundedAt timestamp it depends on.
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  // Disabled in development and in Expo Go: there is no update channel to
  // check, and checkForUpdateAsync throws rather than returning false.
  const enabled = Updates.isEnabled && !__DEV__;

  // REQ-177: web -- a newer deploy than this bundle.
  const [webUpdate, setWebUpdate] = useState(false);
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    let last = 0;
    let live = true;
    const check = async () => {
      const now = Date.now();
      if (!shouldCheckNow(last, now)) return;
      last = now;
      try {
        const res = await api.get<{ buildId?: unknown }>("/api/version");
        if (live && compareBuild(WEB_BUILD_ID, res?.buildId) === "new") {
          setDismissed(false);
          setWebUpdate(true);
        }
      } catch {
        // Offline or an older server: nothing to say. A 426 is handled by the
        // root layout's Update required path (src/api/client.ts).
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(() => void check(), WEB_VERSION_CHECK_MS);
    void check();
    return () => {
      live = false;
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, []);

  const applyUpdate = useCallback(() => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") window.location.reload();
      return;
    }
    // Covers the reload with a branded screen rather than letting the app
    // blank out, which reads as a crash.
    Updates.showReloadScreen();
    Updates.reloadAsync().catch(() => {
      Updates.hideReloadScreen();
    });
  }, []);

  const checkForUpdate = useCallback(
    async (allowSilentApply: boolean) => {
      if (!enabled || checking.current) return;
      if (Date.now() - lastCheckedAt.current < MIN_CHECK_INTERVAL_MS) return;

      checking.current = true;
      try {
        // Already fetched -- by a previous pass, or by the stock on-launch
        // check -- and waiting for a reload.
        if (pendingRef.current) {
          if (allowSilentApply) applyUpdate();
          else setUpdateReady(true);
          return;
        }

        const result = await Updates.checkForUpdateAsync();
        lastCheckedAt.current = Date.now();
        if (!result.isAvailable) return;

        await Updates.fetchUpdateAsync();
        if (allowSilentApply) applyUpdate();
        else {
          setDismissed(false);
          setUpdateReady(true);
        }
      } catch {
        // Offline, or the channel is unreachable. Nothing to tell the user:
        // they did not ask for this, and the app works as it is.
      } finally {
        checking.current = false;
      }
    },
    [enabled, applyUpdate]
  );

  useEffect(() => {
    if (!enabled) return;

    // One check on mount, never silent -- the user is looking at the app
    // right now, so reloading underneath them would be hostile.
    void checkForUpdate(false);

    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next === "background" || next === "inactive") {
        if (backgroundedAt.current === null) backgroundedAt.current = Date.now();
        return;
      }

      if (next === "active") {
        const awayFor = backgroundedAt.current === null ? 0 : Date.now() - backgroundedAt.current;
        backgroundedAt.current = null;

        const longEnough = awayFor >= SILENT_APPLY_AFTER_MS;
        const safeRoute = !holdsUnsavedWork(pathnameRef.current);
        void checkForUpdate(longEnough && safeRoute);
      }
    });

    return () => sub.remove();
  }, [enabled, checkForUpdate]);

  return {
    // Either our own fetch completed, or something already left an update
    // pending before this hook ran.
    updateReady: (updateReady || isUpdatePending || webUpdate) && !dismissed,
    applyUpdate,
    dismiss: () => setDismissed(true),
  };
}
