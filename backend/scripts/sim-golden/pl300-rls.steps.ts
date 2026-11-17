// REQ-312: golden paths for the PL300 row-level security case on the data
// and code console (PL300/pl300-rls-region-manager.sim.json). The edits are
// the editable cells' actions (one choice param each).
import type { StepsSpec } from "./steps.ts";
import { record, run } from "./data-helpers.ts";

export const ENTRY = { course: "PL300", slug: "pl300-rls-region-manager" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Access and roles first; managers to Viewer; the security group into the role; Priya confirms North only; tell the managers",
        reasoning: "met",
        drive: (c) => {
          run(c, "checkAccess");
          run(c, "checkRoles");
          run(c, "setGroupRole", { role: "viewer" });
          run(c, "mapRole", { who: "sg" });
          run(c, "askPriya");
          run(c, "ship");
          record(c, { cause: "member", check: "manager" });
        },
      },
      {
        id: "shipAsIs",
        title: "Assumes the role works and tells the managers without changing anything",
        reasoning: "missed",
        drive: (c) => {
          run(c, "checkRoles");
          run(c, "ship");
          record(c, { cause: "cache", check: "none" });
        },
      },
      {
        id: "dropMargins",
        title: "Removes the margin columns from the shared model to hide them",
        reasoning: "missed",
        drive: (c) => {
          run(c, "dropMargin");
          run(c, "askPriya");
          run(c, "ship");
          record(c, { cause: "filter", check: "manager" });
        },
      },
      {
        id: "viewerOnly",
        title: "Makes the group Viewer, tries the Microsoft 365 group (refused), checks, and sends empty reports",
        reasoning: "partial",
        drive: (c) => {
          run(c, "checkAccess");
          run(c, "setGroupRole", { role: "viewer" });
          run(c, "mapRole", { who: "m365" });
          run(c, "askPriya");
          run(c, "ship");
          record(c, { cause: "member", check: "manager" });
        },
      },
      {
        id: "lateUntested",
        title: "Fixes both settings without checking access first, waits, and tells the managers after 12:00 without a check",
        reasoning: "partial",
        drive: (c) => {
          run(c, "mapRole", { who: "sg" });
          run(c, "setGroupRole", { role: "viewer" });
          run(c, "checkAccess");
          for (let i = 0; i < 6; i++) run(c, "wait");
          run(c, "ship");
          record(c, { cause: "member", check: "desktop" });
        },
      },
      {
        id: "holdBack",
        title: "Removes the group from the workspace and sends nothing",
        reasoning: "partial",
        drive: (c) => {
          run(c, "checkAccess");
          run(c, "setGroupRole", { role: "removed" });
          run(c, "askPriya");
          record(c, { cause: "member", check: "none" });
        },
      },
    ],
  };
}
