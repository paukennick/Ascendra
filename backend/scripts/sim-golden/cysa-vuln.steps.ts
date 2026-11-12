// REQ-238: golden paths for the CySA+ vulnerability-prioritization incident
// on the security console (CYSAPLUS/vuln-prioritization-kev-edge.sim.json).
// No prototype exists, so the expectations are the engine's own results.
import type { StepPath, StepsSpec } from "./steps.ts";
import { close, task, watchUntil } from "./secplus-helpers.ts";

export const ENTRY = { course: "CYSAPLUS", slug: "vuln-prioritization-kev-edge" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}

type C = Parameters<StepPath["drive"]>[0];
const rest = (c: C) => {
  task(c, "checkMail");
  task(c, "plan", { finding: "hr", plan: "window" });
  task(c, "plan", { finding: "lab", plan: "accept" });
  task(c, "plan", { finding: "mail", plan: "falsePos" });
};

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Enrich, escalate, workaround by 13 min, emergency upgrade, check for a web shell, rescan, then MAIL01 and the rest; notify leadership, the change board and the VPN owner",
      reasoning: "met",
      drive: (c) => {
        task(c, "enrich");
        task(c, "escalate");
        task(c, "workaround");
        task(c, "plan", { finding: "vpn", plan: "emergency" });
        task(c, "huntVpn");
        task(c, "rescan");
        rest(c);
        close(c);
        c.act("notify", { who: "full" });
        c.act("document", { top: "vpn", mail: "fp" });
      },
    },
    {
      id: "cvssFirst",
      title: "Spends the emergency change on the CVSS 9.8 and 10.0 findings; the VPN is exploited at 40 min and credentials are harvested at 60",
      reasoning: "missed",
      drive: (c) => {
        task(c, "plan", { finding: "hr", plan: "emergency" });
        task(c, "plan", { finding: "lab", plan: "emergency" });
        task(c, "plan", { finding: "mail", plan: "emergency" });
        watchUntil(c, 90);
        c.answer();
        c.act("notify", { who: "owner" });
        c.act("document", { top: "hr", mail: "real" });
      },
    },
    {
      id: "patchNoHunt",
      title: "Emergency upgrade first (closed at 20 min) and a rescan, but never checks the gateway for compromise",
      reasoning: "partial",
      drive: (c) => {
        task(c, "plan", { finding: "vpn", plan: "emergency" });
        task(c, "escalate");
        task(c, "enrich");
        task(c, "rescan");
        rest(c);
        close(c);
        c.act("notify", { who: "full" });
        c.act("document", { top: "vpn", mail: "fp" });
      },
    },
    {
      id: "lateExploited",
      title: "Gets to the report at 41 min, after the exploit: takes the gateway offline, finds the web shell, upgrades and rescans",
      reasoning: "partial",
      drive: (c) => {
        watchUntil(c, 41);
        task(c, "enrich");
        task(c, "offlineVpn");
        task(c, "huntVpn");
        task(c, "escalate");
        task(c, "plan", { finding: "vpn", plan: "emergency" });
        task(c, "rescan");
        rest(c);
        close(c);
        c.act("notify", { who: "full" });
        c.act("document", { top: "vpn", mail: "fp" });
      },
    },
    {
      id: "fpUnchecked",
      title: "Workaround in 5 min and checks for compromise, but closes MAIL01 unchecked, never patches or rescans",
      reasoning: "partial",
      drive: (c) => {
        task(c, "workaround");
        task(c, "enrich");
        task(c, "huntVpn");
        task(c, "plan", { finding: "vpn", plan: "window" });
        task(c, "plan", { finding: "hr", plan: "window" });
        task(c, "plan", { finding: "lab", plan: "window" });
        task(c, "plan", { finding: "mail", plan: "falsePos" });
        close(c);
        c.act("notify", { who: "owner" });
        c.act("document", { top: "vpn", mail: "fp" });
      },
    },
    {
      id: "waitForWindow",
      title: "Puts every patch, the VPN included, in Saturday's window and closes the response with the gateway exposed",
      reasoning: "missed",
      drive: (c) => {
        task(c, "enrich");
        task(c, "plan", { finding: "vpn", plan: "window" });
        rest(c);
        close(c);
        c.act("notify", { who: "nobody" });
        c.act("document", { top: "vpn", mail: "fp" });
      },
    },
  ];
}
