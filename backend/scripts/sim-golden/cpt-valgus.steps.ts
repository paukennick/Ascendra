// REQ-314: golden paths for the NASM-CPT overhead squat case
// (NASMCPT/cpt-squat-knees-cave.sim.json) on the client trainer screen.
import type { Ctl, StepPath, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "NASMCPT", slug: "cpt-squat-knees-cave" };

function d(c: Ctl, action: string, params?: Record<string, string>): void {
  c.act(action, params);
  if (c.run.state.phase === "session" && !c.run.state.ended && c.value("busy") === true) c.skip();
}

function close(c: Ctl, what: string): void {
  if (c.run.state.phase === "session") c.act("closeSession");
  c.answer();
  c.act("document", { what });
}

export function paths(): StepPath[] {
  return [
    { id: "expert", title: "Front, side and heel-raised views; a hip plan; a band cue and box squats; four weeks; reassess; a full record", reasoning: "met",
      drive: (c) => { d(c, "front"); d(c, "side"); d(c, "heel"); d(c, "program", { focus: "hip" }); d(c, "cue", { kind: "band" }); d(c, "box"); d(c, "weeks"); close(c, "full"); } },
    { id: "assumedAnkle", title: "Front view only; an ankle plan; a verbal cue; four weeks: still caving", reasoning: "partial",
      drive: (c) => { d(c, "front"); d(c, "program", { focus: "ankle" }); d(c, "cue", { kind: "verbal" }); d(c, "weeks"); close(c, "full"); } },
    { id: "loadedEarly", title: "Full assessment and a hip plan, but a 16 kg goblet squat today: the knee aches and the set is stopped", reasoning: "partial",
      drive: (c) => { d(c, "front"); d(c, "heel"); d(c, "program", { focus: "hip" }); d(c, "cue", { kind: "demo" }); d(c, "load"); d(c, "stopLoad"); d(c, "weeks"); close(c, "brief"); } },
    { id: "noReassess", title: "Heel-raised retest and a hip plan with box squats, closed without reassessing", reasoning: "partial",
      drive: (c) => { d(c, "front"); d(c, "heel"); d(c, "program", { focus: "hip" }); d(c, "box"); close(c, "full"); } },
    { id: "pushed", title: "No assessment; a generic leg day with load on day one; the knee aches; 'finish the set'", reasoning: "missed",
      drive: (c) => { d(c, "program", { focus: "generic" }); d(c, "load"); d(c, "pushOn"); close(c, "brief"); } },
    { id: "diagnosed", title: "A full assessment, then a named knee condition and ibuprofen", reasoning: "missed",
      drive: (c) => { d(c, "front"); d(c, "heel"); d(c, "diagnose"); d(c, "program", { focus: "hip" }); d(c, "weeks"); close(c, "full"); } },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
