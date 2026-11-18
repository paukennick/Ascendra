// REQ-337 (docs/sims.md 22.41): golden paths for EPPP/eppp-video-session-client-out-of-state.
// No prototype exists, so the expectations are the engine's own results.
//   npm run sim:golden -- steps eppp-telepsych
import type { Ctl, StepPath, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "EPPP", slug: "eppp-video-session-client-out-of-state" };

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
      title: "Location and callback number first, privacy, jurisdiction explained, emergency plan updated, her week heard, the dropped call answered by phone, risk asked, a plan",
      reasoning: "met",
      drive: (c) => drive(c, [["checkIn"], ["confirmLocation"], ["privacy"], ["reflect"], ["checkJurisdiction"], ["updateEmergency"], ["explore"], ["askSafety"], ["copingPlan"], ["callBack"]], [], {"plan": "checkFirst", "emergency": "updated"}),
    },
    {
      id: "late",
      title: "Talked first in earshot of her mother; location asked late; she waits out the dropped call",
      reasoning: "partial",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["explore"], ["reflect"], ["privacy"], ["confirmLocation"], ["checkJurisdiction"], ["updateEmergency"], ["askSafety"], ["waitForHer"], ["copingPlan"]], [], {"plan": "checkFirst", "emergency": "updated"}),
    },
    {
      id: "asUsual",
      title: "Location confirmed and the call recovered, but three weeks of sessions promised as usual",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["confirmLocation", undefined, "yes"], ["privacy"], ["asUsual"], ["updateEmergency"], ["explore"], ["askSafety"], ["copingPlan"], ["reflect"], ["callBack"]], [], {"plan": "asUsual", "emergency": "updated"}),
    },
    {
      id: "neverAsked",
      title: "Never asked where she is; waited out the dropped call",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["privacy"], ["explore"], ["askSafety"], ["copingPlan"], ["reflect"], ["reflect"], ["reflect"], ["waitForHer"]], [], {"plan": "checkFirst", "emergency": "onFile"}),
    },
    {
      id: "unreachable",
      title: "Her week explored within her mother's earshot, no location or number asked; the session closed while the call was down",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["reflect"], ["explore"], ["reflect"], ["reflect"], ["reflect"], ["privacy"], ["askSafety"], ["copingPlan"]], [], {"plan": "stop", "emergency": "onFile"}),
    },
    {
      id: "walkout",
      title: "Location confirmed, then she is blamed for traveling and told to push through: she leaves the call",
      reasoning: "missed",
      drive: (c) => drive(c, [["checkIn"], ["confirmLocation", undefined, "endNow"], ["blame"], ["dismiss"]], [], null),
    },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
