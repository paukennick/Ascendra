// REQ-288: golden paths for the ASWB Clinical client session on a threat
// against an identifiable person (ASWBCLINICAL/aswbc-threat-identifiable-person.sim.json).
// No prototype exists, so the expectations are the engine's own results.
import type { Ctl, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "ASWBCLINICAL", slug: "aswbc-threat-identifiable-person" };

function ask(c: Ctl, action: string, params?: Record<string, string>, prediction = "explore"): void {
  c.act(action, params);
  if (c.run.state.openPrompt) c.choose(prediction);
  if (c.run.state.phase === "session" && !c.run.state.ended) c.skip("talk");
}

function close(c: Ctl, who: string, what: string, record: string): void {
  if (c.run.state.phase === "session") c.act("endSession");
  c.answer();
  c.act("notify", { who, what });
  c.act("document", { record });
}

function assess(c: Ctl): void {
  ask(c, "checkIn");
  ask(c, "reflect");
  ask(c, "explore");
  ask(c, "askHistory");
  ask(c, "askSelf");
  ask(c, "disclose");
  ask(c, "meansPlan");
  ask(c, "offerCrisis");
}

export function spec(): StepsSpec {
  return {
    slug: "aswbc-threat-identifiable-person",
    paths: [
      {
        id: "expert",
        title: "Reflect, explore at minute 5, history and suicide screen, tell him first, the pistol to his sister, both notified with the threat only, a full record",
        reasoning: "met",
        drive: (c) => {
          assess(c);
          close(c, "both", "threat", "full");
        },
      },
      {
        id: "overshared",
        title: "The same session, then the chart sent with the warning",
        reasoning: "partial",
        drive: (c) => {
          assess(c);
          close(c, "both", "full", "full");
        },
      },
      {
        id: "lateThreat",
        title: "Long listening first, the threat clear at minute 16, no pistol plan, both notified, a one-line record",
        reasoning: "partial",
        drive: (c) => {
          ask(c, "checkIn");
          ask(c, "limits");
          ask(c, "reflect");
          ask(c, "reflect");
          ask(c, "reflect");
          ask(c, "reflect");
          ask(c, "askSelf");
          ask(c, "askHistory");
          ask(c, "explore");
          ask(c, "offerCrisis");
          ask(c, "disclose");
          close(c, "both", "threat", "brief");
        },
      },
      {
        id: "policeOnly",
        title: "Threat found and told first, the police called, Pruitt not",
        reasoning: "partial",
        drive: (c) => {
          ask(c, "checkIn");
          ask(c, "reflect");
          ask(c, "explore");
          ask(c, "disclose");
          close(c, "police", "threat", "brief");
        },
      },
      {
        id: "keptQuiet",
        title: "A promise of secrecy, the threat found, nobody told",
        reasoning: "missed",
        drive: (c) => {
          ask(c, "checkIn");
          ask(c, "promise");
          ask(c, "explore");
          ask(c, "askHistory");
          close(c, "nobody", "threat", "full");
        },
      },
      {
        id: "unexplored",
        title: "The remark never followed up; nothing recorded",
        reasoning: "missed",
        drive: (c) => {
          ask(c, "checkIn", undefined, "warn");
          ask(c, "askSelf");
          ask(c, "reflect");
          close(c, "nobody", "threat", "nothing");
        },
      },
      {
        id: "premature",
        title: "'I'll be notifying Pruitt and the police' right after the check-in",
        reasoning: "missed",
        drive: (c) => {
          ask(c, "checkIn", undefined, "warn");
          ask(c, "disclose");
          close(c, "both", "threat", "brief");
        },
      },
      {
        id: "walkout",
        title: "Disclosure threatened at once, then pressing him again and again: he walks out",
        reasoning: "missed",
        drive: (c) => {
          ask(c, "checkIn", undefined, "warn");
          ask(c, "disclose");
          ask(c, "explore");
          ask(c, "explore");
          ask(c, "explore");
          ask(c, "explore");
        },
      },
    ],
  };
}
