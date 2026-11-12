// REQ-242 (AWS board sims, wave 2): golden paths for
// AWSDVA/canary-rollback-dlq, a learner-paced board case.
//
//   npm run sim:golden -- steps aws-dva-canary
import type { Ctl, StepsSpec } from "./steps.ts";
import { week } from "./aws-board-helpers.ts";

export const ENTRY = { course: "AWSDVA", slug: "canary-rollback-dlq" };

function logs(c: Ctl, a: "right" | "wrong"): void {
  c.act("functionLogs");
  if (c.run.state.openPrompt) c.choose(a);
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert: stack, CodeDeploy and function logs first; ssm:GetParameter on the one parameter; canary kept; redeploy; DLQ redriven",
        reasoning: "met",
        drive: (c) => {
          c.act("stackEvents");
          c.act("deployEvents");
          logs(c, "right");
          c.act("dlqPeek");
          c.act("grantSsm", { scope: "scoped" });
          c.act("redeploy");
          c.act("redrive");
          week(c);
        },
      },
      {
        id: "broadPolicy",
        title: "Finds the cause but fixes it with AmazonSSMReadOnlyAccess",
        reasoning: "partial",
        drive: (c) => {
          c.act("stackEvents");
          logs(c, "right");
          c.act("grantSsm", { scope: "broad" });
          c.act("redeploy");
          c.act("redrive");
          week(c);
        },
      },
      {
        id: "forgotDlq",
        title: "Fixes and ships correctly but forgets the DLQ; Wednesday the retention expires",
        reasoning: "partial",
        drive: (c) => {
          c.act("stackEvents");
          c.act("deployEvents");
          logs(c, "right");
          c.act("grantSsm", { scope: "scoped" });
          c.act("redeploy");
          week(c);
        },
      },
      {
        id: "retryBlind",
        title: "Redeploys unchanged hoping it was a fluke (rolled back again), then fixes it and purges the DLQ",
        reasoning: "missed",
        drive: (c) => {
          c.act("redeploy");
          c.act("deployEvents");
          logs(c, "wrong");
          c.act("grantSsm", { scope: "scoped" });
          c.act("redeploy");
          c.act("purge");
          week(c);
        },
      },
      {
        id: "noAlarm",
        title: "Failure: removes the alarm 'so the deploy sticks' and redeploys without a fix",
        reasoning: "missed",
        drive: (c) => {
          c.act("stackEvents");
          c.act("setStrategy", { how: "noAlarm" });
          c.act("redeploy");
        },
      },
    ],
  };
}
