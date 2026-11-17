// REQ-323 (health depth, round 2): golden paths for
// NPTEPTA/pta-back-pain-new-bladder-symptoms. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps pta-ces
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "NPTEPTA", slug: "pta-back-pain-new-bladder-symptoms" };

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
        title: "Expert at study pace: check-in, the bladder and saddle screen, strength and reflexes; no treatment; the PT now; data in the note; hand-off documented",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "check");
          test(c, "ces");
          test(c, "neuro");
          act(c, "diagnose", { dx: "data" });
          act(c, "refer", { how: "pt" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateReport",
        title: "Screens and collects data, then measures more and tells the PT more than 5 minutes after the first red flag",
        reasoning: "partial",
        drive: (c) => {
          test(c, "check");
          test(c, "ces");
          test(c, "neuro");
          test(c, "vitals");
          test(c, "outcome");
          upTo(c, 110);
          act(c, "diagnose", { dx: "data" });
          act(c, "refer", { how: "pt" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "bypassPt",
        title: "Screens and collects data, writes a diagnosis and sends her to the emergency department without the PT",
        reasoning: "partial",
        drive: (c) => {
          test(c, "check");
          test(c, "ces");
          test(c, "neuro");
          act(c, "diagnose", { dx: "diagnosis" });
          act(c, "refer", { how: "ed" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "saveForVisit8",
        title: "Failure: hears the bladder symptoms, exercises her anyway, notes 'tolerated well' and leaves it for visit 8",
        reasoning: "missed",
        drive: (c) => {
          test(c, "check");
          test(c, "ces");
          act(c, "exercise");
          act(c, "diagnose", { dx: "routine" });
          act(c, "refer", { how: "note" });
          toEnd(c);
        },
      },
      {
        id: "callYourDoctor",
        title: "Failure: hears the bladder symptoms and tells her to call her doctor if it gets worse",
        reasoning: "missed",
        drive: (c) => {
          test(c, "check");
          test(c, "ces");
          test(c, "neuro");
          act(c, "refer", { how: "home" });
          toEnd(c);
        },
      },
      {
        id: "tractionFirst",
        title: "Failure: no screen; traction and exercise straight away, no decision",
        reasoning: "missed",
        drive: (c) => {
          act(c, "traction");
          act(c, "exercise");
          toEnd(c);
        },
      },
    ],
  };
}
