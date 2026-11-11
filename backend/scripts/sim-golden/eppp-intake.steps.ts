// REQ-225: golden paths for the EPPP diagnostic intake
// (EPPP/diagnostic-intake-mood.sim.json). No prototype exists, so the
// expectations are the engine's own results.
import type { Ctl, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "EPPP", slug: "diagnostic-intake-mood" };

function ask(c: Ctl, action: string, prediction = "hypo"): void {
  c.act(action);
  if (c.run.state.openPrompt) c.choose(prediction);
  if (c.run.state.phase === "session" && !c.run.state.ended) c.skip("talk");
}

function record(c: Ctl, diagnosis: string, plan: string): void {
  if (c.run.state.phase === "session") c.act("endSession");
  c.answer();
  c.act("document", { diagnosis, plan });
}

const EPISODE = ["askMood", "askNeuro", "askCog", "askSI", "askCourse"];

export function spec(): StepsSpec {
  return {
    slug: "diagnostic-intake-mood",
    paths: [
      {
        id: "expert",
        title: "Consent, the episode, a suicide screen, a behavior-based screen for highs, rule-outs and family history; bipolar II with a workup",
        reasoning: "met",
        drive: (c) => {
          for (const a of ["limits", "reflect", ...EPISODE, "askHypo", "askHypoDetail", "askSubstance", "askMedical", "askFamily", "reflect"]) ask(c, a);
          record(c, "bp2", "workup");
        },
      },
      {
        id: "noMedical",
        title: "The right diagnosis without asking about medical causes; psychotherapy only",
        reasoning: "partial",
        drive: (c) => {
          for (const a of ["limits", "reflect", ...EPISODE, "askHypo", "askHypoDetail", "askSubstance", "reflect"]) ask(c, a);
          record(c, "bp2", "therapy");
        },
      },
      {
        id: "deferred",
        title: "The episode and 'ever been manic?', no consent talk; deferred, psychotherapy only",
        reasoning: "partial",
        drive: (c) => {
          for (const a of ["reflect", ...EPISODE, "askFunction", "askManicLabel", "askSubstance"]) ask(c, a, "family");
          record(c, "defer", "therapy");
        },
      },
      {
        id: "unipolar",
        title: "'Classic depression' after 'ever been manic?': MDD and an antidepressant",
        reasoning: "missed",
        drive: (c) => {
          for (const a of ["limits", ...EPISODE, "askManicLabel", "rushDx"]) ask(c, a, "stressor");
          record(c, "mdd", "antidep");
        },
      },
      {
        id: "noScreen",
        title: "Finds the high but never asks about suicide; bipolar I",
        reasoning: "partial",
        drive: (c) => {
          for (const a of ["limits", "reflect", "askMood", "askNeuro", "askCog", "askHypo", "askHypoDetail", "askMedical"]) ask(c, a);
          record(c, "bp1", "workup");
        },
      },
      {
        id: "rupture",
        title: "Three quick labels: Jamie walks out",
        reasoning: "missed",
        drive: (c) => {
          ask(c, "rushDx");
          ask(c, "rushDx");
          ask(c, "rushDx");
        },
      },
    ],
  };
}
