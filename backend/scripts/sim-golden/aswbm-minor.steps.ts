// REQ-337 (docs/sims.md 22.41): golden paths for ASWBMASTERS/aswbm-fifteen-asks-without-her-parents.
// No prototype exists, so the expectations are the engine's own results.
//   npm run sim:golden -- steps aswbm-minor
import type { Ctl, StepPath, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "ASWBMASTERS", slug: "aswbm-fifteen-asks-without-her-parents" };

// One exchange: answer the prediction card if it is open, act, answer it if
// the action opened it, then let the conversation continue.
function ask(c: Ctl, action: string, params?: Record<string, string>, prediction = "her"): void {
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
      title: "Her panic heard, her reasons and safety asked about, the law and the limits explained, capacity checked, she signs, a plan and a path to her parents",
      reasoning: "met",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["explore"], ["askWhy"], ["safety"], ["explainLaw"], ["explainLimits"], ["checkCapacity"], ["signConsent"], ["plan"], ["discussParents"]], [], {"consent": "self", "plan": "weekly"}),
    },
    {
      id: "promised",
      title: "She signs and has a plan, but is promised total secrecy and her parents are never discussed",
      reasoning: "partial",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["explore"], ["explainLaw"], ["promise"], ["explainLimits"], ["checkCapacity"], ["signConsent"], ["plan"]], [], {"consent": "self", "plan": "weekly"}),
    },
    {
      id: "signature",
      title: "Told she needs a parent's signature",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn", undefined, "parent"], ["reflect"], ["reflect"], ["explore"], ["refuse"]], [], {"consent": "parent", "plan": "waitForParents"}),
    },
    {
      id: "noStart",
      title: "A warm conversation, the law explained, but no consent or plan before the bell",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["explore"], ["askWhy"], ["explainLaw"], ["discussParents"]], [], {"consent": "self", "plan": "weekly"}),
    },
    {
      id: "walkout",
      title: "Called too young, then told her parents are being called: she walks out",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn", undefined, "secret"], ["doubtAge"], ["callParents"]], [], null),
    },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
