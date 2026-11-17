// REQ-312: golden paths for the SQL NOT IN case on the data and code console
// (SQL/sql-not-in-null-empty-list.sim.json).
import type { StepsSpec } from "./steps.ts";
import { record, run } from "./data-helpers.ts";

export const ENTRY = { course: "SQL", slug: "sql-not-in-null-empty-list" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Run it (0 rows); count NULL customer_ids (212); NOT EXISTS; the independent count matches; send",
        reasoning: "met",
        drive: (c) => {
          run(c, "run");
          run(c, "nulls");
          run(c, "rewrite", { q: "notexists" });
          run(c, "count");
          run(c, "send");
          record(c, { cause: "null", check: "count" });
        },
      },
      {
        id: "sendEmpty",
        title: "Trusts the empty result and tells marketing nobody is inactive",
        reasoning: "missed",
        drive: (c) => {
          run(c, "run");
          run(c, "send");
          record(c, { cause: "all", check: "none" });
        },
      },
      {
        id: "deleteGuests",
        title: "Finds the NULLs and deletes the guest orders so NOT IN works",
        reasoning: "missed",
        drive: (c) => {
          run(c, "run");
          run(c, "nulls");
          run(c, "deleteGuests");
          run(c, "count");
          run(c, "send");
          record(c, { cause: "null", check: "count" });
        },
      },
      {
        id: "leftJoinWhere",
        title: "Rewrites as a LEFT JOIN with the date in WHERE, still gets 0 rows, counts, and holds back",
        reasoning: "partial",
        drive: (c) => {
          run(c, "run");
          run(c, "rewrite", { q: "leftwhere" });
          run(c, "run");
          run(c, "count");
          record(c, { cause: "date", check: "none" });
        },
      },
      {
        id: "notNullUnchecked",
        title: "Looks for NULLs, excludes them inside NOT IN, and sends without a count",
        reasoning: "met",
        drive: (c) => {
          run(c, "nulls");
          run(c, "rewrite", { q: "notnull" });
          run(c, "run");
          run(c, "send");
          record(c, { cause: "null", check: "rows" });
        },
      },
      {
        id: "lateChecked",
        title: "Rewrites first, then looks and counts, waits, and sends after 12:00",
        reasoning: "met",
        drive: (c) => {
          run(c, "rewrite", { q: "notexists" });
          run(c, "nulls");
          run(c, "count");
          for (let i = 0; i < 3; i++) run(c, "wait");
          run(c, "send");
          record(c, { cause: "null", check: "count" });
        },
      },
    ],
  };
}
