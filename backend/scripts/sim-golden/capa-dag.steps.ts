// REQ-321: golden paths for CAPA/argo-nightly-dag-region-failure on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "CAPA", slug: "argo-nightly-dag-region-failure" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Read the DAG, the log and the template; argo retry; correct the message; retryStrategy OnFailure with backoff; an honest exit handler",
        reasoning: "met",
        drive: (c) => {
          run(c, "get");
          run(c, "logs");
          run(c, "spec");
          run(c, "recover", {"h": "retry"});
          run(c, "notify");
          run(c, "addRetry", {"r": "right"});
          run(c, "fixExit", {"e": "status"});
          waitUntil(c, 61);
          close(c);
          c.act("document", { cause: "transient" });
        },
      },
      {
        id: "resubmit",
        title: "Reads the DAG, resubmits every region and misses 05:30",
        reasoning: "missed",
        drive: (c) => {
          run(c, "get");
          run(c, "recover", {"h": "resubmit"});
          run(c, "notify");
          run(c, "addRetry", {"r": "right"});
          waitUntil(c, 61);
          close(c);
          c.act("document", { cause: "transient" });
        },
      },
      {
        id: "skipRegion",
        title: "Reruns without eu-west so something is published by 05:30",
        reasoning: "missed",
        drive: (c) => {
          run(c, "get");
          run(c, "logs");
          run(c, "recover", {"h": "partial"});
          waitUntil(c, 61);
          close(c);
          c.act("document", { cause: "data" });
        },
      },
      {
        id: "noPrevent",
        title: "Diagnoses, retries in time and tells finance; the template is left as it was",
        reasoning: "partial",
        drive: (c) => {
          run(c, "get");
          run(c, "logs");
          run(c, "recover", {"h": "retry"});
          run(c, "notify");
          waitUntil(c, 61);
          close(c);
          c.act("document", { cause: "transient" });
        },
      },
      {
        id: "wrongPolicy",
        title: "The full fix, but the retryStrategy uses OnError",
        reasoning: "partial",
        drive: (c) => {
          run(c, "get");
          run(c, "logs");
          run(c, "spec");
          run(c, "recover", {"h": "retry"});
          run(c, "notify");
          run(c, "addRetry", {"r": "onError"});
          run(c, "fixExit", {"e": "status"});
          waitUntil(c, 61);
          close(c);
          c.act("document", { cause: "transient" });
        },
      },
      {
        id: "blindRetry",
        title: "Retries without reading anything, removes the exit handler and blames the code",
        reasoning: "partial",
        drive: (c) => {
          run(c, "recover", {"h": "retry"});
          run(c, "fixExit", {"e": "remove"});
          waitUntil(c, 61);
          close(c);
          c.act("document", { cause: "code" });
        },
      },
    ],
  };
}
