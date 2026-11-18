// REQ-337 (docs/sims.md 22.41): golden paths for WAPSYCHJP/wajp-former-psychologist-misconduct.
// No prototype exists, so the expectations are the engine's own results.
//   npm run sim:golden -- steps wajp-misconduct
import type { Ctl, StepPath, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "WAPSYCHJP", slug: "wajp-former-psychologist-misconduct" };

// One exchange: answer the prediction card if it is open, act, answer it if
// the action opened it, then let the conversation continue.
function ask(c: Ctl, action: string, params?: Record<string, string>, prediction = "herChoice"): void {
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
      title: "Heard at her pace, the rule named and the blame placed with him, coping asked about, his texts weighed, her options explained",
      reasoning: "met",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["reflect"], ["invite"], ["explainRule"], ["askCoping"], ["askContact"], ["discussContact"], ["explainOptions"]], [], {"conduct": "violation", "report": "hers"}),
    },
    {
      id: "noOptions",
      title: "The rule named and coping asked about, but she is never told what she can do, and his texts are not discussed",
      reasoning: "partial",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["reflect"], ["invite"], ["explainRule"], ["askCoping"], ["askContact"]], [], {"conduct": "violation", "report": "hers"}),
    },
    {
      id: "pressed",
      title: "The rule named, then she is told she has to file for the sake of others",
      reasoning: "partial",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["reflect"], ["invite", undefined, "mustReport"], ["explainRule"], ["pressureFile"], ["askContact"], ["discussContact"]], [], {"conduct": "violation", "report": "hers"}),
    },
    {
      id: "misjudged",
      title: "Told it was a personal matter once therapy ended",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["reflect"], ["invite", undefined, "noViolation"], ["judgeOk"], ["askCoping"]], [], {"conduct": "personal", "report": "hers"}),
    },
    {
      id: "reported",
      title: "Told she will be reported without her agreement",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["reflect"], ["invite", undefined, "mustReport"], ["explainRule"], ["reportYourself"], ["askCoping"]], [], {"conduct": "violation", "report": "filed"}),
    },
    {
      id: "confronted",
      title: "Dr. Greer called and confronted",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["reflect"], ["invite"], ["explainRule"], ["callGreer"]], [], {"conduct": "violation", "report": "hers"}),
    },
    {
      id: "missed",
      title: "Small talk and a coping question; she never gets to explain",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["askCoping"]], [], {"conduct": "violation", "report": "hers"}),
    },
    {
      id: "walkout",
      title: "Blamed, pried, told she must file and that she will be reported: she leaves",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["invite"], ["blameShared"], ["pryDetails"], ["reportYourself"], ["pressureFile"]], [], null),
    },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
