import { GENERAL_SAFETY, matchPart, numericPart, orderPart, part, selectPart, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-266: Microsoft Certified: Power BI Data Analyst Associate (PL-300).
//
// Aligned to the PL-300 study guide (skills measured as of April 20, 2026;
// read 2026-11-14): Prepare the data 25-30% / Model the data 25-30% /
// Visualize and analyze the data 25-30% / Manage and secure Power BI 15-20%.
// Density (docs/labs.md, "hybrid"): one lab per domain plus six weighted
// extras -> 3 / 3 / 2 / 2 = 10 labs (9 build, 1 case).
//
// Every product behavior below was read on learn.microsoft.com on
// 2026-11-14 (sources[] lists the pages). DAX was not executed (no Power BI
// engine was available); each formula uses only functions whose reference
// pages were read that day, and the numbers in the semi-additive lab are
// arithmetic on the brief's own data. Organizations are fictional.

export const PL300_LABS: SeedLabSet = {
  trackCode: "PL300",
  sources: [
    source("https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/pl-300", "exam_outline", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/power-bi/transform-model/desktop-storage-mode", "reference", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/fabric/fundamentals/direct-lake-overview", "reference", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/power-query/unpivot-column", "reference", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/power-query/merge-queries-overview", "reference", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/dax/removefilters-function-dax", "reference", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/dax/divide-function-dax", "reference", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/dax/totalytd-function-dax", "reference", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/dax/sameperiodlastyear-function-dax", "reference", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/dax/lastnonblank-function-dax", "reference", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/power-bi/guidance/model-date-tables", "reference", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualization-types-for-reports-and-q-and-a", "reference", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-drillthrough", "reference", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/fabric/security/service-admin-row-level-security", "reference", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/data-integration/gateway/service-gateway-onprem", "reference", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/power-bi/connect-data/refresh-scheduled-refresh", "reference", "2026-11-14"),
  ],
  labs: [
    // ---------------------------------------------- Prepare the Data (3)
    {
      slug: "pl300-choose-storage-mode",
      objective: "Choosing Import, DirectQuery or Direct Lake storage for a stated data size and freshness need",
      kind: "build",
      title: "Pick a storage mode for four tables",
      brief:
        "Northwind Rail (fictional) is building one semantic model with four sources:\n1. Ticket scans: 3 billion rows already stored as Delta tables in a Fabric lakehouse.\n2. A 40-row Excel budget updated once a month.\n3. Live seat availability in an operational Azure SQL database; planners need what the database holds right now, and the data may not be copied.\n4. A Station dimension used by both the seat-availability table and imported tables.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each table to a storage mode and justify the two hardest choices.",
          parts: [
            matchPart(
              "Storage mode per table",
              "Ticket scans -> Direct Lake; budget -> Import; live seat availability -> DirectQuery; Station dimension -> Dual.",
              "Ticket scans: Direct Lake reads the Delta tables in OneLake without copying them, and like Import is answered by the VertiPaq engine. Budget: Import -- tiny, changes monthly. Seat availability: DirectQuery sends each query to the source, so results are current and nothing is copied. Station: Dual acts as Import or DirectQuery depending on the query, which keeps its relationships to the DirectQuery table regular.",
              {
                left: ["Ticket scans (Delta tables in a lakehouse)", "Excel budget", "Live seat availability", "Station dimension shared by both"],
                right: ["Direct Lake", "Import", "DirectQuery", "Dual", "Live connection"],
                pairs: [0, 1, 2, 3],
              }
            ),
            part(
              "Justification",
              "Explains that importing 3 billion rows is impractical when the data is already Delta in Fabric, and that DirectQuery trades speed for currency because every visual queries a source not optimized for report load; Dual avoids limited relationships between DirectQuery and Import tables.",
              "Copying 3 billion rows into an Import model would be slow and duplicate storage; Direct Lake was designed for large Delta tables in Fabric. DirectQuery is the only mode that shows what the operational database holds at query time, at the cost of slower visuals and load on that database. Relationships between DirectQuery and Import tables are limited; setting the shared dimension to Dual keeps them regular."
            ),
          ],
        },
      ],
    },
    {
      slug: "pl300-unpivot-monthly-columns",
      objective: "Grouping and aggregating rows, and pivoting, unpivoting or transposing a table into shape",
      kind: "build",
      title: "Reshape a wide monthly spreadsheet for a line chart",
      brief:
        "Aster Clinics' (fictional) finance team sends a sheet with one row per clinic and one column per month: Clinic | Jan | Feb | Mar | ... | Dec. Each new month adds a column. The analyst wants a monthly trend line per clinic, and a total visits figure per clinic per quarter.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Order the Power Query steps, and explain why the choice of unpivot command matters next month.",
          parts: [
            orderPart(
              "Power Query steps",
              "Promote headers, select Clinic and use Unpivot Other Columns, rename Attribute/Value to Month/Visits, set data types, then add a Quarter column and Group By Clinic and Quarter (sum of Visits).",
              "1) Use first row as headers. 2) Select Clinic and choose Unpivot Other Columns -- every month column becomes rows of Attribute and Value. 3) Rename them Month and Visits. 4) Set Visits to a whole number and turn Month into a date or month number. 5) Add a Quarter column. 6) Group By Clinic and Quarter with Sum of Visits for the quarterly table.",
              [
                "Use first row as headers",
                "Select Clinic, then Unpivot Other Columns",
                "Rename Attribute to Month and Value to Visits",
                "Set data types for Month and Visits",
                "Add a Quarter column from Month",
                "Group By Clinic and Quarter, summing Visits",
              ]
            ),
            part(
              "Which unpivot command survives a new month",
              "Unpivot Other Columns (keep Clinic) and Unpivot Columns both unpivot every column except the ones left out, so a new month column is picked up on refresh; Unpivot only selected columns hard-codes the selected month names, so a new month stays wide.",
              "Microsoft's Power Query documentation describes three commands. Unpivot other columns (select Clinic) and Unpivot columns (select the months) both record the columns to leave alone, so a column added next month is unpivoted on refresh. Unpivot only selected columns records the selected columns by name, so a new month would not be unpivoted -- use it only when the extra columns must stay as they are."
            ),
          ],
        },
      ],
    },
    {
      slug: "pl300-merge-join-kinds",
      objective: "Combining queries with merge (a join) and append (a union)",
      kind: "build",
      title: "Choose the merge or append for four questions",
      brief:
        "Bramblewood Outdoor (fictional) has Sales (one row per sale with StoreID), Stores (StoreID, Region), and two files with identical columns, Returns2025 and Returns2026. Analysts ask four things of Power Query.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each request to the operation, and say what a left outer merge produces for a sale whose store is missing from Stores.",
          parts: [
            matchPart(
              "Operation per request",
              "Region on every sale, keeping sales with unknown stores -> left outer merge; only sales whose store exists -> inner merge; sales whose StoreID matches no store (data-quality list) -> left anti merge; one Returns table for both years -> append.",
              "Left outer keeps every Sales row and adds Region where a store matches. Inner keeps only matches. Left anti returns the Sales rows with no match in Stores -- exactly the orphan list. Append stacks two tables with the same columns, like UNION ALL.",
              {
                left: ["Region on every sale, unmatched sales kept", "Only sales with a known store", "Sales whose StoreID matches no store", "One Returns table for 2025 and 2026"],
                right: ["Left outer merge", "Inner merge", "Left anti merge", "Append queries", "Full outer merge"],
                pairs: [0, 1, 2, 3],
              }
            ),
            part(
              "Unmatched row in a left outer merge",
              "The sale is kept and the expanded Region column is null for it; duplicate StoreIDs in Stores would duplicate sales rows, so the key in Stores must be unique.",
              "The sale stays, and after expanding the Stores column its Region is null. If Stores held the same StoreID twice, each matching sale would appear twice, inflating totals -- check that the key on the Stores side is unique before merging."
            ),
          ],
        },
      ],
    },
    // ---------------------------------------------- Model the Data (3)
    {
      slug: "pl300-percent-of-total-calculate",
      objective: "Changing filter context with CALCULATE and filter modifiers such as ALL and REMOVEFILTERS",
      kind: "build",
      title: "Show each region's share of all sales",
      brief:
        "Quayside Coffee (fictional) has a measure Total Sales = SUM(Sales[Amount]) and a Region table related to Sales. A matrix by Region shows North 300, South 200, West 500 (total 1,000). The manager wants a % of all regions column that still shows each region's share when a slicer selects a single month.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the measure, give North's value, and explain what CALCULATE and REMOVEFILTERS do here.",
          parts: [
            part(
              "Measure",
              "Share = DIVIDE([Total Sales], CALCULATE([Total Sales], REMOVEFILTERS(Region))) -- ALL(Region) is equivalent here; DIVIDE avoids an error on zero. Removing filters only from Region keeps the month slicer applied.",
              "Region Share =\nDIVIDE (\n    [Total Sales],\n    CALCULATE ( [Total Sales], REMOVEFILTERS ( Region ) )\n)\n\nCALCULATE evaluates [Total Sales] in a modified filter context; REMOVEFILTERS(Region) clears the region filter coming from the matrix row, so the denominator is the all-region total for whatever month the slicer selects. DIVIDE returns BLANK instead of an error when the denominator is 0."
            ),
            numericPart(
              "North's share",
              "0.3 (30%).",
              "300 / 1,000 = 0.3, shown as 30% when the measure is formatted as a percentage.",
              { answer: 0.3, tolerance: 0.001 }
            ),
            part(
              "Why not ALL(Sales)",
              "Explains that removing all filters from Sales (or using ALL on the whole model) would also remove the month slicer's filter, so the denominator would be the all-time total, not the selected month's.",
              "REMOVEFILTERS(Sales) or ALL(Sales) would clear every filter that reaches Sales, including the month slicer, making each share a fraction of all-time sales. Clearing only Region keeps the other filters in place."
            ),
          ],
        },
      ],
    },
    {
      slug: "pl300-date-table-time-intelligence",
      objective: "Building and marking a shared date table",
      kind: "build",
      title: "Fix year-to-date measures that return wrong totals",
      brief:
        "Tern Valley Books (fictional) has Sales[OrderDate] and uses Sales[OrderDate] directly in TOTALYTD. There is no sale on several days, and the fiscal year ends June 30. Year-to-date and prior-year comparisons look wrong around gaps and the fiscal year boundary.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Build and mark a date table, write fiscal YTD and prior-year measures, and say what the date table must contain.",
          parts: [
            part(
              "Date table requirements",
              "One row per date, unique dates, no blanks, no missing dates, covering full years; marked as the model's date table and related one-to-many to Sales[OrderDate]. CALENDAR or CALENDARAUTO (which returns full years) are acceptable builders.",
              "Date = CALENDARAUTO ( 6 )   -- fiscal years ending in June\n\nThe date column must be unique, contain no BLANKs and no missing dates, and span full years (they need not be calendar years). Mark it as a date table and relate Date[Date] to Sales[OrderDate] (one-to-many). Time intelligence then works on complete date ranges, not only on days that had a sale."
            ),
            part(
              "Measures",
              "Fiscal YTD with TOTALYTD([Total Sales], 'Date'[Date], \"6/30\"); prior year with CALCULATE([Total Sales], SAMEPERIODLASTYEAR('Date'[Date])); both reference the date table, not Sales[OrderDate].",
              "Sales FYTD = TOTALYTD ( [Total Sales], 'Date'[Date], \"6/30\" )\nSales PY = CALCULATE ( [Total Sales], SAMEPERIODLASTYEAR ( 'Date'[Date] ) )\n\nTOTALYTD's year_end_date \"6/30\" makes the year restart on July 1 (the year part of that string is ignored). SAMEPERIODLASTYEAR shifts the dates in the current context back one year."
            ),
          ],
        },
      ],
    },
    {
      slug: "pl300-closing-balance-semi-additive",
      objective: "Writing semi-additive measures, such as a closing balance, that must not sum over time",
      kind: "build",
      title: "Report January's closing stock instead of a meaningless sum",
      brief:
        "Fieldstone Hardware (fictional) loads weekly stock snapshots into Inventory[Units]: Jan 3: 120, Jan 10: 90, Jan 17: 150, Jan 24: 80. A matrix by month shows January stock as 440.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Explain 440, write a closing-stock measure, and give January's closing and average stock.",
          parts: [
            part(
              "Why 440 is wrong",
              "Stock is a balance at a point in time; adding snapshots across dates double-counts units (120 + 90 + 150 + 80 = 440). It may be summed across products or stores, but not across time.",
              "SUM adds four snapshots of the same shelves: 120 + 90 + 150 + 80 = 440. Balances are semi-additive -- summing across stores or products is fine, summing across dates is not."
            ),
            part(
              "Closing-stock measure",
              "Uses the last date that has data in the current context, e.g. CALCULATE(SUM(Inventory[Units]), LASTNONBLANK('Date'[Date], CALCULATE(SUM(Inventory[Units])))); explains LASTDATE would pick January 31, which has no snapshot, and return blank.",
              "Closing Units =\nCALCULATE (\n    SUM ( Inventory[Units] ),\n    LASTNONBLANK ( 'Date'[Date], CALCULATE ( SUM ( Inventory[Units] ) ) )\n)\n\nLASTNONBLANK returns the last date in context where the expression is not blank -- January 24 here. CLOSINGBALANCEMONTH or LASTDATE evaluate at the last calendar date of the month (January 31), where there is no snapshot, so they would show blank for this weekly data."
            ),
            numericPart(
              "January closing stock",
              "80 (the January 24 snapshot). Average stock is 110 (440 / 4).",
              "Closing: 80, the last snapshot. Average of the four snapshots: 440 / 4 = 110.",
              { answer: 80, tolerance: 0 }
            ),
          ],
        },
      ],
    },
    // ---------------------------------------------- Visualize and Analyze (2)
    {
      slug: "pl300-pick-the-visual",
      objective: "Picking the visual type that fits a comparison, trend, composition or distribution question",
      kind: "build",
      title: "Pick a visual for each executive question",
      brief:
        "Kingfisher Air (fictional) leadership asks five questions for one report page.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each question to the visual that answers it best, and name one misuse to avoid.",
          parts: [
            matchPart(
              "Visual per question",
              "On-time rate this month -> card; on-time rate by month over two years -> line chart; how fuel, crew and fees moved last year's profit to this year's -> waterfall; does ticket price relate to load factor across routes -> scatter; which airport and aircraft type drive delays (drill in any order) -> decomposition tree.",
              "A card shows one number prominently. A line chart shows the shape of a measure over continuous time. A waterfall shows how positive and negative changes move a starting value to an ending one. A scatter plots two numeric measures to reveal correlation and clusters. A decomposition tree aggregates across several dimensions and lets the user drill in any order.",
              {
                left: [
                  "On-time rate this month",
                  "On-time rate by month over two years",
                  "How fuel, crew and fees changed profit year over year",
                  "Does ticket price relate to load factor across routes?",
                  "Which airport and aircraft type drive delays, explored in any order",
                ],
                right: ["Card", "Line chart", "Waterfall chart", "Scatter chart", "Decomposition tree", "Pie chart"],
                pairs: [0, 1, 2, 3, 4],
              }
            ),
            part(
              "A misuse to avoid",
              "Names a concrete misuse, e.g. a pie chart with many slices or for change over time, a line chart over unordered categories, or a truncated axis exaggerating a small difference.",
              "A pie chart for twelve months of on-time rates hides the trend a line chart shows; a line connecting unordered categories (airports) implies a sequence that does not exist."
            ),
          ],
        },
      ],
    },
    {
      slug: "pl300-drillthrough-page",
      objective: "Configuring drillthrough pages, sync slicers and the Selection pane",
      kind: "build",
      title: "Set up a drillthrough from a summary to a customer detail page",
      brief:
        "Harrow Insurance's (fictional) summary page lists customers in a table; agents want to right-click a customer and jump to a Customer Detail page filtered to that customer, with the year slicer set on the summary page applied there too, and a way back.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Order the setup steps and say how the year selection reaches the detail page.",
          parts: [
            orderPart(
              "Setup steps",
              "Create the detail page and its visuals; add Customer to that page's Drillthrough filters well; confirm the automatic back button; on the summary page right-click a customer and choose Drill through > Customer Detail.",
              "1) Create the Customer Detail page and its visuals. 2) In the Visualizations pane, add the Customer field to the page's Drillthrough filters well (\"Add drillthrough fields here\"). 3) Power BI adds a Back button automatically -- keep it. 4) From any visual on the summary page that contains Customer, right-click a customer and choose Drill through > Customer Detail.",
              [
                "Create the Customer Detail page and its visuals",
                "Add Customer to the page's Drillthrough filters well",
                "Keep the Back button Power BI adds",
                "Right-click a customer on the summary page and choose Drill through",
              ]
            ),
            part(
              "Carrying the year selection",
              "Puts a Year slicer on both pages and connects them in the Sync slicers pane (sync, and optionally hide on the detail page) so the selection follows the user; checks that the detail page is filtered to the customer AND the year.",
              "Add the Year slicer to the Customer Detail page too and connect the two in View > Sync slicers, so a year picked on the summary page is already applied when the agent drills through (the copy can be hidden on the detail page if agents should not change it there). Test by drilling through with two different years selected."
            ),
          ],
        },
      ],
    },
    // ---------------------------------------------- Manage and Secure (2)
    {
      slug: "pl300-rls-regional-managers",
      objective: "Implementing row-level security roles with DAX filters and mapping groups to them",
      kind: "case",
      title: "Make regional managers see only their region",
      brief:
        "Pelican Freight (fictional) publishes a sales report to a workspace. Each regional manager may see only their region's rows; the analytics team builds the report.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The model has a Region table (Region, ManagerEmail) related one-to-many to Sales. There are 12 regions and managers change twice a year.",
          ask: "Design the role so it does not need editing when a manager changes.",
          parts: [
            part(
              "Dynamic role",
              "One role with a DAX filter on Region such as [ManagerEmail] = USERPRINCIPALNAME(), so the filter flows to Sales through the relationship; members are added in the Power BI service (ideally a security group of all managers).",
              "Create one role, Regional Manager, with the table filter on Region: [ManagerEmail] = USERPRINCIPALNAME(). The filter propagates from Region to Sales over the one-to-many relationship. In the service, add a security group of managers to the role; when a manager changes, only the Region table's email changes."
            ),
          ],
        },
        {
          text: "Testing in the service, a manager who is a workspace Member sees every region. Another manager added as a Viewer sees only her region.",
          ask: "Explain the difference and fix the access.",
          parts: [
            part(
              "Why the Member sees everything",
              "RLS applies only to users with Viewer permission; workspace Admin, Member and Contributor roles can edit the semantic model and are not restricted. Fix: give managers the Viewer role (or share an app) and keep edit roles for the analytics team.",
              "RLS restricts only Viewers. Workspace Admins, Members and Contributors have edit permission on the semantic model, so RLS does not apply to them. Make managers Viewers (or distribute through an app) and keep Member/Contributor for the people who build the report. RLS still applies to a Viewer who also has Build permission."
            ),
          ],
        },
        {
          text: "Before release, the team wants to prove the role works without signing in as each manager.",
          ask: "How do they validate it?",
          parts: [
            part(
              "Validation",
              "Uses the View as role feature before publishing and, in the service, Test as role with Now viewing as set to a specific manager, then compares totals with the region's expected figures; notes that test-as only simulates membership.",
              "Before publishing, View as role shows the report through the role. In the service, the semantic model's security page offers Test as role; Now viewing as can switch to a specific person, which for this dynamic role shows that manager's region. Compare each region's totals with known figures. Test as role simulates membership and does not fully reproduce another user's sign-in context (B2B guests, embedding), so spot-check with a real Viewer account too."
            ),
          ],
        },
      ],
    },
    {
      slug: "pl300-gateway-and-refresh",
      objective: "Deciding when an on-premises data gateway is required and scheduling a semantic model refresh",
      kind: "build",
      title: "Decide which sources need a gateway and plan refresh",
      brief:
        "Granite Ridge Schools (fictional) imports four sources into one semantic model: a SQL Server database in the district's data center, an Excel file on a file share in the same data center, a SharePoint Online list, and an Azure SQL Database. The workspace is on Power BI Pro, and principals want the data refreshed every two hours during the 7 a.m.-5 p.m. school day.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Pick the sources that need a gateway, say which gateway mode, and check the schedule against the license.",
          parts: [
            selectPart(
              "Sources that need a gateway",
              "Selects the on-premises SQL Server and the Excel file on the on-premises file share; SharePoint Online and Azure SQL Database are cloud sources the service reaches directly.",
              "The on-premises SQL Server and the file-share Excel file sit inside the district's network, which the service cannot reach; an on-premises data gateway bridges them using outbound connections only. SharePoint Online and Azure SQL Database are cloud services the Power BI service can reach without a gateway.",
              {
                lines: ["SQL Server in the district data center", "Excel file on the data center file share", "SharePoint Online list", "Azure SQL Database"],
                correct: [0, 1],
                display: "list",
              }
            ),
            part(
              "Gateway mode",
              "Standard mode, because the semantic model is shared and other people's reports depend on it; personal mode serves only one user and only Power BI.",
              "Install the on-premises data gateway in standard mode on a server that is always on, add both data sources to it, and keep it within Microsoft's supported releases (the last six monthly releases). Personal mode is for one user who shares no data sources."
            ),
            numericPart(
              "Refreshes in the requested schedule",
              "6 per day (7, 9, 11, 1, 3, 5), within Pro's limit of 8 scheduled refreshes per day.",
              "Every two hours from 7 a.m. to 5 p.m. is 6 refreshes, under Power BI Pro's maximum of 8 scheduled refreshes a day (Premium per user and capacity allow up to 48).",
              { answer: 6, tolerance: 0 }
            ),
          ],
        },
      ],
    },
  ],
};
