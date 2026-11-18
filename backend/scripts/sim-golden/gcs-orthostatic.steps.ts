// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// ABPTSGCS/dizzy-on-standing-new-tamsulosin. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps gcs-orthostatic
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSGCS", slug: "dizzy-on-standing-new-tamsulosin" };

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
        title: "Expert at study pace: supine then standing, calls, medicines and falls, teaches, seated work",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "supine");
          upTo(c, 70);
          test(c, "stand");
          act(c, "diagnose", { dx: "oh" });
          act(c, "refer", { how: "md" });
          test(c, "meds");
          test(c, "falls");
          act(c, "teach");
          act(c, "sitstand");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Measures and adapts, but calls 8 minutes later",
        reasoning: "partial",
        drive: (c) => {
          test(c, "supine");
          upTo(c, 70);
          test(c, "stand");
          act(c, "teach");
          test(c, "meds");
          test(c, "falls");
          upTo(c, 190);
          act(c, "diagnose", { dx: "oh" });
          act(c, "refer", { how: "md" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "walked",
        title: "Measures and calls, then walks him briskly anyway",
        reasoning: "partial",
        drive: (c) => {
          test(c, "supine");
          upTo(c, 70);
          test(c, "stand");
          act(c, "diagnose", { dx: "oh" });
          act(c, "refer", { how: "md" });
          act(c, "walk");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "weak",
        title: "Failure: skips the measurement, calls it weakness and starts brisk walking",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "weak" });
          act(c, "walk");
          act(c, "refer", { how: "note" });
          toEnd(c);
        },
      },
      {
        id: "bppv",
        title: "Failure: calls it BPPV and walks him",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "vertigo" });
          act(c, "walk");
          toEnd(c);
        },
      },
    ],
  };
}
