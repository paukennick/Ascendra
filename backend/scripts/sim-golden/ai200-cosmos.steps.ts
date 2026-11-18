// REQ-335: golden paths for AI200/cosmos-query-without-partition-key-429 on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AI200", slug: "cosmos-query-without-partition-key-429" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Normalized RU, query charge, code, index; pass the key; revert and guard; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "metrics");
          run(c, "charge");
          run(c, "code");
          run(c, "idx");
          run(c, "pk");
          run(c, "guard");
          run(c, "verify");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "fanout" });
        },
      },
      {
        id: "harm",
        title: "Recreates the container",
        reasoning: "missed",
        drive: (c) => {
          run(c, "metrics");
          run(c, "rekey");
          run(c, "verify");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "fanout" });
        },
      },
      {
        id: "noop",
        title: "Raises SDK retries",
        reasoning: "partial",
        drive: (c) => {
          run(c, "metrics");
          run(c, "retries");
          run(c, "verify");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "fanout" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads RU and charge, passes the key, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "metrics");
          run(c, "charge");
          run(c, "pk");
          run(c, "verify");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "fanout" });
        },
      },
      {
        id: "late",
        title: "Waits, fixes after 11:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "metrics");
          waitUntil(c, 45);
          run(c, "pk");
          run(c, "verify");
          waitUntil(c, 53);
          close(c);
          c.act("document", { cause: "fanout" });
        },
      },
      {
        id: "blind",
        title: "Passes the key without looking and blames a hot partition",
        reasoning: "missed",
        drive: (c) => {
          run(c, "pk");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "hot" });
        },
      },
    ],
  };
}
