// REQ-198: study paths. A study path is an ordered list of catalog courses
// that are meant to be taken one after another, each with when to take it
// and why. Paths live here as seed data, keyed by track code, the same key
// the seed uses for every catalog course. Nothing is copied into the
// database. GET /api/courses/:id/path (lib/study-paths.ts) reads this list,
// resolves each code to the catalog course with that code, and the course
// page shows "Recommended before" and "Recommended after".
//
// Why here and not in a table: a path is catalog data that changes only
// when the catalog does, and every course it names already has a stable,
// unique code (migration 023's subject_tracks_catalog_code_unique). A
// table would add a migration and an admin surface for a list that ships
// with the seed anyway. If a path ever needs per-learner state, that is the
// time for a table.
//
// Rules, checked by lib/study-paths.test.ts:
// - every code names a course in seed/catalog.ts;
// - a path has at least two steps and names no course twice;
// - every step says when and why, in the learner's words.
// A course may sit on more than one path. The course page then shows each
// path's before and after.

export interface SeedStudyPathStep {
  trackCode: string;
  // When to take it, e.g. "Before PT school or in its first weeks".
  when: string;
  // One sentence on why this course sits here.
  why: string;
}

export interface SeedStudyPath {
  slug: string;
  title: string;
  // Who the path is for, as the learner would say it.
  audience: string;
  steps: SeedStudyPathStep[];
}

export const STUDY_PATHS: readonly SeedStudyPath[] = [
  {
    slug: "dpt-student",
    title: "Physical therapy school, start to license",
    audience: "Starting PT school",
    steps: [
      {
        trackCode: "PTPREREQ",
        when: "Before your program starts, or in its first weeks",
        why: "Refreshes the anatomy, physiology, physics and statistics the first year of a DPT program builds on.",
      },
      {
        trackCode: "DPT",
        when: "During your program",
        why: "Follows what CAPTE requires a DPT program to teach, from the foundational sciences through the practice expectations.",
      },
      {
        trackCode: "NPTEPT",
        when: "In your final year, about 6 to 9 months before you graduate",
        why: "Prepares you for the licensure exam you take after graduating.",
      },
    ],
  },
  // REQ-292 (Nick, 2026-11-14): the Python and Linux depth courses.
  {
    slug: "python-automation",
    title: "Python for automating your work",
    audience: "Writing scripts to automate tasks",
    steps: [
      {
        trackCode: "PYTHON",
        when: "First, if you are new to Python",
        why: "Teaches the language itself: syntax, functions, data structures, files, classes and testing.",
      },
      {
        trackCode: "PYAUTO",
        when: "Once you can write and run a small Python program",
        why: "Turns that into scripts people can run and schedule: command lines, files, logging, subprocess, APIs, packaging and tests.",
      },
    ],
  },
  {
    slug: "python-data",
    title: "Python for working with data",
    audience: "Analyzing data with Python",
    steps: [
      {
        trackCode: "PYTHON",
        when: "First, if you are new to Python",
        why: "Teaches the language the data tools are built on.",
      },
      {
        trackCode: "PYDATA",
        when: "Once you can write and run a small Python program",
        why: "Teaches NumPy, pandas and matplotlib in notebooks, from loading and cleaning data to charts someone else can rerun.",
      },
    ],
  },
  {
    slug: "linux-admin",
    title: "Linux, from first commands to certified sysadmin",
    audience: "Learning Linux administration",
    steps: [
      {
        trackCode: "LINUXFUND",
        when: "First, if you are new to the Linux command line",
        why: "Covers the shell, files, permissions, processes, packages, services, storage, networking and scripts on any distribution.",
      },
      {
        trackCode: "LFCS",
        when: "After the fundamentals, with some hands-on practice",
        why: "Prepares you for the Linux Foundation's hands-on sysadmin exam, solved at a live command line.",
      },
      {
        trackCode: "CKA",
        when: "If you go on to run Kubernetes",
        why: "Builds on the same Linux skills for the hands-on Kubernetes administrator exam.",
      },
    ],
  },
];
