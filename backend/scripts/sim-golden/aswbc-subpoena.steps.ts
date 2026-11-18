// REQ-337 (docs/sims.md 22.41): golden paths for ASWBCLINICAL/aswbc-subpoena-in-a-custody-fight.
// No prototype exists, so the expectations are the engine's own results.
//   npm run sim:golden -- steps aswbc-subpoena
import type { Ctl, StepPath, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "ASWBCLINICAL", slug: "aswbc-subpoena-in-a-custody-fight" };

// One exchange: answer the prediction card if it is open, act, answer it if
// the action opened it, then let the conversation continue.
function ask(c: Ctl, action: string, params?: Record<string, string>, prediction = "respond"): void {
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
      title: "Told at once, her wishes heard, her rights and the court-order path explained, her attorney called; consulted, an objection in writing, the record untouched",
      reasoning: "met",
      drive: (c) => drive(c, [["checkIn"], ["tellHer"], ["hearWishes"], ["explainRights"], ["explainCourtOrder"], ["suggestAttorney"], ["reflect"]], [["consult"]], {"response": "objection", "record": "unchanged"}),
    },
    {
      id: "promised",
      title: "Told and her rights explained, but promised no one will ever see the records; no consultation",
      reasoning: "partial",
      drive: (c) => drive(c, [["checkIn"], ["tellHer"], ["explainRights"], ["promiseNever"], ["suggestAttorney"]], [], {"response": "objection", "record": "unchanged"}),
    },
    {
      id: "sent",
      title: "Kept from her, then the records sent to be safe",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn", undefined, "produce"], ["reflect"], ["keepFromHer"]], [["sendRecords"]], {"response": "produce", "record": "unchanged"}),
    },
    {
      id: "altered",
      title: "Told and protected, then the notes softened before responding",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["tellHer"], ["hearWishes"], ["explainRights"], ["suggestAttorney"]], [["editNotes"], ["consult"]], {"response": "objection", "record": "edited"}),
    },
    {
      id: "ignored",
      title: "Kept from her and never answered",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn", undefined, "ignore"], ["reflect"], ["keepFromHer"]], [], {"response": "noResponse", "record": "unchanged"}),
    },
    {
      id: "toldEx",
      title: "Told her, then the opposing attorney called to reassure him",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["tellHer"], ["explainRights"]], [["callEx"]], {"response": "objection", "record": "unchanged"}),
    },
    {
      id: "walkout",
      title: "Told, then her fear brushed off and her own words blamed: she leaves",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["tellHer"], ["dismiss"], ["blameHer"]], [], null),
    },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
