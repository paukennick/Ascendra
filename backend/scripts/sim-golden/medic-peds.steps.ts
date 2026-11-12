// REQ-241 (bedside wave 2, EMS): golden paths for
// NREMTPARAMEDIC/infant-respiratory-failure. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps medic-peds
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach } from "./s2b-helpers.ts";
import { act, at, toEnd, v, when } from "./ems-helpers.ts";

export const ENTRY = { course: "NREMTPARAMEDIC", slug: "infant-respiratory-failure" };

function go(c: Ctl, notify = true): void {
  act(c, "transport");
  teach(c);
  if (notify) act(c, "notify");
  toEnd(c);
}
function opening(c: Ctl): void {
  act(c, "look");
  act(c, "monitor");
  act(c, "suction");
  act(c, "nrb");
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: assessment triangle, suction, oxygen, recognizes exhaustion, BVM at 20-30/min before apnea, no tube, transport",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          opening(c);
          at(c, 45);
          act(c, "look");
          act(c, "bvm", { rate: "right" });
          at(c, 90);
          go(c);
        },
      },
      {
        id: "nebThenApnea",
        title: "Suction skipped and nebulized epinephrine first; she stops breathing, her heart rate falls below 60, compressions and BVM bring her back",
        reasoning: "partial",
        drive: (c) => {
          act(c, "look");
          act(c, "monitor");
          act(c, "nrb");
          act(c, "nebEpi");
          teach(c);
          when(c, (x) => v(x, "apneaAt") !== null);
          when(c, (x) => (v(x, "hr") as number) < 60);
          act(c, "cpr");
          act(c, "bvm", { rate: "right" });
          when(c, (x) => (v(x, "spo2") as number) >= 85);
          act(c, "stopCpr");
          go(c);
        },
      },
      {
        id: "slowBagging",
        title: "Recognizes failure in time but bags at the adult rate of 12 a minute",
        reasoning: "partial",
        drive: (c) => {
          opening(c);
          at(c, 60);
          act(c, "bvm", { rate: "slow" });
          at(c, 120);
          go(c);
        },
      },
      {
        id: "fastBagging",
        title: "Bags as fast as possible to chase the saturation: the stomach fills",
        reasoning: "partial",
        drive: (c) => {
          opening(c);
          at(c, 60);
          act(c, "bvm", { rate: "fast" });
          at(c, 120);
          go(c);
        },
      },
      {
        id: "tubeAttempt",
        title: "Good BVM, then albuterol, a steroid and an intubation attempt that costs oxygen",
        reasoning: "partial",
        drive: (c) => {
          opening(c);
          act(c, "albuterol");
          act(c, "dexamethasone");
          at(c, 60);
          act(c, "bvm", { rate: "right" });
          at(c, 150);
          act(c, "intubate");
          when(c, (x) => v(x, "attempting") === false);
          go(c, false);
        },
      },
      {
        id: "noBvm",
        title: "Failure: albuterol and watching; the slowing breaths are read as improvement; she stops breathing and arrests",
        reasoning: "missed",
        drive: (c) => {
          act(c, "look");
          act(c, "monitor");
          act(c, "albuterol");
          toEnd(c);
        },
      },
    ],
  };
}
