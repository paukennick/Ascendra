// REQ-323 (health depth, round 2): golden paths for
// CEN/tearing-pain-heparin-ordered. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps cen-dissection
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CEN", slug: "tearing-pain-heparin-ordered" };

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
        title: "Expert at study pace: the pain story, both arms and pulses; heparin held and the physician told; beta-blocker, then vasodilator; hand-off",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "pain");
          test(c, "arms");
          act(c, "diagnose", { dx: "aad" });
          act(c, "refer", { how: "md" });
          act(c, "beta");
          upTo(c, 60);
          act(c, "vaso");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Neuro check, pain story and both arms, then waits 8 minutes before calling; infusions in order",
        reasoning: "partial",
        drive: (c) => {
          test(c, "neuro");
          test(c, "pain");
          test(c, "arms");
          act(c, "diagnose", { dx: "aad" });
          upTo(c, 110);
          act(c, "refer", { how: "md" });
          act(c, "beta");
          upTo(c, 170);
          act(c, "vaso");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "vasoFirst",
        title: "Recognizes and calls promptly, but starts the vasodilator before the beta-blocker",
        reasoning: "partial",
        drive: (c) => {
          test(c, "pain");
          test(c, "arms");
          act(c, "diagnose", { dx: "aad" });
          act(c, "refer", { how: "md" });
          act(c, "vaso");
          upTo(c, 40);
          act(c, "beta");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "gaveHeparin",
        title: "Failure: a quick neuro check, then gives the heparin as ordered",
        reasoning: "missed",
        drive: (c) => {
          test(c, "neuro");
          act(c, "heparin");
          toEnd(c);
        },
      },
      {
        id: "analgesiaOnly",
        title: "Failure: hears the tearing pain, calls it NSTEMI and asks only for analgesia",
        reasoning: "missed",
        drive: (c) => {
          test(c, "pain");
          act(c, "diagnose", { dx: "nstemi" });
          act(c, "refer", { how: "update" });
          toEnd(c);
        },
      },
    ],
  };
}
