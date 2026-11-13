// REQ-240 (bedside wave 2): golden paths for ADNRN/pca-oversedation-naloxone.
// No prototype exists, so the expectations are the engine's own results,
// re-checked by every `npm test` (lint + documents).
//
//   npm run sim:golden -- steps adn-opioid
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ADNRN", slug: "pca-oversedation-naloxone" };

const GOOD = { sit: "over", bg: "risk", asmt: "oird", rec: "change" };
const VAGUE = { sit: "sats", bg: "min", asmt: "sleep", rec: "resume" };
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
const lastDose = (c: Ctl): number => c.run.state.tick;
function count(c: Ctl): void {
  c.act("count");
  upTo(c, c.run.state.tick + 61);
}
function smallDoses(c: Ctl, n: number): number {
  let at = 0;
  for (let i = 0; i < n; i++) {
    if (i > 0) upTo(c, at + 121);
    c.act("naloxone", { dose: "small" });
    at = lastDose(c);
  }
  return at;
}
// Reassess every 15 minutes until the end, with another small dose if he
// drifts back to POSS 3 or worse.
function watch(c: Ctl, from: number): void {
  let last = from;
  for (let k = 1; k <= 6 && c.run.state.ended === null; k++) {
    upTo(c, from + 900 * k);
    if (c.run.state.ended !== null) return;
    c.act("reassess");
    if ((c.value("poss") as number) >= 3 && c.run.state.tick >= last + 120) {
      c.act("naloxone", { dose: "small" });
      last = lastDose(c);
    }
  }
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: rouse, pause the PCA, take the button, airway, full count, naloxone 0.1 mg twice, capnography, SBAR to change the plan, reassessed every 15 minutes with a third dose when he drifts",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 5);
          c.act("rouse");
          c.act("stopPca");
          c.act("button");
          c.act("airway");
          c.act("naloxone", { dose: "small" });
          const first = lastDose(c);
          count(c);
          upTo(c, first + 121);
          c.act("naloxone", { dose: "small" });
          const at = lastDose(c);
          c.act("capno");
          c.act("call", GOOD);
          c.act("note", { kind: "obj" });
          watch(c, at);
          toEnd(c);
        },
      },
      {
        id: "oxygenFirst",
        title: "Turns the oxygen up and counts before pausing the PCA five minutes in; then titrated naloxone, capnography, a clear SBAR and a 30-minute reassessment",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 10);
          c.act("o2up");
          c.act("rouse");
          count(c);
          upTo(c, 300);
          c.act("stopPca");
          c.act("airway");
          const at = smallDoses(c, 2);
          c.act("capno");
          c.act("call", GOOD);
          c.act("button");
          c.act("note", { kind: "obj" });
          watch(c, at);
          toEnd(c);
        },
      },
      {
        id: "fullPush",
        title: "Fast stop, then 0.4 mg undiluted at once: an abrupt reversal; the rest done well",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 5);
          c.act("rouse");
          c.act("stopPca");
          c.act("button");
          c.act("airway");
          c.act("naloxone", { dose: "big" });
          const at = lastDose(c);
          c.act("capno");
          c.act("call", GOOD);
          count(c);
          c.act("note", { kind: "obj" });
          watch(c, at);
          toEnd(c);
        },
      },
      {
        id: "rrtRescue",
        title: "Rouses him and calls the rapid response team, who pause the PCA and give the naloxone; no airway or count of his own, and a vague call to the resident",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 30);
          c.act("rouse");
          c.act("rrt");
          upTo(c, c.run.state.tick + 310);
          c.act("capno");
          c.act("call", VAGUE);
          c.act("button");
          watch(c, c.run.state.tick);
          toEnd(c);
        },
      },
      {
        id: "restartLeave",
        title: "Failure: stops and reverses well, then restarts the PCA once he is awake and leaves until 04:00",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 5);
          c.act("rouse");
          c.act("stopPca");
          c.act("airway");
          smallDoses(c, 2);
          upTo(c, c.run.state.tick + 300);
          c.act("restart");
          c.act("leave");
          c.act("note", { kind: "opinion" });
          toEnd(c);
        },
      },
      {
        id: "pauseOnly",
        title: "Failure: rouses him and pauses the PCA, then waits for the hydromorphone to wear off: no naloxone, no capnography, nobody called",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 20);
          c.act("rouse");
          c.act("stopPca");
          c.act("o2up");
          count(c);
          c.act("note", { kind: "opinion" });
          toEnd(c);
        },
      },
    ],
  };
}
