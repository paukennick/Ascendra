// REQ-337 (docs/sims.md 22.41): golden paths for NCE/nce-text-in-session-brother-killed.
// No prototype exists, so the expectations are the engine's own results.
//   npm run sim:golden -- steps nce-crisis
import type { Ctl, StepPath, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "NCE", slug: "nce-text-in-session-brother-killed" };

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
      title: "Worry log reviewed; on the news: grounded, stayed with, feelings named, needs asked, Luis to drive, her sister called, the hours planned, a call tomorrow",
      reasoning: "met",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["review"], ["reflect"], ["ground"], ["stayWith"], ["nameFeelings"], ["askNeeds"], ["arrangeRide"], ["callSister"], ["planHours"], ["followUp"]], [], {"leaving": "ride", "follow": "call"}),
    },
    {
      id: "rushed",
      title: "Grounded once, straight to the practicalities; no time with her feelings",
      reasoning: "partial",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["review"], ["reflect"], ["ground"], ["askNeeds"], ["arrangeRide"], ["planHours"]], [], {"leaving": "ride", "follow": "routine"}),
    },
    {
      id: "drove",
      title: "Settled, then agreed she should drive herself now",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["review"], ["reflect"], ["ground"], ["stayWith"], ["askNeeds"], ["letDrive"], ["followUp"]], [], {"leaving": "drive", "follow": "call"}),
    },
    {
      id: "endedOnTime",
      title: "Asked about her brother, then a handout and the usual end",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["review"], ["reflect"], ["process", undefined, "process"], ["endOnTime"]], [], {"leaving": "ride", "follow": "routine"}),
    },
    {
      id: "walkout",
      title: "Back to the worry log, 'everything happens for a reason', then a handout: she walks out",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["review"], ["reflect"], ["continueAgenda", undefined, "refer"], ["platitudeA"], ["endOnTime"]], [], null),
    },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
