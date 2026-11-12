// REQ-242 (AWS board sims, wave 2): golden paths for AWSMLA/loan-data-bias,
// a learner-paced board case.
//
//   npm run sim:golden -- steps aws-mla-bias
import type { Ctl, StepsSpec } from "./steps.ts";
import { week } from "./aws-board-helpers.ts";

export const ENTRY = { course: "AWSMLA", slug: "loan-data-bias" };

function clarify(c: Ctl, a: "right" | "wrong"): void {
  c.act("clarify");
  if (c.run.state.openPrompt) c.choose(a);
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert: Clarify, the split and the labels first; stratified split, oversampling after the split, policy-era labels out, bias review",
        reasoning: "met",
        drive: (c) => {
          clarify(c, "right");
          c.act("splitCheck");
          c.act("labelHistory");
          c.act("resplit", { how: "stratified" });
          c.act("rebalanceData", { how: "after" });
          c.act("dropEra");
          c.act("releaseModel", { how: "review" });
          week(c);
        },
      },
      {
        id: "keepEra",
        title: "Fixes the split and rebalances correctly but keeps the policy-era labels; passes review just inside the limit",
        reasoning: "partial",
        drive: (c) => {
          clarify(c, "right");
          c.act("splitCheck");
          c.act("resplit", { how: "stratified" });
          c.act("rebalanceData", { how: "after" });
          c.act("releaseModel", { how: "review" });
          week(c);
        },
      },
      {
        id: "randomSplit",
        title: "Shuffles but does not stratify; review passes but the split is weaker than it should be",
        reasoning: "partial",
        drive: (c) => {
          clarify(c, "right");
          c.act("splitCheck");
          c.act("labelHistory");
          c.act("resplit", { how: "random" });
          c.act("rebalanceData", { how: "after" });
          c.act("dropEra");
          c.act("releaseModel", { how: "review" });
          week(c);
        },
      },
      {
        id: "leak",
        title: "Oversamples before splitting: the 0.97 AUC is inflated and review rejects it",
        reasoning: "partial",
        drive: (c) => {
          clarify(c, "wrong");
          c.act("splitCheck");
          c.act("resplit", { how: "stratified" });
          c.act("rebalanceData", { how: "before" });
          c.act("releaseModel", { how: "review" });
          week(c);
        },
      },
      {
        id: "dropAge",
        title: "Drops the age column on a hunch and never reads the split; the gap barely moves",
        reasoning: "missed",
        drive: (c) => {
          c.act("rebalanceData", { how: "dropAge" });
          clarify(c, "right");
          c.act("releaseModel", { how: "review" });
          week(c);
        },
      },
      {
        id: "shipNow",
        title: "Failure: good data work, then ships without the bias review",
        reasoning: "partial",
        drive: (c) => {
          clarify(c, "right");
          c.act("splitCheck");
          c.act("resplit", { how: "stratified" });
          c.act("rebalanceData", { how: "after" });
          c.act("releaseModel", { how: "ship" });
        },
      },
    ],
  };
}
