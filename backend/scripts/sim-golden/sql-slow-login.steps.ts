// REQ-269: golden paths for the SQL Fundamentals sign-in slowdown on the
// terminal screen (SQL/sql-slow-login-seq-scan.sim.json). No prototype
// exists, so the expectations are the engine's own results.
import type { StepsSpec } from "./steps.ts";
import { close, run, waitUntil } from "./terminal-helpers.ts";

export const ENTRY = { course: "SQL", slug: "sql-slow-login-seq-scan" };

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "pg_stat_activity, the indexes, EXPLAIN ANALYZE shows a Seq Scan filtering on lower(email); CREATE INDEX CONCURRENTLY on lower(email); EXPLAIN and pg_stat_statements confirm",
        reasoning: "met",
        drive: (c) => {
          run(c, "activity");
          run(c, "describe");
          run(c, "explainAnalyze");
          run(c, "createConc");
          run(c, "explain");
          run(c, "verify");
          close(c);
          c.act("document", { cause: "expression", prevent: "explainReview" });
        },
      },
      {
        id: "plainIndex",
        title: "Reads the plan, then builds the index without CONCURRENTLY: orders wait on the write lock for six minutes",
        reasoning: "partial",
        drive: (c) => {
          run(c, "explain");
          run(c, "createPlain");
          run(c, "verify");
          close(c);
          c.act("document", { cause: "expression", prevent: "biggerPool" });
        },
      },
      {
        id: "vacuumFull",
        title: "Blames bloat and runs VACUUM FULL: the whole table is locked during the sale, then builds the index",
        reasoning: "missed",
        drive: (c) => {
          run(c, "activity");
          run(c, "vacuumFull");
          run(c, "createConc");
          close(c);
          c.act("document", { cause: "bloat", prevent: "nothing" });
        },
      },
      {
        id: "statsOnly",
        title: "Runs ANALYZE and turns enable_seqscan off in its own session, sees nothing change and closes with sign-in still slow",
        reasoning: "missed",
        drive: (c) => {
          run(c, "analyzeStats");
          run(c, "seqOff");
          run(c, "explain");
          close(c);
          c.act("document", { cause: "stats", prevent: "nothing" });
        },
      },
      {
        id: "lateFix",
        title: "Looks around slowly; the sale email lands at 11:35 and exhausts the pool before the concurrent index is built",
        reasoning: "partial",
        drive: (c) => {
          run(c, "activity");
          run(c, "describe");
          waitUntil(c, 30);
          run(c, "explain");
          run(c, "createConc");
          run(c, "verify");
          close(c);
          c.act("document", { cause: "expression", prevent: "explainReview" });
        },
      },
      {
        id: "guessed",
        title: "Guesses the expression index and builds it concurrently without reading the plan or checking it afterward",
        reasoning: "partial",
        drive: (c) => {
          run(c, "createConc");
          close(c);
          c.act("document", { cause: "expression", prevent: "explainReview" });
        },
      },
    ],
  };
}
