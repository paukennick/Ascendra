import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { launchGate, TERMS_VERSION, type LaunchGate, type OnboardingState } from "@/lib/legal";
import { syncRemindersFor } from "@/lib/reminderScheduler";

// REQ-119 (Audit 3 product H5, M2): what a signed-in launch asks first --
// the one-tap Terms prompt for an account that hasn't accepted the current
// version, then the first-run flow for a brand-new learner. Loaded once per
// signed-in account from GET /api/onboarding. If that request fails nothing
// is asked (src/lib/legal.ts launchGate): a network problem must never keep
// anyone from studying; the next launch asks again.
//
// Also keeps this phone's study reminders (src/lib/reminderScheduler.ts) to
// the signed-in account's own settings.

interface OnboardingValue {
  state: OnboardingState | null;
  gate: LaunchGate;
  acceptTerms: () => Promise<void>;
  completeFirstRun: (goal: { trackId: string | null }) => Promise<void>;
}

const Ctx = createContext<OnboardingValue>({
  state: null,
  gate: null,
  acceptTerms: async () => undefined,
  completeFirstRun: async () => undefined,
});

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();
  const userId = status === "signedIn" ? user?.id ?? null : null;
  const [state, setState] = useState<OnboardingState | null>(null);
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) {
      loadedFor.current = null;
      setState(null);
      return;
    }
    if (loadedFor.current === userId) return;
    loadedFor.current = userId;
    let live = true;
    api
      .get<OnboardingState>("/api/onboarding")
      .then((s) => {
        if (live && loadedFor.current === userId) setState(s);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [userId]);

  // Reminders follow the account: sign-in schedules this account's, a
  // different account on the same phone replaces them. (Log out cancels
  // them in AuthContext.)
  useEffect(() => {
    if (userId) void syncRemindersFor(userId);
  }, [userId]);

  const acceptTerms = useCallback(async () => {
    const s = await api.post<OnboardingState>("/api/onboarding/terms", { version: TERMS_VERSION });
    setState(s);
  }, []);

  // First run is marked done here before the app moves on. If the request
  // fails it is still treated as done for this launch (never a wall); the
  // server asks again next launch.
  const completeFirstRun = useCallback(async (goal: { trackId: string | null }) => {
    try {
      const s = await api.post<OnboardingState>("/api/onboarding/first-run", {
        trackId: goal.trackId,
        justExploring: goal.trackId === null,
      });
      setState(s);
    } catch {
      setState((prev) => (prev ? { ...prev, firstRun: { ...prev.firstRun, needed: false } } : prev));
    }
  }, []);

  const value = useMemo(
    () => ({ state, gate: launchGate(state), acceptTerms, completeFirstRun }),
    [state, acceptTerms, completeFirstRun]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOnboarding(): OnboardingValue {
  return useContext(Ctx);
}
