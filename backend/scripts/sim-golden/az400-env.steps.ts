// REQ-335: golden paths for AZ400/prod-stage-skips-environment-approval on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AZ400", slug: "prod-stage-skips-environment-approval" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Stage, runs, checks, template users; deployment job; credential checks; verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "yaml");
          run(c, "runs");
          run(c, "checks");
          run(c, "tmpl");
          run(c, "envjob");
          run(c, "guard");
          run(c, "verify");
          waitUntil(c, 81);
          close(c);
          c.act("document", { cause: "job" });
        },
      },
      {
        id: "harm",
        title: "Deploys the hotfix from a laptop",
        reasoning: "missed",
        drive: (c) => {
          run(c, "yaml");
          run(c, "laptop");
          run(c, "verify");
          waitUntil(c, 81);
          close(c);
          c.act("document", { cause: "job" });
        },
      },
      {
        id: "noop",
        title: "Adds more approvers",
        reasoning: "partial",
        drive: (c) => {
          run(c, "yaml");
          run(c, "approver");
          run(c, "verify");
          waitUntil(c, 81);
          close(c);
          c.act("document", { cause: "job" });
        },
      },
      {
        id: "fixOnly",
        title: "Reads stage and runs, targets the environment, verifies",
        reasoning: "partial",
        drive: (c) => {
          run(c, "yaml");
          run(c, "runs");
          run(c, "envjob");
          run(c, "verify");
          waitUntil(c, 81);
          close(c);
          c.act("document", { cause: "job" });
        },
      },
      {
        id: "late",
        title: "Waits, fixes after 16:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "yaml");
          waitUntil(c, 80);
          run(c, "envjob");
          run(c, "verify");
          waitUntil(c, 88);
          close(c);
          c.act("document", { cause: "job" });
        },
      },
      {
        id: "blind",
        title: "Edits the stage without looking and blames the approvers",
        reasoning: "missed",
        drive: (c) => {
          run(c, "envjob");
          waitUntil(c, 81);
          close(c);
          c.act("document", { cause: "approver" });
        },
      },
    ],
  };
}
