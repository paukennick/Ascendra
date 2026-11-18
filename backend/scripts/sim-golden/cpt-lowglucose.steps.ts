// REQ-338 (docs/sims.md 22.42): golden paths for the NASM-CPT low-glucose
// case (NASMCPT/cpt-low-glucose-mid-intervals.sim.json) on the client
// trainer screen. No prototype; the expectations are the engine's.
//
//   npm run sim:golden -- steps cpt-lowglucose
import type { Ctl, StepPath, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "NASMCPT", slug: "cpt-low-glucose-mid-intervals" };

function d(c: Ctl, action: string, params?: Record<string, string>): void {
  if (c.run.state.ended) return;
  c.act(action, params);
  if (c.run.state.phase === "session" && !c.run.state.ended && c.value("busy") === true) c.skip("work");
}

function close(c: Ctl, what: string): void {
  if (c.run.state.phase === "session") c.act("closeSession");
  c.answer();
  c.act("document", { what });
}

// Start the intervals and let them run until the first warning sign.
function toSign(c: Ctl, plan = true): void {
  if (plan) {
    d(c, "readPlan");
    d(c, "preCheck");
  }
  d(c, "intervals");
}

// Exported so the other personal trainer courses' bands reuse the same paths.
export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Plan card and a pre-check; stopped at the first shaking; four glucose tablets; recheck at 15 minutes above 70; a snack; his diabetes team; a full incident report",
      reasoning: "met",
      drive: (c) => {
        toSign(c);
        d(c, "stopEx");
        d(c, "check");
        d(c, "fastCarbs");
        d(c, "recheck");
        if ((c.value("glu") as number) < 70) d(c, "secondDose");
        d(c, "snack");
        d(c, "team");
        close(c, "full");
      },
    },
    {
      id: "barThenTabs",
      title: "Stopped at once, but a protein bar first; still low at the recheck, then tablets; no word to his team; a one-line record",
      reasoning: "partial",
      drive: (c) => {
        toSign(c, false);
        d(c, "stopEx");
        d(c, "proteinBar");
        d(c, "recheck");
        d(c, "secondDose");
        close(c, "brief");
      },
    },
    {
      id: "noRecheck",
      title: "Stopped and gave tablets at once, then sent him home when he said he felt fine: no recheck",
      reasoning: "partial",
      drive: (c) => {
        toSign(c);
        d(c, "stopEx");
        d(c, "fastCarbs");
        d(c, "team");
        close(c, "full");
      },
    },
    {
      id: "backOnBike",
      title: "Treated by the plan, then back to the intervals and advice on his pump settings",
      reasoning: "partial",
      drive: (c) => {
        toSign(c);
        d(c, "stopEx");
        d(c, "fastCarbs");
        d(c, "recheck");
        d(c, "insulin");
        d(c, "resume");
        d(c, "stopEx");
        close(c, "full");
      },
    },
    {
      id: "pushedSevere",
      title: "Pushed through the shaking until he slumped; then 911, his glucagon and the recovery position",
      reasoning: "partial",
      drive: (c) => {
        toSign(c);
        d(c, "pushOn");
        d(c, "pushOn");
        d(c, "pushOn");
        if (c.value("severeAt") === null) d(c, "pushOn");
        d(c, "call911");
        d(c, "glucagon");
        d(c, "side");
        c.skip("ems");
        close(c, "full");
      },
    },
    {
      id: "tabsInMouth",
      title: "Pushed on until he could not swallow, then tablets into his mouth; 911 after he chokes",
      reasoning: "missed",
      drive: (c) => {
        toSign(c, false);
        d(c, "pushOn");
        d(c, "pushOn");
        d(c, "pushOn");
        if (c.value("severeAt") === null) d(c, "pushOn");
        d(c, "fastCarbs");
        d(c, "call911");
        c.skip("ems");
        close(c, "brief");
      },
    },
    {
      id: "noCall",
      title: "Pushed on until he slumped; on his side, but no 911 and no glucagon",
      reasoning: "missed",
      drive: (c) => {
        toSign(c, false);
        d(c, "pushOn");
        d(c, "pushOn");
        d(c, "pushOn");
        if (c.value("severeAt") === null) d(c, "pushOn");
        d(c, "side");
        close(c, "nothing");
      },
    },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
