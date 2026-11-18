// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// ADNRN/pain-better-then-belly-rigid. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps adn-appy
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ADNRN", slug: "pain-better-then-belly-rigid" };

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
        title: "Expert at study pace: abdomen and temperature, calls, cultures and lactate, comfort and NPO, output, explains and documents",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "abdomen");
          test(c, "temp");
          act(c, "diagnose", { dx: "perf" });
          act(c, "refer", { how: "call" });
          test(c, "labs");
          act(c, "fowler");
          test(c, "output");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Finds it and screens, but calls 8 minutes after the rigid abdomen",
        reasoning: "partial",
        drive: (c) => {
          test(c, "abdomen");
          test(c, "temp");
          test(c, "labs");
          act(c, "fowler");
          test(c, "output");
          upTo(c, 120);
          act(c, "diagnose", { dx: "perf" });
          act(c, "refer", { how: "call" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "heated",
        title: "Calls promptly but brings the heating pad and skips the sepsis labs",
        reasoning: "partial",
        drive: (c) => {
          test(c, "abdomen");
          act(c, "heat");
          act(c, "diagnose", { dx: "perf" });
          act(c, "refer", { how: "call" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "better",
        title: "Failure: thinks it is settling, brings heat and leaves it for the 08:00 case",
        reasoning: "missed",
        drive: (c) => {
          test(c, "abdomen");
          act(c, "diagnose", { dx: "better" });
          act(c, "heat");
          act(c, "refer", { how: "or" });
          toEnd(c);
        },
      },
      {
        id: "const",
        title: "Failure: calls it constipation and asks for a laxative",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "const" });
          act(c, "laxative");
          toEnd(c);
        },
      },
    ],
  };
}
