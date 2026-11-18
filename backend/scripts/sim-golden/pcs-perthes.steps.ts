// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// ABPTSPCS/six-year-old-limp-after-soccer. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps pcs-perthes
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSPCS", slug: "six-year-old-limp-after-soccer" };

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
        title: "Expert at study pace: knee, hip, calls, gait and systemic screen, explains",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "knee");
          test(c, "hip");
          act(c, "diagnose", { dx: "lcp" });
          act(c, "refer", { how: "ped" });
          test(c, "gait");
          test(c, "sick");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Finds it but calls 8 minutes later",
        reasoning: "partial",
        drive: (c) => {
          test(c, "knee");
          test(c, "hip");
          test(c, "gait");
          test(c, "sick");
          upTo(c, 130);
          act(c, "diagnose", { dx: "lcp" });
          act(c, "refer", { how: "ped" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "jumped",
        title: "Starts hopping drills, then examines the hip and calls",
        reasoning: "partial",
        drive: (c) => {
          test(c, "knee");
          act(c, "jump");
          test(c, "hip");
          act(c, "diagnose", { dx: "lcp" });
          act(c, "refer", { how: "ped" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "growing",
        title: "Failure: calls it growing pains and starts agility work",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "growing" });
          act(c, "jump");
          act(c, "refer", { how: "program" });
          toEnd(c);
        },
      },
      {
        id: "strain",
        title: "Failure: calls it a strain and drills him",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "strain" });
          act(c, "jump");
          toEnd(c);
        },
      },
    ],
  };
}
