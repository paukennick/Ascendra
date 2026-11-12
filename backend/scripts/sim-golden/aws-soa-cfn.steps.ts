// REQ-242 (AWS board sims, wave 2): golden paths for
// AWSSOA/stack-update-rollback-failed, a learner-paced board case.
//
//   npm run sim:golden -- steps aws-soa-cfn
import type { Ctl, StepsSpec } from "./steps.ts";
import { week } from "./aws-board-helpers.ts";

export const ENTRY = { course: "AWSSOA", slug: "stack-update-rollback-failed" };

function ips(c: Ctl, a: "right" | "wrong"): void {
  c.act("subnetIps");
  if (c.run.state.openPrompt) c.choose(a);
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert: events, subnets and CloudTrail first; continue the rollback skipping the deleted group; two /24 subnets; rerun through a change set",
        reasoning: "met",
        drive: (c) => {
          c.act("stackEvents");
          ips(c, "right");
          c.act("trailSg");
          c.act("continueRollback", { how: "skip" });
          c.act("fixSubnets", { how: "new24" });
          c.act("rerunUpdate", { how: "changeset" });
          week(c);
        },
      },
      {
        id: "direct",
        title: "Recovers and fixes correctly, but reruns the update directly without a change set",
        reasoning: "met",
        drive: (c) => {
          c.act("stackEvents");
          ips(c, "right");
          c.act("continueRollback", { how: "skip" });
          c.act("fixSubnets", { how: "new24" });
          c.act("rerunUpdate", { how: "direct" });
          week(c);
        },
      },
      {
        id: "recreateFirst",
        title: "Recreates the group by hand before reading anything, retries the rollback, then finds the right fix",
        reasoning: "partial",
        drive: (c) => {
          c.act("recreateSg");
          c.act("stackEvents");
          ips(c, "right");
          c.act("continueRollback", { how: "plain" });
          c.act("continueRollback", { how: "skip" });
          c.act("fixSubnets", { how: "new24" });
          c.act("rerunUpdate", { how: "changeset" });
          c.act("trailSg");
          week(c);
        },
      },
      {
        id: "resize",
        title: "Failure: recovers the stack, tries to resize the /28s, reruns anyway; the sale runs on 4 instances",
        reasoning: "partial",
        drive: (c) => {
          c.act("stackEvents");
          ips(c, "wrong");
          c.act("continueRollback", { how: "skip" });
          c.act("fixSubnets", { how: "resize" });
          c.act("rerunUpdate", { how: "direct" });
          week(c);
        },
      },
      {
        id: "deleteStack",
        title: "Failure: deletes the stack to start clean; the shop is down for three hours",
        reasoning: "missed",
        drive: (c) => {
          c.act("stackEvents");
          c.act("deleteStack");
        },
      },
    ],
  };
}
