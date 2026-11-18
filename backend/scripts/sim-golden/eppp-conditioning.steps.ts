// REQ-337 (docs/sims.md 22.41): golden paths for EPPP/eppp-driving-fear-came-back.
// No prototype exists, so the expectations are the engine's own results.
//   npm run sim:golden -- steps eppp-conditioning
import type { Ctl, StepPath, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "EPPP", slug: "eppp-driving-fear-came-back" };

// One exchange: answer the prediction card if it is open, act, answer it if
// the action opened it, then let the conversation continue.
function ask(c: Ctl, action: string, params?: Record<string, string>, prediction = "recovery"): void {
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
      title: "The drive walked through, no new event, generalization found, return of fear explained, her prediction and safety behaviors named, varied exposure planned",
      reasoning: "met",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["askWhat"], ["askNewEvent"], ["askWider"], ["explainReturn"], ["askPrediction"], ["askSafety"], ["planExposure"]], [], {"formulation": "returnOfFear", "plan": "variedExposure"}),
    },
    {
      id: "thin",
      title: "The drive heard and the return of fear explained, then a quick plan with reassurance and no prediction or safety behaviors named",
      reasoning: "partial",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["askWhat"], ["explainReturn"], ["reassure"], ["planExposure"]], [], {"formulation": "returnOfFear", "plan": "variedExposure"}),
    },
    {
      id: "relax",
      title: "Agreed it may not have worked; switched to relaxation",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["askWhat", undefined, "failed"], ["agreeFailed"], ["relaxInstead"]], [], {"formulation": "relapse", "plan": "relaxation"}),
    },
    {
      id: "bus",
      title: "Return of fear explained, then the bus endorsed until spring",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["askWhat"], ["askWider"], ["explainReturn"], ["takeBus"]], [], {"formulation": "returnOfFear", "plan": "pause"}),
    },
    {
      id: "flood",
      title: "Rush-hour highway driving proposed this week",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["reflect"], ["reflect"], ["askWhat", undefined, "reinstatement"], ["askNewEvent"], ["explainReturn"], ["flood"]], [], {"formulation": "returnOfFear", "plan": "flood"}),
    },
    {
      id: "walkout",
      title: "Asked whether she skipped practice, then told to drive the highway at rush hour: she leaves",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["blame"], ["flood"]], [], null),
    },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
