// REQ-297: golden paths for the KCNA Service selector outage on the terminal
// screen (KCNA/service-selector-no-endpoints.sim.json). No prototype exists,
// so the expectations are the engine's own results.
import type { StepPath, StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "KCNA", slug: "service-selector-no-endpoints" };

export function spec(): StepsSpec {
  return { slug: ENTRY.slug, paths: paths() };
}

// Shared with the CKA band (cka-selector.steps.ts).
export function paths(): StepPath[] {
  return [
      {
        id: "expert",
        title: "Pods Ready, Service has no endpoints, selector typo against the labels, traced to Git; revert, sync and curl",
        reasoning: "met",
        drive: (c) => {
          run(c, "getPods");
          run(c, "describeSvc");
          run(c, "getEps");
          run(c, "showLabels");
          run(c, "argoDiff");
          run(c, "fix", { change: "gitRevert" });
          run(c, "curl");
          close(c);
          c.act("document", { cause: "selector" });
        },
      },
      {
        id: "patchRelapse",
        title: "Finds the empty endpoints and patches the live selector; self-heal puts the typo back, then reverts in Git",
        reasoning: "partial",
        drive: (c) => {
          run(c, "describeSvc");
          run(c, "fix", { change: "patchLive" });
          run(c, "curl");
          run(c, "watch");
          run(c, "curl");
          run(c, "argoDiff");
          run(c, "fix", { change: "gitRevert" });
          run(c, "curl");
          close(c);
          c.act("document", { cause: "selector" });
        },
      },
      {
        id: "labelPods",
        title: "Finds the empty endpoints and relabels the running pods to match the typo; the shop serves, Git still has it",
        reasoning: "partial",
        drive: (c) => {
          run(c, "getPods");
          run(c, "getEps");
          run(c, "showLabels");
          run(c, "fix", { change: "labelPods" });
          run(c, "curl");
          close(c);
          c.act("document", { cause: "selector" });
        },
      },
      {
        id: "deleteDeploy",
        title: "Sees a busy node and quiet logs and deletes the Deployment so it is recreated",
        reasoning: "missed",
        drive: (c) => {
          run(c, "top");
          run(c, "logs");
          run(c, "fix", { change: "deleteDeploy" });
          run(c, "curl");
          close(c);
          c.act("document", { cause: "image" });
        },
      },
      {
        id: "restartSale",
        title: "Restarts the rollout twice and waits; the sale starts with the shop down, then finds and reverts the typo",
        reasoning: "partial",
        drive: (c) => {
          run(c, "top");
          run(c, "fix", { change: "restart" });
          run(c, "fix", { change: "restart" });
          waitUntil(c, 46);
          run(c, "describeSvc");
          run(c, "fix", { change: "gitRevert" });
          run(c, "curl");
          close(c);
          c.act("document", { cause: "selector" });
        },
      },
      {
        id: "closeEarly",
        title: "Blames the busy node and closes with the shop still answering 503",
        reasoning: "missed",
        drive: (c) => {
          run(c, "top");
          run(c, "getPods");
          close(c);
          c.act("document", { cause: "node" });
        },
      },
  ];
}
