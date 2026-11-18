// REQ-335: golden paths for AZ140/bad-image-version-spreads-to-new-hosts on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AZ140", slug: "bad-image-version-spreads-to-new-hosts" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Versions per host, latest, crash, sessions; exclude and drain; replace and gate; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "which");
          run(c, "latest");
          run(c, "crash");
          run(c, "sessions");
          run(c, "exclude");
          run(c, "pipeline");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "image" });
        },
      },
      {
        id: "harm",
        title: "Deletes the six hosts",
        reasoning: "missed",
        drive: (c) => {
          run(c, "which");
          run(c, "delete");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "image" });
        },
      },
      {
        id: "noop",
        title: "Restarts the six hosts",
        reasoning: "partial",
        drive: (c) => {
          run(c, "which");
          run(c, "restart");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "image" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads hosts and latest, excludes and drains, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "which");
          run(c, "latest");
          run(c, "exclude");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "image" });
        },
      },
      {
        id: "late",
        title: "Waits, excludes after 10:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "which");
          waitUntil(c, 50);
          run(c, "exclude");
          run(c, "verify");
          waitUntil(c, 58);
          close(c);
          c.act("document", { cause: "image" });
        },
      },
      {
        id: "blind",
        title: "Excludes without looking and blames the app server",
        reasoning: "missed",
        drive: (c) => {
          run(c, "exclude");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "app" });
        },
      },
    ],
  };
}
