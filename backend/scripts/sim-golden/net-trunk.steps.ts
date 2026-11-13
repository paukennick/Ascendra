// REQ-237: golden paths for the Network+ trunk outage on the terminal screen
// (NETWORKPLUS/vlan-missing-from-trunk.sim.json). No prototype exists, so
// the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "NETWORKPLUS", slug: "vlan-missing-from-trunk" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "169.254 and a failed renew, scope has room, VLANs right, uplink allows 30,99 only; add 20, save, renew",
        reasoning: "met",
        drive: (c) => {
          run(c, "ipconfig");
          run(c, "renew");
          run(c, "scope");
          run(c, "vlanBrief");
          run(c, "sw2Trunk");
          run(c, "coreTrunk");
          run(c, "runCfg");
          run(c, "configTrunk", { line: "add20" });
          run(c, "save");
          run(c, "renew");
          close(c);
          c.act("document", { cause: "trunk" });
        },
      },
      {
        id: "replaceList",
        title: "Finds the trunk, then types a bare allowed list: voice and management drop; recovers from the console",
        reasoning: "partial",
        drive: (c) => {
          run(c, "ipconfig");
          run(c, "sw2Trunk");
          run(c, "configTrunk", { line: "only20" });
          run(c, "console");
          run(c, "configTrunk", { line: "add3099" });
          run(c, "save");
          run(c, "renew");
          close(c);
          c.act("document", { cause: "trunk" });
        },
      },
      {
        id: "unsavedReload",
        title: "Fixes the trunk correctly, then reloads the switch without saving: the template comes back",
        reasoning: "partial",
        drive: (c) => {
          run(c, "ipconfig");
          run(c, "sw2Trunk");
          run(c, "configTrunk", { line: "add20" });
          run(c, "renew");
          run(c, "reload");
          close(c);
          c.act("document", { cause: "trunk" });
        },
      },
      {
        id: "dhcpBlame",
        title: "Restarts the DHCP service twice and waits: the payroll cutoff passes, then finds and fixes the trunk",
        reasoning: "partial",
        drive: (c) => {
          run(c, "ipconfig");
          run(c, "renew");
          run(c, "dhcpRestart");
          run(c, "renew");
          run(c, "dhcpRestart");
          run(c, "scope");
          waitUntil(c, 46);
          run(c, "sw2Trunk");
          run(c, "configTrunk", { line: "add20" });
          run(c, "save");
          run(c, "renew");
          close(c);
          c.act("document", { cause: "trunk" });
        },
      },
      {
        id: "guessFullList",
        title: "Sees the access VLANs are right and writes the full allowed list without looking at the trunk; saved and verified",
        reasoning: "partial",
        drive: (c) => {
          run(c, "ipconfig");
          run(c, "vlanBrief");
          run(c, "configTrunk", { line: "full" });
          run(c, "save");
          run(c, "renew");
          run(c, "sw2Trunk");
          close(c);
          c.act("document", { cause: "trunk" });
        },
      },
      {
        id: "closeEarly",
        title: "Restarts DHCP, a renew still fails, and closes blaming the DHCP server with floor 2 down",
        reasoning: "missed",
        drive: (c) => {
          run(c, "ipconfig");
          run(c, "dhcpRestart");
          run(c, "renew");
          close(c);
          c.act("document", { cause: "dhcpServer" });
        },
      },
    ],
  };
}
