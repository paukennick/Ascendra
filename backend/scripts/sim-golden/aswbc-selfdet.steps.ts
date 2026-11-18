// REQ-337 (docs/sims.md 22.41): golden paths for ASWBCLINICAL/aswbc-refusing-admission-for-his-dog.
// No prototype exists, so the expectations are the engine's own results.
//   npm run sim:golden -- steps aswbc-selfdet
import type { Ctl, StepPath, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "ASWBCLINICAL", slug: "aswbc-refusing-admission-for-his-dog" };

// One exchange: answer the prediction card if it is open, act, answer it if
// the action opened it, then let the conversation continue.
function ask(c: Ctl, action: string, params?: Record<string, string>, prediction = "imminent"): void {
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
      title: "Reasons, capacity, suicidal intent and fear explored; the dog cared for; asked again; he chooses admission",
      reasoning: "met",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["askReasons"], ["checkCapacity"], ["askSuicide"], ["askFear"], ["solveBarrier"], ["offerAgain"]], [], {"capacity": "intact", "outcome": "admitted"}),
    },
    {
      id: "refusal",
      title: "Capacity and risk assessed and the dog cared for, but his fear never asked about; he still leaves, with a harm-reduction plan",
      reasoning: "partial",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["askReasons"], ["checkCapacity"], ["askSuicide"], ["solveBarrier"], ["offerAgain"], ["refusalPlan"]], [], {"capacity": "intact", "outcome": "informedRefusal"}),
    },
    {
      id: "hold",
      title: "Scared with the worst case, then an involuntary evaluation requested",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn", undefined, "hold"], ["reflect"], ["reflect"], ["reflect"], ["askReasons"], ["scare"], ["requestHold"]], [], {"capacity": "lacking", "outcome": "hold"}),
    },
    {
      id: "rushed",
      title: "The against-advice form brought at once; his reasons never asked",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn", undefined, "medical"], ["amaForm"], ["askSuicide"]], [], {"capacity": "intact", "outcome": "informedRefusal"}),
    },
    {
      id: "sister",
      title: "Capacity assessed, then his sister called to persuade him",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["reflect"], ["askReasons"], ["checkCapacity"], ["callSister"], ["refusalPlan"]], [], {"capacity": "intact", "outcome": "informedRefusal"}),
    },
    {
      id: "walkout",
      title: "Lectured about the dog, threatened and held: he walks out",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["askReasons"], ["lecture"], ["scare"], ["requestHold"]], [], null),
    },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
