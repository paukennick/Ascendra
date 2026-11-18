// REQ-335: golden paths for AZ140/start-vm-on-connect-after-rg-move on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AZ140", slug: "start-vm-on-connect-after-rg-move" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Activity log, role scope, host pool, VM state; assign; code and runbook; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "activity");
          run(c, "rbac");
          run(c, "hostpool");
          run(c, "vmstate");
          run(c, "assign");
          run(c, "move");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "scope" });
        },
      },
      {
        id: "harm",
        title: "Gives the service principal Contributor",
        reasoning: "missed",
        drive: (c) => {
          run(c, "activity");
          run(c, "contrib");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "scope" });
        },
      },
      {
        id: "noop",
        title: "Toggles the feature",
        reasoning: "partial",
        drive: (c) => {
          run(c, "activity");
          run(c, "toggle");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "scope" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads the failure and the scope, assigns, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "activity");
          run(c, "rbac");
          run(c, "assign");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "scope" });
        },
      },
      {
        id: "late",
        title: "Waits, assigns after 08:30",
        reasoning: "partial",
        drive: (c) => {
          run(c, "activity");
          waitUntil(c, 50);
          run(c, "assign");
          run(c, "verify");
          waitUntil(c, 58);
          close(c);
          c.act("document", { cause: "scope" });
        },
      },
      {
        id: "blind",
        title: "Assigns without looking and blames the feature",
        reasoning: "missed",
        drive: (c) => {
          run(c, "assign");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "feature" });
        },
      },
    ],
  };
}
