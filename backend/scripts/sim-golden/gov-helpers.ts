// REQ-313: shared driver steps for the governance board, the tabletop and the
// professional-ethics sessions (docs/sims.md 22.26). Each task costs time:
// act, then let the work finish; an event (a board meeting, an inject, the
// other person's next move) can stop the skip early (interruptsSkip), so skip
// until the work is done. `phase` is the document's working phase.
import type { CommandParams } from "../../lib/sim/engine/v1/types.ts";
import type { Ctl } from "./steps.ts";

export function helpers(phase: string, busy = "busy", timer = "work", watchAction = "watch", closeAction = "close") {
  const settle = (c: Ctl): void => {
    let n = 0;
    while (!c.run.state.ended && c.run.state.phase === phase && c.value(busy) === true && n++ < 50) c.skip(timer);
    c.answer();
  };
  const task = (c: Ctl, action: string, params?: CommandParams): void => {
    if (c.run.state.ended || c.run.state.phase !== phase) return;
    c.act(action, params);
    settle(c);
  };
  const watchUntil = (c: Ctl, seconds: number): void => {
    while (!c.run.state.ended && c.run.state.phase === phase && c.run.state.tick * c.run.c.dt < seconds) task(c, watchAction);
    c.answer();
  };
  const close = (c: Ctl): void => {
    if (c.run.state.phase === phase) c.act(closeAction);
    c.answer();
  };
  return { settle, task, watchUntil, close };
}
