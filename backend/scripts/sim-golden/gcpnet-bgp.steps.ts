// REQ-335: golden paths for GCPNET/ha-vpn-bgp-down-after-router-swap on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "GCPNET", slug: "ha-vpn-bgp-down-after-router-swap" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Router status, logs, tunnels, change record; peer ASN; process and alert; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "status");
          run(c, "logs");
          run(c, "tunnels");
          run(c, "change");
          run(c, "asn");
          run(c, "process");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "asn" });
        },
      },
      {
        id: "harm",
        title: "Recreates the HA VPN gateway",
        reasoning: "missed",
        drive: (c) => {
          run(c, "status");
          run(c, "recreate");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "asn" });
        },
      },
      {
        id: "noop",
        title: "Resets the tunnels",
        reasoning: "partial",
        drive: (c) => {
          run(c, "status");
          run(c, "reset");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "asn" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads status and logs, fixes the ASN, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "status");
          run(c, "logs");
          run(c, "asn");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "asn" });
        },
      },
      {
        id: "late",
        title: "Waits, fixes after 08:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "status");
          waitUntil(c, 50);
          run(c, "asn");
          run(c, "verify");
          waitUntil(c, 58);
          close(c);
          c.act("document", { cause: "asn" });
        },
      },
      {
        id: "blind",
        title: "Changes the ASN without looking and blames a firewall",
        reasoning: "missed",
        drive: (c) => {
          run(c, "asn");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "ipsec" });
        },
      },
    ],
  };
}
