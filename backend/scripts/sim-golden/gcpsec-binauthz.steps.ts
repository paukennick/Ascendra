// REQ-335: golden paths for GCPSEC/unsigned-hotfix-blocked-by-binauthz on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "GCPSEC", slug: "unsigned-hotfix-blocked-by-binauthz" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Denial, policy, scan, pipeline; CI and deploy; breakglass runbook; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "deny");
          run(c, "policyshow");
          run(c, "scan");
          run(c, "pipeline");
          run(c, "ci");
          run(c, "breakglass");
          run(c, "verify");
          waitUntil(c, 56);
          close(c);
          c.act("document", { cause: "unattested" });
        },
      },
      {
        id: "harm",
        title: "Sets the policy to allow all images",
        reasoning: "missed",
        drive: (c) => {
          run(c, "deny");
          run(c, "allowall");
          run(c, "verify");
          waitUntil(c, 56);
          close(c);
          c.act("document", { cause: "unattested" });
        },
      },
      {
        id: "noop",
        title: "Retries the rollout",
        reasoning: "partial",
        drive: (c) => {
          run(c, "deny");
          run(c, "redeploy");
          run(c, "verify");
          waitUntil(c, 56);
          close(c);
          c.act("document", { cause: "unattested" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads denial and policy, ships through CI, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "deny");
          run(c, "policyshow");
          run(c, "ci");
          run(c, "verify");
          waitUntil(c, 56);
          close(c);
          c.act("document", { cause: "unattested" });
        },
      },
      {
        id: "late",
        title: "Waits, starts CI after 15:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "deny");
          waitUntil(c, 55);
          run(c, "ci");
          run(c, "verify");
          waitUntil(c, 63);
          close(c);
          c.act("document", { cause: "unattested" });
        },
      },
      {
        id: "blind",
        title: "Runs CI without looking and blames the policy",
        reasoning: "missed",
        drive: (c) => {
          run(c, "ci");
          waitUntil(c, 56);
          close(c);
          c.act("document", { cause: "policy" });
        },
      },
    ],
  };
}
