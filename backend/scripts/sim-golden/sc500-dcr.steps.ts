// REQ-335: golden paths for SC500/arc-servers-missing-from-security-dcr on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "SC500", slug: "arc-servers-missing-from-security-dcr" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Events, associations, agent, heartbeat; associate; onboarding and alert; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "events");
          run(c, "assoc");
          run(c, "agent");
          run(c, "heartbeat");
          run(c, "associate");
          run(c, "guard");
          run(c, "verify");
          waitUntil(c, 76);
          close(c);
          c.act("document", { cause: "assoc" });
        },
      },
      {
        id: "harm",
        title: "Switches to all events everywhere",
        reasoning: "missed",
        drive: (c) => {
          run(c, "events");
          run(c, "all");
          run(c, "verify");
          waitUntil(c, 76);
          close(c);
          c.act("document", { cause: "assoc" });
        },
      },
      {
        id: "noop",
        title: "Lowers the rule threshold",
        reasoning: "partial",
        drive: (c) => {
          run(c, "events");
          run(c, "threshold");
          run(c, "verify");
          waitUntil(c, 76);
          close(c);
          c.act("document", { cause: "assoc" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads events and associations, associates, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "events");
          run(c, "assoc");
          run(c, "associate");
          run(c, "verify");
          waitUntil(c, 76);
          close(c);
          c.act("document", { cause: "assoc" });
        },
      },
      {
        id: "late",
        title: "Waits, associates after 11:30",
        reasoning: "partial",
        drive: (c) => {
          run(c, "events");
          waitUntil(c, 75);
          run(c, "associate");
          run(c, "verify");
          waitUntil(c, 83);
          close(c);
          c.act("document", { cause: "assoc" });
        },
      },
      {
        id: "blind",
        title: "Associates without looking and blames the agents",
        reasoning: "missed",
        drive: (c) => {
          run(c, "associate");
          waitUntil(c, 76);
          close(c);
          c.act("document", { cause: "agent" });
        },
      },
    ],
  };
}
