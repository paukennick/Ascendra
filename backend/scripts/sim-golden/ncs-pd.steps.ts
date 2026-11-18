// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// ABPTSNCS/treadmill-ordered-freezing-in-doorways. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps ncs-pd
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSNCS", slug: "treadmill-ordered-freezing-in-doorways" };

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
        title: "Expert at study pace: freezing, cue trial, calls the neurologist, falls and life, cues and cycling, activity plan, documents",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "freeze");
          test(c, "cuetry");
          act(c, "diagnose", { dx: "team" });
          act(c, "refer", { how: "team" });
          test(c, "falls");
          test(c, "life");
          act(c, "cue");
          act(c, "goals");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Good session, but calls the neurologist 8 minutes later",
        reasoning: "partial",
        drive: (c) => {
          test(c, "freeze");
          test(c, "cuetry");
          test(c, "life");
          act(c, "cue");
          act(c, "goals");
          upTo(c, 130);
          act(c, "diagnose", { dx: "team" });
          act(c, "refer", { how: "team" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "noCue",
        title: "Cycles and calls, but never assesses freezing or tries a cue",
        reasoning: "partial",
        drive: (c) => {
          test(c, "life");
          act(c, "cue");
          act(c, "diagnose", { dx: "team" });
          act(c, "refer", { how: "team" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "treadmill",
        title: "Failure: follows the referral onto the treadmill",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "tread" });
          act(c, "tread");
          act(c, "refer", { how: "none" });
          toEnd(c);
        },
      },
      {
        id: "gaitOnly",
        title: "Failure: sees the freezing, treats gait only, treadmill anyway",
        reasoning: "missed",
        drive: (c) => {
          test(c, "freeze");
          act(c, "diagnose", { dx: "pt" });
          act(c, "tread");
          toEnd(c);
        },
      },
    ],
  };
}
