// REQ-269: golden paths for the SC-500 backup sabotage incident on the
// security console (SC500/sc500-backup-vault-sabotage.sim.json). No
// prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, task, watchUntil } from "./secplus-helpers.ts";

export const ENTRY = { course: "SC500", slug: "sc500-backup-vault-sabotage" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Sign-ins show a takeover; block r.khan and revoke sessions; MUA with the separate Resource Guard; vault activity; undelete and resume; retention back; evidence; page the lead",
        reasoning: "met",
        drive: (c) => {
          task(c, "signins");
          task(c, "disableAcct");
          task(c, "enableMua");
          task(c, "activity");
          task(c, "resume");
          task(c, "retention");
          task(c, "preserve");
          task(c, "escalate");
          close(c);
          c.act("notify", { who: "full" });
          c.act("document", { cause: "adminCompromised", prevent: "muaGuard" });
        },
      },
      {
        id: "recoverFirst",
        title: "Undeletes the backups while the attacker is still in (undone), then blocks the account, turns on MUA, undeletes again",
        reasoning: "partial",
        drive: (c) => {
          task(c, "activity");
          task(c, "resume");
          task(c, "disableAcct");
          task(c, "enableMua");
          task(c, "resume");
          task(c, "signins");
          task(c, "preserve");
          close(c);
          c.act("notify", { who: "internal" });
          c.act("document", { cause: "adminCompromised", prevent: "newVault" });
        },
      },
      {
        id: "shutdown",
        title: "Shuts down all four production VMs first (production offline), then blocks the account, undeletes and turns on MUA",
        reasoning: "partial",
        drive: (c) => {
          task(c, "signins");
          task(c, "shutdownVms");
          task(c, "activity");
          task(c, "disableAcct");
          task(c, "resume");
          task(c, "enableMua");
          close(c);
          c.act("notify", { who: "full" });
          c.act("document", { cause: "insider", prevent: "muaGuard" });
        },
      },
      {
        id: "slowPurge",
        title: "Investigates and exports logs first; soft delete goes off at 02:20 and the backups are purged before the account is blocked",
        reasoning: "partial",
        drive: (c) => {
          task(c, "activity");
          task(c, "signins");
          task(c, "preserve");
          task(c, "escalate");
          watchUntil(c, 23);
          task(c, "disableAcct");
          task(c, "resume");
          close(c);
          c.act("notify", { who: "full" });
          c.act("document", { cause: "adminCompromised", prevent: "muaGuard" });
        },
      },
      {
        id: "closedOpen",
        title: "Reads the sign-ins and closes as a misunderstanding",
        reasoning: "missed",
        drive: (c) => {
          task(c, "signins");
          close(c);
          c.act("notify", { who: "nobody" });
          c.act("document", { cause: "bug", prevent: "nothing" });
        },
      },
      {
        id: "muaButSlow",
        title: "Turns on MUA quickly (the soft delete attempt is blocked) but never gets to the account before 02:50: ransomware runs",
        reasoning: "partial",
        drive: (c) => {
          task(c, "enableMua");
          task(c, "activity");
          task(c, "preserve");
          watchUntil(c, 46);
          task(c, "disableAcct");
          task(c, "resume");
          close(c);
          c.act("notify", { who: "full" });
          c.act("document", { cause: "adminCompromised", prevent: "muaGuard" });
        },
      },
    ],
  };
}
