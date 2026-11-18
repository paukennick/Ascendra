// REQ-335: golden paths for AWSSAP/cross-account-share-kms-denied on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AWSSAP", slug: "cross-account-share-kms-denied" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "CloudTrail, key policy, objects, role; grant both; rotation; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "trail");
          run(c, "keypol");
          run(c, "old");
          run(c, "iam");
          run(c, "grant");
          run(c, "rotate");
          run(c, "verify");
          waitUntil(c, 56);
          close(c);
          c.act("document", { cause: "kmspolicy" });
        },
      },
      {
        id: "harm",
        title: "Copies the data to SSE-S3",
        reasoning: "missed",
        drive: (c) => {
          run(c, "trail");
          run(c, "plain");
          run(c, "verify");
          waitUntil(c, 56);
          close(c);
          c.act("document", { cause: "kmspolicy" });
        },
      },
      {
        id: "noop",
        title: "Adds S3 permissions again",
        reasoning: "partial",
        drive: (c) => {
          run(c, "trail");
          run(c, "s3perm");
          run(c, "verify");
          waitUntil(c, 56);
          close(c);
          c.act("document", { cause: "kmspolicy" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads the denial and key policy, grants, verifies; rotation left off",
        reasoning: "partial",
        drive: (c) => {
          run(c, "trail");
          run(c, "keypol");
          run(c, "grant");
          run(c, "verify");
          waitUntil(c, 56);
          close(c);
          c.act("document", { cause: "kmspolicy" });
        },
      },
      {
        id: "late",
        title: "Waits, grants after 09:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "trail");
          waitUntil(c, 55);
          run(c, "grant");
          run(c, "verify");
          waitUntil(c, 63);
          close(c);
          c.act("document", { cause: "kmspolicy" });
        },
      },
      {
        id: "blind",
        title: "Grants without looking and blames the bucket policy",
        reasoning: "missed",
        drive: (c) => {
          run(c, "grant");
          waitUntil(c, 56);
          close(c);
          c.act("document", { cause: "bucketpolicy" });
        },
      },
    ],
  };
}
