// REQ-296 (clinical coverage, wave 2): golden paths for DPT/parkinson-freezing-session.
// No prototype exists, so the expectations are the engine's own results,
// re-checked by every `npm test` (lint + documents). The case ticks every 5 s.
//
//   npm run sim:golden -- steps dpt-parkinson
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "DPT", slug: "parkinson-freezing-session" };

const TICK = 5;
const ended = (c: Ctl): boolean => c.run.state.ended !== null;
const sec = (c: Ctl): number => c.run.state.tick * TICK;
const after = (c: Ctl, s: number): void => {
  const to = sec(c) + s;
  until(c, (x) => sec(x) >= to || ended(x));
};
const when = (c: Ctl, name: string, pred: (v: unknown) => boolean): void => until(c, (x) => pred(x.value(name)) || ended(x));
const toEnd = (c: Ctl): void => until(c, (x) => ended(x), 20000);
function act(c: Ctl, a: string, p?: Record<string, string>): void {
  if (ended(c)) return;
  c.act(a, p);
  c.answer();
  teach(c);
}
const ortho = (c: Ctl): void => {
  act(c, "orthoTest");
  when(c, "testing", (v) => v === false);
};

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: belt, orthostatic test, call the neurologist, 10 min hard on the stepper with RPE, stand in stages, cue at the doorway, 5 min of gait training, home program",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          after(c, 10);
          act(c, "belt");
          ortho(c);
          act(c, "callMd");
          act(c, "cycle", { dose: "hard" });
          after(c, 120);
          act(c, "askRpe");
          when(c, "aerobicT", (v) => Number(v) >= 600);
          act(c, "stopCycle");
          act(c, "standPrepared");
          act(c, "walk");
          when(c, "frozen", (v) => v === true);
          act(c, "cue", { kind: "visual" });
          when(c, "walkT", (v) => Number(v) >= 300);
          act(c, "sit");
          act(c, "decide", { home: "cpg" });
          act(c, "endSession");
          toEnd(c);
        },
      },
      {
        id: "easy",
        title: "Light intensity on the stepper and no call about the drop; an auditory cue at the doorway",
        reasoning: "partial",
        drive: (c) => {
          after(c, 10);
          act(c, "belt");
          ortho(c);
          act(c, "cycle", { dose: "easy" });
          after(c, 600);
          act(c, "stopCycle");
          act(c, "standPrepared");
          act(c, "walk");
          when(c, "frozen", (v) => v === true);
          act(c, "cue", { kind: "auditory" });
          when(c, "walkT", (v) => Number(v) >= 300);
          act(c, "sit");
          act(c, "decide", { home: "cpg" });
          act(c, "endSession");
          toEnd(c);
        },
      },
      {
        id: "noTraining",
        title: "Tests, calls the neurologist and sends him home to rest: no training",
        reasoning: "partial",
        drive: (c) => {
          after(c, 10);
          act(c, "belt");
          ortho(c);
          act(c, "callMd");
          act(c, "decide", { home: "rest" });
          act(c, "endSession");
          toEnd(c);
        },
      },
      {
        id: "rushed",
        title: "Stands him straight off the stepper and leaves him woozy; pulls him through the freeze (caught by the belt)",
        reasoning: "missed",
        drive: (c) => {
          after(c, 10);
          act(c, "belt");
          ortho(c);
          act(c, "cycle", { dose: "hard" });
          when(c, "aerobicT", (v) => Number(v) >= 600);
          act(c, "stopCycle");
          act(c, "stand");
          when(c, "pos", (v) => v === "seated");
          act(c, "standPrepared");
          act(c, "walk");
          when(c, "frozen", (v) => v === true);
          act(c, "pull");
          after(c, 60);
          act(c, "sit");
          act(c, "endSession");
          toEnd(c);
        },
      },
      {
        id: "fall",
        title: "Failure: no gait belt, no test, straight to the hall; waits out the freeze",
        reasoning: "missed",
        drive: (c) => {
          after(c, 10);
          act(c, "stand");
          after(c, 130);
          act(c, "walk");
          toEnd(c);
        },
      },
    ],
  };
}
