// REQ-338 (docs/sims.md 22.42): golden paths for the nutrition coach weight
// management case (NASMCNC/cnc-losing-too-fast-and-thirsty.sim.json) on the
// client trainer screen. No prototype; the expectations are the engine's.
//
//   npm run sim:golden -- steps cnc-weightloss
import type { Ctl, StepPath, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "NASMCNC", slug: "cnc-losing-too-fast-and-thirsty" };

function d(c: Ctl, action: string, params?: Record<string, string>): void {
  if (c.run.state.ended) return;
  c.act(action, params);
  if (c.run.state.phase === "session" && !c.run.state.ended && c.value("busy") === true) c.skip("work");
}

function wait(c: Ctl, action: string): void {
  c.act(action);
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
      title: "Goal explored, a modest deficit and three behavior goals; at week 4 she is asked how she feels and sent to her physician this week; a full record",
      reasoning: "met",
      drive: (c) => {
        d(c, "goal");
        d(c, "program", { p: "modest" });
        d(c, "behavior");
        wait(c, "month");
        d(c, "ask");
        d(c, "referDoc");
        close(c, "full");
      },
    },
    {
      id: "dietitianOnly",
      title: "A modest plan; the symptoms found at week 4, but she is sent to a dietitian rather than a physician",
      reasoning: "partial",
      drive: (c) => {
        d(c, "program", { p: "modest" });
        d(c, "behavior");
        wait(c, "month");
        d(c, "ask");
        d(c, "referRdn");
        close(c, "full");
      },
    },
    {
      id: "crashThenReferred",
      title: "A 1,000-calorie daily deficit; celebrated at week 4 before asking; then the physician; a one-line record",
      reasoning: "partial",
      drive: (c) => {
        d(c, "program", { p: "aggressive" });
        wait(c, "month");
        d(c, "celebrate");
        d(c, "ask");
        d(c, "referDoc");
        close(c, "brief");
      },
    },
    {
      id: "celebrated",
      title: "Celebrated and tightened at week 4; nobody asks how she feels; no referral",
      reasoning: "missed",
      drive: (c) => {
        d(c, "program", { p: "modest" });
        d(c, "behavior");
        wait(c, "month");
        d(c, "celebrate");
        d(c, "tighten");
        close(c, "brief");
      },
    },
    {
      id: "diagnosed",
      title: "Symptoms found, then 'it sounds like diabetes' and a diabetic meal plan; no physician",
      reasoning: "missed",
      drive: (c) => {
        d(c, "program", { p: "modest" });
        d(c, "behavior");
        wait(c, "month");
        d(c, "ask");
        d(c, "diagnose");
        close(c, "full");
      },
    },
    {
      id: "anotherMonth",
      title: "Celebrated and kept on the plan another month; she ends up at urgent care; nothing written",
      reasoning: "missed",
      drive: (c) => {
        d(c, "program", { p: "modest" });
        wait(c, "month");
        d(c, "celebrate");
        wait(c, "another");
        close(c, "nothing");
      },
    },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
