// REQ-320: golden paths for AZ700/stale-udr-to-retired-nva on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AZ700", slug: "stale-udr-to-retired-nva" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Next hop, effective routes, change log, firewall IP, route updated, connection test, firewall log",
        reasoning: "met",
        drive: (c) => {
          run(c, "nextHop");
          run(c, "effective");
          run(c, "changeLog");
          run(c, "firewallIp");
          run(c, "fixRoute");
          run(c, "verify");
          run(c, "fwLogs");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "staleudr" });
        },
      },
      {
        id: "bypass",
        title: "Deletes the route so traffic flows",
        reasoning: "missed",
        drive: (c) => {
          run(c, "nextHop");
          run(c, "deleteRoute");
          run(c, "verify");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "staleudr" });
        },
      },
      {
        id: "symptoms",
        title: "Adds an NSG allow rule and restarts the VM",
        reasoning: "missed",
        drive: (c) => {
          run(c, "nsgAllow");
          run(c, "restartVm");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "nsg" });
        },
      },
      {
        id: "guessIp",
        title: "Finds the route and fixes it without checking the firewall or verifying",
        reasoning: "partial",
        drive: (c) => {
          run(c, "nextHop");
          run(c, "fixRoute");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "staleudr" });
        },
      },
      {
        id: "nsgThenFix",
        title: "Adds an NSG rule first, then finds and fixes the route and verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "nsgAllow");
          run(c, "nextHop");
          run(c, "firewallIp");
          run(c, "fixRoute");
          run(c, "verify");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "staleudr" });
        },
      },
      {
        id: "late",
        title: "Restarts, reads the change log, then fixes the route after 11:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "restartVm");
          run(c, "changeLog");
          waitUntil(c, 46);
          run(c, "nextHop");
          run(c, "firewallIp");
          run(c, "fixRoute");
          run(c, "verify");
          close(c);
          c.act("document", { cause: "staleudr" });
        },
      },
    ],
  };
}
