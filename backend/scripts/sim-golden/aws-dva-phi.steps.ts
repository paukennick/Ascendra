// REQ-242 (AWS board sims, wave 2): golden paths for
// AWSDVA/phi-in-application-logs, a learner-paced board case.
//
//   npm run sim:golden -- steps aws-dva-phi
import type { Ctl, StepsSpec } from "./steps.ts";
import { week } from "./aws-board-helpers.ts";

export const ENTRY = { course: "AWSDVA", slug: "phi-in-application-logs" };

function sample(c: Ctl, a: "right" | "wrong"): void {
  c.act("sampleLogs");
  if (c.run.state.openPrompt) c.choose(a);
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert: fields, destinations and readers first; vendor feed off, logging fixed, masking, readers limited, reported, evidence preserved",
        reasoning: "met",
        drive: (c) => {
          sample(c, "right");
          c.act("destinations");
          c.act("readers");
          c.act("stopVendor");
          c.act("fixCode");
          c.act("maskPolicy");
          c.act("restrictReaders");
          c.act("escalate");
          c.act("retention", { how: "preserve" });
          week(c);
        },
      },
      {
        id: "noReport",
        title: "Stops the data at the source and the exit but never tells the privacy officer",
        reasoning: "partial",
        drive: (c) => {
          sample(c, "right");
          c.act("destinations");
          c.act("stopVendor");
          c.act("fixCode");
          c.act("maskPolicy");
          c.act("restrictReaders");
          week(c);
        },
      },
      {
        id: "maskOnly",
        title: "Relies on a masking policy alone: the vendor feed and the logging code stay as they were",
        reasoning: "partial",
        drive: (c) => {
          sample(c, "wrong");
          c.act("destinations");
          c.act("maskPolicy");
          c.act("escalate");
          week(c);
        },
      },
      {
        id: "purge",
        title: "Failure: stops the exposure, then purges the stored logs before the privacy officer can assess them",
        reasoning: "partial",
        drive: (c) => {
          sample(c, "right");
          c.act("destinations");
          c.act("fixCode");
          c.act("stopVendor");
          c.act("escalate");
          c.act("retention", { how: "purge" });
        },
      },
      {
        id: "readersOnly",
        title: "Failure: never looks for destinations; limits readers and reports, while the vendor feed keeps streaming PHI",
        reasoning: "missed",
        drive: (c) => {
          sample(c, "right");
          c.act("readers");
          c.act("restrictReaders");
          c.act("escalate");
          week(c);
        },
      },
    ],
  };
}
