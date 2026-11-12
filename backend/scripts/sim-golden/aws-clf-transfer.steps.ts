// REQ-242 (AWS board sims, wave 2): golden paths for
// AWSCLF/data-transfer-surprise, a learner-paced board case.
//
//   npm run sim:golden -- steps aws-clf-transfer
import type { Ctl, StepsSpec } from "./steps.ts";
import { week } from "./aws-board-helpers.ts";

export const ENTRY = { course: "AWSCLF", slug: "data-transfer-surprise" };

function ce(c: Ctl, a: "right" | "wrong"): void {
  c.act("costExplorer");
  if (c.run.state.openPrompt) c.choose(a);
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert: Cost Explorer and the replication rules, the owner confirms, only the DR-test rule off, CloudFront for videos, budget alert",
        reasoning: "met",
        drive: (c) => {
          ce(c, "right");
          c.act("replRules");
          c.act("askOwner");
          c.act("stopTestRepl");
          c.act("addCloudFront");
          c.act("budgets");
          week(c);
        },
      },
      {
        id: "noAsk",
        title: "Finds the cause and turns the rule off without asking its owner",
        reasoning: "partial",
        drive: (c) => {
          ce(c, "right");
          c.act("replRules");
          c.act("stopTestRepl");
          c.act("budgets");
          week(c);
        },
      },
      {
        id: "cloudFrontOnly",
        title: "Adds CloudFront on a hunch, then investigates but never turns the rule off: still over budget",
        reasoning: "missed",
        drive: (c) => {
          c.act("addCloudFront");
          ce(c, "wrong");
          c.act("replRules");
          c.act("askOwner");
          week(c);
        },
      },
      {
        id: "oneAz",
        title: "Failure: fixes the replication, then squeezes out the cross-AZ charge; Wednesday's AZ impairment takes the site down",
        reasoning: "partial",
        drive: (c) => {
          ce(c, "right");
          c.act("replRules");
          c.act("askOwner");
          c.act("stopTestRepl");
          c.act("oneAz");
          week(c);
        },
      },
      {
        id: "stopAll",
        title: "Failure: reads 'Region to Region is expensive' and turns off all replication; Thursday's backups are lost",
        reasoning: "missed",
        drive: (c) => {
          ce(c, "right");
          c.act("stopAllRepl");
          c.act("budgets");
          week(c);
        },
      },
    ],
  };
}
