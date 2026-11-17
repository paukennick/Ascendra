// REQ-325 (nursing depth, round 3): golden paths for
// CCRNADULT/pounding-headache-c6-injury. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps ccrn-ad
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CCRNADULT", slug: "pounding-headache-c6-injury" };

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
        title: "Expert at study pace: blood pressure; sat up and loosened; kinked catheter found and drained; autonomic dysreflexia; intensivist; documented and taught",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "bpCheck");
          act(c, "sit");
          act(c, "loose");
          test(c, "cath");
          act(c, "fix");
          act(c, "diagnose", { dx: "ad" });
          act(c, "refer", { how: "icu" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateSit",
        title: "Looks at the skin and bowel first, then leaves him lying for 3 minutes after the pressure before sitting him up",
        reasoning: "partial",
        drive: (c) => {
          test(c, "skin");
          test(c, "bowel");
          test(c, "bpCheck");
          upTo(c, 75);
          act(c, "sit");
          act(c, "loose");
          test(c, "cath");
          act(c, "fix");
          act(c, "diagnose", { dx: "ad" });
          act(c, "refer", { how: "icu" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "acetaminophen",
        title: "Sits him up and calls at once, but gives acetaminophen for the headache and leaves the binder on",
        reasoning: "partial",
        drive: (c) => {
          test(c, "bpCheck");
          act(c, "sit");
          act(c, "refer", { how: "icu" });
          act(c, "apap");
          test(c, "cath");
          act(c, "fix");
          act(c, "diagnose", { dx: "ad" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "laidFlat",
        title: "Failure: reads the pressure as a stroke, lays him flat with legs raised and leaves it for rounds",
        reasoning: "missed",
        drive: (c) => {
          test(c, "bpCheck");
          act(c, "diagnose", { dx: "stroke" });
          act(c, "flat");
          act(c, "refer", { how: "later" });
          toEnd(c);
        },
      },
      {
        id: "justPain",
        title: "Failure: sees the flushing, calls it a headache and gives acetaminophen",
        reasoning: "missed",
        drive: (c) => {
          test(c, "skin");
          act(c, "diagnose", { dx: "migraine" });
          act(c, "apap");
          toEnd(c);
        },
      },
    ],
  };
}
