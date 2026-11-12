// REQ-242 (AWS board sims, wave 2): golden paths for AWSCLF/leaked-access-key,
// a learner-paced board case.
//
//   npm run sim:golden -- steps aws-clf-key
import type { Ctl, StepsSpec } from "./steps.ts";
import { week } from "./aws-board-helpers.ts";

export const ENTRY = { course: "AWSCLF", slug: "leaked-access-key" };

function bill(c: Ctl, a: "right" | "wrong"): void {
  c.act("bill");
  if (c.run.state.openPrompt) c.choose(a);
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert: CloudTrail, every Region and the bill; key deactivated with the quarantine kept, attacker user disabled, snapshots then termination, a custom policy, root MFA",
        reasoning: "met",
        drive: (c) => {
          c.act("trail");
          c.act("regions");
          bill(c, "right");
          c.act("deactivateKey");
          c.act("disableAttacker");
          c.act("terminate", { how: "snap" });
          c.act("ciPolicyFix", { pol: "custom" });
          c.act("rootMfaOn");
          week(c);
        },
      },
      {
        id: "powerUser",
        title: "Contains it all but swaps AdministratorAccess for PowerUserAccess and terminates without snapshots",
        reasoning: "partial",
        drive: (c) => {
          c.act("trail");
          c.act("regions");
          bill(c, "right");
          c.act("deactivateKey");
          c.act("disableAttacker");
          c.act("terminate", { how: "now" });
          c.act("ciPolicyFix", { pol: "power" });
          week(c);
        },
      },
      {
        id: "missedUser",
        title: "Failure: skips CloudTrail, so never finds support-admin; the attacker relaunches from it",
        reasoning: "partial",
        drive: (c) => {
          c.act("regions");
          bill(c, "wrong");
          c.act("deactivateKey");
          c.act("terminate", { how: "snap" });
          c.act("ciPolicyFix", { pol: "custom" });
          week(c);
        },
      },
      {
        id: "unquarantine",
        title: "Failure: cleans up, then detaches the quarantine so the pipeline works, leaving the leaked key active",
        reasoning: "partial",
        drive: (c) => {
          c.act("trail");
          c.act("regions");
          c.act("disableAttacker");
          c.act("terminate", { how: "snap" });
          c.act("removeQuarantine");
          c.act("rootMfaOn");
          week(c);
        },
      },
      {
        id: "keyOnly",
        title: "Failure: deactivates the key and tightens the policy but never looks for what the key launched; the instances run on",
        reasoning: "missed",
        drive: (c) => {
          c.act("deactivateKey");
          c.act("ciPolicyFix", { pol: "custom" });
          week(c);
        },
      },
    ],
  };
}
