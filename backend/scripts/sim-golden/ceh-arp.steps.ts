// REQ-274: golden paths for the CEH ARP-poisoning case on the security
// console (CEH/ceh-arp-poisoning-finance-vlan.sim.json). Defensive work on
// the learner's own network. No prototype exists, so the expectations are
// the engine's own results.
import type { StepPath, StepsSpec } from "./steps.ts";
import { close, task, watchUntil } from "./secplus-helpers.ts";

export const ENTRY = { course: "CEH", slug: "ceh-arp-poisoning-finance-vlan" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}

type C = Parameters<StepPath["drive"]>[0];
const report = (c: C, who: string, attack: string, fix: string) => {
  c.act("notify", { who });
  c.act("document", { attack, fix });
};

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Reads the ARP tables, captures, traces the MAC, shuts the port at 11 min, ends sessions, enables DAI, has the device bagged, raises the HTTPS change, warns staff",
      reasoning: "met",
      drive: (c) => {
        task(c, "readIds");
        task(c, "capture");
        task(c, "trace");
        task(c, "shutPort");
        task(c, "revokeSessions");
        task(c, "dai");
        task(c, "seize");
        task(c, "tls");
        task(c, "warn");
        close(c);
        report(c, "security", "arp", "daiTls");
      },
    },
    {
      id: "clearOnly",
      title: "Clears the ARP caches and watches: the device re-poisons them, a session is hijacked at 15 min and the pay table leaves at 35",
      reasoning: "missed",
      drive: (c) => {
        task(c, "readIds");
        task(c, "clearArp");
        watchUntil(c, 50);
        close(c);
        report(c, "nobody", "flood", "none");
      },
    },
    {
      id: "wipe",
      title: "Traces the MAC and has IT unplug and reimage the device",
      reasoning: "partial",
      drive: (c) => {
        task(c, "readIds");
        task(c, "trace");
        task(c, "wipe");
        task(c, "revokeSessions");
        close(c);
        report(c, "security", "arp", "none");
      },
    },
    {
      id: "noCapture",
      title: "Shuts the port at 8 min with no capture, ends sessions, enables DAI and has the device bagged",
      reasoning: "partial",
      drive: (c) => {
        task(c, "readIds");
        task(c, "trace");
        task(c, "shutPort");
        task(c, "revokeSessions");
        task(c, "dai");
        task(c, "seize");
        close(c);
        report(c, "security", "arp", "daiTls");
      },
    },
    {
      id: "sessionLeft",
      title: "Captures and traces, clears caches first (a session is hijacked at 15 min), shuts the port at 16 and closes without ending sessions",
      reasoning: "missed",
      drive: (c) => {
        task(c, "readIds");
        task(c, "capture");
        task(c, "trace");
        task(c, "clearArp");
        task(c, "shutPort");
        close(c);
        report(c, "all", "dhcp", "staticAll");
      },
    },
    {
      id: "lateStop",
      title: "Captures, traces and warns staff first; the port is shut at 19 min after a session was hijacked; then sessions ended and passwords reset, DAI, custody, HTTPS change",
      reasoning: "partial",
      drive: (c) => {
        task(c, "readIds");
        task(c, "capture");
        task(c, "trace");
        task(c, "warn");
        task(c, "clearArp");
        task(c, "shutPort");
        task(c, "revokeSessions");
        task(c, "resetCreds");
        task(c, "dai");
        task(c, "seize");
        task(c, "tls");
        close(c);
        report(c, "security", "arp", "daiTls");
      },
    },
  ];
}
