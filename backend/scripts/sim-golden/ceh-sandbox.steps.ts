// REQ-314: golden paths for the CEH sandbox report case
// (CEH/ceh-sandbox-invoice-loader.sim.json): a macro downloader read in the
// isolated sandbox, then scoped, contained and detected. Defensive only.
import type { Ctl, StepPath, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "CEH", slug: "ceh-sandbox-invoice-loader" };

function d(c: Ctl, action: string, params?: Record<string, string>): void {
  if (c.run.state.phase !== "incident" || c.run.state.ended) return;
  c.act(action, params);
  while (c.run.state.phase === "incident" && !c.run.state.ended && c.value("busy") === true) c.skip("work");
}

function close(c: Ctl, what: string): void {
  if (c.run.state.phase === "incident") c.act("closeIncident");
  c.answer();
  c.act("document", { what });
}

const run = (c: Ctl, list: string[]) => {
  for (const a of list) d(c, a);
};

export function paths(): StepPath[] {
  return [
    { id: "expert", title: "Isolate the reporter, static analysis, indicators, fleet hunt, isolate WS-131, block, detonate in the sandbox; specific YARA and Sigma tested and deployed; shared; image then rebuild", reasoning: "met",
      drive: (c) => { run(c, ["iso114", "static", "iocs", "hunt", "iso131", "block", "detonate", "yaraTight", "sigma", "test", "deploy", "share", "image", "rebuild"]); close(c, "full"); } },
    { id: "deleteOnly", title: "Contained in time, but the dropped file and Run key deleted instead of a rebuild, and no image", reasoning: "partial",
      drive: (c) => { run(c, ["iso114", "static", "iocs", "hunt", "iso131", "block", "detonate", "yaraTight", "sigma", "test", "deploy", "share", "clean"]); close(c, "full"); } },
    { id: "broadRule", title: "Contained, but a YARA rule for every macro document; only the Sigma rule tested and deployed", reasoning: "partial",
      drive: (c) => { run(c, ["iso114", "static", "iocs", "hunt", "iso131", "block", "detonate", "yaraBroad", "sigma", "test", "deploy", "image", "rebuild"]); close(c, "brief"); } },
    { id: "noHunt", title: "Deep analysis of the sample first, no fleet search: WS-131's second stage runs", reasoning: "partial",
      drive: (c) => { run(c, ["static", "detonate", "iocs", "yaraTight", "sigma", "test", "deploy", "iso114", "image", "rebuild"]); close(c, "full"); } },
    { id: "laptop", title: "The attachment opened on the analyst's own laptop", reasoning: "missed",
      drive: (c) => { run(c, ["prodRun", "static", "iocs", "iso114", "block", "rebuild"]); close(c, "brief"); } },
    { id: "closedEarly", title: "Static analysis only, then closed with WS-114 never isolated or cleaned", reasoning: "missed",
      drive: (c) => { run(c, ["static"]); close(c, "nothing"); } },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
