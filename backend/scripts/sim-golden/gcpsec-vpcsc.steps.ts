// REQ-335: golden paths for GCPSEC/vpcsc-blocks-partner-delivery-export on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "GCPSEC", slug: "vpcsc-blocks-partner-delivery-export" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Violation, dry-run history, perimeter, IAM; egress rule; review; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "log");
          run(c, "dry");
          run(c, "perim");
          run(c, "iam");
          run(c, "egress");
          run(c, "review");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "egress" });
        },
      },
      {
        id: "harm",
        title: "Removes the project from the perimeter",
        reasoning: "missed",
        drive: (c) => {
          run(c, "log");
          run(c, "remove");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "egress" });
        },
      },
      {
        id: "noop",
        title: "Grants more IAM",
        reasoning: "partial",
        drive: (c) => {
          run(c, "log");
          run(c, "iamagain");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "egress" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads the violation and dry run, adds the rule, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "log");
          run(c, "dry");
          run(c, "egress");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "egress" });
        },
      },
      {
        id: "late",
        title: "Waits, adds the rule after 22:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "log");
          waitUntil(c, 50);
          run(c, "egress");
          run(c, "verify");
          waitUntil(c, 58);
          close(c);
          c.act("document", { cause: "egress" });
        },
      },
      {
        id: "blind",
        title: "Adds a rule without looking and blames IAM",
        reasoning: "missed",
        drive: (c) => {
          run(c, "egress");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "iam" });
        },
      },
    ],
  };
}
