// REQ-325 (nursing depth, round 3): golden paths for
// NCLEXRN/day-two-chemo-potassium-climbing. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps rn-tls
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "NCLEXRN", slug: "day-two-chemo-potassium-climbing" };

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
        title: "Expert at study pace: labs; telemetry; potassium fluid stopped; tumor lysis syndrome; oncology provider now; ordered treatment; calcium signs; documented",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "labs");
          act(c, "tele");
          act(c, "stopK");
          act(c, "diagnose", { dx: "tls" });
          act(c, "refer", { how: "onc" });
          upTo(c, 80);
          act(c, "tx");
          test(c, "symptoms");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lateCall",
        title: "Intake, output and symptoms first, then the labs; reports 6 minutes after them",
        reasoning: "partial",
        drive: (c) => {
          test(c, "io");
          test(c, "symptoms");
          test(c, "labs");
          act(c, "tele");
          act(c, "stopK");
          act(c, "diagnose", { dx: "tls" });
          upTo(c, 110);
          act(c, "refer", { how: "onc" });
          upTo(c, 165);
          act(c, "tx");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "noMonitor",
        title: "Stops the potassium and reports at once, but never puts him on telemetry or checks his calcium signs",
        reasoning: "partial",
        drive: (c) => {
          test(c, "labs");
          act(c, "stopK");
          act(c, "refer", { how: "onc" });
          act(c, "diagnose", { dx: "tls" });
          upTo(c, 70);
          act(c, "tx");
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "keptPotassium",
        title: "Failure: calls it dehydration, keeps the potassium-containing fluid running and waits for rounds",
        reasoning: "missed",
        drive: (c) => {
          test(c, "labs");
          act(c, "diagnose", { dx: "dehydration" });
          act(c, "keep");
          act(c, "refer", { how: "rounds" });
          toEnd(c);
        },
      },
      {
        id: "justCramps",
        title: "Failure: hears about his cramps and tingling, calls it bed rest and moves on",
        reasoning: "missed",
        drive: (c) => {
          test(c, "symptoms");
          act(c, "diagnose", { dx: "cramps" });
          toEnd(c);
        },
      },
    ],
  };
}
