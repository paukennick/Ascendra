// REQ-325 (nursing depth, round 3): golden paths for
// CCRNADULT/pale-urine-after-pituitary-surgery. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps ccrn-di
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CCRNADULT", slug: "pale-urine-after-pituitary-surgery" };

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
        title: "Expert at study pace: intake and output, specific gravity and sodium; central DI; neurosurgery now; desmopressin and replacement; sodium plan; documented",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "io");
          test(c, "sg");
          act(c, "diagnose", { dx: "di" });
          act(c, "refer", { how: "nsg" });
          upTo(c, 80);
          act(c, "desmo");
          act(c, "replace");
          act(c, "naPlan");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Neuro check and glucose first, calls 7 minutes after the sodium, and sets no sodium plan",
        reasoning: "partial",
        drive: (c) => {
          test(c, "neuro");
          test(c, "glucose");
          test(c, "io");
          test(c, "sg");
          act(c, "diagnose", { dx: "di" });
          upTo(c, 120);
          act(c, "refer", { how: "nsg" });
          upTo(c, 175);
          act(c, "desmo");
          act(c, "replace");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "desmoOnly",
        title: "Calls at once and gives desmopressin, but never starts the replacement fluid",
        reasoning: "partial",
        drive: (c) => {
          test(c, "sg");
          act(c, "refer", { how: "nsg" });
          act(c, "diagnose", { dx: "di" });
          upTo(c, 80);
          act(c, "desmo");
          act(c, "naPlan");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "siadh",
        title: "Failure: reads the sodium, calls it SIADH, restricts fluids and leaves it for the morning",
        reasoning: "missed",
        drive: (c) => {
          test(c, "sg");
          act(c, "diagnose", { dx: "siadh" });
          act(c, "restrict");
          act(c, "refer", { how: "morning" });
          toEnd(c);
        },
      },
      {
        id: "ivFluid",
        title: "Failure: totals the output and calls it IV fluid coming out",
        reasoning: "missed",
        drive: (c) => {
          test(c, "io");
          act(c, "diagnose", { dx: "fluids" });
          toEnd(c);
        },
      },
    ],
  };
}
