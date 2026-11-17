// REQ-320: golden paths for CBA/plugin-token-marked-frontend on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "CBA", slug: "plugin-token-marked-frontend" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Network, README, PR diff, preview config, proxy, token rotated, verified",
        reasoning: "met",
        drive: (c) => {
          run(c, "network");
          run(c, "readme");
          run(c, "prDiff");
          run(c, "previewCfg");
          run(c, "proxy");
          run(c, "rotate");
          waitUntil(c, 20);
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "frontend" });
        },
      },
      {
        id: "mergePR",
        title: "Merges PR #88",
        reasoning: "missed",
        drive: (c) => {
          run(c, "network");
          run(c, "merge");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "frontend" });
        },
      },
      {
        id: "restart",
        title: "Restarts the backend and purges the cache",
        reasoning: "missed",
        drive: (c) => {
          run(c, "restart");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "cache" });
        },
      },
      {
        id: "noRotate",
        title: "Sees the 401, proxies and verifies, leaves the exposed token",
        reasoning: "partial",
        drive: (c) => {
          run(c, "network");
          run(c, "proxy");
          waitUntil(c, 15);
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "frontend" });
        },
      },
      {
        id: "late",
        title: "Restarts and waits, then proxies after 14:52",
        reasoning: "partial",
        drive: (c) => {
          run(c, "restart");
          waitUntil(c, 42);
          run(c, "prDiff");
          run(c, "proxy");
          waitUntil(c, 56);
          run(c, "verify");
          close(c);
          c.act("document", { cause: "frontend" });
        },
      },
      {
        id: "blind",
        title: "Proxies without reading anything or checking",
        reasoning: "missed",
        drive: (c) => {
          run(c, "proxy");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "network" });
        },
      },
    ],
  };
}
