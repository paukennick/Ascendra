// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// ABPTSGCS/stronger-legs-same-fall-risk. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps gcs-outcomes
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSGCS", slug: "stronger-legs-same-fall-risk" };

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
        title: "Expert at study pace: sit-to-stand, gait speed, updates the physician, FES-I and participation, revises, documents",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "sts");
          test(c, "gait");
          act(c, "diagnose", { dx: "notyet" });
          act(c, "refer", { how: "md" });
          test(c, "fes");
          test(c, "part");
          act(c, "revise");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Reads it right, but updates 8 minutes later",
        reasoning: "partial",
        drive: (c) => {
          test(c, "sts");
          test(c, "gait");
          test(c, "fes");
          test(c, "part");
          act(c, "revise");
          upTo(c, 130);
          act(c, "diagnose", { dx: "notyet" });
          act(c, "refer", { how: "md" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "noLevels",
        title: "Continues care and updates on the daughter's word, without measuring",
        reasoning: "partial",
        drive: (c) => {
          act(c, "revise");
          act(c, "diagnose", { dx: "notyet" });
          act(c, "refer", { how: "md" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "strength",
        title: "Failure: measures strength only and discharges",
        reasoning: "missed",
        drive: (c) => {
          test(c, "sts");
          act(c, "diagnose", { dx: "ready" });
          act(c, "dc");
          act(c, "refer", { how: "dc" });
          toEnd(c);
        },
      },
      {
        id: "tug",
        title: "Failure: sees gait speed, leans on the TUG, discharges",
        reasoning: "missed",
        drive: (c) => {
          test(c, "gait");
          act(c, "diagnose", { dx: "tug" });
          act(c, "dc");
          toEnd(c);
        },
      },
    ],
  };
}
