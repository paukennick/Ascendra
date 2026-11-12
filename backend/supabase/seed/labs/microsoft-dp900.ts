import { GENERAL_SAFETY, part, type SeedLabSet, matchPart, numericPart, selectPart } from "./types";
import { source } from "../sources";

// REQ-156: Microsoft Certified: Azure Data Fundamentals (DP-900).
//
// Aligned to the DP-900 study guide (skills measured as of July 21, 2026;
// re-read 2026-11-07): Core data concepts 25-30% / Relational data on Azure
// 20-25% / Non-relational data on Azure 15-20% / Analytics workload 25-30%.
//   https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/dp-900
// Density (docs/labs.md, policy "hybrid"): a fundamentals outline is mostly
// "describe" objectives, so the plan is 1 / 1 / 1 / 1 = 4 labs (all build),
// each on the one skill per domain the exam tests by applying: matching a
// store to a need, writing the common SQL statements, choosing a Cosmos DB
// API, choosing a visual.
//
// Service descriptions were read on learn.microsoft.com on 2026-11-07
// (sources[]). The SQL in the model answers uses only standard constructs and
// was executed against PostgreSQL 16 locally on 2026-11-07 (no SQL Server was
// available in that session); it is also valid Transact-SQL. Every lab is
// needs_expert_review until a data professional checks it.
//
// REQ-234 (2026-11-11): topped up to 2 / 2 / 2 / 2 = 8 labs, one more per
// unit (workloads and roles; normalization; Blob access tiers; batch versus
// streaming), above the hybrid plan's 1 / 1 / 1 / 1 on purpose: the plan's
// performance-verb heuristic finds almost nothing to do in a "describe"
// outline, which left the course with four labs. The override and its
// rule (at least the plan, at most three a unit) are LAB_PLAN_TOP_UPS in
// scripts/generate-labs-lib.ts. Values read on learn.microsoft.com on
// 2026-11-11: the study guide (unchanged, skills measured as of July 21,
// 2026), the normalization unit of "Explore fundamental relational data
// concepts", Blob access tiers (30 / 90 / 180-day minimums, rehydration up
// to 15 hours), Fabric Real-Time Intelligence and Azure Stream Analytics.

export const DP900_LABS: SeedLabSet = {
  trackCode: "DP900",
  sources: [
    // Exam outline (checked 2026-11-07)
    source("https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/dp-900", "exam_outline", "2026-11-07"),
    // Azure Storage services, Data Lake Storage, Table storage
    source("https://learn.microsoft.com/en-us/azure/storage/", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/storage/blobs/data-lake-storage-introduction", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/storage/tables/", "reference", "2026-11-07"),
    // Azure SQL Database tiers (Hyperscale page compares the tiers)
    source("https://learn.microsoft.com/en-us/azure/azure-sql/database/service-tier-hyperscale?view=azuresql", "reference", "2026-11-07"),
    // Azure Cosmos DB APIs
    source("https://learn.microsoft.com/en-us/azure/cosmos-db/", "reference", "2026-11-07"),
    // Power BI visualization guidance
    source("https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualizations-overview", "reference", "2026-11-07"),
  ],
  labs: [
    // ----------------------------------------------------------------------
    // Unit 1: Core Data Concepts (1)
    // ----------------------------------------------------------------------
    {
      slug: "match-azure-datastores",
      objective: "Identifying Azure datastores for common use cases",
      kind: "build",
      title: "Match an Azure data store to each requirement",
      brief:
        "Juniper Outdoor, a fictional retailer, is moving four data needs to Azure. (1) Product photos and PDF manuals, millions of files, served to the website. (2) The order system: customers, orders and payments with strict consistency, transactions across tables and reports that join them. (3) A device-telemetry archive for analytics: billions of small JSON and Parquet files that analysts query in folders by year, month and day, with whole folders renamed or deleted as data is reorganized. (4) A legacy Windows application that writes to a shared network drive over SMB and cannot be changed.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Name the Azure data store for each need, say whether the data is structured, semi-structured or unstructured, and give the deciding reason.",
          parts: [
            matchPart("Data store for each need", "(1) Blob Storage, (2) Azure SQL Database, (3) Data Lake Storage, (4) Azure Files. Cosmos DB for Table fits none. All four right is met; two or three is partly there.", "(1) Azure Blob Storage: object storage for unstructured files. (2) Azure SQL Database: structured data with a fixed schema, transactions and joins. (3) Azure Data Lake Storage: Blob Storage with the hierarchical namespace, so folder renames and deletes are atomic. (4) Azure Files: managed SMB shares, no code change.", {"leftHeading": "Need", "rightHeading": "Data store", "left": ["(1) Millions of product photos and PDF manuals", "(2) Orders, customers and payments with transactions and joins", "(3) Telemetry files analysts query and reorganize by folder", "(4) A legacy app writing to a network drive over SMB"], "right": ["Azure Blob Storage", "Azure SQL Database", "Azure Data Lake Storage", "Azure Files", "Azure Cosmos DB for Table"], "pairs": [0, 1, 2, 3]}),
            part("Data type and deciding reason", "Says whether each is structured, semi-structured or unstructured and gives the deciding reason: Photos and manuals: Chooses Azure Blob Storage, calls the files unstructured data, and gives the reason that Blob Storage is object storage optimized for large amounts of unstructured data served over HTTP. Order system: Chooses a relational database, Azure SQL Database (or another Azure relational service), calls the data structured, and cites tables with a fixed schema, transactions and joins as the reason. Telemetry archive: Chooses Azure Data Lake Storage (Blob Storage with the hierarchical namespace), calls the JSON semi-structured and the Parquet files analytics files, and gives the reason that the hierarchical namespace makes directory rename and delete single atomic operations and suits big-data analytics tools. Legacy SMB application: Chooses Azure Files, giving the reason that it provides managed file shares that can be mounted over SMB from Windows without changing the application.", "Photos and manuals: Azure Blob Storage. Images and PDFs are unstructured data (no fixed schema inside them), and Blob Storage is object storage built for massive amounts of unstructured files, addressable by URL so the website can serve them directly. Order system: Azure SQL Database. Customers, orders and payments are structured data in tables with a fixed schema; a relational engine gives transactions across tables for consistency and SQL joins for the reports. It is a transactional (OLTP) workload. Telemetry archive: Azure Data Lake Storage: a storage account with the hierarchical namespace enabled, built on Blob Storage for big-data analytics. The JSON is semi-structured and Parquet is a columnar analytics format. With the hierarchical namespace, folders are real directories, so renaming or deleting a year/month/day folder is one atomic metadata operation instead of touching every file, and analytics engines read the folder layout directly. Legacy SMB application: Azure Files. It gives a fully managed file share in the cloud that the Windows application can mount over SMB like the old network drive, so the application does not change. Files on the share can be any type; here they are whatever the application writes."),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Unit 2: Relational Data on Azure (1)
    // ----------------------------------------------------------------------
    {
      slug: "write-common-sql-statements",
      objective: "Common SQL statements",
      kind: "build",
      title: "Write the SQL for a small order database",
      brief:
        "A fictional bookshop, Fennel Lane Books, has two tables. Customers(CustomerId, FullName, City) and Orders(OrderId, CustomerId, OrderDate, TotalAmount). CustomerId in Orders refers to Customers. The shop manager asks for: (a) a list of every order placed by customers in Bristol, showing the customer's name, the order date and the amount; (b) the total amount ordered by each customer, but only customers whose total is above 500; (c) a correction: order 1042 was mispriced and its TotalAmount must become 59.90; (d) a new customer, Priya Nair in Leeds, with CustomerId 301. The manager also wants to know which of these statements change data and which only read it.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write each statement and classify it.",
          parts: [
            part(
              "(a) Orders from Bristol customers",
              "A SELECT that joins Orders to Customers on CustomerId (JOIN ... ON or an equivalent WHERE join), filters WHERE City = 'Bristol', and returns the customer name, order date and amount.",
              "SELECT c.FullName, o.OrderDate, o.TotalAmount\nFROM Orders AS o\nJOIN Customers AS c ON c.CustomerId = o.CustomerId\nWHERE c.City = 'Bristol';"
            ),
            part(
              "(b) Customers with totals above 500",
              "A SELECT with SUM(TotalAmount) grouped by customer (GROUP BY the customer columns) and a HAVING clause filtering the aggregate above 500 -- not a WHERE on the sum.",
              "SELECT c.CustomerId, c.FullName, SUM(o.TotalAmount) AS TotalOrdered\nFROM Customers AS c\nJOIN Orders AS o ON o.CustomerId = c.CustomerId\nGROUP BY c.CustomerId, c.FullName\nHAVING SUM(o.TotalAmount) > 500;"
            ),
            part(
              "(c) Correct order 1042 and (d) add the customer",
              "An UPDATE Orders SET TotalAmount = 59.90 WHERE OrderId = 1042 (with the WHERE clause, so only one row changes) and an INSERT INTO Customers (CustomerId, FullName, City) VALUES (301, 'Priya Nair', 'Leeds').",
              "UPDATE Orders\nSET TotalAmount = 59.90\nWHERE OrderId = 1042;\n\nINSERT INTO Customers (CustomerId, FullName, City)\nVALUES (301, 'Priya Nair', 'Leeds');\n\nThe WHERE on the UPDATE matters: without it every order would be repriced."
            ),
            part(
              "Which statements change data",
              "Classifies SELECT as a read-only query, UPDATE and INSERT (and DELETE) as Data Manipulation Language that changes rows, and distinguishes these from Data Definition Language such as CREATE TABLE or ALTER TABLE, which changes the structure rather than the rows.",
              "(a) and (b) are SELECT statements: they read data and change nothing. (c) UPDATE and (d) INSERT are Data Manipulation Language (DML), like DELETE: they change the rows in the tables. Neither is Data Definition Language (DDL): CREATE, ALTER and DROP change the structure of tables and other objects, not the data in them."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Unit 3: Non-Relational Data on Azure (1)
    // ----------------------------------------------------------------------
    {
      slug: "choose-cosmos-db-api",
      objective: "Azure Cosmos DB APIs",
      kind: "build",
      title: "Pick an Azure Cosmos DB API for each application",
      brief:
        "Hollowell Games, a fictional studio, is adopting Azure Cosmos DB for four systems. (1) A new player-profile service the team is writing from scratch, storing JSON documents and querying them with a SQL-like language. (2) An existing inventory service written against MongoDB drivers, which the team wants to move with as little code change as possible. (3) A social feature mapping which players are friends with whom, with queries such as 'friends of friends who play the same game'. (4) An old telemetry store built on Azure Table Storage that needs global distribution and higher throughput without a rewrite.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Choose the Cosmos DB API for each system and give the deciding reason.",
          parts: [
            matchPart("API for each system", "(1) NoSQL, (2) MongoDB, (3) Apache Gremlin, (4) Table. The Cassandra API fits none. All four right is met; two or three is partly there.", "(1) for NoSQL: the native document API with SQL-style queries. (2) for MongoDB: wire-protocol compatible, so drivers keep working. (3) for Apache Gremlin: the graph API for traversals such as friends of friends. (4) for Table: keeps the Table model and SDK with global distribution. Nothing here uses Cassandra.", {"leftHeading": "System", "rightHeading": "Cosmos DB API", "left": ["(1) New player-profile service, JSON with SQL-like queries", "(2) Existing inventory service on MongoDB drivers", "(3) Friends-of-friends social graph", "(4) Old Azure Table Storage telemetry store"], "right": ["Azure Cosmos DB for NoSQL", "Azure Cosmos DB for MongoDB", "Azure Cosmos DB for Apache Gremlin", "Azure Cosmos DB for Table", "Azure Cosmos DB for Apache Cassandra"], "pairs": [0, 1, 2, 3]}),
            part("Deciding reasons", "Gives the deciding reason for each: New player-profile service: Chooses Azure Cosmos DB for NoSQL, because it is the native document API with SQL-style queries, automatic indexing and schema flexibility, which suits a new application. Existing MongoDB inventory service: Chooses Azure Cosmos DB for MongoDB, because it is wire-protocol compatible so the existing drivers and tools keep working. Friends graph: Chooses Azure Cosmos DB for Apache Gremlin, because it is the graph API and the Gremlin traversal language answers relationship queries like friends of friends. Table Storage telemetry: Chooses Azure Cosmos DB for Table, because it modernizes Azure Table Storage applications with global distribution and higher throughput while keeping the Table data model and SDK.", "New player-profile service: Azure Cosmos DB for NoSQL: the native API for document data, with SQL-style queries over JSON, automatic indexing and schema flexibility. A new application with no existing driver dependency should use it. Existing MongoDB inventory service: Azure Cosmos DB for MongoDB: it speaks the MongoDB wire protocol, so the existing application keeps its MongoDB drivers and tools and migrates with minimal code change. Friends graph: Azure Cosmos DB for Apache Gremlin: a graph API where players are vertices and friendships are edges, and the Gremlin traversal language expresses 'friends of friends who play the same game' directly. Table Storage telemetry: Azure Cosmos DB for Table: it is built for applications written against Azure Table Storage, keeping the same table/entity model so no rewrite is needed, while adding global distribution and the throughput the team wants."),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Unit 4: Analytics Workload on Azure (1)
    // ----------------------------------------------------------------------
    {
      slug: "choose-power-bi-visuals",
      objective: "Choosing appropriate visualizations for data",
      kind: "build",
      title: "Choose a Power BI visual for each question on a sales report",
      brief:
        "The analytics team at Juniper Outdoor, a fictional retailer, is building a Power BI report page for the sales director. She wants to see: (1) how monthly revenue has moved over the last 24 months; (2) this quarter's revenue compared with target, as the single most important number on the page; (3) revenue by product category for the eight categories, with the long category names readable; (4) whether larger stores (by floor area) tend to sell more, across 150 stores; (5) the share of revenue each of the four sales regions contributes to the total.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Pick a visual for each question and explain why it fits, including one visual you would avoid and why.",
          parts: [
            part(
              "Trend over 24 months",
              "Chooses a line chart (or area chart) for revenue over time, because line charts show the shape of values over time and work best with continuous data on the X axis.",
              "A line chart with month on the X axis and revenue on the Y axis: line charts emphasize the overall shape of values over time, so trends and seasonality over 24 months are easy to read. An area chart is an acceptable alternative if the magnitude of change should stand out."
            ),
            part(
              "Revenue against target",
              "Chooses a KPI visual (progress and distance to a target) or a card (a single important number), with the KPI preferred because a target is involved; a gauge is also acceptable for the health of one measure.",
              "A KPI visual: it is made for measuring progress toward and distance from a target, which is exactly 'this quarter's revenue versus target'. If only the number mattered a card would do (a card is for the single most important number), and a gauge is another way to show the health of one measure."
            ),
            part(
              "Revenue by eight categories",
              "Chooses a bar chart (horizontal bars) for comparing values across categories when the category names are long, rather than a column chart.",
              "A bar chart: bar and column charts are the standard for comparing values across categories, and horizontal bars are the right choice when category names are long, because the labels stay readable. Columns suit time-based comparisons instead."
            ),
            part(
              "Store size versus sales, and regional share",
              "Chooses a scatter chart for floor area against revenue across 150 stores (two numeric values, revealing correlation and clusters), and a pie or donut chart (or treemap) for the four regions' share of the whole, since part-to-whole visuals suit a small number of categories.",
              "A scatter chart with floor area on one axis and revenue on the other, one point per store: scatter charts plot two numerical values and reveal correlation and clusters, which answers 'do bigger stores sell more'. For the four regions' share of revenue, a pie or donut chart (part-to-whole, fine with a small number of categories) or a treemap."
            ),
            part(
              "A visual to avoid",
              "Names one mismatch and why, for example a pie chart for the 24-month trend (parts of a whole cannot show change over time), a pie chart for eight categories with long names, or a table for the trend.",
              "Avoid a pie chart for the monthly trend: pie and donut charts show how parts relate to a whole and only work with a small number of categories; 24 months as slices show no trend at all. Likewise a pie chart for eight long-named categories would be hard to read, where the bar chart is not."
            ),
          ],
        },
      ],
    },
    // ======================================================================
    // REQ-234 top-up (2026-11-11): one more lab per unit, 2 / 2 / 2 / 2 = 8.
    // ======================================================================
    // Unit 1: Core Data Concepts (+1)
    {
      slug: "classify-workloads-and-roles",
      objective: "Features of transactional workloads",
      kind: "build",
      title: "Sort data workloads and the roles that own them",
      brief:
        "Juniper Outdoor, a fictional retailer, lists five data activities. (1) The checkout system records each sale, updating stock and the customer's order in one step that must either fully succeed or fully fail. (2) A nightly process loads the day's sales into a warehouse where analysts compare five years of seasonal trends. (3) The mobile app lets a customer change a delivery address while an order is being packed. (4) A dashboard shows regional revenue by quarter. (5) Store managers query 'total sales by product category last year'. Three people work on these systems: Alex keeps the order database secure, backed up and performing well; Bea builds the pipelines that move and clean data into the warehouse; Chen builds the reports and dashboards the business reads.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Classify each activity, explain the features that decide it, and match each person to their role.",
          parts: [
            selectPart(
              "The transactional activities",
              "Selects (1) checkout and (3) the address change, and nothing else: (2), (4) and (5) are analytical.",
              "(1) Checkout and (3) the address change are transactional (OLTP): many small reads and writes of current data that must be consistent. (2) The warehouse load, (4) the quarterly dashboard and (5) the category totals are analytical: large reads that aggregate historical data.",
              {
                display: "list",
                lines: ["(1) Checkout records a sale", "(2) Nightly load for five-year trends", "(3) Customer changes a delivery address", "(4) Regional revenue dashboard", "(5) Total sales by category last year"],
                correct: [0, 2],
              }
            ),
            part(
              "Deciding features",
              "Describes transactional workloads as many small, fast inserts and updates of current data with ACID transactions (atomicity, consistency, isolation, durability) on a normalized schema, and analytical workloads as read-heavy queries aggregating large volumes of historical data, usually loaded in batches into a schema optimized for reading.",
              "Transactional: high volumes of small inserts, updates and lookups on current data, each wrapped in a transaction that is atomic, consistent, isolated and durable (ACID), so the checkout either records the sale and updates stock together or does neither. Schemas are normalized to avoid duplicated data. Analytical: mostly reads that scan and aggregate large amounts of historical data, loaded periodically (for example nightly) into a warehouse or lakehouse designed for fast reading and summarizing."
            ),
            matchPart(
              "Roles",
              "Alex database administrator, Bea data engineer, Chen data analyst. All three right is met; two is partly there.",
              "Alex is the database administrator (availability, security, backup and performance of the database). Bea is the data engineer (pipelines that ingest, clean and transform data). Chen is the data analyst (models, reports and visualizations that turn data into insight).",
              {
                leftHeading: "Person",
                rightHeading: "Role",
                left: ["Alex: security, backups, performance of the order database", "Bea: pipelines into the warehouse", "Chen: reports and dashboards"],
                right: ["Database administrator", "Data engineer", "Data analyst", "Data scientist"],
                pairs: [0, 1, 2],
              }
            ),
          ],
        },
      ],
    },
    // Unit 2: Relational Data on Azure (+1)
    {
      slug: "normalize-order-spreadsheet",
      objective: "Normalization and why it's used",
      kind: "build",
      title: "Normalize a sales spreadsheet into related tables",
      brief:
        "Fennel Lane Books, a fictional bookshop, tracks sales in one spreadsheet with the columns OrderNo, OrderDate, CustomerName, CustomerEmail, CustomerAddress, ISBN, BookTitle, UnitPrice, Qty. One order with three books takes three rows, each repeating the order date and the customer's name, email and address. When a customer moved, someone updated her address on some rows but not others, and the shop could not tell which address was right. Deleting the only order that contained a rarely sold book also deleted the only record of that book's title and price.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Explain what went wrong, design the normalized tables with their keys, and say what the change costs.",
          parts: [
            part(
              "What went wrong",
              "Explains that repeating customer and book details on every row causes duplication and anomalies: the update anomaly (the address changed on some rows only) and the deletion anomaly (deleting an order lost the book's details), and that normalization minimizes duplication and enforces integrity.",
              "Customer and book facts are repeated on every row. That duplication caused an update anomaly (one address changed in some rows and not others, so the data contradicts itself) and a deletion anomaly (removing an order removed the only record of a book). Normalization separates each entity into its own table so each fact is stored once, which minimizes duplication and enforces data integrity."
            ),
            part(
              "Normalized design",
              "Designs separate tables, each with a primary key, linked by foreign keys: Customers (CustomerId PK, name, email, address), Books (ISBN PK, title, unit price), Orders (OrderNo PK, OrderDate, CustomerId FK), OrderLines (OrderNo FK, ISBN FK, Qty, with a composite key OrderNo+ISBN or its own key), possibly with the price at time of sale on the order line.",
              "Customers(CustomerId PK, CustomerName, CustomerEmail, CustomerAddress). Books(ISBN PK, BookTitle, UnitPrice). Orders(OrderNo PK, OrderDate, CustomerId FK -> Customers). OrderLines(OrderNo FK -> Orders, ISBN FK -> Books, Qty, primary key (OrderNo, ISBN)). Each entity is its own table, each attribute its own column, each row identified by a primary key, and related rows linked with foreign keys. Many designs also copy the UnitPrice into OrderLines as the price charged, so later price changes do not rewrite history."
            ),
            part(
              "The cost",
              "Notes that reading a whole order now needs joins across tables, which is normal for transactional systems, and that analytical stores often denormalize deliberately for faster reads.",
              "Reconstructing an order now needs joins (Orders to Customers, OrderLines to Books). That is the usual trade for transactional systems: correct, single-copy data at the cost of joins. Analytical models often denormalize on purpose (for example a star schema) because they are read far more than they are updated."
            ),
          ],
        },
      ],
    },
    // Unit 3: Non-Relational Data on Azure (+1)
    {
      slug: "blob-tiers-and-early-deletion",
      objective: "Features of Azure Blob storage",
      kind: "build",
      title: "Choose Blob Storage access tiers and work out an early-deletion charge",
      brief:
        "Hollowell Games, a fictional studio, stores four kinds of data in an Azure general-purpose v2 storage account. (1) Game patch files that players download constantly for the first two weeks after release. (2) Last month's crash dumps, read occasionally by engineers investigating bugs; they keep them about two months. (3) Quarterly marketing videos that are rarely viewed but must open instantly when someone asks, kept about a year. (4) Build archives the studio must keep for seven years for legal reasons and almost never reads; a request can wait a day. Last quarter someone moved a large build archive to the archive tier and then deleted it 60 days later.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Choose a tier for each kind of data, work out the early-deletion charge, and explain what reading archived data involves.",
          parts: [
            matchPart(
              "Access tier for each",
              "(1) hot, (2) cool, (3) cold, (4) archive. All four right is met; two or three is partly there.",
              "(1) Hot: frequently accessed, highest storage but lowest access cost. (2) Cool: infrequent access, stored at least 30 days. (3) Cold: rarely accessed but still needs fast (online) retrieval, stored at least 90 days. (4) Archive: rarely accessed, latency of hours acceptable, stored at least 180 days, lowest storage cost.",
              {
                leftHeading: "Data",
                rightHeading: "Tier",
                left: ["(1) New patch files, downloaded constantly", "(2) Crash dumps, read occasionally, kept two months", "(3) Marketing videos, rare but instant, kept a year", "(4) Seven-year build archives, a day's wait is fine"],
                right: ["Hot", "Cool", "Cold", "Archive"],
                pairs: [0, 1, 2, 3],
              }
            ),
            numericPart(
              "Days of early-deletion charge",
              "120 days (the archive tier's 180-day minimum minus the 60 days stored) is met; within 20 is partly there.",
              "The archive tier expects data to stay at least 180 days; deleting after 60 days is charged as if stored for the remaining 180 - 60 = 120 days (prorated at the archive storage price).",
              { answer: 120, tolerance: 0, partialTolerance: 20, unit: "days" }
            ),
            part(
              "Reading archived data",
              "Explains that archive is an offline tier: a blob cannot be read until it is rehydrated to an online tier (hot, cool or cold), which can take up to 15 hours depending on priority, or it can be copied to an online tier; and recommends a lifecycle management policy to move patch files and crash dumps to cooler tiers automatically.",
              "Archived blobs are offline: they cannot be read or modified until rehydrated to hot, cool or cold (by changing the tier or copying the blob), which can take up to 15 hours depending on the rehydration priority. That fits the seven-year archives, where a day's wait is acceptable, and is why marketing videos needing instant access belong in cold, not archive. Use lifecycle management rules to move patch files to cool after their two busy weeks and to delete crash dumps after about two months."
            ),
          ],
        },
      ],
    },
    // Unit 4: Analytics Workload on Azure (+1)
    {
      slug: "batch-vs-streaming-pipeline",
      objective: "The difference between batch and streaming data",
      kind: "case",
      title: "Decide batch or streaming for a delivery company's data",
      brief:
        "Swiftline Couriers, a fictional delivery company, has 800 vans that each send a GPS position and engine temperature every 10 seconds, and a sales database that records invoices during the day. Managers want (1) a live map of van positions and an alert within a minute if any engine overheats, and (2) a monthly report of revenue by region and customer, with trends over three years.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The operations manager asks for one design that covers both requests.",
          ask: "For each requirement, choose batch or streaming processing and explain the differences that decide it.",
          parts: [
            part(
              "Requirement (1)",
              "Chooses streaming: data is processed continuously as each event arrives, in small units with low latency (seconds), usually over time windows, which a live map and a one-minute alert require.",
              "Streaming. The van readings are an unbounded flow of small events, and the business needs results within seconds: each reading is processed as it arrives, often aggregated over a short time window (for example the average engine temperature over the last 30 seconds), and an alert fires immediately. Waiting for a nightly batch would make both the map and the alert useless."
            ),
            part(
              "Requirement (2)",
              "Chooses batch: data is collected over a period and processed together on a schedule (for example nightly or monthly), handling large volumes and complex queries over historical data where latency of hours is acceptable.",
              "Batch. Invoices are collected through the day and loaded on a schedule (for example nightly) into an analytical store, where large, complex queries over three years of history run. Latency of hours is fine for a monthly report, and processing the whole period together is efficient and simple."
            ),
          ],
        },
        {
          text: "The team wants to keep the van readings too, so analysts can later study which routes cause engines to overheat over a full year.",
          ask: "How does the design handle both the live alerts and the yearly analysis, and which Microsoft services could play each part?",
          parts: [
            part(
              "Combined design and services",
              "Sends the same stream both to real-time processing (alerts, live map) and to storage for later batch analysis, and names fitting services: Microsoft Fabric Real-Time Intelligence (eventstreams to ingest, an eventhouse queried with KQL, Activator for alerts) or Azure Stream Analytics (with Event Hubs or IoT Hub input), with Power BI for the live map and the stored history in a data lake, lakehouse or warehouse for the yearly analysis.",
              "Ingest the van events once and use them twice. Real time: Microsoft Fabric Real-Time Intelligence, where an eventstream ingests the readings, an eventhouse stores and queries them (KQL), and Activator raises the overheating alert; or Azure Stream Analytics reading from Event Hubs or IoT Hub with a temporal SQL query, sending results to Power BI for the live map. History: also land every reading in a data lake or lakehouse (or keep it in the eventhouse, available in OneLake), so analysts can join a year of readings with route data in a batch analysis."
            ),
          ],
        },
      ],
    },
  ],
};
