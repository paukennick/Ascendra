// REQ-238: golden paths for the SecurityX forged-token incident on the
// security console (SECURITYX/federation-token-forgery.sim.json). No
// prototype exists, so the expectations are the engine's own results.
import type { StepPath, StepsSpec } from "./steps.ts";
import { close, task, watchUntil } from "./secplus-helpers.ts";

export const ENTRY = { course: "SECURITYX", slug: "federation-token-forgery" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Incident command, find the key theft, disable svc-fed-sync, rotate twice, revoke by 30 min, correlate, review apps, image, rebuild in tier 0; notify everyone with a stake",
      reasoning: "met",
      drive: (c) => {
        task(c, "escalate");
        task(c, "reviewFed");
        task(c, "disableSvc");
        task(c, "rotate", { times: "twice" });
        task(c, "revokeSessions");
        task(c, "correlate");
        task(c, "reviewApps");
        task(c, "imageFed");
        task(c, "rebuildFed");
        close(c);
        c.act("notify", { who: "full" });
        c.act("document", { cause: "key", fix: "tier0" });
      },
    },
    {
      id: "rotateOnce",
      title: "Correlates, rotates once and revokes sessions: the old certificate is still trusted, a backdoor app appears and executive mail is exported at 65 min",
      reasoning: "missed",
      drive: (c) => {
        task(c, "correlate");
        task(c, "rotate", { times: "once" });
        task(c, "revokeSessions");
        watchUntil(c, 90);
        c.answer();
        c.act("notify", { who: "it" });
        c.act("document", { cause: "phish", fix: "mfa" });
      },
    },
    {
      id: "rotateNoFoothold",
      title: "Rotates twice and revokes without finding the stolen key's source: svc-fed-sync reads the new key and forging resumes; closed at 40 min",
      reasoning: "partial",
      drive: (c) => {
        task(c, "escalate");
        task(c, "rotate", { times: "twice" });
        task(c, "revokeSessions");
        task(c, "correlate");
        task(c, "watch");
        close(c);
        c.act("notify", { who: "full" });
        c.act("document", { cause: "key", fix: "mfa" });
      },
    },
    {
      id: "rebuildFirst",
      title: "Finds the key theft, disables the account and cuts federation, then rebuilds the federation servers without imaging them",
      reasoning: "partial",
      drive: (c) => {
        task(c, "escalate");
        task(c, "reviewFed");
        task(c, "disableSvc");
        task(c, "rotate", { times: "twice" });
        task(c, "revokeSessions");
        task(c, "rebuildFed");
        task(c, "reviewApps");
        close(c);
        c.act("notify", { who: "full" });
        c.act("document", { cause: "key", fix: "tier0" });
      },
    },
    {
      id: "cutLate",
      title: "Investigates for 23 min, then cuts the federation trust and revokes at 43: the attacker made an app; found and removed at 59 min, after the export started",
      reasoning: "partial",
      drive: (c) => {
        task(c, "correlate");
        task(c, "reviewFed");
        task(c, "disableSvc");
        task(c, "cutFederation");
        task(c, "revokeSessions");
        task(c, "reviewApps");
        task(c, "removeApp");
        task(c, "imageFed");
        task(c, "escalate");
        close(c);
        c.act("notify", { who: "full" });
        c.act("document", { cause: "key", fix: "tier0" });
      },
    },
    {
      id: "appMissed",
      title: "Cuts the foothold and the trust but revokes only at 35 min, after the backdoor app was made, and never looks for it",
      reasoning: "partial",
      drive: (c) => {
        task(c, "escalate");
        task(c, "reviewFed");
        task(c, "disableSvc");
        task(c, "cutFederation");
        task(c, "imageFed");
        task(c, "revokeSessions");
        close(c);
        c.act("notify", { who: "nobody" });
        c.act("document", { cause: "key", fix: "tier0" });
      },
    },
  ];
}
