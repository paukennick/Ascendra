// REQ-241 (bedside wave 2, EMS): golden paths for
// NREMTAEMT/hypoglycemia-iv-dextrose. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps aemt-hypo
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach } from "./s2b-helpers.ts";
import { act, at, ended, toEnd, v, when } from "./ems-helpers.ts";

export const ENTRY = { course: "NREMTAEMT", slug: "hypoglycemia-iv-dextrose" };

function glucose(c: Ctl): void {
  act(c, "glucose");
  teach(c);
  when(c, (x) => v(x, "gluPending") === false);
}
function iv(c: Ctl): void {
  act(c, "iv");
  teach(c);
  when(c, (x) => v(x, "ivOn") === true);
}
function dose(c: Ctl, amount: string): void {
  act(c, "d10", { amount });
  when(c, (x) => v(x, "dexLeft") === 0);
}
function awake(c: Ctl): void {
  when(c, (x) => (v(x, "gcsNow") as number) >= 15);
}
function leave(c: Ctl, talk: string | null): void {
  if (talk && !ended(c)) {
    act(c, "talk");
    c.choose(talk);
  }
  if (talk === "release") return toEnd(c);
  act(c, "transport");
  teach(c);
  act(c, "notify");
  toEnd(c);
}
function opening(c: Ctl): void {
  act(c, "look");
  act(c, "airway");
  act(c, "oxygen");
  act(c, "monitor");
  glucose(c);
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: airway first, glucose, IV, D10 10 g, recheck, another 10 g, awake, an informed conversation, transport",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          opening(c);
          iv(c);
          dose(c, "ten");
          at(c, c.run.state.tick + 30);
          glucose(c);
          dose(c, "ten");
          awake(c);
          glucose(c);
          leave(c, "discuss");
        },
      },
      {
        id: "bigBolus",
        title: "Airway and glucose right, but the whole 25 g at once and glucagon on top: overshoot",
        reasoning: "partial",
        drive: (c) => {
          opening(c);
          iv(c);
          act(c, "d10", { amount: "all" });
          act(c, "glucagon");
          awake(c);
          glucose(c);
          at(c, c.run.state.tick + 300);
          leave(c, "discuss");
        },
      },
      {
        id: "naloxoneFirst",
        title: "Treats the beer can and gives naloxone first; glucose at 4 minutes, then D10 in steps; transported without talking it through",
        reasoning: "partial",
        drive: (c) => {
          act(c, "look");
          act(c, "airway");
          act(c, "naloxone");
          at(c, 240);
          glucose(c);
          iv(c);
          dose(c, "ten");
          glucose(c);
          dose(c, "ten");
          awake(c);
          leave(c, null);
        },
      },
      {
        id: "released",
        title: "Failure: excellent treatment, then a refusal accepted with insulin still acting and nobody to stay with him",
        reasoning: "missed",
        drive: (c) => {
          opening(c);
          iv(c);
          dose(c, "ten");
          glucose(c);
          dose(c, "ten");
          awake(c);
          glucose(c);
          leave(c, "release");
        },
      },
      {
        id: "oralGel",
        title: "Failure: no airway adjunct and oral glucose gel for a man who cannot swallow",
        reasoning: "missed",
        drive: (c) => {
          act(c, "look");
          glucose(c);
          act(c, "oralGlucose");
          toEnd(c);
        },
      },
      {
        id: "seizure",
        title: "Failure: airway and oxygen, but no glucose check while waiting for naloxone to work; he seizes",
        reasoning: "missed",
        drive: (c) => {
          act(c, "look");
          act(c, "airway");
          act(c, "oxygen");
          act(c, "naloxone");
          at(c, 200);
          iv(c);
          toEnd(c);
        },
      },
    ],
  };
}
