// REQ-333: golden paths for the MSHI EHR downtime tabletop
// (MSHI/mshi-ehr-downtime-tabletop.sim.json).
import type { StepPath, StepsSpec } from "./steps.ts";
import { helpers } from "./gov-helpers.ts";

export const ENTRY = { course: "MSHI", slug: "mshi-ehr-downtime-tabletop" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}

const M = 60;
const { task, watchUntil, close } = helpers("exercise", "busy", "work", "watch", "endEx");
type C = Parameters<StepPath["drive"]>[0];
const aar = (c: C, plan: string) => c.act("afterAction", { plan });
type Choices = { ids: string; results: string; restore: string; staff: string; plan: string };
const EXPERT: Choices = { ids: "temp", results: "phone", restore: "reconcile", staff: "page", plan: "owned" };

function play(c: C, ch: Choices, o: { retry?: boolean; gaps?: number; brief?: boolean; noDeclare?: boolean } = {}): void {
  if (o.retry) task(c, "retry");
  if (!o.noDeclare) task(c, "declare");
  task(c, "notifyStaff", { m: ch.staff });
  if (o.brief !== false) task(c, "briefExec");
  const gaps = o.gaps ?? 3;
  if (gaps >= 1) task(c, "askBackup");
  watchUntil(c, 40 * M);
  task(c, "register", { r: ch.ids });
  if (gaps >= 2) task(c, "askForms");
  watchUntil(c, 110 * M);
  task(c, "criticalResults", { c: ch.results });
  if (gaps >= 3) task(c, "askLead");
  watchUntil(c, 260 * M);
  task(c, "restore", { b: ch.restore });
  close(c);
  aar(c, ch.plan);
}

export function paths(): StepPath[] {
  return [
    { id: "expert", title: "Calls the downtime at once, pages and texts, briefs the administrator, downtime numbers, phoned results with read-back, drains and reconciles, three gaps owned", reasoning: "met", drive: (c) => play(c, EXPERT) },
    { id: "doeNames", title: "Registers the unidentified patient as 'John Doe'", reasoning: "missed", drive: (c) => play(c, { ...EXPERT, ids: "doe" }) },
    { id: "trayResults", title: "Prints results to the unit trays", reasoning: "missed", drive: (c) => play(c, { ...EXPERT, results: "tray" }) },
    { id: "flipBack", title: "Switches everything back on at once and files the paper", reasoning: "missed", drive: (c) => play(c, { ...EXPERT, restore: "flip" }) },
    { id: "noReport", title: "Runs the expert's exercise and writes no after-action", reasoning: "partial", drive: (c) => play(c, { ...EXPERT, plan: "none" }) },
    { id: "neverCalled", title: "Holds off, tells staff by page but never calls the downtime; the other injects handled well", reasoning: "partial", drive: (c) => play(c, EXPERT, { retry: true, noDeclare: true }) },
    { id: "emailLate", title: "Holds off half an hour, then emails staff; one gap found, listed but not owned", reasoning: "partial", drive: (c) => play(c, { ...EXPERT, staff: "email", plan: "listed" }, { retry: true, gaps: 1, brief: false }) },
  ];
}
