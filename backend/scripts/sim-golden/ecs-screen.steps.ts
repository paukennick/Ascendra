// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// ABPTSECS/emg-referral-platelets-thirty-one. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps ecs-screen
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSECS", slug: "emg-referral-platelets-thirty-one" };

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
        title: "Expert at study pace: labs, defers, calls, skin and surface studies, reports",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "labs");
          act(c, "defer");
          act(c, "diagnose", { dx: "defer" });
          act(c, "refer", { how: "md" });
          test(c, "skin");
          test(c, "ncs");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Defers after the labs but calls 8 minutes later",
        reasoning: "partial",
        drive: (c) => {
          test(c, "labs");
          act(c, "defer");
          test(c, "skin");
          test(c, "ncs");
          upTo(c, 130);
          act(c, "diagnose", { dx: "defer" });
          act(c, "refer", { how: "md" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lymph",
        title: "Defers because of the lymphedema without checking labs, then calls",
        reasoning: "partial",
        drive: (c) => {
          test(c, "skin");
          act(c, "defer");
          act(c, "diagnose", { dx: "lymph" });
          act(c, "refer", { how: "md" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "needled",
        title: "Failure: proceeds with a full deep needle study",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "fine" });
          act(c, "needle");
          act(c, "refer", { how: "none" });
          toEnd(c);
        },
      },
      {
        id: "sawLabs",
        title: "Failure: sees the count but needles anyway",
        reasoning: "missed",
        drive: (c) => {
          test(c, "labs");
          act(c, "diagnose", { dx: "fine" });
          act(c, "needle");
          toEnd(c);
        },
      },
    ],
  };
}
