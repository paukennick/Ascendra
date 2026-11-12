// REQ-237: shared driver steps for the terminal sims (LINUXPLUS, NETWORKPLUS
// and CKA on the terminal screen). Each command costs operator time: run it,
// then let it finish; an outage step can stop the skip early
// (interruptsSkip), so skip until the command is done.
import type { CommandParams } from "../../lib/sim/engine/v1/types.ts";
import type { Ctl } from "./steps.ts";

export function run(c: Ctl, action: string, params?: CommandParams): void {
  if (c.run.state.ended || c.run.state.phase !== "incident") return;
  c.act(action, params);
  settle(c);
}

export function settle(c: Ctl): void {
  let n = 0;
  while (!c.run.state.ended && c.run.state.phase === "incident" && c.value("busy") === true && n++ < 50) c.skip("work");
  c.answer();
}

export function waitUntil(c: Ctl, minutes: number): void {
  while (!c.run.state.ended && c.run.state.phase === "incident" && c.run.state.tick * c.run.c.dt < minutes * 60) run(c, "watch");
  c.answer();
}

export function close(c: Ctl): void {
  if (c.run.state.phase === "incident") c.act("closeOutage");
  c.answer();
}
