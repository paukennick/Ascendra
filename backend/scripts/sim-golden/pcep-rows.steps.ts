// REQ-333: golden paths for the PCEP shared-row case on the data console
// (PCEP/pcep-seat-map-shared-rows.sim.json).
import type { StepsSpec } from "./steps.ts";
import { record, run } from "./data-helpers.ts";

export const ENTRY = { course: "PCEP", slug: "pcep-seat-map-shared-rows" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Books A5 in a fresh session (every row sold), builds rows with a comprehension, tests, ships", reasoning: "met", drive: (c) => { run(c, "show"); run(c, "change", { f: "comp" }); run(c, "pytest"); run(c, "ship"); record(c, { cause: "shared", check: "tests" }); } },
      { id: "copyOuter", title: "Copies the outer list without reproducing it and ships untested", reasoning: "missed", drive: (c) => { run(c, "change", { f: "copy" }); run(c, "ship"); record(c, { cause: "index", check: "none" }); } },
      { id: "prebuiltRow", title: "Reproduces it, repeats one prebuilt row in a comprehension, sees the tests fail and ships anyway", reasoning: "missed", drive: (c) => { run(c, "show"); run(c, "change", { f: "loop" }); run(c, "pytest"); run(c, "ship"); record(c, { cause: "shared", check: "looks" }); } },
      { id: "reset", title: "Resets the map to free, then fixes the code and ships", reasoning: "missed", drive: (c) => { run(c, "reset"); run(c, "show"); run(c, "change", { f: "comp" }); run(c, "pytest"); run(c, "ship"); record(c, { cause: "shared", check: "tests" }); } },
      { id: "hold", title: "Reproduces it and holds the release", reasoning: "partial", drive: (c) => { run(c, "show"); run(c, "pytest"); record(c, { cause: "shared", check: "none" }); } },
      { id: "untested", title: "Fixes it with the comprehension and ships without the tests", reasoning: "met", drive: (c) => { run(c, "show"); run(c, "change", { f: "comp" }); run(c, "ship"); record(c, { cause: "shared", check: "looks" }); } },
    ],
  };
}
