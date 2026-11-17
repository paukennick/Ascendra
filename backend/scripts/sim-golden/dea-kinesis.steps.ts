// REQ-320: golden paths for AWSDEA/kinesis-poison-record-blocks-shard on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AWSDEA", slug: "kinesis-poison-record-blocks-shard" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Metrics, log, mapping, bisect with an S3 destination, IteratorAge checked, failure record read",
        reasoning: "met",
        drive: (c) => {
          run(c, "metrics");
          run(c, "logs");
          run(c, "esm");
          run(c, "configure", {"d": "s3"});
          waitUntil(c, 45);
          run(c, "verify");
          run(c, "failRecord");
          waitUntil(c, 61);
          close(c);
          c.act("document", { cause: "poison" });
        },
      },
      {
        id: "latest",
        title: "Recreates the mapping at LATEST",
        reasoning: "missed",
        drive: (c) => {
          run(c, "logs");
          run(c, "latest");
          waitUntil(c, 61);
          close(c);
          c.act("document", { cause: "poison" });
        },
      },
      {
        id: "capacity",
        title: "Raises memory and adds shards",
        reasoning: "missed",
        drive: (c) => {
          run(c, "memory");
          run(c, "reshard");
          waitUntil(c, 61);
          close(c);
          c.act("document", { cause: "capacity" });
        },
      },
      {
        id: "sqsOnly",
        title: "Diagnoses and fixes, with an SQS destination that keeps only metadata",
        reasoning: "partial",
        drive: (c) => {
          run(c, "logs");
          run(c, "esm");
          run(c, "configure", {"d": "sqs"});
          run(c, "verify");
          waitUntil(c, 61);
          close(c);
          c.act("document", { cause: "poison" });
        },
      },
      {
        id: "late",
        title: "Raises memory and adds shards first, then fixes the mapping after 06:45",
        reasoning: "partial",
        drive: (c) => {
          run(c, "memory");
          run(c, "reshard");
          waitUntil(c, 36);
          run(c, "logs");
          run(c, "esm");
          run(c, "configure", {"d": "s3"});
          run(c, "verify");
          waitUntil(c, 61);
          close(c);
          c.act("document", { cause: "poison" });
        },
      },
      {
        id: "blind",
        title: "Bounds the retries without a destination and without reading anything",
        reasoning: "missed",
        drive: (c) => {
          run(c, "configure", {"d": "none"});
          waitUntil(c, 61);
          close(c);
          c.act("document", { cause: "poison" });
        },
      },
    ],
  };
}
