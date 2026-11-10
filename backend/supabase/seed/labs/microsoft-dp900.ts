import { GENERAL_SAFETY, part, type SeedLabSet, matchPart } from "./types";
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
        "Juniper Outdoor, a fictional retailer, is moving four data needs to Azure. (1) Product photos and PDF manuals, millions of files, served to the website. (2) The order system: customers, orders and payments with strict consistency, transactions across tables and reports that join them. (3) A device-telemetry archive for analytics: billions of small JSON and Parquet files that analysts query in folders by year, month and day, with whole folders renamed or deleted as data is reorganised. (4) A legacy Windows application that writes to a shared network drive over SMB and cannot be changed.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Name the Azure data store for each need, say whether the data is structured, semi-structured or unstructured, and give the deciding reason.",
          parts: [
            matchPart("Data store for each need", "(1) Blob Storage, (2) Azure SQL Database, (3) Data Lake Storage, (4) Azure Files. Cosmos DB for Table fits none. All four right is met; two or three is partly there.", "(1) Azure Blob Storage: object storage for unstructured files. (2) Azure SQL Database: structured data with a fixed schema, transactions and joins. (3) Azure Data Lake Storage: Blob Storage with the hierarchical namespace, so folder renames and deletes are atomic. (4) Azure Files: managed SMB shares, no code change.", {"leftHeading": "Need", "rightHeading": "Data store", "left": ["(1) Millions of product photos and PDF manuals", "(2) Orders, customers and payments with transactions and joins", "(3) Telemetry files analysts query and reorganise by folder", "(4) A legacy app writing to a network drive over SMB"], "right": ["Azure Blob Storage", "Azure SQL Database", "Azure Data Lake Storage", "Azure Files", "Azure Cosmos DB for Table"], "pairs": [0, 1, 2, 3]}),
            part("Data type and deciding reason", "Says whether each is structured, semi-structured or unstructured and gives the deciding reason: Photos and manuals: Chooses Azure Blob Storage, calls the files unstructured data, and gives the reason that Blob Storage is object storage optimised for large amounts of unstructured data served over HTTP. Order system: Chooses a relational database, Azure SQL Database (or another Azure relational service), calls the data structured, and cites tables with a fixed schema, transactions and joins as the reason. Telemetry archive: Chooses Azure Data Lake Storage (Blob Storage with the hierarchical namespace), calls the JSON semi-structured and the Parquet files analytics files, and gives the reason that the hierarchical namespace makes directory rename and delete single atomic operations and suits big-data analytics tools. Legacy SMB application: Chooses Azure Files, giving the reason that it provides managed file shares that can be mounted over SMB from Windows without changing the application.", "Photos and manuals: Azure Blob Storage. Images and PDFs are unstructured data (no fixed schema inside them), and Blob Storage is object storage built for massive amounts of unstructured files, addressable by URL so the website can serve them directly. Order system: Azure SQL Database. Customers, orders and payments are structured data in tables with a fixed schema; a relational engine gives transactions across tables for consistency and SQL joins for the reports. It is a transactional (OLTP) workload. Telemetry archive: Azure Data Lake Storage: a storage account with the hierarchical namespace enabled, built on Blob Storage for big-data analytics. The JSON is semi-structured and Parquet is a columnar analytics format. With the hierarchical namespace, folders are real directories, so renaming or deleting a year/month/day folder is one atomic metadata operation instead of touching every file, and analytics engines read the folder layout directly. Legacy SMB application: Azure Files. It gives a fully managed file share in the cloud that the Windows application can mount over SMB like the old network drive, so the application does not change. Files on the share can be any type; here they are whatever the application writes."),
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
            part("Deciding reasons", "Gives the deciding reason for each: New player-profile service: Chooses Azure Cosmos DB for NoSQL, because it is the native document API with SQL-style queries, automatic indexing and schema flexibility, which suits a new application. Existing MongoDB inventory service: Chooses Azure Cosmos DB for MongoDB, because it is wire-protocol compatible so the existing drivers and tools keep working. Friends graph: Chooses Azure Cosmos DB for Apache Gremlin, because it is the graph API and the Gremlin traversal language answers relationship queries like friends of friends. Table Storage telemetry: Chooses Azure Cosmos DB for Table, because it modernises Azure Table Storage applications with global distribution and higher throughput while keeping the Table data model and SDK.", "New player-profile service: Azure Cosmos DB for NoSQL: the native API for document data, with SQL-style queries over JSON, automatic indexing and schema flexibility. A new application with no existing driver dependency should use it. Existing MongoDB inventory service: Azure Cosmos DB for MongoDB: it speaks the MongoDB wire protocol, so the existing application keeps its MongoDB drivers and tools and migrates with minimal code change. Friends graph: Azure Cosmos DB for Apache Gremlin: a graph API where players are vertices and friendships are edges, and the Gremlin traversal language expresses 'friends of friends who play the same game' directly. Table Storage telemetry: Azure Cosmos DB for Table: it is built for applications written against Azure Table Storage, keeping the same table/entity model so no rewrite is needed, while adding global distribution and the throughput the team wants."),
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
              "A line chart with month on the X axis and revenue on the Y axis: line charts emphasise the overall shape of values over time, so trends and seasonality over 24 months are easy to read. An area chart is an acceptable alternative if the magnitude of change should stand out."
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
  ],
};
