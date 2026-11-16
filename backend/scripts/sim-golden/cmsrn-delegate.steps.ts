// REQ-275 (nursing specialty bedside sims): golden paths for
// CMSRN/delegation-morning-assignment. The expectations are the engine's
// own results, re-checked by every `npm test` (lint + documents).
//
//   npm run sim:golden -- steps cmsrn-delegate
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CMSRN", slug: "delegation-morning-assignment" };

const GOOD = { admit: "rn", teach: "rn", meds: "lpn", vs: "clear" };
const upTo = (c: Ctl, tick: number): void =>
  until(c, (x) => {
    teach(x);
    return x.run.state.tick >= tick || x.run.state.ended !== null;
  });
const toEnd = (c: Ctl): void =>
  until(c, (x) => {
    teach(x);
    return x.run.state.ended !== null;
  });
const report = (c: Ctl): void =>
  until(c, (x) => {
    teach(x);
    return x.value("reportAt") !== null || x.run.state.ended !== null;
  });

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: RN keeps the admission and teaching, LPN the oral medicines, specific directions to the assistant; on the report, see him yourself, SBAR, check back, note",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 20);
          c.act("assign", GOOD);
          report(c);
          c.act("seeLane");
          c.act("call");
          c.act("follow");
          c.act("note", { kind: "obj" });
          toEnd(c);
        },
      },
      {
        id: "lpnFirst",
        title: "Good plan, but the report goes to the LPN to recheck first; assessed at 12 minutes, no follow-up",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 20);
          c.act("assign", GOOD);
          report(c);
          c.act("lpnRecheck");
          upTo(c, (c.value("reportAt") as number) + 720);
          c.act("seeLane");
          c.act("call");
          c.act("note", { kind: "opinion" });
          toEnd(c);
        },
      },
      {
        id: "vague",
        title: "Right people, vague directions: the low pressure surfaces at the 09:45 huddle; seen and escalated at once",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 20);
          c.act("assign", { ...GOOD, vs: "vague" });
          report(c);
          c.act("seeLane");
          c.act("call");
          c.act("follow");
          toEnd(c);
        },
      },
      {
        id: "outOfScope",
        title: "Failure: the admission to the LPN, teaching and medicines to the assistant; report handled late",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 20);
          c.act("assign", { admit: "lpn", teach: "uap", meds: "uap", vs: "clear" });
          report(c);
          c.act("lpnRecheck");
          upTo(c, (c.value("reportAt") as number) + 1500);
          c.act("seeLane");
          c.act("call");
          toEnd(c);
        },
      },
      {
        id: "neverSeen",
        title: "Failure: vague directions and the report handed to the LPN; no RN assessment, no call",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 20);
          c.act("assign", { admit: "lpn", teach: "rn", meds: "lpn", vs: "vague" });
          report(c);
          c.act("lpnRecheck");
          toEnd(c);
        },
      },
    ],
  };
}
