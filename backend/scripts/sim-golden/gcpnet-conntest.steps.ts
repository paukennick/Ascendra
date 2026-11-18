// REQ-335: golden paths for GCPNET/folder-policy-deny-blocks-app-to-db on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "GCPNET", slug: "folder-policy-deny-blocks-app-to-db" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Connectivity Test, policy rules, effective firewalls, intent; goto_next; preflight tests; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "ct");
          run(c, "pol");
          run(c, "eff");
          run(c, "intent");
          run(c, "goto");
          run(c, "preflight");
          run(c, "verify");
          waitUntil(c, 56);
          close(c);
          c.act("document", { cause: "hierarchy" });
        },
      },
      {
        id: "harm",
        title: "Detaches the folder policy",
        reasoning: "missed",
        drive: (c) => {
          run(c, "ct");
          run(c, "detach");
          run(c, "verify");
          waitUntil(c, 56);
          close(c);
          c.act("document", { cause: "hierarchy" });
        },
      },
      {
        id: "noop",
        title: "Raises the VPC rule's priority",
        reasoning: "partial",
        drive: (c) => {
          run(c, "ct");
          run(c, "vpcprio");
          run(c, "verify");
          waitUntil(c, 56);
          close(c);
          c.act("document", { cause: "hierarchy" });
        },
      },
      {
        id: "fixOnly",
        title: "Runs the test and reads the policy, adds goto_next, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "ct");
          run(c, "pol");
          run(c, "goto");
          run(c, "verify");
          waitUntil(c, 56);
          close(c);
          c.act("document", { cause: "hierarchy" });
        },
      },
      {
        id: "late",
        title: "Waits, fixes after 16:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "ct");
          waitUntil(c, 55);
          run(c, "goto");
          run(c, "verify");
          waitUntil(c, 63);
          close(c);
          c.act("document", { cause: "hierarchy" });
        },
      },
      {
        id: "blind",
        title: "Adds the rule without looking and blames routing",
        reasoning: "missed",
        drive: (c) => {
          run(c, "goto");
          waitUntil(c, 56);
          close(c);
          c.act("document", { cause: "route" });
        },
      },
    ],
  };
}
