// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// CCRNPEDS/shunt-baby-vomiting-sats-falling. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps peds-shunt
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CCRNPEDS", slug: "shunt-baby-vomiting-sats-falling" };

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
        title: "Expert at study pace: murmur, oxygen and bolus, calls, checks probe, hydration and perfusion, tells the parents",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "murmur");
          act(c, "o2");
          act(c, "bolus");
          act(c, "diagnose", { dx: "shunt" });
          act(c, "refer", { how: "call" });
          test(c, "probe");
          test(c, "hydration");
          test(c, "perf");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Hears it and starts oxygen and fluid, but checks everything before calling 6 minutes later",
        reasoning: "partial",
        drive: (c) => {
          test(c, "murmur");
          act(c, "o2");
          act(c, "bolus");
          test(c, "probe");
          test(c, "hydration");
          test(c, "perf");
          upTo(c, 85);
          act(c, "diagnose", { dx: "shunt" });
          act(c, "refer", { how: "call" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "probeFirst",
        title: "Swaps the probe first, then calls; gives oxygen but no fluid",
        reasoning: "partial",
        drive: (c) => {
          test(c, "murmur");
          act(c, "probeSwap");
          act(c, "o2");
          act(c, "diagnose", { dx: "shunt" });
          act(c, "refer", { how: "call" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "chronic",
        title: "Failure: calls it his usual cyanosis, holds fluids and plans a recheck",
        reasoning: "missed",
        drive: (c) => {
          test(c, "probe");
          act(c, "diagnose", { dx: "chronic" });
          act(c, "restrict");
          act(c, "refer", { how: "wait" });
          toEnd(c);
        },
      },
      {
        id: "probe",
        title: "Failure: blames the probe and waits for a better reading",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "probe" });
          act(c, "probeSwap");
          toEnd(c);
        },
      },
    ],
  };
}
