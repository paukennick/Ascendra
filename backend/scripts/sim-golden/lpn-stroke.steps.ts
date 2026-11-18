// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// LPNVN/breakfast-tray-droop-last-seen-well. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps lpn-stroke
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "LPNVN", slug: "breakfast-tray-droop-last-seen-well" };

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
        title: "Expert at study pace: F.A.S.T., NPO, last known well, 911 and the RN, vitals and glucose, medication list, document",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "fast");
          act(c, "npo");
          test(c, "lkw");
          act(c, "diagnose", { dx: "stroke" });
          act(c, "refer", { how: "ems" });
          test(c, "vitals");
          test(c, "meds");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Recognizes it and keeps him NPO, but calls 911 8 minutes later",
        reasoning: "partial",
        drive: (c) => {
          test(c, "fast");
          act(c, "npo");
          test(c, "lkw");
          test(c, "vitals");
          test(c, "meds");
          upTo(c, 120);
          act(c, "diagnose", { dx: "stroke" });
          act(c, "refer", { how: "ems" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "pills",
        title: "Calls 911 promptly but gives his pills first and never finds the last-known-well time",
        reasoning: "partial",
        drive: (c) => {
          test(c, "fast");
          act(c, "pills");
          act(c, "diagnose", { dx: "stroke" });
          act(c, "refer", { how: "ems" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "tired",
        title: "Failure: thinks he is tired, puts him to bed and leaves a message for rounds",
        reasoning: "missed",
        drive: (c) => {
          test(c, "fast");
          act(c, "diagnose", { dx: "tired" });
          act(c, "nap");
          act(c, "refer", { how: "provider" });
          toEnd(c);
        },
      },
      {
        id: "sugar",
        title: "Failure: blames his sugar and gives his pills",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "sugar" });
          act(c, "pills");
          toEnd(c);
        },
      },
    ],
  };
}
