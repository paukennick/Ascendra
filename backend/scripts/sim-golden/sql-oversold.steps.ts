// REQ-269: golden paths for the SQL Fundamentals flash-sale lost update on
// the terminal screen (SQL/sql-flash-sale-oversold.sim.json). No prototype
// exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "SQL", slug: "sql-flash-sale-oversold" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Takes the book off sale, counts sales, finds the read-then-write in pg_stat_statements, deploys the conditional UPDATE, race test passes, reopens",
        reasoning: "met",
        drive: (c) => {
          run(c, "pause");
          run(c, "sold");
          run(c, "statements");
          run(c, "deployAtomic");
          run(c, "raceTest");
          run(c, "reopen");
          close(c);
          c.act("document", { cause: "lostUpdate", prevent: "atomicTest" });
        },
      },
      {
        id: "forUpdateNoTest",
        title: "Investigates first, then pauses, deploys SELECT ... FOR UPDATE and reopens without a race test",
        reasoning: "partial",
        drive: (c) => {
          run(c, "stock");
          run(c, "sold");
          run(c, "statements");
          run(c, "isolation");
          run(c, "pause");
          run(c, "deployForUpdate");
          run(c, "reopen");
          close(c);
          c.act("document", { cause: "lostUpdate", prevent: "atomicTest" });
        },
      },
      {
        id: "repeatableRead",
        title: "Pauses, resets the stock column to 500, switches the database to Repeatable Read with no retry; the race test shows errors; reopens",
        reasoning: "partial",
        drive: (c) => {
          run(c, "pause");
          run(c, "resetStock");
          run(c, "isolation");
          run(c, "deployRR");
          run(c, "raceTest");
          run(c, "reopen");
          close(c);
          c.act("document", { cause: "lostUpdate", prevent: "isolation" });
        },
      },
      {
        id: "deleteOrders",
        title: "Deletes the 37 newest paid order lines to make the count match, then fixes checkout",
        reasoning: "missed",
        drive: (c) => {
          run(c, "sold");
          run(c, "deleteOrders");
          run(c, "pause");
          run(c, "deployAtomic");
          run(c, "reopen");
          close(c);
          c.act("document", { cause: "negative", prevent: "nothing" });
        },
      },
      {
        id: "checkOnly",
        title: "Adds a CHECK (stock >= 0) while still on sale, and closes with checkout unchanged",
        reasoning: "missed",
        drive: (c) => {
          run(c, "stock");
          run(c, "addCheck");
          close(c);
          c.act("document", { cause: "negative", prevent: "nothing" });
        },
      },
      {
        id: "slowWhileSelling",
        title: "Leaves the book on sale while studying for 25 minutes: 100 copies oversold before the fix",
        reasoning: "partial",
        drive: (c) => {
          run(c, "stock");
          run(c, "sold");
          run(c, "statements");
          waitUntil(c, 22);
          run(c, "deployAtomic");
          run(c, "raceTest");
          close(c);
          c.act("document", { cause: "lostUpdate", prevent: "atomicTest" });
        },
      },
    ],
  };
}
