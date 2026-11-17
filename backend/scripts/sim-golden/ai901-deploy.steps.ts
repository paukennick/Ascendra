// REQ-320: golden paths for AI901/chat-client-model-name-not-deployment on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AI901", slug: "chat-client-model-name-not-deployment" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Run, deployment list, code, deployment name from configuration, system message, tested",
        reasoning: "met",
        drive: (c) => {
          run(c, "run");
          run(c, "deployments");
          run(c, "code");
          run(c, "setDeployment");
          run(c, "systemPrompt");
          run(c, "verify");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "deployment" });
        },
      },
      {
        id: "hardcodeKey",
        title: "Pastes the key into the code and pushes",
        reasoning: "missed",
        drive: (c) => {
          run(c, "run");
          run(c, "keyInCode");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "auth" });
        },
      },
      {
        id: "reinstall",
        title: "Upgrades the SDK packages",
        reasoning: "missed",
        drive: (c) => {
          run(c, "reinstall");
          run(c, "run");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "sdk" });
        },
      },
      {
        id: "duplicate",
        title: "Finds the mismatch but creates a second deployment named after the model",
        reasoning: "partial",
        drive: (c) => {
          run(c, "run");
          run(c, "deployments");
          run(c, "secondDeploy");
          run(c, "systemPrompt");
          run(c, "verify");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "deployment" });
        },
      },
      {
        id: "late",
        title: "Upgrades the SDK and waits, then fixes the name after 11:00",
        reasoning: "partial",
        drive: (c) => {
          run(c, "reinstall");
          waitUntil(c, 46);
          run(c, "run");
          run(c, "deployments");
          run(c, "setDeployment");
          run(c, "verify");
          close(c);
          c.act("document", { cause: "deployment" });
        },
      },
      {
        id: "blind",
        title: "Changes the model parameter without reading anything or testing",
        reasoning: "missed",
        drive: (c) => {
          run(c, "setDeployment");
          waitUntil(c, 46);
          close(c);
          c.act("document", { cause: "sdk" });
        },
      },
    ],
  };
}
