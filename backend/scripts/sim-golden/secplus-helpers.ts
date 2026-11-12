// REQ-231: shared driver steps for the Security+ incident sims on the
// security console (SECPLUS/*.sim.json and their SECPLUSV8 bands). Each task
// costs analyst time: act, then let the work finish; an attacker step can
// stop the skip early (interruptsSkip), so skip until the work is done.
import type { CommandParams } from "../../lib/sim/engine/v1/types.ts";
import type { Ctl } from "./steps.ts";

export function task(c: Ctl, action: string, params?: CommandParams): void {
  if (c.run.state.ended) return;
  c.act(action, params);
  settle(c);
}

export function settle(c: Ctl): void {
  let n = 0;
  while (!c.run.state.ended && c.run.state.phase === "incident" && c.value("busy") === true && n++ < 50) c.skip("work");
  c.answer();
}

export function watchUntil(c: Ctl, minutes: number): void {
  while (!c.run.state.ended && c.run.state.phase === "incident" && c.run.state.tick * c.run.c.dt < minutes * 60) task(c, "watch");
  c.answer();
}

export function close(c: Ctl): void {
  if (c.run.state.phase === "incident") c.act("closeIncident");
  c.answer();
}
