// REQ-335: golden paths for AWSMLA/vpc-endpoint-cannot-load-model-from-s3 on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AWSMLA", slug: "vpc-endpoint-cannot-load-model-from-s3" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Failure, endpoints and routes, bucket policy, logs; S3 endpoint; template and check; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "status");
          run(c, "endpoints");
          run(c, "bucket");
          run(c, "cw");
          run(c, "s3ep");
          run(c, "guard");
          run(c, "verify");
          waitUntil(c, 71);
          close(c);
          c.act("document", { cause: "s3path" });
        },
      },
      {
        id: "harm",
        title: "Adds an internet gateway",
        reasoning: "missed",
        drive: (c) => {
          run(c, "status");
          run(c, "igw");
          run(c, "verify");
          waitUntil(c, 71);
          close(c);
          c.act("document", { cause: "s3path" });
        },
      },
      {
        id: "noop",
        title: "Uses a larger instance",
        reasoning: "partial",
        drive: (c) => {
          run(c, "status");
          run(c, "bigger");
          run(c, "verify");
          waitUntil(c, 71);
          close(c);
          c.act("document", { cause: "s3path" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads failure and routes, adds the S3 endpoint, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "status");
          run(c, "endpoints");
          run(c, "s3ep");
          run(c, "verify");
          waitUntil(c, 71);
          close(c);
          c.act("document", { cause: "s3path" });
        },
      },
      {
        id: "late",
        title: "Waits, fixes after 10:30",
        reasoning: "partial",
        drive: (c) => {
          run(c, "status");
          waitUntil(c, 70);
          run(c, "s3ep");
          run(c, "verify");
          waitUntil(c, 78);
          close(c);
          c.act("document", { cause: "s3path" });
        },
      },
      {
        id: "blind",
        title: "Adds an endpoint without looking and blames IAM",
        reasoning: "missed",
        drive: (c) => {
          run(c, "s3ep");
          waitUntil(c, 71);
          close(c);
          c.act("document", { cause: "iam" });
        },
      },
    ],
  };
}
