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
];

// The day this round read its sources; every document's first source carries it.
export const DEPTH_ACADEMIC_ROUND = "2026-11-17";
