// REQ-323 (health depth, round 2): golden paths for
// CEN/triage-indigestion-inferior-stemi. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps cen-acs
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "CEN", slug: "triage-indigestion-inferior-stemi" };

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
        title: "Expert at study pace: ESI 2, the pain history, the ECG in 3 minutes to the physician, medications (sildenafil), aspirin, hand-off",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          act(c, "diagnose", { dx: "esi2" });
          test(c, "hx");
          test(c, "ecg");
          act(c, "refer", { how: "md" });
          test(c, "meds");
          act(c, "aspirin");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateEcg",
        title: "ESI 2 and a careful history and vital signs, but the ECG lands after 10 minutes; oxygen on a normal saturation",
        reasoning: "partial",
        drive: (c) => {
          act(c, "diagnose", { dx: "esi2" });
          test(c, "hx");
          test(c, "meds");
          test(c, "vitals");
          act(c, "oxygen");
          upTo(c, 110);
          test(c, "ecg");
          act(c, "refer", { how: "md" });
          act(c, "aspirin");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "slowRead",
        title: "ECG inside 10 minutes, but it waits 6 minutes before the physician sees it",
        reasoning: "partial",
        drive: (c) => {
          act(c, "diagnose", { dx: "esi2" });
          test(c, "ecg");
          test(c, "hx");
          test(c, "meds");
          test(c, "vitals");
          upTo(c, 110);
          act(c, "refer", { how: "md" });
          act(c, "aspirin");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "nitroFirst",
        title: "Failure: ESI 2 and vital signs, then nitroglycerin without asking about sildenafil",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "esi2" });
          test(c, "hx");
          test(c, "vitals");
          act(c, "nitro");
          toEnd(c);
        },
      },
      {
        id: "inTheChart",
        title: "Failure: ESI 3 to the waiting room, an ECG that goes in the chart unread",
        reasoning: "missed",
        drive: (c) => {
          act(c, "diagnose", { dx: "esi3" });
          test(c, "hx");
          test(c, "vitals");
          test(c, "ecg");
          act(c, "refer", { how: "chart" });
          toEnd(c);
        },
      },
    ],
  };
}
