// REQ-297: golden paths for the GCP Associate Cloud Engineer public bucket
// incident on the board screen (GCPACE/public-bucket-customer-exports.sim.json).
// Each task costs minutes through the `work` wait, as on the security
// console, so the console's shared driver steps apply. No prototype exists,
// so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, task, watchUntil } from "./secplus-helpers.ts";

export const ENTRY = { course: "GCPACE", slug: "public-bucket-customer-exports" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "IAM policy and prefixes, remove allUsers at once, images to their own bucket, public access prevention, signed URL, lifecycle, logs and privacy",
        reasoning: "met",
        drive: (c) => {
          task(c, "reviewIam");
          task(c, "listObjects");
          task(c, "removePublic");
          task(c, "makeImageBucket");
          task(c, "enforcePap");
          task(c, "signedUrl");
          task(c, "lifecycle");
          task(c, "checkLogs");
          task(c, "escalate");
          close(c);
          c.act("document", { who: "unknown" });
        },
      },
      {
        id: "papOnly",
        title: "Enforces public access prevention straight away and reports honestly, but leaves the website's images broken and no lifecycle rule",
        reasoning: "partial",
        drive: (c) => {
          task(c, "reviewIam");
          task(c, "enforcePap");
          task(c, "signedUrl");
          task(c, "escalate");
          close(c);
          c.act("document", { who: "unknown" });
        },
      },
      {
        id: "imagesFirst",
        title: "Moves the images before removing the grant (exposure runs past 15 minutes) and records that only the partner read the files",
        reasoning: "partial",
        drive: (c) => {
          task(c, "listObjects");
          task(c, "makeImageBucket");
          task(c, "removePublic");
          task(c, "enforcePap");
          task(c, "signedUrl");
          task(c, "lifecycle");
          task(c, "escalate");
          close(c);
          c.act("document", { who: "partnerOnly" });
        },
      },
      {
        id: "aclListed",
        title: "Tries object ACLs on a uniform bucket twice, moves images, waits: the bucket is listed publicly before the grant is removed",
        reasoning: "partial",
        drive: (c) => {
          task(c, "reviewIam");
          task(c, "objectAcl");
          task(c, "objectAcl");
          task(c, "makeImageBucket");
          task(c, "checkLogs");
          watchUntil(c, 46);
          task(c, "removePublic");
          close(c);
          c.act("document", { who: "noOne" });
        },
      },
      {
        id: "deleteBucket",
        title: "Deletes the whole bucket to end the exposure",
        reasoning: "partial",
        drive: (c) => {
          task(c, "deleteBucket");
          task(c, "escalate");
          close(c);
          c.act("document", { who: "unknown" });
        },
      },
      {
        id: "logsAndClose",
        title: "Finds no log entries and closes, recording that nobody read the exports, with the bucket still public",
        reasoning: "missed",
        drive: (c) => {
          task(c, "checkLogs");
          close(c);
          c.act("document", { who: "noOne" });
        },
      },
    ],
  };
}
