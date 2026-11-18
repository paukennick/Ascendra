// REQ-337 (docs/sims.md 22.41): golden paths for NCMHCE/ncmhce-panic-cbt-session-five.
// No prototype exists, so the expectations are the engine's own results.
//   npm run sim:golden -- steps ncmhce-panic
import type { Ctl, StepPath, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "NCMHCE", slug: "ncmhce-panic-cbt-session-five" };

// One exchange: answer the prediction card if it is open, act, answer it if
// the action opened it, then let the conversation continue.
function ask(c: Ctl, action: string, params?: Record<string, string>, prediction = "test"): void {
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
      title: "Homework reviewed, the belief named and examined, safety behaviors named, clearance, rationale, ambivalence, consent, three rounds, homework",
      reasoning: "met",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["reviewHw"], ["elicitBelief"], ["examineEvidence"], ["nameSafety"], ["checkClearance"], ["rationale"], ["exploreAmbivalence"], ["askConsent"], ["doExposure"], ["setHomework"]], [], {"intervention": "interoceptive", "homework": "exposureHw"}),
    },
    {
      id: "noClearance",
      title: "Good cognitive work and a consented exposure, but clearance never confirmed and safety behaviors never named",
      reasoning: "partial",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["reviewHw"], ["elicitBelief"], ["examineEvidence"], ["rationale"], ["exploreAmbivalence"], ["askConsent"], ["doExposure"], ["setHomework"]], [], {"intervention": "interoceptive", "homework": "exposureHw"}),
    },
    {
      id: "reassured",
      title: "Reassured her, then the exposure with consent but without exploring her doubts or confirming clearance",
      reasoning: "partial",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["reflect"], ["elicitBelief", undefined, "reassure"], ["reassure"], ["rationale"], ["askConsent"], ["doExposure"], ["setHomework"]], [], {"intervention": "interoceptive", "homework": "exposureHw"}),
    },
    {
      id: "relaxed",
      title: "She hesitated, so relaxation instead",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["reviewHw"], ["elicitBelief", undefined, "relax"], ["rationale"], ["askConsent"], ["relaxInstead"]], [], {"intervention": "relaxation", "homework": "noneHw"}),
    },
    {
      id: "pushed",
      title: "The belief named, then the exercise insisted on",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["reviewHw"], ["elicitBelief"], ["checkClearance"], ["pushExposure"], ["setHomework"]], [], {"intervention": "interoceptive", "homework": "exposureHw"}),
    },
    {
      id: "walkout",
      title: "Off to her childhood, then pushed into the exercise: she leaves",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["childhood"], ["pushExposure"]], [], null),
    },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
