// REQ-335: golden paths for AZ140/one-minute-disconnect-limit-kills-field-sessions on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AZ140", slug: "one-minute-disconnect-limit-kills-field-sessions" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Events, registry, profile, network; AVD limits with security; record; test",
        reasoning: "met",
        drive: (c) => {
          run(c, "events");
          run(c, "rsop");
          run(c, "profile");
          run(c, "net");
          run(c, "override");
          run(c, "doc");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "limit" });
        },
      },
      {
        id: "harm",
        title: "Unassigns the hardening profile",
        reasoning: "missed",
        drive: (c) => {
          run(c, "events");
          run(c, "unassign");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "limit" });
        },
      },
      {
        id: "noop",
        title: "Enables RDP Shortpath",
        reasoning: "partial",
        drive: (c) => {
          run(c, "events");
          run(c, "shortpath");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "limit" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads events and the limit, sets AVD limits, tests",
        reasoning: "partial",
        drive: (c) => {
          run(c, "events");
          run(c, "rsop");
          run(c, "override");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "limit" });
        },
      },
      {
        id: "late",
        title: "Waits, changes after 10:30",
        reasoning: "partial",
        drive: (c) => {
          run(c, "events");
          waitUntil(c, 50);
          run(c, "override");
          run(c, "verify");
          waitUntil(c, 58);
          close(c);
          c.act("document", { cause: "limit" });
        },
      },
      {
        id: "blind",
        title: "Changes limits without looking and blames the network",
        reasoning: "missed",
        drive: (c) => {
          run(c, "override");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "network" });
        },
      },
    ],
  };
}
