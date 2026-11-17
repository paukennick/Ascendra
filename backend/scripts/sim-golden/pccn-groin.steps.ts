// REQ-326 (sims-health-4, docs/sims.md 22.34): golden paths for
// PCCN/groin-swelling-after-cath. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps pccn-groin
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "PCCN", slug: "groin-swelling-after-cath" };

const ended = (c: Ctl): boolean => c.run.state.ended !== null;
const upTo = (c: Ctl, tick: number): void => until(c, (x) => x.run.state.tick >= tick || ended(x));
const toEnd = (c: Ctl): void => until(c, (x) => ended(x), 20000);
function act(c: Ctl, a: string, p?: Record<string, string>): void {
  if (ended(c)) return;
  c.act(a, p);
  c.answer();
  teach(c);
}
function test(c: Ctl, a: string): void {
  act(c, a);
  until(c, (x) => x.value("testPending") === false || ended(x));
}
// Wait for the red flag (0.5 on the authored course), then reassess to find it.
function untilRed(c: Ctl): void {
  until(c, (x) => (x.value("prog") as number) >= 0.5 || ended(x));
  act(c, "reassess");
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: edge marked, site and pulses, reassess; at the expanding hematoma pressure above the puncture and the fellow now; hand-off",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          act(c, "mark");
          test(c, "site");
          act(c, "reassess");
          untilRed(c);
          act(c, "fix");
          act(c, "diagnose", { dx: "bleed" });
          act(c, "refer", { how: "now" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Holds pressure at once, but calls the fellow more than 5 minutes later",
        reasoning: "partial",
        drive: (c) => {
          act(c, "mark");
          test(c, "site");
          act(c, "reassess");
          untilRed(c);
          act(c, "fix");
          upTo(c, c.run.state.tick + 78);
          act(c, "diagnose", { dx: "bleed" });
          act(c, "refer", { how: "now" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "wrongRoute",
        title: "Failure: site check, then pressure but calls it normal swelling and plans a recheck in an hour",
        reasoning: "missed",
        drive: (c) => {
          test(c, "site");
          untilRed(c);
          act(c, "fix");
          act(c, "diagnose", { dx: "normal" });
          act(c, "refer", { how: "later" });
          toEnd(c);
        },
      },
      {
        id: "unsafe",
        title: "Failure: asks about pain, then sits him up to walk",
        reasoning: "missed",
        drive: (c) => {
          test(c, "hx");
          act(c, "unsafe");
          toEnd(c);
        },
      },
      {
        id: "noAction",
        title: "Failure: history, labs and site check, calls it a DVT; no pressure and no call",
        reasoning: "missed",
        drive: (c) => {
          test(c, "hx");
          test(c, "labs");
          test(c, "site");
          act(c, "diagnose", { dx: "dvt" });
          toEnd(c);
        },
      },
    ],
  };
}
