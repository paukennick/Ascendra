// REQ-237: golden paths for the Network+ branch DNS outage worked with the
// troubleshooting methodology on the terminal screen
// (NETWORKPLUS/branch-dns-route-typo.sim.json). No prototype exists, so the
// expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "NETWORKPLUS", slug: "branch-dns-route-typo" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Questions users, reads the change calendar, theory, nslookup/tracert/route table, approved change, add route, remove typo, save, verify with users",
        reasoning: "met",
        drive: (c) => {
          run(c, "askUsers");
          run(c, "changeLog");
          run(c, "pingIp");
          run(c, "nslookup");
          run(c, "stateTheory", { which: "route" });
          run(c, "tracert");
          run(c, "showRoute");
          run(c, "showTunnel");
          run(c, "approve");
          run(c, "configRoute", { line: "add" });
          run(c, "configRoute", { line: "noTypo" });
          run(c, "save");
          run(c, "nslookup");
          run(c, "confirmUsers");
          close(c);
          c.act("document", { cause: "routeTypo", lesson: "review" });
        },
      },
      {
        id: "publicResolver",
        title: "Hands out a public resolver first (internet names only), then finds the route, fixes it and puts HQ DNS back; no approval, typo left",
        reasoning: "partial",
        drive: (c) => {
          run(c, "askUsers");
          run(c, "nslookup");
          run(c, "dhcpDns", { dns: "public" });
          run(c, "nslookup");
          run(c, "showRoute");
          run(c, "stateTheory", { which: "route" });
          run(c, "configRoute", { line: "add" });
          run(c, "dhcpDns", { dns: "hq" });
          run(c, "save");
          run(c, "nslookup");
          run(c, "confirmUsers");
          close(c);
          c.act("document", { cause: "routeTypo", lesson: "nothing" });
        },
      },
      {
        id: "defaultRoute",
        title: "Blames the ISP and adds a default route into the tunnel: card payments fail; backs it out and fixes the route",
        reasoning: "missed",
        drive: (c) => {
          run(c, "askUsers");
          run(c, "showRoute");
          run(c, "stateTheory", { which: "isp" });
          run(c, "configRoute", { line: "defTunnel" });
          run(c, "confirmUsers");
          run(c, "configRoute", { line: "noDefTunnel" });
          run(c, "configRoute", { line: "add" });
          run(c, "save");
          run(c, "confirmUsers");
          close(c);
          c.act("document", { cause: "routeTypo", lesson: "review" });
        },
      },
      {
        id: "slowClaims",
        title: "Suspects the HQ DNS server and waits on HQ: the 09:45 claims upload fails, then reads the route table and fixes it",
        reasoning: "partial",
        drive: (c) => {
          run(c, "askUsers");
          run(c, "pingIp");
          run(c, "nslookup");
          run(c, "pingDns");
          run(c, "stateTheory", { which: "dnsDown" });
          waitUntil(c, 61);
          run(c, "changeLog");
          run(c, "showRoute");
          run(c, "approve");
          run(c, "configRoute", { line: "add" });
          run(c, "configRoute", { line: "noTypo" });
          run(c, "save");
          run(c, "confirmUsers");
          close(c);
          c.act("document", { cause: "routeTypo", lesson: "review" });
        },
      },
      {
        id: "skipsSteps",
        title: "Reads the change calendar and the route table, adds the right route at once; no typo removal, no save, checks with nslookup only",
        reasoning: "partial",
        drive: (c) => {
          run(c, "changeLog");
          run(c, "showRoute");
          run(c, "stateTheory", { which: "route" });
          run(c, "configRoute", { line: "add" });
          run(c, "nslookup");
          close(c);
          c.act("document", { cause: "routeTypo", lesson: "nothing" });
        },
      },
      {
        id: "closeEarly",
        title: "One nslookup times out; closes blaming the HQ DNS server",
        reasoning: "missed",
        drive: (c) => {
          run(c, "nslookup");
          run(c, "stateTheory", { which: "dnsDown" });
          close(c);
          c.act("document", { cause: "dnsDown", lesson: "nothing" });
        },
      },
    ],
  };
}
