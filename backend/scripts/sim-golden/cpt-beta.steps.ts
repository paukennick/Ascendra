// REQ-338 (docs/sims.md 22.42): golden paths for the NASM-CPT beta-blocker
// case (NASMCPT/cpt-watch-zone-on-a-beta-blocker.sim.json) on the client
// trainer screen. No prototype; the expectations are the engine's.
//
//   npm run sim:golden -- steps cpt-beta
import type { Ctl, StepPath, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "NASMCPT", slug: "cpt-watch-zone-on-a-beta-blocker" };

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
      title: "Note and medications read; the beta-blocker explained; intensity by effort and the talk test; the watch's buzz ignored; a full record",
      reasoning: "met",
      drive: (c) => {
        d(c, "readNote");
        d(c, "explain");
        d(c, "setIntensity", { how: "rpe" });
        d(c, "treadmill");
        d(c, "keep");
        d(c, "talkTest");
        close(c, "full");
      },
    },
    {
      id: "zoneStopped",
      title: "Intensity by the watch's zone; chasing it makes him lightheaded; stopped at once and referred to his doctor",
      reasoning: "partial",
      drive: (c) => {
        d(c, "readNote");
        d(c, "setIntensity", { how: "hr" });
        d(c, "treadmill");
        d(c, "chase");
        d(c, "stopEx");
        d(c, "refer");
        close(c, "full");
      },
    },
    {
      id: "reserveKept",
      title: "Heart-rate reserve as the method, but kept at a talkable pace when the watch buzzed; a one-line record",
      reasoning: "partial",
      drive: (c) => {
        d(c, "setIntensity", { how: "hrr" });
        d(c, "treadmill");
        d(c, "keep");
        close(c, "brief");
      },
    },
    {
      id: "zoneNoReferral",
      title: "Chasing the zone, stopped at the lightheadedness, but no word to his doctor",
      reasoning: "partial",
      drive: (c) => {
        d(c, "setIntensity", { how: "hr" });
        d(c, "treadmill");
        d(c, "chase");
        d(c, "stopEx");
        close(c, "brief");
      },
    },
    {
      id: "pushedFaint",
      title: "Chasing the zone and urged on while lightheaded until his legs buckle; then 911",
      reasoning: "missed",
      drive: (c) => {
        d(c, "setIntensity", { how: "hr" });
        d(c, "treadmill");
        d(c, "chase");
        d(c, "pushOn");
        d(c, "call911");
        c.skip("ems");
        close(c, "full");
      },
    },
    {
      id: "moveTheTablet",
      title: "A good effort-based session, then advice to move his beta-blocker so the watch zone works; nothing written",
      reasoning: "missed",
      drive: (c) => {
        d(c, "readNote");
        d(c, "setIntensity", { how: "rpe" });
        d(c, "treadmill");
        d(c, "keep");
        d(c, "stopEx");
        d(c, "medSkip");
        close(c, "nothing");
      },
    },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
