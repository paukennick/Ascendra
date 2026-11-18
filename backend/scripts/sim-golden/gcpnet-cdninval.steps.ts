// REQ-335: golden paths for GCPNET/cdn-serves-wrong-price-after-fix on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "GCPNET", slug: "cdn-serves-wrong-price-after-fix" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "CDN vs origin, cache logs, paths, origin capacity; targeted invalidation; TTL; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "curl");
          run(c, "logs");
          run(c, "scope");
          run(c, "origincap");
          run(c, "inval");
          run(c, "ttl");
          run(c, "verify");
          waitUntil(c, 36);
          close(c);
          c.act("document", { cause: "cache" });
        },
      },
      {
        id: "harm",
        title: "Invalidates everything",
        reasoning: "missed",
        drive: (c) => {
          run(c, "curl");
          run(c, "all");
          run(c, "verify");
          waitUntil(c, 36);
          close(c);
          c.act("document", { cause: "cache" });
        },
      },
      {
        id: "noop",
        title: "Re-publishes at the origin",
        reasoning: "partial",
        drive: (c) => {
          run(c, "curl");
          run(c, "origin");
          run(c, "verify");
          waitUntil(c, 36);
          close(c);
          c.act("document", { cause: "cache" });
        },
      },
      {
        id: "fixOnly",
        title: "Compares CDN and origin, invalidates two paths, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "curl");
          run(c, "logs");
          run(c, "inval");
          run(c, "verify");
          waitUntil(c, 36);
          close(c);
          c.act("document", { cause: "cache" });
        },
      },
      {
        id: "late",
        title: "Waits, invalidates after 11:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "curl");
          waitUntil(c, 35);
          run(c, "inval");
          run(c, "verify");
          waitUntil(c, 43);
          close(c);
          c.act("document", { cause: "cache" });
        },
      },
      {
        id: "blind",
        title: "Invalidates without looking and blames browsers",
        reasoning: "missed",
        drive: (c) => {
          run(c, "inval");
          waitUntil(c, 36);
          close(c);
          c.act("document", { cause: "origin" });
        },
      },
    ],
  };
}
