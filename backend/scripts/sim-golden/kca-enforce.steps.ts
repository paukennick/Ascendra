// REQ-320: golden paths for KCA/policy-enforced-without-reading-reports on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "KCA", slug: "policy-enforced-without-reading-reports" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Denial, policy, reports, details, limit added, verified, back to Audit, owners told",
        reasoning: "met",
        drive: (c) => {
          run(c, "apply");
          run(c, "policy");
          run(c, "reports");
          run(c, "detail");
          run(c, "addLimit");
          run(c, "verify");
          run(c, "toAudit");
          run(c, "notify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "enforce" });
        },
      },
      {
        id: "deleteIt",
        title: "Deletes the policy",
        reasoning: "missed",
        drive: (c) => {
          run(c, "apply");
          run(c, "deletePolicy");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "enforce" });
        },
      },
      {
        id: "bgOff",
        title: "Turns off background scanning",
        reasoning: "missed",
        drive: (c) => {
          run(c, "apply");
          run(c, "backgroundOff");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "webhook" });
        },
      },
      {
        id: "excludeNs",
        title: "Excludes payments, verifies, sets Audit; no tickets",
        reasoning: "partial",
        drive: (c) => {
          run(c, "apply");
          run(c, "reports");
          run(c, "exclude");
          run(c, "verify");
          run(c, "toAudit");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "enforce" });
        },
      },
      {
        id: "late",
        title: "Turns off background scanning and waits, then adds the limit after 14:30",
        reasoning: "partial",
        drive: (c) => {
          run(c, "backgroundOff");
          waitUntil(c, 51);
          run(c, "apply");
          run(c, "addLimit");
          run(c, "verify");
          close(c);
          c.act("document", { cause: "enforce" });
        },
      },
      {
        id: "blind",
        title: "Adds the limit without reading anything",
        reasoning: "missed",
        drive: (c) => {
          run(c, "addLimit");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "rbac" });
        },
      },
    ],
  };
}
