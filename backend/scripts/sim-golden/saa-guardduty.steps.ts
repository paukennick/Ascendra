// REQ-316: golden paths for the SAA GuardDuty and Macie case on the board
// (AWSSAA/guardduty-role-credentials-macie.sim.json). Each task costs time
// through the `work` wait. No prototype exists, so the expectations are the
// engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, task, watchUntil } from "./secplus-helpers.ts";

export const ENTRY = { course: "AWSSAA", slug: "guardduty-role-credentials-macie" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "GuardDuty and Macie, revoke sessions, trace the request forgery, require IMDSv2, isolate and snapshot, tell privacy",
        reasoning: "met",
        drive: (c) => {
          task(c, "gd");
          task(c, "macie");
          task(c, "revoke");
          task(c, "trail");
          task(c, "imds");
          task(c, "isolate");
          task(c, "snapshot");
          task(c, "notify");
          close(c);
          c.act("document", { lesson: "imds" });
        },
      },
      {
        id: "revokeOnly",
        title: "Revokes sessions and isolates, but leaves the request forgery open; the attacker returns",
        reasoning: "partial",
        drive: (c) => {
          task(c, "gd");
          task(c, "macie");
          task(c, "revoke");
          task(c, "isolate");
          task(c, "snapshot");
          watchUntil(c, 40);
          close(c);
          c.act("document", { lesson: "imds" });
        },
      },
      {
        id: "revokeAgain",
        title: "Revokes, finds the attacker back, closes the forgery and revokes again",
        reasoning: "partial",
        drive: (c) => {
          task(c, "gd");
          task(c, "macie");
          task(c, "revoke");
          task(c, "isolate");
          task(c, "snapshot");
          watchUntil(c, 40);
          task(c, "revoke");
          task(c, "previewOff");
          task(c, "notify");
          close(c);
          c.act("document", { lesson: "imds" });
        },
      },
      {
        id: "terminate",
        title: "Terminates the instance GuardDuty named and closes",
        reasoning: "missed",
        drive: (c) => {
          task(c, "gd");
          task(c, "terminate");
          close(c);
          c.act("document", { lesson: "terminate" });
        },
      },
      {
        id: "slow",
        title: "Investigates everything first; the card file leaves before the revocation",
        reasoning: "partial",
        drive: (c) => {
          task(c, "gd");
          task(c, "macie");
          task(c, "trail");
          task(c, "snapshot");
          task(c, "isolate");
          watchUntil(c, 31);
          task(c, "revoke");
          task(c, "imds");
          task(c, "notify");
          close(c);
          c.act("document", { lesson: "imds" });
        },
      },
      {
        id: "fixFirst",
        title: "Requires IMDSv2 and revokes without reading Macie; terminates instead of keeping evidence",
        reasoning: "partial",
        drive: (c) => {
          task(c, "imds");
          task(c, "revoke");
          task(c, "terminate");
          close(c);
          c.act("document", { lesson: "macieOff" });
        },
      },
    ],
  };
}
