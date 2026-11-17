// REQ-190 (docs/sims.md 5.10): what this build can run, sent on every sims
// request as `x-sim-caps`. The server offers a version only when the engine
// major matches with a minor at least the version's, and the renderer's
// level is at least the version's (level 3 is the bedside monitor and the
// architecture board as this release draws them, with the board bindings).
// REQ-225: the client session (screen.session bindings), level 1.
// REQ-232: the PT treatment session (screen.treatment bindings), level 1.
// REQ-237: the terminal and network screen (screen.terminal bindings), level 1.
// REQ-311: the project dashboard (screen.dashboard, predictive and Sprint
// modes) and the ITIL service desk (screen.desk), level 1. An older build
// does not advertise them, so the server answers "Update the app" for their
// sims and never sends it a screen it cannot draw.
// REQ-312: the data and code console (screen.data bindings), level 1.
// REQ-313: the session at level 2 (screen.session.readLabel), the governance
// board (screen.governance) and the tabletop exercise (screen.tabletop), level 1.
// REQ-314: the facility console, the sandbox report and the client trainer, level 1.
// REQ-327: `features=mature`: this build shows the 18+ notice for a course's
// sims (a 403 mature_content_required with scope "sims") and retries. A build
// without it is offered no sim marked mature ("Update the app") and is never
// sent its brief.
import { ENGINE_MAJOR, ENGINE_MINOR } from "../engine/v1/engine.ts";

export const SIM_RENDERERS = [
  { type: "bedside", level: 3 },
  { type: "board", level: 3 },
  { type: "session", level: 2 }, // REQ-313: level 2 names the read button (readLabel)
  { type: "security-console", level: 1 }, // REQ-231 (screen.console bindings)
  { type: "treatment-session", level: 1 },
  { type: "terminal", level: 1 }, // REQ-237 (screen.terminal bindings)
  { type: "project-dashboard", level: 1 }, // REQ-311 (screen.dashboard bindings)
  { type: "service-desk", level: 1 }, // REQ-311 (screen.desk bindings)
  { type: "data", level: 1 }, // REQ-312 (screen.data bindings)
  { type: "governance-board", level: 1 }, // REQ-313 (screen.governance bindings)
  { type: "tabletop", level: 1 }, // REQ-313 (screen.tabletop bindings)
  { type: "facility-console", level: 1 }, // REQ-314 (screen.facility bindings)
  { type: "sandbox-report", level: 1 }, // REQ-314 (screen.sandbox bindings)
  { type: "trainer", level: 1 }, // REQ-314 (screen.trainer bindings)
] as const;

export const SIM_FEATURES = ["mature"] as const;

export const SIM_CAPS_HEADER = "x-sim-caps";

export function simCaps(): string {
  return `protocol=1;engine=${ENGINE_MAJOR}.${ENGINE_MINOR};renderers=${SIM_RENDERERS.map((r) => `${r.type}@${r.level}`).join(",")};features=${SIM_FEATURES.join(",")}`;
}

export function capsHeaders(): Record<string, string> {
  return { [SIM_CAPS_HEADER]: simCaps() };
}
