// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// CCRNNEO/cpap-baby-sudden-desaturation. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps neo-ptx
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CCRNNEO", slug: "cpap-baby-sudden-desaturation" };

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
        title: "Expert at study pace: prongs and chest, transilluminates, oxygen up, kit open, calls, checks the heart, tells the parents",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "look");
          test(c, "trans");
          act(c, "o2");
          act(c, "kit");
          act(c, "diagnose", { dx: "ptx" });
          act(c, "refer", { how: "call" });
          test(c, "apical");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Finds it and sets up, but suctions and listens before calling 6 minutes after the transillumination",
        reasoning: "partial",
        drive: (c) => {
          test(c, "trans");
          act(c, "o2");
          act(c, "kit");
          test(c, "look");
          test(c, "suction");
          test(c, "apical");
          upTo(c, 85);
          act(c, "diagnose", { dx: "ptx" });
          act(c, "refer", { how: "call" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "pressure",
        title: "Transilluminates and calls at once, but raises the CPAP pressure and never opens the kit",
        reasoning: "partial",
        drive: (c) => {
          test(c, "trans");
          act(c, "pressure");
          act(c, "diagnose", { dx: "ptx" });
          act(c, "refer", { how: "call" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "rds",
        title: "Failure: reads it as worsening RDS, raises the pressure and asks for a film later",
        reasoning: "missed",
        drive: (c) => {
          test(c, "look");
          act(c, "diagnose", { dx: "rds" });
          act(c, "pressure");
          act(c, "refer", { how: "film" });
          toEnd(c);
        },
      },
      {
        id: "plug",
        title: "Failure: suctions and waits for the morning film",
        reasoning: "missed",
        drive: (c) => {
          test(c, "suction");
          act(c, "diagnose", { dx: "plug" });
          act(c, "xrayWait");
          toEnd(c);
        },
      },
    ],
  };
}
