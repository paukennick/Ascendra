// REQ-335: golden paths for AZ140/tls-inspection-breaks-session-hosts on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AZ140", slug: "tls-inspection-breaks-session-hosts" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Hosts, firewall logs, agent, routes; exclude AVD traffic; agree and alert; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "status");
          run(c, "fwlog");
          run(c, "agent");
          run(c, "route");
          run(c, "exempt");
          run(c, "agree");
          run(c, "verify");
          waitUntil(c, 71);
          close(c);
          c.act("document", { cause: "tls" });
        },
      },
      {
        id: "harm",
        title: "Deletes the default route",
        reasoning: "missed",
        drive: (c) => {
          run(c, "status");
          run(c, "bypass");
          run(c, "verify");
          waitUntil(c, 71);
          close(c);
          c.act("document", { cause: "tls" });
        },
      },
      {
        id: "noop",
        title: "Restarts every session host",
        reasoning: "partial",
        drive: (c) => {
          run(c, "status");
          run(c, "restart");
          run(c, "verify");
          waitUntil(c, 71);
          close(c);
          c.act("document", { cause: "tls" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads hosts and firewall logs, excludes, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "status");
          run(c, "fwlog");
          run(c, "exempt");
          run(c, "verify");
          waitUntil(c, 71);
          close(c);
          c.act("document", { cause: "tls" });
        },
      },
      {
        id: "late",
        title: "Waits, excludes after 08:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "status");
          waitUntil(c, 70);
          run(c, "exempt");
          run(c, "verify");
          waitUntil(c, 78);
          close(c);
          c.act("document", { cause: "tls" });
        },
      },
      {
        id: "blind",
        title: "Excludes without looking and blames the agent",
        reasoning: "missed",
        drive: (c) => {
          run(c, "exempt");
          waitUntil(c, 71);
          close(c);
          c.act("document", { cause: "agent" });
        },
      },
    ],
  };
}
