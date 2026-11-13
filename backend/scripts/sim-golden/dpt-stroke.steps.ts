// REQ-232: golden paths for DPT/stroke-balance-fall-risk (the PT treatment
// session). No prototype exists, so the expectations are the engine's own
// results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps dpt-stroke
import type { Ctl, StepsSpec } from "./steps.ts";
import { at, chapters, pace, teach, until, v } from "./s2b-helpers.ts";

export const ENTRY = { course: "DPT", slug: "stroke-balance-fall-risk" };

// Past the written plan (it opens 30 s in and stops the clock).
function planned(c: Ctl): void {
  until(c, (x) => x.run.state.tick >= 7);
}

// Start a test and skip to its result, answering any teaching prompt on the way.
function test(c: Ctl, action: string, timer: string): void {
  c.act(action);
  teach(c);
  c.skip(timer);
}

const HIGH_CPG = { risk: "high", home: "cpg" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert path at study pace: gait belt, orthostatic vitals first and a same-visit call to his physician, TUG, 10 meter walk and Berg, high risk, guarded walking training set by RPE, guideline home program",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          at(c, 2);
          c.act("belt");
          planned(c);
          test(c, "orthoTest", "orthoT");
          c.act("callMd");
          test(c, "tug", "tugT");
          test(c, "tenMwt", "tenT");
          test(c, "berg", "bergT");
          c.act("decide", HIGH_CPG);
          c.act("standPrepared");
          c.act("walk");
          chapters(c);
          c.wait(60);
          c.act("walkTrain", { basis: "rpe" });
          c.wait(60);
          c.act("askRpe");
          c.wait(120);
          c.act("sit");
          c.wait(30);
          c.act("endSession");
        },
      },
      {
        id: "slowSafe",
        title: "Gait belt, TUG and 10 meter walk, no orthostatic vitals; stands him up after a long sit, sits him down within 25 s when he is light-headed, but never calls his physician; own-pace walking only",
        reasoning: "partial",
        drive: (c) => {
          at(c, 2);
          c.act("belt");
          planned(c);
          test(c, "tug", "tugT");
          test(c, "tenMwt", "tenT");
          c.act("decide", HIGH_CPG);
          c.wait(150);
          c.act("stand");
          until(c, (x) => v(x, "presyncope") === true);
          c.wait(20);
          c.act("sit");
          c.wait(30);
          c.act("standPrepared");
          c.act("walk");
          chapters(c);
          c.wait(60);
          c.act("askRpe");
          c.wait(60);
          c.act("sit");
          c.act("endSession");
        },
      },
      {
        id: "hrChaser",
        title: "Orthostatic vitals and the call done; walking intensity chased by heart rate on metoprolol, a stumble caught by the belt; then static balance on foam",
        reasoning: "partial",
        drive: (c) => {
          at(c, 2);
          c.act("belt");
          planned(c);
          test(c, "orthoTest", "orthoT");
          c.act("callMd");
          test(c, "tenMwt", "tenT");
          test(c, "tug", "tugT");
          c.act("decide", HIGH_CPG);
          c.act("standPrepared");
          c.act("walkTrain", { basis: "hr" });
          chapters(c);
          c.act("askRpe");
          until(c, (x) => (v(x, "nearFalls") as number) > 0);
          c.act("foam");
          c.wait(120);
          c.act("sit");
          c.act("endSession");
        },
      },
      {
        id: "unguardedFall",
        title: "No gait belt, no tests; stands him up after sitting and lets him stand there light-headed",
        reasoning: "missed",
        drive: (c) => {
          at(c, 2);
          planned(c);
          c.wait(150);
          c.act("stand");
          until(c, (x) => x.run.state.ended !== null, 5000);
        },
      },
      {
        id: "testsOnly",
        title: "Gait belt, orthostatic vitals and the call, then the Berg, FGA and ABC Scale; a good home program but no walking training today",
        reasoning: "partial",
        drive: (c) => {
          at(c, 2);
          c.act("belt");
          planned(c);
          test(c, "orthoTest", "orthoT");
          c.act("callMd");
          test(c, "berg", "bergT");
          test(c, "fga", "fgaT");
          test(c, "abc", "abcT");
          c.act("decide", HIGH_CPG);
          c.act("endSession");
        },
      },
      {
        id: "lowRisk",
        title: "Gait belt and a TUG only; calls his fall risk low with a static home program; stands him up after a long sit and waits until his knees buckle",
        reasoning: "missed",
        drive: (c) => {
          at(c, 2);
          c.act("belt");
          planned(c);
          test(c, "tug", "tugT");
          c.act("decide", { risk: "low", home: "static" });
          c.wait(150);
          c.act("stand");
          until(c, (x) => (v(x, "nearFalls") as number) > 0);
          c.wait(10);
          c.act("endSession");
        },
      },
    ],
  };
}
