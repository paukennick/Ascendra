import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";

// REQ-160: CompTIA Data+ (DA0-002, V2).
//
// Aligned to the five domains on CompTIA's Data+ certification page, read
// 2026-11-07: Data Concepts and Environments 20%, Data Acquisition and
// Preparation 22%, Data Analysis 24%, Visualization and Reporting 20%, Data
// Governance 14% (exam series code DA0-002, launched 2025-10-14, retirement
// estimated 2028).
//   https://www.comptia.org/en-us/certifications/data/
// Density (docs/labs.md, policy "hybrid"): 1 / 1 / 3 / 2 / 2. The labs give
// the learner small, fully stated datasets and ask for the analyst's actual
// work: type the fields, find the gaps/duplicates/outliers (Tukey fences on
// the median-of-halves quartiles, stated in the brief), compute descriptive
// statistics (sample standard deviation, stated), find why a joined report
// doubled, pick the chart, catch a units mismatch, write quality rules and
// mask a dataset. Every number in a model answer was computed from the
// brief's data (see the checks in the PR); the quartile and standard
// deviation conventions are named so a learner using another convention can
// still be graded fairly.

export const DATAPLUS_LABS: SeedLabSet = {
  trackCode: "DATAPLUS",
  sources: ["https://www.comptia.org/en-us/certifications/data/"],
  labs: [
    // -----------------------------------------------------------------------
    // Data Concepts and Environments (20%) -- 1 lab
    // -----------------------------------------------------------------------
    {
      slug: "type-the-fields-of-an-export",
      objective: "Data concepts: database types, data structures, file extensions, and data types",
      kind: "build",
      title: "Type the fields of a messy export before it is loaded",
      brief:
        "Willowbank Outfitters sends you a CSV export from its online store to load into the reporting database. The first rows look like this:\n\ncustomer_id,order_date,amount,is_member,zip,notes\n000482,11/03/2026,\"1,249.50\",Y,02134,\"Called about sizing\"\n000483,11/03/2026,89.99,N,98402,\n001207,10/31/2026,\"2,310.00\",Y,33101,\"Gift wrap; ship to office\"\n\nThe store also offers the same data as JSON from its API and as Parquet files in a cloud bucket, and the marketing team keeps a folder of PDF scans of paper order forms. A junior analyst proposes loading every column as text 'to be safe' and storing the ZIP code as an integer 'because it is a number'.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the loading specification: the data type for each column with the reason, the classification of the three sources by structure, the file-format choice for the warehouse, and the two mistakes you would stop.",
          parts: [
            part(
              "Column data types",
              "customer_id: string/text (leading zeros must survive; it is an identifier, not a quantity); order_date: date, parsed from MM/DD/YYYY into an ISO date; amount: decimal/numeric with two places (not float, to avoid rounding money) after stripping quotes and thousands separators; is_member: Boolean mapped from Y/N; zip: string (leading zeros, not arithmetic); notes: free text/varchar, nullable.",
              "customer_id -> text (keep '000482'; an integer would become 482 and stop matching the store). order_date -> date, parsed as MM/DD/YYYY and stored as 2026-11-03 (ISO) so it sorts and filters correctly. amount -> numeric(12,2) after removing the quotes and the thousands comma ('1,249.50' -> 1249.50); never float, which cannot represent 0.10 exactly. is_member -> Boolean (Y -> true, N -> false). zip -> text ('02134' must keep its zero; nobody adds ZIP codes). notes -> text, nullable (row two is empty)."
            ),
            part(
              "Structure of the sources",
              "CSV and Parquet are structured (fixed columns, tabular); the API's JSON is semi-structured (self-describing keys, possibly nested, schema can vary); the PDF scans are unstructured and need OCR/extraction before they are data.",
              "CSV export and Parquet files: structured, tabular data with a defined set of columns. API JSON: semi-structured -- each record carries its own field names and may nest (for example an address object) or omit fields, so a schema has to be inferred or enforced on load. PDF scans: unstructured; the order details are pixels until OCR or manual entry turns them into fields, and the result needs validation."
            ),
            part(
              "File format for the warehouse",
              "Chooses Parquet for the warehouse/lake layer (columnar, typed, compressed, fast for analytical scans) over CSV (untyped text, no schema, large) and JSON (verbose, nested), while keeping CSV/JSON as interchange formats; notes the relational reporting database is the right home for the typed orders table, and a non-relational/document store would suit the raw API JSON if its shape keeps changing.",
              "Land the data as Parquet: it stores the column types with the data, compresses well and lets queries read only the columns they need, so a report over amount by month does not scan notes. CSV is fine as the hand-off from the store but carries no types (hence this whole exercise), and JSON is bulky for analytics. The cleaned orders go into the relational reporting database as a typed table; if the raw API JSON needs keeping with its changing shape, a document (non-relational) store or a JSON column is the place for it."
            ),
            part(
              "The two mistakes",
              "Stops 'everything as text' (dates will not sort or diff, amounts will not sum, Booleans will not filter, and types are the first line of validation) and 'ZIP as integer' (drops leading zeros so 02134 becomes 2134, and ZIP+4 or non-US codes break); explains typing on load catches bad rows early.",
              "Loading every column as text defers every problem: 'amount' cannot be summed, order_date sorts alphabetically ('10/31/2026' after '11/03/2026' is wrong by month-first order anyway), and a bad value like 'N/A' in amount slips through instead of failing the load. ZIP as integer silently turns 02134 into 2134 and would reject 'K1A 0B1' or '98402-1234'. Typing at load time is the first data-quality check: rows that do not parse are rejected and reported, not hidden."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Data Acquisition and Preparation (22%) -- 1 lab
    // -----------------------------------------------------------------------
    {
      slug: "explore-orders-missing-duplicates-outliers",
      objective: "Exploration: finding missing values, duplication, redundancy, and outliers",
      kind: "build",
      title: "Profile a small order extract for gaps, duplicates and outliers",
      brief:
        "You receive 13 rows from Brambleford Books' order table for one day:\n\norder_id,region,amount\n1001,North,42\n1002,North,45\n1003,South,47\n1004,,48\n1005,East,50\n1006,South,51\n1007,West,52\n1007,West,52\n1008,East,55\n1009,,57\n1010,North,60\n1011,South,61\n1012,West,210\n\nUse the Tukey fence method for outliers: Q1 and Q3 are the medians of the lower and upper halves of the sorted values (after removing exact duplicate rows), the IQR is Q3 - Q1, and a value is an outlier if it is below Q1 - 1.5 x IQR or above Q3 + 1.5 x IQR. The table also has a 'region_code' column elsewhere that always equals the first letter of 'region'.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Report what you found: missing values, duplicates and redundancy, the outlier calculation in full, and what you recommend doing about each before analysis.",
          parts: [
            part(
              "Missing values",
              "Finds two rows with a missing region (orders 1004 and 1009), quantifies it (2 of 12 unique orders, about 17%), and recommends investigating the source (why region is blank) and either back-filling from the customer record or flagging as 'Unknown' rather than silently dropping or guessing.",
              "Region is blank on orders 1004 and 1009: 2 of the 12 distinct orders (about 17%), far too many to ignore for a by-region report. Check why the source left them empty (new customers without an address? an export bug?), back-fill from the customer master where possible, and otherwise label them 'Unknown' so the totals still reconcile instead of dropping them."
            ),
            part(
              "Duplicates and redundancy",
              "Identifies order 1007 as an exact duplicate row (same id, region and amount) to be removed before analysis, leaving 12 unique orders; identifies region_code as a redundant column derivable from region (keep one, or derive it in a view) and notes duplicates would inflate the total by 52.",
              "Order 1007 appears twice with identical values -- an exact duplicate, probably a double export or a retried insert -- so de-duplicate on order_id (12 unique orders remain) or the day's total is overstated by 52. region_code is redundant: it is always the first letter of region, so it carries no new information and can drift out of sync; keep region as the source of truth and derive the code in a view if a report needs it."
            ),
            part(
              "Outlier calculation",
              "Sorts the 12 de-duplicated amounts (42, 45, 47, 48, 50, 51, 52, 55, 57, 60, 61, 210); Q1 = median of the lower six = (47 + 48) / 2 = 47.5; Q3 = median of the upper six = (57 + 60) / 2 = 58.5; IQR = 11; fences 47.5 - 16.5 = 31 and 58.5 + 16.5 = 75; the only outlier is 210 (order 1012); no low outliers.",
              "After removing the duplicate: 42, 45, 47, 48, 50, 51 | 52, 55, 57, 60, 61, 210. Q1 = (47 + 48) / 2 = 47.5. Q3 = (57 + 60) / 2 = 58.5. IQR = 58.5 - 47.5 = 11. Lower fence = 47.5 - 1.5 x 11 = 31; upper fence = 58.5 + 16.5 = 75. Only 210 (order 1012) lies outside, so it is the single outlier; nothing is below 31. (Other quartile conventions give slightly different fences, but 210 is an outlier under all of them.)"
            ),
            part(
              "What to do about the outlier",
              "Does not delete it automatically: checks whether 210 is a real large order (then keep it, and report median as well as mean) or an error such as a misplaced decimal or a currency mix-up (then correct or exclude with a note); documents the decision.",
              "Investigate before acting. 210 may be a genuine bulk order -- a bookshop buying for a school -- in which case it stays, and the report shows the median (51.5) beside the mean, which the outlier pulls up. If the order record shows a typo (21.0 entered as 210) or a different currency, correct it from the source or exclude it with a documented reason. Either way the decision and rule ('amounts above the upper fence are reviewed, not removed') go into the data-preparation notes."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Data Analysis (24%) -- 3 labs
    // -----------------------------------------------------------------------
    {
      slug: "descriptive-statistics-support-tickets",
      objective: "Applying basic statistical techniques to data",
      kind: "build",
      title: "Summarise a week of support tickets with the right statistics",
      brief:
        "Thistledown Software's support desk logged these daily ticket counts over eight days: 12, 15, 11, 18, 15, 22, 15, 12. The support manager wants a short statistical summary for the ops review and asks specifically whether the 22-ticket day was unusual. Use the sample standard deviation (divide by n - 1). The previous eight-day period totalled 104 tickets.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Compute the measures of central tendency and dispersion, judge the 22-ticket day, compute the period-over-period change, and say which figures belong in the review and why.",
          parts: [
            part(
              "Central tendency",
              "Mean = 120 / 8 = 15; sorted values 11, 12, 12, 15, 15, 15, 18, 22 give median = (15 + 15) / 2 = 15; mode = 15 (three times).",
              "Sum = 12 + 15 + 11 + 18 + 15 + 22 + 15 + 12 = 120; mean = 120 / 8 = 15 tickets per day. Sorted: 11, 12, 12, 15, 15, 15, 18, 22; median = average of the 4th and 5th values = (15 + 15) / 2 = 15. Mode = 15 (occurs three times). Mean, median and mode agree, so the distribution is roughly symmetric apart from the 22."
            ),
            part(
              "Dispersion",
              "Range = 22 - 11 = 11; deviations from 15 are -3, 0, -4, 3, 0, 7, 0, -3, squared 9, 0, 16, 9, 0, 49, 0, 9 = 92; sample variance = 92 / 7 = 13.14; sample standard deviation = 3.63 (the population figure, 92 / 8 = 11.5, sd 3.39, is acceptable if labelled as such).",
              "Range = 22 - 11 = 11. Deviations from the mean: -3, 0, -4, 3, 0, 7, 0, -3; squared: 9, 0, 16, 9, 0, 49, 0, 9; sum = 92. Sample variance = 92 / (8 - 1) = 13.14; sample standard deviation = sqrt(13.14) = 3.63 tickets. (Dividing by n gives the population figures 11.5 and 3.39; the brief asks for the sample version because these eight days stand in for the desk's usual behaviour.)"
            ),
            part(
              "Was 22 unusual?",
              "Computes the z-score (22 - 15) / 3.63 = 1.93, about two standard deviations above the mean -- notable but not extreme for eight observations; checks whether the day had an identifiable cause; notes with so few data points a formal outlier claim is weak.",
              "z = (22 - 15) / 3.63 = 1.93: the 22-ticket day sits almost two standard deviations above the mean, the highest of the eight and clearly the busiest, but with only eight observations that is 'worth a look', not proof of an anomaly (under the Tukey fences for this data, Q1 = 12, Q3 = 16.5, upper fence 23.25, so 22 is not even flagged). Ask what happened that day -- a release, an outage -- before calling it abnormal."
            ),
            part(
              "Period change and what to report",
              "Period-over-period: 120 vs 104 is +16 tickets, +15.4%; recommends reporting the total and percent change, the mean (or median) per day with the standard deviation as the spread, and the busiest day with its context, avoiding false precision and explaining that the mean and median agree so either is fair here.",
              "This period 120 tickets vs 104 last period: +16, a 15.4% increase. For the review: total and percent change (the headline), average 15 per day (median also 15, so the mean is not misleading) with a typical spread of about ±3.6, and the peak day of 22 with its cause if known. Round to one decimal; eight days do not justify more. If a later week is skewed by one huge day, switch the headline to the median."
            ),
          ],
        },
      ],
    },
    {
      slug: "communicate-one-analysis-three-audiences",
      objective: "Selecting communication methods appropriate to different audiences",
      kind: "build",
      title: "Deliver one churn analysis to three audiences",
      brief:
        "You have finished an analysis for Sorrel Fitness, a gym chain: members who do not visit in their first 30 days are 3.2 times more likely to cancel within a year, and a welcome-call pilot at two gyms cut that group's cancellations by 18%. Three audiences need it: the executive team (15 minutes at a monthly meeting, decide whether to fund the welcome calls across all 40 gyms); the gym managers (need to act on it weekly); and the analytics team (need to reproduce and extend the work). Plan the communication for each.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "For each audience: the format, the content and level of detail, the visual(s), and the cadence or follow-up; then one rule you apply to all three.",
          parts: [
            part(
              "Executive team",
              "A short deck or one-page summary leading with the decision and the business impact (members retained, revenue, cost of calls), the two headline numbers (3.2x, 18%), one simple chart, the recommendation and the ask; detail and method in an appendix; presented live with time for questions.",
              "A one-page brief (or three slides) that opens with the recommendation: 'Fund welcome calls at all 40 gyms; expected to retain about N members and $X a year for $Y in call costs.' Then the two facts that justify it -- 3.2x cancellation risk for no-visit members, 18% reduction in the pilot -- with one bar chart comparing cancellation rates for pilot vs. control gyms, the assumptions and risks in two lines, and a clear decision requested. Methods and caveats go in an appendix slide for anyone who asks."
            ),
            part(
              "Gym managers",
              "An operational dashboard or weekly report listing their own new members who have not visited in the first 30 days (the action list), with the welcome-call script and a simple trend of their gym's 30-day visit rate; delivered weekly by email/dashboard, with a short training session to launch it.",
              "A weekly action list, not a study: a dashboard page (or emailed report) per gym with 'new members with no visit yet' and days since joining, a checkbox for 'welcome call made', and a small line chart of the gym's first-30-day visit rate over time against the chain average. Launch it with a 20-minute call explaining why these members matter and giving the call script. Refresh weekly; managers do not need the statistics, they need the names."
            ),
            part(
              "Analytics team",
              "A technical write-up or notebook with the data sources and date range, the definitions (what counts as a visit, a cancellation), the method (cohort comparison, how the 3.2x and 18% were calculated, sample sizes, confidence/limitations), the code in version control, and a data dictionary; shared in the team's repository with a review.",
              "A notebook plus README in the analytics repository: data sources and extraction dates; definitions (visit = badge scan; cancellation = membership ended within 365 days of joining; pilot period and gyms); the cohort method and the exact calculations behind 3.2x and 18% with sample sizes and a note on the pilot's limits (two gyms, not randomised); the SQL and code; and a data dictionary. Ask a colleague to review and rerun it. This is what lets the team extend the work to other risk factors."
            ),
            part(
              "The rule for all three",
              "Same facts and definitions in every version (no audience gets a different number), each tailored only in depth and format; plain language; state uncertainty honestly; and make the next step explicit for that audience.",
              "One set of numbers and definitions behind all three outputs, so the executive's 18% is exactly the analysts' 18% -- only depth and format change. Plain words, honest about what the pilot can and cannot prove, and every version ends with what that audience should do next: executives decide, managers call, analysts reproduce."
            ),
          ],
        },
      ],
    },
    {
      slug: "report-total-doubled-join-fanout",
      objective: "Using tools and resources to troubleshoot data analysis problems",
      kind: "case",
      title: "Find why the regional revenue report doubled",
      brief:
        "At Hawthorn Supply, the new 'Revenue by Region' report shows 1,843,200 for October. Finance's ledger says October revenue was 921,600 -- exactly half. The report's query joins the orders table to customer_addresses to get each customer's region. You have read access to the warehouse and the query.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text:
            "The report query:\n\nSELECT a.region, SUM(o.amount) AS revenue\nFROM orders o\nJOIN customer_addresses a ON a.customer_id = o.customer_id\nWHERE o.order_date >= '2026-10-01' AND o.order_date < '2026-11-01'\nGROUP BY a.region;\n\nYou know that customer_addresses holds one row per customer per address_type ('billing', 'shipping').",
          ask: "What do you suspect, and what queries do you run to confirm it before changing anything?",
          parts: [
            part(
              "Hypothesis",
              "Suspects join fan-out: each customer has two address rows (billing and shipping), so every order matches twice and its amount is summed twice -- consistent with a total exactly 2x the ledger.",
              "The exact doubling points at the join. customer_addresses has two rows per customer (billing and shipping), so each order joins to both and its amount is counted twice. A filter or date problem would give an arbitrary difference; a one-to-many join gives a clean multiple."
            ),
            part(
              "Confirming queries",
              "Compares row counts before and after the join (COUNT(*) of October orders vs COUNT(*) of the joined result), sums orders alone, and checks the address table's cardinality per customer (COUNT by customer_id having > 1, or by address_type).",
              "SELECT COUNT(*), SUM(amount) FROM orders WHERE order_date >= '2026-10-01' AND order_date < '2026-11-01'; -- baseline rows and total\nSELECT COUNT(*) FROM orders o JOIN customer_addresses a ON a.customer_id = o.customer_id WHERE ...same dates...; -- joined rows\nSELECT customer_id, COUNT(*) FROM customer_addresses GROUP BY customer_id HAVING COUNT(*) > 1 LIMIT 10; -- multiplicity\nSELECT address_type, COUNT(*) FROM customer_addresses GROUP BY address_type;\nIf the joined count is twice the baseline and the baseline sum is 921,600, the fan-out is proven."
            ),
          ],
        },
        {
          text:
            "Results:\n\norders in October:            4,800 rows, SUM(amount) = 921,600\njoined result:                9,600 rows\ncustomers with > 1 address:   every customer has exactly 2 rows\naddress_type counts:          billing 2,350, shipping 2,350\n\nFinance confirms region should follow the billing address.",
          ask: "Fix the query and verify the fix.",
          parts: [
            part(
              "The fix",
              "Restricts the join to one row per customer -- add a.address_type = 'billing' to the join condition (or WHERE), or aggregate/deduplicate the address table in a subquery/CTE first -- so each order matches once; shows the corrected SQL.",
              "SELECT a.region, SUM(o.amount) AS revenue\nFROM orders o\nJOIN customer_addresses a\n  ON a.customer_id = o.customer_id AND a.address_type = 'billing'\nWHERE o.order_date >= '2026-10-01' AND o.order_date < '2026-11-01'\nGROUP BY a.region;\nAlternatively build a one-row-per-customer CTE (billing addresses only, or a ROW_NUMBER() pick) and join to that, which also protects against a customer with two billing rows."
            ),
            part(
              "Verification",
              "Re-runs the counts: joined rows now 4,800 (= orders), SUM over all regions = 921,600 (= ledger); adds a check that the sum of regional revenue equals the unjoined total, and confirms no orders were dropped by the filter (a LEFT JOIN count or a check for customers lacking a billing address).",
              "After the fix the joined query returns 4,800 rows and the regions sum to 921,600, matching finance. Add two assertions to the report's tests: total revenue across regions = SUM(amount) from orders alone for the same dates, and row count after the join = order count. Also run a LEFT JOIN with WHERE a.customer_id IS NULL to make sure no customer lacks a billing address, which would silently drop their orders from the report."
            ),
          ],
        },
        {
          text: "The totals now match, but the fixed report shows a region called NULL with 14,300 of revenue, and the 'West' region's figure is 3% lower than the sales team's own tracker.",
          ask: "Work through these two remaining discrepancies.",
          parts: [
            part(
              "The NULL region",
              "Traces NULL region to billing addresses with an empty region field (or customers whose billing row is missing if a LEFT JOIN is used), finds and fixes the source (back-fill region from postal code or state via a lookup), and until then labels it 'Unassigned' so the total still reconciles.",
              "NULL means the billing address exists but its region is empty for some customers (or, with a LEFT JOIN, that the billing row is missing). Query those customers, and derive region from their state or postal code using the region lookup table so the 14,300 lands where it belongs; fix the data-entry path that allows a blank region. Until the back-fill is done, show the bucket as 'Unassigned' rather than hiding it -- the grand total must still equal 921,600."
            ),
            part(
              "The 3% West difference",
              "Compares definitions rather than assuming an error: the sales tracker may count by shipping address, order date vs. ship date, gross vs. net of returns, or include a territory realignment; reconciles a sample of West orders line by line to find the rule that differs and documents the agreed metric definition.",
              "A 3% gap is a definition difference, not a join bug. Candidates: the sales tracker assigns region by shipping address (we use billing), uses ship date instead of order date (orders placed in October but shipped in November), counts gross before returns, or a sales territory moved. Pull a sample of West orders that appear in one source and not the other and read why. Then write the metric definition -- 'revenue = net order amount by order date, region = billing address' -- into the report's documentation so both teams quote the same number."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Visualization and Reporting (20%) -- 2 labs
    // -----------------------------------------------------------------------
    {
      slug: "choose-the-visual-for-each-question",
      objective: "Choosing visuals: charts, maps, tables, and design elements",
      kind: "build",
      title: "Choose the right visual for five reporting questions",
      brief:
        "Marlowe Home Goods' operations director has five questions for the quarterly pack. (1) How has monthly revenue moved over the last 24 months? (2) What share of revenue came from each of the five product categories this quarter? (3) Is there a relationship between the discount percentage offered and units sold across 400 promotions? (4) Which US states had the highest return rates? (5) What are the exact revenue, margin and return rate for each of the 40 top SKUs, for a reader who will look up specific products? A colleague has proposed a 3D pie chart for question 1 and a dual-axis chart with a truncated axis for question 3.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Pick a visual for each question with the reason, then set the design rules for the pack and explain what is wrong with the colleague's proposals.",
          parts: [
            part(
              "Questions 1-3",
              "(1) Line chart for a 24-month trend (time on the x-axis, revenue on y, zero-based or clearly labelled axis); (2) bar chart (or a pie/donut only because there are just five parts summing to 100%, with labels) for share by category; (3) scatter plot of discount % vs units sold, optionally with a trend line, for a relationship across 400 points.",
              "1) Line chart: 24 months left to right, revenue on the y-axis, one line (two if comparing to the prior period) -- trends and seasonality show immediately. 2) Horizontal bar chart sorted by value, labelled with percentages; a pie or donut is tolerable here because there are only five slices summing to 100%, but bars compare lengths more accurately than angles. 3) Scatter plot with discount percentage on x and units on y, one dot per promotion, with a fitted trend line and the correlation noted; 400 points is exactly what a scatter is for."
            ),
            part(
              "Questions 4-5",
              "(4) A choropleth map of US states shaded by return rate (sequential colour scale) or, if the exact ranking matters more than geography, a sorted bar chart; (5) a table with sortable columns, consistent number formatting and conditional highlighting for the SKU look-up.",
              "4) A filled (choropleth) map of the states with a single-hue sequential colour scale for return rate, so regional patterns jump out; add a sorted bar chart of the top ten beside it, because a map makes exact comparison between two states hard. 5) A table: 40 rows x 3 measures, right-aligned numbers with the same decimals and units, sortable by column, with a subtle colour band on return rates above the target. People looking up a specific SKU want a value, not a shape."
            ),
            part(
              "Design rules for the pack",
              "Consistent colour meaning across charts (one colour per category throughout), bar axes starting at zero, direct labels and clear titles that state the finding, units on axes, colour-blind-safe palette with sufficient contrast, no chartjunk (3D, gradients), minimal gridlines, and the same time range and definitions on every page.",
              "One palette, with the same colour for the same category on every page; bar and column axes start at zero; titles state the takeaway ('Revenue up 12% year on year') with the metric and period in the subtitle; units and date ranges on every axis; a colour-blind-safe palette and labels that do not rely on colour alone; no 3D, shadows or gradients; light gridlines; and footnotes for definitions and the data refresh date."
            ),
            part(
              "The colleague's proposals",
              "Rejects the 3D pie for a 24-month trend (a pie shows parts of a whole at one point in time, not change over time, and 3D distorts the angles) and the truncated dual-axis chart (truncation exaggerates differences and dual axes can be scaled to manufacture or hide a relationship); offers the line chart and scatter instead.",
              "A pie cannot show 24 months of change -- it shows how a whole splits at one moment -- and the 3D perspective makes the front slices look bigger than they are. For question 3, a dual-axis chart lets the author pick two scales until the lines appear to move together, and truncating an axis turns a small difference into a dramatic one; both are classic misleading-chart patterns. The line chart and the scatter plot answer the questions honestly."
            ),
          ],
        },
      ],
    },
    {
      slug: "validate-dashboard-before-release",
      objective: "Applying validation and review to catch reporting issues",
      kind: "case",
      title: "Validate a revenue dashboard that is suddenly 100 times too big",
      brief:
        "Ashby Pet Supplies' finance dashboard refreshed this morning and shows Q3 revenue of $124,000,000. Last quarter it showed $1,180,000 and the business has not grown a hundredfold. Yesterday the data team added a second payment provider's feed to the revenue pipeline. You own the release review for the dashboard.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Before anyone looks at the numbers in detail, the dashboard owner asks you what validation checks should have caught this before publishing.",
          ask: "List the checks you would run on a revenue figure before release, and which one this failure would have tripped.",
          parts: [
            part(
              "Validation checks",
              "Reconciliation to a source of truth (finance ledger or provider settlement reports) within a tolerance; reasonableness/variance check against history (e.g. flag if a quarter differs from the prior by more than 30%); row counts and totals in vs. out of each pipeline stage; unit/data-type and currency checks on new sources; null and duplicate checks; a peer review of any pipeline change with a side-by-side of old and new output.",
              "1) Reconcile the total to finance's ledger or the providers' settlement reports -- it must agree within a small tolerance. 2) Variance check: compare with the previous quarter and the same quarter last year; anything outside, say, ±30% blocks publishing until explained. 3) Stage-by-stage row counts and sums so a step that multiplies or drops rows is visible. 4) For any new source: data types, units and currency confirmed against its documentation and a sample reconciled by hand. 5) Null, duplicate and date-range checks. 6) Peer review of the pipeline change with old vs. new output side by side. The variance check alone would have stopped a 100x jump."
            ),
          ],
        },
        {
          text:
            "You investigate the new feed:\n\nProvider A (existing):   amount DECIMAL(12,2), e.g. 49.99, 'amount in USD'\nProvider B (new):        amount INTEGER,       e.g. 4999,  documentation: 'minor units (cents)'\n\nQ3 rows:  Provider A 23,100 transactions, SUM = 1,150,000.00\n          Provider B 2,450 transactions,  SUM = 122,850,000 (as loaded)\n\nThe pipeline unions the two feeds and sums 'amount'.",
          ask: "State the root cause with the corrected figure, fix the pipeline, and add the control that prevents a repeat.",
          parts: [
            part(
              "Root cause and corrected figure",
              "Provider B reports amounts in cents (integer minor units) and was summed as dollars, inflating its total 100x: 122,850,000 cents = 1,228,500.00 dollars; the correct Q3 revenue is 1,150,000 + 1,228,500 = 2,378,500 (and the user should sanity-check that B's share, roughly 2,450 transactions averaging about $501, is plausible or itself needs review).",
              "Provider B's amount is in minor units: 4999 means $49.99. Summing it as dollars multiplied its contribution by 100. Corrected: 122,850,000 / 100 = $1,228,500.00. Q3 revenue = 1,150,000.00 + 1,228,500.00 = $2,378,500.00, not $124,000,000. Sanity check the result too: B averages 1,228,500 / 2,450 = about $501 per transaction against A's about $50, so confirm with the business that provider B really handles the large (wholesale) orders before publishing; if not, something else is still wrong."
            ),
            part(
              "Pipeline fix",
              "Converts provider B's amount to dollars at ingestion (amount / 100.0 cast to DECIMAL(12,2)) in the staging layer so every downstream model sees one unit, documents the unit for each source, and re-runs the quarter.",
              "In the staging model for provider B: CAST(amount AS DECIMAL(12,2)) / 100 AS amount_usd, with a column comment 'converted from minor units'. Standardise both feeds to amount_usd before the union so no downstream model ever sees mixed units. Add the unit to each source's entry in the data dictionary, reprocess Q3 and compare with the ledger."
            ),
            part(
              "Preventive control",
              "Adds automated tests to the pipeline: a per-source average-transaction-value range check (e.g. alert if the mean amount moves by more than 5x), a total-variance check against prior periods that blocks publishing, and a source-onboarding checklist requiring units/currency confirmation and a reconciled sample before a feed joins production.",
              "Three controls: a test on each source's average transaction value (fail if it is outside 0.2x-5x of its trailing average, which catches unit errors instantly); a publish gate that holds the dashboard if the quarter total is more than 30% from the prior period until someone signs off with a reason; and an onboarding checklist for new feeds -- units, currency, timezone and null handling confirmed in writing and a day's data reconciled to the provider's own report -- before the feed is unioned into production."
            ),
          ],
        },
        {
          text: "With the units fixed, the dashboard shows $2,378,500 but finance's ledger says $2,301,900 for Q3 -- about 3.3% higher on the dashboard. Finance recognises revenue on the shipment date; the dashboard filters on the order date.",
          ask: "Resolve the remaining difference and document the outcome of the review.",
          parts: [
            part(
              "Definition alignment",
              "Identifies a metric-definition mismatch (order date vs. ship date): orders placed late in Q3 but shipped in Q4 are counted by the dashboard and not the ledger; either changes the dashboard to ship date to match finance or labels the metric clearly as 'bookings by order date', and tests the reconciliation again after the change.",
              "The 3.3% is not a bug but two definitions. Orders placed in the last days of September and shipped in October are Q3 on the dashboard and Q4 in the ledger. Since the dashboard is finance's, switch its revenue measure to ship date (and keep an explicitly named 'bookings (order date)' measure if sales wants it), then re-reconcile: the totals should now agree within the tolerance, with any residual explained by returns or refunds timing."
            ),
            part(
              "Documenting the review",
              "Records the issues found (units, definition), the fixes, the new tests and gate, the reconciled figures with the ledger, and the sign-off; updates the data dictionary and the dashboard's footnote with the metric definition and refresh time.",
              "Review record: 'Q3 dashboard held: provider B amounts in cents summed as dollars (100x); fixed at staging; metric redefined to shipment date to match the ledger; reconciled Q3 revenue $2,301,900 within tolerance; added average-transaction and variance tests and a publish gate; onboarding checklist adopted.' Update the data dictionary (units per source, revenue definition) and add a footnote on the dashboard: 'Revenue recognised at shipment date; refreshed daily 06:00.' Sign-off by finance before release."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Data Governance (14%) -- 2 labs
    // -----------------------------------------------------------------------
    {
      slug: "data-quality-rules-customer-table",
      objective: "Quality assurance: profiling, monitoring, and testing data quality",
      kind: "build",
      title: "Write data-quality rules for a customer table from its profile",
      brief:
        "Profiling the customer table at Fennimore Insurance returned: 50,000 rows; customer_id has 49,880 distinct values; email is null in 1,250 rows and 310 non-null values fail a basic email pattern; state has 54 distinct values where 51 (50 states plus DC) are expected, the extras being 'Wa', 'tx' and 'N/A'; date_of_birth has 12 values after today's date; the nightly load finished at 07:40 against a 06:00 service-level target; and the sum of policy premiums in the table is 0.4% lower than the policy system's figure. Write the quality rules and how they will be monitored and tested.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Translate the profile into quality rules by dimension with computed thresholds and current pass/fail, then the monitoring and the tests that run in the pipeline.",
          parts: [
            part(
              "Completeness and uniqueness",
              "Completeness: email null rate = 1,250 / 50,000 = 2.5%; sets a rule (e.g. nulls <= 1%) and marks it failing. Uniqueness: customer_id should be unique; 50,000 - 49,880 = 120 duplicate ids (0.24%); rule 'zero duplicates', failing; prescribes investigating the duplicates' source.",
              "Completeness -- email: 1,250 nulls / 50,000 = 2.5% missing. Rule: email null rate <= 1% (email is needed for policy documents). Status: FAIL. Uniqueness -- customer_id: 50,000 rows but 49,880 distinct, so 120 rows share an id with another (0.24%). Rule: customer_id unique, zero exceptions. Status: FAIL; pull the duplicate ids and find whether they are re-loads or two real customers given one id."
            ),
            part(
              "Validity and accuracy",
              "Validity: 310 malformed emails (310 / 48,750 non-null = 0.64%); state must be in the reference list of 51 codes (uppercase, two letters) -- 'Wa' and 'tx' need standardising, 'N/A' is a null in disguise; date_of_birth must be <= today (12 failures). Accuracy: premium total within 0.1% of the policy system; currently 0.4% low, failing, so reconcile at the policy level.",
              "Validity -- email format: 310 of 48,750 non-null values (0.64%) fail the pattern; rule: 100% of non-null emails match. State: must be one of the 51 reference codes; standardise case ('Wa' -> WA, 'tx' -> TX) in the load and treat 'N/A' as null (then it counts under completeness). Date of birth: must be on or before today and after a plausible floor (e.g. 1900-01-01); 12 future dates fail. Accuracy -- premiums: table total vs. policy system within 0.1%; currently 0.4% under, FAIL; find the missing or mis-keyed policies by comparing policy ids."
            ),
            part(
              "Timeliness and consistency",
              "Timeliness: load must complete by 06:00; finished 07:40 (100 minutes late), failing; alert on the SLA. Consistency: cross-field rules such as policy start date >= date of birth + 18 years, and the premium sum consistent with the policy system; defines how each is measured.",
              "Timeliness: the nightly load must finish by 06:00 so the morning reports are current; it finished at 07:40, 100 minutes late -- FAIL, and the reports that ran at 06:30 used yesterday's data. Consistency: internal rules across fields and tables -- a customer's first policy start date must be at least 18 years after date_of_birth; every customer_id in the policies table must exist in customers (referential integrity); and the premium sum per customer must equal the policy system's for that customer, which also localises the 0.4% gap."
            ),
            part(
              "Monitoring and tests in the pipeline",
              "Implements each rule as an automated test after load (SQL assertions or a data-quality framework), with thresholds and severities (blocking vs. warning), results stored over time for trend dashboards, alerts to the data owner, and a quarantine of failing rows rather than silently publishing; re-profiles monthly to tune thresholds.",
              "Turn every rule into a test that runs right after the load: SQL assertions (SELECT COUNT(*) FROM customers WHERE email IS NULL -> compare to 1% of row count) or a data-quality tool's checks, each tagged blocking (uniqueness, accuracy, future dates) or warning (email format). Blocking failures stop publication and move the offending rows to a quarantine table for the data steward; warnings page nobody but appear on the quality dashboard, where pass rates are plotted over time. Alert the data owner on any blocking failure and on a late load. Re-run the full profile monthly and adjust thresholds as the data improves."
            ),
          ],
        },
      ],
    },
    {
      slug: "mask-customer-dataset-for-analysts",
      objective: "Privacy strategies: access control, encryption, and masking",
      kind: "build",
      title: "Prepare a customer dataset for marketing analysts without exposing PII",
      brief:
        "Goldfinch Bank's marketing analytics team wants a copy of the customer table to model product uptake. The table holds: full name, email, national ID number, date of birth, home address, postal code, account balance, and a transaction history. The analysts need to segment by age, location and spending; they do not need to contact anyone. Compliance requires that no analyst can identify a customer from the dataset, that the dataset is protected at rest and in transit, and that access is reviewable. Write the privacy design.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Classify the fields, choose a protection for each, set the access-control model, and specify encryption and auditing.",
          parts: [
            part(
              "Classification",
              "Identifies direct identifiers (full name, email, national ID), quasi-identifiers that can re-identify in combination (date of birth, address, postal code) and sensitive attributes (account balance, transactions); states that the analysts' needs (age, location, spending) can be met without any direct identifier.",
              "Direct identifiers: full name, email, national ID number -- each alone points at a person. Quasi-identifiers: date of birth, home address, postal code -- harmless alone, but birth date plus postal code plus one more fact re-identifies most people. Sensitive data: account balance and transaction history. The analysts need age bands, a location level and spending, none of which requires a direct identifier."
            ),
            part(
              "Protection per field",
              "Removes name and email and national ID (or replaces the customer with a pseudonymous key via a keyed hash/token held by a separate team); generalises date of birth to age band (or year), address removed and postal code truncated to a coarse area; keeps balance and transaction amounts but rounds/bands balances if needed and strips free-text memo fields; documents each transformation.",
              "Drop full name, email and national ID entirely; replace the customer with a pseudonymous customer_key produced by a keyed hash or token vault that only the data-governance team can reverse, so analysts can still follow one customer across tables. Date of birth -> age band (18-24, 25-34, ...). Home address -> removed; postal code -> first part only (a district), which gives location for segmentation without a doorstep. Account balance -> kept, or banded if exact values plus rare combinations could single someone out; transaction history -> amounts, dates and merchant categories kept, free-text descriptions removed. Write each rule into the dataset's documentation."
            ),
            part(
              "Access control",
              "Role-based access with least privilege: analysts get read on the masked view/schema only, never the raw table; a small named group (data stewards) holds the token key; access granted through a documented request with an owner's approval, time-limited, and reviewed periodically; column- or row-level security where the platform supports it.",
              "Create a 'marketing_analytics' role with SELECT on the masked schema only; the raw customer table is readable by a 'customer_data_steward' role of a few named people, and the re-identification key by fewer still. Access is requested through a ticket approved by the data owner, granted for a fixed term (e.g. 12 months) and re-certified quarterly; leavers are removed by the identity system. Use the warehouse's column-level security to keep any sensitive column out of the role's reach even if a view is mis-built."
            ),
            part(
              "Encryption and auditing",
              "Encryption at rest for the warehouse and any exports (platform-managed or customer-managed keys), TLS for all connections and transfers, no unencrypted CSV exports or email attachments; audit logging of who queried what and when, retained and reviewed; a retention period for the masked copy.",
              "At rest: the warehouse storage and any extracts are encrypted with managed keys; exports are allowed only to an encrypted, access-controlled location, never as e-mailed spreadsheets. In transit: every connection to the warehouse and every transfer uses TLS. Auditing: query logs record who accessed the masked schema and which columns, kept for the compliance period and reviewed monthly for unusual access; the masked copy itself has a retention date after which it is deleted or refreshed."
            ),
          ],
        },
      ],
    },
  ],
};
