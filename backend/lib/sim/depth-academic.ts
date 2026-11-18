// REQ-333 (docs/sims.md 22.37): sim depth for the academic and programming
// courses (MSHI, MSCS, CMPCBS, PTPREREQ, PYTHON, JAVASCRIPT, PYAUTO, PYDATA,
// PCEP, PCAP, SQL, TSNODE), round of 2026-11-17. Listed by slug for
// lib/sim/depth-academic.test.ts; tests select their documents from this list,
// never by course code (FAIL-2002). A band registers a case another course
// already teaches on this course's objective; a scenario is a new case.
export interface DepthAcademicEntry {
  course: string;
  slug: string;
  screen: string;
  profile: string;
  kind: "scenario" | "band";
  steps: string;
  base?: string; // "COURSE/slug" for a band
}

export const DEPTH_ACADEMIC: readonly DepthAcademicEntry[] = [
  { course: "MSHI", slug: "mshi-a1c-units-quality-dashboard", screen: "data", profile: "data", kind: "scenario", steps: "mshi-a1c" },
  { course: "MSHI", slug: "mshi-misdirected-email-breach-notice", screen: "governance-board", profile: "governance", kind: "scenario", steps: "mshi-breach" },
  { course: "MSHI", slug: "mshi-ehr-downtime-tabletop", screen: "tabletop", profile: "exercise", kind: "scenario", steps: "mshi-downtime" },
  { course: "MSHI", slug: "mshi-ehr-go-live-readiness", screen: "governance-board", profile: "governance", kind: "scenario", steps: "mshi-golive" },
  { course: "MSCS", slug: "mscs-transfer-workers-deadlock", screen: "terminal", profile: "infrastructure", kind: "scenario", steps: "mscs-deadlock" },
  { course: "MSCS", slug: "mscs-freezer-bytes-little-endian", screen: "data", profile: "data", kind: "scenario", steps: "mscs-endian" },
  { course: "PYTHON", slug: "py-packing-slips-mutable-default", screen: "data", profile: "data", kind: "scenario", steps: "py-default" },
  { course: "PCEP", slug: "pcep-seat-map-shared-rows", screen: "data", profile: "data", kind: "scenario", steps: "pcep-rows" },
  { course: "PCAP", slug: "pcap-ai-helper-invented-function", screen: "data", profile: "data", kind: "scenario", steps: "pcap-ai" },
  { course: "JAVASCRIPT", slug: "js-shift-signup-foreach-async", screen: "data", profile: "data", kind: "scenario", steps: "js-foreach" },
  { course: "PYDATA", slug: "pydata-region-merge-duplicated-store", screen: "data", profile: "data", kind: "scenario", steps: "pydata-merge" },
  { course: "PCEP", slug: "pcep-lunch-balances-float-cents", screen: "data", profile: "data", kind: "scenario", steps: "pcep-cents" },
  { course: "MSHI", slug: "mshi-syndromic-feed-ili-drop", screen: "data", profile: "data", kind: "scenario", steps: "mshi-ili" },
  { course: "MSHI", slug: "mshi-home-bp-app-vetting", screen: "governance-board", profile: "governance", kind: "scenario", steps: "mshi-rpm" },
  { course: "MSCS", slug: "mscs-pipeline-dependency-cycle", screen: "data", profile: "data", kind: "scenario", steps: "mscs-cycle" },
  { course: "MSCS", slug: "mscs-renewed-cert-missing-intermediate", screen: "terminal", profile: "infrastructure", kind: "scenario", steps: "mscs-chain" },
  { course: "MSCS", slug: "mscs-unstable-sort-stage-order", screen: "data", profile: "data", kind: "scenario", steps: "mscs-stable" },
  { course: "MSHI", slug: "sql-not-in-null-empty-list-mshi", screen: "data", profile: "data", kind: "band", steps: "da-mshi-sql-not-in-null-empty-list-mshi", base: "SQL/sql-not-in-null-empty-list" },
  { course: "MSHI", slug: "ethics-shared-credentials-mshi", screen: "session", profile: "professional-ethics", kind: "band", steps: "da-mshi-ethics-shared-credentials-mshi", base: "ISC2CC/cc-ethics-shared-credentials" },
  { course: "MSHI", slug: "phi-in-application-logs-mshi", screen: "board", profile: "cloud", kind: "band", steps: "da-mshi-phi-in-application-logs-mshi", base: "AWSDVA/phi-in-application-logs" },
  { course: "MSHI", slug: "fill-weight-chart-mshi", screen: "data", profile: "data", kind: "band", steps: "da-mshi-fill-weight-chart-mshi", base: "CSSGB/cssgb-fill-weight-chart" },
  { course: "MSCS", slug: "py-report-too-slow-profile-mscs", screen: "data", profile: "data", kind: "band", steps: "da-mscs-py-report-too-slow-profile-mscs", base: "PYTHON/py-report-too-slow-profile" },
  { course: "MSCS", slug: "sql-flash-sale-oversold-mscs", screen: "terminal", profile: "infrastructure", kind: "band", steps: "da-mscs-sql-flash-sale-oversold-mscs", base: "SQL/sql-flash-sale-oversold" },
  { course: "MSCS", slug: "sql-slow-login-seq-scan-mscs", screen: "terminal", profile: "infrastructure", kind: "band", steps: "da-mscs-sql-slow-login-seq-scan-mscs", base: "SQL/sql-slow-login-seq-scan" },
  { course: "MSCS", slug: "report-workers-starve-api-mscs", screen: "terminal", profile: "infrastructure", kind: "band", steps: "da-mscs-report-workers-starve-api-mscs", base: "LFCS/report-workers-starve-api" },
  { course: "MSCS", slug: "full-var-stops-database-mscs", screen: "terminal", profile: "infrastructure", kind: "band", steps: "da-mscs-full-var-stops-database-mscs", base: "LINUXPLUS/full-var-stops-database" },
  { course: "MSCS", slug: "ceh-blind-sqli-search-mscs", screen: "security-console", profile: "security", kind: "band", steps: "da-mscs-ceh-blind-sqli-search-mscs", base: "CEH/ceh-blind-sqli-search" },
  { course: "MSCS", slug: "loan-data-bias-mscs", screen: "board", profile: "cloud", kind: "band", steps: "da-mscs-loan-data-bias-mscs", base: "AWSMLA/loan-data-bias" },
  { course: "CMPCBS", slug: "py-report-too-slow-profile-cmpcbs", screen: "data", profile: "data", kind: "band", steps: "da-cmpcbs-py-report-too-slow-profile-cmpcbs", base: "PYTHON/py-report-too-slow-profile" },
  { course: "CMPCBS", slug: "ethics-shared-credentials-cmpcbs", screen: "session", profile: "professional-ethics", kind: "band", steps: "da-cmpcbs-ethics-shared-credentials-cmpcbs", base: "ISC2CC/cc-ethics-shared-credentials" },
  { course: "CMPCBS", slug: "firewall-change-backout-cmpcbs", screen: "security-console", profile: "security", kind: "band", steps: "da-cmpcbs-firewall-change-backout-cmpcbs", base: "SECPLUS/firewall-change-backout" },
  { course: "CMPCBS", slug: "leaver-account-still-active-cmpcbs", screen: "security-console", profile: "security", kind: "band", steps: "da-cmpcbs-leaver-account-still-active-cmpcbs", base: "ISC2CC/cc-leaver-account-still-active" },
  { course: "CMPCBS", slug: "security-business-case-cmpcbs", screen: "governance-board", profile: "governance", kind: "band", steps: "da-cmpcbs-security-business-case-cmpcbs", base: "CISM/cism-security-business-case-budget" },
  { course: "CMPCBS", slug: "water-utility-rebalance-cmpcbs", screen: "governance-board", profile: "governance", kind: "band", steps: "da-cmpcbs-water-utility-rebalance-cmpcbs", base: "PFMP/pfmp-water-utility-rebalance" },
  { course: "CMPCBS", slug: "report-workers-starve-api-cmpcbs", screen: "terminal", profile: "infrastructure", kind: "band", steps: "da-cmpcbs-report-workers-starve-api-cmpcbs", base: "LFCS/report-workers-starve-api" },
  { course: "PTPREREQ", slug: "treadmill-pressure-falls-with-grade-ptprereq", screen: "treatment-session", profile: "physical-therapy", kind: "band", steps: "da-ptprereq-treadmill-pressure-falls-with-grade-ptprereq", base: "NPTEPTA/pta-treadmill-pressure-falls-with-grade" },
  { course: "PTPREREQ", slug: "six-minute-walk-saturation-ptprereq", screen: "treatment-session", profile: "physical-therapy", kind: "band", steps: "da-ptprereq-six-minute-walk-saturation-ptprereq", base: "NPTEPTA/pta-six-minute-walk-saturation-drops" },
  { course: "PTPREREQ", slug: "stroke-balance-fall-risk-ptprereq", screen: "treatment-session", profile: "physical-therapy", kind: "band", steps: "da-ptprereq-stroke-balance-fall-risk-ptprereq", base: "DPT/stroke-balance-fall-risk" },
  { course: "PTPREREQ", slug: "back-pain-bladder-symptoms-ptprereq", screen: "treatment-session", profile: "physical-therapy", kind: "band", steps: "da-ptprereq-back-pain-bladder-symptoms-ptprereq", base: "NPTEPTA/pta-back-pain-new-bladder-symptoms" },
  { course: "PTPREREQ", slug: "central-dizziness-red-flags-ptprereq", screen: "treatment-session", profile: "physical-therapy", kind: "band", steps: "da-ptprereq-central-dizziness-red-flags-ptprereq", base: "DPT/dizziness-central-red-flags" },
  { course: "PYAUTO", slug: "py-import-crash-traceback-pyauto", screen: "data", profile: "data", kind: "band", steps: "da-pyauto-py-import-crash-traceback-pyauto", base: "PYTHON/py-import-crash-traceback" },
  { course: "PYAUTO", slug: "node-env-file-silent-exit-pyauto", screen: "terminal", profile: "infrastructure", kind: "band", steps: "da-pyauto-node-env-file-silent-exit-pyauto", base: "TSNODE/node-env-file-silent-exit" },
  { course: "PYAUTO", slug: "nightly-backup-missing-pyauto", screen: "terminal", profile: "infrastructure", kind: "band", steps: "da-pyauto-nightly-backup-missing-pyauto", base: "LINUXFUND/nightly-backup-missing" },
  { course: "PYDATA", slug: "stock-on-hand-resample-pydata", screen: "data", profile: "data", kind: "band", steps: "da-pydata-stock-on-hand-resample-pydata", base: "PL300/pl300-stock-on-hand-summed" },
  { course: "PYDATA", slug: "import-amounts-as-text-pydata", screen: "data", profile: "data", kind: "band", steps: "da-pydata-import-amounts-as-text-pydata", base: "PYTHON/py-import-crash-traceback" },
  { course: "PCEP", slug: "py-report-too-slow-profile-pcep", screen: "data", profile: "data", kind: "band", steps: "da-pcep-py-report-too-slow-profile-pcep", base: "PYTHON/py-report-too-slow-profile" },
  { course: "JAVASCRIPT", slug: "node-env-file-silent-exit-javascript", screen: "terminal", profile: "infrastructure", kind: "band", steps: "da-javascript-node-env-file-silent-exit-javascript", base: "TSNODE/node-env-file-silent-exit" },
  { course: "SQL", slug: "open-transaction-blocks-orders-sql", screen: "terminal", profile: "infrastructure", kind: "band", steps: "da-sql-open-transaction-blocks-orders-sql", base: "DP300/sleeping-session-blocks-orders" },
  { course: "TSNODE", slug: "checkout-shipping-concatenated-tsnode", screen: "data", profile: "data", kind: "band", steps: "da-tsnode-checkout-shipping-concatenated-tsnode", base: "JAVASCRIPT/js-checkout-shipping-concatenated" },
  { course: "PTPREREQ", slug: "parkinson-orthostatic-ptprereq", screen: "treatment-session", profile: "physical-therapy", kind: "band", steps: "da-ptprereq-parkinson-orthostatic-ptprereq", base: "DPT/parkinson-freezing-session" },
  { course: "PTPREREQ", slug: "icu-mobility-new-rhythm-ptprereq", screen: "treatment-session", profile: "physical-therapy", kind: "band", steps: "da-ptprereq-icu-mobility-new-rhythm-ptprereq", base: "DPT/icu-early-mobility" },
  { course: "PCAP", slug: "packing-slips-mutable-default-pcap", screen: "data", profile: "data", kind: "band", steps: "da-pcap-packing-slips-mutable-default-pcap", base: "PYTHON/py-packing-slips-mutable-default" },
  { course: "PYTHON", slug: "seat-map-shared-rows-python", screen: "data", profile: "data", kind: "band", steps: "da-python-seat-map-shared-rows-python", base: "PCEP/pcep-seat-map-shared-rows" },
  { course: "PCAP", slug: "seat-map-shared-rows-pcap", screen: "data", profile: "data", kind: "band", steps: "da-pcap-seat-map-shared-rows-pcap", base: "PCEP/pcep-seat-map-shared-rows" },
  { course: "MSHI", slug: "water-utility-rebalance-mshi", screen: "governance-board", profile: "governance", kind: "band", steps: "da-mshi-water-utility-rebalance-mshi", base: "PFMP/pfmp-water-utility-rebalance" },
];

// The day this round read its sources; every document's first source carries it.
export const DEPTH_ACADEMIC_ROUND = "2026-11-17";
