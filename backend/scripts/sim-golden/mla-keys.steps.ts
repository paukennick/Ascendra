// REQ-335: golden paths for AWSMLA/long-term-bedrock-key-in-app-logs on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AWSMLA", slug: "long-term-bedrock-key-in-app-logs" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Usage, key type, task role, logs; role then revoke; purge and SCP; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "usage");
          run(c, "keytype");
          run(c, "taskrole");
          run(c, "logs");
          run(c, "switch");
          run(c, "guard");
          run(c, "verify");
          waitUntil(c, 56);
          close(c);
          c.act("document", { cause: "longterm" });
        },
      },
      {
        id: "harm",
        title: "Deactivates the key first",
        reasoning: "missed",
        drive: (c) => {
          run(c, "usage");
          run(c, "deactfirst");
          run(c, "verify");
          waitUntil(c, 56);
          close(c);
          c.act("document", { cause: "longterm" });
        },
      },
      {
        id: "noop",
        title: "Resets the key into the same app",
        reasoning: "partial",
        drive: (c) => {
          run(c, "usage");
          run(c, "rotate");
          run(c, "verify");
          waitUntil(c, 56);
          close(c);
          c.act("document", { cause: "longterm" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads usage and key, switches and revokes, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "usage");
          run(c, "keytype");
          run(c, "switch");
          run(c, "verify");
          waitUntil(c, 56);
          close(c);
          c.act("document", { cause: "longterm" });
        },
      },
      {
        id: "late",
        title: "Waits, revokes after 17:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "usage");
          waitUntil(c, 55);
          run(c, "switch");
          run(c, "verify");
          waitUntil(c, 63);
          close(c);
          c.act("document", { cause: "longterm" });
        },
      },
      {
        id: "blind",
        title: "Switches without looking and blames the vendor",
        reasoning: "missed",
        drive: (c) => {
          run(c, "switch");
          waitUntil(c, 56);
          close(c);
          c.act("document", { cause: "vendor" });
        },
      },
    ],
  };
}
