// REQ-335: golden paths for GCPDEVOPS/cost-exclusion-hides-checkout-errors on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "GCPDEVOPS", slug: "cost-exclusion-hides-checkout-errors" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Exclusion, pod logs, volume, audit; narrow; alert and runbook; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "excl");
          run(c, "src");
          run(c, "vol");
          run(c, "change");
          run(c, "narrow");
          run(c, "review");
          run(c, "verify");
          waitUntil(c, 71);
          close(c);
          c.act("document", { cause: "exclusion" });
        },
      },
      {
        id: "harm",
        title: "Disables the _Default sink",
        reasoning: "missed",
        drive: (c) => {
          run(c, "excl");
          run(c, "disable");
          run(c, "verify");
          waitUntil(c, 71);
          close(c);
          c.act("document", { cause: "exclusion" });
        },
      },
      {
        id: "noop",
        title: "Searches a wider time range",
        reasoning: "partial",
        drive: (c) => {
          run(c, "excl");
          run(c, "widen");
          run(c, "verify");
          waitUntil(c, 71);
          close(c);
          c.act("document", { cause: "exclusion" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads exclusion and pod logs, narrows, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "excl");
          run(c, "src");
          run(c, "narrow");
          run(c, "verify");
          waitUntil(c, 71);
          close(c);
          c.act("document", { cause: "exclusion" });
        },
      },
      {
        id: "late",
        title: "Waits, narrows after 16:30",
        reasoning: "partial",
        drive: (c) => {
          run(c, "excl");
          waitUntil(c, 70);
          run(c, "narrow");
          run(c, "verify");
          waitUntil(c, 78);
          close(c);
          c.act("document", { cause: "exclusion" });
        },
      },
      {
        id: "blind",
        title: "Narrows without looking and blames the agent",
        reasoning: "missed",
        drive: (c) => {
          run(c, "narrow");
          waitUntil(c, 71);
          close(c);
          c.act("document", { cause: "agent" });
        },
      },
    ],
  };
}
