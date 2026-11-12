// REQ-231: golden paths for the Security+ leaked-cloud-key incident on the
// security console (SECPLUS/cloud-iam-backdoor.sim.json). No prototype
// exists, so the expectations are the engine's own results.
import type { StepPath, StepsSpec } from "./steps.ts";
import { close, task, watchUntil } from "./secplus-helpers.ts";

export const ENTRY = { course: "SECPLUS", slug: "cloud-iam-backdoor" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}

// Shared with the V8 band (secplus-cloud-v8.steps.ts): the same incident.
export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Audit trail, deactivate the key and quarantine support-ops by 8 min, escalate, list new identities, preserve, eradicate; notify the lead, leadership, legal and privacy",
      reasoning: "met",
      drive: (c) => {
        task(c, "reviewTrail");
        task(c, "quarantine", { which: "ci" });
        task(c, "quarantine", { which: "user" });
        task(c, "escalate");
        task(c, "reviewIdentities");
        task(c, "preserve");
        task(c, "eradicate");
        close(c);
        c.act("notify", { who: "full" });
        c.act("document", { cause: "leakedKey", data: "untouched" });
      },
    },
    {
      id: "slowSpread",
      title: "Escalates and reads the trail, waits to 12 min: the attacker adds a role and starts miners; all three shut by 24 min, snapshot before terminating",
      reasoning: "partial",
      drive: (c) => {
        task(c, "reviewTrail");
        task(c, "escalate");
        watchUntil(c, 12);
        task(c, "quarantine", { which: "ci" });
        task(c, "quarantine", { which: "user" });
        task(c, "reviewIdentities");
        task(c, "quarantine", { which: "role" });
        task(c, "preserve");
        task(c, "terminateMiners");
        task(c, "eradicate");
        close(c);
        c.act("notify", { who: "full" });
        c.act("document", { cause: "leakedKey", data: "untouched" });
      },
    },
    {
      id: "ipBlockOnly",
      title: "Blocks the attacker's address and watches: the same credentials come back from a new address and copy the customer data",
      reasoning: "missed",
      drive: (c) => {
        task(c, "blockIp");
        watchUntil(c, 90);
        c.answer();
        c.act("notify", { who: "nobody" });
        c.act("document", { cause: "phish", data: "untouched" });
      },
    },
    {
      id: "terminateFirst",
      title: "Shuts everything by 22 min but terminates the GPU instances before any snapshot",
      reasoning: "partial",
      drive: (c) => {
        task(c, "reviewTrail");
        task(c, "escalate");
        watchUntil(c, 16);
        task(c, "quarantine", { which: "ci" });
        task(c, "quarantine", { which: "user" });
        task(c, "quarantine", { which: "role" });
        task(c, "terminateMiners");
        task(c, "reviewIdentities");
        task(c, "preserve");
        task(c, "eradicate");
        close(c);
        c.act("notify", { who: "full" });
        c.act("document", { cause: "leakedKey", data: "untouched" });
      },
    },
    {
      id: "missedRole",
      title: "Shuts the key and support-ops at 12 min but never lists new identities: the outside role still works at close",
      reasoning: "partial",
      drive: (c) => {
        task(c, "reviewTrail");
        task(c, "escalate");
        watchUntil(c, 12);
        task(c, "quarantine", { which: "ci" });
        task(c, "quarantine", { which: "user" });
        task(c, "preserve");
        close(c);
        c.act("notify", { who: "full" });
        c.act("document", { cause: "leakedKey", data: "untouched" });
      },
    },
    {
      id: "lateStop",
      title: "Watches until the copy starts at 40 min, then shuts all three, keeps evidence and eradicates; engineering told only",
      reasoning: "partial",
      drive: (c) => {
        task(c, "reviewTrail");
        watchUntil(c, 40);
        task(c, "quarantine", { which: "ci" });
        task(c, "quarantine", { which: "user" });
        task(c, "quarantine", { which: "role" });
        task(c, "reviewIdentities");
        task(c, "preserve");
        task(c, "terminateMiners");
        task(c, "eradicate");
        task(c, "escalate");
        close(c);
        c.act("notify", { who: "internal" });
        c.act("document", { cause: "leakedKey", data: "partial" });
      },
    },
  ];
}
