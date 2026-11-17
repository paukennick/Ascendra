// REQ-325 (nursing depth, round 3): golden paths for
// CCRNADULT/day-six-after-coiling-new-weakness. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps ccrn-sah
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CCRNADULT", slug: "day-six-after-coiling-new-weakness" };

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
        title: "Expert at study pace: neuro check against baseline; drain checked; delayed cerebral ischemia; neurointensivist now; fluid to euvolemia; pressure augmented; documented",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "neuro");
          test(c, "evd");
          act(c, "diagnose", { dx: "dci" });
          act(c, "refer", { how: "neuro" });
          upTo(c, 75);
          act(c, "fluid");
          act(c, "aug");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Glucose and balance first, then the neuro check; calls 6 minutes after the new deficit",
        reasoning: "partial",
        drive: (c) => {
          test(c, "glucose");
          test(c, "balance");
          test(c, "neuro");
          test(c, "evd");
          act(c, "diagnose", { dx: "dci" });
          upTo(c, 110);
          act(c, "refer", { how: "neuro" });
          upTo(c, 165);
          act(c, "fluid");
          act(c, "aug");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "pressureOnly",
        title: "Calls at once and starts the vasopressor, but never gives the fluid or checks the drain",
        reasoning: "partial",
        drive: (c) => {
          test(c, "neuro");
          act(c, "refer", { how: "neuro" });
          act(c, "diagnose", { dx: "dci" });
          upTo(c, 70);
          act(c, "aug");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "rebleed",
        title: "Failure: calls it a rebleed, gives labetalol and rechecks in an hour",
        reasoning: "missed",
        drive: (c) => {
          test(c, "neuro");
          act(c, "diagnose", { dx: "rebleed" });
          act(c, "lower");
          act(c, "refer", { how: "recheck" });
          toEnd(c);
        },
      },
      {
        id: "restricted",
        title: "Failure: reviews the balance, calls it a seizure and restricts fluids",
        reasoning: "missed",
        drive: (c) => {
          test(c, "balance");
          act(c, "diagnose", { dx: "seizure" });
          act(c, "restrict");
          toEnd(c);
        },
      },
    ],
  };
}
