// REQ-338 (docs/sims.md 22.42): golden paths for the strength and
// conditioning exertional heat stroke case
// (NSCACSCS/cscs-first-day-back-collapse-in-heat.sim.json) on the client
// trainer screen. No prototype; the expectations are the engine's.
//
//   npm run sim:golden -- steps cscs-heat
import type { Ctl, StepPath, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "NSCACSCS", slug: "cscs-first-day-back-collapse-in-heat" };

function d(c: Ctl, action: string, params?: Record<string, string>): void {
  if (c.run.state.ended) return;
  c.act(action, params);
  for (let i = 0; i < 5 && c.run.state.phase === "session" && !c.run.state.ended && c.value("busy") === true; i++) c.skip(action === "immerse" ? "fill" : "work");
}

function close(c: Ctl, what: string): void {
  if (c.run.state.phase === "session") c.act("closeSession");
  c.answer();
  c.act("document", { what });
}

// Cool in 5-minute steps until the paramedics are here and he is at or below 38.9 C.
function coolToGoal(c: Ctl): void {
  for (let i = 0; i < 12 && (c.value("emsAt") === null || (c.value("tc") as number) > 38.9); i++) d(c, "keep");
}

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Heat policy checked, a transition day, the tub ready; confusion at minute 25: stopped, 911 and the athletic trainer, into the tub at once; out at about 38.9 C inside 30 minutes; handed over",
      reasoning: "met",
      drive: (c) => {
        d(c, "heatCheck");
        d(c, "program", { p: "transition" });
        d(c, "tub");
        d(c, "start");
        d(c, "stop");
        d(c, "call");
        d(c, "immerse");
        c.skip("at");
        d(c, "temp");
        c.skip("ems");
        d(c, "out");
        d(c, "hand");
        close(c, "full");
      },
    },
    {
      id: "fullTestTub",
      title: "The full test on day one; the tub was ready and he was immersed at once and handed over cooled",
      reasoning: "partial",
      drive: (c) => {
        d(c, "program", { p: "full" });
        d(c, "tub");
        d(c, "start");
        d(c, "stop");
        d(c, "call");
        d(c, "immerse");
        c.skip("at");
        d(c, "temp");
        c.skip("ems");
        d(c, "out");
        d(c, "hand");
        close(c, "full");
      },
    },
    {
      id: "noTubFilled",
      title: "A transition day, but no tub set up; eight minutes to fill one, then immersion and a late but in-time cool",
      reasoning: "partial",
      drive: (c) => {
        d(c, "heatCheck");
        d(c, "program", { p: "transition" });
        d(c, "start");
        d(c, "stop");
        d(c, "call");
        d(c, "immerse");
        coolToGoal(c);
        d(c, "temp");
        d(c, "out");
        d(c, "hand");
        close(c, "brief");
      },
    },
    {
      id: "shadeAndFan",
      title: "A transition day, 911 called, but shade and a fan instead of the tub; still hot at 30 minutes, then a tub filled too late; nothing written",
      reasoning: "missed",
      drive: (c) => {
        d(c, "program", { p: "transition" });
        d(c, "start");
        d(c, "call");
        d(c, "shade");
        for (let i = 0; i < 7 && c.value("injured") !== true; i++) d(c, "keep");
        d(c, "immerse");
        coolToGoal(c);
        d(c, "out");
        d(c, "hand");
        close(c, "nothing");
      },
    },
    {
      id: "driveHot",
      title: "The full test; at the collapse he is put in a staff car to the hospital, uncooled and without a 911 call",
      reasoning: "missed",
      drive: (c) => {
        d(c, "program", { p: "full" });
        d(c, "start");
        d(c, "car");
        close(c, "brief");
      },
    },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
