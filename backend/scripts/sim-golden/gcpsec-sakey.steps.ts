// REQ-335: golden paths for GCPSEC/service-account-key-on-public-repo on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "GCPSEC", slug: "service-account-key-on-public-repo" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Keys, key usage, dependencies, data read; disable and delete; contain; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "keys");
          run(c, "usage");
          run(c, "deps");
          run(c, "data");
          run(c, "disable");
          run(c, "contain");
          run(c, "verify");
          waitUntil(c, 56);
          close(c);
          c.act("document", { cause: "key" });
        },
      },
      {
        id: "harm",
        title: "Deletes the service account",
        reasoning: "missed",
        drive: (c) => {
          run(c, "keys");
          run(c, "deletesa");
          run(c, "verify");
          waitUntil(c, 56);
          close(c);
          c.act("document", { cause: "key" });
        },
      },
      {
        id: "noop",
        title: "Resets the contractor's password",
        reasoning: "partial",
        drive: (c) => {
          run(c, "keys");
          run(c, "rotateuser");
          run(c, "verify");
          waitUntil(c, 56);
          close(c);
          c.act("document", { cause: "key" });
        },
      },
      {
        id: "fixOnly",
        title: "Lists keys and usage, disables the key, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "keys");
          run(c, "usage");
          run(c, "disable");
          run(c, "verify");
          waitUntil(c, 56);
          close(c);
          c.act("document", { cause: "key" });
        },
      },
      {
        id: "late",
        title: "Waits, disables after 12:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "keys");
          waitUntil(c, 55);
          run(c, "disable");
          run(c, "verify");
          waitUntil(c, 63);
          close(c);
          c.act("document", { cause: "key" });
        },
      },
      {
        id: "blind",
        title: "Disables without looking and blames the contractor's password",
        reasoning: "missed",
        drive: (c) => {
          run(c, "disable");
          waitUntil(c, 56);
          close(c);
          c.act("document", { cause: "password" });
        },
      },
    ],
  };
}
