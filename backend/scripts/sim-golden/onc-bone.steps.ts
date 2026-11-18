// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// ABPTSONC/thigh-pain-walking-breast-cancer-history. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps onc-bone
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSONC", slug: "thigh-pain-walking-breast-cancer-history" };

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
        title: "Expert at study pace: history, crutches, calls, hip and gait, explains",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "hx");
          act(c, "pwb");
          act(c, "diagnose", { dx: "met" });
          act(c, "refer", { how: "md" });
          test(c, "hip");
          test(c, "gait");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Protects her at once but calls 8 minutes later",
        reasoning: "partial",
        drive: (c) => {
          test(c, "hx");
          act(c, "pwb");
          test(c, "hip");
          test(c, "gait");
          upTo(c, 130);
          act(c, "diagnose", { dx: "met" });
          act(c, "refer", { how: "md" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "loaded",
        title: "Tries step-ups before the history, then protects and calls",
        reasoning: "partial",
        drive: (c) => {
          act(c, "load");
          test(c, "hx");
          act(c, "pwb");
          act(c, "diagnose", { dx: "met" });
          act(c, "refer", { how: "md" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "oa",
        title: "Failure: treats hip osteoarthritis with loading and writes back",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "oa" });
          act(c, "load");
          act(c, "refer", { how: "plan" });
          toEnd(c);
        },
      },
      {
        id: "strain",
        title: "Failure: calls it a strain and loads it",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "strain" });
          act(c, "load");
          toEnd(c);
        },
      },
    ],
  };
}
