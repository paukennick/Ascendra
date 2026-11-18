// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// ABPTSSCS/header-collision-wants-back-in. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps scs-concussion
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSSCS", slug: "header-collision-wants-back-in" };

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
        title: "Expert at study pace: screen, out for the day, neck, recheck, 911, explains clearance",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "sym");
          act(c, "bench");
          test(c, "neck");
          upTo(c, 160);
          test(c, "recheck");
          act(c, "diagnose", { dx: "danger" });
          act(c, "refer", { how: "ems" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "late911",
        title: "Benches and rechecks, but calls 911 8 minutes after the danger signs",
        reasoning: "partial",
        drive: (c) => {
          test(c, "sym");
          act(c, "bench");
          test(c, "neck");
          upTo(c, 160);
          test(c, "recheck");
          upTo(c, 270);
          act(c, "diagnose", { dx: "danger" });
          act(c, "refer", { how: "ems" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "locker",
        title: "Sends her to the locker room alone, then rechecks and calls 911",
        reasoning: "partial",
        drive: (c) => {
          test(c, "sym");
          act(c, "alone");
          upTo(c, 160);
          test(c, "recheck");
          act(c, "diagnose", { dx: "danger" });
          act(c, "refer", { how: "ems" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "backIn",
        title: "Failure: calls it a knock, lets her play the second half and calls her parents",
        reasoning: "missed",
        drive: (c) => {
          test(c, "sym");
          act(c, "diagnose", { dx: "fine" });
          act(c, "play");
          act(c, "refer", { how: "parents" });
          toEnd(c);
        },
      },
      {
        id: "heat",
        title: "Failure: blames the heat and sends her to the locker room",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "dehyd" });
          act(c, "alone");
          toEnd(c);
        },
      },
    ],
  };
}
