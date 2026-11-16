// REQ-274: golden paths for the CEH blind SQL injection case on the security
// console (CEH/ceh-blind-sqli-search.sim.json). Defensive work on the
// learner's own application. No prototype exists, so the expectations are
// the engine's own results.
import type { StepPath, StepsSpec } from "./steps.ts";
import { close, task, watchUntil } from "./secplus-helpers.ts";

export const ENTRY = { course: "CEH", slug: "ceh-blind-sqli-search" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}

type C = Parameters<StepPath["drive"]>[0];
const report = (c: C, who: string, type: string, fix: string) => {
  c.act("notify", { who });
  c.act("document", { type, fix });
};

export function paths(): StepPath[] {
  return [
    {
      id: "expert",
      title: "Reads the evidence, exports the logs, turns search off at 10 min, ships the parameterized query, least-privilege login, search back on, audit check, tells the handler",
      reasoning: "met",
      drive: (c) => {
        task(c, "read");
        task(c, "preserve");
        task(c, "flagOff");
        task(c, "fix");
        task(c, "leastPriv");
        task(c, "restore");
        task(c, "checkData");
        task(c, "escalate");
        close(c);
        report(c, "handler", "blind", "param");
      },
    },
    {
      id: "ipBlock",
      title: "Blocks the first address and watches: the requests come from elsewhere and the customers table is read by 50 min",
      reasoning: "missed",
      drive: (c) => {
        task(c, "read");
        task(c, "blockIp");
        watchUntil(c, 60);
        close(c);
        report(c, "nobody", "inband", "waf");
      },
    },
    {
      id: "filterOnly",
      title: "Adds a keyword filter, exports logs, tells the handler and checks the audit log; the attacker encodes around the filter and the search is injectable at close",
      reasoning: "partial",
      drive: (c) => {
        task(c, "read");
        task(c, "filter");
        task(c, "preserve");
        task(c, "escalate");
        task(c, "checkData");
        close(c);
        report(c, "handler", "blind", "filter");
      },
    },
    {
      id: "wafThenFix",
      title: "Blocks with the WAF; the attacker evades it at 15 min and maps the tables; the parameterized query lands at 37 min; then a clean finish",
      reasoning: "partial",
      drive: (c) => {
        task(c, "read");
        task(c, "wafBlock");
        task(c, "preserve");
        task(c, "escalate");
        task(c, "fix");
        task(c, "leastPriv");
        task(c, "checkData");
        close(c);
        report(c, "handler", "blind", "param");
      },
    },
    {
      id: "noPriv",
      title: "Stops and fixes it fast and checks the audit log, but leaves the login as db_owner",
      reasoning: "partial",
      drive: (c) => {
        task(c, "read");
        task(c, "preserve");
        task(c, "flagOff");
        task(c, "fix");
        task(c, "restore");
        task(c, "checkData");
        task(c, "escalate");
        close(c);
        report(c, "handler", "blind", "param");
      },
    },
    {
      id: "flagOnly",
      title: "Turns search off and limits the login, exports logs, and closes with search off and the handler unfixed",
      reasoning: "missed",
      drive: (c) => {
        task(c, "read");
        task(c, "flagOff");
        task(c, "leastPriv");
        task(c, "preserve");
        close(c);
        report(c, "public", "oob", "waf");
      },
    },
  ];
}
