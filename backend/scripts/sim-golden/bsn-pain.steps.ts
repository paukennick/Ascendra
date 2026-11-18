// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// BSNRN/hip-repair-moaning-scale-says-zero. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps bsn-pain
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "BSNRN", slug: "hip-repair-moaning-scale-says-zero" };

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
        title: "Expert at study pace: PAINAD, analgesic and comfort, calls to change the plan, asks the daughter, screens other causes, updates the plan",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "painad");
          act(c, "analg");
          act(c, "position");
          act(c, "diagnose", { dx: "plan" });
          act(c, "refer", { how: "call" });
          test(c, "daughter");
          test(c, "delirium");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Scores and treats at once, but calls 8 minutes later",
        reasoning: "partial",
        drive: (c) => {
          test(c, "painad");
          act(c, "analg");
          act(c, "position");
          test(c, "daughter");
          test(c, "delirium");
          test(c, "mar");
          upTo(c, 120);
          act(c, "diagnose", { dx: "plan" });
          act(c, "refer", { how: "call" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "sedated",
        title: "Calls promptly but gives the antipsychotic first",
        reasoning: "partial",
        drive: (c) => {
          test(c, "painad");
          act(c, "antipsych");
          act(c, "diagnose", { dx: "plan" });
          act(c, "refer", { how: "call" });
          act(c, "analg");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "agitation",
        title: "Failure: calls it agitation, gives the antipsychotic and mitts, leaves a note",
        reasoning: "missed",
        drive: (c) => {
          test(c, "mar");
          act(c, "diagnose", { dx: "agitation" });
          act(c, "antipsych");
          act(c, "restrain");
          act(c, "refer", { how: "dayteam" });
          toEnd(c);
        },
      },
      {
        id: "fine",
        title: "Failure: trusts the zeros and restrains her",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "fine" });
          act(c, "restrain");
          toEnd(c);
        },
      },
    ],
  };
}
