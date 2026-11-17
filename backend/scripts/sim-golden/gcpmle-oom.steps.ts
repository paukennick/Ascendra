// REQ-320: golden paths for GCPMLE/nightly-retrain-cuda-oom-after-batch-change on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "GCPMLE", slug: "nightly-retrain-cuda-oom-after-batch-change" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Log, diff, last night's memory, quota, accumulation with bf16, verified",
        reasoning: "met",
        drive: (c) => {
          run(c, "logs");
          run(c, "diff");
          run(c, "memory");
          run(c, "quota");
          run(c, "submit", {"c": "accum"});
          waitUntil(c, 16);
          run(c, "verify");
          waitUntil(c, 61);
          close(c);
          c.act("document", { cause: "oom" });
        },
      },
      {
        id: "biggerGpu",
        title: "Moves to an A100 the project has no quota for",
        reasoning: "missed",
        drive: (c) => {
          run(c, "logs");
          run(c, "submit", {"c": "a100"});
          waitUntil(c, 61);
          close(c);
          c.act("document", { cause: "quota" });
        },
      },
      {
        id: "retry",
        title: "Retries unchanged",
        reasoning: "missed",
        drive: (c) => {
          run(c, "submit", {"c": "same"});
          waitUntil(c, 61);
          close(c);
          c.act("document", { cause: "data" });
        },
      },
      {
        id: "revert",
        title: "Reads the error and diff, reverts the batch only, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "logs");
          run(c, "diff");
          run(c, "submit", {"c": "revert"});
          waitUntil(c, 12);
          run(c, "verify");
          waitUntil(c, 61);
          close(c);
          c.act("document", { cause: "oom" });
        },
      },
      {
        id: "late",
        title: "Tries an A100 and waits, then fixes the config after 02:24",
        reasoning: "partial",
        drive: (c) => {
          run(c, "submit", {"c": "a100"});
          waitUntil(c, 54);
          run(c, "logs");
          run(c, "diff");
          run(c, "submit", {"c": "accum"});
          waitUntil(c, 61);
          run(c, "verify");
          close(c);
          c.act("document", { cause: "oom" });
        },
      },
      {
        id: "blind",
        title: "Resubmits with accumulation without reading anything or checking",
        reasoning: "missed",
        drive: (c) => {
          run(c, "submit", {"c": "accum"});
          waitUntil(c, 61);
          close(c);
          c.act("document", { cause: "data" });
        },
      },
    ],
  };
}
