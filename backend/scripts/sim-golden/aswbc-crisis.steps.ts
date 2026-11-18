// REQ-337 (docs/sims.md 22.41): golden paths for ASWBCLINICAL/aswbc-walk-in-after-the-fire.
// No prototype exists, so the expectations are the engine's own results.
//   npm run sim:golden -- steps aswbc-crisis
import type { Ctl, StepPath, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "ASWBCLINICAL", slug: "aswbc-walk-in-after-the-fire" };

// One exchange: answer the prediction card if it is open, act, answer it if
// the action opened it, then let the conversation continue.
function ask(c: Ctl, action: string, params?: Record<string, string>, prediction = "stabilize"): void {
  if (c.run.state.ended || c.run.state.phase !== "session") return;
  if (c.run.state.openPrompt) c.choose(prediction);
  c.act(action, params);
  if (c.run.state.openPrompt) c.choose(prediction);
  if (c.run.state.phase === "session" && !c.run.state.ended) c.skip("talk");
}

// End the session (if it is still running), answer the formulation, run the
// note-phase actions, then document.
function close(c: Ctl, after: [string, Record<string, string>?][], note: Record<string, string>): void {
  if (c.run.state.ended) return;
  if (c.run.state.phase === "session") c.act("endSession");
  c.answer();
  for (const [a, p] of after) c.act(a, p);
  c.act("document", note);
}

type Step = [string, Record<string, string>?, string?];
function drive(c: Ctl, steps: Step[], after: [string, Record<string, string>?][] | null, note: Record<string, string> | null): void {
  for (const [a, p, pred] of steps) ask(c, a, p, pred);
  if (note) close(c, after ?? [], note);
}

// Exported for the bands of this session (docs/sims.md 4.7).
export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Grounded, lethality and the children asked about, problems sorted, feelings heard, options, calls made together, a 48-hour plan, follow-up",
      reasoning: "met",
      drive: (c) => drive(c, [["checkIn"], ["ground"], ["reflect"], ["askLethality"], ["listProblems"], ["hearFeelings"], ["exploreOptions"], ["makeCalls"], ["plan"], ["followUp"]], [], {"state": "stabilized", "follow": "call24"}),
    },
    {
      id: "intakeFirst",
      title: "A full intake first, then the crisis work, with her decisions made for her",
      reasoning: "partial",
      drive: (c) => drive(c, [["checkIn", undefined, "intake"], ["forms"], ["ground"], ["reflect"], ["reflect"], ["askLethality"], ["listProblems"], ["exploreOptions"], ["takeOver"], ["plan"], ["followUp"]], [], {"state": "stabilized", "follow": "call24"}),
    },
    {
      id: "listed",
      title: "Grounded, then a resource list and no plan",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn", undefined, "resources"], ["ground"], ["reflect"], ["askLethality"], ["listOnlyA"], ["promise"]], [], {"state": "stabilized", "follow": "walkInOnly"}),
    },
    {
      id: "walkout",
      title: "Asked to retell the fire, then a full intake form: she leaves",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["probeTrauma"], ["forms"], ["listOnlyA"]], [], null),
    },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
