// REQ-274: golden paths for the CISM supplier-breach case on the security
// console (CISM/cism-payroll-supplier-breach.sim.json). No prototype exists,
// so the expectations are the engine's own results.
import type { StepPath, StepsSpec } from "./steps.ts";
import { close, task, watchUntil } from "./secplus-helpers.ts";

export const ENTRY = { course: "CISM", slug: "cism-payroll-supplier-breach" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}

type C = Parameters<StepPath["drive"]>[0];
const report = (c: C, who: string, treat: string, breach: string) => {
  c.act("notify", { who });
  c.act("document", { treat, breach });
};

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Reads the contract, checks our own log, rotates and restricts the key at 10 min, invokes cooperation, briefs the CFO and counsel, maps the data, records the treatment",
      reasoning: "met",
      drive: (c) => {
        task(c, "readContract");
        task(c, "pullLogs");
        task(c, "rotate");
        task(c, "callSupplier");
        task(c, "escalate");
        task(c, "dataMap");
        task(c, "register");
        close(c);
        report(c, "owners", "mitigate", "late");
      },
    },
    {
      id: "suspendAll",
      title: "Suspends the integration and rotates the key, but never resumes it: payroll misses the 10:00 cut-off",
      reasoning: "partial",
      drive: (c) => {
        task(c, "readContract");
        task(c, "suspend");
        task(c, "rotate");
        task(c, "callSupplier");
        task(c, "escalate");
        task(c, "dataMap");
        task(c, "register");
        watchUntil(c, 70);
        close(c);
        report(c, "owners", "mitigate", "late");
      },
    },
    {
      id: "waitSupplier",
      title: "Reads the contract, calls the supplier and briefs the CFO, then waits for the supplier: deposits change at 20 min and are paid out at 10:00",
      reasoning: "missed",
      drive: (c) => {
        task(c, "readContract");
        task(c, "callSupplier");
        task(c, "escalate");
        watchUntil(c, 70);
        close(c);
        report(c, "nobody", "accept", "ontime");
      },
    },
    {
      id: "terminate",
      title: "Emails all staff, then terminates the contract (which also kills the key) and briefs the CFO afterwards",
      reasoning: "missed",
      drive: (c) => {
        task(c, "readContract");
        task(c, "pullLogs");
        task(c, "notice");
        task(c, "terminate");
        task(c, "escalate");
        close(c);
        report(c, "staff", "avoid", "late");
      },
    },
    {
      id: "closeEarly",
      title: "Looks at the gateway log and closes as the supplier's problem, leaving the key valid",
      reasoning: "missed",
      drive: (c) => {
        task(c, "pullLogs");
        close(c);
        report(c, "nobody", "accept", "ontime");
      },
    },
    {
      id: "lateRotate",
      title: "Works the contract and the people first, checks the log at 20 min after the deposits changed, rotates at 25 and has HR revert them",
      reasoning: "partial",
      drive: (c) => {
        task(c, "readContract");
        task(c, "callSupplier");
        task(c, "escalate");
        task(c, "dataMap");
        task(c, "pullLogs");
        task(c, "rotate");
        task(c, "revert");
        task(c, "register");
        close(c);
        report(c, "owners", "mitigate", "late");
      },
    },
  ];
}
