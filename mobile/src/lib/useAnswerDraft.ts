import { useCallback, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/auth/AuthContext";
import { answerDraftKey, answerDraftPayload, parseAnswerDraft, type AnswerDraftThread } from "@/lib/drafts";
import { useStoredDraft } from "@/lib/useStoredDraft";

// REQ-113 (Audit 3 mobile M3): a typed answer kept on the device until it is
// graded (src/lib/drafts.ts answerDraftKey). `id` null means nothing to key
// it to yet. Returns the text, its setter, the clientAttemptId to send for
// that text (the same one again for an unchanged resend, even after a
// restart), and clear() for after a successful send.
export function useAnswerDraft(thread: AnswerDraftThread, id: string | null) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [sent, setSent] = useState<{ id: string; text: string } | null>(null);
  const restoredFor = useRef<string | null>(null);
  const key = user && id ? answerDraftKey(thread, user.id, id) : null;

  useStoredDraft(key, key ? answerDraftPayload({ text, sentId: sent?.id ?? null, sentText: sent?.text ?? null }) : null, (stored) => {
    if (restoredFor.current === key) return;
    restoredFor.current = key;
    const d = parseAnswerDraft(stored);
    if (!d) return;
    setText((cur) => cur || d.text);
    if (d.sentId && d.sentText != null) setSent({ id: d.sentId, text: d.sentText });
  });

  // The id for sending `value`: kept while the text is unchanged.
  const idFor = useCallback(
    (value: string, makeId: () => string) => {
      if (sent && sent.text === value) return sent.id;
      const next = { id: makeId(), text: value };
      setSent(next);
      return next.id;
    },
    [sent]
  );

  // Also removes the stored copy directly: a screen that navigates away in
  // the same tick never renders the empty state that would remove it, and a
  // debounced write still pending is swept by the second removal.
  const clear = useCallback(() => {
    setText("");
    setSent(null);
    if (key) {
      AsyncStorage.removeItem(key).catch(() => undefined);
      setTimeout(() => AsyncStorage.removeItem(key).catch(() => undefined), 800);
    }
  }, [key]);

  return { text, setText, idFor, clear };
}
