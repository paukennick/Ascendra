// REQ-277 (nursing specialty bedside sims): golden paths for
// PCCN/copd-exacerbation-niv. The expectations are the engine's own results,
// re-checked by every `npm test` (lint + documents).
//
//   npm run sim:golden -- steps pccn-copd
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "PCCN", slug: "copd-exacerbation-niv" };

const GOOD = { sit: "hcrf", bg: "full", asmt: "hcrf", rec: "niv" };
const VAGUE = { sit: "sleepy", bg: "min", asmt: "tired", rec: "watch" };

const at = (c: Ctl, tick: number): void => until(c, (x) => x.run.state.tick >= tick || x.run.state.ended !== null);
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
const waitFor = (c: Ctl, name: string): void =>
  until(c, (x) => {
    teach(x);
    return x.value(name) === true || x.value(name) !== null && x.value(name) !== false || x.run.state.ended !== null;
  });
// An hour or more into NIV, then a gas.
function recheck(c: Ctl): void {
  const start = c.value("nivAt") as number;
  at(c, start + 3600);
  if (c.run.state.ended === null) c.act("abg");
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: assess, 28% Venturi, SBAR for NIV, nebulizer, plan agreed, NIV at 15 with the leak fixed, IPAP 20 at 5 minutes, gas at an hour, objective note",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          at(c, 10);
          c.act("look");
          c.act("oxygen", { dev: "v28" });
          c.act("call", GOOD);
          at(c, 60);
          c.act("neb");
          teach(c);
          at(c, 240);
          c.act("plan");
          teach(c);
          waitFor(c, "rtHere");
          c.act("startNiv", { ip: "15" });
          c.act("fitCheck");
          at(c, (c.value("nivAt") as number) + 300);
          c.act("titrate");
          recheck(c);
          at(c, c.run.state.tick + 60);
          c.act("note", { kind: "obj" });
          toEnd(c);
        },
      },
      {
        id: "slowStart",
        title: "Oxygen left at 4 L for 15 minutes and a vague first call, then the right SBAR at 16 minutes; plan after NIV starts; IPAP 20 at 20 minutes; a second gas when the first is still acidotic",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 60);
          c.act("look");
          c.act("call", VAGUE);
          c.act("abg");
          upTo(c, 900);
          c.act("oxygen", { dev: "v28" });
          upTo(c, 960);
          c.act("call", GOOD);
          waitFor(c, "rtHere");
          c.act("startNiv", { ip: "15" });
          c.act("plan");
          c.act("fitCheck");
          upTo(c, (c.value("nivAt") as number) + 1200);
          c.act("titrate");
          recheck(c);
          upTo(c, (c.value("nivAt") as number) + 5400);
          if (c.run.state.ended === null) c.act("abg");
          toEnd(c);
        },
      },
      {
        id: "lowPressure",
        title: "Fast oxygen and call, but NIV left at IPAP 10 with an unchecked leak; outreach called when she gets drowsier",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 10);
          c.act("look");
          c.act("oxygen", { dev: "v28" });
          c.act("call", GOOD);
          waitFor(c, "ordersAt");
          c.act("plan");
          waitFor(c, "rtHere");
          c.act("look"); // FAIL-1500: one command first so the linter samples startNiv as available
          c.act("startNiv", { ip: "10" });
          c.act("abg");
          upTo(c, 5400);
          c.act("outreach");
          c.act("note", { kind: "opinion" });
          toEnd(c);
        },
      },
      {
        id: "maskOff",
        title: "Everything on time, then the mask comes off for an hour so she can sleep; back on, a gas at an hour that is still acidotic and a second half an hour later",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 10);
          c.act("look");
          c.act("oxygen", { dev: "v28" });
          c.act("call", GOOD);
          waitFor(c, "ordersAt");
          c.act("plan");
          waitFor(c, "rtHere");
          c.act("startNiv", { ip: "15" });
          c.act("fitCheck");
          c.act("titrate");
          upTo(c, c.run.state.tick + 600);
          c.act("maskOff");
          upTo(c, c.run.state.tick + 1800);
          c.act("maskOn");
          recheck(c);
          upTo(c, c.run.state.tick + 1800);
          if (c.run.state.ended === null) c.act("abg");
          toEnd(c);
        },
      },
      {
        id: "moreOxygen",
        title: "Failure: oxygen turned up to a non-rebreather for her drowsiness and a call to let her sleep",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 120);
          c.act("oxygen", { dev: "nrb" });
          c.act("call", VAGUE);
          c.act("neb");
          toEnd(c);
        },
      },
    ],
  };
}
