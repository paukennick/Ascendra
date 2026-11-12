// REQ-242: shared moves for the wave-2 AWS board cases. Each runs one
// learner-paced week: close the change window, answer the reasoning moment,
// then skip day by day until an ending.
import type { Ctl } from "./steps.ts";

export function week(c: Ctl): void {
  if (c.run.state.ended !== null) return;
  c.act("runWeek");
  if (c.run.state.ended !== null) return;
  c.answer();
  for (let i = 0; i < 5 && c.run.state.ended === null; i++) c.skip("dayT");
}
