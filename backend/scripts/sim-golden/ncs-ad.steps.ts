// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// ABPTSNCS/tilt-table-pounding-headache-t4. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps ncs-ad
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSNCS", slug: "tilt-table-pounding-headache-t4" };

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
        title: "Expert at study pace: pressure, sits up and loosens, calls, frees the catheter, skin and bowel, documents",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "bpCheck");
          act(c, "sit");
          act(c, "diagnose", { dx: "ad" });
          act(c, "refer", { how: "rrt" });
          act(c, "cath");
          test(c, "skin");
          test(c, "bowel");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Sits him up and frees the catheter, but calls 6 minutes later",
        reasoning: "partial",
        drive: (c) => {
          test(c, "bpCheck");
          act(c, "sit");
          act(c, "cath");
          test(c, "skin");
          test(c, "bowel");
          upTo(c, 85);
          act(c, "diagnose", { dx: "ad" });
          act(c, "refer", { how: "rrt" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "flatFirst",
        title: "Lays him flat first, then calls; never finds the trigger",
        reasoning: "partial",
        drive: (c) => {
          test(c, "bpCheck");
          act(c, "flat");
          act(c, "diagnose", { dx: "ad" });
          act(c, "refer", { how: "rrt" });
          act(c, "sit");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "ortho",
        title: "Failure: calls it orthostatic, lays him flat with legs up and leaves it for later",
        reasoning: "missed",
        drive: (c) => {
          test(c, "bpCheck");
          act(c, "diagnose", { dx: "ortho" });
          act(c, "flat");
          act(c, "refer", { how: "later" });
          toEnd(c);
        },
      },
      {
        id: "migraine",
        title: "Failure: calls it a migraine and lets him rest in the frame",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "migraine" });
          act(c, "rest");
          toEnd(c);
        },
      },
    ],
  };
}
