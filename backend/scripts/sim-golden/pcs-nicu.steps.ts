// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// ABPTSPCS/nicu-range-of-motion-sats-dropping. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps pcs-nicu
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSPCS", slug: "nicu-range-of-motion-sats-dropping" };

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

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: baseline, handling, pauses and contains, tells the nurse, watches recovery, changes the plan",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "state");
          test(c, "handle");
          act(c, "pause");
          act(c, "diagnose", { dx: "stress" });
          act(c, "refer", { how: "rn" });
          test(c, "recover");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateTell",
        title: "Pauses and contains at once, but tells the nurse 8 minutes later",
        reasoning: "partial",
        drive: (c) => {
          test(c, "state");
          test(c, "handle");
          act(c, "pause");
          test(c, "recover");
          upTo(c, 120);
          act(c, "diagnose", { dx: "stress" });
          act(c, "refer", { how: "rn" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "noBaseline",
        title: "Skips the baseline and rubs his back briefly before pausing",
        reasoning: "partial",
        drive: (c) => {
          test(c, "handle");
          act(c, "stim");
          act(c, "pause");
          act(c, "diagnose", { dx: "stress" });
          act(c, "refer", { how: "rn" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "pushed",
        title: "Failure: reads it as resistance and finishes the stretches",
        reasoning: "missed",
        drive: (c) => {
          test(c, "handle");
          act(c, "diagnose", { dx: "fight" });
          act(c, "finish");
          act(c, "refer", { how: "none" });
          toEnd(c);
        },
      },
      {
        id: "artifact",
        title: "Failure: blames the monitor and stimulates him",
        reasoning: "missed",
        drive: (c) => {
          test(c, "handle");
          act(c, "diagnose", { dx: "probe" });
          act(c, "stim");
          toEnd(c);
        },
      },
    ],
  };
}
