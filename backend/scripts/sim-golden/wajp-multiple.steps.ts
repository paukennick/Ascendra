// REQ-337 (docs/sims.md 22.41): golden paths for WAPSYCHJP/wajp-client-hired-by-your-practice.
// No prototype exists, so the expectations are the engine's own results.
//   npm run sim:golden -- steps wajp-multiple
import type { Ctl, StepPath, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "WAPSYCHJP", slug: "wajp-client-hired-by-your-practice" };

// One exchange: answer the prediction card if it is open, act, answer it if
// the action opened it, then let the conversation continue.
function ask(c: Ctl, action: string, params?: Record<string, string>, prediction = "endProperly"): void {
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
      title: "News shared, the job's location asked, the conflict explained, her choice, a planned ending outside the practice, the gym talked through, a full note",
      reasoning: "met",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["askJob"], ["explainConflict"], ["exploreChoice"], ["planEnding"], ["discussGym"]], [["consult"]], {"plan": "endWithNotice", "record": "facts"}),
    },
    {
      id: "gaps",
      title: "The conflict found and explained, but she is asked to change gyms and the note is one line",
      reasoning: "partial",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["askJob"], ["explainConflict"], ["askSwitch"], ["exploreChoice"], ["planEnding"]], [], {"plan": "endWithNotice", "record": "minimal"}),
    },
    {
      id: "keepBoth",
      title: "Told her both roles can work; the gym talked through",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["askJob", undefined, "separate"], ["keepBoth"], ["discussGym"]], [], {"plan": "continueBoth", "record": "facts"}),
    },
    {
      id: "transfer",
      title: "Her care offered to the partner who hired her",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["askJob", undefined, "separate"], ["explainConflict"], ["transferPartner"], ["exploreChoice"]], [], {"plan": "transferPartner", "record": "minimal"}),
    },
    {
      id: "abandoned",
      title: "The conflict explained, then therapy ended today",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["reflect"], ["askJob"], ["explainConflict"], ["endToday"]], [], {"plan": "endedToday", "record": "facts"}),
    },
    {
      id: "breach",
      title: "She is told the partner who hired her will learn she is a client, and pressed to decline the job",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["reflect"], ["reflect"], ["askJob", undefined, "decline"], ["tellPartner"], ["pressureDecline"]], [], {"plan": "endWithNotice", "record": "facts"}),
    },
    {
      id: "missed",
      title: "Congratulations only: never asked where the job is",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["discussGym"]], [], {"plan": "endWithNotice", "record": "minimal"}),
    },
    {
      id: "walkout",
      title: "Asked to change gyms, therapy ended today, told her employer will know: she leaves",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["askSwitch"], ["askJob"], ["endToday"], ["pressureDecline"]], [], null),
    },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
