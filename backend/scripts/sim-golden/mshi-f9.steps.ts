// REQ-333: golden paths for the MSHI interprofessional tabletop
// (MSHI/mshi-flag-mapping-interprofessional-tabletop.sim.json).
import type { StepPath, StepsSpec } from "./steps.ts";
import { helpers } from "./gov-helpers.ts";

export const ENTRY = { course: "MSHI", slug: "mshi-flag-mapping-interprofessional-tabletop" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}

const M = 60;
const { task, watchUntil, close } = helpers("exercise", "busy", "work", "watch", "endEx");
type C = Parameters<StepPath["drive"]>[0];
type Choices = { h: string; m: string; r: string; d: string; plan: string };
const EXPERT: Choices = { h: "team", m: "sbar", r: "roles", d: "validate", plan: "owned" };

function play(c: C, ch: Choices, o: { gaps?: number; lateHuddle?: boolean } = {}): void {
  const gaps = o.gaps ?? 3;
  if (o.lateHuddle) watchUntil(c, 70 * M);
  task(c, "huddle", { h: ch.h });
  if (gaps >= 1) task(c, "askNotify");
  watchUntil(c, 30 * M);
  task(c, "handoff", { m: ch.m });
  if (gaps >= 2) task(c, "askKit");
  watchUntil(c, 90 * M);
  task(c, "team", { r: ch.r });
  if (gaps >= 3) task(c, "askRoster");
  watchUntil(c, 180 * M);
  task(c, "deploy", { d: ch.d });
  close(c);
  c.act("afterAction", { plan: ch.plan });
}

export function paths(): StepPath[] {
  return [
    { id: "expert", title: "Huddles every profession with an SBAR, hands off by SBAR with read-back, restates the goal and roles, deploys after lab verification, three gaps owned", reasoning: "met", drive: (c) => play(c, EXPERT) },
    { id: "itOnly", title: "Keeps the problem inside informatics", reasoning: "missed", drive: (c) => play(c, { ...EXPERT, h: "it" }) },
    { id: "chatHandoff", title: "Hands off by chat message and a ticket number", reasoning: "missed", drive: (c) => play(c, { ...EXPERT, m: "chat" }) },
    { id: "deployNow", title: "Deploys the fix without lab verification", reasoning: "missed", drive: (c) => play(c, { ...EXPERT, d: "now" }) },
    { id: "listedGaps", title: "Works every inject well and finds all three gaps, but lists them without owners", reasoning: "met", drive: (c) => play(c, { ...EXPERT, plan: "listed" }) },
    { id: "noReport", title: "Runs the injects well but asks the table nothing and writes no after-action", reasoning: "partial", drive: (c) => play(c, { ...EXPERT, plan: "none" }, { gaps: 0 }) },
    { id: "blameLate", title: "Huddles late, answers friction with an incident report naming people, one gap listed but not owned", reasoning: "partial", drive: (c) => play(c, { ...EXPERT, r: "blame", plan: "listed" }, { gaps: 1, lateHuddle: true }) },
  ];
}
