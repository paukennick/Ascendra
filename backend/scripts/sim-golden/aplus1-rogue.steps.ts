// REQ-297: golden paths for the A+ Core 1 rogue DHCP case on the terminal
// screen (APLUS_CORE1/rogue-dhcp-soho-office.sim.json). No prototype exists,
// so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "APLUS_CORE1", slug: "rogue-dhcp-soho-office" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Compares a bad and a good ipconfig /all, checks the router's leases, finds the travel router, unplugs it and renews all three PCs",
        reasoning: "met",
        drive: (c) => {
          run(c, "ipAll", { pc: "front" });
          run(c, "ipAll", { pc: "good" });
          run(c, "routerLeases");
          run(c, "walk");
          run(c, "fix", { change: "unplug" });
          run(c, "renew");
          run(c, "renewOthers");
          run(c, "pingShare");
          close(c);
          c.act("document", { cause: "rogue" });
        },
      },
      {
        id: "rebootFirst",
        title: "Reboots the office router first, then reads the lease, finds and unplugs the travel router and renews everyone",
        reasoning: "partial",
        drive: (c) => {
          run(c, "rebootRouter");
          run(c, "ipAll", { pc: "front" });
          run(c, "walk");
          run(c, "fix", { change: "unplug" });
          run(c, "renew");
          run(c, "renewOthers");
          close(c);
          c.act("document", { cause: "rogue" });
        },
      },
      {
        id: "frontOnly",
        title: "Finds the travel router before reading any lease, unplugs it and renews only the front desk PC",
        reasoning: "partial",
        drive: (c) => {
          run(c, "walk");
          run(c, "fix", { change: "unplug" });
          run(c, "ipAll", { pc: "front" });
          run(c, "renew");
          close(c);
          c.act("document", { cause: "rogue" });
        },
      },
      {
        id: "factoryReset",
        title: "Blames the router and restores it to factory defaults, then finds the real cause",
        reasoning: "partial",
        drive: (c) => {
          run(c, "ipAll", { pc: "front" });
          run(c, "fix", { change: "reset" });
          run(c, "walk");
          run(c, "fix", { change: "unplug" });
          run(c, "renew");
          run(c, "renewOthers");
          close(c);
          c.act("document", { cause: "rogue" });
        },
      },
      {
        id: "staticClose",
        title: "Types a static address on the front desk PC, sees it work and closes blaming the adapter",
        reasoning: "missed",
        drive: (c) => {
          run(c, "pingShare");
          run(c, "fix", { change: "static" });
          run(c, "pingShare");
          close(c);
          c.act("document", { cause: "nic" });
        },
      },
      {
        id: "driverDeadline",
        title: "Reinstalls the adapter driver twice and waits: the 09:30 deadline passes, then finds and fixes the travel router",
        reasoning: "partial",
        drive: (c) => {
          run(c, "nslookup");
          run(c, "driver");
          run(c, "driver");
          waitUntil(c, 61);
          run(c, "ipAll", { pc: "front" });
          run(c, "walk");
          run(c, "fix", { change: "unplug" });
          run(c, "renew");
          run(c, "renewOthers");
          close(c);
          c.act("document", { cause: "rogue" });
        },
      },
    ],
  };
}
