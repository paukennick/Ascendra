// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// ABPTSECS/ulnar-referral-droopy-eyelid-low-snap. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps ecs-plexus
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSECS", slug: "ulnar-referral-droopy-eyelid-low-snap" };

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
        title: "Expert at study pace: ulnar studies, MAC SNAP, eyes, calls, needle EMG, reports",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "ulnar");
          test(c, "mac");
          test(c, "eye");
          act(c, "diagnose", { dx: "plexus" });
          act(c, "refer", { how: "md" });
          test(c, "emg");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Localizes fully but calls 8 minutes after the MAC SNAP",
        reasoning: "partial",
        drive: (c) => {
          test(c, "ulnar");
          test(c, "mac");
          test(c, "eye");
          test(c, "emg");
          upTo(c, 140);
          act(c, "diagnose", { dx: "plexus" });
          act(c, "refer", { how: "md" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "noEyes",
        title: "Tests the MAC SNAP and calls, but never looks at the eyes",
        reasoning: "partial",
        drive: (c) => {
          test(c, "ulnar");
          test(c, "mac");
          act(c, "diagnose", { dx: "plexus" });
          act(c, "refer", { how: "md" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "ulnar",
        title: "Failure: reports an ulnar neuropathy at the elbow",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "ulnar" });
          act(c, "refer", { how: "report" });
          toEnd(c);
        },
      },
      {
        id: "c8",
        title: "Failure: calls it a C8 radiculopathy",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "c8" });
          toEnd(c);
        },
      },
    ],
  };
}
