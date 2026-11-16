// REQ-297: golden paths for the GCP Cloud Digital Leader cost governance case
// on the board screen (GCPCDL/bigquery-dashboard-bill.sim.json). Each task
// costs minutes through the `work` wait, so the console's shared driver steps
// apply. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, task, watchUntil } from "./secplus-helpers.ts";

export const ENTRY = { course: "GCPCDL", slug: "bigquery-dashboard-bill" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Billing reports and job history, find and call the owner, owner's fix, quota and owner alerts, labels and a monthly review",
        reasoning: "met",
        drive: (c) => {
          task(c, "billingReport");
          task(c, "jobsHistory");
          task(c, "findOwner");
          task(c, "meetOwner");
          task(c, "ownerFix");
          task(c, "setQuota");
          task(c, "ownerBudgetA");
          task(c, "labelsA");
          task(c, "costReview");
          close(c);
          c.act("document", { owner: "shared" });
        },
      },
      {
        id: "platformFix",
        title: "Traces the cost and fixes the dashboard without its owner; quota only",
        reasoning: "partial",
        drive: (c) => {
          task(c, "billingReport");
          task(c, "jobsHistory");
          task(c, "platformFix");
          task(c, "setQuota");
          watchUntil(c, 80);
          close(c);
          c.act("document", { owner: "platform" });
        },
      },
      {
        id: "revokeLate",
        title: "Cuts off the dashboard first, then engages the owner slowly: the fix lands after the 14:00 review",
        reasoning: "partial",
        drive: (c) => {
          task(c, "revokeDash");
          task(c, "billingReport");
          task(c, "findOwner");
          watchUntil(c, 240);
          task(c, "meetOwner");
          task(c, "ownerFix");
          task(c, "setQuota");
          task(c, "ownerBudgetA");
          watchUntil(c, 340);
          close(c);
          c.act("document", { owner: "shared" });
        },
      },
      {
        id: "disableBilling",
        title: "Disables billing on the project to stop the spend",
        reasoning: "missed",
        drive: (c) => {
          task(c, "billingReport");
          task(c, "disableBilling");
          close(c);
          c.act("document", { owner: "finance" });
        },
      },
      {
        id: "budgetOnly",
        title: "Adds a budget alert for the owner and closes: the dashboard keeps scanning the whole table",
        reasoning: "missed",
        drive: (c) => {
          task(c, "ownerBudgetA");
          close(c);
          c.act("document", { owner: "finance" });
        },
      },
      {
        id: "slowOwner",
        title: "Owner engaged and fixes it, but only in the afternoon; all guardrails added",
        reasoning: "partial",
        drive: (c) => {
          task(c, "billingReport");
          task(c, "findOwner");
          watchUntil(c, 180);
          task(c, "meetOwner");
          task(c, "ownerFix");
          task(c, "setQuota");
          task(c, "ownerBudgetA");
          task(c, "labelsA");
          task(c, "costReview");
          watchUntil(c, 300);
          close(c);
          c.act("document", { owner: "shared" });
        },
      },
    ],
  };
}
