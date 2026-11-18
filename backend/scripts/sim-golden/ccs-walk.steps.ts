// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// ABPTSCCS/walk-test-saturation-eighty-three. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps ccs-walk
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSCCS", slug: "walk-test-saturation-eighty-three" };

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
        title: "Expert at study pace: screens, walks, stops at 83%, titrates oxygen, calls the pulmonologist, records and teaches",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "screen");
          test(c, "walk");
          act(c, "stop");
          act(c, "o2");
          act(c, "diagnose", { dx: "desat" });
          act(c, "refer", { how: "md" });
          test(c, "borg");
          test(c, "dist");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Stops and titrates at once but calls the pulmonologist 8 minutes later",
        reasoning: "partial",
        drive: (c) => {
          test(c, "screen");
          test(c, "walk");
          act(c, "stop");
          act(c, "o2");
          test(c, "borg");
          test(c, "dist");
          upTo(c, 140);
          act(c, "diagnose", { dx: "desat" });
          act(c, "refer", { how: "md" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "highO2",
        title: "Stops and calls promptly, but puts him on high-flow oxygen to 100%",
        reasoning: "partial",
        drive: (c) => {
          test(c, "screen");
          test(c, "walk");
          act(c, "stop");
          act(c, "o2high");
          act(c, "diagnose", { dx: "desat" });
          act(c, "refer", { how: "md" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "pushed",
        title: "Failure: calls it normal for COPD, pushes him to finish and writes a note",
        reasoning: "missed",
        drive: (c) => {
          test(c, "screen");
          test(c, "walk");
          act(c, "diagnose", { dx: "normal" });
          act(c, "push");
          act(c, "refer", { how: "note" });
          toEnd(c);
        },
      },
      {
        id: "artifact",
        title: "Failure: blames the probe and pushes on",
        reasoning: "missed",
        drive: (c) => {
          test(c, "screen");
          test(c, "walk");
          act(c, "diagnose", { dx: "probe" });
          act(c, "push");
          toEnd(c);
        },
      },
    ],
  };
}
