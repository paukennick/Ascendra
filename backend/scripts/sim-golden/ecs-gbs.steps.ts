// REQ-334 (health depth, 2026-11-17 evening): golden paths for
// ABPTSECS/too-early-to-test-day-four-weakness. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps ecs-gbs
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSECS", slug: "too-early-to-test-day-four-weakness" };

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
        title: "Expert at study pace: exam, H-reflexes, breathing, calls, conduction, repeat plan, report",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "exam");
          test(c, "href");
          test(c, "breath");
          act(c, "diagnose", { dx: "gbs" });
          act(c, "refer", { how: "neuro" });
          test(c, "motor");
          act(c, "repeat");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Does the study, but calls 8 minutes after the H-reflexes",
        reasoning: "partial",
        drive: (c) => {
          test(c, "exam");
          test(c, "href");
          test(c, "motor");
          test(c, "breath");
          upTo(c, 130);
          act(c, "diagnose", { dx: "gbs" });
          act(c, "refer", { how: "neuro" });
          act(c, "repeat");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "noStudy",
        title: "Calls on the exam alone without doing the study",
        reasoning: "partial",
        drive: (c) => {
          test(c, "exam");
          test(c, "breath");
          act(c, "diagnose", { dx: "gbs" });
          act(c, "refer", { how: "neuro" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "waited",
        title: "Failure: too early to test, rebooked for three weeks",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "early" });
          act(c, "home");
          act(c, "refer", { how: "report" });
          toEnd(c);
        },
      },
      {
        id: "misread",
        title: "Failure: does the study, reads sural sparing as not GBS, sends him home",
        reasoning: "missed",
        drive: (c) => {
          test(c, "href");
          test(c, "motor");
          act(c, "diagnose", { dx: "normal" });
          act(c, "home");
          toEnd(c);
        },
      },
    ],
  };
}
