// REQ-335 (docs/sims.md 22.39): depth sims for the AWS, Azure and Google Cloud
// courses, round of 2026-11-17 (evening), new cases and bands, by slug.
// Shared by lib/sim/depth-cloud.test.ts; tests select their documents from
// this list, never by course code (FAIL-2002).
import type { CloudEntry } from "./it-cloud.ts";
export const DEPTH_CLOUD: readonly CloudEntry[] = [
  { course: "AWSDEA", slug: "s3-eventbridge-rule-never-fires", screen: "terminal", profile: "infrastructure", kind: "scenario", steps: "dea-s3-eventbridge" },
  { course: "AWSDEA", slug: "redshift-idle-transaction-blocks-load", screen: "terminal", profile: "infrastructure", kind: "scenario", steps: "dea-redshift-locks" },
  { course: "AWSDEA", slug: "athena-todays-partition-missing", screen: "terminal", profile: "infrastructure", kind: "scenario", steps: "dea-partitions" },
];
