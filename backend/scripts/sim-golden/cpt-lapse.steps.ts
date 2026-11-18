// REQ-338 (docs/sims.md 22.42): golden paths for the NASM-CPT lapse case
// (NASMCPT/cpt-six-weeks-off-make-it-up.sim.json) on the client trainer
// screen. No prototype; the expectations are the engine's.
//
//   npm run sim:golden -- steps cpt-lapse
import type { Ctl, StepPath, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "NASMCPT", slug: "cpt-six-weeks-off-make-it-up" };

function d(c: Ctl, action: string, params?: Record<string, string>): void {
  if (c.run.state.ended) return;
  c.act(action, params);
  if (c.run.state.phase === "session" && !c.run.state.ended && c.value("busy") === true) c.skip("work");
}

function weeks(c: Ctl): void {
  c.act("weeks");
  c.skip();
}

function close(c: Ctl, what: string): void {
  if (c.run.state.phase === "session") c.act("closeSession");
  c.answer();
  c.act("document", { what });
}

// Exported so the other personal trainer courses' bands reuse the same paths.
export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Barriers heard, return affirmed, the guidelines explained; a re-entry plan at half volume, an if-then fallback and the warning signs; two weeks on, a full record",
      reasoning: "met",
      drive: (c) => {
        d(c, "barriers");
        d(c, "affirm");
        d(c, "guidelines");
        d(c, "program", { p: "reentry" });
        d(c, "lapsePlan");
        d(c, "monitor");
        weeks(c);
        close(c, "full");
      },
    },
    {
      id: "oldProgramCaught",
      title: "Barriers heard, but her old program at full volume; day 2 dark urine, sent for care the same day",
      reasoning: "partial",
      drive: (c) => {
        d(c, "barriers");
        d(c, "guidelines");
        d(c, "program", { p: "old" });
        d(c, "monitor");
        weeks(c);
        d(c, "sendCare");
        close(c, "full");
      },
    },
    {
      id: "noFallback",
      title: "A re-entry plan, but no fallback and no warning signs; a one-line record",
      reasoning: "partial",
      drive: (c) => {
        d(c, "barriers");
        d(c, "program", { p: "reentry" });
        weeks(c);
        close(c, "brief");
      },
    },
    {
      id: "catchupThrough",
      title: "Her catch-up schedule; day 2 dark urine, told to train through it",
      reasoning: "missed",
      drive: (c) => {
        d(c, "affirm");
        d(c, "program", { p: "catchup" });
        weeks(c);
        d(c, "reassure");
        close(c, "brief");
      },
    },
    {
      id: "catchupSilent",
      title: "Her catch-up schedule; the day-2 message is never answered",
      reasoning: "missed",
      drive: (c) => {
        d(c, "barriers");
        d(c, "program", { p: "catchup" });
        weeks(c);
        close(c, "full");
      },
    },
    {
      id: "lectureQuit",
      title: "A lecture about lost progress and commitment; she cancels",
      reasoning: "missed",
      drive: (c) => {
        d(c, "blame");
        close(c, "nothing");
      },
    },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
