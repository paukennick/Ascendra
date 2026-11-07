import { useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { decodeDraft, encodeDraft } from "@/lib/drafts";

// Keeps a screen's in-progress state on the device (see src/lib/drafts.ts for
// the pure rules). Used by the chat box, the support form and the PBQ
// simulator.
//
// REQ-093:
//  - `key` null means "don't persist" (no signed-in user, or no unit chosen).
//  - `payload` is the current state as a stable string, or null for "nothing
//    worth keeping", which removes the stored entry. Clearing after a
//    successful send is therefore just the screen emptying its own state.
//  - Nothing is written until the stored value for this key has been read, so
//    the empty initial state can't overwrite a draft before it is restored.
//  - Writes are debounced; the pending one is flushed when the key changes or
//    the screen unmounts, so leaving right after typing doesn't lose it.
//  - `onRestore` gets the stored payload (fresh, well-formed envelope) or
//    null when there is none; the screen decides how to apply it.
const DEBOUNCE_MS = 500;

export function useStoredDraft(
  key: string | null,
  payload: string | null,
  onRestore: (payload: string | null) => void
): void {
  const loadedKey = useRef<string | null>(null);
  const pending = useRef<{ key: string; payload: string | null } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoreRef = useRef(onRestore);
  restoreRef.current = onRestore;

  const flush = useRef(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const p = pending.current;
    pending.current = null;
    if (!p) return;
    if (p.payload === null) AsyncStorage.removeItem(p.key).catch(() => {});
    else AsyncStorage.setItem(p.key, encodeDraft(p.payload, Date.now())).catch(() => {});
  }).current;

  // Read the stored value whenever the key changes.
  useEffect(() => {
    loadedKey.current = null;
    if (!key) return;
    let cancelled = false;
    AsyncStorage.getItem(key)
      .catch(() => null)
      .then((raw) => {
        if (cancelled) return;
        const stored = decodeDraft(raw, Date.now());
        // A stale or unreadable entry is dropped rather than left to linger.
        if (raw != null && stored === null) AsyncStorage.removeItem(key).catch(() => {});
        restoreRef.current(stored);
        loadedKey.current = key;
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  // Save changes (debounced) once the stored value has been read.
  useEffect(() => {
    if (!key || loadedKey.current !== key) return;
    pending.current = { key, payload };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, DEBOUNCE_MS);
  }, [key, payload, flush]);

  // Flush on key change and on unmount.
  useEffect(() => flush, [key, flush]);
}
