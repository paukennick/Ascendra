// REQ-333: golden paths for the MSHI A1c units case on the data console
// (MSHI/mshi-a1c-units-quality-dashboard.sim.json).
import type { StepsSpec } from "./steps.ts";
import { record, run } from "./data-helpers.ts";

export const ENTRY = { course: "MSHI", slug: "mshi-a1c-units-quality-dashboard" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Profile by lab (median 58), read the messages (59261-8, mmol/mol), convert in the view, check against the lab's reports, ticket, send",
        reasoning: "met",
        drive: (c) => {
          run(c, "profile");
          run(c, "messages");
          run(c, "rewrite", { f: "convert" });
          run(c, "check");
          run(c, "raise");
          run(c, "send");
          record(c, { cause: "units", check: "reconcile" });
        },
      },
      {
        id: "sendAsIs",
        title: "Trusts the dashboard and sends 41.2% to the committee",
        reasoning: "missed",
        drive: (c) => {
          run(c, "send");
          record(c, { cause: "real", check: "none" });
        },
      },
      {
        id: "overwrite",
        title: "Profiles, then rewrites the stored results as %, checks and sends",
        reasoning: "missed",
        drive: (c) => {
          run(c, "profile");
          run(c, "overwrite");
          run(c, "check");
          run(c, "send");
          record(c, { cause: "units", check: "reconcile" });
        },
      },
      {
        id: "exclude",
        title: "Reads the messages, leaves Harbor out, checks (640 patients now untested) and holds the dashboard",
        reasoning: "partial",
        drive: (c) => {
          run(c, "messages");
          run(c, "rewrite", { f: "exclude" });
          run(c, "check");
          run(c, "raise");
          record(c, { cause: "units", check: "none" });
        },
      },
      {
        id: "divide",
        title: "Reads the messages, divides mmol/mol by 10, sends 14.7% unchecked",
        reasoning: "missed",
        drive: (c) => {
          run(c, "messages");
          run(c, "rewrite", { f: "divide" });
          run(c, "send");
          record(c, { cause: "units", check: "lower" });
        },
      },
      {
        id: "lateChecked",
        title: "Converts first, then profiles and checks, waits on the ticket, and sends after 15:00",
        reasoning: "met",
        drive: (c) => {
          run(c, "rewrite", { f: "convert" });
          run(c, "profile");
          run(c, "check");
          run(c, "raise");
          for (let i = 0; i < 3; i++) run(c, "wait");
          run(c, "send");
          record(c, { cause: "units", check: "reconcile" });
        },
      },
      {
        id: "unchecked",
        title: "Profiles, converts and sends without a check or a ticket",
        reasoning: "partial",
        drive: (c) => {
          run(c, "profile");
          run(c, "rewrite", { f: "convert" });
          run(c, "send");
          record(c, { cause: "units", check: "lower" });
        },
      },
    ],
  };
}
