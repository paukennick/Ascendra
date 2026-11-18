// REQ-335: golden paths for AWSANS/egress-allowlist-blocks-new-payment-api on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AWSANS", slug: "egress-allowlist-blocks-new-payment-api" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Alert log, allow list, HOME_NET, vendor guide; add names; template and alarm; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "alerts");
          run(c, "list");
          run(c, "homenet");
          run(c, "docs");
          run(c, "allow");
          run(c, "guard");
          run(c, "verify");
          waitUntil(c, 111);
          close(c);
          c.act("document", { cause: "sni" });
        },
      },
      {
        id: "harm",
        title: "Adds a pass-all 443 rule",
        reasoning: "missed",
        drive: (c) => {
          run(c, "alerts");
          run(c, "passall");
          run(c, "verify");
          waitUntil(c, 111);
          close(c);
          c.act("document", { cause: "sni" });
        },
      },
      {
        id: "noop",
        title: "Adds the IPs to the security group",
        reasoning: "partial",
        drive: (c) => {
          run(c, "alerts");
          run(c, "ip");
          run(c, "verify");
          waitUntil(c, 111);
          close(c);
          c.act("document", { cause: "sni" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads drops and the list, adds the names, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "alerts");
          run(c, "list");
          run(c, "allow");
          run(c, "verify");
          waitUntil(c, 111);
          close(c);
          c.act("document", { cause: "sni" });
        },
      },
      {
        id: "late",
        title: "Waits, adds the names after 23:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "alerts");
          waitUntil(c, 110);
          run(c, "allow");
          run(c, "verify");
          waitUntil(c, 118);
          close(c);
          c.act("document", { cause: "sni" });
        },
      },
      {
        id: "blind",
        title: "Adds names without looking and blames the security group",
        reasoning: "missed",
        drive: (c) => {
          run(c, "allow");
          waitUntil(c, 111);
          close(c);
          c.act("document", { cause: "sg" });
        },
      },
    ],
  };
}
