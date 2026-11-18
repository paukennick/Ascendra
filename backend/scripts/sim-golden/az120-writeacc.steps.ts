// REQ-335: golden paths for AZ120/hana-log-writes-slow-no-write-accelerator on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AZ120", slug: "hana-log-writes-slow-no-write-accelerator" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Disks, HANA log time, iostat, template; enable on log; fix template; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "disks");
          run(c, "hana");
          run(c, "iostat");
          run(c, "tmpl");
          run(c, "enable");
          run(c, "template");
          run(c, "verify");
          waitUntil(c, 121);
          close(c);
          c.act("document", { cause: "wa" });
        },
      },
      {
        id: "harm",
        title: "Enables Write Accelerator on all disks",
        reasoning: "missed",
        drive: (c) => {
          run(c, "disks");
          run(c, "allwa");
          run(c, "verify");
          waitUntil(c, 121);
          close(c);
          c.act("document", { cause: "wa" });
        },
      },
      {
        id: "noop",
        title: "Turns on Accelerated Networking",
        reasoning: "partial",
        drive: (c) => {
          run(c, "disks");
          run(c, "accnet");
          run(c, "verify");
          waitUntil(c, 121);
          close(c);
          c.act("document", { cause: "wa" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads disks and HANA, enables on log, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "disks");
          run(c, "hana");
          run(c, "enable");
          run(c, "verify");
          waitUntil(c, 121);
          close(c);
          c.act("document", { cause: "wa" });
        },
      },
      {
        id: "late",
        title: "Waits, changes after 18:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "disks");
          waitUntil(c, 120);
          run(c, "enable");
          run(c, "verify");
          waitUntil(c, 128);
          close(c);
          c.act("document", { cause: "wa" });
        },
      },
      {
        id: "blind",
        title: "Enables without looking and blames the network",
        reasoning: "missed",
        drive: (c) => {
          run(c, "enable");
          waitUntil(c, 121);
          close(c);
          c.act("document", { cause: "network" });
        },
      },
    ],
  };
}
