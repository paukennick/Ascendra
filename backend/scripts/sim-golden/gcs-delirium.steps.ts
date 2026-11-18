// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// ABPTSGCS/quiet-not-lazy-day-three-hip-fracture. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps gcs-delirium
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSGCS", slug: "quiet-not-lazy-day-three-hip-fracture" };

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
        title: "Expert at study pace: attention test, baseline, reports, adapts, medicines and vitals, documents",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "attn");
          test(c, "base");
          act(c, "diagnose", { dx: "del" });
          act(c, "refer", { how: "team" });
          act(c, "bed");
          test(c, "meds");
          test(c, "vitals");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Recognizes it and adapts, but reports 8 minutes later",
        reasoning: "partial",
        drive: (c) => {
          test(c, "attn");
          test(c, "base");
          act(c, "bed");
          test(c, "meds");
          test(c, "vitals");
          upTo(c, 130);
          act(c, "diagnose", { dx: "del" });
          act(c, "refer", { how: "team" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "noBase",
        title: "Reports and adapts without testing attention or asking about baseline",
        reasoning: "partial",
        drive: (c) => {
          test(c, "vitals");
          act(c, "bed");
          act(c, "diagnose", { dx: "del" });
          act(c, "refer", { how: "team" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "pushed",
        title: "Failure: reads it as motivation and walks her",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "motiv" });
          act(c, "walk");
          act(c, "refer", { how: "note" });
          toEnd(c);
        },
      },
      {
        id: "labeled",
        title: "Failure: tests attention but labels her unmotivated",
        reasoning: "missed",
        drive: (c) => {
          test(c, "attn");
          act(c, "diagnose", { dx: "dementia" });
          act(c, "refuse");
          act(c, "refer", { how: "note" });
          upTo(c, 1500);
          toEnd(c);
        },
      },
    ],
  };
}
