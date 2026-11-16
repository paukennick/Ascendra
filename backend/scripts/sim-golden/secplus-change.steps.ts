// REQ-297: golden paths for the Security+ change management case on the
// security console (SECPLUS/firewall-change-backout.sim.json). Each task costs
// analyst time through the `work` wait, so the console's shared driver steps
// apply. No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, task, watchUntil } from "./secplus-helpers.ts";

export const ENTRY = { course: "SECPLUS", slug: "firewall-change-backout" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Change record and diff, the backout plan, an emergency change for the corrected rule, logons, stakeholders, test and records",
        reasoning: "met",
        drive: (c) => {
          task(c, "readChange");
          task(c, "diff");
          task(c, "backout");
          task(c, "emergency");
          task(c, "logons");
          task(c, "notify");
          task(c, "implement");
          task(c, "vendorTest");
          task(c, "docs");
          close(c);
          c.act("document", { lesson: "review" });
        },
      },
      {
        id: "hotfix",
        title: "Finds the wrong rule and fixes it live by hand, outside the change process",
        reasoning: "partial",
        drive: (c) => {
          task(c, "readChange");
          task(c, "diff");
          task(c, "hotfix");
          task(c, "logons");
          task(c, "notify");
          task(c, "vendorTest");
          task(c, "docs");
          close(c);
          c.act("document", { lesson: "review" });
        },
      },
      {
        id: "lateBackout",
        title: "Checks logons and calls people first; backs out after the guessing succeeds",
        reasoning: "partial",
        drive: (c) => {
          task(c, "readChange");
          task(c, "logons");
          task(c, "notify");
          task(c, "diff");
          watchUntil(c, 36);
          task(c, "backout");
          close(c);
          c.act("document", { lesson: "review" });
        },
      },
      {
        id: "deleteOnly",
        title: "Deletes the inbound rule by hand and closes, blaming the firewall",
        reasoning: "missed",
        drive: (c) => {
          task(c, "diff");
          task(c, "deleteRule");
          close(c);
          c.act("document", { lesson: "firewall" });
        },
      },
      {
        id: "stillExposed",
        title: "Closes at once, blaming the vendor",
        reasoning: "missed",
        drive: (c) => {
          close(c);
          c.act("document", { lesson: "vendor" });
        },
      },
      {
        id: "backoutOnly",
        title: "Backs out by the plan and checks logons, but leaves the vendor change and the records for later",
        reasoning: "partial",
        drive: (c) => {
          task(c, "readChange");
          task(c, "diff");
          task(c, "backout");
          task(c, "logons");
          close(c);
          c.act("document", { lesson: "review" });
        },
      },
    ],
  };
}
