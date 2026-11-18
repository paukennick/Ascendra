// REQ-335 (docs/sims.md 22.39): depth sims for the AWS, Azure and Google Cloud
// courses, round of 2026-11-17 (evening), new cases and bands, by slug.
// Shared by lib/sim/depth-cloud.test.ts; tests select their documents from
// this list, never by course code (FAIL-2002).
import type { CloudEntry } from "./it-cloud.ts";
export const DEPTH_CLOUD: readonly CloudEntry[] = [
  { course: "AWSDEA", slug: "s3-eventbridge-rule-never-fires", screen: "terminal", profile: "infrastructure", kind: "scenario", steps: "dea-s3-eventbridge" },
  { course: "AWSDEA", slug: "redshift-idle-transaction-blocks-load", screen: "terminal", profile: "infrastructure", kind: "scenario", steps: "dea-redshift-locks" },
  { course: "AWSDEA", slug: "athena-todays-partition-missing", screen: "terminal", profile: "infrastructure", kind: "scenario", steps: "dea-partitions" },
  { course: "AWSDEA", slug: "dynamodb-backfill-throttles-checkout", screen: "terminal", profile: "infrastructure", kind: "scenario", steps: "dea-ddb-throttle" },
  { course: "AWSDEA", slug: "glue-join-skewed-on-guest-key", screen: "terminal", profile: "infrastructure", kind: "scenario", steps: "dea-glue-skew" },
  { course: "AWSDEA", slug: "phi-in-application-logs-dea", screen: "board", profile: "cloud", kind: "band", steps: "dc-awsdea-phi-in-application-logs-dea", base: "AWSDVA/phi-in-application-logs" },
  { course: "AWSDEA", slug: "rds-update-without-where-pitr-dea", screen: "board", profile: "cloud", kind: "band", steps: "dc-awsdea-rds-update-without-where-pitr-dea", base: "AWSSOA/rds-update-without-where-pitr" },
  { course: "AWSSAP", slug: "sqs-visibility-shorter-than-work", screen: "terminal", profile: "infrastructure", kind: "scenario", steps: "sap-sqs-visibility" },
  { course: "AWSSAP", slug: "onprem-cannot-resolve-private-zone", screen: "terminal", profile: "infrastructure", kind: "scenario", steps: "sap-hybrid-dns" },
];
