// REQ-338 (docs/sims.md 22.42): golden paths for the strength and
// conditioning return-from-break case
// (NSCACSCS/cscs-winter-return-gut-check-squats.sim.json) on the client
// trainer screen. No prototype; the expectations are the engine's.
//
//   npm run sim:golden -- steps cscs-return
import type { Ctl, StepPath, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "NSCACSCS", slug: "cscs-winter-return-gut-check-squats" };

function d(c: Ctl, action: string, params?: Record<string, string>): void {
  if (c.run.state.ended) return;
  c.act(action, params);
  if (c.run.state.phase === "session" && !c.run.state.ended && c.value("busy") === true) c.skip("work");
}

function week(c: Ctl): void {
  c.act("week");
  c.skip();
}

function close(c: Ctl, what: string): void {
  if (c.run.state.phase === "session") c.act("closeSession");
  c.answer();
  c.act("document", { what });
}

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "The guidelines explained to the head coach; a transition week; the athletic trainer and players briefed; a full record",
      reasoning: "met",
      drive: (c) => {
        d(c, "explain");
        d(c, "program", { p: "transition" });
        d(c, "at");
        d(c, "monitor");
        week(c);
        close(c, "full");
      },
    },
    {
      id: "oldBlockSent",
      title: "The last block at full volume; day-2 dark urine, sent to hospital at once",
      reasoning: "partial",
      drive: (c) => {
        d(c, "explain");
        d(c, "program", { p: "fullOld" });
        d(c, "at");
        week(c);
        d(c, "send");
        close(c, "full");
      },
    },
    {
      id: "quietTransition",
      title: "A transition week, but the head coach is not told why and nobody is briefed; a one-line record",
      reasoning: "partial",
      drive: (c) => {
        d(c, "program", { p: "transition" });
        week(c);
        close(c, "brief");
      },
    },
    {
      id: "gutcheckPractice",
      title: "The gut check as asked; day-2 dark urine sent to practice",
      reasoning: "missed",
      drive: (c) => {
        d(c, "program", { p: "gutcheck" });
        week(c);
        d(c, "practice");
        close(c, "brief");
      },
    },
    {
      id: "gutcheckSilent",
      title: "The gut check as asked; the day-2 reports get no action; nothing written",
      reasoning: "missed",
      drive: (c) => {
        d(c, "program", { p: "gutcheck" });
        d(c, "monitor");
        week(c);
        close(c, "nothing");
      },
    },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
