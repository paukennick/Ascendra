// REQ-323 (health depth, round 2): golden paths for
// CEN/black-stools-then-hematemesis. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps cen-gibleed
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CEN", slug: "black-stools-then-hematemesis" };

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
        title: "Expert at study pace: access and crossmatch, on his side, history; at the hematemesis the physician now, crystalloid, blood as it comes up; hand-off",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          act(c, "access");
          act(c, "side");
          test(c, "hx");
          upTo(c, 97);
          act(c, "cryst");
          act(c, "diagnose", { dx: "active" });
          act(c, "refer", { how: "md" });
          act(c, "cryst");
          upTo(c, 122);
          act(c, "blood");
          upTo(c, 160);
          act(c, "blood");
          upTo(c, 200);
          act(c, "blood");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateAccess",
        title: "History and orthostatic vital signs first; access and the crossmatch at 7 minutes, so blood comes later",
        reasoning: "partial",
        drive: (c) => {
          test(c, "hx");
          test(c, "ortho");
          upTo(c, 80);
          act(c, "access");
          act(c, "side");
          upTo(c, 97);
          act(c, "refer", { how: "md" });
          act(c, "cryst");
          act(c, "cryst");
          act(c, "diagnose", { dx: "active" });
          upTo(c, 202);
          act(c, "blood");
          act(c, "blood");
          upTo(c, 240);
          act(c, "blood");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "noBlood",
        title: "Failure: access, airway and an early call, but crystalloid only and no blood",
        reasoning: "partial",
        drive: (c) => {
          act(c, "access");
          act(c, "side");
          upTo(c, 97);
          act(c, "refer", { how: "md" });
          act(c, "cryst");
          act(c, "cryst");
          toEnd(c);
        },
      },
      {
        id: "aboveThreshold",
        title: "Failure: reads the hemoglobin of 9.4 as above threshold and reports him as stable",
        reasoning: "missed",
        drive: (c) => {
          act(c, "access");
          act(c, "side");
          test(c, "hgb");
          act(c, "diagnose", { dx: "threshold" });
          upTo(c, 97);
          act(c, "refer", { how: "later" });
          act(c, "cryst");
          toEnd(c);
        },
      },
      {
        id: "flatOnBack",
        title: "Failure: lays him flat for the dizziness; he vomits blood on his back",
        reasoning: "missed",
        drive: (c) => {
          act(c, "flat");
          test(c, "hx");
          test(c, "ortho");
          toEnd(c);
        },
      },
    ],
  };
}
