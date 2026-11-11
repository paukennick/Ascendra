import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { MatureContentSheet } from "@/components/MatureContentNotice";
import { friendlyError } from "@/lib/errorMessage";
import {
  MATURE_CONTENT_NOTICE_VERSION,
  needsMatureConfirmation,
  parseMatureState,
  registerMatureContentHandler,
  type MatureCategory,
  type MatureCategoryState,
  type MatureSource,
} from "@/lib/matureContent";

// REQ-224: the 18+ mature-content confirmation for the mental health courses
// (src/lib/matureContent.ts). Loads this account's state once per sign-in
// (GET /api/mature-content), and shows the notice:
//   - when a screen asks before acting (`ensure`: the intake form when a
//     mental health course is picked, Explore when the category is picked);
//   - when the API client gets a 403 "mature_content_required" (a mental
//     health course opened or started without a confirmation), through the
//     handler registered here, after which the client sends the request once
//     more.
// Every caller waiting while the sheet is open is answered together. The
// confirmation is recorded on the server before anyone is told yes: unlike
// the study notice's best-effort backstop, a failed record keeps the sheet
// open with the error, because the server would refuse the content anyway.

interface MatureContentValue {
  // true when no confirmation is needed for this category (or any other
  // category), or once the learner confirmed and it was recorded.
  ensure: (categorySlug: string | null | undefined, source: MatureSource) => Promise<boolean>;
  needs: (categorySlug: string | null | undefined) => boolean;
}

const Ctx = createContext<MatureContentValue>({
  ensure: async () => true,
  needs: () => false,
});

export function MatureContentProvider({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();
  const userId = status === "signedIn" ? user?.id ?? null : null;
  const [state, setState] = useState<MatureCategoryState[] | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const confirmedThisSession = useRef(new Set<string>());
  const waiting = useRef<((go: boolean) => void)[]>([]);
  const pending = useRef<{ category: MatureCategory; source: MatureSource } | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const settle = useCallback((go: boolean) => {
    const list = waiting.current;
    waiting.current = [];
    pending.current = null;
    setOpen(false);
    setError(null);
    list.forEach((resolve) => resolve(go));
  }, []);

  const ask = useCallback((category: MatureCategory, source: MatureSource) => {
    if (!needsMatureConfirmation(category, stateRef.current, confirmedThisSession.current)) {
      // The state says confirmed but the server refused: the version moved on
      // or the state is stale. Ask anyway; a repeat keeps the first row.
      if (source !== "course") return Promise.resolve(true);
    }
    return new Promise<boolean>((resolve) => {
      waiting.current.push(resolve);
      pending.current ??= { category, source };
      setOpen(true);
    });
  }, []);

  useEffect(() => {
    confirmedThisSession.current = new Set();
    if (!userId) {
      setState(null);
      registerMatureContentHandler(null);
      settle(false);
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

  const confirm = useCallback(async () => {
    const p = pending.current;
    if (!p) return settle(false);
    setBusy(true);
    setError(null);
    try {
      const d = await api.post("/api/mature-content/accept", {
        category: p.category,
        version: MATURE_CONTENT_NOTICE_VERSION,
        source: p.source,
      });
      setState(parseMatureState(d));
      confirmedThisSession.current.add(p.category);
      settle(true);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }, [settle]);

  const ensure = useCallback(
    async (categorySlug: string | null | undefined, source: MatureSource) => {
      if (!needsMatureConfirmation(categorySlug, stateRef.current, confirmedThisSession.current)) return true;
      return ask(categorySlug as MatureCategory, source);
    },
    [ask]
  );
  const needs = useCallback(
    (categorySlug: string | null | undefined) => needsMatureConfirmation(categorySlug, state, confirmedThisSession.current),
    [state]
  );

  const value = useMemo(() => ({ ensure, needs }), [ensure, needs]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <MatureContentSheet visible={open} busy={busy} error={error} onConfirm={confirm} onCancel={() => settle(false)} />
    </Ctx.Provider>
  );
}

export function useMatureContent(): MatureContentValue {
  return useContext(Ctx);
}
