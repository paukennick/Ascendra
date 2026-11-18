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
  { course: "AZ120", slug: "stale-udr-to-retired-nva-az120", screen: "terminal", profile: "infrastructure", kind: "band", steps: "dc-az120-stale-udr-to-retired-nva-az120", base: "AZ700/stale-udr-to-retired-nva" },
  { course: "AZ120", slug: "backup-vault-sabotage-az120", screen: "security-console", profile: "security", kind: "band", steps: "dc-az120-backup-vault-sabotage-az120", base: "SC500/sc500-backup-vault-sabotage" },
  { course: "AZ140", slug: "tls-inspection-breaks-session-hosts", screen: "terminal", profile: "infrastructure", kind: "scenario", steps: "az140-tls" },
  { course: "AZ140", slug: "start-vm-on-connect-after-rg-move", screen: "terminal", profile: "infrastructure", kind: "scenario", steps: "az140-startvm" },
  { course: "AZ140", slug: "scaling-plan-utc-forces-logoff-midshift", screen: "terminal", profile: "infrastructure", kind: "scenario", steps: "az140-autoscale" },
  { course: "AZ140", slug: "one-minute-disconnect-limit-kills-field-sessions", screen: "terminal", profile: "infrastructure", kind: "scenario", steps: "az140-timeouts" },
  { course: "AZ140", slug: "bad-image-version-spreads-to-new-hosts", screen: "terminal", profile: "infrastructure", kind: "scenario", steps: "az140-image" },
  { course: "DP300", slug: "public-access-off-reporting-resolves-public-ip", screen: "terminal", profile: "infrastructure", kind: "scenario", steps: "dp300-privatelink" },
  { course: "DP300", slug: "plan-regression-order-search-query-store", screen: "terminal", profile: "infrastructure", kind: "scenario", steps: "dp300-querystore" },
  { course: "DP300", slug: "app-pinned-to-old-primary-after-geo-failover", screen: "terminal", profile: "infrastructure", kind: "scenario", steps: "dp300-fog" },
  { course: "DP300", slug: "log-backup-job-failing-expired-sas", screen: "terminal", profile: "infrastructure", kind: "scenario", steps: "dp300-agentjob" },
  { course: "DP300", slug: "lrs-cutover-tail-backup-not-restored", screen: "terminal", profile: "infrastructure", kind: "scenario", steps: "dp300-lrs" },
];
