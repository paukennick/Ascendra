// REQ-239: golden paths for the NCE client session on boundaries and
// multiple relationships (NCE/nce-boundary-dual-relationship.sim.json). No
// prototype exists, so the expectations are the engine's own results.
import type { Ctl, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "NCE", slug: "nce-boundary-dual-relationship" };

// One exchange, then let the conversation continue (the session clock moves).
function ask(c: Ctl, action: string, params?: Record<string, string>, prediction = "friend"): void {
  c.act(action, params);
  if (c.run.state.openPrompt) c.choose(prediction);
  if (c.run.state.phase === "session" && !c.run.state.ended) c.skip("talk");
}

function close(c: Ctl, after: { consult?: boolean; wedding?: string; rationale: string }): void {
  if (c.run.state.phase === "session") c.act("endSession");
  c.answer();
  if (after.consult) c.act("consult");
  if (after.wedding) c.act("decideWedding", { plan: after.wedding });
  c.act("document", { rationale: after.rationale });
}

export function spec(): StepsSpec {
  return {
    slug: "nce-boundary-dual-relationship",
    paths: [
      {
        id: "expert",
        title: "Check-in, the friend request declined by minute 5, the invitation explored and deferred, an overlap plan, consult, the ceremony only, a full rationale",
        reasoning: "met",
        drive: (c) => {
          ask(c, "checkIn");
          ask(c, "raiseFriend");
          ask(c, "exploreInvite");
          ask(c, "answerInvite", { reply: "defer" });
          ask(c, "exploreCoach");
          ask(c, "planOverlap");
          ask(c, "reflect");
          close(c, { consult: true, wedding: "ceremony", rationale: "full" });
        },
      },
      {
        id: "warmNo",
        title: "The friend request left until minute 18, the overlap named without a plan, a warm decline after consulting, a one-line note",
        reasoning: "partial",
        drive: (c) => {
          ask(c, "checkIn");
          ask(c, "reflect");
          ask(c, "exploreInvite", undefined, "both");
          ask(c, "reflect");
          ask(c, "answerInvite", { reply: "defer" });
          ask(c, "exploreCoach");
          ask(c, "reflect");
          ask(c, "reflect");
          ask(c, "raiseFriend");
          close(c, { consult: true, wedding: "decline", rationale: "brief" });
        },
      },
      {
        id: "yesNow",
        title: "Yes to the wedding on the spot, the friend request never raised, the reception, nothing documented",
        reasoning: "missed",
        drive: (c) => {
          ask(c, "checkIn");
          ask(c, "exploreInvite");
          ask(c, "answerInvite", { reply: "yes" });
          ask(c, "exploreCoach");
          ask(c, "planOverlap");
          close(c, { wedding: "reception", rationale: "nothing" });
        },
      },
      {
        id: "transfer",
        title: "The friend request declined, then a transfer to a counselor 50 miles away because of the soccer overlap",
        reasoning: "partial",
        drive: (c) => {
          ask(c, "checkIn");
          ask(c, "raiseFriend");
          ask(c, "exploreCoach");
          ask(c, "transferOut");
          ask(c, "reflect");
          ask(c, "reflect");
          close(c, { consult: true, wedding: "decline", rationale: "full" });
        },
      },
      {
        id: "accepted",
        title: "Accepts the friend request ('small town anyway') and documents nothing",
        reasoning: "missed",
        drive: (c) => {
          ask(c, "checkIn");
          ask(c, "acceptFriend");
          ask(c, "exploreInvite");
          close(c, { rationale: "nothing" });
        },
      },
      {
        id: "rupture",
        title: "A flat refusal of the invitation, then a transfer: she walks out",
        reasoning: "missed",
        drive: (c) => {
          ask(c, "answerInvite", { reply: "no" });
          ask(c, "transferOut");
        },
      },
    ],
  };
}
