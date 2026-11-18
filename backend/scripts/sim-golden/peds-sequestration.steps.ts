// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// CCRNPEDS/sickle-cell-belly-big-and-pale. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps peds-sequestration
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CCRNPEDS", slug: "sickle-cell-belly-big-and-pale" };

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
        title: "Expert at study pace: spleen and perfusion, bolus and crossmatch, hemoglobin, calls, checks the chest, tells his mother",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "spleen");
          test(c, "perf");
          act(c, "bolus");
          act(c, "xmatch");
          act(c, "diagnose", { dx: "seq" });
          act(c, "refer", { how: "call" });
          test(c, "hgb");
          test(c, "chest");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Finds it and starts volume, but calls 6 minutes after the spleen",
        reasoning: "partial",
        drive: (c) => {
          test(c, "spleen");
          act(c, "bolus");
          act(c, "xmatch");
          test(c, "perf");
          test(c, "hgb");
          test(c, "chest");
          upTo(c, 85);
          act(c, "diagnose", { dx: "seq" });
          act(c, "refer", { how: "call" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "sedated",
        title: "Calls promptly but gives the opioid and sends no crossmatch",
        reasoning: "partial",
        drive: (c) => {
          test(c, "spleen");
          act(c, "opioid");
          act(c, "diagnose", { dx: "seq" });
          act(c, "refer", { how: "call" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "painCrisis",
        title: "Failure: reads it as a pain crisis, gives the opioid and a warm pack, morning count",
        reasoning: "missed",
        drive: (c) => {
          test(c, "perf");
          act(c, "diagnose", { dx: "pain" });
          act(c, "opioid");
          act(c, "heat");
          act(c, "refer", { how: "recheck" });
          toEnd(c);
        },
      },
      {
        id: "fever",
        title: "Failure: calls it the fever and lets him sleep",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "fever" });
          act(c, "heat");
          toEnd(c);
        },
      },
    ],
  };
}
