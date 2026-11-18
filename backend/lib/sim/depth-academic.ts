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
];

// The day this round read its sources; every document's first source carries it.
export const DEPTH_ACADEMIC_ROUND = "2026-11-17";
