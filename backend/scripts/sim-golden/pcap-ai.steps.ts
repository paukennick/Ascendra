// REQ-333: golden paths for the PCAP AI-generated code case on the data
// console (PCAP/pcap-ai-helper-invented-function.sim.json).
import type { StepsSpec } from "./steps.ts";
import { record, run } from "./data-helpers.ts";

export const ENTRY = { course: "PCAP", slug: "pcap-ai-helper-invented-function" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Runs it (AttributeError), checks the API (fmean), reads the prompt log, fixes, tests 87.6, rotates the key, merges", reasoning: "met", drive: (c) => { run(c, "runit"); run(c, "docs"); run(c, "promptlog"); run(c, "change", { f: "fmean" }); run(c, "pytest"); run(c, "rotate"); run(c, "ship"); record(c, { cause: "invented", check: "known" }); } },
      { id: "trustIt", title: "Approves the assistant's code as written", reasoning: "missed", drive: (c) => { run(c, "ship"); record(c, { cause: "typo", check: "none" }); } },
      { id: "installPkg", title: "Runs it, installs the package the assistant names, tests pass, merges", reasoning: "missed", drive: (c) => { run(c, "runit"); run(c, "install"); run(c, "pytest"); run(c, "ship"); record(c, { cause: "version", check: "runs" }); } },
      { id: "fallback", title: "Runs it, wraps it in a fallback to the plain mean so it runs, merges", reasoning: "missed", drive: (c) => { run(c, "runit"); run(c, "docs"); run(c, "change", { f: "fallback" }); run(c, "runit"); run(c, "ship"); record(c, { cause: "invented", check: "runs" }); } },
      { id: "keyLeft", title: "Fixes and tests it right but never looks at the prompt log", reasoning: "met", drive: (c) => { run(c, "runit"); run(c, "docs"); run(c, "change", { f: "fmean" }); run(c, "pytest"); run(c, "ship"); record(c, { cause: "invented", check: "known" }); } },
      { id: "homemadeHeld", title: "Writes the formula by hand, sees the tests fail, rotates the key and holds the merge", reasoning: "partial", drive: (c) => { run(c, "runit"); run(c, "promptlog"); run(c, "change", { f: "homemade" }); run(c, "pytest"); run(c, "rotate"); record(c, { cause: "invented", check: "none" }); } },
    ],
  };
}
