// REQ-335: golden paths for AWSSAP/sqs-visibility-shorter-than-work on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AWSSAP", slug: "sqs-visibility-shorter-than-work" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Attributes, durations, receive log, code; timeout and key; refunds; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "attrs");
          run(c, "dur");
          run(c, "recv");
          run(c, "code");
          run(c, "vis");
          run(c, "refund");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "visibility" });
        },
      },
      {
        id: "harm",
        title: "Purges the queue",
        reasoning: "missed",
        drive: (c) => {
          run(c, "attrs");
          run(c, "purge");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "visibility" });
        },
      },
      {
        id: "noop",
        title: "Turns on long polling",
        reasoning: "partial",
        drive: (c) => {
          run(c, "attrs");
          run(c, "longpoll");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "visibility" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads timeout and durations, fixes both, verifies; no refunds",
        reasoning: "partial",
        drive: (c) => {
          run(c, "attrs");
          run(c, "dur");
          run(c, "vis");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "visibility" });
        },
      },
      {
        id: "late",
        title: "Waits, fixes after 14:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "attrs");
          waitUntil(c, 50);
          run(c, "vis");
          run(c, "verify");
          waitUntil(c, 58);
          close(c);
          c.act("document", { cause: "visibility" });
        },
      },
      {
        id: "blind",
        title: "Fixes without looking and blames the provider",
        reasoning: "missed",
        drive: (c) => {
          run(c, "vis");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "provider" });
        },
      },
    ],
  };
}
