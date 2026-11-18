// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// ABPTSSCS/runner-groin-pain-hop-test. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps scs-stressfx
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSSCS", slug: "runner-groin-pain-hop-test" };

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
        title: "Expert at study pace: history, gentle exam, crutches, calls the team physician, gait, explains",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "hx");
          test(c, "fulcrum");
          act(c, "nwb");
          act(c, "diagnose", { dx: "fns" });
          act(c, "refer", { how: "doc" });
          test(c, "gait");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Protects her at once but calls the physician 8 minutes after the exam",
        reasoning: "partial",
        drive: (c) => {
          test(c, "hx");
          test(c, "fulcrum");
          act(c, "nwb");
          test(c, "gait");
          upTo(c, 120);
          act(c, "diagnose", { dx: "fns" });
          act(c, "refer", { how: "doc" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "hopped",
        title: "Hop-tests her to confirm, then calls, skipping the triad history",
        reasoning: "partial",
        drive: (c) => {
          test(c, "fulcrum");
          act(c, "hop");
          act(c, "nwb");
          act(c, "diagnose", { dx: "fns" });
          act(c, "refer", { how: "doc" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "strain",
        title: "Failure: treats a strain, clears her to race and sends a note",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "strain" });
          act(c, "strain");
          act(c, "refer", { how: "at" });
          toEnd(c);
        },
      },
      {
        id: "fai",
        title: "Failure: calls it impingement and hop-tests",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "fai" });
          act(c, "hop");
          toEnd(c);
        },
      },
    ],
  };
}
