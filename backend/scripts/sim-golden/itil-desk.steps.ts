// REQ-311: golden paths for the ITIL service-desk shift
// (ITIL5FND/monday-service-desk-wifi-problem.sim.json). No prototype exists,
// so the expectations are the engine's own results.
import type { Ctl, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "ITIL5FND", slug: "monday-service-desk-wifi-problem" };

const sec = (c: Ctl): number => c.run.state.tick * c.run.c.dt;

function act(c: Ctl, action: string, params?: Record<string, string>): void {
  c.act(action, params);
  // a skip stops early when a ticket arrives with an alarm; finish the work
  while (c.value("busy") === true && c.run.state.phase === "shift" && !c.run.state.ended) c.skip("work");
}

// Let time pass on the queue until `at` seconds after 08:00 (or the handover).
function until(c: Ctl, at: number): void {
  while (sec(c) < at && c.run.state.phase === "shift" && !c.run.state.ended) c.skip("watch");
}

const assess = (c: Ctl, which: string, imp: string, urg: string): void => act(c, "classify", { which, imp, urg });

function handover(c: Ctl): void {
  while (c.run.state.phase === "shift" && !c.run.state.ended) c.skip("shiftEnd");
  c.answer();
  c.act("close");
}

interface Plan {
  catImp: string;
  catUrg: string;
  escalate: boolean;
  manager: boolean;
  restoreWifi: boolean;
  problem: string | null;
  ke: string | null;
  request: string;
  event: string;
}

function shift(c: Ctl, p: Plan): void {
  until(c, 300);
  assess(c, "w1", "2", "1");
  until(c, 1200);
  assess(c, "cat", p.catImp, p.catUrg);
  if (p.escalate) act(c, "escalate");
  if (p.manager) act(c, "manager");
  until(c, 1800);
  if (p.restoreWifi) act(c, "restore", { which: "w1" });
  assess(c, "w2", "2", "1");
  if (p.restoreWifi) act(c, "restore", { which: "w2" });
  if (p.problem) act(c, "raiseProblem", { what: p.problem });
  until(c, 2700);
  assess(c, "acc", "3", "3");
  act(c, "request", { how: p.request });
  until(c, 3600);
  act(c, "event", { how: p.event });
  until(c, 4200);
  assess(c, "w3", "2", "1");
  if (p.restoreWifi) act(c, "restore", { which: "w3" });
  if (p.ke) {
    while (c.value("causeFound") !== true && c.run.state.phase === "shift") c.skip("watch");
    act(c, "recordKE", { how: p.ke });
  }
  until(c, 9000);
  assess(c, "w4", "2", "1");
  if (p.restoreWifi) act(c, "restore", { which: "w4" });
  until(c, 11700);
  assess(c, "w5", "2", "1");
  if (p.restoreWifi) act(c, "restore", { which: "w5" });
  handover(c);
}

const GOOD: Plan = { catImp: "1", catUrg: "1", escalate: true, manager: true, restoreWifi: true, problem: "problem", ke: "knownError", request: "request", event: "housekeeping" };

export function spec(): StepsSpec {
  return {
    slug: "monday-service-desk-wifi-problem",
    paths: [
      { id: "expert", title: "Every ticket prioritized by the matrix, the outage escalated at once and restored in time, the drops raised as a problem and recorded as a known error", reasoning: "met", drive: (c) => shift(c, GOOD) },
      { id: "misprioritized", title: "The catalog outage assessed as medium impact and urgency (priority 3), so the applications team queues it", reasoning: "partial", drive: (c) => shift(c, { ...GOOD, catImp: "2", catUrg: "2" }) },
      { id: "noProblem", title: "Every incident restored in time, but nobody looks for the cause", reasoning: "partial", drive: (c) => shift(c, { ...GOOD, problem: null, ke: null }) },
      { id: "wrongNames", title: "A known error recorded before the cause is known; the account logged as an incident; the disk alert opened as a priority 1", reasoning: "missed", drive: (c) => shift(c, { ...GOOD, problem: "knownError", ke: null, request: "incident", event: "incident" }) },
      { id: "closedProblem", title: "The problem closed once the cause is found, and the IT manager never told", reasoning: "partial", drive: (c) => shift(c, { ...GOOD, ke: "closed", manager: false }) },
      { id: "wifiLeft", title: "The outage handled, but the branches' Wi-Fi left waiting", reasoning: "missed", drive: (c) => shift(c, { ...GOOD, restoreWifi: false }) },
      { id: "neverEscalated", title: "The outage assessed but never escalated", reasoning: "missed", drive: (c) => shift(c, { ...GOOD, escalate: false, manager: false }) },
    ],
  };
}
