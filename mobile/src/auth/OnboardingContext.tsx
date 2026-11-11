import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api, registerStudyNoticeRequiredHook } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { launchGate, TERMS_VERSION, type LaunchGate, type OnboardingState } from "@/lib/legal";
import { syncRemindersFor, watchAppForeground } from "@/lib/reminderScheduler";
import { router } from "expo-router";
import { STUDY_NOTICE_VERSION, registerStudyNoticeHandler, studyNoticeDecision } from "@/lib/studyNotice";
import { StudyNoticeSheet } from "@/components/StudyNotice";

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
  // REQ-165: records the study notice; throws if the request fails.
  acceptNotice: () => Promise<void>;
  completeFirstRun: (goal: { trackId: string | null }) => Promise<void>;
}

const Ctx = createContext<OnboardingValue>({
  state: null,
  gate: null,
  acceptTerms: async () => undefined,
  acceptNotice: async () => undefined,
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

  // REQ-217 (FAIL-1061): a request the server refused with "study notice
  // required" means this copy of the state is out of date (or never loaded).
  // Reload it; the launch gate then opens the notice screen. One reload at a
  // time, so a burst of refused requests is one request.
  const reloading = useRef(false);
  useEffect(() => {
    if (!userId) {
      registerStudyNoticeRequiredHook(null);
      return;
    }
    registerStudyNoticeRequiredHook(() => {
      if (reloading.current) return;
      reloading.current = true;
      api
        .get<OnboardingState>("/api/onboarding")
        .then((s) => {
          if (loadedFor.current === userId) setState(s);
        })
        .catch(() => undefined)
        .finally(() => {
          reloading.current = false;
        });
    });
    return () => registerStudyNoticeRequiredHook(null);
  }, [userId]);

  // Reminders follow the account: sign-in schedules this account's, a
  // different account on the same phone replaces them. (Log out cancels
  // them in AuthContext.)
  useEffect(() => {
    if (userId) void syncRemindersFor(userId);
  }, [userId]);

  // REQ-197: and again when the app comes back to the front, so the next
  // reminders name what is due now (at most every 30 minutes).
  const userIdRef = useRef<string | null>(userId);
  userIdRef.current = userId;
  useEffect(() => watchAppForeground(() => userIdRef.current), []);

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

  // REQ-165: the study notice. The launch screen (app/(app)/notice.tsx)
  // records it with acceptNotice. As a backstop, when the launch state is
  // unknown, the API client asks through the handler registered here before
  // a request that sends the learner's text to the AI provider; every
  // request waiting on it is let through or refused together.
  const stateRef = useRef(state);
  stateRef.current = state;
  const acceptedThisSession = useRef(false);
  const waiting = useRef<((go: boolean) => void)[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetBusy, setSheetBusy] = useState(false);

  const acceptNotice = useCallback(async () => {
    const s = await api.post<OnboardingState>("/api/onboarding/notice", { version: STUDY_NOTICE_VERSION });
    acceptedThisSession.current = true;
    setState(s);
  }, []);

  const settleSheet = useCallback((go: boolean) => {
    const list = waiting.current;
    waiting.current = [];
    setSheetOpen(false);
    list.forEach((resolve) => resolve(go));
  }, []);

  useEffect(() => {
    acceptedThisSession.current = false;
    if (!userId) {
      registerStudyNoticeHandler(null);
      settleSheet(false);
      return;
    }
    registerStudyNoticeHandler(() => {
      if (studyNoticeDecision(stateRef.current, acceptedThisSession.current) === "go") return Promise.resolve(true);
      return new Promise<boolean>((resolve) => {
        waiting.current.push(resolve);
        setSheetOpen(true);
      });
    });
    return () => registerStudyNoticeHandler(null);
  }, [userId, settleSheet]);

  // From the sheet, recording is best effort: if it fails the request still
  // goes ahead (the learner did accept) and the next launch asks again.
  const acceptFromSheet = useCallback(async () => {
    setSheetBusy(true);
    try {
      await acceptNotice();
    } catch {
      acceptedThisSession.current = true;
    } finally {
      setSheetBusy(false);
      settleSheet(true);
    }
  }, [acceptNotice, settleSheet]);

  const value = useMemo(
    () => ({ state, gate: launchGate(state), acceptTerms, acceptNotice, completeFirstRun }),
    [state, acceptTerms, acceptNotice, completeFirstRun]
  );
  return (
    <Ctx.Provider value={value}>
      {children}
      <StudyNoticeSheet
        visible={sheetOpen}
        busy={sheetBusy}
        onAccept={acceptFromSheet}
        onCancel={() => settleSheet(false)}
        onReadPrivacy={() => {
          // Nothing is sent; the learner sends again after reading.
          settleSheet(false);
          router.push("/privacy");
        }}
      />
    </Ctx.Provider>
  );
}

export function useOnboarding(): OnboardingValue {
  return useContext(Ctx);
}
