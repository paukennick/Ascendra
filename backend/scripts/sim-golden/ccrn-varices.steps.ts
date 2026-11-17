// REQ-325 (nursing depth, round 3): golden paths for
// CCRNADULT/cirrhosis-hematemesis-at-night. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps ccrn-varices
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CCRNADULT", slug: "cirrhosis-hematemesis-at-night" };

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
        title: "Expert at study pace: airway first; two large-bore IVs; variceal bleed; intensivist; octreotide, antibiotic, blood to goal; documented",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "airway");
          act(c, "side");
          act(c, "access");
          act(c, "diagnose", { dx: "varix" });
          act(c, "refer", { how: "icu" });
          upTo(c, 52);
          act(c, "vaso");
          act(c, "abx");
          act(c, "blood");
          test(c, "labs");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Examines the abdomen and reads labs before the airway; calls 6 minutes after the hematemesis is assessed",
        reasoning: "partial",
        drive: (c) => {
          test(c, "abdomen");
          test(c, "labs");
          test(c, "airway");
          act(c, "side");
          act(c, "access");
          act(c, "diagnose", { dx: "varix" });
          upTo(c, 110);
          act(c, "refer", { how: "icu" });
          upTo(c, 150);
          act(c, "vaso");
          act(c, "abx");
          act(c, "blood");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "overTransfuse",
        title: "Does it all fast but keeps transfusing past the goal to a hemoglobin above 10",
        reasoning: "partial",
        drive: (c) => {
          test(c, "airway");
          act(c, "side");
          act(c, "access");
          act(c, "refer", { how: "icu" });
          act(c, "diagnose", { dx: "varix" });
          upTo(c, 52);
          act(c, "vaso");
          act(c, "abx");
          act(c, "blood");
          act(c, "over");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "ulcer",
        title: "Failure: calls it an ulcer, leaves him on his back with one small IV and rechecks in two hours",
        reasoning: "missed",
        drive: (c) => {
          test(c, "abdomen");
          act(c, "diagnose", { dx: "ulcer" });
          act(c, "refer", { how: "wait" });
          toEnd(c);
        },
      },
      {
        id: "nosebleed",
        title: "Failure: assesses his airway but calls it swallowed blood and does nothing more",
        reasoning: "missed",
        drive: (c) => {
          test(c, "airway");
          act(c, "diagnose", { dx: "swallowed" });
          toEnd(c);
        },
      },
    ],
  };
}
