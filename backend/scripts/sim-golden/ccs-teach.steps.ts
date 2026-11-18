// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// ABPTSCCS/she-pulls-him-up-by-the-arms. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps ccs-teach
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSCCS", slug: "she-pulls-him-up-by-the-arms" };

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
        title: "Expert at study pace: wound first, calls, asks, teaches with teach-back, risk factors, documents",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "wound");
          act(c, "diagnose", { dx: "inf" });
          act(c, "refer", { how: "surgeon" });
          test(c, "know");
          act(c, "teach");
          test(c, "risk");
          act(c, "plan");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Teaches well, but checks the wound late and calls late",
        reasoning: "partial",
        drive: (c) => {
          test(c, "know");
          test(c, "risk");
          test(c, "meds");
          upTo(c, 130);
          test(c, "wound");
          act(c, "teach");
          act(c, "plan");
          upTo(c, 130);
          act(c, "diagnose", { dx: "inf" });
          act(c, "refer", { how: "surgeon" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "noTeach",
        title: "Finds the wound and calls, but sends them off untaught",
        reasoning: "partial",
        drive: (c) => {
          test(c, "wound");
          act(c, "diagnose", { dx: "inf" });
          act(c, "refer", { how: "surgeon" });
          test(c, "risk");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "exercised",
        title: "Failure: skips the wound and exercises him",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "normal" });
          act(c, "ex");
          act(c, "refer", { how: "note" });
          toEnd(c);
        },
      },
      {
        id: "watched",
        title: "Failure: sees the wound, decides to watch it, exercises him",
        reasoning: "missed",
        drive: (c) => {
          test(c, "wound");
          act(c, "diagnose", { dx: "later" });
          act(c, "ex");
          toEnd(c);
        },
      },
    ],
  };
}
