// REQ-265 / REQ-267: two technology-aligned skill courses with no exam,
// built on Nick's approval of 2026-11-14 the way PYTHON and JAVASCRIPT are
// (data.ts, REQ-142 / REQ-244): weekly units, a gate per unit, dated
// reference sources with the key values a lesson writer would otherwise
// remember from an older version, a language_reference curriculum and the
// 12-month review interval Nick chose for technology_aligned courses on
// 2026-11-11.
//
// SQL fundamentals (SQL). Anchored to the SQL standard and to PostgreSQL's
// documentation. The standard itself (ISO/IEC 9075) is sold by ISO and was
// not read; iso.org's catalogue page answered with a bot check to a plain
// fetch on 2026-11-14. What we use about it -- that the current edition is
// SQL:2023, and the list of its parts -- was read in PostgreSQL's own
// "Appendix D. SQL Conformance" (docs/current/features.html, PostgreSQL 18,
// read 2026-11-14). Every PostgreSQL page below was read in full as raw
// HTML on 2026-11-14 from postgresql.org/docs/current/, which served the
// PostgreSQL 18.7 documentation; postgresql.org/support/versioning (read the
// same day) lists 18 as the newest supported major (18.7, released
// 2026-11-12), 14 reaching end of life on 2026-11-12, and 19 at release
// candidate 2. Units teach the standard's portable SQL first and name
// PostgreSQL behavior where it is PostgreSQL's (generated-column defaults,
// RETURNING, ON CONFLICT, skip scan, uuidv7).
//
// TypeScript and Node.js (TSNODE), the step after JAVASCRIPT. Read
// 2026-11-14: the TypeScript handbook pages and the tsconfig reference on
// typescriptlang.org (raw HTML), "Announcing TypeScript 7.0"
// (devblogs.microsoft.com, 2026-07-08), the npm registry's dist-tags for
// typescript (latest 7.0.2, beta 7.1.0-beta), and the Node.js v26.13.1 API
// docs (TypeScript, ESM, packages, CLI, process, test, fs, stream, events,
// http) with the release schedule (github.com/nodejs/Release schedule.json:
// 26 is Active LTS since 2026-10-28, 24 entered maintenance 2026-10-20, 22
// ends 2027-04-30, 20 ended 2026-04-30).

import type { SeedTrack, UnitSource } from "../data";

const CHECKED = "2026-11-14";
const VERIFIED_AT = "2026-11-14T00:00:00Z";
const REVIEW_DUE_AT = "2027-11-14T00:00:00Z";

const ref = (title: string, url: string, keyValues?: string[]): UnitSource =>
  keyValues ? { title, url, kind: "reference", checkedAt: CHECKED, keyValues } : { title, url, kind: "reference", checkedAt: CHECKED };

// ---------------------------------------------------------------------------
// SQL
// ---------------------------------------------------------------------------
const PGD = "https://www.postgresql.org/docs/current/";
const PG = {
  versions: ref("PostgreSQL versioning policy and supported releases", "https://www.postgresql.org/support/versioning/", [
    "PostgreSQL 18 is the newest supported major release (18.7, 2026-11-12); 19 is at release candidate; 14 reached end of life on 2026-11-12; each major is supported for five years",
  ]),
  conformance: ref("PostgreSQL 18: Appendix D. SQL Conformance", `${PGD}features.html`, [
    "The SQL standard is ISO/IEC 9075 \"Database Language SQL\"; its most recent edition is SQL:2023 (ISO/IEC 9075:2023), and each edition replaces the previous one",
  ]),
  concepts: ref("PostgreSQL 18: 2.2 Concepts", `${PGD}tutorial-concepts.html`),
  tableExpressions: ref("PostgreSQL 18: 7.2 Table Expressions (FROM, joins, WHERE, GROUP BY, HAVING)", `${PGD}queries-table-expressions.html`, [
    "For an outer join, a condition in ON decides which rows match before NULL-filling, while the same condition in WHERE is applied after the join and removes the NULL-filled rows, turning a LEFT JOIN into an inner join in effect",
  ]),
  selectLists: ref("PostgreSQL 18: 7.3 Select Lists", `${PGD}queries-select-lists.html`),
  order: ref("PostgreSQL 18: 7.5 Sorting Rows (ORDER BY)", `${PGD}queries-order.html`, [
    "By default NULLs sort as if larger than any non-null value: NULLS LAST for ascending order and NULLS FIRST for DESC; write NULLS FIRST or NULLS LAST to choose",
    "Without ORDER BY the order of result rows is not guaranteed",
  ]),
  limit: ref("PostgreSQL 18: 7.6 LIMIT and OFFSET", `${PGD}queries-limit.html`, [
    "LIMIT without ORDER BY returns an unpredictable subset; the standard spelling is FETCH FIRST n ROWS ONLY",
  ]),
  select: ref("PostgreSQL 18: SELECT", `${PGD}sql-select.html`),
  comparison: ref("PostgreSQL 18: 9.2 Comparison Functions and Operators", `${PGD}functions-comparison.html`, [
    "Ordinary comparisons with NULL yield NULL (unknown), not true or false: 7 = NULL and NULL = NULL are both NULL; test with IS NULL / IS NOT NULL",
    "a IS DISTINCT FROM b treats NULL as a comparable value: NULL IS DISTINCT FROM NULL is false and 1 IS DISTINCT FROM NULL is true",
  ]),
  conditional: ref("PostgreSQL 18: 9.18 Conditional Expressions (CASE, COALESCE, NULLIF)", `${PGD}functions-conditional.html`),
  subquery: ref("PostgreSQL 18: 9.24 Subquery Expressions (EXISTS, IN, NOT IN, ANY, ALL)", `${PGD}functions-subquery.html`, [
    "x NOT IN (subquery) is NULL, never true, when no row equals x and at least one subquery row is NULL, so a WHERE ... NOT IN filter returns no rows; NOT EXISTS has no such trap",
  ]),
  aggregates: ref("PostgreSQL 18: 9.21 Aggregate Functions", `${PGD}functions-aggregate.html`, [
    "Except for count, aggregates return NULL when no rows are selected: sum of no rows is NULL, not 0; wrap with coalesce(sum(x), 0)",
    "count(*) counts rows; count(expr) counts rows where expr is not NULL",
  ]),
  tutorialAgg: ref("PostgreSQL 18: 2.7 Aggregate Functions (WHERE vs HAVING, FILTER)", `${PGD}tutorial-agg.html`, [
    "WHERE filters input rows before groups and aggregates are computed; HAVING filters groups after; an aggregate cannot appear in WHERE",
  ]),
  join: ref("PostgreSQL 18: 2.6 Joins Between Tables", `${PGD}tutorial-join.html`),
  with: ref("PostgreSQL 18: 7.8 WITH Queries (Common Table Expressions)", `${PGD}queries-with.html`, [
    "A side-effect-free, non-recursive WITH query referenced once is folded into the outer query by default; MATERIALIZED forces a separate computation and NOT MATERIALIZED forces folding",
  ]),
  union: ref("PostgreSQL 18: 7.4 Combining Queries (UNION, INTERSECT, EXCEPT)", `${PGD}queries-union.html`, [
    "UNION, INTERSECT and EXCEPT remove duplicate rows unless ALL is written; UNION ALL keeps them and avoids the sort or hash that de-duplication needs",
  ]),
  tutorialWindow: ref("PostgreSQL 18: 3.5 Window Functions (tutorial)", `${PGD}tutorial-window.html`, [
    "Window functions run after WHERE, GROUP BY and HAVING; to filter on a window function's result, compute it in a subquery or CTE and filter outside",
  ]),
  windowFunctions: ref("PostgreSQL 18: 9.22 Window Functions", `${PGD}functions-window.html`, [
    "row_number numbers rows 1, 2, 3 even when they tie; rank leaves gaps after ties (1, 1, 3); dense_rank does not (1, 1, 2)",
  ]),
  windowSyntax: ref("PostgreSQL 18: 4.2.8 Window Function Calls (frames)", `${PGD}sql-expressions.html`, [
    "The default frame is RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW: with ORDER BY it runs to the current row's last peer, so tied rows share a running total; write ROWS BETWEEN ... for a per-row running total; without ORDER BY the frame is the whole partition",
  ]),
  constraints: ref("PostgreSQL 18: 5.5 Constraints", `${PGD}ddl-constraints.html`, [
    "A UNIQUE constraint treats NULLs as distinct by default, so several rows may hold NULL in a unique column; UNIQUE NULLS NOT DISTINCT (PostgreSQL 15+) allows only one",
    "A CHECK constraint is satisfied when its expression is true or NULL",
  ]),
  numeric: ref("PostgreSQL 18: 8.1 Numeric Types", `${PGD}datatype-numeric.html`, [
    "numeric (decimal) stores exact values and is recommended for money and other amounts that need exactness; real and double precision are inexact binary floating point",
  ]),
  generated: ref("PostgreSQL 18: 5.4 Generated Columns", `${PGD}ddl-generated-columns.html`, [
    "New in PostgreSQL 18: a generated column is VIRTUAL (computed when read, no storage) by default; write STORED to compute it on write; PostgreSQL 17 and earlier had stored generated columns only",
  ]),
  insert: ref("PostgreSQL 18: INSERT (ON CONFLICT, RETURNING)", `${PGD}sql-insert.html`),
  returning: ref("PostgreSQL 18: 6.4 Returning Data from Modified Rows", `${PGD}dml-returning.html`, [
    "New in PostgreSQL 18: RETURNING can name old and new explicitly (RETURNING old.price, new.price) in INSERT, UPDATE, DELETE and MERGE",
  ]),
  uuid: ref("PostgreSQL 18: 9.14 UUID Functions", `${PGD}functions-uuid.html`, [
    "New in PostgreSQL 18: uuidv7() generates timestamp-ordered UUIDs; gen_random_uuid() (v4) is random",
  ]),
  indexesIntro: ref("PostgreSQL 18: 11.1 Indexes, Introduction", `${PGD}indexes-intro.html`, [
    "Indexes speed reads but add overhead to every insert, update and delete, so create only the ones queries use; check with EXPLAIN",
  ]),
  indexTypes: ref("PostgreSQL 18: 11.2 Index Types", `${PGD}indexes-types.html`, [
    "CREATE INDEX builds a B-tree unless USING names another type; a B-tree serves equality and range comparisons and LIKE 'abc%' patterns anchored at the start, not LIKE '%abc'",
  ]),
  multicolumn: ref("PostgreSQL 18: 11.3 Multicolumn Indexes", `${PGD}indexes-multicolumn.html`, [
    "A multicolumn B-tree index is most efficient with conditions on its leading (leftmost) columns; PostgreSQL 18 can also use skip scan when a leading column has no condition, but column order still matters",
  ]),
  transactions: ref("PostgreSQL 18: 3.4 Transactions", `${PGD}tutorial-transactions.html`, [
    "BEGIN starts a transaction block, COMMIT makes its changes visible together and ROLLBACK discards them; SAVEPOINT and ROLLBACK TO SAVEPOINT undo part of a transaction",
  ]),
  isolation: ref("PostgreSQL 18: 13.2 Transaction Isolation", `${PGD}transaction-iso.html`, [
    "Read Committed is PostgreSQL's default isolation level: each statement sees data committed before that statement began, so two SELECTs in one transaction can see different data",
    "PostgreSQL's Read Uncommitted behaves like Read Committed (no dirty reads at any level); Repeatable Read and Serializable transactions can fail with a serialization error and must be retried",
  ]),
};

export const SQL_TRACK: SeedTrack = {
  code: "SQL",
  title: "SQL Fundamentals Coach",
  description:
    "8-week SQL foundations course: the relational model, querying with SELECT, NULL and three-valued logic, joins, grouping, subqueries and CTEs, window functions, schema design with constraints, and indexes and transactions -- standard SQL first, run on PostgreSQL.",
  trackType: "graduate",
  subcategorySlug: "database-design-development",
  freshnessModel: "technology_aligned",
  sourceVerifiedAt: VERIFIED_AT,
  contentReviewDueAt: REVIEW_DUE_AT,
  curriculum: {
    kind: "language_reference",
    name: "ISO/IEC 9075 Database Language SQL (SQL:2023), as documented by PostgreSQL",
    version: "SQL:2023; PostgreSQL 18 (18.7)",
    url: `${PGD}`,
    checkedAt: CHECKED,
  },
  units: [
    {
      title: "The relational model & first queries",
      rangeLabel: "Week 1",
      gate: "Given a small schema and a plain-language question, write the SELECT that answers it with the right columns, filter, sort and row limit, and explain why the answer would be unreliable without ORDER BY.",
      sources: [PG.versions, PG.conformance, PG.concepts, PG.selectLists, PG.order, PG.limit, PG.select],
      objectives: [
        "Describe relations, rows, columns, primary keys and foreign keys, and why a table has no inherent row order",
        "Write SELECT ... FROM ... WHERE queries with comparison, BETWEEN, IN and LIKE conditions",
        "Combine conditions with AND, OR and NOT using parentheses to get the intended precedence",
        "Sort results with ORDER BY on one or more columns, ascending and descending",
        "Limit and page results with LIMIT/OFFSET or FETCH FIRST, always paired with ORDER BY",
        "Compute columns with expressions, aliases and DISTINCT, and explain the logical order in which a SELECT is evaluated",
      ],
    },
    {
      title: "NULL & three-valued logic",
      rangeLabel: "Week 2",
      gate: "Given a query over columns that contain NULLs, predict exactly which rows each condition keeps, then rewrite any condition that silently drops rows so it answers the question asked.",
      sources: [PG.comparison, PG.conditional, PG.order, PG.subquery],
      objectives: [
        "Evaluate comparisons and AND, OR, NOT when an operand is NULL, using true, false and unknown",
        "Test for missing values with IS NULL, IS NOT NULL and IS DISTINCT FROM instead of = NULL",
        "Replace or produce NULLs with COALESCE and NULLIF, including safe division",
        "Write searched and simple CASE expressions, and predict the result when no branch matches",
        "Control where NULLs sort with NULLS FIRST and NULLS LAST",
        "Diagnose a NOT IN filter that returns nothing because the list contains a NULL, and fix it with NOT EXISTS",
      ],
    },
    {
      title: "Joining tables",
      rangeLabel: "Week 3",
      gate: "Given two or three related tables, write the join that answers a question, choose inner or outer correctly, and explain any rows that are missing or duplicated in a draft query.",
      sources: [PG.join, PG.tableExpressions],
      objectives: [
        "Write inner joins on key columns with table aliases and qualified column names",
        "Use LEFT, RIGHT and FULL outer joins to keep unmatched rows, and find rows with no match",
        "Explain why a condition on the outer table belongs in ON rather than WHERE for a LEFT JOIN",
        "Join a table to itself to relate rows such as employees and their managers",
        "Recognize row multiplication when joining to a many-side table and correct the totals it inflates",
        "Use CROSS JOIN deliberately and recognize an accidental Cartesian product",
      ],
    },
    {
      title: "Aggregation & grouping",
      rangeLabel: "Week 4",
      gate: "Given a reporting question, write the GROUP BY query that answers it, put each condition in WHERE or HAVING correctly, and explain any count or sum that differs from what a reader expected.",
      sources: [PG.aggregates, PG.tutorialAgg, PG.tableExpressions],
      objectives: [
        "Summarize rows with count, sum, avg, min and max, and tell count(*) from count(column)",
        "Group rows with GROUP BY and list only grouped columns or aggregates in the select list",
        "Filter rows with WHERE before grouping and groups with HAVING after, and choose correctly between them",
        "Compute conditional counts and sums with FILTER (WHERE ...) or CASE inside an aggregate",
        "Handle empty groups and NULL inputs, returning 0 instead of NULL where a report needs it",
      ],
    },
    {
      title: "Subqueries, CTEs & set operations",
      rangeLabel: "Week 5",
      gate: "Given a multi-step question, write it as a readable WITH query or subquery, choose EXISTS, IN or a join for each membership test, and combine result sets with the right set operator.",
      sources: [PG.subquery, PG.with, PG.union],
      objectives: [
        "Use scalar subqueries in SELECT and WHERE, and predict the error when one returns more than one row",
        "Test membership with IN, EXISTS and NOT EXISTS, including correlated subqueries",
        "Break a multi-step query into named steps with WITH (common table expressions)",
        "Walk a hierarchy such as an org chart or category tree with WITH RECURSIVE",
        "Combine results with UNION, UNION ALL, INTERSECT and EXCEPT, and choose ALL when duplicates matter",
      ],
    },
    {
      title: "Window functions",
      rangeLabel: "Week 6",
      gate: "Given an analytics question (rank within a group, running total, change from the previous row, top N per group), write the window-function query, set the frame correctly, and explain why a GROUP BY would not answer it.",
      sources: [PG.tutorialWindow, PG.windowFunctions, PG.windowSyntax],
      objectives: [
        "Explain how a window function computes over related rows without collapsing them, unlike GROUP BY",
        "Partition and order a window with PARTITION BY and ORDER BY inside OVER",
        "Rank rows with row_number, rank and dense_rank, and predict how each treats ties",
        "Compare a row with its neighbors using lag and lead",
        "Calculate running totals and moving averages with an explicit ROWS frame",
        "Select the top N rows per group by filtering a ranked subquery or CTE",
      ],
    },
    {
      title: "Schema design: DDL, data types & constraints",
      rangeLabel: "Week 7",
      gate: "Given a set of business rules, write the CREATE TABLE statements whose types and constraints enforce them, then write the INSERT, UPDATE and DELETE statements that change the data safely, and say which rule each constraint protects.",
      sources: [PG.numeric, PG.constraints, PG.generated, PG.insert, PG.returning, PG.uuid],
      objectives: [
        "Create and alter tables, choosing data types for money, text, dates and timestamps with time zone",
        "Enforce rules with NOT NULL, DEFAULT, CHECK, UNIQUE and PRIMARY KEY constraints",
        "Link tables with FOREIGN KEY constraints and choose ON DELETE RESTRICT, CASCADE or SET NULL",
        "Insert, update and delete rows safely, including RETURNING and INSERT ... ON CONFLICT",
        "Design a normalized schema that removes repeated data, and explain when a generated column fits",
      ],
    },
    {
      title: "Indexes & transactions",
      rangeLabel: "Week 8",
      gate: "Given a slow query, its EXPLAIN output and a concurrent update scenario, propose the index that helps and say what it costs, then wrap the update in a transaction that cannot lose a change, explaining the isolation level you rely on.",
      sources: [PG.indexesIntro, PG.indexTypes, PG.multicolumn, PG.transactions, PG.isolation],
      objectives: [
        "Explain how a B-tree index speeds lookups and range scans and what it costs on writes and storage",
        "Design a multicolumn index whose column order matches the query's filters and sort",
        "Read EXPLAIN output to tell a sequential scan from an index scan, and recognize filters that cannot use an index",
        "Group statements into a transaction with BEGIN, COMMIT, ROLLBACK and SAVEPOINT, and explain atomicity",
        "Prevent a lost update with SELECT ... FOR UPDATE or a single atomic UPDATE, and compare isolation levels",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// TypeScript and Node.js
// ---------------------------------------------------------------------------
const TSH = "https://www.typescriptlang.org/docs/handbook/";
const NODE = "https://nodejs.org/api/";
const TS = {
  release7: ref("Announcing TypeScript 7.0 (TypeScript team, 2026-07-08)", "https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/", [
    "TypeScript 7 (7.0.2 is the latest release on npm; 7.1 is in beta) is the native Go port of the compiler, typically 8-12x faster on full builds; it ships no programmatic API yet, so tools that embed TypeScript (Vue, Svelte, Astro, MDX language tooling, typescript-eslint) still run on 6.0 via @typescript/typescript6",
    "TypeScript 6.0 and 7.0 defaults: strict is true, module is esnext, target is the latest stable ECMAScript, types is [] (list @types packages such as \"node\" explicitly) and rootDir is ./",
    "Removed in 7.0 (deprecated in 6.0): target es5, moduleResolution node/node10 and classic (use nodenext or bundler), module amd/umd/systemjs/none, baseUrl, and esModuleInterop: false",
  ]),
  tsconfig: ref("TSConfig reference", "https://www.typescriptlang.org/tsconfig/", [
    "strict defaults to true and switches on the strict family (strictNullChecks, noImplicitAny and others); erasableSyntaxOnly makes enums, parameter properties and runtime namespaces errors",
  ]),
  everyday: ref("TypeScript handbook: Everyday Types", `${TSH}2/everyday-types.html`, [
    "Type annotations are erased when TypeScript is compiled or stripped: they never check values at run time",
  ]),
  narrowing: ref("TypeScript handbook: Narrowing", `${TSH}2/narrowing.html`, [
    "A discriminated union narrows on a shared literal property; assigning the leftover value to a variable of type never in a default branch makes a missing case a compile error",
  ]),
  objects: ref("TypeScript handbook: Object Types", `${TSH}2/objects.html`),
  functions: ref("TypeScript handbook: More on Functions", `${TSH}2/functions.html`, [
    "unknown represents any value but nothing may be done with it until it is narrowed; any switches checking off",
  ]),
  satisfies: ref("TypeScript 4.9 release notes: the satisfies operator", `${TSH}release-notes/typescript-4-9.html`, [
    "expr satisfies Type checks that the expression matches the type without changing the type inferred for it (unlike an annotation, which widens it to the annotated type)",
  ]),
  generics: ref("TypeScript handbook: Generics", `${TSH}2/generics.html`),
  keyof: ref("TypeScript handbook: Keyof Type Operator", `${TSH}2/keyof-types.html`),
  conditional: ref("TypeScript handbook: Conditional Types", `${TSH}2/conditional-types.html`),
  mapped: ref("TypeScript handbook: Mapped Types", `${TSH}2/mapped-types.html`),
  templateLiteral: ref("TypeScript handbook: Template Literal Types", `${TSH}2/template-literal-types.html`, [
    "Since TypeScript 7.0, inference from template literal types splits strings by Unicode code point, so an emoji is one unit rather than two UTF-16 halves",
  ]),
  utility: ref("TypeScript handbook: Utility Types", `${TSH}utility-types.html`),
  classes: ref("TypeScript handbook: Classes", `${TSH}2/classes.html`, [
    "private and protected are compile-time only; a #name private field is enforced by JavaScript at run time",
  ]),
  enums: ref("TypeScript handbook: Enums", `${TSH}enums.html`, [
    "An enum generates JavaScript at run time, so Node.js type stripping rejects it; a union of string literals or an as const object is erasable",
  ]),
  modules: ref("TypeScript handbook: Modules (theory)", `${TSH}modules/theory.html`),
  declarations: ref("TypeScript handbook: Declaration Files", `${TSH}declaration-files/introduction.html`),
  nodeTs: ref("Node.js v26 API: Modules: TypeScript (type stripping)", `${NODE}typescript.html`, [
    "Type stripping is on by default and stable (since v25.2.0 and v24.12.0): node file.ts runs files that use only erasable syntax, does no type checking and ignores tsconfig.json",
    "Under type stripping, imports need the .ts extension, type-only imports need the type keyword, and enums, runtime namespaces, parameter properties and import aliases raise ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX; Node.js refuses .ts files under node_modules",
  ]),
  nodeEsm: ref("Node.js v26 API: Modules: ECMAScript modules", `${NODE}esm.html`),
  nodePackages: ref("Node.js v26 API: Modules: Packages", `${NODE}packages.html`, [
    "A .js file is an ES module when the nearest package.json has \"type\": \"module\", otherwise CommonJS; .mjs/.mts are always ES modules and .cjs/.cts always CommonJS",
  ]),
  nodeReleases: ref("Node.js release schedule", "https://github.com/nodejs/Release", [
    "Node.js 26 is Active LTS (since 2026-10-28, maintenance from 2027-10-20, end of life 2029-04-30); 24 is in maintenance until 2028-04-30; 22 ends 2027-04-30; 20 reached end of life on 2026-04-30",
    "From Node.js 27 there is one major release a year and every major becomes LTS",
  ]),
  nodeProcess: ref("Node.js v26 API: process", `${NODE}process.html`, [
    "An unhandled promise rejection is raised as an uncaught exception and ends the process by default (--unhandled-rejections=throw)",
  ]),
  nodeCli: ref("Node.js v26 API: Command-line options (--env-file)", `${NODE}cli.html`, [
    "node --env-file=.env app.js loads environment variables from a file (stable since v24.10.0 and v22.21.0); a variable already set in the environment wins over the file",
  ]),
  nodeEvents: ref("Node.js v26 API: Events", `${NODE}events.html`),
  nodeFs: ref("Node.js v26 API: File system (fs/promises)", `${NODE}fs.html`),
  nodeStream: ref("Node.js v26 API: Stream (pipeline)", `${NODE}stream.html`, [
    "stream.pipeline (or pipeline from node:stream/promises) connects streams, forwards errors and destroys every stream on failure; prefer it to chained .pipe() calls",
  ]),
  nodeHttp: ref("Node.js v26 API: HTTP", `${NODE}http.html`),
  nodeTest: ref("Node.js v26 API: Test runner (node:test)", `${NODE}test.html`, [
    "node:test is stable (since Node.js 20); node --test runs test files, and assert comes from node:assert/strict",
  ]),
  nodeGlobals: ref("Node.js v26 API: Global objects (fetch)", `${NODE}globals.html`),
};

export const TSNODE_TRACK: SeedTrack = {
  code: "TSNODE",
  title: "TypeScript & Node.js Programming Coach",
  description:
    "7-week step after the JavaScript course: TypeScript's type system from annotations and narrowing to generics and advanced types, ES modules and project setup, the Node.js runtime and core APIs, and a tested HTTP API written in TypeScript.",
  trackType: "graduate",
  subcategorySlug: "programming-languages",
  freshnessModel: "technology_aligned",
  sourceVerifiedAt: VERIFIED_AT,
  contentReviewDueAt: REVIEW_DUE_AT,
  curriculum: {
    kind: "language_reference",
    name: "The TypeScript handbook and the Node.js API documentation (current LTS)",
    version: "TypeScript 7.0; Node.js 26 LTS",
    url: "https://www.typescriptlang.org/docs/handbook/intro.html",
    checkedAt: CHECKED,
  },
  units: [
    {
      title: "TypeScript setup & the type system",
      rangeLabel: "Week 1",
      gate: "Given a JavaScript file and a tsconfig.json, convert the file to TypeScript under strict mode, explain each compiler error you fix, and say which checks would still be missing at run time.",
      sources: [TS.release7, TS.tsconfig, TS.everyday, TS.functions],
      objectives: [
        "Set up a TypeScript project with tsc and tsconfig.json, and explain what the strict, types and rootDir defaults change",
        "Annotate variables, parameters and return values, and decide when to rely on inference instead",
        "Use primitive, array, tuple and literal types, and type an object with a type alias or interface",
        "Choose unknown over any for untrusted values, and narrow before using them",
        "Explain that types are erased before code runs, so run-time input still needs checking",
      ],
    },
    {
      title: "Object types, unions & narrowing",
      rangeLabel: "Week 2",
      gate: "Given an API response that can take several shapes, model it as a discriminated union, write the function that handles every shape, and show the compile error a forgotten case produces.",
      sources: [TS.objects, TS.narrowing, TS.everyday, TS.satisfies],
      objectives: [
        "Model data with interfaces and type aliases, including optional, readonly and index-signature properties",
        "Combine types with unions and intersections, and use literal types to restrict values",
        "Narrow a union with typeof, in, instanceof, equality checks and truthiness",
        "Design a discriminated union and check exhaustiveness with never",
        "Write a type predicate to validate untrusted data, and use satisfies to check a value without widening it",
      ],
    },
    {
      title: "Functions & generics",
      rangeLabel: "Week 3",
      gate: "Given repeated helper functions that differ only by type, replace them with one generic function with the right constraint, and use keyof and utility types so a wrong property name fails to compile.",
      sources: [TS.functions, TS.generics, TS.keyof, TS.utility],
      objectives: [
        "Type function parameters, optional and default parameters, rest parameters and callbacks",
        "Write generic functions and constrain type parameters with extends",
        "Build generic types and interfaces such as a typed result or repository",
        "Use keyof and indexed access types to tie a property name to its value type",
        "Apply utility types (Partial, Required, Pick, Omit, Record, ReturnType) instead of repeating shapes",
      ],
    },
    {
      title: "Advanced types & classes",
      rangeLabel: "Week 4",
      gate: "Given a model that repeats one shape in several variants, derive the variants with mapped and conditional types, and write a class hierarchy whose public surface is checked by an interface -- explaining which protections exist only at compile time.",
      sources: [TS.mapped, TS.conditional, TS.templateLiteral, TS.classes, TS.enums, TS.tsconfig],
      objectives: [
        "Derive new types with mapped types, including readonly and optional modifiers",
        "Write conditional types with infer to extract parts of another type",
        "Use template literal types to constrain string formats such as event names",
        "Write classes with access modifiers, readonly fields, abstract members and implements, and tell private from #private",
        "Choose a union of string literals or an as const object over an enum when code must stay erasable",
      ],
    },
    {
      title: "Modules & project structure",
      rangeLabel: "Week 5",
      gate: "Given a small multi-file project that fails to start under Node.js, fix its package.json, imports and tsconfig so that it runs with node directly and type-checks with tsc, and explain why each change was needed.",
      sources: [TS.modules, TS.declarations, TS.nodeTs, TS.nodeEsm, TS.nodePackages, TS.release7],
      objectives: [
        "Configure ES modules and CommonJS in Node.js with package.json type and file extensions",
        "Write imports that work under nodenext resolution, including .ts extensions and import type",
        "Run TypeScript with Node.js type stripping, and recognize the syntax it rejects",
        "Use declaration files and @types packages, and list them explicitly in tsconfig types",
        "Organize a project into source, test and build folders with rootDir, outDir and npm scripts",
      ],
    },
    {
      title: "The Node.js runtime & core APIs",
      rangeLabel: "Week 6",
      gate: "Given a script that reads a large file, processes it and writes results, rewrite it with fs/promises and stream pipeline so memory stays flat and every error ends the process cleanly, and explain how the event loop runs it.",
      sources: [TS.nodeReleases, TS.nodeProcess, TS.nodeCli, TS.nodeEvents, TS.nodeFs, TS.nodeStream],
      objectives: [
        "Choose a Node.js release line for production from the LTS schedule",
        "Explain how the event loop runs timers, I/O callbacks and promise jobs, and why blocking it stalls every request",
        "Read and write files with fs/promises and handle the errors it raises",
        "Process large data with streams and pipeline instead of loading it into memory",
        "Emit and handle events with EventEmitter, including error events",
        "Read configuration from process.env and --env-file, and exit with a meaningful code on failure",
      ],
    },
    {
      title: "Building & testing an HTTP API in TypeScript",
      rangeLabel: "Week 7",
      gate: "Build a small JSON HTTP endpoint in TypeScript that validates its input, answers with correct status codes, calls an upstream service with fetch and a timeout, and is covered by node:test tests -- then explain what happens when two requests arrive at once.",
      sources: [TS.nodeHttp, TS.nodeGlobals, TS.nodeTest, TS.nodeProcess, TS.narrowing],
      objectives: [
        "Build an HTTP server or route that parses JSON bodies and returns JSON responses",
        "Validate request bodies from unknown into typed values, answering bad input with a 400",
        "Choose status codes and error responses that tell the client what went wrong without leaking internals",
        "Call another service with fetch, check response.ok, and set a timeout with AbortSignal",
        "Write unit and integration tests with node:test and node:assert",
        "Integrate prior units into one small end-to-end service",
      ],
    },
  ],
};

export const DEV_LANGUAGE_TRACKS: SeedTrack[] = [SQL_TRACK, TSNODE_TRACK];
