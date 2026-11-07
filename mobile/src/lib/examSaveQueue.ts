// REQ-113 (Audit 3 mobile H1): how the exam screen saves answers.
//
// Each change used to send its own PUT, unnumbered and unwatched. Submit
// didn't wait for saves still in flight or retry ones that had failed, and
// the server closes a session when it grades it, so on a slow network the
// last answer (or any whose save had failed) was graded as blank. Two quick
// changes to one question could also land in the wrong order and leave the
// older answer stored.
//
// This is the pure half of the fix (the screen wires it to the API):
//   - one save in flight per question at a time; changes made meanwhile are
//     merged and sent next, so the server sees them in order;
//   - every save carries a number (seq) that only goes up per question,
//     starting from the number the server last applied (saveSeq in the
//     session view). The server ignores a number at or below the last one it
//     applied (backend/lib/exam-sessions.ts saveItem, migration 047), so a
//     save the app gave up on that lands late can't undo a newer one;
//   - a failed save keeps its fields and they go out again, merged, with the
//     next save of that question, a retry, or a flush;
//   - flush() waits for everything in flight, retries what failed, and says
//     which questions are still unsaved, so Submit can refuse (and say why)
//     instead of grading blanks.

import { plural } from "./i18n.ts";

export type SavePatch = Record<string, unknown>;

// What the server said about one save. "stale": a newer save of the same
// question was already applied, which is success for this purpose. "ended":
// the session was submitted or timed out (409); nothing more can be saved.
export type SaveOutcome = "saved" | "stale" | "ended";

// Sends one numbered save. Rejects on a network failure or a server error.
export type SaveSender = (position: number, patch: SavePatch & { seq: number }) => Promise<SaveOutcome>;

export interface SaveQueueState {
  inFlight: number[];
  failed: number[];
  ended: boolean;
}

export interface ExamSaveQueue {
  save(position: number, patch: SavePatch): void;
  retryFailed(): void;
  // Waits for in-flight saves, retries failed ones once, and reports the
  // questions whose latest change is still not on the server.
  flush(): Promise<{ unsaved: number[]; ended: boolean }>;
  state(): SaveQueueState;
  hasUnsaved(): boolean;
}

interface Slot {
  seq: number;
  pending: SavePatch | null;
  inflight: Promise<void> | null;
  failed: boolean;
}

export function createExamSaveQueue(opts: {
  send: SaveSender;
  // position -> the last save number the server applied (0 if none)
  initialSeq?: Record<number, number>;
  onChange?: (s: SaveQueueState) => void;
  onEnded?: () => void;
  onError?: (err: unknown) => void;
}): ExamSaveQueue {
  const slots = new Map<number, Slot>();
  let ended = false;

  const slot = (position: number): Slot => {
    let s = slots.get(position);
    if (!s) {
      s = { seq: Math.max(0, Math.floor(opts.initialSeq?.[position] ?? 0)), pending: null, inflight: null, failed: false };
      slots.set(position, s);
    }
    return s;
  };

  const state = (): SaveQueueState => ({
    inFlight: [...slots].filter(([, s]) => s.inflight).map(([p]) => p).sort((a, b) => a - b),
    failed: [...slots].filter(([, s]) => s.failed).map(([p]) => p).sort((a, b) => a - b),
    ended,
  });
  const notify = () => opts.onChange?.(state());

  function kick(position: number) {
    const s = slot(position);
    if (ended || s.inflight || !s.pending) return;
    const patch = s.pending;
    s.pending = null;
    s.failed = false;
    s.seq += 1;
    const seq = s.seq;
    s.inflight = (async () => {
      let ok = false;
      try {
        const outcome = await opts.send(position, { ...patch, seq });
        ok = true;
        if (outcome === "ended" && !ended) {
          ended = true;
          opts.onEnded?.();
        }
      } catch (err) {
        // Keep the fields; anything changed since goes on top of them.
        s.pending = { ...patch, ...(s.pending ?? {}) };
        s.failed = true;
        opts.onError?.(err);
      } finally {
        s.inflight = null;
        notify();
        // Changes made while this was in flight go next. After a failure
        // they wait for a retry, a new change or a flush.
        if (ok) kick(position);
      }
    })();
    notify();
  }

  async function settle() {
    for (let i = 0; i < 1000; i++) {
      const running = [...slots.values()].map((s) => s.inflight).filter((p): p is Promise<void> => !!p);
      if (!running.length) return;
      await Promise.all(running);
    }
  }

  return {
    save(position, patch) {
      if (ended) return;
      const s = slot(position);
      s.pending = { ...(s.pending ?? {}), ...patch };
      kick(position);
    },
    retryFailed() {
      for (const [p, s] of slots) if (s.failed) kick(p);
    },
    async flush() {
      await settle();
      for (const [p, s] of slots) if (s.pending && !s.inflight) kick(p);
      await settle();
      const unsaved = [...slots].filter(([, s]) => s.pending || s.failed).map(([p]) => p).sort((a, b) => a - b);
      return { unsaved: ended ? [] : unsaved, ended };
    },
    state,
    hasUnsaved() {
      return [...slots.values()].some((s) => s.pending || s.failed || s.inflight);
    },
  };
}

// What Submit says when answers could not be saved. Positions are 0-based.
export function unsavedMessage(unsaved: number[]): string {
  const qs = unsaved.map((p) => p + 1);
  const list = qs.length <= 5 ? qs.join(", ") : `${qs.slice(0, 5).join(", ")} and ${qs.length - 5} more`;
  return plural("exam.unsaved", qs.length, { list });
}
