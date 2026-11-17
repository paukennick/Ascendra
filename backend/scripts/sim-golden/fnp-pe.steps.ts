// REQ-326 (sims-health-4, docs/sims.md 22.34): golden paths for
// FNPAANP/clinic-calf-ache-after-flight-now-breathless. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps fnp-pe
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "FNPAANP", slug: "clinic-calf-ache-after-flight-now-breathless" };

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
        title: "Expert at study pace: Wells score, oxygen, exam, reassess; at the hypoxia the emergency department now; hand-off",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          act(c, "fix");
          act(c, "o2");
          test(c, "exam");
          act(c, "reassess");
          untilRed(c);
          act(c, "diagnose", { dx: "pe" });
          act(c, "refer", { how: "ed" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Scores and examines well, but calls for transfer more than 5 minutes after the hypoxia",
        reasoning: "partial",
        drive: (c) => {
          act(c, "fix");
          act(c, "o2");
          test(c, "exam");
          act(c, "reassess");
          untilRed(c);
          upTo(c, c.run.state.tick + 78);
          act(c, "diagnose", { dx: "pe" });
          act(c, "refer", { how: "ed" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "wrongRoute",
        title: "Failure: scores and examines, then waits for the D-dimer and books outpatient tests",
        reasoning: "missed",
        drive: (c) => {
          act(c, "fix");
          test(c, "exam");
          untilRed(c);
          act(c, "diagnose", { dx: "ddimer" });
          act(c, "refer", { how: "us" });
          toEnd(c);
        },
      },
      {
        id: "unsafe",
        title: "Failure: does an ECG, then sends the D-dimer and sends her home",
        reasoning: "missed",
        drive: (c) => {
          test(c, "ecg");
          act(c, "unsafe");
          toEnd(c);
        },
      },
      {
        id: "noAction",
        title: "Failure: ECG, history and exam, calls it a strain; no score and no transfer",
        reasoning: "missed",
        drive: (c) => {
          test(c, "ecg");
          test(c, "hx");
          test(c, "exam");
          act(c, "diagnose", { dx: "strain" });
          toEnd(c);
        },
      },
    ],
  };
}
