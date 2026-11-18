// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// ABPTSGCS/home-visit-quiet-and-sleepy-today. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps gcs-sepsis
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSGCS", slug: "home-visit-quiet-and-sleepy-today" };

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
        title: "Expert at study pace: vital signs, calls 911, delirium screen, urine and intake, explains",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "vitals");
          act(c, "diagnose", { dx: "sepsis" });
          act(c, "refer", { how: "ems" });
          test(c, "cam");
          test(c, "urine");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Finds it but screens fully before calling 8 minutes later",
        reasoning: "partial",
        drive: (c) => {
          test(c, "vitals");
          test(c, "cam");
          test(c, "urine");
          upTo(c, 130);
          act(c, "diagnose", { dx: "sepsis" });
          act(c, "refer", { how: "ems" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "exFirst",
        title: "Starts exercise before checking, then finds it and calls",
        reasoning: "partial",
        drive: (c) => {
          act(c, "ex");
          test(c, "vitals");
          act(c, "diagnose", { dx: "sepsis" });
          act(c, "refer", { how: "ems" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "tired",
        title: "Failure: calls it tiredness and lets her sleep",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "tired" });
          act(c, "nap");
          act(c, "refer", { how: "tomorrow" });
          toEnd(c);
        },
      },
      {
        id: "dementia",
        title: "Failure: calls it dementia and exercises her",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "dementia" });
          act(c, "ex");
          toEnd(c);
        },
      },
    ],
  };
}
