// REQ-240 (bedside wave 2): golden paths for BSNRN/charge-nurse-short-staffed-shift.
// No prototype exists, so the expectations are the engine's own results,
// re-checked by every `npm test` (lint + documents).
//
//   npm run sim:golden -- steps bsn-charge
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "BSNRN", slug: "charge-nurse-short-staffed-shift" };

const upTo = (c: Ctl, tick: number): void =>
  until(c, (x) => {
    teach(x);
    return x.run.state.tick >= tick || x.run.state.ended !== null;
  });
const toEnd = (c: Ctl): void =>
  until(
    c,
    (x) => {
      teach(x);
      return x.run.state.ended !== null;
    },
    20000
  );
const when = (c: Ctl, name: string): void =>
  until(c, (x) => {
    teach(x);
    return x.value(name) === true || x.run.state.ended !== null;
  });

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: Bed 2 to Priya, the admission to the charge nurse, the blood to Sam; house supervisor at once; clear directions to Marco; follow-up; Sam paired with Priya for the transfusion",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 5);
          c.act("assign", { ito: "priya", admit: "me", dunn: "sam" });
          c.act("callSup");
          c.act("briefMarco", { how: "clear" });
          upTo(c, 1810);
          c.act("followUp");
          when(c, "samAsked");
          c.act("followUp");
          c.act("supportSam", { how: "pair" });
          toEnd(c);
        },
      },
      {
        id: "chargeSteps",
        title: "Bed 2 to the new graduate, but the charge nurse sees him at 12 minutes; vague directions to Marco, a late supervisor call, and the blood moved when the LPN raises the policy",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 30);
          c.act("assign", { ito: "sam", admit: "priya", dunn: "lena" });
          c.act("briefMarco", { how: "vague" });
          upTo(c, 720);
          c.act("seeIto");
          upTo(c, 1200);
          c.act("callSup");
          upTo(c, 1900);
          c.act("followUp");
          when(c, "lenaAsked");
          c.act("moveBlood");
          toEnd(c);
        },
      },
      {
        id: "rebalanced",
        title: "Bed 2 and the admission both to Priya; she objects and the charge nurse takes the admission; but Sam is told he'll be fine with the blood",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 5);
          c.act("assign", { ito: "priya", admit: "priya", dunn: "sam" });
          c.act("callSup");
          c.act("briefMarco", { how: "clear" });
          when(c, "objection");
          c.act("rebalance", { to: "me" });
          c.act("followUp");
          when(c, "samAsked");
          c.act("supportSam", { how: "alone" });
          toEnd(c);
        },
      },
      {
        id: "dismissed",
        title: "Priya's concern brushed off and no call to the supervisor; the transfusion taken over from Sam",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 5);
          c.act("assign", { ito: "priya", admit: "priya", dunn: "sam" });
          c.act("briefMarco", { how: "clear" });
          when(c, "objection");
          c.act("dismiss");
          c.act("followUp");
          when(c, "samAsked");
          c.act("supportSam", { how: "take" });
          toEnd(c);
        },
      },
      {
        id: "lpnBed2",
        title: "Failure: the unstable client to the float LPN, the assistant asked to check on him, and the blood left with the LPN",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 60);
          c.act("assign", { ito: "lena", admit: "sam", dunn: "lena" });
          c.act("briefMarco", { how: "assess" });
          toEnd(c);
        },
      },
      {
        id: "noAssignments",
        title: "Failure: the charge nurse calls the supervisor and waits for the float nurse before assigning anyone",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 60);
          c.act("callSup");
          toEnd(c);
        },
      },
    ],
  };
}
