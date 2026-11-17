// REQ-323 (health depth, round 2): golden paths for
// CMSRN/delirium-night-prn-restraint-order. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps cmsrn-restraint
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CMSRN", slug: "delirium-night-prn-restraint-order" };

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
        title: "Expert at study pace: low bed and alarm, a sitter, delirium screen, pain, bladder scan; catheter; reorientation; IV covered; report and document",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          act(c, "lowbed");
          act(c, "sitter");
          test(c, "cam");
          test(c, "pain");
          test(c, "bladder");
          act(c, "cath");
          act(c, "orient");
          act(c, "sleeve");
          act(c, "diagnose", { dx: "delirium" });
          act(c, "refer", { how: "md" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateSafety",
        title: "Finds and drains the retention, but the low bed and alarm wait 12 minutes",
        reasoning: "partial",
        drive: (c) => {
          test(c, "cam");
          test(c, "pain");
          test(c, "bladder");
          act(c, "cath");
          act(c, "orient");
          upTo(c, 145);
          act(c, "lowbed");
          act(c, "sitter");
          act(c, "diagnose", { dx: "delirium" });
          act(c, "refer", { how: "md" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "noScreen",
        title: "Safety first and the retention drained, but no delirium screen or reorientation",
        reasoning: "partial",
        drive: (c) => {
          act(c, "lowbed");
          act(c, "sitter");
          test(c, "bladder");
          act(c, "cath");
          act(c, "refer", { how: "md" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "restrained",
        title: "Failure: applies wrist restraints under the PRN order from admission",
        reasoning: "missed",
        drive: (c) => {
          act(c, "restrain");
          act(c, "diagnose", { dx: "behavior" });
          toEnd(c);
        },
      },
      {
        id: "askForSedation",
        title: "Failure: checks her pain, calls it dementia and asks the provider for sedation; no precautions",
        reasoning: "missed",
        drive: (c) => {
          test(c, "pain");
          act(c, "diagnose", { dx: "dementia" });
          act(c, "refer", { how: "sedate" });
          toEnd(c);
        },
      },
    ],
  };
}
