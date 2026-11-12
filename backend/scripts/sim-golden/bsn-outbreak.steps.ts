// REQ-240 (bedside wave 2): golden paths for BSNRN/assisted-living-norovirus-outbreak.
// A learner-paced case (one `turns` phase): time moves only when a path
// advances to the next morning's update. Expectations are the engine's own
// results, re-checked by every `npm test` (lint + documents).
//
//   npm run sim:golden -- steps bsn-outbreak
import type { Ctl, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "BSNRN", slug: "assisted-living-norovirus-outbreak" };

const ended = (c: Ctl): boolean => c.run.state.ended !== null;
function measures(c: Ctl, hygiene: "soap" | "alcohol" = "soap"): void {
  c.act("handHygiene", { how: hygiene });
  c.act("isolateIll");
  c.act("excludeStaff");
  c.act("disinfect");
  c.act("pauseDining");
  c.act("restrictAdmissions");
}
function nextDay(c: Ctl): void {
  c.skip("dayT");
  c.answer();
}
// Each morning: update the line list, and declare once four quiet days have
// passed (or, with `declareOnDay`, on that day whatever the count says).
function followDaily(c: Ctl, opts: { update?: boolean; declare?: boolean; declareOnDay?: number } = {}): void {
  for (let i = 0; i < 14 && !ended(c); i++) {
    nextDay(c);
    if (ended(c)) return;
    if (opts.update !== false && c.value("surveil") === true && c.value("lineList") === true) c.act("update");
    const day = c.value("day") as number;
    if (opts.declareOnDay !== undefined && day === opts.declareOnDay && c.value("premature") === false && c.value("overAt") === null) {
      c.act("declare");
      return;
    }
    if (opts.declare !== false && (c.value("quietDays") as number) >= 4) c.act("declare");
  }
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert: interview, case definition and line list, attack rate, specimens, state report, community diagnosis, every measure on day one, daily reports and updates, declared over after four quiet days",
        reasoning: "met",
        drive: (c) => {
          c.act("callDon");
          c.act("caseDefine", { def: "good" });
          c.act("attackRate");
          c.act("specimens");
          c.act("reportState");
          c.act("diagnose", { dx: "spread" });
          measures(c);
          c.act("dailyReports");
          followDaily(c);
        },
      },
      {
        id: "nextDayMeasures",
        title: "A sound assessment and report on day one, but the measures go in on Tuesday morning",
        reasoning: "partial",
        drive: (c) => {
          c.act("callDon");
          c.act("caseDefine", { def: "good" });
          c.act("attackRate");
          c.act("specimens");
          c.act("reportState");
          c.act("dailyReports");
          nextDay(c);
          c.act("update");
          c.act("diagnose", { dx: "spread" });
          measures(c);
          followDaily(c);
        },
      },
      {
        id: "tooSoon",
        title: "Everything in on day one, then declared over on day 3; the measures are put back the next morning and it is called again on the evidence",
        reasoning: "partial",
        drive: (c) => {
          c.act("callDon");
          c.act("caseDefine", { def: "good" });
          c.act("specimens");
          c.act("reportState");
          c.act("diagnose", { dx: "buffet" });
          measures(c);
          c.act("dailyReports");
          followDaily(c, { declareOnDay: 3 });
          nextDay(c);
          c.act("update");
          c.act("handHygiene", { how: "soap" });
          c.act("isolateIll");
          c.act("excludeStaff");
          c.act("disinfect");
          c.act("pauseDining");
          followDaily(c);
        },
      },
      {
        id: "neverCalled",
        title: "Good measures on day one but a loose case definition, no specimens, no daily reports and nobody calling it over",
        reasoning: "partial",
        drive: (c) => {
          c.act("callDon");
          c.act("caseDefine", { def: "broad" });
          c.act("reportState");
          measures(c);
          followDaily(c, { declare: false });
        },
      },
      {
        id: "waitForLab",
        title: "Failure: a lab-only case definition, every ill resident sent to the emergency department, and measures held until the lab result",
        reasoning: "missed",
        drive: (c) => {
          c.act("callDon");
          c.act("caseDefine", { def: "narrow" });
          c.act("waitForLab");
          c.act("sendToEd");
          c.act("specimens");
          c.skip("labT");
          c.answer();
          if (!ended(c)) {
            c.act("handHygiene", { how: "alcohol" });
            c.act("isolateIll");
            followDaily(c);
          }
        },
      },
    ],
  };
}
