// REQ-312: golden paths for the JAVASCRIPT fetch case on the data and code
// console (JAVASCRIPT/js-rate-board-zero-percent.sim.json). The TSNODE band
// (TSNODE/js-rate-board-zero-percent-tsnode) reuses these paths.
import type { StepPath, StepsSpec } from "./steps.ts";
import { record, run } from "./data-helpers.ts";

export const ENTRY = { course: "JAVASCRIPT", slug: "js-rate-board-zero-percent" };

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Network panel first; check res.ok and show 'Rates unavailable' with the last good rates; a 5 s timeout; the 503 test passes; merge",
      reasoning: "met",
      drive: (c) => {
        run(c, "network");
        run(c, "fixOk");
        run(c, "fixTimeout");
        run(c, "test");
        run(c, "ship");
        record(c, { cause: "status", check: "mock" });
      },
    },
    {
      id: "retryLoop",
      title: "Adds a retry loop without looking, skips the test, and merges it",
      reasoning: "missed",
      drive: (c) => {
        run(c, "fixRetry");
        run(c, "ship");
        record(c, { cause: "rates", check: "reload" });
      },
    },
    {
      id: "shipUnchanged",
      title: "Finds the swallowed SyntaxError, adds a timeout only, and merges with the zero fallback still in place",
      reasoning: "partial",
      drive: (c) => {
        run(c, "console");
        run(c, "network");
        run(c, "fixTimeout");
        run(c, "test");
        run(c, "ship");
        record(c, { cause: "status", check: "none" });
      },
    },
    {
      id: "removeCatch",
      title: "Looks, removes the try/catch so errors surface, tests (blank page), and merges",
      reasoning: "partial",
      drive: (c) => {
        run(c, "network");
        run(c, "removeCatch");
        run(c, "test");
        run(c, "ship");
        record(c, { cause: "status", check: "reload" });
      },
    },
    {
      id: "lateUntested",
      title: "Fixes the ok check before looking, waits, and merges after the train without a test",
      reasoning: "met",
      drive: (c) => {
        run(c, "fixOk");
        run(c, "network");
        for (let i = 0; i < 3; i++) run(c, "wait");
        run(c, "ship");
        record(c, { cause: "status", check: "mock" });
      },
    },
    {
      id: "holdBack",
      title: "Finds the cause and stops without merging anything",
      reasoning: "partial",
      drive: (c) => {
        run(c, "network");
        run(c, "console");
        record(c, { cause: "status", check: "none" });
      },
    },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
