// REQ-335: golden paths for AWSDEA/redshift-idle-transaction-blocks-load on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AWSDEA", slug: "redshift-idle-transaction-blocks-load" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Transactions, history, ELT, WLM; terminate; timeout; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "waits");
          run(c, "what");
          run(c, "etlstat");
          run(c, "wlm");
          run(c, "terminate");
          run(c, "timeout");
          run(c, "verify");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "idletxn" });
        },
      },
      {
        id: "harm",
        title: "Reboots the cluster",
        reasoning: "missed",
        drive: (c) => {
          run(c, "waits");
          run(c, "reboot");
          run(c, "verify");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "idletxn" });
        },
      },
      {
        id: "noop",
        title: "Raises WLM concurrency",
        reasoning: "partial",
        drive: (c) => {
          run(c, "waits");
          run(c, "wlmslots");
          run(c, "verify");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "idletxn" });
        },
      },
      {
        id: "fixOnly",
        title: "Finds the holder, terminates it, verifies; no timeout",
        reasoning: "partial",
        drive: (c) => {
          run(c, "waits");
          run(c, "what");
          run(c, "terminate");
          run(c, "verify");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "idletxn" });
        },
      },
      {
        id: "late",
        title: "Waits for the load, terminates after 08:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "waits");
          waitUntil(c, 45);
          run(c, "terminate");
          run(c, "verify");
          waitUntil(c, 53);
          close(c);
          c.act("document", { cause: "idletxn" });
        },
      },
      {
        id: "blind",
        title: "Terminates without looking and blames WLM",
        reasoning: "missed",
        drive: (c) => {
          run(c, "terminate");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "slots" });
        },
      },
    ],
  };
}
