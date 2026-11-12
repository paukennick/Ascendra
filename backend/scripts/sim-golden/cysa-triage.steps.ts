// REQ-238: golden paths for the CySA+ alert-triage incident on the security
// console (CYSAPLUS/alert-triage-lolbin-hunt.sim.json). No prototype exists,
// so the expectations are the engine's own results.
import type { StepPath, StepsSpec } from "./steps.ts";
import { close, task, watchUntil } from "./secplus-helpers.ts";

export const ENTRY = { course: "CYSAPLUS", slug: "alert-triage-lolbin-hunt" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}

const others = (c: Parameters<StepPath["drive"]>[0]) => {
  task(c, "triage", { alert: "spray", verdict: "handled" });
  task(c, "triage", { alert: "scan", verdict: "falsePos" });
  task(c, "triage", { alert: "av", verdict: "handled" });
};

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "certutil first: incident and EDR isolation by 5 min, escalate, memory and triage package, hunt, timeline, then the other three; notify the lead, IT and finance",
      reasoning: "met",
      drive: (c) => {
        task(c, "triage", { alert: "cert", verdict: "incident" });
        task(c, "isolate", { host: "ws07" });
        task(c, "escalate");
        task(c, "collect");
        task(c, "hunt");
        task(c, "timeline");
        others(c);
        close(c);
        c.act("notify", { who: "full" });
        c.act("document", { cause: "maldoc", scope: "one" });
      },
    },
    {
      id: "severityFirst",
      title: "Works the queue by severity label: the quarantine and the spray (called an incident) first; isolates FIN-WS07 at 20 min after LSASS was read, disables svc-backup at 43 min",
      reasoning: "partial",
      drive: (c) => {
        task(c, "triage", { alert: "av", verdict: "handled" });
        task(c, "triage", { alert: "spray", verdict: "incident" });
        task(c, "timeline");
        task(c, "triage", { alert: "scan", verdict: "falsePos" });
        task(c, "triage", { alert: "cert", verdict: "incident" });
        task(c, "isolate", { host: "ws07" });
        task(c, "escalate");
        task(c, "collect");
        task(c, "hunt");
        task(c, "disableAccount");
        close(c);
        c.act("notify", { who: "full" });
        c.act("document", { cause: "maldoc", scope: "one" });
      },
    },
    {
      id: "iocBlockOnly",
      title: "Marks certutil handled and blocks its address: the beacon moves, svc-backup reaches FIN-SQL01 and the finance data leaves at 70 min",
      reasoning: "missed",
      drive: (c) => {
        task(c, "triage", { alert: "cert", verdict: "handled" });
        task(c, "blockC2");
        others(c);
        watchUntil(c, 90);
        c.answer();
        c.act("notify", { who: "nobody" });
        c.act("document", { cause: "spray", scope: "zero" });
      },
    },
    {
      id: "reimageFirst",
      title: "Finds and isolates the intrusion fast, then reimages FIN-WS07 before collecting anything",
      reasoning: "partial",
      drive: (c) => {
        task(c, "triage", { alert: "cert", verdict: "incident" });
        task(c, "isolate", { host: "ws07" });
        task(c, "escalate");
        task(c, "reimage");
        task(c, "hunt");
        others(c);
        close(c);
        c.act("notify", { who: "full" });
        c.act("document", { cause: "maldoc", scope: "one" });
      },
    },
    {
      id: "missedCreds",
      title: "Clears the other three first; isolates FIN-WS07 at 21 min, after LSASS was read, never hunts or touches svc-backup; IT told only",
      reasoning: "partial",
      drive: (c) => {
        others(c);
        watchUntil(c, 16);
        task(c, "triage", { alert: "cert", verdict: "incident" });
        task(c, "isolate", { host: "ws07" });
        task(c, "escalate");
        task(c, "collect");
        close(c);
        c.act("notify", { who: "it" });
        c.act("document", { cause: "maldoc", scope: "one" });
      },
    },
    {
      id: "lateSpread",
      title: "Gets to the queue at 31 min, after svc-backup reached FIN-SQL01: isolates both, disables the account, collects from both, late escalation",
      reasoning: "partial",
      drive: (c) => {
        watchUntil(c, 31);
        task(c, "triage", { alert: "cert", verdict: "incident" });
        task(c, "isolate", { host: "ws07" });
        task(c, "hunt");
        task(c, "isolate", { host: "sql01" });
        task(c, "disableAccount");
        task(c, "collect");
        task(c, "timeline");
        others(c);
        task(c, "escalate");
        close(c);
        c.act("notify", { who: "full" });
        c.act("document", { cause: "maldoc", scope: "two" });
      },
    },
  ];
}
