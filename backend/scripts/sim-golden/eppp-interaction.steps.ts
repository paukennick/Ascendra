// REQ-337 (docs/sims.md 22.41): golden paths for EPPP/eppp-herbal-booster-on-sertraline.
// No prototype exists, so the expectations are the engine's own results.
//   npm run sim:golden -- steps eppp-interaction
import type { Ctl, StepPath, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "EPPP", slug: "eppp-herbal-booster-on-sertraline" };

// One exchange: answer the prediction card if it is open, act, answer it if
// the action opened it, then let the conversation continue.
function ask(c: Ctl, action: string, params?: Record<string, string>, prediction = "medical"): void {
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
      title: "Symptoms and what changed asked first, other substances and red flags, the interaction explained, the prescriber called, a ride arranged",
      reasoning: "met",
      drive: (c) => drive(c, [["checkIn"], ["askSymptoms"], ["askSupplements"], ["askOther"], ["askSeverity"], ["explain"], ["callPrescriber"], ["arrangeRide"]], [], {"impression": "interaction", "disposition": "sameDay"}),
    },
    {
      id: "late",
      title: "Breathing exercise first; the supplement found late; sent the same day without a ride",
      reasoning: "partial",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["relax"], ["reflect"], ["reflect"], ["reflect"], ["askSymptoms"], ["askSupplements"], ["explain"], ["callPrescriber"]], [], {"impression": "interaction", "disposition": "sameDay"}),
    },
    {
      id: "anxiety",
      title: "Treated as anxiety; never asked what changed",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["relax"], ["askSymptoms"]], [], {"impression": "anxiety", "disposition": "nextVisit"}),
    },
    {
      id: "stopped",
      title: "The supplement found, herbs called safe, and told to stop her sertraline",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["askSymptoms"], ["askSupplements", undefined, "stopBoth"], ["reassureHerbs"], ["stopSertraline"]], [], {"impression": "interaction", "disposition": "selfStop"}),
    },
    {
      id: "walkout",
      title: "Back to the worksheet, then scolded for the supplement: she leaves",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["pushAgenda"], ["askSupplements", undefined, "anxiety"], ["scold"], ["stopSertraline"]], [], null),
    },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
