// REQ-320: golden paths for AZ120/nva-route-between-sap-app-and-db on the terminal screen.
// No prototype exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "AZ120", slug: "nva-route-between-sap-app-and-db" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "niping, effective routes, accelerated networking, change log, the route removed, owner told, verified",
        reasoning: "met",
        drive: (c) => {
          run(c, "niping");
          run(c, "effective");
          run(c, "accel");
          run(c, "changeLog");
          run(c, "removeRoute");
          run(c, "tell");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "nva" });
        },
      },
      {
        id: "detachTable",
        title: "Detaches the whole route table",
        reasoning: "missed",
        drive: (c) => {
          run(c, "effective");
          run(c, "deleteTable");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "nva" });
        },
      },
      {
        id: "placement",
        title: "Redeploys into a proximity placement group",
        reasoning: "missed",
        drive: (c) => {
          run(c, "niping");
          run(c, "ppg");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "placement" });
        },
      },
      {
        id: "resizeFirst",
        title: "Resizes the app server, then finds and removes the route",
        reasoning: "partial",
        drive: (c) => {
          run(c, "effective");
          run(c, "resize");
          run(c, "removeRoute");
          run(c, "verify");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "nva" });
        },
      },
      {
        id: "late",
        title: "Resizes and waits, then removes the route after 09:30",
        reasoning: "partial",
        drive: (c) => {
          run(c, "resize");
          waitUntil(c, 51);
          run(c, "niping");
          run(c, "effective");
          run(c, "removeRoute");
          run(c, "verify");
          close(c);
          c.act("document", { cause: "nva" });
        },
      },
      {
        id: "resizeOnly",
        title: "Resizes and checks accelerated networking only",
        reasoning: "missed",
        drive: (c) => {
          run(c, "accel");
          run(c, "resize");
          waitUntil(c, 51);
          close(c);
          c.act("document", { cause: "accel" });
        },
      },
    ],
  };
}
