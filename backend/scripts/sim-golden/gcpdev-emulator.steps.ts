// REQ-335: golden paths for GCPDEV/integration-tests-share-staging-firestore on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "GCPDEV", slug: "integration-tests-share-staging-firestore" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Failures, config, local script, access; emulator in CI; access and guard; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "fails");
          run(c, "cfg");
          run(c, "local");
          run(c, "perm");
          run(c, "emulator");
          run(c, "guard");
          run(c, "verify");
          waitUntil(c, 151);
          close(c);
          c.act("document", { cause: "shared" });
        },
      },
      {
        id: "harm",
        title: "Points tests at production",
        reasoning: "missed",
        drive: (c) => {
          run(c, "fails");
          run(c, "prod");
          run(c, "verify");
          waitUntil(c, 151);
          close(c);
          c.act("document", { cause: "shared" });
        },
      },
      {
        id: "noop",
        title: "Adds retries",
        reasoning: "partial",
        drive: (c) => {
          run(c, "fails");
          run(c, "retry");
          run(c, "verify");
          waitUntil(c, 151);
          close(c);
          c.act("document", { cause: "shared" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads failures and config, adds the emulator, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "fails");
          run(c, "cfg");
          run(c, "emulator");
          run(c, "verify");
          waitUntil(c, 151);
          close(c);
          c.act("document", { cause: "shared" });
        },
      },
      {
        id: "late",
        title: "Waits, fixes after 17:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "fails");
          waitUntil(c, 150);
          run(c, "emulator");
          run(c, "verify");
          waitUntil(c, 158);
          close(c);
          c.act("document", { cause: "shared" });
        },
      },
      {
        id: "blind",
        title: "Adds the emulator without looking and blames Firestore",
        reasoning: "missed",
        drive: (c) => {
          run(c, "emulator");
          waitUntil(c, 151);
          close(c);
          c.act("document", { cause: "flaky" });
        },
      },
    ],
  };
}
