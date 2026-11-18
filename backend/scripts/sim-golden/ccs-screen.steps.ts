// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// ABPTSCCS/walk-test-booked-two-weeks-after-mi. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps ccs-screen
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSCCS", slug: "walk-test-booked-two-weeks-after-mi" };

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
        title: "Expert at study pace: record review, defers, calls the pulmonologist, vitals and medications, documents",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "chart");
          act(c, "defer");
          act(c, "diagnose", { dx: "no" });
          act(c, "refer", { how: "md" });
          test(c, "rest");
          test(c, "meds");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Finds it and defers, but calls 8 minutes later",
        reasoning: "partial",
        drive: (c) => {
          test(c, "chart");
          act(c, "defer");
          test(c, "rest");
          test(c, "meds");
          upTo(c, 130);
          act(c, "diagnose", { dx: "no" });
          act(c, "refer", { how: "md" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "noChart",
        title: "Defers on a hunch and calls, without reviewing the record",
        reasoning: "partial",
        drive: (c) => {
          test(c, "rest");
          act(c, "defer");
          act(c, "diagnose", { dx: "no" });
          act(c, "refer", { how: "md" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "tested",
        title: "Failure: clears her on resting vitals and tests her",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "yes" });
          act(c, "walk");
          act(c, "refer", { how: "none" });
          toEnd(c);
        },
      },
      {
        id: "slow",
        title: "Failure: reviews the chart but tests at a slower pace",
        reasoning: "missed",
        drive: (c) => {
          test(c, "chart");
          act(c, "diagnose", { dx: "slow" });
          act(c, "walk");
          toEnd(c);
        },
      },
    ],
  };
}
