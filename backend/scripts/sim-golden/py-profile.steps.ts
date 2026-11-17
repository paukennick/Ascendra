// REQ-312: golden paths for the PYTHON profiling case on the data and code
// console (PYTHON/py-report-too-slow-profile.sim.json). No prototype exists,
// so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { record, run } from "./data-helpers.ts";

export const ENTRY = { course: "PYTHON", slug: "py-report-too-slow-profile" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "cProfile first; a set for the blocked IDs; diff against yesterday's output; run and send well before 07:00",
        reasoning: "met",
        drive: (c) => {
          run(c, "profileStep");
          run(c, "fixSet");
          run(c, "verify");
          run(c, "runFull");
          run(c, "mail");
          record(c, { cause: "scan", check: "diff" });
        },
      },
      {
        id: "poolUnmeasured",
        title: "Takes the colleague's advice: 8 processes without measuring; the diff is clean and the file is on time",
        reasoning: "partial",
        drive: (c) => {
          run(c, "fixPool");
          run(c, "verify");
          run(c, "runFull");
          run(c, "mail");
          record(c, { cause: "cpu", check: "diff" });
        },
      },
      {
        id: "skipCheck",
        title: "Skips the blocked-patron check to make the job fast and sends it unchecked",
        reasoning: "missed",
        drive: (c) => {
          run(c, "fixSkip");
          run(c, "runFull");
          run(c, "mail");
          record(c, { cause: "disk", check: "ran" });
        },
      },
      {
        id: "diffIgnored",
        title: "Skips the check, sees 412 rows differ, and sends it anyway",
        reasoning: "missed",
        drive: (c) => {
          run(c, "timeitStep");
          run(c, "fixSkip");
          run(c, "verify");
          run(c, "runFull");
          run(c, "mail");
          record(c, { cause: "scan", check: "ran" });
        },
      },
      {
        id: "cacheThenSlow",
        title: "Adds lru_cache, the test run crashes, reverts, and runs the slow job, which arrives late",
        reasoning: "partial",
        drive: (c) => {
          run(c, "fixCache");
          run(c, "verify");
          run(c, "revert");
          run(c, "runFull");
          run(c, "mail");
          record(c, { cause: "cpu", check: "none" });
        },
      },
      {
        id: "lateProfile",
        title: "Tries the pool first, then profiles, switches to a set, checks and sends on time",
        reasoning: "met",
        drive: (c) => {
          run(c, "fixPool");
          run(c, "profileStep");
          run(c, "fixSet");
          run(c, "verify");
          run(c, "runFull");
          run(c, "mail");
          record(c, { cause: "scan", check: "ran" });
        },
      },
      {
        id: "holdBack",
        title: "Profiles, finds the cause, and stops without sending anything",
        reasoning: "partial",
        drive: (c) => {
          run(c, "profileStep");
          record(c, { cause: "scan", check: "none" });
        },
      },
    ],
  };
}
