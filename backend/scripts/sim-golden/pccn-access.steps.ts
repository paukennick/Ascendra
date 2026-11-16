// REQ-277 (nursing specialty bedside sims): golden paths for
// PCCN/femoral-access-retroperitoneal-bleed. The expectations are the
// engine's own results, re-checked by every `npm test` (lint + documents).
//
//   npm run sim:golden -- steps pccn-access
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "PCCN", slug: "femoral-access-retroperitoneal-bleed" };

const GOOD = { sit: "change", bg: "full", asmt: "rp", rec: "come" };
const VAGUE = { sit: "pain", bg: "min", asmt: "msk", rec: "wait" };

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
        title: "Expert at study pace: assess, flat, pressure above the puncture, bolus, stat labs, an SBAR naming a retroperitoneal bleed, an objective note while the blood is crossmatched, both units hung on arrival",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 30);
          c.act("look");
          c.act("flat");
          c.act("pressure");
          c.act("bolus");
          c.act("labs");
          c.act("call", GOOD);
          // the blood prompt stays on offer until the note (a boundary with its wait pending)
          until(c, (x) => x.run.state.tick >= 300);
          c.act("note", { kind: "obj" });
          bloodWhenReady(c);
          toEnd(c);
        },
      },
      {
        id: "slowCall",
        title: "A first call about muscle pain, local care and a bolus at 12 minutes, the bleed named at 18 minutes, blood hung on arrival",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 120);
          c.act("look");
          c.act("call", VAGUE);
          upTo(c, 720);
          c.act("flat");
          c.act("pressure");
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
        title: "Fast local care and fluids, then the rapid response team instead of a call; the blood is never hung",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 30);
          c.act("look");
          c.act("flat");
          c.act("pressure");
          c.act("bolus");
          c.act("rrt");
          c.act("note", { kind: "opinion" });
          toEnd(c);
        },
      },
      {
        id: "painFirst",
        title: "Morphine for the back pain first, then a clear SBAR, local care and blood, but no fluid until it arrives",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 60);
          c.act("look");
          c.act("morphine");
          c.act("call", GOOD);
          c.act("flat");
          c.act("pressure");
          bloodWhenReady(c);
          toEnd(c);
        },
      },
      {
        id: "waitHgb",
        title: "Failure: stat labs and morphine, a call about muscle pain, then a wait for the hemoglobin before naming the bleed; no pressure, no fluid",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 300);
          c.act("labs");
          c.act("morphine");
          c.act("call", VAGUE);
          until(c, (x) => {
            teach(x);
            return x.value("hgbResultAt") !== null || x.run.state.ended !== null;
          });
          if (c.run.state.ended === null) c.act("call", GOOD);
          toEnd(c);
        },
      },
      {
        id: "comfortOnly",
        title: "Failure: never examined, morphine and a note about bed rest, nobody told",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 120);
          c.act("morphine");
          c.act("note", { kind: "opinion" });
          toEnd(c);
        },
      },
    ],
  };
}
