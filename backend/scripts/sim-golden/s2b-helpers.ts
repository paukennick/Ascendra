// REQ-223 (batch S2b): small driver helpers shared by the S2b golden scripts
// (bleeding-after-whipple, resident-chokes-at-lunch, resident-found-on-floor).
// The controller in steps.ts acts, chooses, answers and skips; these add the
// REQ-209 commands (pace, teach, chapter) through its replay hook, stamped at
// the current tick.
import type { Command } from "../../lib/sim/engine/v1/types.ts";
import { chapterDue, teachingAvailable } from "../../lib/sim/engine/v1/engine.ts";
import type { Ctl } from "./steps.ts";

function raw(c: Ctl, cmd: Record<string, unknown>): void {
  c.replay([{ ...cmd, seq: 0, tick: c.run.state.tick } as unknown as Command]);
}

export function pace(c: Ctl, p: 1 | 3): void {
  raw(c, { type: "pace", pace: p });
}

export function begin(c: Ctl): void {
  raw(c, { type: "begin", start: "focused" });
}

// Answer every teaching prompt on offer now with the choice its rationale
// supports (or the given wrong choice), as a learner tapping through would.
export function teach(c: Ctl, wrong: Record<string, string> = {}): void {
  for (let i = 0; i < 5; i++) {
    const t = teachingAvailable(c.run)[0];
    if (!t) return;
    raw(c, { type: "teach", prompt: t.id, choice: wrong[t.id] ?? t.prompt.expect });
  }
}

// Continue past every chapter break that is due now.
export function chapters(c: Ctl): void {
  for (let i = 0; i < 5; i++) {
    const ch = chapterDue(c.run);
    if (!ch) return;
    raw(c, { type: "chapter", chapter: ch.id, choice: "continue" });
  }
}

// Real time until the condition holds, answering reasoning moments on the
// way (the controller's waitUntil does that), then any chapter break.
export function until(c: Ctl, pred: (c: Ctl) => boolean, limit = 20000): void {
  c.waitUntil(() => pred(c), limit);
  c.answer();
  chapters(c);
}

export function at(c: Ctl, tick: number): void {
  until(c, (x) => x.run.state.tick >= tick);
}

export const v = (c: Ctl, name: string): unknown => c.value(name);
