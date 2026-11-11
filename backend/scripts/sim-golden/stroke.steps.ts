// REQ-222 (batch S2a): golden paths for CCRNADULT/acute-ischemic-stroke-lvo.
// No prototype exists, so the expectations are the engine's own results,
// re-checked by every `npm test` (lint + documents).
//
//   npm run sim:golden -- steps stroke
import type { Ctl, StepsSpec } from "./steps.ts";

export const ENTRY = { course: "CCRNADULT", slug: "acute-ischemic-stroke-lvo" };

const n = (c: Ctl, name: string): number => c.value(name) as number;
const isSet = (c: Ctl, name: string): boolean => c.value(name) !== null;
const pending = (c: Ctl, timer: string): boolean => c.run.state.timers.some((x) => x.timer === timer);

function until(c: Ctl, at: number): void {
  if (c.run.state.tick < at) c.wait(at - c.run.state.tick);
}

function skipUntilSet(c: Ctl, timer: string, flag: string): void {
  while (!isSet(c, flag) && !c.run.state.ended) {
    if (pending(c, timer)) c.skip(timer);
    else c.wait(1);
  }
  if (!c.run.state.ended) c.answer();
}

// After thrombolysis: neuro checks every `every` seconds, nicardipine to keep BP below 180/105.
function afterLytic(c: Ctl, every: number, controlBp: boolean, evtAfterCta: number | null): void {
  let lastNeuro = isSet(c, "neuroLastAt") ? n(c, "neuroLastAt") : c.run.state.tick;
  let nic = n(c, "nicRate");
  while (!c.run.state.ended) {
    if (evtAfterCta !== null && isSet(c, "ctaAt") && !isSet(c, "evtCallAt") && c.run.state.tick >= n(c, "ctaAt") + evtAfterCta) c.act("evt");
    if (c.run.state.tick - lastNeuro >= every) {
      c.act("neuro");
      lastNeuro = c.run.state.tick;
    }
    if (controlBp && n(c, "sbp") > 176 && nic < 10) {
      nic = nic === 0 ? 5 : nic + 2.5;
      c.act("nicardipine", { rate: String(nic) });
    }
    c.wait(60);
  }
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert: alert at once, LKW 09:40, glucose, NIHSS, screen, BP under 185/110, tenecteplase before the CTA, thrombectomy call at the CTA read",
        reasoning: "met",
        drive: (c) => {
          until(c, 20);
          c.act("alert");
          c.act("glucose");
          c.act("lkw", { when: "correct" });
          c.act("neuro");
          c.act("nihss");
          c.act("screen");
          c.act("labetalol");
          c.act("ct");
          c.skip("bpCheckT");
          c.act("nicardipine", { rate: "5" });
          skipUntilSet(c, "ncctT", "ncctAt");
          c.act("lytic");
          c.act("neuro");
          skipUntilSet(c, "ctaT", "ctaAt");
          c.act("evt");
          afterLytic(c, 900, true, null);
        },
      },
      {
        id: "slowSafe",
        title: "Slow but safe: alert at 8 min, onset recorded as unknown, thrombolysis at 70 min, the thrombectomy call only after it (about 37 min after the CTA), checks every 20-25 min",
        reasoning: "partial",
        drive: (c) => {
          until(c, 480);
          c.act("alert");
          c.act("neuro");
          c.act("lkw", { when: "unknown" });
          c.act("glucose");
          c.act("ct");
          until(c, 1800);
          c.act("nihss");
          c.act("screen");
          until(c, 3300);
          c.act("labetalol");
          c.skip("bpCheckT");
          c.act("nicardipine", { rate: "5" });
          until(c, 4200);
          c.act("lytic");
          afterLytic(c, 1380, true, 1200);
        },
      },
      {
        id: "lyticHighBp",
        title: "Failure: thrombolytic given with BP 196/106",
        reasoning: "missed",
        drive: (c) => {
          until(c, 20);
          c.act("alert");
          c.act("glucose");
          c.act("lkw", { when: "correct" });
          c.act("nihss");
          c.act("screen");
          c.act("ct");
          skipUntilSet(c, "ncctT", "ncctAt");
          c.act("lytic");
          skipUntilSet(c, "ctaT", "ctaAt");
          if (!c.run.state.ended) c.act("evt");
          if (!c.run.state.ended) afterLytic(c, 900, false, null);
        },
      },
      {
        id: "bpDrift",
        title: "Failure: BP brought under 185/110 with one labetalol dose, then left to drift above 180/105 with no checks",
        reasoning: "partial",
        drive: (c) => {
          until(c, 20);
          c.act("alert");
          c.act("glucose");
          c.act("lkw", { when: "correct" });
          c.act("nihss");
          c.act("screen");
          c.act("labetalol");
          c.act("ct");
          c.skip("bpCheckT");
          skipUntilSet(c, "ncctT", "ncctAt");
          c.waitUntil(() => n(c, "sbp") < 185);
          c.act("lytic");
          skipUntilSet(c, "ctaT", "ctaAt");
          c.act("evt");
          c.waitUntil((r) => r.state.ended !== null);
        },
      },
      {
        id: "noThrombectomy",
        title: "Failure: late alert, discovery time as last known well, no glucose, no thrombolysis and no thrombectomy call",
        reasoning: "missed",
        drive: (c) => {
          until(c, 1200);
          c.act("alert");
          c.act("lkw", { when: "discovery" });
          c.act("nicardipine", { rate: "7.5" });
          c.act("ct");
          skipUntilSet(c, "ctaT", "ctaAt");
          c.waitUntil((r) => r.state.ended !== null);
        },
      },
    ],
  };
}
