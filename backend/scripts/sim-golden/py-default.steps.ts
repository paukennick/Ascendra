// REQ-333: golden paths for the PYTHON mutable default case on the data
// console (PYTHON/py-packing-slips-mutable-default.sim.json).
import type { StepsSpec } from "./steps.ts";
import { record, run } from "./data-helpers.ts";

export const ENTRY = { course: "PYTHON", slug: "py-packing-slips-mutable-default" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Dry run shows the list growing; None default with a new list; both tests pass; ship",
        reasoning: "met",
        drive: (c) => {
          run(c, "dryrun");
          run(c, "change", { f: "none" });
          run(c, "pytest");
          run(c, "ship");
          record(c, { cause: "default", check: "tests" });
        },
      },
      {
        id: "copyReturn",
        title: "Returns a copy without reproducing the bug and ships untested: the default still grows",
        reasoning: "missed",
        drive: (c) => {
          run(c, "change", { f: "copy" });
          run(c, "ship");
          record(c, { cause: "data", check: "none" });
        },
      },
      {
        id: "clearFirst",
        title: "Clears the list first, sees a test fail but ships anyway: gift notes vanish",
        reasoning: "missed",
        drive: (c) => {
          run(c, "change", { f: "clear" });
          run(c, "dryrun");
          run(c, "pytest");
          run(c, "ship");
          record(c, { cause: "default", check: "restart" });
        },
      },
      {
        id: "restartOnly",
        title: "Restarts the worker twice and ships nothing",
        reasoning: "missed",
        drive: (c) => {
          run(c, "restart");
          run(c, "dryrun");
          run(c, "restart");
          record(c, { cause: "worker", check: "restart" });
        },
      },
      {
        id: "untested",
        title: "Changes the default before looking, then dry runs and ships without tests",
        reasoning: "met",
        drive: (c) => {
          run(c, "change", { f: "none" });
          run(c, "dryrun");
          run(c, "ship");
          record(c, { cause: "default", check: "none" });
        },
      },
      {
        id: "late",
        title: "The expert's fix and tests, then waits and ships after 14:00",
        reasoning: "met",
        drive: (c) => {
          run(c, "dryrun");
          run(c, "change", { f: "none" });
          run(c, "pytest");
          for (let i = 0; i < 5; i++) run(c, "wait");
          run(c, "ship");
          record(c, { cause: "default", check: "tests" });
        },
      },
    ],
  };
}
