// REQ-335: golden paths for AWSANS/vpn-large-responses-hang-pmtud-blocked on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AWSANS", slug: "vpn-large-responses-hang-pmtud-blocked" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "MTU and path, ACL, flow logs, SG; ICMP rule; template; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "mtu");
          run(c, "acl");
          run(c, "flow");
          run(c, "sg");
          run(c, "allowicmp");
          run(c, "record");
          run(c, "verify");
          waitUntil(c, 81);
          close(c);
          c.act("document", { cause: "pmtud" });
        },
      },
      {
        id: "harm",
        title: "Opens the ACL to all traffic",
        reasoning: "missed",
        drive: (c) => {
          run(c, "mtu");
          run(c, "openall");
          run(c, "verify");
          waitUntil(c, 81);
          close(c);
          c.act("document", { cause: "pmtud" });
        },
      },
      {
        id: "noop",
        title: "Resizes the servers",
        reasoning: "partial",
        drive: (c) => {
          run(c, "mtu");
          run(c, "resize");
          run(c, "verify");
          waitUntil(c, 81);
          close(c);
          c.act("document", { cause: "pmtud" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads MTU and ACL, adds the ICMP rule, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "mtu");
          run(c, "acl");
          run(c, "allowicmp");
          run(c, "verify");
          waitUntil(c, 81);
          close(c);
          c.act("document", { cause: "pmtud" });
        },
      },
      {
        id: "late",
        title: "Waits, adds the rule after 10:30",
        reasoning: "partial",
        drive: (c) => {
          run(c, "mtu");
          waitUntil(c, 80);
          run(c, "allowicmp");
          run(c, "verify");
          waitUntil(c, 88);
          close(c);
          c.act("document", { cause: "pmtud" });
        },
      },
      {
        id: "blind",
        title: "Adds the rule without looking and blames bandwidth",
        reasoning: "missed",
        drive: (c) => {
          run(c, "allowicmp");
          waitUntil(c, 81);
          close(c);
          c.act("document", { cause: "bw" });
        },
      },
    ],
  };
}
