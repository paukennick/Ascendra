// REQ-274: golden paths for the CISSP recovery-strategy case on the security
// console (CISSP/cissp-ransomware-recovery-site.sim.json). No prototype
// exists, so the expectations are the engine's own results.
import type { StepPath, StepsSpec } from "./steps.ts";
import { close, task } from "./secplus-helpers.ts";

export const ENTRY = { course: "CISSP", slug: "cissp-ransomware-recovery-site" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}

type C = Parameters<StepPath["drive"]>[0];
const report = (c: C, who: string, strategy: string, test: string) => {
  c.act("notify", { who });
  c.act("document", { strategy, test });
};

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Maps the tiers, pauses replication, disconnects BKP01, isolates the primary by 10 min, declares, checks the replica, rebuilds trust, fails Claims over, tells the call center",
      reasoning: "met",
      drive: (c) => {
        task(c, "assess");
        task(c, "pauseRepl");
        task(c, "isolateBackup");
        task(c, "isolatePrimary");
        task(c, "declare");
        task(c, "checkReplica");
        task(c, "identity");
        task(c, "failover");
        task(c, "comms");
        close(c);
        report(c, "plan", "warmTier1", "simulation");
      },
    },
    {
      id: "pointsLost",
      title: "Isolates the primary and declares, but never pauses replication or disconnects BKP01; Payroll first, then the immutable copy",
      reasoning: "missed",
      drive: (c) => {
        task(c, "assess");
        task(c, "isolatePrimary");
        task(c, "declare");
        task(c, "checkReplica");
        task(c, "payroll");
        task(c, "identity");
        task(c, "restoreImmutable");
        close(c);
        report(c, "all", "payrollFirst", "none");
      },
    },
    {
      id: "failoverEarly",
      title: "Protects every recovery point and checks the replica, then fails over before resetting the stolen account",
      reasoning: "partial",
      drive: (c) => {
        task(c, "assess");
        task(c, "pauseRepl");
        task(c, "isolateBackup");
        task(c, "isolatePrimary");
        task(c, "declare");
        task(c, "checkReplica");
        task(c, "failover");
        close(c);
        report(c, "plan", "warmTier1", "simulation");
      },
    },
    {
      id: "lateIsolation",
      title: "Pauses replication and declares, but isolates the primary only at 25 min after the file servers were hit; otherwise a clean failover",
      reasoning: "partial",
      drive: (c) => {
        task(c, "assess");
        task(c, "pauseRepl");
        task(c, "declare");
        task(c, "isolateBackup");
        task(c, "checkReplica");
        task(c, "isolatePrimary");
        task(c, "identity");
        task(c, "failover");
        task(c, "comms");
        close(c);
        report(c, "plan", "warmTier1", "simulation");
      },
    },
    {
      id: "restoreOnly",
      title: "Pauses replication and disconnects BKP01, then restores Claims from BKP01 without isolating the primary or resetting the account",
      reasoning: "missed",
      drive: (c) => {
        task(c, "pauseRepl");
        task(c, "isolateBackup");
        task(c, "restoreOnline");
        close(c);
        report(c, "nobody", "rebuildAll", "fullNow");
      },
    },
    {
      id: "immutableOnly",
      title: "Contains well and rebuilds trust, then restores Claims from the immutable copy: inside the RTO, three hours of claims lost",
      reasoning: "partial",
      drive: (c) => {
        task(c, "assess");
        task(c, "pauseRepl");
        task(c, "isolateBackup");
        task(c, "isolatePrimary");
        task(c, "declare");
        task(c, "identity");
        task(c, "restoreImmutable");
        task(c, "comms");
        close(c);
        report(c, "plan", "rebuildAll", "simulation");
      },
    },
  ];
}
