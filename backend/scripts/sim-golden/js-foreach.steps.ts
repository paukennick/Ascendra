// REQ-333: golden paths for the JAVASCRIPT forEach and async case on the data
// console (JAVASCRIPT/js-shift-signup-foreach-async.sim.json).
import type { StepsSpec } from "./steps.ts";
import { record, run } from "./data-helpers.ts";

export const ENTRY = { course: "JAVASCRIPT", slug: "js-shift-signup-foreach-async" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Reproduces with mocked rejections, for...of with per-save try/catch, tests pass, deploys", reasoning: "met", drive: (c) => { run(c, "repro"); run(c, "change", { f: "forof" }); run(c, "test"); run(c, "ship"); record(c, { cause: "forEach", check: "mocked" }); } },
      { id: "tryWrap", title: "Wraps the forEach in try/catch and deploys untested", reasoning: "missed", drive: (c) => { run(c, "change", { f: "trywrap" }); run(c, "ship"); record(c, { cause: "server", check: "none" }); } },
      { id: "swallow", title: "Reproduces, silences each rejection, sees no console errors and deploys", reasoning: "missed", drive: (c) => { run(c, "repro"); run(c, "change", { f: "swallow" }); run(c, "repro"); run(c, "ship"); record(c, { cause: "forEach", check: "noErrors" }); } },
      { id: "promiseAll", title: "Reproduces, Promise.all with a general error, a test fails on naming, deploys anyway", reasoning: "partial", drive: (c) => { run(c, "repro"); run(c, "change", { f: "all" }); run(c, "test"); run(c, "ship"); record(c, { cause: "forEach", check: "mocked" }); } },
      { id: "hold", title: "Reproduces and holds the release", reasoning: "partial", drive: (c) => { run(c, "repro"); record(c, { cause: "forEach", check: "none" }); } },
      { id: "late", title: "Changes first, reproduces after, tests, waits, deploys after 17:00", reasoning: "met", drive: (c) => { run(c, "change", { f: "forof" }); run(c, "repro"); run(c, "test"); for (let i = 0; i < 5; i++) run(c, "wait"); run(c, "ship"); record(c, { cause: "forEach", check: "mocked" }); } },
    ],
  };
}
