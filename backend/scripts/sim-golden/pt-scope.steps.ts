// REQ-238: golden paths for the PenTest+ scope-boundary engagement on the
// security console (PENTESTPLUS/pentest-scope-boundary.sim.json). No
// prototype exists, so the expectations are the engine's own results.
import type { StepPath, StepsSpec } from "./steps.ts";
import { close, task, watchUntil } from "./secplus-helpers.ts";

export const ENTRY = { course: "PENTESTPLUS", slug: "pentest-scope-boundary" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}

type C = Parameters<StepPath["drive"]>[0];
const waitForResults = (c: C) => {
  let n = 0;
  while (c.value("findingsAt") === null && c.run.state.phase === "incident" && n++ < 20) task(c, "watch");
};

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Pause the queue, check scope and ownership, call the IT manager, scan 192.0.2.0/25 without the imaging server, validate the printer then SMB; note to the IT manager",
      reasoning: "met",
      drive: (c) => {
        task(c, "pauseQueue");
        task(c, "reviewScope");
        task(c, "whois");
        task(c, "askClient");
        task(c, "setTargets", { list: "inScopeNoPacs" });
        task(c, "startScan");
        task(c, "escalate");
        waitForResults(c);
        task(c, "validate", { which: "printer" });
        task(c, "validate", { which: "smb" });
        close(c);
        c.act("notify", { who: "contact" });
        c.act("document", { top: "printer", out: "reported" });
      },
    },
    {
      id: "letItRun",
      title: "Never checks the output against the scope and leaves the queued scan alone: it probes the vendor and the shared host at 18:15 and takes the imaging server down",
      reasoning: "missed",
      drive: (c) => {
        watchUntil(c, 60);
        c.answer();
        c.act("notify", { who: "nobody" });
        c.act("document", { top: "smb", out: "omitted" });
      },
    },
    {
      id: "inScopePacs",
      title: "Pauses and removes the out-of-scope hosts, but leaves the excluded imaging server in the list",
      reasoning: "partial",
      drive: (c) => {
        task(c, "pauseQueue");
        task(c, "reviewScope");
        task(c, "askClient");
        task(c, "setTargets", { list: "inScope" });
        task(c, "startScan");
        watchUntil(c, 60);
        c.answer();
        c.act("notify", { who: "contact" });
        c.act("document", { top: "printer", out: "reported" });
      },
    },
    {
      id: "probeRdp",
      title: "Sets the scan up correctly but tries passwords on the vendor's RDP server while it runs; tells the vendor and host directly",
      reasoning: "partial",
      drive: (c) => {
        task(c, "pauseQueue");
        task(c, "reviewScope");
        task(c, "setTargets", { list: "inScopeNoPacs" });
        task(c, "startScan");
        task(c, "probeRdp");
        waitForResults(c);
        task(c, "validate", { which: "printer" });
        close(c);
        c.act("notify", { who: "vendor" });
        c.act("document", { top: "printer", out: "tested" });
      },
    },
    {
      id: "noAsk",
      title: "Fixes the target list in time but never asks the client, and validates only SMB signing",
      reasoning: "partial",
      drive: (c) => {
        task(c, "pauseQueue");
        task(c, "setTargets", { list: "inScopeNoPacs" });
        task(c, "startScan");
        task(c, "reviewScope");
        waitForResults(c);
        task(c, "validate", { which: "smb" });
        task(c, "escalate");
        close(c);
        c.act("notify", { who: "contact" });
        c.act("document", { top: "smb", out: "reported" });
      },
    },
    {
      id: "pausedOnly",
      title: "Pauses, checks scope and asks the client, but never runs the scan: nothing is proven tonight",
      reasoning: "partial",
      drive: (c) => {
        task(c, "pauseQueue");
        task(c, "reviewScope");
        task(c, "whois");
        task(c, "askClient");
        task(c, "escalate");
        watchUntil(c, 30);
        close(c);
        c.act("notify", { who: "contact" });
        c.act("document", { top: "tls", out: "reported" });
      },
    },
  ];
}
