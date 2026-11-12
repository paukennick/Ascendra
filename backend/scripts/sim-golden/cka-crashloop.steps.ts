// REQ-237: golden paths for the CKA CrashLoopBackOff outage on the terminal
// screen (CKA/crashloop-bad-configmap.sim.json). No prototype exists, so the
// expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "CKA", slug: "crashloop-bad-configmap" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "get pods, describe (exit 1, envFrom), logs --previous names LISTEN_PORT 8O80, ConfigMap and Service read, set 8080, rollout restart, verify",
        reasoning: "met",
        drive: (c) => {
          run(c, "getPods");
          run(c, "describe");
          run(c, "logsPrev");
          run(c, "getCm");
          run(c, "getSvc");
          run(c, "editCm", { port: "p8080" });
          run(c, "rolloutRestart");
          run(c, "rolloutStatus");
          run(c, "verify");
          close(c);
          c.act("document", { cause: "configTypo", lesson: "validate" });
        },
      },
      {
        id: "undoFirst",
        title: "Rolls back first (the ConfigMap stays wrong), then reads the log, fixes the value and restarts",
        reasoning: "partial",
        drive: (c) => {
          run(c, "getPods");
          run(c, "rolloutUndo");
          run(c, "getPods");
          run(c, "logsPrev");
          run(c, "editCm", { port: "p8080" });
          run(c, "rolloutRestart");
          run(c, "verify");
          close(c);
          c.act("document", { cause: "configTypo", lesson: "undo" });
        },
      },
      {
        id: "wrongPort",
        title: "Reads the log, sets port 80 (pods never Ready), checks the Service, corrects to 8080",
        reasoning: "partial",
        drive: (c) => {
          run(c, "getPods");
          run(c, "logsPrev");
          run(c, "editCm", { port: "p80" });
          run(c, "rolloutRestart");
          run(c, "getPods");
          run(c, "getSvc");
          run(c, "editCm", { port: "p8080" });
          run(c, "rolloutRestart");
          run(c, "verify");
          close(c);
          c.act("document", { cause: "configTypo", lesson: "validate" });
        },
      },
      {
        id: "deleteAll",
        title: "Deletes every orders-api pod to 'refresh' them while the value is still wrong: no ready pods",
        reasoning: "missed",
        drive: (c) => {
          run(c, "getPods");
          run(c, "deletePods");
          run(c, "getPods");
          run(c, "verify");
          close(c);
          c.act("document", { cause: "image", lesson: "nothing" });
        },
      },
      {
        id: "slowSale",
        title: "Describes a pod and waits for the teammate: the 10:40 sale starts short, then fixes it",
        reasoning: "partial",
        drive: (c) => {
          run(c, "getPods");
          run(c, "describe");
          waitUntil(c, 41);
          run(c, "logsPrev");
          run(c, "editCm", { port: "p8080" });
          run(c, "rolloutRestart");
          run(c, "verify");
          close(c);
          c.act("document", { cause: "configTypo", lesson: "validate" });
        },
      },
      {
        id: "closeAfterUndo",
        title: "Runs rollout undo, sees 'rolled back' and closes with the new pod still crashing",
        reasoning: "missed",
        drive: (c) => {
          run(c, "getPods");
          run(c, "rolloutUndo");
          run(c, "rolloutStatus");
          close(c);
          c.act("document", { cause: "configTypo", lesson: "undo" });
        },
      },
    ],
  };
}
