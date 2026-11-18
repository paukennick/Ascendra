// REQ-337 (docs/sims.md 22.41): golden paths for NCE/nce-eight-weeks-flat-scores.
// No prototype exists, so the expectations are the engine's own results.
//   npm run sim:golden -- steps nce-progress
import type { Ctl, StepPath, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "NCE", slug: "nce-eight-weeks-flat-scores" };

// One exchange: answer the prediction card if it is open, act, answer it if
// the action opened it, then let the conversation continue.
function ask(c: Ctl, action: string, params?: Record<string, string>, prediction = "noChange"): void {
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
      title: "The chart looked at together, his view, the maintainers, options and his choice, measurable goals, measuring with a review date",
      reasoning: "met",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["showData"], ["askView"], ["explore"], ["options"], ["chooseCbt"], ["goals"], ["remeasureA"]], [], {"progress": "noChange", "plan": "revised"}),
    },
    {
      id: "imposed",
      title: "Chart reviewed and the maintainers found, then CBT announced to him, with no goals rewritten",
      reasoning: "partial",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["showData"], ["explore"], ["switchAlone"], ["remeasureA"]], [], {"progress": "noChange", "plan": "revised"}),
    },
    {
      id: "stalled",
      title: "Dips called progress; supportive counseling continues",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["showData", undefined, "progress"], ["continueSame"]], [], {"progress": "improving", "plan": "same"}),
    },
    {
      id: "ended",
      title: "Never shown the chart; told counseling is not working for him",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["reflect"], ["terminate"]], [], {"progress": "noChange", "plan": "end"}),
    },
    {
      id: "walkout",
      title: "Blamed for not trying, then told counseling is not working: he leaves",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["blame"], ["terminate"]], [], null),
    },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
