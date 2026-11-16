// REQ-297 (docs/sims.md 22.16): the wave 3 IT sims by slug, shared by
// lib/sim/it-wave3.test.ts and lib/sims-it-wave3.dbtest.ts. Tests select
// their documents from this list, never by course code (FAIL-2000, FAIL-2002).
// course/slug -> the screen and profile it is built on
export const WAVE3: readonly { course: string; slug: string; screen: string; profile: string; kind?: "band" }[] = [
  { course: "APLUS_CORE1", slug: "rogue-dhcp-soho-office", screen: "terminal", profile: "infrastructure" },
  { course: "APLUS_CORE2", slug: "home-office-laptop-malware", screen: "security-console", profile: "security" },
  { course: "KCNA", slug: "service-selector-no-endpoints", screen: "terminal", profile: "infrastructure" },
  { course: "CKA", slug: "service-selector-no-endpoints-cka", screen: "terminal", profile: "infrastructure", kind: "band" },
  { course: "GCPACE", slug: "public-bucket-customer-exports", screen: "board", profile: "security" },
  { course: "GCPCDL", slug: "bigquery-dashboard-bill", screen: "board", profile: "cloud" },
  { course: "SECPLUS", slug: "vuln-prioritization-kev-edge-secplus", screen: "security-console", profile: "security", kind: "band" },
  { course: "SECPLUS", slug: "alert-triage-lolbin-hunt-secplus", screen: "security-console", profile: "security", kind: "band" },
  { course: "AWSSAA", slug: "waf-login-flood-sqli", screen: "board", profile: "security" },
  { course: "AWSSOA", slug: "rds-update-without-where-pitr", screen: "board", profile: "cloud" },
  { course: "GCPACE", slug: "cloud-run-bad-revision-rollback", screen: "board", profile: "cloud" },
  { course: "LINUXPLUS", slug: "systemd-dropin-breaks-export", screen: "terminal", profile: "infrastructure" },
  { course: "CKA", slug: "apiserver-static-pod-bad-flag", screen: "terminal", profile: "infrastructure" },
  { course: "SECPLUS", slug: "firewall-change-backout", screen: "security-console", profile: "security" },
];
