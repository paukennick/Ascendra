// REQ-335: golden paths for AWSSAP/region-scp-blocks-global-services on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AWSSAP", slug: "region-scp-blocks-global-services" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "CloudTrail, policy, targets, role; exempt global services; review; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "trail");
          run(c, "policy");
          run(c, "targets");
          run(c, "role");
          run(c, "exempt");
          run(c, "review");
          run(c, "verify");
          waitUntil(c, 56);
          close(c);
          c.act("document", { cause: "globals" });
        },
      },
      {
        id: "harm",
        title: "Detaches the SCP",
        reasoning: "missed",
        drive: (c) => {
          run(c, "trail");
          run(c, "detach");
          run(c, "verify");
          waitUntil(c, 56);
          close(c);
          c.act("document", { cause: "globals" });
        },
      },
      {
        id: "noop",
        title: "Gives the role AdministratorAccess",
        reasoning: "partial",
        drive: (c) => {
          run(c, "trail");
          run(c, "admin");
          run(c, "verify");
          waitUntil(c, 56);
          close(c);
          c.act("document", { cause: "globals" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads the deny and the policy, exempts, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "trail");
          run(c, "policy");
          run(c, "exempt");
          run(c, "verify");
          waitUntil(c, 56);
          close(c);
          c.act("document", { cause: "globals" });
        },
      },
      {
        id: "late",
        title: "Waits, fixes after 16:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "trail");
          waitUntil(c, 55);
          run(c, "exempt");
          run(c, "verify");
          waitUntil(c, 63);
          close(c);
          c.act("document", { cause: "globals" });
        },
      },
      {
        id: "blind",
        title: "Exempts without looking and blames the role",
        reasoning: "missed",
        drive: (c) => {
          run(c, "exempt");
          waitUntil(c, 56);
          close(c);
          c.act("document", { cause: "role" });
        },
      },
    ],
  };
}
