// REQ-275 (nursing specialty bedside sims): golden paths for
// CMSRN/postop-hemorrhage-early-signs. The expectations are the
// engine's own results, re-checked by every `npm test` (lint + documents).
//
//   npm run sim:golden -- steps cmsrn-bleed
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CMSRN", slug: "postop-hemorrhage-early-signs" };

const GOOD = { sit: "bleed", bg: "full", asmt: "bleed", rec: "come" };
const VAGUE = { sit: "pain", bg: "min", asmt: "pain", rec: "prn" };

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
function bloodWhenReady(c: Ctl): void {
  until(c, (x) => {
    teach(x);
    return x.value("bloodReadyAt") !== null || x.run.state.ended !== null;
  });
  if (c.run.state.ended === null) c.act("transfuse");
  if (c.run.state.ended === null) c.act("transfuse");
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: assess, urine output, bolus, stat labs, an SBAR that names bleeding, an objective note while the blood is crossmatched, both units hung on arrival",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 30);
          c.act("look");
          c.act("urine");
          c.act("bolus");
          c.act("labs");
          c.act("call", GOOD);
          until(c, (x) => x.run.state.tick >= 300);
          c.act("note", { kind: "obj" });
          bloodWhenReady(c);
          toEnd(c);
        },
      },
      {
        id: "slowCall",
        title: "Assessed early, a first call about pain, urine output and a bolus at 12 minutes, bleeding named at 18 minutes, blood hung on arrival",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 120);
          c.act("look");
          c.act("call", VAGUE);
          upTo(c, 720);
          c.act("urine");
          c.act("bolus");
          c.act("labs");
          upTo(c, 1080);
          c.act("call", GOOD);
          bloodWhenReady(c);
          c.act("note", { kind: "obj" });
          toEnd(c);
        },
      },
      {
        id: "teamCalls",
        title: "Fast urine check and bolus, then the rapid response team instead of a call; blood never hung",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 30);
          c.act("look");
          c.act("urine");
          c.act("bolus");
          c.act("rrt");
          c.act("note", { kind: "opinion" });
          toEnd(c);
        },
      },
      {
        id: "opioidFirst",
        title: "Hydromorphone for the restlessness first, then a clear SBAR and blood, but no urine check or bolus",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 60);
          c.act("look");
          c.act("opioid");
          c.act("call", GOOD);
          bloodWhenReady(c);
          toEnd(c);
        },
      },
      {
        id: "waitHgb",
        title: "Failure: labs and hydromorphone, a call about pain, then a wait for the hemoglobin; no bolus",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 300);
          c.act("labs");
          c.act("opioid");
          c.act("call", VAGUE);
          toEnd(c);
        },
      },
    ],
  };
}
