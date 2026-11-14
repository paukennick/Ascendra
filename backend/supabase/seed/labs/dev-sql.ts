import { GENERAL_SAFETY, matchPart, numericPart, orderPart, part, selectPart, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-265: SQL Fundamentals Coach (SQL), eight units, no exam blueprint.
//
// Density (docs/labs.md, "hybrid"): one lab per unit plus six extras split
// evenly (no weights), at most one extra per unit with room -> 2/2/2/2/2/2/
// 1/1 = 14 labs, one per objective (13 build, 1 case).
//
// Every query and every result quoted below was run on PostgreSQL 16.15 on
// a throwaway local server on 2026-11-14 and the output copied; nothing
// relies on a PostgreSQL 17/18-only feature (where 18 changes a default --
// virtual generated columns, skip scan -- the lab says so instead of
// running it). PostgreSQL 18's documentation (read the same day) describes
// the same behavior for everything run here. Data and organizations are
// fictional.

export const SQL_LABS: SeedLabSet = {
  trackCode: "SQL",
  sources: [
    source("https://www.postgresql.org/docs/current/", "reference", "2026-11-14"),
    source("https://www.postgresql.org/docs/current/features.html", "reference", "2026-11-14"),
    source("https://www.postgresql.org/docs/current/functions-subquery.html", "reference", "2026-11-14"),
    source("https://www.postgresql.org/docs/current/sql-expressions.html", "reference", "2026-11-14"),
    source("https://www.postgresql.org/docs/current/transaction-iso.html", "reference", "2026-11-14"),
  ],
  labs: [
    // ------------------------------------------------ Week 1 (2)
    {
      slug: "sql-filter-precedence",
      objective: "Write SELECT ... FROM ... WHERE queries with comparison, BETWEEN, IN and LIKE conditions",
      kind: "build",
      title: "Find cheap kitchen and decor items without an AND/OR slip",
      brief:
        "Lantern Home Goods (fictional) has a products table:\n\nid | name    | category | price  | discontinued\n1  | Kettle  | kitchen  | 39.00  | false\n2  | Mug     | kitchen  | 8.50   | false\n3  | Lamp    | lighting | 54.00  | true\n4  | Bulb    | lighting | 4.25   | false\n5  | Toaster | kitchen  | 62.00  | false\n6  | Rug     | decor    | 120.00 | false\n7  | Vase    | decor    | 24.00  | NULL\n\nA buyer wants kitchen or decor items under 50. A colleague wrote:\n\nSELECT name FROM products\nWHERE category = 'kitchen' OR category = 'decor' AND price < 50\nORDER BY id;",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Say what the draft returns and why, write a correct query (two ways), and add a name filter for items starting with M.",
          parts: [
            part(
              "What the draft returns",
              "Kettle, Mug, Toaster, Vase: AND binds before OR, so it reads kitchen OR (decor AND price < 50) and lets the 62.00 Toaster through.",
              "Kettle, Mug, Toaster, Vase. AND is evaluated before OR, so the condition means category = 'kitchen' OR (category = 'decor' AND price < 50): every kitchen item, whatever its price, plus cheap decor."
            ),
            part(
              "Correct query",
              "Parenthesizes the OR, or uses IN: WHERE category IN ('kitchen', 'decor') AND price < 50, returning Kettle, Mug, Vase.",
              "SELECT name FROM products\nWHERE category IN ('kitchen', 'decor') AND price < 50\nORDER BY id;\n\n-- or WHERE (category = 'kitchen' OR category = 'decor') AND price < 50\n\nResult: Kettle, Mug, Vase."
            ),
            part(
              "Names starting with M",
              "Adds AND name LIKE 'M%' (returns Mug); notes LIKE is case-sensitive in PostgreSQL (ILIKE is not) and that a price range could use BETWEEN, which includes both ends.",
              "... AND name LIKE 'M%' returns Mug. LIKE is case-sensitive; PostgreSQL's ILIKE ignores case. For a range such as 10 to 50 inclusive, price BETWEEN 10 AND 50 includes both ends."
            ),
          ],
        },
      ],
    },
    {
      slug: "sql-stable-paging",
      objective: "Limit and page results with LIMIT/OFFSET or FETCH FIRST, always paired with ORDER BY",
      kind: "build",
      title: "Show page 2 of a price list that must not reshuffle",
      brief:
        "Lantern Home Goods (fictional) shows its products three per page, most expensive first. The app runs:\n\nSELECT id, name, price FROM products LIMIT 3 OFFSET 3;\n\nCustomers report items appearing on two pages or on none. Use the products table from the previous lab (seven rows; prices 39.00, 8.50, 54.00, 4.25, 62.00, 120.00, 24.00 for ids 1-7).",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Explain the bug, write the page-2 query two ways, and give its rows.",
          parts: [
            part(
              "The bug",
              "Without ORDER BY the row order is not guaranteed, so each page may come from a different order; adds that the sort needs a unique tiebreaker (id) so equal prices cannot swap between pages.",
              "With no ORDER BY, PostgreSQL may return rows in any order, and the order can change between executions, so OFFSET skips a different set each time. Sort by price DESC and then id, so rows with equal prices still have one fixed order."
            ),
            part(
              "Page 2 query",
              "ORDER BY price DESC, id LIMIT 3 OFFSET 3, or the standard form OFFSET 3 ROWS FETCH FIRST 3 ROWS ONLY.",
              "SELECT id, name, price FROM products\nORDER BY price DESC, id\nLIMIT 3 OFFSET 3;\n\n-- standard SQL:\n... ORDER BY price DESC, id OFFSET 3 ROWS FETCH FIRST 3 ROWS ONLY;"
            ),
            selectPart(
              "Rows on page 2",
              "Selects Kettle, Vase and Mug (the 4th-6th most expensive).",
              "Page 1 is Rug 120.00, Toaster 62.00, Lamp 54.00. Page 2 is Kettle 39.00, Vase 24.00, Mug 8.50. Bulb 4.25 is on page 3.",
              {
                lines: ["6 | Rug | 120.00", "5 | Toaster | 62.00", "3 | Lamp | 54.00", "1 | Kettle | 39.00", "7 | Vase | 24.00", "2 | Mug | 8.50", "4 | Bulb | 4.25"],
                correct: [3, 4, 5],
                display: "table",
                header: "id | name | price",
              }
            ),
          ],
        },
      ],
    },
    // ------------------------------------------------ Week 2 (2)
    {
      slug: "sql-not-in-null-trap",
      objective: "Diagnose a NOT IN filter that returns nothing because the list contains a NULL, and fix it with NOT EXISTS",
      kind: "build",
      title: "Find customers with no orders when the query finds none",
      brief:
        "Driftwood Outfitters (fictional):\n\ncustomers(id, name): 1 Avery, 2 Blake, 3 Casey, 4 Drew, 5 Emery\norders(id, customer_id, amount): (10, 1), (11, 1), (12, 2), (13, 4), (14, NULL) -- order 14 was a guest checkout\n\nMarketing wants customers who have never ordered:\n\nSELECT name FROM customers\nWHERE id NOT IN (SELECT customer_id FROM orders);\n\nIt returns no rows.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Explain the empty result, write the NOT EXISTS version and give its result.",
          parts: [
            part(
              "Why nothing comes back",
              "Explains that the subquery contains NULL, so for Casey 3 NOT IN (1, 1, 2, 4, NULL) is NULL (unknown) rather than true, and WHERE keeps only true rows.",
              "The subquery returns 1, 1, 2, 4, NULL. For id 3 the test is 3 <> 1 AND ... AND 3 <> NULL; the last comparison is NULL, so the whole NOT IN is NULL, not true. WHERE discards rows whose condition is not true, so every customer is dropped."
            ),
            part(
              "NOT EXISTS version",
              "A correlated NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id); acceptable alternatives are NOT IN with WHERE customer_id IS NOT NULL, or a LEFT JOIN ... WHERE o.id IS NULL.",
              "SELECT name FROM customers c\nWHERE NOT EXISTS (\n  SELECT 1 FROM orders o WHERE o.customer_id = c.id\n);\n\nNOT EXISTS asks only whether a matching row exists, so the NULL row never matches and cannot poison the result. Filtering the subquery with WHERE customer_id IS NOT NULL also works but is easy to forget."
            ),
            selectPart(
              "Result",
              "Casey and Emery.",
              "Casey (3) and Emery (5) have no orders.",
              { lines: ["Avery", "Blake", "Casey", "Drew", "Emery"], correct: [2, 4], display: "list" }
            ),
          ],
        },
      ],
    },
    {
      slug: "sql-safe-rate-nullif",
      objective: "Replace or produce NULLs with COALESCE and NULLIF, including safe division",
      kind: "build",
      title: "Compute signup rates without dividing by zero",
      brief:
        "Bluebell Events (fictional) tracks campaigns:\n\nname   | clicks | signups\nemail  | 400    | 20\nradio  | 0      | 0\nsocial | 250    | NULL   -- not reported yet\n\nThe dashboard query SELECT name, signups * 100.0 / clicks FROM campaigns fails with ERROR: division by zero.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write a query that shows every campaign's rate as a percentage to one decimal, never fails, and treats unreported signups as 0; give the results.",
          parts: [
            part(
              "Query",
              "Uses NULLIF(clicks, 0) in the divisor (so 0 clicks gives NULL instead of an error) and COALESCE(signups, 0) in the numerator, rounded to one decimal.",
              "SELECT name,\n       round(coalesce(signups, 0) * 100.0 / nullif(clicks, 0), 1) AS rate_pct\nFROM campaigns\nORDER BY name;\n\nNULLIF(clicks, 0) returns NULL when clicks is 0, and anything divided by NULL is NULL, not an error."
            ),
            matchPart(
              "Results",
              "email 5.0, radio NULL (no clicks, so no rate), social 0.0.",
              "email 5.0 (20 of 400); radio NULL, because a rate with no clicks is undefined; social 0.0, because COALESCE turned the missing signups into 0. Dropping COALESCE would make social NULL too.",
              { left: ["email", "radio", "social"], right: ["5.0", "NULL", "0.0", "error"], pairs: [0, 1, 2] }
            ),
          ],
        },
      ],
    },
    // ------------------------------------------------ Week 3 (2)
    {
      slug: "sql-left-join-where-trap",
      objective: "Explain why a condition on the outer table belongs in ON rather than WHERE for a LEFT JOIN",
      kind: "build",
      title: "Keep every customer in a November order count",
      brief:
        "Driftwood Outfitters (fictional) uses the customers and orders tables from the NOT IN lab, with order dates: 10 2026-10-02, 11 2026-10-15, 12 2026-10-20, 13 2026-11-01 (customer 4), 14 2026-11-03 (no customer).\n\nThe report should list every customer with their November order count, zeros included:\n\nSELECT c.name, count(o.id) AS nov_orders\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id\nWHERE o.placed >= '2026-11-01'\nGROUP BY c.name;\n\nIt shows one row: Drew 1.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Explain why the zeros vanished, fix the query and give the output.",
          parts: [
            part(
              "Why rows vanished",
              "The LEFT JOIN keeps customers with no match by filling the order columns with NULL; the WHERE then tests o.placed >= ..., which is NULL (not true) for those rows and for October-only matches, so they are removed -- the outer join behaves like an inner join.",
              "The join produces NULL-filled rows for customers without matching orders, but WHERE runs after the join and o.placed >= '2026-11-01' is NULL for them, so they are filtered out. Customers whose only orders are in October are removed too."
            ),
            part(
              "Fixed query",
              "Moves the date test into ON (ON o.customer_id = c.id AND o.placed >= '2026-11-01'), keeps count(o.id) (not count(*), which would count the NULL row as 1).",
              "SELECT c.name, count(o.id) AS nov_orders\nFROM customers c\nLEFT JOIN orders o\n  ON o.customer_id = c.id AND o.placed >= '2026-11-01'\nGROUP BY c.name\nORDER BY c.name;\n\nIn ON the date decides which orders match; customers with no match still appear. count(o.id) ignores the NULL-filled row, giving 0."
            ),
            part(
              "Output",
              "Avery 0, Blake 0, Casey 0, Drew 1, Emery 0 (order 14 has no customer and does not appear).",
              "Avery 0, Blake 0, Casey 0, Drew 1, Emery 0. The guest order 14 matches no customer, so a customer-driven LEFT JOIN never shows it."
            ),
          ],
        },
      ],
    },
    {
      slug: "sql-join-fan-out",
      objective: "Recognize row multiplication when joining to a many-side table and correct the totals it inflates",
      kind: "build",
      title: "Find out why order 10 looks paid twice",
      brief:
        "Driftwood Outfitters (fictional) has, for order 10: two payments of 20.00 each (40.00 in all) and two shipments (UPS and FedEx). Order 11 has one payment of 25.00 and no shipment; order 12 one payment of 90.00 and one shipment.\n\nSELECT o.id, sum(p.amount) AS paid, count(s.carrier) AS parcels\nFROM orders o\nJOIN payments p ON p.order_id = o.id\nLEFT JOIN shipments s ON s.order_id = o.id\nGROUP BY o.id ORDER BY o.id;\n\nreturns 10 | 80.00 | 4, 11 | 25.00 | 0, 12 | 90.00 | 1.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Explain 80.00 and 4, and rewrite the query so each total is right.",
          parts: [
            numericPart(
              "Rows for order 10 before grouping",
              "4: each of the 2 payment rows pairs with each of the 2 shipment rows.",
              "2 payments x 2 shipments = 4 joined rows for order 10, so sum(p.amount) adds each 20.00 twice (80.00) and count(s.carrier) counts 4.",
              { answer: 4, tolerance: 0 }
            ),
            part(
              "Corrected query",
              "Aggregates each child table separately before combining -- scalar subqueries, or joins to pre-grouped derived tables/CTEs -- giving 10 | 40.00 | 2, 11 | 25.00 | 0, 12 | 90.00 | 1. count(DISTINCT ...) alone is not a fix for the sum.",
              "SELECT o.id,\n  (SELECT sum(amount) FROM payments p WHERE p.order_id = o.id) AS paid,\n  (SELECT count(*) FROM shipments s WHERE s.order_id = o.id) AS parcels\nFROM orders o\nWHERE o.id IN (10, 11, 12)\nORDER BY o.id;\n\n-> 10 | 40.00 | 2, 11 | 25.00 | 0, 12 | 90.00 | 1. Joining two independent many-side tables to the same parent multiplies rows; total each one on its own first. sum(DISTINCT amount) would wrongly give 20.00, since the two payments are equal."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------------ Week 4 (2)
    {
      slug: "sql-where-vs-having",
      objective: "Filter rows with WHERE before grouping and groups with HAVING after, and choose correctly between them",
      kind: "build",
      title: "Count closed tickets per team, only for busy teams",
      brief:
        "Kestrel Support (fictional) has tickets(id, team, priority, status, minutes):\n\n1 web high closed 30\n2 web low open NULL\n3 web high closed 90\n4 db high open NULL\n5 db low closed 20\n6 mobile low closed 15\n7 web low closed 45\n\nManagement wants, per team, the number of closed tickets, showing only teams with at least two closed tickets. A draft puts count(*) >= 2 in WHERE and fails.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the query, give the result, and explain where each condition goes and why the draft failed.",
          parts: [
            part(
              "Query",
              "WHERE status = 'closed' GROUP BY team HAVING count(*) >= 2.",
              "SELECT team, count(*) AS closed\nFROM tickets\nWHERE status = 'closed'\nGROUP BY team\nHAVING count(*) >= 2\nORDER BY team;"
            ),
            selectPart(
              "Result",
              "Only web 3 (db and mobile have one closed ticket each).",
              "web 3. db has one closed ticket (5) and mobile one (6), so HAVING drops both.",
              { lines: ["db 1", "mobile 1", "web 3", "web 4", "db 2"], correct: [2], display: "list" }
            ),
            part(
              "Why",
              "WHERE filters rows before grouping and cannot contain aggregates (they do not exist yet); HAVING filters groups after aggregation. A row condition such as status belongs in WHERE so the count includes only closed tickets.",
              "WHERE runs before GROUP BY on individual rows, so an aggregate like count(*) is not available there (PostgreSQL: aggregate functions are not allowed in WHERE). HAVING runs after grouping. Putting status = 'closed' in WHERE (not HAVING) also means only closed rows are counted."
            ),
          ],
        },
      ],
    },
    {
      slug: "sql-filter-aggregates",
      objective: "Compute conditional counts and sums with FILTER (WHERE ...) or CASE inside an aggregate",
      kind: "build",
      title: "Build a per-team scorecard in one pass",
      brief:
        "Using Kestrel Support's (fictional) tickets table from the previous lab, management wants one row per team with: total tickets, timed tickets (minutes recorded), average minutes, high-priority count and open count.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the query and give web's row, explaining count(*) against count(minutes) and avg's treatment of NULL.",
          parts: [
            part(
              "Query",
              "One GROUP BY team query using count(*), count(minutes), avg(minutes), and count(*) FILTER (WHERE priority = 'high') and FILTER (WHERE status = 'open') -- or sum(CASE WHEN ... THEN 1 ELSE 0 END).",
              "SELECT team,\n  count(*) AS tickets,\n  count(minutes) AS timed,\n  avg(minutes) AS avg_min,\n  count(*) FILTER (WHERE priority = 'high') AS high,\n  count(*) FILTER (WHERE status = 'open') AS open_now\nFROM tickets\nGROUP BY team\nORDER BY team;\n\nFILTER is standard SQL; sum(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) is the portable equivalent."
            ),
            matchPart(
              "web's row",
              "tickets 4, timed 3, avg 55, high 2, open 1.",
              "web: tickets 4, timed 3 (ticket 2 has no minutes), avg_min 55 ((30 + 90 + 45) / 3; the NULL is skipped, not counted as 0), high 2, open_now 1.",
              { left: ["tickets", "timed", "avg_min", "high", "open_now"], right: ["4", "3", "55", "2", "1", "41.25"], pairs: [0, 1, 2, 3, 4], leftHeading: "Column", rightHeading: "web" }
            ),
            part(
              "Empty input",
              "Notes that sum over no rows returns NULL (e.g. a team with no tickets or a filter matching nothing), and that coalesce(sum(minutes), 0) gives 0 where a report needs a number; count returns 0.",
              "Aggregates other than count return NULL for no input rows: SELECT sum(minutes) FROM tickets WHERE team = 'qa' is NULL. Use coalesce(sum(minutes), 0) when the report must show 0."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------------ Week 5 (2)
    {
      slug: "sql-recursive-org-chart",
      objective: "Walk a hierarchy such as an org chart or category tree with WITH RECURSIVE",
      kind: "build",
      title: "List everyone under a manager with WITH RECURSIVE",
      brief:
        "Halyard Logistics (fictional) stores staff(id, name, manager_id):\n\n1 Rivera NULL\n2 Okoye 1\n3 Lind 1\n4 Park 2\n5 Haas 4\n6 Mendez 3\n\nHR needs Okoye and everyone who reports to Okoye at any depth, with the depth below Okoye.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the recursive query, give its result and explain how it stops.",
          parts: [
            part(
              "Query",
              "WITH RECURSIVE with a non-recursive term selecting id 2 at depth 0, UNION ALL, and a recursive term joining staff to the CTE on s.manager_id = c.id with depth + 1.",
              "WITH RECURSIVE chain AS (\n  SELECT id, name, manager_id, 0 AS depth\n  FROM staff WHERE id = 2\n  UNION ALL\n  SELECT s.id, s.name, s.manager_id, c.depth + 1\n  FROM staff s JOIN chain c ON s.manager_id = c.id\n)\nSELECT name, depth FROM chain ORDER BY depth, name;"
            ),
            orderPart(
              "Rows, in depth order",
              "Okoye 0, Park 1, Haas 2.",
              "Okoye 0, Park 1, Haas 2. Lind and Mendez report through Rivera's other branch, so they are not included.",
              ["Okoye (0)", "Park (1)", "Haas (2)", "(no more rows)"]
            ),
            part(
              "How it stops",
              "Each pass joins only the rows added by the previous pass; when a pass adds no rows (Haas manages nobody) the recursion ends. A cycle in the data would loop forever with UNION ALL, so add a depth limit or use UNION/a CYCLE clause.",
              "The recursive term sees only the rows from the previous iteration. After Haas, no staff row has manager_id 5, the iteration returns nothing and the query ends. If the data had a cycle, UNION ALL would never stop; guard with WHERE depth < 20, UNION, or the standard CYCLE clause."
            ),
          ],
        },
      ],
    },
    {
      slug: "sql-union-intersect-except",
      objective: "Combine results with UNION, UNION ALL, INTERSECT and EXCEPT, and choose ALL when duplicates matter",
      kind: "build",
      title: "Merge two stores' mailing lists",
      brief:
        "Two Fennel Tea (fictional) stores keep their own email lists.\n\nstore_a: kim@x.test, lee@x.test, kim@x.test (Kim signed up twice)\nstore_b: lee@x.test, ray@x.test\n\nMarketing asks four questions: how many distinct addresses in total; how many signups in total; who is on both lists; who is only on store A's list.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each question to the set operator and give each answer.",
          parts: [
            matchPart(
              "Operator for each question",
              "Distinct addresses -> UNION; total signups -> UNION ALL; on both -> INTERSECT; only A -> EXCEPT (A EXCEPT B).",
              "UNION removes duplicates (distinct addresses); UNION ALL keeps every row (signups); INTERSECT keeps rows in both; store_a EXCEPT store_b keeps rows in A that are not in B.",
              {
                left: ["Distinct addresses overall", "Total signups", "On both lists", "Only on store A"],
                right: ["UNION", "UNION ALL", "INTERSECT", "EXCEPT", "CROSS JOIN"],
                pairs: [0, 1, 2, 3],
              }
            ),
            part(
              "Answers",
              "UNION count 3 (kim, lee, ray); UNION ALL count 5; INTERSECT lee@x.test; EXCEPT kim@x.test (once -- EXCEPT also removes duplicates unless ALL is written).",
              "SELECT count(*) FROM (SELECT email FROM store_a UNION SELECT email FROM store_b) u;      -- 3\nSELECT count(*) FROM (SELECT email FROM store_a UNION ALL SELECT email FROM store_b) u;  -- 5\nSELECT email FROM store_a INTERSECT SELECT email FROM store_b;   -- lee@x.test\nSELECT email FROM store_a EXCEPT SELECT email FROM store_b;      -- kim@x.test\n\nUNION, INTERSECT and EXCEPT de-duplicate unless ALL is added; UNION ALL is also cheaper because it skips that step."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------------ Week 6 (2)
    {
      slug: "sql-top-n-per-group",
      objective: "Select the top N rows per group by filtering a ranked subquery or CTE",
      kind: "build",
      title: "Find the top two reps in each region, ties included",
      brief:
        "Silverline Coffee (fictional) sales(region, rep, amount):\n\nnorth Ana 500 | north Ben 700 | north Cy 700 | north Di 300\nsouth Eli 900 | south Fay 400 | south Gus 650\n\nThe regional bonus goes to the top two reps per region; reps tied on amount must be treated the same.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Show what row_number, rank and dense_rank give in the north, then write the top-two query and give its rows.",
          parts: [
            matchPart(
              "North rankings (amount descending)",
              "Ana (500): row_number 3, rank 3, dense_rank 2. Answer is the triple for Ana and Di; Ben/Cy tie at rank 1.",
              "Ben and Cy (700) are rank 1 and dense_rank 1; row_number gives them 1 and 2 in an arbitrary order. Ana (500): row_number 3, rank 3 (rank skips 2 after a tie), dense_rank 2. Di (300): 4, 4, 3.",
              {
                left: ["Ana: row_number, rank, dense_rank", "Di: row_number, rank, dense_rank", "Ben and Cy: rank"],
                right: ["3, 3, 2", "4, 4, 3", "1 and 1", "3, 2, 2", "1 and 2"],
                pairs: [0, 1, 2],
              }
            ),
            part(
              "Top-two query",
              "Computes rank() OVER (PARTITION BY region ORDER BY amount DESC) in a subquery or CTE and filters r <= 2 outside (a window function cannot be used in WHERE). Uses rank (or dense_rank) rather than row_number so the tie is kept.",
              "SELECT region, rep, amount\nFROM (\n  SELECT *, rank() OVER (PARTITION BY region ORDER BY amount DESC) AS r\n  FROM sales\n) t\nWHERE r <= 2\nORDER BY region, amount DESC, rep;\n\nWindow functions run after WHERE, so the filter has to be applied to the subquery's output."
            ),
            selectPart(
              "Rows returned",
              "north Ben 700, north Cy 700, south Eli 900, south Gus 650.",
              "north: Ben 700 and Cy 700 (both rank 1; Ana's rank 3 is out). south: Eli 900, Gus 650. dense_rank would also have let Ana in (dense_rank 2) -- choose the function that matches the bonus rule.",
              {
                lines: ["north Ben 700", "north Cy 700", "north Ana 500", "north Di 300", "south Eli 900", "south Gus 650", "south Fay 400"],
                correct: [0, 1, 4, 5],
                display: "table",
              }
            ),
          ],
        },
      ],
    },
    {
      slug: "sql-running-total-frame",
      objective: "Calculate running totals and moving averages with an explicit ROWS frame",
      kind: "build",
      title: "Fix a running total that jumps on days with two entries",
      brief:
        "Pebble Creek Farm Stand (fictional) logs takings(id, d, amt): (1, 2026-11-01, 100), (2, 2026-11-02, 50), (3, 2026-11-02, 30), (4, 2026-11-03, 20).\n\nSELECT id, d, amt, sum(amt) OVER (ORDER BY d) AS running\nFROM takings ORDER BY id;\n\nshows running 100, 180, 180, 200. The bookkeeper expected 100, 150, 180, 200.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Explain the 180 on row 2, write the per-row running total, and add a three-row moving average.",
          parts: [
            part(
              "Why row 2 shows 180",
              "The default frame with ORDER BY is RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW, which includes all peers (rows with the same d), so both 2026-11-02 rows get 100 + 50 + 30.",
              "With ORDER BY and no frame clause the frame is RANGE UNBOUNDED PRECEDING to CURRENT ROW, and CURRENT ROW in RANGE mode means the current row and all its peers -- every row with the same d. Rows 2 and 3 share a date, so both see 180."
            ),
            part(
              "Per-row running total",
              "Uses a ROWS frame and a unique tiebreaker: sum(amt) OVER (ORDER BY d, id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW), giving 100, 150, 180, 200.",
              "sum(amt) OVER (ORDER BY d, id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)\n-> 100, 150, 180, 200.\nROWS counts physical rows, and id makes the order of same-day rows deterministic."
            ),
            numericPart(
              "Three-row moving average on row 4",
              "33.33 (rows 2-4: (50 + 30 + 20) / 3), from avg(amt) OVER (ORDER BY d, id ROWS BETWEEN 2 PRECEDING AND CURRENT ROW).",
              "avg(amt) OVER (ORDER BY d, id ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) on row 4 averages 50, 30 and 20 = 33.33. Rows 1-3 give 100.00, 75.00 and 60.00 (fewer than three rows exist at the start).",
              { answer: 33.33, tolerance: 0.01 }
            ),
          ],
        },
      ],
    },
    // ------------------------------------------------ Week 7 (1)
    {
      slug: "sql-membership-schema",
      objective: "Enforce rules with NOT NULL, DEFAULT, CHECK, UNIQUE and PRIMARY KEY constraints",
      kind: "build",
      title: "Turn a gym's membership rules into constraints",
      brief:
        "Summit Climbing Gym (fictional) states its rules:\n- Every member has a unique email and a full name; the join date defaults to today.\n- Plans have a code and a monthly fee that can't be negative.\n- A subscription belongs to one member and one plan; if a member is deleted their subscriptions go too, but a plan that still has subscriptions can't be deleted.\n- A subscription's end date, if any, is after its start date.\n\nWrite the tables in PostgreSQL.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the CREATE TABLE statements, then say which constraint rejects each bad statement.",
          parts: [
            part(
              "Tables",
              "members with an identity or serial primary key, email NOT NULL UNIQUE, full_name NOT NULL, joined_on DEFAULT current_date; plans with code primary key and CHECK (monthly_fee >= 0) on an exact numeric type; subscriptions with NOT NULL foreign keys, ON DELETE CASCADE to members, ON DELETE RESTRICT (or the default NO ACTION) to plans, and CHECK (ends_on IS NULL OR ends_on > starts_on).",
              "CREATE TABLE members (\n  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,\n  email text NOT NULL UNIQUE,\n  full_name text NOT NULL,\n  joined_on date NOT NULL DEFAULT current_date\n);\nCREATE TABLE plans (\n  code text PRIMARY KEY,\n  monthly_fee numeric(7,2) NOT NULL CHECK (monthly_fee >= 0)\n);\nCREATE TABLE subscriptions (\n  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,\n  member_id int NOT NULL REFERENCES members(id) ON DELETE CASCADE,\n  plan_code text NOT NULL REFERENCES plans(code) ON DELETE RESTRICT,\n  starts_on date NOT NULL,\n  ends_on date,\n  CHECK (ends_on IS NULL OR ends_on > starts_on)\n);\n\nnumeric, not real or double precision, keeps money exact. The CHECK passes when ends_on is NULL because a CHECK fails only when its expression is false."
            ),
            matchPart(
              "Which constraint rejects it",
              "Each statement to the constraint that rejects it.",
              "A second member with the same email violates members_email_key (UNIQUE). A plan with fee -1 violates the CHECK on monthly_fee. A subscription ending before it starts violates the table CHECK. Deleting a plan that still has subscriptions violates the plan_code foreign key (RESTRICT).",
              {
                left: [
                  "INSERT a member with an email already used",
                  "INSERT INTO plans VALUES ('free', -1)",
                  "INSERT a subscription starting 2026-11-01 and ending 2026-10-01",
                  "DELETE a plan that still has subscriptions",
                ],
                right: ["UNIQUE on email", "CHECK on monthly_fee", "CHECK on the dates", "FOREIGN KEY ... ON DELETE RESTRICT", "NOT NULL on full_name"],
                pairs: [0, 1, 2, 3],
              }
            ),
            part(
              "Deleting a member",
              "Deleting a member also deletes their subscriptions (CASCADE). Notes that by default UNIQUE allows several NULLs, which is why email is also NOT NULL.",
              "DELETE FROM members WHERE id = ... removes that member's subscriptions through ON DELETE CASCADE. UNIQUE alone would allow many NULL emails (NULLs are distinct by default), so NOT NULL is what makes every member have one."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------------ Week 8 (1)
    {
      slug: "sql-lost-update-case",
      objective: "Prevent a lost update with SELECT ... FOR UPDATE or a single atomic UPDATE, and compare isolation levels",
      kind: "case",
      title: "Stop two withdrawals from overwriting each other",
      brief:
        "Wren Credit Union's (fictional) teller app withdraws money in three steps: SELECT balance FROM accounts WHERE id = 1; compute the new balance in the app; UPDATE accounts SET balance = <new value> WHERE id = 1. The database uses PostgreSQL's default isolation level.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Account 1 holds 100. Teller A starts a withdrawal of 30 and Teller B a withdrawal of 50 at the same moment. Both SELECTs return 100. A writes 70 and commits; then B writes 50 and commits.",
          ask: "What balance is left, what should it be, and what is this anomaly called?",
          parts: [
            numericPart(
              "Balance left",
              "50 (B's write overwrote A's); it should be 20.",
              "50. Both read 100; A wrote 100 - 30 = 70, then B wrote 100 - 50 = 50 over it. The correct balance is 100 - 30 - 50 = 20. This is a lost update.",
              { answer: 50, tolerance: 0 }
            ),
            part(
              "Why the default level allows it",
              "Read Committed (PostgreSQL's default) gives each statement a snapshot of committed data; nothing stops two transactions from reading the same value and writing results computed outside the database.",
              "Under Read Committed each statement sees data committed before it began. Both SELECTs legitimately saw 100; the UPDATEs wrote values the app had computed, so the second simply replaced the first."
            ),
          ],
        },
        {
          text: "The team considers two fixes: lock the row while deciding, or let the database do the arithmetic.",
          ask: "Write both fixes and say what happens to Teller B in each.",
          parts: [
            part(
              "Row lock",
              "BEGIN; SELECT balance FROM accounts WHERE id = 1 FOR UPDATE; check funds; UPDATE ...; COMMIT. B's SELECT ... FOR UPDATE waits until A commits, then reads 70 and ends at 20.",
              "BEGIN;\nSELECT balance FROM accounts WHERE id = 1 FOR UPDATE;\n-- app checks funds\nUPDATE accounts SET balance = balance - 30 WHERE id = 1;\nCOMMIT;\n\nB's SELECT ... FOR UPDATE blocks until A commits, then returns 70; B withdraws 50 and the balance is 20. (Observed on PostgreSQL 16: B waited, read 70, final 20.)"
            ),
            part(
              "Atomic update",
              "UPDATE accounts SET balance = balance - 50 WHERE id = 1 AND balance >= 50 (checking the row count or RETURNING to see if it succeeded); the second UPDATE waits for the first row lock and re-reads the committed value.",
              "UPDATE accounts SET balance = balance - 50\nWHERE id = 1 AND balance >= 50\nRETURNING balance;\n\nThe row lock taken by A's UPDATE makes B's UPDATE wait; under Read Committed B then re-evaluates against the committed 70 and writes 20. If no row is returned, funds were insufficient."
            ),
          ],
        },
        {
          text: "A senior developer suggests Repeatable Read instead.",
          ask: "What would Teller B experience under Repeatable Read or Serializable, and what must the app then do?",
          parts: [
            part(
              "Higher isolation",
              "B's UPDATE of a row changed by A after B's snapshot fails with a serialization error (could not serialize access due to concurrent update); the app must roll back and retry the whole transaction.",
              "Under Repeatable Read (and Serializable) B's UPDATE fails with ERROR: could not serialize access due to concurrent update, because the row changed after B's snapshot. Nothing is lost, but the application must catch the error, roll back and retry the transaction from the start."
            ),
          ],
        },
      ],
    },
  ],
};
