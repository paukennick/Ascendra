// REQ-289: golden paths for the ASWB Masters client session on boundaries in a
// small town (ASWBMASTERS/aswbm-boundaries-small-town.sim.json). No prototype
// exists, so the expectations are the engine's own results. Exported for the
// ASWB Clinical band of the same session.
import type { Ctl, StepPath, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "ASWBMASTERS", slug: "aswbm-boundaries-small-town" };

function ask(c: Ctl, action: string, params?: Record<string, string>, prediction = "church"): void {
  if (c.run.state.openPrompt) c.choose(prediction);
  c.act(action, params);
  if (c.run.state.openPrompt) c.choose(prediction);
  if (c.run.state.phase === "session" && !c.run.state.ended) c.skip("talk");
}

function close(c: Ctl, after: { consult?: boolean; record: string }): void {
  if (c.run.state.phase === "session") c.act("endSession");
  c.answer();
  if (after.consult) c.act("consult");
  c.act("document", { record: after.record });
}

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Check-in, the friend request declined at minute 3, the offer explored and declined warmly, a church plan she chooses, her goals, consult, a full record",
      reasoning: "met",
      drive: (c) => {
        ask(c, "checkIn");
        ask(c, "raiseFriend");
        ask(c, "exploreBrakes");
        ask(c, "answerBrakes", { reply: "warm" });
        ask(c, "exploreChurch");
        ask(c, "planChurch");
        ask(c, "goals");
        close(c, { consult: true, record: "full" });
      },
    },
    {
      id: "lateAndDrifting",
      title: "A long story about your own divorce, the friend request at minute 21, the offer declined without asking, no church plan",
      reasoning: "partial",
      drive: (c) => {
        ask(c, "checkIn", undefined, "brakes");
        ask(c, "reflect");
        ask(c, "selfDisclose");
        ask(c, "reflect");
        ask(c, "goals");
        ask(c, "reflect");
        ask(c, "exploreChurch");
        ask(c, "reflect");
        ask(c, "raiseFriend");
        ask(c, "answerBrakes", { reply: "warm" });
        close(c, { record: "brief" });
      },
    },
    {
      id: "coldAndLeaving",
      title: "The friend request declined, the offer refused flatly, a promise to change parish, consulted",
      reasoning: "partial",
      drive: (c) => {
        ask(c, "checkIn");
        ask(c, "raiseFriend");
        ask(c, "reflect");
        ask(c, "answerBrakes", { reply: "cold" });
        ask(c, "reflect");
        ask(c, "leaveChurch");
        ask(c, "goals");
        close(c, { consult: true, record: "full" });
      },
    },
    {
      id: "brakesAccepted",
      title: "Saturday for the brakes, the friend request declined, a church plan",
      reasoning: "missed",
      drive: (c) => {
        ask(c, "checkIn", undefined, "brakes");
        ask(c, "raiseFriend");
        ask(c, "answerBrakes", { reply: "accept" });
        ask(c, "exploreChurch");
        ask(c, "planChurch");
        close(c, { record: "nothing" });
      },
    },
    {
      id: "friended",
      title: "Accepts the friend request, then talks at length about your own divorce; nothing written down",
      reasoning: "missed",
      drive: (c) => {
        ask(c, "checkIn", undefined, "brakes");
        ask(c, "acceptFriend");
        ask(c, "selfDisclose");
        close(c, { record: "nothing" });
      },
    },
    {
      id: "walkout",
      title: "A flat refusal of the offer, then leaving her parish, then the friend request: she walks out",
      reasoning: "missed",
      drive: (c) => {
        ask(c, "answerBrakes", { reply: "cold" });
        ask(c, "leaveChurch");
        ask(c, "raiseFriend");
      },
    },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
