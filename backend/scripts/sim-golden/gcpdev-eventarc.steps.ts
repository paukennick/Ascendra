// REQ-335: golden paths for GCPDEV/eventarc-trigger-wrong-region-for-bucket on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "GCPDEV", slug: "eventarc-trigger-wrong-region-for-bucket" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Trigger, bucket, agent role, invoker; recreate in region; script and alert; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "trigger");
          run(c, "bucket");
          run(c, "agent");
          run(c, "sa");
          run(c, "recreate");
          run(c, "guard");
          run(c, "verify");
          waitUntil(c, 111);
          close(c);
          c.act("document", { cause: "region" });
        },
      },
      {
        id: "harm",
        title: "Makes the service public",
        reasoning: "missed",
        drive: (c) => {
          run(c, "trigger");
          run(c, "public");
          run(c, "verify");
          waitUntil(c, 111);
          close(c);
          c.act("document", { cause: "region" });
        },
      },
      {
        id: "noop",
        title: "Redeploys the service",
        reasoning: "partial",
        drive: (c) => {
          run(c, "trigger");
          run(c, "redeploy");
          run(c, "verify");
          waitUntil(c, 111);
          close(c);
          c.act("document", { cause: "region" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads trigger and bucket, recreates, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "trigger");
          run(c, "bucket");
          run(c, "recreate");
          run(c, "verify");
          waitUntil(c, 111);
          close(c);
          c.act("document", { cause: "region" });
        },
      },
      {
        id: "late",
        title: "Waits, fixes after 12:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "trigger");
          waitUntil(c, 110);
          run(c, "recreate");
          run(c, "verify");
          waitUntil(c, 118);
          close(c);
          c.act("document", { cause: "region" });
        },
      },
      {
        id: "blind",
        title: "Recreates without looking and blames the code",
        reasoning: "missed",
        drive: (c) => {
          run(c, "recreate");
          waitUntil(c, 111);
          close(c);
          c.act("document", { cause: "role" });
        },
      },
    ],
  };
}
