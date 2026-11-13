// REQ-239: golden paths for the NCMHCE intake case, 'panic attacks' that turn
// out to be PTSD with a co-occurring mild alcohol use disorder
// (NCMHCE/ncmhce-intake-ptsd-alcohol.sim.json). No prototype exists, so the
// expectations are the engine's own results.
import type { Ctl, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "NCMHCE", slug: "ncmhce-intake-ptsd-alcohol" };

function ask(c: Ctl, action: string, prediction = "ptsd"): void {
  c.act(action);
  if (c.run.state.openPrompt) c.choose(prediction);
  if (c.run.state.phase === "session" && !c.run.state.ended) c.skip("talk");
}

function close(c: Ctl, diagnosis: string, plan: string): void {
  if (c.run.state.phase === "session") c.act("endSession");
  c.answer();
  c.act("document", { diagnosis, plan });
}

const CLUSTERS = ["askIntrusion", "askAvoidance", "askMood", "askArousal"];

export function spec(): StepsSpec {
  return {
    slug: "ncmhce-intake-ptsd-alcohol",
    paths: [
      {
        id: "expert",
        title: "Limits, an open question, a reflection, what comes before the attacks, a gentle trauma question at minute 9, all four clusters, drinking and its criteria, a suicide screen, the medical review",
        reasoning: "met",
        drive: (c) => {
          for (const a of ["limits", "checkIn", "reflect", "askAttacks", "askTrauma", ...CLUSTERS, "askAlcohol", "askAud", "askSI", "reviewMedical"]) ask(c, a);
          close(c, "ptsdAud", "integrated");
        },
      },
      {
        id: "lateTrauma",
        title: "Panic named first, the screens, then the trauma question at minute 21; two clusters; PTSD only",
        reasoning: "partial",
        drive: (c) => {
          for (const a of ["checkIn", "labelPanic", "reflect", "askAlcohol", "askAud", "askSI", "reviewMedical", "askAttacks", "reflect", "askTrauma", "askIntrusion", "askArousal"]) ask(c, a);
          close(c, "ptsd", "integrated");
        },
      },
      {
        id: "panicDx",
        title: "The attacks asked but no trauma question; breathing taught; panic disorder, CBT for panic",
        reasoning: "missed",
        drive: (c) => {
          for (const a of ["checkIn", "askAttacks", "labelPanic", "askSI", "reviewMedical"]) ask(c, a);
          close(c, "panic", "panicCbt");
        },
      },
      {
        id: "noScreen",
        title: "A thorough trauma and alcohol assessment, but no suicide question",
        reasoning: "partial",
        drive: (c) => {
          for (const a of ["limits", "checkIn", "reflect", "askAttacks", "askTrauma", ...CLUSTERS, "askAlcohol", "askAud", "reviewMedical"]) ask(c, a, "panic");
          close(c, "ptsdAud", "integrated");
        },
      },
      {
        id: "pressed",
        title: "The trauma found, then pressed for detail; the rest assessed; alcohol treatment first",
        reasoning: "partial",
        drive: (c) => {
          for (const a of ["limits", "checkIn", "askTrauma", "pushDetail", "reflect", "reflect", ...CLUSTERS, "askAlcohol", "askAud", "askSI"]) ask(c, a);
          close(c, "ptsdAud", "alcoholFirst");
        },
      },
      {
        id: "rupture",
        title: "The trauma found, then pressed for detail and lectured about drinking: she walks out",
        reasoning: "missed",
        drive: (c) => {
          for (const a of ["limits", "askTrauma", "pushDetail", "askAlcohol", "lecture"]) ask(c, a);
        },
      },
    ],
  };
}
