// REQ-274: golden paths for the ISC2 CC alert-triage incident on the
// security console (ISC2CC/cc-triage-phish-correlation.sim.json). No
// prototype exists, so the expectations are the engine's own results.
import type { StepPath, StepsSpec } from "./steps.ts";
import { close, task, watchUntil } from "./secplus-helpers.ts";

export const ENTRY = { course: "ISC2CC", slug: "cc-triage-phish-correlation" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}

type C = Parameters<StepPath["drive"]>[0];
const report = (c: C, who: string, cause: string, use: string) => {
  c.act("notify", { who });
  c.act("document", { cause, use });
};
const noise = (c: C) => {
  task(c, "triageFw", { verdict: "noise" });
  task(c, "triageAv", { verdict: "benign" });
};

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Correlates first, declares at 7 min, reset and revoke by 10, rule check, evidence, sender block, purge, staff warning, then closes the noise",
      reasoning: "met",
      drive: (c) => {
        task(c, "correlate");
        task(c, "declare");
        task(c, "cut");
        task(c, "checkRule");
        task(c, "preserve");
        task(c, "blockSender");
        task(c, "purge");
        task(c, "warnStaff");
        noise(c);
        close(c);
        report(c, "handler", "phish", "credphish");
      },
    },
    {
      id: "byLabel",
      title: "Works the queue by label: escalates the firewall drops, blocks and warns, declares at 24 min; the internal phish goes out at 25",
      reasoning: "partial",
      drive: (c) => {
        task(c, "triageFw", { verdict: "critical" });
        task(c, "triageAv", { verdict: "benign" });
        task(c, "blockSender");
        task(c, "preserve");
        task(c, "warnStaff");
        task(c, "correlate");
        task(c, "declare");
        task(c, "cut");
        task(c, "checkRule");
        task(c, "purge");
        close(c);
        report(c, "handler", "phish", "credphish");
      },
    },
    {
      id: "noiseOnly",
      title: "Closes the firewall and antivirus alerts and the queue, never correlating the report with the sign-in",
      reasoning: "missed",
      drive: (c) => {
        noise(c);
        close(c);
        report(c, "nobody", "rdp", "noise");
      },
    },
    {
      id: "purgeFirst",
      title: "Correlates, declares and cuts fast, then pulls every copy before saving one",
      reasoning: "partial",
      drive: (c) => {
        task(c, "correlate");
        task(c, "declare");
        task(c, "cut");
        task(c, "purge");
        task(c, "checkRule");
        task(c, "preserve");
        close(c);
        report(c, "handler", "phish", "credphish");
      },
    },
    {
      id: "watchFraud",
      title: "Correlates and saves the evidence, then watches: a colleague is caught and the bank details change at 45 min",
      reasoning: "missed",
      drive: (c) => {
        task(c, "correlate");
        task(c, "preserve");
        watchUntil(c, 70);
        close(c);
        report(c, "everyone", "phish", "credphish");
      },
    },
    {
      id: "ruleMissed",
      title: "Correlates and saves, blocks and closes the firewall alert, declares at 18 min and cuts at 21, but never checks the mailbox rules",
      reasoning: "partial",
      drive: (c) => {
        task(c, "correlate");
        task(c, "preserve");
        task(c, "blockSender");
        task(c, "triageFw", { verdict: "noise" });
        task(c, "declare");
        task(c, "cut");
        task(c, "purge");
        close(c);
        report(c, "handler", "phish", "credphish");
      },
    },
  ];
}
