// REQ-325 (nursing depth, round 3): golden paths for
// CCRNADULT/tibial-fracture-pain-out-of-proportion. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps ccrn-compartment
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CCRNADULT", slug: "tibial-fracture-pain-out-of-proportion" };

const ended = (c: Ctl): boolean => c.run.state.ended !== null;
const upTo = (c: Ctl, tick: number): void => until(c, (x) => x.run.state.tick >= tick || ended(x));
const toEnd = (c: Ctl): void => until(c, (x) => ended(x), 20000);
function act(c: Ctl, a: string, p?: Record<string, string>): void {
  if (ended(c)) return;
  c.act(a, p);
  c.answer();
  teach(c);
}
function test(c: Ctl, a: string): void {
  act(c, a);
  until(c, (x) => x.value("testPending") === false || ended(x));
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: passive stretch and compartments; wrap split, leg level, pressure supported; compartment syndrome; orthopedics now; documented",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "stretch");
          test(c, "palpate");
          act(c, "wrap");
          act(c, "level");
          act(c, "map");
          act(c, "diagnose", { dx: "acs" });
          act(c, "refer", { how: "ortho" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Reviews pain scores and checks pulses first, does everything right but calls orthopedics 6 minutes after the stretch pain",
        reasoning: "partial",
        drive: (c) => {
          test(c, "pain");
          test(c, "neuro");
          test(c, "stretch");
          test(c, "palpate");
          act(c, "wrap");
          act(c, "level");
          act(c, "map");
          act(c, "diagnose", { dx: "acs" });
          upTo(c, 115);
          act(c, "refer", { how: "ortho" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "moreOpioid",
        title: "Calls orthopedics at once but gives another opioid dose before supporting the pressure, and never feels the compartments",
        reasoning: "partial",
        drive: (c) => {
          test(c, "stretch");
          act(c, "refer", { how: "ortho" });
          act(c, "opioid");
          act(c, "wrap");
          act(c, "level");
          act(c, "map");
          act(c, "diagnose", { dx: "acs" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "fracturePain",
        title: "Failure: calls it fracture pain, gives more opioid and leaves it for the morning pre-op check",
        reasoning: "missed",
        drive: (c) => {
          test(c, "pain");
          act(c, "diagnose", { dx: "fracture" });
          act(c, "opioid");
          act(c, "refer", { how: "morning" });
          toEnd(c);
        },
      },
      {
        id: "pulsesPresent",
        title: "Failure: finds pulses present, calls it a DVT and leaves the wrap and pillows",
        reasoning: "missed",
        drive: (c) => {
          test(c, "neuro");
          act(c, "diagnose", { dx: "dvt" });
          toEnd(c);
        },
      },
    ],
  };
}
