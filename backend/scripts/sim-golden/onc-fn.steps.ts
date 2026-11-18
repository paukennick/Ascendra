// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// ABPTSONC/chemo-day-nine-shivery-at-rehab. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps onc-fn
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSONC", slug: "chemo-day-nine-shivery-at-rehab" };

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
        title: "Expert at study pace: vitals, holds, calls, counts and sources, documents",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "vitals");
          act(c, "diagnose", { dx: "fn" });
          act(c, "refer", { how: "onc" });
          test(c, "counts");
          test(c, "source");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Finds the fever but checks everything before calling 8 minutes later",
        reasoning: "partial",
        drive: (c) => {
          test(c, "vitals");
          test(c, "counts");
          test(c, "source");
          upTo(c, 130);
          act(c, "diagnose", { dx: "fn" });
          act(c, "refer", { how: "onc" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "exFirst",
        title: "Starts the bike before vitals, then finds the fever and calls",
        reasoning: "partial",
        drive: (c) => {
          act(c, "ex");
          test(c, "vitals");
          act(c, "diagnose", { dx: "fn" });
          act(c, "refer", { how: "onc" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "fatigue",
        title: "Failure: calls it fatigue, sends her home and reschedules",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "fatigue" });
          act(c, "home");
          act(c, "refer", { how: "next" });
          toEnd(c);
        },
      },
      {
        id: "cold",
        title: "Failure: calls it a cold and exercises her",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "cold" });
          act(c, "ex");
          toEnd(c);
        },
      },
    ],
  };
}
