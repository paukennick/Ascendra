// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// ABPTSCCS/cardiac-rehab-weight-up-orthopnea. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps ccs-rehab
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSCCS", slug: "cardiac-rehab-weight-up-orthopnea" };

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
        title: "Expert at study pace: weight, holds exercise, calls, teaches, exam and adherence, documents",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "weight");
          act(c, "hold");
          act(c, "diagnose", { dx: "adhf" });
          act(c, "refer", { how: "hf" });
          act(c, "teach");
          test(c, "exam");
          test(c, "meds");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Holds and teaches, but calls 8 minutes later",
        reasoning: "partial",
        drive: (c) => {
          test(c, "weight");
          act(c, "hold");
          act(c, "teach");
          test(c, "exam");
          test(c, "meds");
          upTo(c, 130);
          act(c, "diagnose", { dx: "adhf" });
          act(c, "refer", { how: "hf" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "noTeach",
        title: "Holds and calls promptly but skips the self-management teaching",
        reasoning: "partial",
        drive: (c) => {
          test(c, "weight");
          act(c, "hold");
          act(c, "diagnose", { dx: "adhf" });
          act(c, "refer", { how: "hf" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "exercised",
        title: "Failure: calls it deconditioning, puts him on the treadmill, leaves it for next time",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "deconditioned" });
          act(c, "ex");
          act(c, "refer", { how: "next" });
          toEnd(c);
        },
      },
      {
        id: "light",
        title: "Failure: weighs him but exercises him lightly",
        reasoning: "missed",
        drive: (c) => {
          test(c, "weight");
          act(c, "diagnose", { dx: "light" });
          act(c, "ex");
          toEnd(c);
        },
      },
    ],
  };
}
