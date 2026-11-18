// REQ-335: golden paths for AWSANS/new-vpc-attachment-not-propagated on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AWSANS", slug: "new-vpc-attachment-not-propagated" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Attachment, shared routes, VPC routes, analyzer; associate and propagate; module and check; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "assoc");
          run(c, "routes");
          run(c, "vpcrt");
          run(c, "ra");
          run(c, "attach");
          run(c, "guard");
          run(c, "verify");
          waitUntil(c, 81);
          close(c);
          c.act("document", { cause: "assoc" });
        },
      },
      {
        id: "harm",
        title: "Joins the shared table and propagates everywhere",
        reasoning: "missed",
        drive: (c) => {
          run(c, "assoc");
          run(c, "flat");
          run(c, "verify");
          waitUntil(c, 81);
          close(c);
          c.act("document", { cause: "assoc" });
        },
      },
      {
        id: "noop",
        title: "Reboots the analytics instances",
        reasoning: "partial",
        drive: (c) => {
          run(c, "assoc");
          run(c, "reboot");
          run(c, "verify");
          waitUntil(c, 81);
          close(c);
          c.act("document", { cause: "assoc" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads attachment and routes, associates and propagates, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "assoc");
          run(c, "routes");
          run(c, "attach");
          run(c, "verify");
          waitUntil(c, 81);
          close(c);
          c.act("document", { cause: "assoc" });
        },
      },
      {
        id: "late",
        title: "Waits, fixes after 14:30",
        reasoning: "partial",
        drive: (c) => {
          run(c, "assoc");
          waitUntil(c, 80);
          run(c, "attach");
          run(c, "verify");
          waitUntil(c, 88);
          close(c);
          c.act("document", { cause: "assoc" });
        },
      },
      {
        id: "blind",
        title: "Associates without looking and blames the AD servers",
        reasoning: "missed",
        drive: (c) => {
          run(c, "attach");
          waitUntil(c, 81);
          close(c);
          c.act("document", { cause: "ad" });
        },
      },
    ],
  };
}
