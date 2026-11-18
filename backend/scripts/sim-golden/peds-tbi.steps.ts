// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// CCRNPEDS/bike-crash-icp-climbing. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps peds-tbi
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CCRNPEDS", slug: "bike-crash-icp-climbing" };

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
        title: "Expert at study pace: reads the trend, head up and midline, calls, checks pupils, CO2 and collar, quiets the room, documents",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "trend");
          act(c, "hob");
          act(c, "diagnose", { dx: "icp" });
          act(c, "refer", { how: "call" });
          test(c, "pupils");
          test(c, "etco2");
          test(c, "collar");
          act(c, "quiet");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Fixes the position at once but checks everything before calling 7 minutes later",
        reasoning: "partial",
        drive: (c) => {
          test(c, "trend");
          act(c, "hob");
          test(c, "pupils");
          test(c, "etco2");
          test(c, "collar");
          act(c, "quiet");
          upTo(c, 100);
          act(c, "diagnose", { dx: "icp" });
          act(c, "refer", { how: "call" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "hyperv",
        title: "Calls promptly but hyperventilates her and leaves her flat for 6 minutes",
        reasoning: "partial",
        drive: (c) => {
          test(c, "trend");
          act(c, "hyperv");
          act(c, "diagnose", { dx: "icp" });
          act(c, "refer", { how: "call" });
          upTo(c, 90);
          act(c, "hob");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "artifact",
        title: "Failure: calls it artifact, leaves her flat and watches",
        reasoning: "missed",
        drive: (c) => {
          test(c, "trend");
          act(c, "diagnose", { dx: "artifact" });
          act(c, "flat");
          act(c, "refer", { how: "watch" });
          toEnd(c);
        },
      },
      {
        id: "pain",
        title: "Failure: reads it as pain and hyperventilates",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "pain" });
          act(c, "hyperv");
          toEnd(c);
        },
      },
    ],
  };
}
