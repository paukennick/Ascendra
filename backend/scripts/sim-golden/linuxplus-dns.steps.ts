// REQ-316: golden paths for the Linux+ network troubleshooting outage on the
// terminal screen (LINUXPLUS/retired-dns-server-orders-stuck.sim.json). No
// prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "LINUXPLUS", slug: "retired-dns-server-orders-stuck" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "ip, route, ping the gateway and the partner's address, dig, nmcli; fix the profile; verify; watch the queue empty",
        reasoning: "met",
        drive: (c) => {
          run(c, "ip");
          run(c, "route");
          run(c, "pingGw");
          run(c, "pingIp");
          run(c, "dig");
          run(c, "nm");
          run(c, "fix", { change: "nmcli" });
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "dns" });
        },
      },
      {
        id: "handEdit",
        title: "Finds the dead resolver and edits resolv.conf by hand; NetworkManager rewrites it at 14:10",
        reasoning: "partial",
        drive: (c) => {
          run(c, "pingIp");
          run(c, "dig");
          run(c, "fix", { change: "resolv" });
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "dns" });
        },
      },
      {
        id: "hosts",
        title: "Pins the partner's name in /etc/hosts and closes early",
        reasoning: "partial",
        drive: (c) => {
          run(c, "pingIp");
          run(c, "dig");
          run(c, "fix", { change: "hosts" });
          run(c, "verify");
          waitUntil(c, 15);
          close(c);
          c.act("document", { cause: "dns" });
        },
      },
      {
        id: "rebootFirst",
        title: "Restarts the service and reboots before looking, then finds and fixes the profile",
        reasoning: "partial",
        drive: (c) => {
          run(c, "fix", { change: "restart" });
          run(c, "reboot");
          run(c, "dig");
          run(c, "pingIp");
          run(c, "nm");
          run(c, "fix", { change: "nmcli" });
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "dns" });
        },
      },
      {
        id: "blamePartner",
        title: "Traceroutes, sees the path is fine, blames the partner and closes",
        reasoning: "missed",
        drive: (c) => {
          run(c, "trace");
          run(c, "ss");
          close(c);
          c.act("document", { cause: "partner" });
        },
      },
      {
        id: "waitPartner",
        title: "Blames the route, waits for the partner to recover, misses the cutoff",
        reasoning: "missed",
        drive: (c) => {
          run(c, "route");
          run(c, "trace");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "route" });
        },
      },
    ],
  };
}
