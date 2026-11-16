// REQ-288: golden paths for the ASWB Masters client session on a mandated
// child abuse report (ASWBMASTERS/aswbm-child-abuse-report.sim.json). No
// prototype exists, so the expectations are the engine's own results.
import type { Ctl, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "ASWBMASTERS", slug: "aswbm-child-abuse-report" };

// The prediction card opens as the session starts, so it is answered before the first move.
function ask(c: Ctl, action: string, params?: Record<string, string>, prediction = "enough"): void {
  if (c.run.state.openPrompt) c.choose(prediction);
  c.act(action, params);
  if (c.run.state.openPrompt) c.choose(prediction);
  if (c.run.state.phase === "session" && !c.run.state.ended) c.skip("talk");
}

function close(c: Ctl, record: string, when?: string): void {
  if (c.run.state.phase === "session") c.act("endSession");
  c.answer();
  if (when) c.act("reportLater", { when });
  c.act("document", { record });
}

export function spec(): StepsSpec {
  return {
    slug: "aswbm-child-abuse-report",
    paths: [
      {
        id: "expert",
        title: "Check-in, an open question about home, who is there tonight, told her first, intake called with her there, her sister's tonight, Thursday",
        reasoning: "met",
        drive: (c) => {
          ask(c, "checkIn");
          ask(c, "reflect");
          ask(c, "askHome");
          ask(c, "askSafety");
          ask(c, "tellDuty");
          ask(c, "callNow");
          ask(c, "safetyPlan");
          ask(c, "keepEngaged");
          close(c, "facts");
        },
      },
      {
        id: "afterSession",
        title: "A good session with a promise that nothing will happen, the report made after she leaves",
        reasoning: "partial",
        drive: (c) => {
          ask(c, "checkIn", undefined, "confirm");
          ask(c, "reflect");
          ask(c, "askHome");
          ask(c, "askSafety");
          ask(c, "tellDuty");
          ask(c, "promise");
          ask(c, "safetyPlan");
          ask(c, "keepEngaged");
          close(c, "facts", "now");
        },
      },
      {
        id: "notTold",
        title: "Intake called without telling her first; she hears it on the phone",
        reasoning: "partial",
        drive: (c) => {
          ask(c, "checkIn");
          ask(c, "callNow");
          close(c, "facts");
        },
      },
      {
        id: "leftToHer",
        title: "Her permission asked, refused, and the report left to her; a conclusion written down",
        reasoning: "missed",
        drive: (c) => {
          ask(c, "checkIn", undefined, "confirm");
          ask(c, "askPermission");
          close(c, "opinion", "tasha");
        },
      },
      {
        id: "confronted",
        title: "Darnell called and told to stop, then the report",
        reasoning: "missed",
        drive: (c) => {
          ask(c, "checkIn");
          ask(c, "askHome");
          ask(c, "callDarnell");
          ask(c, "tellDuty");
          ask(c, "callNow");
          close(c, "facts");
        },
      },
      {
        id: "walkout",
        title: "Malik questioned in the playroom, then the duty told bluntly and Darnell called: she leaves with him",
        reasoning: "missed",
        drive: (c) => {
          ask(c, "questionChild", undefined, "confirm");
          ask(c, "tellDuty");
          ask(c, "callDarnell");
        },
      },
    ],
  };
}
