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
  { course: "AWSSAP", slug: "region-scp-blocks-global-services", screen: "terminal", profile: "infrastructure", kind: "scenario", steps: "sap-scp-region" },
  { course: "AWSSAP", slug: "cross-account-share-kms-denied", screen: "terminal", profile: "infrastructure", kind: "scenario", steps: "sap-kms-cross-account" },
  { course: "AWSSAP", slug: "nat-gateway-bill-spike-sap", screen: "board", profile: "cloud", kind: "band", steps: "dc-awssap-nat-gateway-bill-spike-sap", base: "AWSSAA/nat-gateway-bill-spike" },
  { course: "AWSSAP", slug: "canary-rollback-dlq-sap", screen: "board", profile: "cloud", kind: "band", steps: "dc-awssap-canary-rollback-dlq-sap", base: "AWSDVA/canary-rollback-dlq" },
  { course: "AWSSAP", slug: "dynamodb-backfill-throttles-checkout-sap", screen: "terminal", profile: "infrastructure", kind: "band", steps: "dc-awssap-dynamodb-backfill-throttles-checkout-sap", base: "AWSDEA/dynamodb-backfill-throttles-checkout" },
  { course: "AZ120", slug: "fence-agent-lost-role-before-maintenance", screen: "terminal", profile: "infrastructure", kind: "scenario", steps: "az120-fence" },
  { course: "AZ120", slug: "migration-wave-blocked-by-vm-family-quota", screen: "terminal", profile: "infrastructure", kind: "scenario", steps: "az120-quota" },
  { course: "AZ120", slug: "hana-log-writes-slow-no-write-accelerator", screen: "terminal", profile: "infrastructure", kind: "scenario", steps: "az120-writeacc" },
  { course: "AZ120", slug: "hana-vip-unreachable-tcp-timestamps", screen: "terminal", profile: "infrastructure", kind: "scenario", steps: "az120-lbprobe" },
  { course: "AZ120", slug: "baseline-policy-denies-hana-vm-size", screen: "terminal", profile: "infrastructure", kind: "scenario", steps: "az120-policy" },
];
