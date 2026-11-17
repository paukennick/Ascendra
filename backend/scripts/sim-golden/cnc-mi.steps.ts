// REQ-314: golden paths for the NASM-CNC coaching session with an ambivalent
// client and a food record that does not add up
// (NASMCNC/cnc-ambivalent-food-record.sim.json), on the client trainer screen.
import type { Ctl, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "NASMCNC", slug: "cnc-ambivalent-food-record" };

function d(c: Ctl, action: string, params?: Record<string, string>): void {
  if (c.run.state.phase !== "session" || c.run.state.ended) return;
  c.act(action, params);
  if (c.run.state.phase === "session" && !c.run.state.ended && c.value("busy") === true) c.skip();
}

function close(c: Ctl, what: string): void {
  if (c.run.state.phase === "session") c.act("closeSession");
  c.answer();
  c.act("document", { what });
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      { id: "expert", title: "Open question, affirmation, two-sided reflection; the record explored and checked with a recall; permission; ruler, summary; her step; a full note", reasoning: "met",
        drive: (c) => { for (const a of ["openQ", "affirm", "reflect", "readRecord", "explore", "recall", "permission", "ruler", "summary", "herStep"]) d(c, a); close(c, "full"); } },
      { id: "toldOnce", title: "Good listening and a recall, then advice she did not ask for; she still picks a step", reasoning: "partial",
        drive: (c) => { for (const a of ["openQ", "reflect", "ruler", "readRecord", "recall", "righting", "summary", "affirm", "herStep"]) d(c, a); close(c, "full"); } },
      { id: "myRule", title: "Listening and the record explored, but the coach sets the rule", reasoning: "partial",
        drive: (c) => { for (const a of ["openQ", "affirm", "readRecord", "explore", "recall", "mineStep"]) d(c, a); close(c, "brief"); } },
      { id: "stillWeighing", title: "Open question only, the record read and not explored; no step", reasoning: "partial",
        drive: (c) => { for (const a of ["openQ", "readRecord", "herStep"]) d(c, a); close(c, "brief"); } },
      { id: "accused", title: "The record called wrong, then advice twice: she walks out", reasoning: "missed",
        drive: (c) => { for (const a of ["readRecord", "confront", "righting", "righting"]) d(c, a); close(c, "nothing"); } },
    ],
  };
}
