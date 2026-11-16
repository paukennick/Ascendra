// REQ-296 (clinical coverage): golden paths for DPT/dizziness-central-red-flags.
// No prototype exists, so the expectations are the engine's own results,
// re-checked by every `npm test` (lint + documents).
//
//   npm run sim:golden -- steps dpt-central
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "DPT", slug: "dizziness-central-red-flags" };

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
function history(c: Ctl): void {
  act(c, "history");
  until(c, (x) => x.value("historyPending") === false || ended(x));
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: neurologic symptoms, nystagmus, head impulse, finger-to-nose; central impression; 911 with the last-known-well time; referrer told",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          act(c, "neuro");
          act(c, "bp");
          test(c, "nys");
          test(c, "hit");
          test(c, "fn");
          act(c, "diagnose", { dx: "central" });
          act(c, "refer", { how: "ems" });
          act(c, "tellReferrer");
          toEnd(c);
        },
      },
      {
        id: "officeVisit",
        title: "Full screen with a gait belt and a walking test, a central impression, but a same-day office visit instead of 911",
        reasoning: "partial",
        drive: (c) => {
          history(c);
          act(c, "neuro");
          test(c, "nys");
          test(c, "hit");
          act(c, "belt");
          test(c, "walk");
          act(c, "diagnose", { dx: "central" });
          act(c, "refer", { how: "md" });
          act(c, "tellReferrer");
          toEnd(c);
        },
      },
      {
        id: "treatedFirst",
        title: "Treats as referred first (Dix-Hallpike, gaze stabilization), then finds the signs and calls 911",
        reasoning: "partial",
        drive: (c) => {
          history(c);
          act(c, "dix");
          act(c, "vor");
          act(c, "neuro");
          test(c, "nys");
          test(c, "hit");
          act(c, "diagnose", { dx: "central" });
          act(c, "refer", { how: "ems" });
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Thorough exam with a belt, but 911 more than 10 minutes after the first central sign",
        reasoning: "partial",
        drive: (c) => {
          act(c, "neuro");
          history(c);
          test(c, "nys");
          test(c, "hit");
          test(c, "fn");
          act(c, "belt");
          test(c, "romberg");
          test(c, "walk");
          upTo(c, 150);
          act(c, "diagnose", { dx: "central" });
          act(c, "refer", { how: "ems" });
          act(c, "tellReferrer");
          toEnd(c);
        },
      },
      {
        id: "noBelt",
        title: "Failure: stands him feet together without a gait belt",
        reasoning: "missed",
        drive: (c) => {
          history(c);
          test(c, "romberg");
          toEnd(c);
        },
      },
      {
        id: "asReferred",
        title: "Failure: accepts the referral, records vestibular neuritis, starts gaze stabilization and never refers",
        reasoning: "missed",
        drive: (c) => {
          history(c);
          act(c, "diagnose", { dx: "peripheral" });
          act(c, "vor");
          toEnd(c);
        },
      },
    ],
  };
}
