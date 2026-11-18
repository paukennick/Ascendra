// REQ-335: golden paths for AWSDEA/s3-eventbridge-rule-never-fires on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AWSDEA", slug: "s3-eventbridge-rule-never-fires" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Rule, bucket configuration, objects, metric; merge; template; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "rule");
          run(c, "notif");
          run(c, "objects");
          run(c, "metric");
          run(c, "merge");
          run(c, "template");
          run(c, "verify");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "delivery" });
        },
      },
      {
        id: "harm",
        title: "Puts only EventBridgeConfiguration",
        reasoning: "missed",
        drive: (c) => {
          run(c, "rule");
          run(c, "putOnly");
          run(c, "verify");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "delivery" });
        },
      },
      {
        id: "noop",
        title: "Widens the rule's pattern",
        reasoning: "partial",
        drive: (c) => {
          run(c, "rule");
          run(c, "widen");
          run(c, "verify");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "delivery" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads the rule and bucket, merges, verifies; no template change",
        reasoning: "partial",
        drive: (c) => {
          run(c, "rule");
          run(c, "notif");
          run(c, "merge");
          run(c, "verify");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "delivery" });
        },
      },
      {
        id: "late",
        title: "Waits, then merges after 09:30",
        reasoning: "partial",
        drive: (c) => {
          run(c, "rule");
          waitUntil(c, 40);
          run(c, "merge");
          run(c, "verify");
          waitUntil(c, 48);
          close(c);
          c.act("document", { cause: "delivery" });
        },
      },
      {
        id: "blind",
        title: "Merges without looking and blames the pattern",
        reasoning: "missed",
        drive: (c) => {
          run(c, "merge");
          waitUntil(c, 41);
          close(c);
          c.act("document", { cause: "pattern" });
        },
      },
    ],
  };
}
