// REQ-323 (health depth, round 2): golden paths for
// CEN/bee-sting-anaphylaxis-triage. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps cen-anaphylaxis
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CEN", slug: "bee-sting-anaphylaxis-triage" };

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
        title: "Expert at study pace: epinephrine, flat with legs up, oxygen, a bolus, the physician; airway check; second dose at 5 minutes; adjuncts after; report",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          act(c, "epi");
          act(c, "position");
          act(c, "oxygen");
          act(c, "bolus");
          act(c, "refer", { how: "md" });
          test(c, "airwayCk");
          act(c, "diagnose", { dx: "anaph" });
          upTo(c, 63);
          act(c, "epi");
          act(c, "antihist");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateRepeat",
        title: "Epinephrine, posture and fluid at once, but the second dose comes 11 minutes later",
        reasoning: "partial",
        drive: (c) => {
          act(c, "epi");
          act(c, "position");
          act(c, "bolus");
          test(c, "airwayCk");
          act(c, "diagnose", { dx: "anaph" });
          upTo(c, 135);
          act(c, "epi");
          act(c, "refer", { how: "md" });
          act(c, "antihist");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "adjunctFirst",
        title: "Antihistamine and steroid first, then epinephrine within 5 minutes and repeated on time",
        reasoning: "partial",
        drive: (c) => {
          act(c, "antihist");
          test(c, "hx");
          act(c, "epi");
          act(c, "position");
          act(c, "bolus");
          act(c, "refer", { how: "md" });
          upTo(c, 75);
          act(c, "epi");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "stoodUp",
        title: "Failure: one dose of epinephrine, then helps her stand to walk to the bathroom",
        reasoning: "missed",
        drive: (c) => {
          act(c, "epi");
          act(c, "stand");
          toEnd(c);
        },
      },
      {
        id: "waitForAntihistamine",
        title: "Failure: calls it a large local reaction, gives the antihistamine and waits for it to work",
        reasoning: "missed",
        drive: (c) => {
          act(c, "antihist");
          act(c, "diagnose", { dx: "local" });
          act(c, "refer", { how: "later" });
          toEnd(c);
        },
      },
    ],
  };
}
