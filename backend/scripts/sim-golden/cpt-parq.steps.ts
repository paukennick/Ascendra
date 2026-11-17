// REQ-314: golden paths for the NASM-CPT first session with a PAR-Q+ YES and
// exertional chest tightness (NASMCPT/cpt-parq-chest-tightness.sim.json), on
// the client trainer screen. No prototype; the expectations are the engine's.
import type { Ctl, StepPath, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "NASMCPT", slug: "cpt-parq-chest-tightness" };

function d(c: Ctl, action: string, params?: Record<string, string>): void {
  c.act(action, params);
  if (c.run.state.phase === "session" && !c.run.state.ended && c.value("busy") === true) c.skip("work");
}

function close(c: Ctl, what: string): void {
  if (c.run.state.phase === "session") c.act("closeSession");
  c.answer();
  c.act("document", { what });
}

// Exported so the other fitness courses' bands reuse the same paths.
export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "PAR-Q+ and follow-ups, activity, the question about stairs; no exertion; referral with the form and a note; goals for after clearance; a full record",
      reasoning: "met",
      drive: (c) => {
        d(c, "reviewParq");
        d(c, "followUp");
        d(c, "askActivity");
        d(c, "askSymptoms");
        d(c, "measureRest");
        d(c, "refer");
        d(c, "plan");
        close(c, "full");
      },
    },
    {
      id: "reassured",
      title: "The symptom found and a referral, but first 'probably just being out of shape'; a one-line record",
      reasoning: "partial",
      drive: (c) => {
        d(c, "reviewParq");
        d(c, "followUp");
        d(c, "askSymptoms");
        d(c, "reassure");
        d(c, "refer");
        close(c, "brief");
      },
    },
    {
      id: "formOnly",
      title: "Form and follow-ups only, then the step test: tightness at 3 min, stopped, 911 called, referred",
      reasoning: "partial",
      drive: (c) => {
        d(c, "reviewParq");
        d(c, "followUp");
        d(c, "measureRest");
        d(c, "stepTest");
        d(c, "stopEx");
        d(c, "call911");
        c.skip("ems");
        d(c, "refer");
        close(c, "full");
      },
    },
    {
      id: "stoppedNoCall",
      title: "Treadmill warm-up without asking; tightness, stopped and rested, referred to his doctor, no 911 call",
      reasoning: "partial",
      drive: (c) => {
        d(c, "reviewParq");
        d(c, "followUp");
        d(c, "treadmill");
        d(c, "stopEx");
        c.skip("rest");
        d(c, "refer");
        close(c, "full");
      },
    },
    {
      id: "pushed",
      title: "Step test, then 'some tightness is normal': it spreads and will not ease; 911 late",
      reasoning: "missed",
      drive: (c) => {
        d(c, "reviewParq");
        d(c, "stepTest");
        d(c, "pushOn");
        d(c, "call911");
        c.skip("ems");
        close(c, "brief");
      },
    },
    {
      id: "noReferral",
      title: "Form read, posture assessed, a plan written; nobody asks about exertion and nobody refers",
      reasoning: "missed",
      drive: (c) => {
        d(c, "reviewParq");
        d(c, "posture");
        d(c, "plan");
        close(c, "nothing");
      },
    },
    {
      id: "askedNoReferral",
      title: "The symptom heard, then reassurance and goals instead of a referral",
      reasoning: "missed",
      drive: (c) => {
        d(c, "reviewParq");
        d(c, "askSymptoms");
        d(c, "reassure");
        d(c, "plan");
        close(c, "full");
      },
    },
  ];
}

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}
