// REQ-233 (bedside wave 1): golden paths for AWSSAA/nat-gateway-bill-spike,
// a learner-paced board case (no pacing commands). Expectations are the
// engine's own results, re-checked by every `npm test` (lint + documents).
//
//   npm run sim:golden -- steps aws-nat
import type { Ctl, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "AWSSAA", slug: "nat-gateway-bill-spike" };

function week(c: Ctl): void {
  c.act("runWeek");
  c.answer();
  for (let i = 0; i < 5 && c.run.state.ended === null; i++) c.skip("dayT");
}

function endpoint(c: Ctl, rt: string, backup: "right" | "wrong"): void {
  c.act("endpoint", { rt });
  if (c.run.state.openPrompt) c.choose(backup);
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert: Cost Explorer and flow logs first, a gateway endpoint on both route tables, both NAT gateways kept, budget alert and anomaly monitor",
        reasoning: "met",
        drive: (c) => {
          c.act("costExplorer");
          c.act("flowLogs");
          endpoint(c, "both", "right");
          c.act("budgets");
          c.act("anomalyOn");
          week(c);
        },
      },
      {
        id: "oneRouteTable",
        title: "Investigates, but the endpoint goes on the AZ a route table only and no alerting: still over budget",
        reasoning: "partial",
        drive: (c) => {
          c.act("costExplorer");
          c.act("flowLogs");
          endpoint(c, "a", "right");
          week(c);
        },
      },
      {
        id: "guessFirst",
        title: "Adds the endpoint on a hunch before looking at any data, thinks it covers the backup, one alert",
        reasoning: "partial",
        drive: (c) => {
          endpoint(c, "both", "wrong");
          c.act("costExplorer");
          c.act("flowLogs");
          c.act("budgets");
          week(c);
        },
      },
      {
        id: "consolidateNat",
        title: "Failure: the endpoint, then deletes NAT gateway B to save $33 a month; Thursday's AZ a impairment takes checkout down",
        reasoning: "partial",
        drive: (c) => {
          c.act("costExplorer");
          c.act("flowLogs");
          endpoint(c, "both", "right");
          c.act("removeNatB");
          c.act("anomalyOn");
          week(c);
        },
      },
      {
        id: "deleteAllNat",
        title: "Failure: reads the bill as 'NAT is expensive' and deletes both NAT gateways",
        reasoning: "missed",
        drive: (c) => {
          c.act("costExplorer");
          c.act("removeNats");
        },
      },
    ],
  };
}
