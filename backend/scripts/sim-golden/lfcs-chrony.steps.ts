// REQ-292: golden paths for the LFCS clock-skew case on the terminal screen
// (LFCS/clock-skew-blocks-logins.sim.json). No prototype exists, so the
// expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "LFCS", slug: "clock-skew-blocks-logins" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "timedatectl and chronyc sources (only the retired server, Reach 0), the server lines in chrony.conf; fix them, restart chronyd so makestep steps the clock; sources and a Kerberos login",
        reasoning: "met",
        drive: (c) => {
          run(c, "timedatectl");
          run(c, "sources");
          run(c, "showConf");
          run(c, "editConf");
          run(c, "restart");
          run(c, "sources");
          run(c, "verify");
          close(c);
          c.act("document", { cause: "source", fix: "chrony" });
        },
      },
      {
        id: "runtimeOnly",
        title: "Adds ntp1 with chronyc add and steps with chronyc makestep; chrony.conf still names the retired server",
        reasoning: "partial",
        drive: (c) => {
          run(c, "sources");
          run(c, "addRuntime");
          run(c, "tracking");
          run(c, "makestep");
          run(c, "verify");
          close(c);
          c.act("document", { cause: "source", fix: "chrony" });
        },
      },
      {
        id: "manualDate",
        title: "Sees the clock is slow and sets it by hand from another server",
        reasoning: "partial",
        drive: (c) => {
          run(c, "timedatectl");
          run(c, "dateSet");
          run(c, "verify");
          close(c);
          c.act("document", { cause: "source", fix: "manual" });
        },
      },
      {
        id: "widenSkew",
        title: "Raises the Kerberos clock skew limit to an hour without looking at the clock",
        reasoning: "missed",
        drive: (c) => {
          run(c, "widenSkew");
          run(c, "verify");
          close(c);
          c.act("document", { cause: "kerberos", fix: "skew" });
        },
      },
      {
        id: "makestepNoSource",
        title: "Runs chronyc makestep and restarts chronyd with the retired server still configured, then closes",
        reasoning: "missed",
        drive: (c) => {
          run(c, "timedatectl");
          run(c, "makestep");
          run(c, "restart");
          run(c, "verify");
          close(c);
          c.act("document", { cause: "network", fix: "chrony" });
        },
      },
      {
        id: "late",
        title: "Restarts chronyd blind, waits past payroll, then finds the retired server and fixes chrony.conf",
        reasoning: "partial",
        drive: (c) => {
          run(c, "restart");
          waitUntil(c, 31);
          run(c, "sources");
          run(c, "showConf");
          run(c, "editConf");
          run(c, "restart");
          run(c, "verify");
          close(c);
          c.act("document", { cause: "source", fix: "chrony" });
        },
      },
    ],
  };
}
