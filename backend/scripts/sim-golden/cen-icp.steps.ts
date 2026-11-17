// REQ-323 (health depth, round 2): golden paths for
// CEN/hallway-head-injury-falling-gcs. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps cen-icp
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CEN", slug: "hallway-head-injury-falling-gcs" };

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
        title: "Expert at study pace: a baseline neuro check, head of the bed up, the history; checks every few minutes; the 2-point drop reported at once; hand-off",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          act(c, "neuro");
          act(c, "hob");
          test(c, "hx");
          upTo(c, 60);
          act(c, "neuro");
          upTo(c, 100);
          act(c, "neuro");
          upTo(c, 152);
          act(c, "neuro");
          act(c, "diagnose", { dx: "icp" });
          act(c, "refer", { how: "md" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "sparseChecks",
        title: "A baseline check, then nothing for 16 minutes; the drop is reported at once, but the pupil changes before CT",
        reasoning: "partial",
        drive: (c) => {
          act(c, "hob");
          test(c, "hx");
          test(c, "glucose");
          act(c, "neuro");
          upTo(c, 230);
          act(c, "neuro");
          act(c, "diagnose", { dx: "icp" });
          act(c, "refer", { how: "md" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateReport",
        title: "Frequent checks find the drop, but the report waits 6 minutes",
        reasoning: "partial",
        drive: (c) => {
          act(c, "neuro");
          act(c, "hob");
          upTo(c, 60);
          act(c, "neuro");
          upTo(c, 152);
          act(c, "neuro");
          upTo(c, 230);
          act(c, "neuro");
          act(c, "diagnose", { dx: "icp" });
          act(c, "refer", { how: "md" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "sleepingItOff",
        title: "Failure: sees the GCS fall and puts it down to the beer; hourly checks",
        reasoning: "missed",
        drive: (c) => {
          act(c, "neuro");
          test(c, "hx");
          act(c, "diagnose", { dx: "alcohol" });
          upTo(c, 152);
          act(c, "neuro");
          act(c, "refer", { how: "hourly" });
          toEnd(c);
        },
      },
      {
        id: "noChecks",
        title: "Failure: history and a glucose, calls it a concussion, no neuro checks",
        reasoning: "missed",
        drive: (c) => {
          test(c, "hx");
          test(c, "glucose");
          act(c, "diagnose", { dx: "concussion" });
          toEnd(c);
        },
      },
    ],
  };
}
