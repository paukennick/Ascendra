import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { MatureContentSheet, type MatureSheetSubmit } from "@/components/MatureContentNotice";
import { friendlyError } from "@/lib/errorMessage";
import {
  acceptFailure,
  MATURE_CONTENT_NOTICE_VERSION,
  needsMatureConfirmation,
  noticeMode,
  parseMatureState,
  registerMatureContentHandler,
  type MatureAnswer,
  type MatureSource,
  type MatureState,
  type MatureTarget,
} from "@/lib/matureContent";

// REQ-224 / REQ-259: the 18+ acknowledgement for each mental health course
// (src/lib/matureContent.ts). Loads this account's state once per sign-in
// (GET /api/mature-content: whether a date of birth is on file, the age
// status, the courses acknowledged), and shows the notice:
//   - when a screen asks before acting (`ensure`: the intake form when a
//     mental health course is picked);
//   - when the API client gets a 403 "mature_content_required" (a mental
//     health course opened or started without an acknowledgement for it),
//     through the handler registered here, after which the client sends the
//     request once more.
// The notice asks for a date of birth only while none is on file, and shows a
// closed, kind message instead of a form when the account is under 18. Every
// caller waiting while the sheet is open is answered together. The
// acknowledgement is recorded on the server before anyone is told yes: unlike
// the study notice's best-effort backstop, a failed record keeps the sheet open
// with the error, because the server would refuse the content anyway.

interface EnsureTrack {
  id: string;
  title?: string | null;
  category_slug?: string | null;
}

interface MatureContentValue {
  // "confirmed" when no acknowledgement is needed for this course (or any
  // other course), or once the learner acknowledged it and it was recorded;
  // "declined" when they closed the notice; "blocked" for an under-18 account.
  ensure: (track: EnsureTrack, source: MatureSource) => Promise<MatureAnswer>;
  needs: (track: EnsureTrack) => boolean;
}

const Ctx = createContext<MatureContentValue>({
  ensure: async () => "confirmed",
  needs: () => false,
});

export function MatureContentProvider({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();
  const userId = status === "signedIn" ? user?.id ?? null : null;
  const [state, setState] = useState<MatureState | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const acknowledgedThisSession = useRef(new Set<string>());
  const waiting = useRef<((answer: MatureAnswer) => void)[]>([]);
  const pending = useRef<{ target: MatureTarget; source: MatureSource; title?: string } | null>(null);
  const [shown, setShown] = useState<{ title?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const settle = useCallback((answer: MatureAnswer) => {
    const list = waiting.current;
    waiting.current = [];
    pending.current = null;
    setShown(null);
    setError(null);
    list.forEach((resolve) => resolve(answer));
  }, []);

  // The state may say acknowledged while the server refused (the version moved
  // on, a stale state): ask anyway; a repeat keeps the first row. Callers
  // waiting on different courses at once share one sheet for the first.
  const ask = useCallback((target: MatureTarget, source: MatureSource, title?: string) => {
    return new Promise<MatureAnswer>((resolve) => {
      waiting.current.push(resolve);
      pending.current ??= { target, source, title };
      setShown({ title: pending.current.title });
    });
  }, []);

  useEffect(() => {
    acknowledgedThisSession.current = new Set();
    if (!userId) {
      setState(null);
      registerMatureContentHandler(null);
      settle("declined");
      return;
    }
    let live = true;
    api
      .get("/api/mature-content")
      .then((d) => {
        if (live) setState(parseMatureState(d));
      })
      .catch(() => undefined);
    registerMatureContentHandler(ask);
    return () => {
      live = false;
      registerMatureContentHandler(null);
    };
  }, [userId, ask, settle]);

  const confirm = useCallback(
    async (form: MatureSheetSubmit) => {
      const p = pending.current;
      if (!p) return settle("declined");
      setBusy(true);
      setError(null);
      try {
        const d = await api.post("/api/mature-content/accept", {
          trackId: p.target.trackId,
          version: MATURE_CONTENT_NOTICE_VERSION,
          source: p.source,
          ...form,
        });
        const next = parseMatureState(d);
        if (next) setState(next);
        acknowledgedThisSession.current.add(p.target.trackId);
        settle("confirmed");
      } catch (err) {
        const failure = err instanceof ApiError ? acceptFailure(err.status, err.data) : { kind: "other" as const };
        if (failure.kind === "underage") {
          // The server decided from the date on the account: lock it here too.
          setState((s) => ({ noticeVersion: MATURE_CONTENT_NOTICE_VERSION, acknowledgedTrackIds: [], ...s, dateOfBirthOnFile: true, ageStatus: "under_18" }));
        } else if (failure.kind === "needs_dob") {
          setState((s) => ({ noticeVersion: MATURE_CONTENT_NOTICE_VERSION, acknowledgedTrackIds: [], ...s, ageStatus: "unknown", dateOfBirthOnFile: false }));
        } else {
          setError(friendlyError(err));
        }
      } finally {
        setBusy(false);
      }
    },
    [settle]
  );

  const ensure = useCallback(
    async (track: EnsureTrack, source: MatureSource): Promise<MatureAnswer> => {
      if (!needsMatureConfirmation(track, stateRef.current, acknowledgedThisSession.current)) return "confirmed";
      // The category comes from the course row; only mental health asks today.
      const answer = await ask({ trackId: track.id, category: "mental-health" }, source, track.title ?? undefined);
      return answer;
    },
    [ask]
  );
  const needs = useCallback(
    (track: EnsureTrack) => needsMatureConfirmation(track, state, acknowledgedThisSession.current),
    [state]
  );

  const value = useMemo(() => ({ ensure, needs }), [ensure, needs]);
  const mode = noticeMode(state);
  return (
    <Ctx.Provider value={value}>
      {children}
      <MatureContentSheet
        visible={!!shown}
        mode={mode}
        courseTitle={shown?.title}
        busy={busy}
        error={error}
        onConfirm={confirm}
        onCancel={() => settle(mode === "blocked" ? "blocked" : "declined")}
      />
    </Ctx.Provider>
  );
}

export function useMatureContent(): MatureContentValue {
  return useContext(Ctx);
}
