// REQ-335: golden paths for GCPSEC/eu-patient-data-created-in-us on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "GCPSEC", slug: "eu-patient-data-created-in-us" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Policy, inventory, Terraform, access; enforce and move; module and CI; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "policy");
          run(c, "inv");
          run(c, "tf");
          run(c, "access");
          run(c, "enforce");
          run(c, "guard");
          run(c, "verify");
          waitUntil(c, 211);
          close(c);
          c.act("document", { cause: "nopolicy" });
        },
      },
      {
        id: "harm",
        title: "Deletes the US bucket first",
        reasoning: "missed",
        drive: (c) => {
          run(c, "policy");
          run(c, "deletenow");
          run(c, "verify");
          waitUntil(c, 211);
          close(c);
          c.act("document", { cause: "nopolicy" });
        },
      },
      {
        id: "noop",
        title: "Sets the policy only",
        reasoning: "partial",
        drive: (c) => {
          run(c, "policy");
          run(c, "policyonly");
          run(c, "verify");
          waitUntil(c, 211);
          close(c);
          c.act("document", { cause: "nopolicy" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads policy and inventory, enforces and moves, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "policy");
          run(c, "inv");
          run(c, "enforce");
          run(c, "verify");
          waitUntil(c, 211);
          close(c);
          c.act("document", { cause: "nopolicy" });
        },
      },
      {
        id: "late",
        title: "Waits, fixes after 17:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "policy");
          waitUntil(c, 210);
          run(c, "enforce");
          run(c, "verify");
          waitUntil(c, 218);
          close(c);
          c.act("document", { cause: "nopolicy" });
        },
      },
      {
        id: "blind",
        title: "Enforces without looking and blames a user",
        reasoning: "missed",
        drive: (c) => {
          run(c, "enforce");
          waitUntil(c, 211);
          close(c);
          c.act("document", { cause: "google" });
        },
      },
    ],
  };
}
