import { useCallback, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/auth/AuthContext";
import { useStoredDraft } from "@/lib/useStoredDraft";
import { labDraftKey, labDraftPayload, parseLabDraft } from "@/lib/labs";

// REQ-123: a lab step's answers (one per rubric part) kept on the device
// until graded, like the other typed answers (src/lib/useAnswerDraft.ts).
// Leaving the screen, switching apps or Android killing the app keeps them.
// The client attempt id of what was already sent travels with the draft, so
// a resend of the same answers after a dropped connection is replayed by the
// server, not graded twice. The screen mounts one form per run and step
// (keyed), so each step starts with its own empty fields.
export function useLabDraft(labId: string | null, runId: string | null, step: number | null, partCount: number) {
  const { user } = useAuth();
  const [parts, setParts] = useState<string[]>(() => Array.from({ length: partCount }, () => ""));
  const [sent, setSent] = useState<{ id: string; sig: string } | null>(null);
  const restoredFor = useRef<string | null>(null);
  const key = user && labId && runId && step !== null ? labDraftKey(user.id, labId, runId, step) : null;

  useStoredDraft(key, key ? labDraftPayload({ parts, sentId: sent?.id ?? null, sentSig: sent?.sig ?? null }) : null, (stored) => {
    if (restoredFor.current === key) return;
    restoredFor.current = key;
    const d = parseLabDraft(stored, partCount);
    if (!d) return;
    setParts((cur) => (cur.some((p) => p.trim()) ? cur : d.parts));
    if (d.sentId && d.sentSig) setSent({ id: d.sentId, sig: d.sentSig });
  });

  const setPart = useCallback((i: number, value: string) => {
    setParts((cur) => cur.map((p, j) => (j === i ? value : p)));
  }, []);

  // The id for sending answers with this signature: kept while unchanged.
  const idFor = useCallback(
    (sig: string, makeId: () => string) => {
      if (sent && sent.sig === sig) return sent.id;
      const next = { id: makeId(), sig };
      setSent(next);
      return next.id;
    },
    [sent]
  );

  const clear = useCallback(() => {
    setParts(Array.from({ length: partCount }, () => ""));
    setSent(null);
    if (key) {
      AsyncStorage.removeItem(key).catch(() => undefined);
      setTimeout(() => AsyncStorage.removeItem(key).catch(() => undefined), 800);
    }
  }, [key, partCount]);

  return { parts, setPart, idFor, clear };
}
