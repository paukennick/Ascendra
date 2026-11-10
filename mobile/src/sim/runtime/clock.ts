// REQ-190 (docs/sims.md 5.4, 5.9): the real-time clock rules, pure.
// A running phase advances one tick per tick of real time from an anchor
// (tick, monotonic ms) set at each resume. Each frame steps at most 3 ticks
// toward the target; still behind, it re-anchors at the tick it reached, so
// a slow phone runs slightly slow, never in a burst. A gap of more than 3 s
// since the previous frame (the OS suspended the app, the phone slept) does
// not catch up at all: the run pauses at the last stepped tick.

export const MAX_STEPS_PER_FRAME = 3;
export const STALL_MS = 3_000;

export interface Anchor {
  tick: number;
  atMs: number;
}

export interface FramePlan {
  steps: number;
  stall: boolean;
  reanchor: Anchor | null;
}

export function planFrame(anchor: Anchor, currentTick: number, nowMs: number, lastFrameMs: number, tickMs = 1000): FramePlan {
  if (nowMs - lastFrameMs > STALL_MS) return { steps: 0, stall: true, reanchor: null };
  const target = anchor.tick + Math.floor((nowMs - anchor.atMs) / tickMs);
  const behind = target - currentTick;
  if (behind <= 0) return { steps: 0, stall: false, reanchor: null };
  const steps = Math.min(MAX_STEPS_PER_FRAME, behind);
  const reanchor = behind > MAX_STEPS_PER_FRAME ? { tick: currentTick + steps, atMs: nowMs } : null;
  return { steps, stall: false, reanchor };
}
