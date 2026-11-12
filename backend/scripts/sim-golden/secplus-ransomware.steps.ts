// REQ-231: golden paths for the Security+ ransomware incident on the
// security console (SECPLUS/ransomware-file-server.sim.json). No prototype
// exists, so the expectations are the engine's own results.
import type { StepPath, StepsSpec } from "./steps.ts";
import { close, task, watchUntil } from "./secplus-helpers.ts";

export const ENTRY = { course: "SECPLUS", slug: "ransomware-file-server" };

const iso = (host: string, how = "edr") => ({ host, how });

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}

// Shared with the V8 band (secplus-ransomware-v8.steps.ts): the same incident.
export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Triage, isolate FS01 at 5 min, disable svc_backup, isolate WS-ACCT07, escalate, scope, memory then disk, block C2, rebuild, restore last night's scanned backup; report",
      reasoning: "met",
      drive: (c) => {
        task(c, "triage");
        task(c, "isolateHost", iso("fs01"));
        task(c, "disableAccount");
        task(c, "isolateHost", iso("ws"));
        task(c, "escalate");
        task(c, "reviewAuth");
        task(c, "captureEvidence");
        task(c, "blockC2");
        task(c, "rebuild");
        task(c, "restore", { source: "nightlyScanned" });
        close(c);
        c.act("notify", { who: "full" });
        c.act("document", { cause: "macro", scope: "two" });
      },
    },
    {
      id: "slowSpread",
      title: "Investigates for 22 minutes: svc_backup reaches BK01; BK01 isolated in time, everything else done well",
      reasoning: "partial",
      drive: (c) => {
        task(c, "triage");
        task(c, "reviewAuth");
        task(c, "escalate");
        watchUntil(c, 22);
        task(c, "isolateHost", iso("fs01"));
        task(c, "isolateHost", iso("bk01"));
        task(c, "disableAccount");
        task(c, "isolateHost", iso("ws"));
        task(c, "captureEvidence");
        task(c, "blockC2");
        task(c, "rebuild");
        task(c, "restore", { source: "nightlyScanned" });
        close(c);
        c.act("notify", { who: "full" });
        c.act("document", { cause: "macro", scope: "three" });
      },
    },
    {
      id: "backupsWiped",
      title: "Never isolates FS01; cuts svc_backup at 40 min, after the backups on BK01 are gone; restores the six-day-old vault copy",
      reasoning: "partial",
      drive: (c) => {
        task(c, "triage");
        watchUntil(c, 40);
        task(c, "disableAccount");
        task(c, "isolateHost", iso("ws"));
        task(c, "isolateHost", iso("bk01"));
        task(c, "captureEvidence");
        task(c, "rebuild");
        task(c, "restore", { source: "vault" });
        close(c);
        c.act("notify", { who: "internal" });
        c.act("document", { cause: "macro", scope: "three" });
      },
    },
    {
      id: "powerOffRebuild",
      title: "Powers FS01 off and rebuilds it at once with nothing collected",
      reasoning: "partial",
      drive: (c) => {
        task(c, "triage");
        task(c, "isolateHost", iso("fs01", "power"));
        task(c, "disableAccount");
        task(c, "isolateHost", iso("ws"));
        task(c, "escalate");
        task(c, "rebuild");
        task(c, "restore", { source: "nightlyScanned" });
        close(c);
        c.act("notify", { who: "full" });
        c.act("document", { cause: "macro", scope: "two" });
      },
    },
    {
      id: "restoreEarly",
      title: "Isolates FS01, keeps evidence and isolates BK01 once reached, then rebuilds and restores with svc_backup and WS-ACCT07 untouched: encryption starts again",
      reasoning: "partial",
      drive: (c) => {
        task(c, "triage");
        task(c, "isolateHost", iso("fs01"));
        task(c, "escalate");
        task(c, "captureEvidence");
        task(c, "isolateHost", iso("bk01"));
        task(c, "rebuild");
        task(c, "restore", { source: "nightlyScanned" });
        close(c);
        c.act("notify", { who: "full" });
        c.act("document", { cause: "macro", scope: "three" });
      },
    },
    {
      id: "quietVault",
      title: "Fast and clean containment, but no C2 block or escalation, the vault copy restored, a payment negotiated and a wrong record",
      reasoning: "missed",
      drive: (c) => {
        task(c, "triage");
        task(c, "isolateHost", iso("fs01"));
        task(c, "disableAccount");
        task(c, "isolateHost", iso("ws"));
        task(c, "captureEvidence");
        task(c, "rebuild");
        task(c, "restore", { source: "vault" });
        close(c);
        c.act("notify", { who: "pay" });
        c.act("document", { cause: "rdp", scope: "two" });
      },
    },
  ];
}
