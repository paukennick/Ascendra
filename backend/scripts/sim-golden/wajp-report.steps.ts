// REQ-337 (docs/sims.md 22.41): golden paths for WAPSYCHJP/wajp-adult-disclosure-children-at-risk.
// No prototype exists, so the expectations are the engine's own results.
//   npm run sim:golden -- steps wajp-report
import type { Ctl, StepPath, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "WAPSYCHJP", slug: "wajp-adult-disclosure-children-at-risk" };

// One exchange: answer the prediction card if it is open, act, answer it if
// the action opened it, then let the conversation continue.
function ask(c: Ctl, action: string, params?: Record<string, string>, prediction = "depends"): void {
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
      title: "Heard at her pace, believed, the children asked about, told first, intake called with her there, her options offered, tonight planned",
      reasoning: "met",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["reflect"], ["invitePast"], ["validate"], ["askAround"], ["tellDuty"], ["callNow"], ["offerOptions"], ["tonightPlan"]], [], {"record": "facts"}),
    },
    {
      id: "afterSession",
      title: "Details pressed and secrecy promised, then told; the report made after she leaves",
      reasoning: "partial",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["reflect"], ["invitePast", undefined, "always"], ["pressDetails"], ["askAround"], ["promise"], ["tellDuty"], ["tonightPlan"]], [["reportLater", {"when": "now"}]], {"record": "facts"}),
    },
    {
      id: "notTold",
      title: "The children found, and intake called without telling her first",
      reasoning: "partial",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["reflect"], ["invitePast"], ["askAround"], ["callNow"]], [], {"record": "facts"}),
    },
    {
      id: "permission",
      title: "Her permission asked and refused; the police pressed on her; no report",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["reflect"], ["invitePast", undefined, "never"], ["validate"], ["askAround"], ["askPermission"], ["pressPolice"]], [["reportLater", {"when": "never"}]], {"record": "opinion"}),
    },
    {
      id: "missedKids",
      title: "Heard and supported, but never asked whether he is around children",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["reflect"], ["invitePast", undefined, "never"], ["validate"], ["offerOptions"], ["tonightPlan"]], [], {"record": "facts"}),
    },
    {
      id: "tippedOff",
      title: "The sister called to check on the children, then intake",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["reflect"], ["invitePast"], ["validate"], ["askAround"], ["callSister"], ["tellDuty"], ["callNow"]], [], {"record": "facts"}),
    },
    {
      id: "walkout",
      title: "Details pressed, the police demanded, the past brushed aside: she leaves",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["invitePast"], ["reflect"], ["invitePast"], ["pressDetails"], ["pressPolice"], ["minimize"]], [], null),
    },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
