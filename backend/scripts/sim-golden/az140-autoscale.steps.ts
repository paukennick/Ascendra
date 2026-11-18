// REQ-335: golden paths for AZ140/scaling-plan-utc-forces-logoff-midshift on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AZ140", slug: "scaling-plan-utc-forces-logoff-midshift" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Plan, autoscale phase, sessions, template; time zone; review; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "plan");
          run(c, "diag");
          run(c, "sessions");
          run(c, "tmpl");
          run(c, "tz");
          run(c, "review");
          run(c, "verify");
          waitUntil(c, 31);
          close(c);
          c.act("document", { cause: "tz" });
        },
      },
      {
        id: "harm",
        title: "Deletes the scaling plan",
        reasoning: "missed",
        drive: (c) => {
          run(c, "plan");
          run(c, "delete");
          run(c, "verify");
          waitUntil(c, 31);
          close(c);
          c.act("document", { cause: "tz" });
        },
      },
      {
        id: "noop",
        title: "Undrains the hosts",
        reasoning: "partial",
        drive: (c) => {
          run(c, "plan");
          run(c, "drain");
          run(c, "verify");
          waitUntil(c, 31);
          close(c);
          c.act("document", { cause: "tz" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads the plan and phase, fixes the time zone, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "plan");
          run(c, "diag");
          run(c, "tz");
          run(c, "verify");
          waitUntil(c, 31);
          close(c);
          c.act("document", { cause: "tz" });
        },
      },
      {
        id: "late",
        title: "Waits, fixes after 09:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "plan");
          waitUntil(c, 30);
          run(c, "tz");
          run(c, "verify");
          waitUntil(c, 38);
          close(c);
          c.act("document", { cause: "tz" });
        },
      },
      {
        id: "blind",
        title: "Fixes the time zone without looking and blames capacity",
        reasoning: "missed",
        drive: (c) => {
          run(c, "tz");
          waitUntil(c, 31);
          close(c);
          c.act("document", { cause: "capacity" });
        },
      },
    ],
  };
}
