// REQ-269: golden paths for the SC-500 consent phishing incident on the
// security console (SC500/sc500-illicit-consent-grant.sim.json). No
// prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, task, watchUntil } from "./secplus-helpers.ts";

export const ENTRY = { course: "SC500", slug: "sc500-illicit-consent-grant" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "App permissions first, disable sign-in, remove grants, revoke sessions, restrict consent, warn AP, export evidence, audit search",
        reasoning: "met",
        drive: (c) => {
          task(c, "perms");
          task(c, "disableApp");
          task(c, "removeGrants");
          task(c, "revokeSessions");
          task(c, "restrictConsent");
          task(c, "warnAp");
          task(c, "preserve");
          task(c, "audit");
          close(c);
          c.act("notify", { who: "full" });
          c.act("document", { cause: "consentPhish", prevent: "consentPolicy" });
        },
      },
      {
        id: "deleteFirst",
        title: "Audit search, deletes the app and removes grants; a new consent brings it back; then disables it, revokes, restricts consent, warns AP",
        reasoning: "partial",
        drive: (c) => {
          task(c, "audit");
          task(c, "deleteApp");
          task(c, "removeGrants");
          task(c, "watch");
          task(c, "disableApp");
          task(c, "revokeSessions");
          task(c, "restrictConsent");
          task(c, "warnAp");
          close(c);
          c.act("notify", { who: "internal" });
          c.act("document", { cause: "consentPhish", prevent: "mfa" });
        },
      },
      {
        id: "slowNoAp",
        title: "Investigates and exports evidence first, watches; the app is still reading at 09:40 and the bank change goes through",
        reasoning: "partial",
        drive: (c) => {
          task(c, "audit");
          task(c, "perms");
          task(c, "preserve");
          watchUntil(c, 36);
          task(c, "disableApp");
          close(c);
          c.act("notify", { who: "full" });
          c.act("document", { cause: "consentPhish", prevent: "consentPolicy" });
        },
      },
      {
        id: "closedOpen",
        title: "Revokes the users' sessions only, blames stolen passwords and closes with the app's grants still working",
        reasoning: "missed",
        drive: (c) => {
          task(c, "revokeSessions");
          close(c);
          c.act("notify", { who: "nobody" });
          c.act("document", { cause: "password", prevent: "mfa" });
        },
      },
      {
        id: "lateWithAp",
        title: "Warns AP early, then works slowly: disabled after more consents, fraud attempt held by AP",
        reasoning: "partial",
        drive: (c) => {
          task(c, "warnAp");
          task(c, "audit");
          task(c, "perms");
          watchUntil(c, 30);
          task(c, "disableApp");
          task(c, "removeGrants");
          task(c, "revokeSessions");
          task(c, "restrictConsent");
          task(c, "preserve");
          close(c);
          c.act("notify", { who: "full" });
          c.act("document", { cause: "consentPhish", prevent: "consentPolicy" });
        },
      },
    ],
  };
}
