// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// ABPTSOCS/neck-pain-headache-after-adjustment. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps ocs-vad
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSOCS", slug: "neck-pain-headache-after-adjustment" };

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
        title: "Expert at study pace: history, neuro screen, emergency department, blood pressure, hands over",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "hx");
          test(c, "neuro");
          act(c, "diagnose", { dx: "vad" });
          act(c, "refer", { how: "ed" });
          test(c, "bp");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Screens well but sends her 8 minutes later",
        reasoning: "partial",
        drive: (c) => {
          test(c, "hx");
          test(c, "neuro");
          test(c, "bp");
          upTo(c, 130);
          act(c, "diagnose", { dx: "vad" });
          act(c, "refer", { how: "ed" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "provoked",
        title: "Tests end-range first, then screens and sends her",
        reasoning: "partial",
        drive: (c) => {
          act(c, "endrange");
          test(c, "neuro");
          act(c, "diagnose", { dx: "vad" });
          act(c, "refer", { how: "ed" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "manip",
        title: "Failure: calls it a locked facet, manipulates and sends her to her provider",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "mech" });
          act(c, "manip");
          act(c, "refer", { how: "pcp" });
          toEnd(c);
        },
      },
      {
        id: "tension",
        title: "Failure: calls it a tension headache and tests end-range",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "tension" });
          act(c, "endrange");
          toEnd(c);
        },
      },
    ],
  };
}
