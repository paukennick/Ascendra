// REQ-320: golden paths for DP300/sleeping-session-blocks-orders on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "DP300", slug: "sleeping-session-blocks-orders" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Chain, input buffer, owner, KILL 87, verify, blocked process report",
        reasoning: "met",
        drive: (c) => {
          run(c, "chain");
          run(c, "buffer");
          run(c, "contact");
          run(c, "kill");
          run(c, "verify");
          run(c, "xe");
          waitUntil(c, 31);
          close(c);
          c.act("document", { cause: "opentran" });
        },
      },
      {
        id: "restart",
        title: "Restarts the SQL Server service",
        reasoning: "missed",
        drive: (c) => {
          run(c, "restart");
          waitUntil(c, 31);
          close(c);
          c.act("document", { cause: "server" });
        },
      },
      {
        id: "killVictims",
        title: "Kills the hanging sessions and waits; invoicing is blocked",
        reasoning: "missed",
        drive: (c) => {
          run(c, "chain");
          run(c, "killVictims");
          waitUntil(c, 31);
          close(c);
          c.act("document", { cause: "app" });
        },
      },
      {
        id: "blindKill",
        title: "Finds the chain and kills 87 without reading it or asking; checks",
        reasoning: "partial",
        drive: (c) => {
          run(c, "chain");
          run(c, "kill");
          run(c, "verify");
          waitUntil(c, 31);
          close(c);
          c.act("document", { cause: "opentran" });
        },
      },
      {
        id: "nolockThenKill",
        title: "Asks for NOLOCK, then finds and ends the head blocker late in the half hour",
        reasoning: "partial",
        drive: (c) => {
          run(c, "nolock");
          run(c, "chain");
          run(c, "buffer");
          run(c, "contact");
          run(c, "kill");
          run(c, "xe");
          waitUntil(c, 31);
          close(c);
          c.act("document", { cause: "opentran" });
        },
      },
      {
        id: "slow",
        title: "Reads everything but kills after 09:30",
        reasoning: "partial",
        drive: (c) => {
          run(c, "chain");
          run(c, "buffer");
          run(c, "contact");
          waitUntil(c, 31);
          run(c, "kill");
          run(c, "verify");
          close(c);
          c.act("document", { cause: "opentran" });
        },
      },
    ],
  };
}
