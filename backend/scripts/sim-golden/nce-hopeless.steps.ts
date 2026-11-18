// REQ-337 (docs/sims.md 22.41): golden paths for NCE/nce-stress-and-insomnia-after-the-shop-closed.
// No prototype exists, so the expectations are the engine's own results.
//   npm run sim:golden -- steps nce-hopeless
import type { Ctl, StepPath, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "NCE", slug: "nce-stress-and-insomnia-after-the-shop-closed" };

// One exchange: answer the prediction card if it is open, act, answer it if
// the action opened it, then let the conversation continue.
function ask(c: Ctl, action: string, params?: Record<string, string>, prediction = "ask"): void {
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
      title: "His changes, his nights and his future heard; asked directly; intent, history, means and supports; a PHQ-9; a safety plan, Karen involved, a physician and a session in three days",
      reasoning: "met",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["askChanges"], ["askNights"], ["askFuture"], ["askSuicide"], ["askIntent"], ["askPast"], ["askMeans"], ["askSupports"], ["screenPhq"], ["safetyPlan"], ["involveWife"], ["referMedical"], ["followUp"]], [], {"impression": "depression", "risk": "elevated"}),
    },
    {
      id: "late",
      title: "Sleep tips first; asked about suicide late; a safety plan, but no early follow-up",
      reasoning: "partial",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["sleepTips"], ["askChanges"], ["screenPhq"], ["askNights"], ["askFuture"], ["reflect"], ["reflect"], ["askSuicide"], ["askIntent"], ["askMeans"], ["safetyPlan"]], [], {"impression": "depression", "risk": "elevated"}),
    },
    {
      id: "overcall",
      title: "A full assessment, then an emergency evaluation for passive thoughts with no intent",
      reasoning: "partial",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["askChanges"], ["askNights"], ["askFuture"], ["askSuicide"], ["askIntent"], ["askPast"], ["askMeans"], ["askSupports"], ["screenPhq"], ["safetyPlan"]], [], {"impression": "depression", "risk": "imminent"}),
    },
    {
      id: "stress",
      title: "Sleep tips and reassurance; recorded as stress and low risk",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["reflect"], ["askChanges"], ["askFuture", undefined, "cheer"], ["askSuicide"], ["reassure"], ["sleepTips"]], [], {"impression": "stress", "risk": "low"}),
    },
    {
      id: "neverAsked",
      title: "Symptoms, nights and future heard, then reassurance; suicide never asked about",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["askChanges"], ["askNights"], ["askFuture", undefined, "later"], ["reassure"], ["followUp"]], [], {"impression": "depression", "risk": "low"}),
    },
    {
      id: "denied",
      title: "Asked about suicide in the first minutes, before any trust; he denies it",
      reasoning: "missed",
      drive: (c) => drive(c, [["askSuicide"], ["checkIn"], ["askChanges"], ["askFuture"], ["referMedical"], ["followUp"]], [], {"impression": "depression", "risk": "elevated"}),
    },
    {
      id: "walkout",
      title: "His hopelessness argued with and brushed aside: he walks out",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["askFuture"], ["debate"], ["reassure"]], [], null),
    },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
