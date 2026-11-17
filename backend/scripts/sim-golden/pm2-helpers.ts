// REQ-321 (sims-pm-2): a shared driver for the review-paced PMI cases
// (docs/sims.md 22.31): the governance-board cases (program steering,
// portfolio rebalancing, P5 impact review, risk register) and the requirements
// baseline on the project dashboard. Each case moves a period at a time; a
// decision arrives as a prompt that stops the skip. `inspect` lists tasks
// done before a given period (0 = before the first), each run to completion.
import type { Ctl } from "./steps.ts";

export interface Play {
  answers: Record<string, string>; // prompt id -> choice id
  inspect?: Record<number, string[]>; // period -> tasks done before skipping past it
  close: Record<string, string>; // the closing form's values
  periodVar?: string; // the counter the case advances (default "p")
  runPhase?: string; // the working phase (default "run")
  periodTimer?: string; // the timer that moves a period on (default "period")
}

export function play(c: Ctl, p: Play): void {
  const phase = p.runPhase ?? "run";
  const timer = p.periodTimer ?? "period";
  const counter = p.periodVar ?? "p";
  const done = new Set<number>();
  const settle = (): void => {
    let n = 0;
    while (!c.run.state.ended && c.value("busy") === true && n++ < 50) c.skip("work");
  };
  let guard = 0;
  while (c.run.state.phase === phase && !c.run.state.ended && guard++ < 100) {
    const k = c.value(counter) as number;
    if (!done.has(k)) {
      done.add(k);
      for (const a of p.inspect?.[k] ?? []) {
        c.act(a);
        settle();
      }
    }
    c.skip(timer);
    while (c.run.state.openPrompt) c.choose(p.answers[c.run.state.openPrompt]);
  }
  c.answer();
  c.act("closeOut", p.close);
  c.act("close");
}
