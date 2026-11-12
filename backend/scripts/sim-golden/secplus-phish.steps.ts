// REQ-231: golden paths for the Security+ phished-account incident on the
// security console (SECPLUS/phish-to-account-takeover.sim.json). No
// prototype exists, so the expectations are the engine's own results.
import type { StepPath, StepsSpec } from "./steps.ts";
import { close, task, watchUntil } from "./secplus-helpers.ts";

export const ENTRY = { course: "SECPLUS", slug: "phish-to-account-takeover" };

const jpike = (how: string) => ({ who: "jpike", how });

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}

// Shared with the V8 band (secplus-phish-v8.steps.ts): the same incident.
export function paths(): StepPath[] {
  return [
      {
        id: "expert",
        title: "Sign-ins, disable and revoke at 5 min, escalate, search, block the domain, preserve, purge, check persistence; notify the lead, management, legal and finance",
        reasoning: "met",
        drive: (c) => {
          task(c, "reviewSignins");
          task(c, "containAccount", jpike("disable"));
          task(c, "escalate");
          task(c, "searchMail");
          task(c, "blockIndicator", { what: "domain" });
          task(c, "preserveEvidence");
          task(c, "purgeMessage");
          task(c, "reviewMailbox");
          close(c);
          c.act("notify", { who: "lead" });
          c.act("document", { cause: "phishMfa", scope: "one" });
        },
      },
      {
        id: "slow",
        title: "Investigates first and contains at 35 min: persistence built, mreyes clicks; both contained, evidence before the purge, late escalation",
        reasoning: "partial",
        drive: (c) => {
          task(c, "searchMail");
          task(c, "reviewSignins");
          watchUntil(c, 20);
          task(c, "reviewMailbox");
          watchUntil(c, 35);
          task(c, "containAccount", jpike("disable"));
          task(c, "reviewMailbox");
          task(c, "removePersistence");
          task(c, "containAccount", { who: "mreyes", how: "disable" });
          task(c, "blockIndicator", { what: "domain" });
          task(c, "preserveEvidence");
          task(c, "purgeMessage");
          task(c, "escalate");
          close(c);
          c.act("notify", { who: "users" });
          c.act("document", { cause: "phishMfa", scope: "two" });
        },
      },
      {
        id: "resetOnly",
        title: "Resets jpike's password and waits: the session lives on and sends a customer new bank details",
        reasoning: "missed",
        drive: (c) => {
          task(c, "reviewSignins");
          task(c, "containAccount", jpike("reset"));
          watchUntil(c, 120);
          c.answer();
          c.act("notify", { who: "nobody" });
          c.act("document", { cause: "malware", scope: "one" });
        },
      },
      {
        id: "wipeFirst",
        title: "Fast containment, then the laptop is reimaged before any collection",
        reasoning: "partial",
        drive: (c) => {
          task(c, "reviewSignins");
          task(c, "containAccount", jpike("disable"));
          task(c, "escalate");
          task(c, "searchMail");
          task(c, "blockIndicator", { what: "domain" });
          task(c, "reimageLaptop");
          task(c, "preserveEvidence");
          task(c, "purgeMessage");
          task(c, "reviewMailbox");
          close(c);
          c.act("notify", { who: "lead" });
          c.act("document", { cause: "phishMfa", scope: "one" });
        },
      },
      {
        id: "missSecond",
        title: "Contains jpike at 25 min and cleans its persistence, but never searches the other mailboxes: mreyes stays compromised",
        reasoning: "partial",
        drive: (c) => {
          task(c, "reviewSignins");
          task(c, "escalate");
          watchUntil(c, 25);
          task(c, "containAccount", jpike("disable"));
          task(c, "preserveEvidence");
          task(c, "reviewMailbox");
          task(c, "removePersistence");
          watchUntil(c, 40);
          close(c);
          c.act("notify", { who: "lead" });
          c.act("document", { cause: "phishMfa", scope: "one" });
        },
      },
      {
        id: "quietTarget",
        title: "Contained, scoped and preserved, but only the IP blocked, a late escalation, only the users told and a wrong root cause",
        reasoning: "partial",
        drive: (c) => {
          task(c, "reviewSignins");
          task(c, "containAccount", jpike("disable"));
          task(c, "searchMail");
          task(c, "blockIndicator", { what: "ip" });
          task(c, "preserveEvidence");
          task(c, "purgeMessage");
          task(c, "reviewMailbox");
          task(c, "escalate");
          close(c);
          c.act("notify", { who: "users" });
          c.act("document", { cause: "spray", scope: "one" });
        },
      },
  ];
}
