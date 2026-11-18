// REQ-335: golden paths for AWSDVA/prod-alias-left-on-latest on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AWSDVA", slug: "prod-alias-left-on-latest" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Alias, executed versions, versions, CloudTrail; repoint to 41; guard; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "alias");
          run(c, "logs");
          run(c, "versions");
          run(c, "ct");
          run(c, "repoint");
          run(c, "guard");
          run(c, "verify");
          waitUntil(c, 66);
          close(c);
          c.act("document", { cause: "latest" });
        },
      },
      {
        id: "harm",
        title: "Deletes the prod alias",
        reasoning: "missed",
        drive: (c) => {
          run(c, "alias");
          run(c, "delalias");
          run(c, "verify");
          waitUntil(c, 66);
          close(c);
          c.act("document", { cause: "latest" });
        },
      },
      {
        id: "noop",
        title: "Publishes the current code",
        reasoning: "partial",
        drive: (c) => {
          run(c, "alias");
          run(c, "publish");
          run(c, "verify");
          waitUntil(c, 66);
          close(c);
          c.act("document", { cause: "latest" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads alias and logs, repoints, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "alias");
          run(c, "logs");
          run(c, "repoint");
          run(c, "verify");
          waitUntil(c, 66);
          close(c);
          c.act("document", { cause: "latest" });
        },
      },
      {
        id: "late",
        title: "Waits, repoints after 14:30",
        reasoning: "partial",
        drive: (c) => {
          run(c, "alias");
          waitUntil(c, 65);
          run(c, "repoint");
          run(c, "verify");
          waitUntil(c, 73);
          close(c);
          c.act("document", { cause: "latest" });
        },
      },
      {
        id: "blind",
        title: "Repoints without looking and blames API Gateway",
        reasoning: "missed",
        drive: (c) => {
          run(c, "repoint");
          waitUntil(c, 66);
          close(c);
          c.act("document", { cause: "apigw" });
        },
      },
    ],
  };
}
