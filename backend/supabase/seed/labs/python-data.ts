import { GENERAL_SAFETY, matchPart, numericPart, orderPart, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-292: Python for Data Analysis (PYDATA), nine units, no exam blueprint.
// Hybrid density (docs/labs.md): one lab per unit plus six split evenly,
// which the plan gives to units 1-5 (unit 6 has no objective the
// performance heuristic counts, so its extra is dropped): 2/2/2/2/2/1/1/1/1,
// 14 labs, one per objective.
//
// The pandas and NumPy behaviors the model answers quote were run on
// pandas 3.0.5, NumPy 2.5.3 and Matplotlib 3.11.2 under CPython 3.13.18 on
// 2026-11-14: the ChainedAssignmentError under Copy-on-Write, the inferred
// str dtype, count versus size, transform shares, merge(validate=...) raising
// MergeError on a duplicated key, resample("ME") and datetime64[us] from
// to_datetime. pandas 3.1 (the current docs) does not change any of them.
// Data and organizations are fictional.

const D = "2026-11-14";

export const PYDATA_LABS: SeedLabSet = {
  trackCode: "PYDATA",
  sources: [
    source("https://pandas.pydata.org/docs/", "reference", D),
    source("https://pandas.pydata.org/docs/whatsnew/v3.0.0.html", "reference", D),
    source("https://numpy.org/doc/stable/", "reference", D),
    source("https://matplotlib.org/stable/users/explain/quick_start.html", "reference", D),
    source("https://jupyterlab.readthedocs.io/en/stable/user/notebook.html", "reference", D),
  ],
  labs: [
    // ---- Unit 1: Notebooks & the analysis environment (2) ----
    {
      slug: "pydata-hidden-notebook-state",
      objective: "Recognize hidden state from out-of-order cells, and restart and run all before trusting a result",
      kind: "case",
      title: "The notebook that only works on one laptop",
      brief:
        "An analyst at Cedar River Water (fictional) shares usage.ipynb. On her machine the last cell prints a monthly average of 41.2 thousand gallons per meter. A colleague opens it, runs it top to bottom, and gets NameError: name 'clean' is not defined in cell 6.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The execution counts down the left side read [3], [4], [12], [5], [6], [9], [10]. Cell 5 (count [12]) defines clean = raw[raw.meter_ok] but was later edited to clean = raw[raw.meter_ok & (raw.gallons > 0)] and re-run; a cell that originally defined clean further down was deleted.",
          ask: "Explain what happened and why her 41.2 cannot be trusted.",
          parts: [
            part(
              "What happened",
              "Explains that the kernel keeps every variable from every run, so cells ran out of order and a deleted cell's variable still lived in her kernel; the saved notebook no longer contains code that defines clean before cell 6 in order, so a fresh top-to-bottom run fails; her result depends on state that is not in the file.",
              "The kernel remembers every variable ever created in the session, whether or not the cell still exists. Her clean came from a cell she later deleted, and cells ran in the order 3, 4, 12, 5, 6, 9, 10 rather than top to bottom. The file no longer describes how her numbers were made, so a fresh run breaks."
            ),
          ],
        },
        {
          text: "She agrees the notebook must reproduce from the file alone before anyone quotes the 41.2.",
          ask: "Give the steps to make the notebook trustworthy, in order.",
          parts: [
            orderPart(
              "Order of fixes",
              "Met: the order given. Partly there: one adjacent swap.",
              "Restart the kernel to throw away hidden state, fix the cell order so every name is defined before use, run all from the top, then compare the new result with 41.2 and explain any difference before sharing.",
              [
                "Restart the kernel and clear outputs",
                "Reorder and fix cells so each variable is defined before it is used",
                "Run all cells from the top",
                "Compare the fresh result with 41.2 and explain any difference",
                "Share the notebook with outputs from that clean run",
              ]
            ),
          ],
        },
      ],
    },
    {
      slug: "pydata-record-environment",
      objective: "Create an isolated environment for an analysis and record its package versions",
      kind: "build",
      title: "Make an analysis environment someone else can rebuild",
      brief:
        "Pierce County Food Bank (fictional) volunteers each run the donations analysis with whatever pandas they have installed; one has pandas 2.2, another pandas 3.1, and their string columns behave differently. Set up the project so everyone gets the same environment.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the commands to create the environment and the file you would commit, and explain why the pandas major version matters here.",
          parts: [
            part(
              "Commands and file",
              "Creates a venv (python -m venv .venv) or a conda environment, installs pandas, numpy, matplotlib and jupyterlab into it, records exact versions in a committed file (pip freeze > requirements.txt, or a lock file / environment.yml), and documents how to recreate it; the venv folder itself is not committed.",
              "python3 -m venv .venv\n.venv/bin/python -m pip install pandas numpy matplotlib jupyterlab\n.venv/bin/python -m pip freeze > requirements.txt\n\nCommit requirements.txt (exact versions such as pandas==3.1.1), not .venv. A volunteer rebuilds with python3 -m venv .venv then .venv/bin/python -m pip install -r requirements.txt and selects that environment's kernel in Jupyter."
            ),
            part(
              "Why the version matters",
              "Names a concrete pandas 3.0 change: string columns are inferred as the str dtype instead of object, and Copy-on-Write makes chained assignment never update the frame; so code and outputs differ between 2.x and 3.x.",
              "pandas 3.0 changed defaults: text columns come in as the new str dtype instead of object, and under Copy-on-Write chained assignment (df[\"a\"][mask] = x) never changes df. A 2.2 user and a 3.1 user running the same notebook can get different dtypes, warnings and even numbers, so the version is part of the analysis."
            ),
          ],
        },
      ],
    },
    // ---- Unit 2: NumPy arrays (2) ----
    {
      slug: "pydata-broadcasting-shapes",
      objective: "Predict the result shape of an operation from the broadcasting rules",
      kind: "build",
      title: "Predict the shape, or the error",
      brief:
        "Puget Sound Air Watch (fictional) stores sensor readings as NumPy arrays: readings has shape (3, 4) for 3 stations by 4 hours. For each operation below, give the result shape or say it raises an error. Use only the broadcasting rules: compare shapes from the trailing dimension; two dimensions are compatible when they are equal or one of them is 1.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each operation to its result, then fix the one that fails.",
          parts: [
            matchPart(
              "Shape of each result",
              "Met: all four. Partly there: three.",
              "(3, 4) + (4,) broadcasts the hourly row across stations: (3, 4). (3, 4) + (3, 1) broadcasts the per-station column: (3, 4). (3, 4) + (3,) compares 4 with 3: error. (2, 3, 1) * (4,) gives (2, 3, 4).",
              {
                left: ["readings + hourly_offset (shape (4,))", "readings - station_mean (shape (3, 1))", "readings + station_bias (shape (3,))", "np.ones((2, 3, 1)) * np.ones(4)"],
                right: ["(3, 4)", "(3, 4) as a column broadcast", "ValueError: operands could not be broadcast", "(2, 3, 4)", "(3, 3, 4)"],
                pairs: [0, 1, 2, 3],
                leftHeading: "Operation",
                rightHeading: "Result",
              }
            ),
            part(
              "Fix the failing one",
              "Reshapes station_bias to (3, 1) with station_bias[:, np.newaxis], station_bias[:, None] or reshape(3, 1), so it lines up with the station axis; the result is (3, 4).",
              "readings + station_bias[:, np.newaxis] turns the (3,) vector into a (3, 1) column, which broadcasts across the 4 hours: the result has shape (3, 4)."
            ),
          ],
        },
      ],
    },
    {
      slug: "pydata-vectorize-axis",
      objective: "Apply vectorized operations and aggregations along an axis",
      kind: "build",
      title: "Replace the loops with array operations",
      brief:
        "Tahoma Wind (fictional) has a (3, 4) array of turbine output, three turbines by four quarters:\n\nout = np.arange(12).reshape(3, 4)   # [[0 1 2 3] [4 5 6 7] [8 9 10 11]]\n\nThe current script uses nested for loops to get each quarter's total across turbines and each turbine's mean across quarters, then another loop to flag any value above the overall mean. Rewrite all three without Python loops.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the three expressions and give their values.",
          parts: [
            part(
              "Totals and means",
              "out.sum(axis=0) gives the per-quarter totals [12 15 18 21]; out.mean(axis=1) gives the per-turbine means [1.5 5.5 9.5]; explains that axis=0 collapses rows and axis=1 collapses columns.",
              "out.sum(axis=0)  -> array([12, 15, 18, 21])  (collapses the turbine axis: one total per quarter)\nout.mean(axis=1) -> array([1.5, 5.5, 9.5])     (collapses the quarter axis: one mean per turbine)"
            ),
            part(
              "Flag above the mean",
              "Uses a boolean comparison out > out.mean() (mean 5.5) giving a (3, 4) boolean array, with values 6 to 11 True; optionally out[out > out.mean()] to list them.",
              "high = out > out.mean()   # out.mean() is 5.5\nhigh is a (3, 4) boolean array, True for 6, 7, 8, 9, 10 and 11; out[high] returns array([ 6,  7,  8,  9, 10, 11]). One comparison replaces the loop, and it runs in compiled code."
            ),
          ],
        },
      ],
    },
    // ---- Unit 3: pandas: loading & selecting data (2) ----
    {
      slug: "pydata-copy-on-write-assignment",
      objective: "Modify a DataFrame under Copy-on-Write: assign through .loc, never through chained indexing",
      kind: "build",
      title: "Why didn't the discount apply?",
      brief:
        "Bellevue Bikes (fictional) applies a holiday price cut with:\n\ndf[\"price\"][df[\"category\"] == \"helmet\"] = 0\ndf[\"price\"][df[\"category\"] == \"helmet\"] = 29.99\n\nOn pandas 3.1 the prices did not change and the notebook shows ChainedAssignmentError. A teammate says to add .copy() to silence it.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Explain why the frame did not change, why .copy() does not help, and write the correct assignment.",
          parts: [
            part(
              "Why nothing changed",
              "Explains that under Copy-on-Write (the only mode since pandas 3.0) df[\"price\"] behaves as a copy, so setting into it with a second indexing step never updates df: chained assignment never works; the warning says so; SettingWithCopyWarning no longer exists.",
              "Since pandas 3.0 every indexing result behaves as a copy (Copy-on-Write). df[\"price\"] is a new Series as far as your code can tell, so the second step ([mask] = 29.99) changes that temporary object, not df. pandas warns with ChainedAssignmentError because this pattern can never work."
            ),
            part(
              "Correct code",
              "One-step assignment df.loc[df[\"category\"] == \"helmet\", \"price\"] = 29.99; notes .copy() would only create another copy and change nothing about df.",
              "df.loc[df[\"category\"] == \"helmet\", \"price\"] = 29.99\n\nOne .loc call names the rows and the column of df itself. Adding .copy() just makes one more copy to write into; the original stays unchanged, so it is not a fix."
            ),
          ],
        },
      ],
    },
    {
      slug: "pydata-loc-iloc-select",
      objective: "Select rows and columns with [], .loc, .iloc and boolean masks",
      kind: "build",
      title: "Answer three questions with selection only",
      brief:
        "Renton Clinic Scheduling (fictional) loads appointments.csv into df with index_col=\"appt_id\" (ids such as 5012, 5013 ...). Columns: date, provider, minutes, no_show (True/False). The rows are sorted by date. Answer with selection expressions, no loops: (1) the provider and minutes of appointment 5012; (2) the first five rows; (3) the no-show appointments longer than 30 minutes, showing only provider and minutes.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the three expressions and explain the one place where .loc and .iloc would give different answers.",
          parts: [
            part(
              "Three expressions",
              "(1) df.loc[5012, [\"provider\", \"minutes\"]] by label; (2) df.iloc[:5] or df.head() by position; (3) df.loc[df[\"no_show\"] & (df[\"minutes\"] > 30), [\"provider\", \"minutes\"]] with & and parentheses (not and).",
              "(1) df.loc[5012, [\"provider\", \"minutes\"]]\n(2) df.iloc[:5]   (or df.head())\n(3) df.loc[df[\"no_show\"] & (df[\"minutes\"] > 30), [\"provider\", \"minutes\"]]\nBoolean masks combine with & and |, each comparison in parentheses; Python's and does not work element by element."
            ),
            part(
              "loc versus iloc",
              "Explains .loc selects by index label and .iloc by integer position, so df.loc[5012] is appointment 5012 while df.iloc[5012] is the row at position 5012 (or an IndexError); and .loc slices include the end label while .iloc slices exclude the end.",
              ".loc works on labels: df.loc[5012] is appointment 5012. .iloc works on positions: df.iloc[5012] is the 5013th row, or IndexError if there are fewer. Slices differ too: df.loc[5012:5014] includes 5014, df.iloc[0:3] stops before position 3."
            ),
          ],
        },
      ],
    },
    // ---- Unit 4: Cleaning data (2) ----
    {
      slug: "pydata-missing-values-decision",
      objective: "Find and handle missing values with isna, dropna and fillna, and decide which to use",
      kind: "case",
      title: "Drop, fill or keep the gaps?",
      brief:
        "Spokane Transit Survey (fictional) has 2,000 rider survey rows with columns route, age, trips_per_week and comment. df.isna().sum() shows: route 0, age 340, trips_per_week 12, comment 1,610.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The team lead suggests df = df.dropna() to get a clean table.",
          ask: "Say what that would do here and why it is a poor choice.",
          parts: [
            part(
              "Effect of dropna()",
              "Says dropna() with no arguments drops every row with any missing value, so the 1,610 empty comments alone remove at least 80% of the rows (only rows complete in all four columns, at most 390, remain), biasing the survey toward riders who wrote comments.",
              "dropna() removes any row with a gap in any column. 1,610 rows have no comment, so at most 390 rows survive, and they are the riders who chose to write a comment, a biased subset. Every age and trips answer in the dropped rows is thrown away too."
            ),
          ],
        },
        {
          text: "The analysis questions are: average trips per week by route, and whether trips differ by age group.",
          ask: "Choose a treatment for each column and justify it.",
          parts: [
            part(
              "Per-column decisions",
              "comment: leave missing (optional free text, not used in the numbers); trips_per_week: drop only those 12 rows for the trips analysis (dropna(subset=[\"trips_per_week\"])) or leave NaN since mean skips NaN, not fill with 0; age: keep rows and treat missing as its own 'unknown' group (or analyze age only where present), not fill with the mean; reports how many rows each decision affects.",
              "comment: leave as missing; it isn't used in the calculations. trips_per_week: 12 rows (0.6%); mean() already skips NaN, or use dropna(subset=[\"trips_per_week\"]) for that analysis; filling 0 would invent non-riders. age: 340 rows (17%) is too many to drop or mean-fill; put them in an \"unknown\" age group so the age comparison shows them. Write each choice and its row count in the notebook."
            ),
          ],
        },
      ],
    },
    {
      slug: "pydata-fix-dtypes",
      objective: "Convert columns to the right dtypes, including numbers stored as text and dates",
      kind: "build",
      title: "Numbers that are really text",
      brief:
        "Yakima Orchards (fictional) exports invoices as CSV. After pd.read_csv, df.dtypes shows amount: str and invoice_date: str. Sample amount values: \"1,200\", \"35\", \"n/a\". Sample dates: \"11/03/2026\", \"11/04/2026\" (month first). df[\"amount\"].sum() fails or concatenates text.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Convert both columns and say how you would find the rows that failed to convert.",
          parts: [
            part(
              "Conversion",
              "amount: remove the thousands separator then pd.to_numeric(..., errors=\"coerce\") (or read_csv(thousands=\",\", na_values=[\"n/a\"])), giving 1200.0, 35.0 and NaN; invoice_date: pd.to_datetime with format=\"%m/%d/%Y\" (or parse_dates with a date_format), not guessing day-first.",
              "df[\"amount\"] = pd.to_numeric(df[\"amount\"].str.replace(\",\", \"\"), errors=\"coerce\")   # 1200.0, 35.0, NaN\ndf[\"invoice_date\"] = pd.to_datetime(df[\"invoice_date\"], format=\"%m/%d/%Y\")\nOr at load time: pd.read_csv(path, thousands=\",\", na_values=[\"n/a\"], parse_dates=[\"invoice_date\"], date_format=\"%m/%d/%Y\"). Stating the format avoids reading 11/03 as 11 March."
            ),
            part(
              "Finding failures",
              "Compares the original with the converted column: rows where the converted value is NaN but the original was not empty (mask = new.isna() & old.notna()), counts them and inspects them before deciding; does not silently accept coerce.",
              "Keep the raw column, then bad = df[\"amount\"].isna() & raw_amount.notna() lists every value errors=\"coerce\" turned into NaN; print bad.sum() and df[bad] and decide whether \"n/a\" really means missing. Coerce hides problems unless you look."
            ),
          ],
        },
      ],
    },
    // ---- Unit 5: Grouping & aggregation (2) ----
    {
      slug: "pydata-transform-share",
      objective: "Add a per-group value to every row with transform",
      kind: "build",
      title: "Each sale's share of its store's total",
      brief:
        "Olympia Outdoor (fictional) has a sales table:\n\nstore  sales\nA      100\nA      300\nB       50\nB      150\nB      200\n\nAdd a column share with each row's fraction of its store's total sales, keeping all five rows.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the code, explain why agg would not fit, and give the share for the last row.",
          parts: [
            part(
              "Code and why transform",
              "Uses df[\"sales\"] / df.groupby(\"store\")[\"sales\"].transform(\"sum\"); explains transform returns a result aligned to the original rows (same length), whereas agg/sum returns one row per group that would need a merge back.",
              "df[\"share\"] = df[\"sales\"] / df.groupby(\"store\")[\"sales\"].transform(\"sum\")\n\ntransform(\"sum\") returns each row's group total aligned to the original 5 rows (400 on both A rows, 400 on all three B rows). agg would return 2 rows, one per store, and need a merge to line up."
            ),
            numericPart(
              "Share of the last row",
              "Met: 0.5 (200 of store B's 400). Partly there: 0.45-0.55.",
              "Store B's total is 50 + 150 + 200 = 400, so the last row's share is 200 / 400 = 0.5. Store A's rows are 0.25 and 0.75.",
              { answer: 0.5, tolerance: 0.001, partialTolerance: 0.05 }
            ),
          ],
        },
      ],
    },
    {
      slug: "pydata-count-vs-size",
      objective: "Interpret group results correctly, including count versus size and missing keys",
      kind: "build",
      title: "Two counts that disagree",
      brief:
        "Everett Pet Clinic (fictional) counts visits per vet. A colleague's notebook has visits.groupby(\"vet\")[\"weight_kg\"].count() giving Dr. Ruiz 41 visits, while the front desk says Dr. Ruiz saw 48 patients. 7 of Dr. Ruiz's visits have no weight recorded. Also, 3 visits have no vet recorded at all, and they appear in neither number.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Explain both discrepancies and give the code that counts visits correctly, including the ones with no vet.",
          parts: [
            part(
              "count versus size",
              "Explains count() counts non-missing values of the selected column (so missing weights are excluded: 48 - 7 = 41) while size() counts rows regardless of missing values; visits per vet is size().",
              "count() counts non-missing values of weight_kg, so the 7 visits without a weight vanish: 48 - 7 = 41. size() counts rows. Visits per vet is visits.groupby(\"vet\").size()."
            ),
            part(
              "Missing keys",
              "Says groupby drops rows whose key is NaN by default; uses dropna=False to keep them as their own group (or fillna(\"unassigned\") on the key) so the 3 visits are reported.",
              "groupby leaves out rows whose group key is missing unless told otherwise. visits.groupby(\"vet\", dropna=False).size() adds a NaN group with the 3 unassigned visits, so the totals add up to the number of rows."
            ),
          ],
        },
      ],
    },
    // ---- Unit 6: Combining & reshaping data (1) ----
    {
      slug: "pydata-join-row-explosion",
      objective: "Validate a join's key relationship and row count with validate and indicator",
      kind: "case",
      title: "The join that added orders",
      brief:
        "Kent Hardware (fictional) joins orders (4 rows: order_id, cust_id) to customers (cust_id, region) with orders.merge(customers, on=\"cust_id\", how=\"left\"). The result has 5 rows, and revenue by region now totals more than revenue in the orders table.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "customers[\"cust_id\"].duplicated().sum() returns 1: customer 11 appears twice, with regions S and S2, after a sales-territory change.",
          ask: "Explain how a left join produced more rows than the left table, and how validate would have caught it.",
          parts: [
            part(
              "Row explosion",
              "Explains that each left row is paired with every matching right row, so the order for customer 11 matched two customer rows and appears twice, inflating sums; a left join keeps all left rows but does not cap them at one each.",
              "A merge pairs each order with every customer row that has the same key. Customer 11 has two rows, so their order appears twice: 4 orders become 5 rows and that order's revenue is counted twice. how=\"left\" keeps every order; it does not stop duplicates."
            ),
            part(
              "validate",
              "Uses merge(..., validate=\"many_to_one\") which raises MergeError because the right keys are not unique; adds assert len(result) == len(orders) as a check.",
              "orders.merge(customers, on=\"cust_id\", how=\"left\", validate=\"many_to_one\") raises MergeError: Merge keys are not unique in right dataset; not a many-to-one merge. Adding assert len(merged) == len(orders) after a lookup join is a cheap second guard."
            ),
          ],
        },
        {
          text: "After deduplicating customers (keeping the current region S), the team also wants to know which orders have no customer record at all.",
          ask: "How do you find them in the same join?",
          parts: [
            part(
              "indicator",
              "Uses indicator=True and filters _merge == \"left_only\" to list orders with no matching customer (or a left_anti join in pandas 3.0+).",
              "merged = orders.merge(customers, on=\"cust_id\", how=\"left\", validate=\"many_to_one\", indicator=True)\nmerged[merged[\"_merge\"] == \"left_only\"]\nlists orders whose cust_id has no customer row (here customer 12). Since pandas 3.0, how=\"left_anti\" returns those rows directly."
            ),
          ],
        },
      ],
    },
    // ---- Unit 7: Time series basics (1) ----
    {
      slug: "pydata-resample-monthly",
      objective: "Resample a series to a coarser frequency and choose the aggregate",
      kind: "build",
      title: "From readings to monthly figures",
      brief:
        "Skagit Solar Co-op (fictional) has a Series kwh indexed by timestamp, one reading per 15 minutes of energy produced in that interval, and a Series temp_c of panel temperature at the same times. A tutorial they copied uses kwh.resample(\"M\").sum(), which fails on pandas 3.1.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Fix the resample call, choose the right aggregate for each series, and say what label a monthly bin gets.",
          parts: [
            part(
              "The alias",
              "Says pandas 3.0 removed the M alias (and Q, Y) in favor of ME (month end; MS for month start); uses kwh.resample(\"ME\").",
              "\"M\" was removed in pandas 3.0; month-end is now \"ME\" (\"MS\" for month start). kwh.resample(\"ME\").sum() works."
            ),
            part(
              "Aggregates",
              "kwh: sum, because each reading is energy in its interval; temp_c: mean (or min/max), because summing temperatures has no meaning; notes count() to spot months with missing readings.",
              "Energy per interval adds up: kwh.resample(\"ME\").sum(). Temperature is a level, not an amount: temp_c.resample(\"ME\").mean() (or max for the hottest reading). kwh.resample(\"ME\").count() shows months with missing readings, whose sums would be low."
            ),
            part(
              "Bin label",
              "States that with ME each bin is labeled by the last day of the month (for example 2026-01-31 for January).",
              "With \"ME\" each monthly bin is labeled by its month-end date: January's total appears at 2026-01-31, February's at 2026-02-28."
            ),
          ],
        },
      ],
    },
    // ---- Unit 8: Plotting with matplotlib (1) ----
    {
      slug: "pydata-explicit-axes",
      objective: "Create figures with the explicit interface: plt.subplots, then methods on Axes",
      kind: "build",
      title: "Turn a pyplot snippet into a reusable chart function",
      brief:
        "Tacoma Community Pantry (fictional) builds the same chart for every site:\n\nplt.plot(df.index, df[\"visits\"])\nplt.title(\"Visits\")\nplt.savefig(\"visits.png\")\n\nWhen they draw two sites in one script, the second chart also contains the first site's line, and the saved PNG has no axis labels.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Explain the leak between charts and write a function plot_visits(df, site, path) using the explicit interface.",
          parts: [
            part(
              "Why the lines leak",
              "Explains that pyplot draws on the implicit current figure, which persists between calls, so the second plot is added to the first figure unless a new figure is created or the old one closed.",
              "pyplot functions draw on the current figure, an implicit global. Nothing created a new one, so the second site's line went onto the first site's figure."
            ),
            part(
              "Explicit function",
              "Creates its own figure with fig, ax = plt.subplots(...), calls ax.plot, ax.set_title, ax.set_xlabel and ax.set_ylabel with units, saves with fig.savefig (dpi or size set) and closes the figure (plt.close(fig)).",
              "import matplotlib.pyplot as plt\n\ndef plot_visits(df, site, path):\n    fig, ax = plt.subplots(figsize=(8, 4))\n    ax.plot(df.index, df[\"visits\"])\n    ax.set_title(f\"Weekly visits, {site}\")\n    ax.set_xlabel(\"Week\")\n    ax.set_ylabel(\"Visits (households)\")\n    fig.savefig(path, dpi=150, bbox_inches=\"tight\")\n    plt.close(fig)\n\nEach call owns its Figure and Axes, so nothing leaks, and closing the figure frees memory in a loop over many sites."
            ),
          ],
        },
      ],
    },
    // ---- Unit 9: Reproducible analysis & a capstone (1) ----
    {
      slug: "pydata-rerunnable-handover",
      objective: "Make an analysis rerunnable: raw data kept read-only, pinned versions, seeds and a run-all step",
      kind: "case",
      title: "Hand over an analysis that reruns to the same numbers",
      brief:
        "A contractor leaves Mount Baker Health Outreach (fictional) a folder: analysis.ipynb, data.csv (edited by hand twice during the project), and a chart folder. The notebook bootstraps confidence intervals with np.random.choice and its install cell says pip install pandas numpy matplotlib. The new analyst reruns it and the intervals and two totals differ from the report.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The new analyst's rerun gives a 95% interval of 18-26 visits per week where the report says 19-25, and two monthly totals are off by a handful of visits.",
          ask: "List the causes of the different results.",
          parts: [
            part(
              "Causes",
              "Names: unseeded random sampling (bootstrap changes each run); unpinned package versions (pip install latest, e.g. pandas 3 behavior changes); the raw data was edited in place so the original input is lost and edits are undocumented; possibly out-of-order notebook state in the contractor's run.",
              "Unseeded np.random.choice draws different samples every run, so intervals move. pip install without versions gives whatever is newest, and pandas 3 changed dtypes and copy behavior. data.csv was hand-edited, so neither the raw input nor the edits are recorded. And the report may have come from a kernel run out of order."
            ),
          ],
        },
        {
          text: "The team wants anyone to rebuild the report from the raw export with one command.",
          ask: "Describe the project setup that achieves it.",
          parts: [
            part(
              "Rerunnable setup",
              "Raw export kept read-only in data/raw and every edit expressed as code; a seeded Generator (np.random.default_rng(seed)) passed to the bootstrap; a pinned requirements or lock file; cleaning in a module with pytest data checks; one entry point (a script, make target or jupyter nbconvert --execute) that runs from raw data to charts in a fresh environment.",
              "data/raw/ holds the original export, never edited; cleaning edits live in src/clean.py with pytest checks on row counts and ranges. The bootstrap uses rng = np.random.default_rng(20261114) and rng.choice. requirements.txt pins exact versions. One command, e.g. python -m report or jupyter nbconvert --to notebook --execute analysis.ipynb, runs everything from raw data to charts/. Test it by running it in a new venv on another machine."
            ),
          ],
        },
      ],
    },
  ],
};
