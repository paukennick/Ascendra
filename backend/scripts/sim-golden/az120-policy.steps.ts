// REQ-335: golden paths for AZ120/baseline-policy-denies-hana-vm-size on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AZ120", slug: "baseline-policy-denies-hana-vm-size" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Error, assignment, compliance, rights; approved waiver; parameter PR; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "err");
          run(c, "assign");
          run(c, "compl");
          run(c, "perm");
          run(c, "exempt");
          run(c, "param");
          run(c, "verify");
          waitUntil(c, 91);
          close(c);
          c.act("document", { cause: "policy" });
        },
      },
      {
        id: "harm",
        title: "Deletes the baseline assignment",
        reasoning: "missed",
        drive: (c) => {
          run(c, "err");
          run(c, "unassign");
          run(c, "verify");
          waitUntil(c, 91);
          close(c);
          c.act("document", { cause: "policy" });
        },
      },
      {
        id: "noop",
        title: "Grants the deployer Owner",
        reasoning: "partial",
        drive: (c) => {
          run(c, "err");
          run(c, "owner");
          run(c, "verify");
          waitUntil(c, 91);
          close(c);
          c.act("document", { cause: "policy" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads the deny and parameters, waives, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "err");
          run(c, "assign");
          run(c, "exempt");
          run(c, "verify");
          waitUntil(c, 91);
          close(c);
          c.act("document", { cause: "policy" });
        },
      },
      {
        id: "late",
        title: "Waits, waives after 20:30",
        reasoning: "partial",
        drive: (c) => {
          run(c, "err");
          waitUntil(c, 90);
          run(c, "exempt");
          run(c, "verify");
          waitUntil(c, 98);
          close(c);
          c.act("document", { cause: "policy" });
        },
      },
      {
        id: "blind",
        title: "Waives without looking and blames quota",
        reasoning: "missed",
        drive: (c) => {
          run(c, "exempt");
          waitUntil(c, 91);
          close(c);
          c.act("document", { cause: "quota" });
        },
      },
    ],
  };
}
