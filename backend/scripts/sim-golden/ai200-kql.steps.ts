// REQ-269: golden paths for the AI-200 checkout latency investigation with
// KQL on the terminal screen (AI200/ai200-kql-checkout-latency.sim.json).
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AI200", slug: "ai200-kql-checkout-latency" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "p95 trend dates the jump to 12:40; dependencies by Target name recs-api; by AppVersion only 7.3.0 calls it from checkout; kill switch off; p95 back to about 300 ms",
        reasoning: "met",
        drive: (c) => {
          run(c, "trend");
          run(c, "deps");
          run(c, "byVersion");
          run(c, "killSwitch");
          run(c, "verify");
          close(c);
          c.act("document", { cause: "recsSync", prevent: "timeoutAsync" });
        },
      },
      {
        id: "scaleFirst",
        title: "Scales shop-web to 20 replicas as the lead suggested (no change), then queries the trend and dependencies and flips the switch",
        reasoning: "partial",
        drive: (c) => {
          run(c, "scaleOut");
          run(c, "trend");
          run(c, "deps");
          run(c, "killSwitch");
          run(c, "verify");
          close(c);
          c.act("document", { cause: "recsSync", prevent: "moreReplicas" });
        },
      },
      {
        id: "rollbackNoProof",
        title: "Trend, dependencies and one trace, then a 10-minute rollback; closes without measuring",
        reasoning: "partial",
        drive: (c) => {
          run(c, "trend");
          run(c, "deps");
          run(c, "trace");
          run(c, "rollback");
          close(c);
          c.act("document", { cause: "recsSync", prevent: "timeoutAsync" });
        },
      },
      {
        id: "restartOnly",
        title: "Restarts recs-api, checks result codes and closes with checkout still slow",
        reasoning: "missed",
        drive: (c) => {
          run(c, "restartRecs");
          run(c, "codes");
          close(c);
          c.act("document", { cause: "capacity", prevent: "moreReplicas" });
        },
      },
      {
        id: "promoFirst",
        title: "Looks at the trend and result codes, waits, and finds recs-api only after the 13:30 promo",
        reasoning: "partial",
        drive: (c) => {
          run(c, "trend");
          run(c, "codes");
          waitUntil(c, 34);
          run(c, "deps");
          run(c, "killSwitch");
          run(c, "verify");
          close(c);
          c.act("document", { cause: "recsSync", prevent: "timeoutAsync" });
        },
      },
    ],
  };
}
