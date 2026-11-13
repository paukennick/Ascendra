// REQ-190 (docs/sims.md 5.10): what this build can run, sent on every sims
// request as `x-sim-caps`. The server offers a version only when the engine
// major matches with a minor at least the version's, and the renderer's
// level is at least the version's (level 3 is the bedside monitor and the
// architecture board as this release draws them, with the board bindings).
// REQ-225: the client session (screen.session bindings), level 1.
// REQ-232: the PT treatment session (screen.treatment bindings), level 1.
// REQ-237: the terminal and network screen (screen.terminal bindings), level 1.
import { ENGINE_MAJOR, ENGINE_MINOR } from "../engine/v1/engine.ts";

export const SIM_RENDERERS = [
  { type: "bedside", level: 3 },
  { type: "board", level: 3 },
  { type: "session", level: 1 },
  { type: "security-console", level: 1 }, // REQ-231 (screen.console bindings)
  { type: "treatment-session", level: 1 },
  { type: "terminal", level: 1 }, // REQ-237 (screen.terminal bindings)
] as const;

export const SIM_CAPS_HEADER = "x-sim-caps";

export function simCaps(): string {
  return `protocol=1;engine=${ENGINE_MAJOR}.${ENGINE_MINOR};renderers=${SIM_RENDERERS.map((r) => `${r.type}@${r.level}`).join(",")}`;
}

export function capsHeaders(): Record<string, string> {
  return { [SIM_CAPS_HEADER]: simCaps() };
}
