// REQ-240 (bedside wave 2): golden paths for ADNRN/heart-failure-pulmonary-edema.
// No prototype exists, so the expectations are the engine's own results,
// re-checked by every `npm test` (lint + documents).
//
//   npm run sim:golden -- steps adn-hf
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ADNRN", slug: "heart-failure-pulmonary-edema" };

const GOOD = { sit: "hf", bg: "full", asmt: "edema", rec: "diurese" };
const VAGUE = { sit: "sob", bg: "min", asmt: "pneumonia", rec: "abx" };
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
const ordered = (c: Ctl): void =>
  until(c, (x) => {
    teach(x);
    return x.value("ordersAt") !== null || x.run.state.ended !== null;
  });
function furoThenUrine(c: Ctl): void {
  ordered(c);
  c.act("furosemide");
  upTo(c, c.run.state.tick + 2760);
  if (c.run.state.ended === null) c.act("urine");
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: look and listen, sit up, oxygen to 4 L, saline off, weight, intake/output, potassium, SBAR naming pulmonary edema, furosemide on the order, urine output measured at 46 minutes",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 5);
          c.act("look");
          c.act("sitUp");
          c.act("oxygen", { dev: "nc4" });
          c.act("stopFluids");
          c.act("weight");
          c.act("io");
          c.act("labs");
          c.act("call", GOOD);
          ordered(c);
          c.act("note", { kind: "obj" });
          furoThenUrine(c);
          toEnd(c);
        },
      },
      {
        id: "slowCall",
        title: "Sits her up and raises the oxygen at 6 minutes, saline off at 12, a call about the pneumonia first and a clear SBAR at 20 minutes",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 360);
          c.act("look");
          c.act("sitUp");
          c.act("oxygen", { dev: "nc6" });
          c.act("call", VAGUE);
          upTo(c, 720);
          c.act("stopFluids");
          c.act("labs");
          upTo(c, 1200);
          c.act("call", GOOD);
          c.act("note", { kind: "obj" });
          furoThenUrine(c);
          toEnd(c);
        },
      },
      {
        id: "teamCalls",
        title: "Upright, a non-rebreather and the saline off, then the rapid response team instead of a call; the team's nurse calls the provider",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 20);
          c.act("look");
          c.act("sitUp");
          c.act("oxygen", { dev: "nrb" });
          c.act("stopFluids");
          c.act("weight");
          c.act("rrt");
          furoThenUrine(c);
          c.act("labs");
          c.act("note", { kind: "obj" });
          toEnd(c);
        },
      },
      {
        id: "noCheck",
        title: "Fast and complete treatment, but neither the potassium nor the urine output is checked",
        reasoning: "partial",
        drive: (c) => {
          upTo(c, 5);
          c.act("look");
          c.act("sitUp");
          c.act("oxygen", { dev: "nc4" });
          c.act("stopFluids");
          c.act("call", GOOD);
          ordered(c);
          c.act("furosemide");
          c.act("note", { kind: "obj" });
          toEnd(c);
        },
      },
      {
        id: "pneumoniaOnly",
        title: "Failure: upright, more oxygen and the saline off, but the call is about the pneumonia and no diuretic ever comes",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 30);
          c.act("look");
          c.act("sitUp");
          c.act("oxygen", { dev: "nc4" });
          c.act("stopFluids");
          c.act("call", VAGUE);
          c.act("note", { kind: "opinion" });
          toEnd(c);
        },
      },
      {
        id: "bolusSedate",
        title: "Failure: no examination, lorazepam for the panic and a saline bolus for the urine output",
        reasoning: "missed",
        drive: (c) => {
          upTo(c, 60);
          c.act("lorazepam");
          c.act("io");
          c.act("bolus");
          toEnd(c);
        },
      },
    ],
  };
}
