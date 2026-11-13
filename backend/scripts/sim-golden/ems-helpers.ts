// REQ-241 (bedside wave 2, EMS): small driver helpers shared by the EMS
// golden scripts (emr-*, emt-*, aemt-*, medic-*). `act` answers a reasoning
// moment and continues past a chapter break the action opened, as a learner
// would before the next action.
import type { CommandParams } from "../../lib/sim/engine/v1/types.ts";
import type { Ctl } from "./steps.ts";
import { chapters, until } from "./s2b-helpers.ts";

export const v = (c: Ctl, n: string): unknown => c.value(n);
export const ended = (c: Ctl): boolean => c.run.state.ended !== null;

export function act(c: Ctl, action: string, params?: CommandParams): void {
  if (ended(c)) return;
  c.act(action, params);
  c.answer();
  chapters(c);
}

export function at(c: Ctl, tick: number): void {
  until(c, (x) => x.run.state.tick >= tick || ended(x));
}

export function when(c: Ctl, pred: (c: Ctl) => boolean, limit = 20000): void {
  until(c, (x) => pred(x) || ended(x), limit);
}

export function toEnd(c: Ctl): void {
  until(c, (x) => ended(x), 20000);
}
