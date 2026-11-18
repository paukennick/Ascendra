// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// ABPTSWMS/two-wounds-one-dressing-choice. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps wms-dressing
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSWMS", slug: "two-wounds-one-dressing-choice" };

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
        title: "Expert at study pace: sacrum, ankle, calls, foam, risk review, documents",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "sacrum");
          test(c, "ankle");
          act(c, "diagnose", { dx: "match" });
          act(c, "refer", { how: "md" });
          act(c, "foam");
          test(c, "risk");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Assesses and dresses correctly, but calls 8 minutes later",
        reasoning: "partial",
        drive: (c) => {
          test(c, "sacrum");
          test(c, "ankle");
          act(c, "foam");
          test(c, "risk");
          upTo(c, 130);
          act(c, "diagnose", { dx: "match" });
          act(c, "refer", { how: "md" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "occluded",
        title: "Calls promptly but seals the ankle under hydrocolloid first",
        reasoning: "partial",
        drive: (c) => {
          test(c, "ankle");
          act(c, "occlude");
          act(c, "diagnose", { dx: "match" });
          act(c, "refer", { how: "md" });
          act(c, "foam");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "same",
        title: "Failure: follows the standing order on both and waits for next week",
        reasoning: "missed",
        drive: (c) => {
          test(c, "ankle");
          act(c, "diagnose", { dx: "same" });
          act(c, "occlude");
          act(c, "refer", { how: "next" });
          toEnd(c);
        },
      },
      {
        id: "both",
        title: "Failure: calls both infected and seals the ankle",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "both" });
          act(c, "occlude");
          toEnd(c);
        },
      },
    ],
  };
}
