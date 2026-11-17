// REQ-313: golden paths for the CISSP flood continuity tabletop
// (CISSP/cissp-flood-continuity-tabletop.sim.json); the CC and Security+
// bands reuse them. The expectations are the engine's own results.
import type { StepPath, StepsSpec } from "./steps.ts";
import { helpers } from "./gov-helpers.ts";

export const ENTRY = { course: "CISSP", slug: "cissp-flood-continuity-tabletop" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}

const H = 3600;
const { task, watchUntil, close } = helpers("exercise", "busy", "work", "watch", "endEx");
type C = Parameters<StepPath["drive"]>[0];
const aar = (c: C, plan: string) => c.act("afterAction", { plan });

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "People first, asks about the call tree, declares on generator power, briefs executives, recovers in impact order, finds all three gaps, fixes the processor under contract, updates customers, every gap owned",
      reasoning: "met",
      drive: (c) => {
        task(c, "safety", { s: "safe" });
        task(c, "askTree");
        watchUntil(c, 2 * H);
        task(c, "declare");
        task(c, "brief");
        task(c, "askCap");
        watchUntil(c, 4.5 * H);
        task(c, "recoveryOrder", { r: "bia" });
        task(c, "askDep");
        watchUntil(c, 7.5 * H);
        task(c, "processor");
        watchUntil(c, 27.5 * H);
        task(c, "customers");
        close(c);
        aar(c, "owned");
      },
    },
    {
      id: "emailFirst",
      title: "Runs the exercise in time but recovers email first and leaves the gaps unowned",
      reasoning: "partial",
      drive: (c) => {
        task(c, "safety", { s: "safe" });
        watchUntil(c, 2 * H);
        task(c, "declare");
        task(c, "brief");
        watchUntil(c, 4.5 * H);
        task(c, "recoveryOrder", { r: "email" });
        task(c, "askDep");
        watchUntil(c, 7.5 * H);
        task(c, "processor");
        watchUntil(c, 27.5 * H);
        task(c, "customers");
        close(c);
        aar(c, "listed");
      },
    },
    {
      id: "slow",
      title: "Decides each inject hours late but before the fuel runs out; finds every gap and owns them; never updates customers",
      reasoning: "partial",
      drive: (c) => {
        watchUntil(c, 2 * H);
        task(c, "safety", { s: "safe" });
        task(c, "askTree");
        task(c, "askCap");
        task(c, "askDep");
        watchUntil(c, 4 * H);
        task(c, "declare");
        task(c, "brief");
        watchUntil(c, 6 * H);
        task(c, "recoveryOrder", { r: "bia" });
        watchUntil(c, 9 * H);
        task(c, "processor");
        watchUntil(c, 31.5 * H);
        aar(c, "owned");
      },
    },
    {
      id: "unsafe",
      title: "Business as usual at the warning: staff are told to come in",
      reasoning: "missed",
      drive: (c) => {
        task(c, "safety", { s: "normal" });
        watchUntil(c, 2 * H);
        task(c, "declare");
        watchUntil(c, 4.5 * H);
        task(c, "recoveryOrder", { r: "bia" });
        watchUntil(c, 7.5 * H);
        task(c, "processor");
        close(c);
        aar(c, "listed");
      },
    },
    {
      id: "waitForFuel",
      title: "Keeps people safe but waits to see whether the generator holds: it runs dry before anyone declares",
      reasoning: "missed",
      drive: (c) => {
        task(c, "safety", { s: "safe" });
        watchUntil(c, 8.5 * H);
        task(c, "declare");
        task(c, "recoveryOrder", { r: "email" });
        close(c);
        aar(c, "listed");
      },
    },
    {
      id: "noReport",
      title: "A good first day, then no after-action report",
      reasoning: "missed",
      drive: (c) => {
        task(c, "safety", { s: "safe" });
        watchUntil(c, 2 * H);
        task(c, "declare");
        watchUntil(c, 4.5 * H);
        task(c, "recoveryOrder", { r: "bia" });
        close(c);
        aar(c, "none");
      },
    },
  ];
}
