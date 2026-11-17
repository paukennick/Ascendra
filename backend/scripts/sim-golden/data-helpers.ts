// REQ-312: shared driver steps for the data and code console sims. Each step
// costs working time: take it, then let it finish; the deadline can stop the
// skip early (interruptsSkip), so skip until the step is done.
import type { CommandParams } from "../../lib/sim/engine/v1/types.ts";
import type { Ctl } from "./steps.ts";

export function run(c: Ctl, action: string, params?: CommandParams): void {
  if (c.run.state.ended || c.run.state.phase !== "work") return;
  c.act(action, params);
  settle(c);
}

export function settle(c: Ctl): void {
  let n = 0;
  while (!c.run.state.ended && c.run.state.phase === "work" && c.value("busy") === true && n++ < 50) {
    const timer = c.run.state.timers.find((t) => t.timer === "work") ? "work" : undefined;
    c.skip(timer);
  }
  c.answer();
}

export function finish(c: Ctl): void {
  if (c.run.state.phase === "work") c.act("finish");
  c.answer();
}

export function record(c: Ctl, params: CommandParams): void {
  finish(c);
  c.act("document", params);
}
