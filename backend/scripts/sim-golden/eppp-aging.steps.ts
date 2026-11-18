// REQ-337 (docs/sims.md 22.41): golden paths for EPPP/eppp-memory-worries-after-his-wife-died.
// No prototype exists, so the expectations are the engine's own results.
//   npm run sim:golden -- steps eppp-aging
import type { Ctl, StepPath, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "EPPP", slug: "eppp-memory-worries-after-his-wife-died" };

// One exchange: answer the prediction card if it is open, act, answer it if
// the action opened it, then let the conversation continue.
function ask(c: Ctl, action: string, params?: Record<string, string>, prediction = "notYet"): void {
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
      title: "Walter first, his consent for Diane, the changes, his days, mood and medicines, a screen, driving raised; a workup before any diagnosis",
      reasoning: "met",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["askConsent"], ["hearDaughter"], ["askFunction"], ["askMood"], ["askMeds"], ["screen"], ["raiseDriving"]], [], {"impression": "unresolved", "plan": "workup"}),
    },
    {
      id: "noMeds",
      title: "A respectful interview and screen, but medicines never asked about and driving not raised",
      reasoning: "partial",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["askConsent"], ["hearDaughter"], ["askFunction"], ["askMood"], ["screen"]], [], {"impression": "unresolved", "plan": "workup"}),
    },
    {
      id: "dismissed",
      title: "Walter's account only, then reassurance that it is normal aging",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["askHim"], ["reflect"], ["reassure"]], [], {"impression": "normal", "plan": "reassure"}),
    },
    {
      id: "premature",
      title: "Diane asked first, then told it sounds like Alzheimer's",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["reflect"], ["hearDaughter", undefined, "dementia"], ["askFunction"], ["diagnose"]], [], {"impression": "dementia", "plan": "memoryCare"}),
    },
    {
      id: "walkout",
      title: "Talked about him to his daughter, then a dementia label: he walks out",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["talkOver"], ["diagnose"]], [], null),
    },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
