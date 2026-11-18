// REQ-338 (docs/sims.md 22.42): golden paths for the NASM-CPT prenatal case
// (NASMCPT/cpt-twenty-four-weeks-leaking-fluid.sim.json) on the client
// trainer screen. No prototype; the expectations are the engine's.
//
//   npm run sim:golden -- steps cpt-prenatal
import type { Ctl, StepPath, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "NASMCPT", slug: "cpt-twenty-four-weeks-leaking-fluid" };

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

// Exported so the other courses' bands reuse the same paths.
export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Clearance read; a session modified for pregnancy; fluid and cramping at 20 minutes: stopped at once and labor and delivery triage called; a full record",
      reasoning: "met",
      drive: (c) => {
        d(c, "note");
        d(c, "program", { p: "modified" });
        d(c, "start");
        d(c, "stop");
        d(c, "call");
        close(c, "full");
      },
    },
    {
      id: "oldProgram",
      title: "Her old program with a flat bench; lightheaded, sat up and onto her side; at the warning sign stopped and triage called",
      reasoning: "partial",
      drive: (c) => {
        d(c, "note");
        d(c, "program", { p: "old" });
        c.act("start");
        d(c, "bench");
        d(c, "side");
        if (c.value("busy") === true) c.skip("work");
        for (let i = 0; i < 20 && c.value("leakAt") === null; i++) d(c, "talk");
        d(c, "stop");
        d(c, "call");
        close(c, "full");
      },
    },
    {
      id: "leftFlat",
      title: "Her old program; lightheaded on the flat bench and left there; stopped and called at the warning sign; one line written",
      reasoning: "partial",
      drive: (c) => {
        d(c, "program", { p: "old" });
        c.act("start");
        d(c, "bench");
        if (c.value("busy") === true) c.skip("work");
        for (let i = 0; i < 20 && c.value("leakAt") === null; i++) d(c, "talk");
        d(c, "stop");
        d(c, "call");
        close(c, "brief");
      },
    },
    {
      id: "noExercise",
      title: "Clearance read, then 'no exercise until after the birth'",
      reasoning: "partial",
      drive: (c) => {
        d(c, "note");
        d(c, "program", { p: "none_ex" });
        close(c, "full");
      },
    },
    {
      id: "braxtonHicks",
      title: "A modified session; the warning sign called Braxton Hicks and trained through",
      reasoning: "missed",
      drive: (c) => {
        d(c, "program", { p: "modified" });
        d(c, "start");
        d(c, "push");
        close(c, "brief");
      },
    },
    {
      id: "coolDownHome",
      title: "A modified session; at the warning sign a cool-down and home to watch it; nothing written",
      reasoning: "missed",
      drive: (c) => {
        d(c, "note");
        d(c, "program", { p: "modified" });
        d(c, "start");
        d(c, "later");
        close(c, "nothing");
      },
    },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
