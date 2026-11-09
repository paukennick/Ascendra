import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-156: Microsoft Certified: Azure Database Administrator Associate (DP-300).
//
// Aligned to the DP-300 study guide (skills measured as of October 27, 2026;
// re-read 2026-11-07): Plan and implement data platform resources 15-20% /
// Implement a secure environment 20-25% / Monitor, configure, and optimize
// 20-25% / Automation of tasks 15-20% / HA/DR 20-25%.
//   https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/dp-300
// Density (docs/labs.md, policy "hybrid"): 2 / 3 / 2 / 2 / 2 = 11 labs
// (10 build, 1 case).
//
// Figures (tier size limits, RPO/RTO, backup cadence, retention) and the
// documented T-SQL patterns (Entra users, row-level security, dynamic data
// masking, elastic jobs, backup to URL with a SAS credential) were read on
// learn.microsoft.com on 2026-11-07 (sources[]). No SQL Server engine was
// available in the authoring session, so the T-SQL was checked by hand
// against the documented syntax rather than executed; the reviewer should
// run each model answer. Every lab is needs_expert_review until a DBA does.

export const DP300_LABS: SeedLabSet = {
  trackCode: "DP300",
  sources: [
    // Exam outline (checked 2026-11-07)
    source("https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/dp-300", "exam_outline", "2026-11-07"),
    // Tier comparison: General Purpose / Business Critical 4 TB, Hyperscale 128 TB
    source("https://learn.microsoft.com/en-us/azure/azure-sql/database/service-tier-hyperscale?view=azuresql", "reference", "2026-11-07"),
    // SQL Database vs SQL Server: SQL Agent, cross-database names, instance features
    source("https://learn.microsoft.com/en-us/azure/azure-sql/database/transact-sql-tsql-differences-sql-server?view=azuresql", "reference", "2026-11-07"),
    // Microsoft Entra authentication and contained users
    source("https://learn.microsoft.com/en-us/azure/azure-sql/database/authentication-aad-overview?view=azuresql", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/azure-sql/database/logins-create-manage?view=azuresql", "reference", "2026-11-07"),
    // Row-level security
    source("https://learn.microsoft.com/en-us/sql/relational-databases/security/row-level-security", "reference", "2026-11-07"),
    // Dynamic data masking
    source("https://learn.microsoft.com/en-us/azure/azure-sql/database/dynamic-data-masking-overview?view=azuresql", "reference", "2026-11-07"),
    // Elastic jobs
    source("https://learn.microsoft.com/en-us/azure/azure-sql/database/elastic-jobs-overview?view=azuresql", "reference", "2026-11-07"),
    // Business continuity: RPO/RTO table, backup cadence, PITR, failover groups, LTR
    source("https://learn.microsoft.com/en-us/azure/azure-sql/database/business-continuity-high-availability-disaster-recover-hadr-overview?view=azuresql", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/azure-sql/database/failover-group-sql-db?view=azuresql", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/azure-sql/database/long-term-retention-overview?view=azuresql", "reference", "2026-11-07"),
    // Backup to URL with a shared access signature credential, STOPAT restore
    source("https://learn.microsoft.com/en-us/sql/t-sql/statements/create-credential-transact-sql?view=sql-server-ver17", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/sql/relational-databases/tutorial-use-azure-blob-storage-service-with-sql-server?view=sql-server-ver17", "reference", "2026-11-07"),
  ],
  labs: [
    // ----------------------------------------------------------------------
    // Unit 1: Plan and Implement Data Platform Resources (2)
    // ----------------------------------------------------------------------
    {
      slug: "recommend-azure-sql-offering",
      objective: "Recommending a database offering based on specific requirements",
      kind: "build",
      title: "Recommend an Azure SQL offering for four workloads",
      brief:
        "Ashgrove Financial, a fictional lender, is leaving its data centre. (1) The loan ledger: a 12 TB OLTP database growing 2 TB a year that must stay fully managed and restore quickly. (2) A reporting application that relies on SQL Server Agent jobs, cross-database queries with three-part names and a linked server to another SQL Server. (3) A vendor risk engine whose support contract requires a specific SQL Server build, trace flags set at startup and a monitoring agent installed on the operating system. (4) A developer sandbox database used a few hours a day on weekdays; the team wants to pay nothing while it is idle.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Recommend an offering (and tier where relevant) for each workload and give the deciding reason.",
          parts: [
            part(
              "Loan ledger (12 TB OLTP)",
              "Chooses Azure SQL Database in the Hyperscale tier, because General Purpose and Business Critical single databases stop at 4 TB while Hyperscale grows to 128 TB, with snapshot-based backups that restore in minutes regardless of size.",
              "Azure SQL Database, Hyperscale. The 12 TB ledger already exceeds the 4 TB storage limit of the General Purpose and Business Critical tiers; Hyperscale allocates storage from 10 GB up to 128 TB as needed, and its file-snapshot backups make restores take minutes rather than hours even at this size. It stays fully managed."
            ),
            part(
              "Reporting app with Agent jobs and cross-database queries",
              "Chooses Azure SQL Managed Instance, because Azure SQL Database does not support SQL Server Agent or three- and four-part cross-database names and linked servers, which Managed Instance keeps.",
              "Azure SQL Managed Instance. Azure SQL Database has no SQL Server Agent, does not allow three- or four-part names across databases (other than tempdb and the current database) and has no linked servers, so the application would need rewriting. Managed Instance keeps those instance-level features with a managed service."
            ),
            part(
              "Vendor risk engine",
              "Chooses SQL Server on Azure Virtual Machines, because only IaaS gives control of the exact SQL Server build, startup trace flags and software installed on the operating system.",
              "SQL Server on an Azure Virtual Machine. The contract needs a specific build, startup trace flags and an agent on the OS -- none of which a PaaS offering exposes. The VM is the only option that gives OS access, at the cost of patching and backups becoming the team's job (the SQL IaaS Agent extension helps with both)."
            ),
            part(
              "Developer sandbox",
              "Chooses Azure SQL Database with the serverless compute tier (auto-pause when idle, billing only for compute used), since the database is used a few hours a day.",
              "Azure SQL Database, serverless compute. It scales compute with demand and auto-pauses after a period of inactivity, so the team pays for storage only while the sandbox is idle and for compute only in the hours it is used. The first query after a pause takes longer while the database resumes, which a sandbox can tolerate."
            ),
          ],
        },
      ],
    },
    {
      slug: "configure-table-partitioning",
      objective: "Configuring table partitioning",
      kind: "build",
      title: "Partition an orders table by month with a sliding window",
      brief:
        "Fennel Lane Books, a fictional retailer, keeps Sales.Orders in Azure SQL Database: OrderId bigint, OrderDate date, CustomerId int, TotalAmount decimal(10,2), about 400 million rows. Queries filter on OrderDate ranges, nightly loads insert the current month, and finance wants orders older than 24 months moved to Sales.OrdersArchive each month with as little blocking as possible. Today the table has a clustered primary key on OrderId alone. The database is on the General Purpose tier, which in Azure SQL Database means only the PRIMARY filegroup is available.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the partitioning design in T-SQL: function, scheme, table, and the monthly sliding-window procedure.",
          parts: [
            part(
              "Partition function and scheme",
              "Creates a RANGE RIGHT partition function on date with month-start boundaries (so each boundary date belongs to the month it starts), and a partition scheme mapping all partitions to PRIMARY (ALL TO ([PRIMARY])), because Azure SQL Database has one filegroup.",
              "CREATE PARTITION FUNCTION pf_OrderMonth (date)\nAS RANGE RIGHT FOR VALUES ('2024-12-01', '2025-01-01', /* ... one boundary per month ... */ '2026-11-01', '2026-12-01');\nGO\nCREATE PARTITION SCHEME ps_OrderMonth\nAS PARTITION pf_OrderMonth ALL TO ([PRIMARY]);\nGO\n\nRANGE RIGHT puts each boundary value in the partition to its right, so 2026-11-01 starts November's partition. Azure SQL Database exposes only PRIMARY, so ALL TO ([PRIMARY]); partitioning here is for manageability and partition elimination, not for spreading I/O across filegroups."
            ),
            part(
              "Partitioned table and key",
              "Creates (or rebuilds) Sales.Orders ON ps_OrderMonth(OrderDate) with OrderDate included in the clustered key (for example a clustered primary key on OrderId, OrderDate), because a unique clustered index on a partitioned table must contain the partitioning column.",
              "CREATE TABLE Sales.Orders (\n  OrderId bigint NOT NULL,\n  OrderDate date NOT NULL,\n  CustomerId int NOT NULL,\n  TotalAmount decimal(10,2) NOT NULL,\n  CONSTRAINT PK_Orders PRIMARY KEY CLUSTERED (OrderId, OrderDate)\n) ON ps_OrderMonth (OrderDate);\n\nThe partitioning column must be part of any unique index on the table, so OrderDate joins OrderId in the clustered primary key. Sales.OrdersArchive gets the same columns, same indexes and the same partition scheme (or at least the same filegroup) so partitions can be switched into it."
            ),
            part(
              "Adding next month",
              "Each month, before the load, marks the next filegroup with ALTER PARTITION SCHEME ... NEXT USED [PRIMARY] and splits the function at the next month's start with ALTER PARTITION FUNCTION ... SPLIT RANGE, keeping the rightmost partition empty so the split moves no rows.",
              "ALTER PARTITION SCHEME ps_OrderMonth NEXT USED [PRIMARY];\nALTER PARTITION FUNCTION pf_OrderMonth() SPLIT RANGE ('2027-01-01');\n\nRun this before any January 2027 rows arrive. Splitting an empty rightmost partition is a metadata operation; splitting a partition that already holds rows would physically move them and hold locks for the duration."
            ),
            part(
              "Archiving the oldest month",
              "Switches the oldest partition into the archive table with ALTER TABLE ... SWITCH PARTITION n TO Sales.OrdersArchive [PARTITION n] (a metadata operation that requires the target partition to be empty and the tables to match), then merges the now-empty boundary with ALTER PARTITION FUNCTION ... MERGE RANGE; uses $PARTITION to find the partition number.",
              "DECLARE @p int = $PARTITION.pf_OrderMonth('2024-11-01'); -- partition holding the oldest month\nALTER TABLE Sales.Orders SWITCH PARTITION @p TO Sales.OrdersArchive PARTITION @p;\nALTER PARTITION FUNCTION pf_OrderMonth() MERGE RANGE ('2024-12-01');\n\nSWITCH moves the partition by changing metadata, so there is no row-by-row copy and almost no blocking; it needs the archive partition empty, the same structure and indexes, and the same filegroup. Merging the emptied boundary afterwards keeps the function to the 24-month window."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Unit 2: Implement a Secure Environment (3)
    // ----------------------------------------------------------------------
    {
      slug: "entra-least-privilege-tsql",
      objective: "Managing authentication and authorization using T-SQL",
      kind: "build",
      title: "Grant least-privilege access with Microsoft Entra identities in T-SQL",
      brief:
        "Ashgrove Financial's Azure SQL Database LedgerDb has a Microsoft Entra admin configured on the logical server. Three principals need access: the Microsoft Entra group sg-finance-analysts must read every table in the Finance schema except Finance.Salaries; the API's user-assigned managed identity, mi-ledger-api, must read and write the Ledger schema and nothing else; and an external auditor's tool, which can only use SQL authentication, must read one view, Finance.vw_MonthlyTotals. Today a developer has given everyone db_owner.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the T-SQL to create the principals and permissions, and explain how you would prove a principal has exactly what it needs.",
          parts: [
            part(
              "Microsoft Entra principals",
              "Connected to LedgerDb as the Microsoft Entra admin (or a principal with ALTER ANY USER), creates contained database users from the Entra group and the managed identity with CREATE USER [name] FROM EXTERNAL PROVIDER, rather than server logins.",
              "-- Run in LedgerDb while connected as the Microsoft Entra admin\nCREATE USER [sg-finance-analysts] FROM EXTERNAL PROVIDER;\nCREATE USER [mi-ledger-api] FROM EXTERNAL PROVIDER;\n\nContained users move with the database and need no login in master. The first Entra principals must be created by the Entra admin, since only it can query Microsoft Graph at that point; later, a user with ALTER ANY USER in the database can add more."
            ),
            part(
              "Roles and permissions for the Entra principals",
              "Creates custom roles, grants schema-scoped permissions (GRANT SELECT ON SCHEMA::Finance; GRANT SELECT, INSERT, UPDATE ON SCHEMA::Ledger), adds the users with ALTER ROLE ... ADD MEMBER, and uses DENY SELECT on Finance.Salaries to the analysts' role, since DENY overrides a GRANT.",
              "CREATE ROLE finance_reader;\nGRANT SELECT ON SCHEMA::Finance TO finance_reader;\nDENY SELECT ON OBJECT::Finance.Salaries TO finance_reader;\nALTER ROLE finance_reader ADD MEMBER [sg-finance-analysts];\n\nCREATE ROLE ledger_writer;\nGRANT SELECT, INSERT, UPDATE ON SCHEMA::Ledger TO ledger_writer;\nALTER ROLE ledger_writer ADD MEMBER [mi-ledger-api];\n\nPermissions go to roles, identities go into roles. DENY on Finance.Salaries wins over the schema-level GRANT, so analysts see every Finance table but that one. Nobody keeps db_owner except the few people who administer the database."
            ),
            part(
              "The auditor's SQL-authenticated tool",
              "Creates a contained SQL-authenticated user with CREATE USER ... WITH PASSWORD and grants SELECT on the single view only (no role with broader rights, no login in master).",
              "CREATE USER auditor_tool WITH PASSWORD = '<strong, generated password>';\nGRANT SELECT ON OBJECT::Finance.vw_MonthlyTotals TO auditor_tool;\n\nA contained user needs no server login, and SELECT on the view alone means the tool cannot read the underlying tables directly. Rotate the password on the auditor's schedule and prefer an Entra identity if their tool ever supports it."
            ),
            part(
              "Proving the result",
              "Impersonates each principal with EXECUTE AS USER = '...' and checks what it can do (for example fn_my_permissions or a test SELECT), then REVERT; reviews sys.database_principals / sys.database_permissions and removes the blanket db_owner memberships.",
              "EXECUTE AS USER = 'auditor_tool';\nSELECT * FROM fn_my_permissions('Finance.vw_MonthlyTotals', 'OBJECT');\nSELECT TOP (1) * FROM Finance.Salaries; -- expect a permission error\nREVERT;\n\nRepeat for the group and the managed identity, then list sys.database_role_members joined to sys.database_principals and run ALTER ROLE db_owner DROP MEMBER for every principal that is not an administrator."
            ),
          ],
        },
      ],
    },
    {
      slug: "row-level-security-claims",
      objective: "Implementing row-level security",
      kind: "build",
      title: "Restrict claims handlers to their own region with row-level security",
      brief:
        "Caldera Insurance, a fictional insurer, stores claims in dbo.Claims (ClaimId, Region nvarchar(20), PolicyNumber, Amount, HandlerUser sysname). Claims handlers sign in with their own database users and must only see, update and insert claims for their own region; members of the database role ClaimsManager must see every row. A table dbo.UserRegion (UserName sysname, Region nvarchar(20)) already maps each handler to a region. The application cannot be changed, so the restriction must live in the database.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Implement row-level security in T-SQL and explain what it does and does not protect.",
          parts: [
            part(
              "Predicate function",
              "Creates an inline table-valued function in its own schema (e.g. Security) WITH SCHEMABINDING that returns a row when the claim's Region matches the caller's region from dbo.UserRegion via USER_NAME(), or when IS_ROLEMEMBER('ClaimsManager') = 1.",
              "CREATE SCHEMA Security;\nGO\nCREATE FUNCTION Security.fn_RegionPredicate (@Region nvarchar(20))\nRETURNS TABLE\nWITH SCHEMABINDING\nAS\nRETURN\n  SELECT 1 AS fn_result\n  FROM dbo.UserRegion AS ur\n  WHERE ur.Region = @Region AND ur.UserName = USER_NAME()\n  UNION ALL\n  SELECT 1 WHERE IS_ROLEMEMBER('ClaimsManager') = 1;\nGO\n\nA separate schema for the RLS objects is the documented practice; SCHEMABINDING lets the policy reference the function and its table without extra permission checks for users."
            ),
            part(
              "Security policy",
              "Creates a security policy with a FILTER predicate on dbo.Claims (hides other regions from SELECT, UPDATE, DELETE) and a BLOCK predicate AFTER INSERT (and optionally AFTER UPDATE) so a handler cannot write a claim into another region, WITH (STATE = ON).",
              "CREATE SECURITY POLICY Security.ClaimsRegionPolicy\n  ADD FILTER PREDICATE Security.fn_RegionPredicate(Region) ON dbo.Claims,\n  ADD BLOCK PREDICATE Security.fn_RegionPredicate(Region) ON dbo.Claims AFTER INSERT,\n  ADD BLOCK PREDICATE Security.fn_RegionPredicate(Region) ON dbo.Claims AFTER UPDATE\nWITH (STATE = ON);\n\nThe filter predicate silently removes other regions' rows from reads, updates and deletes; the block predicates make an INSERT or UPDATE that would produce a row outside the handler's region fail with an error instead of silently succeeding."
            ),
            part(
              "Testing and switching off",
              "Tests with EXECUTE AS USER for a handler and for a ClaimsManager member, checks counts and a cross-region insert, and knows that ALTER SECURITY POLICY ... WITH (STATE = OFF) disables the policy; creating or altering policies needs ALTER ANY SECURITY POLICY (plus ALTER on the schema).",
              "EXECUTE AS USER = 'handler_north';\nSELECT COUNT(*) FROM dbo.Claims;                 -- only North rows\nINSERT INTO dbo.Claims (ClaimId, Region, PolicyNumber, Amount, HandlerUser)\nVALUES (90001, N'South', 'P-1', 10, USER_NAME()); -- blocked\nREVERT;\n\nALTER SECURITY POLICY Security.ClaimsRegionPolicy WITH (STATE = OFF); -- to disable\n\nManaging policies needs ALTER ANY SECURITY POLICY and ALTER on the Security schema; the security policy manager does not need SELECT on dbo.Claims."
            ),
            part(
              "Limits of the protection",
              "States that RLS applies to every user including dbo/db_owner unless the predicate allows them, that it is not encryption and does not stop side-channel inference by users who can run arbitrary queries, and that a shared application login would need SESSION_CONTEXT in the predicate instead of USER_NAME().",
              "RLS filters rows for everyone, including dbo and db_owner, unless the predicate lets them through (here via ClaimsManager). It is access control, not encryption, and a user who can write arbitrary queries can still infer things from errors or timing, so it is one layer, not the only one. Because handlers use their own database users, USER_NAME() works; if the app connected with one shared login, the predicate would read the user from SESSION_CONTEXT set by the middle tier instead."
            ),
          ],
        },
      ],
    },
    {
      slug: "dynamic-data-masking-members",
      objective: "Implementing dynamic data masking",
      kind: "build",
      title: "Mask member contact details for the support team",
      brief:
        "Hollowell Games, a fictional studio, has Members.Player (PlayerId, DisplayName, Email, Phone nvarchar(20), DateOfBirth date, CreditBalance decimal(10,2)) in Azure SQL Database. Support agents query the table through a reporting tool using their own Microsoft Entra accounts (database users in the role support_agent) and must see only a hint of each email and the last four digits of the phone; the fraud team (role fraud_team) must see real emails. Nobody outside administrators should see the real date of birth, and credit balances should look random to agents. The studio wants this without changing the stored data or the tool.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Implement dynamic data masking in T-SQL and explain its limits.",
          parts: [
            part(
              "Masks per column",
              "Adds masks with ALTER TABLE ... ALTER COLUMN ... ADD MASKED WITH (FUNCTION = ...): email() for Email, a partial() mask exposing the last four characters for Phone, default() for DateOfBirth, random(min, max) for CreditBalance.",
              "ALTER TABLE Members.Player ALTER COLUMN Email ADD MASKED WITH (FUNCTION = 'email()');\nALTER TABLE Members.Player ALTER COLUMN Phone ADD MASKED WITH (FUNCTION = 'partial(0, \"XXX-XXX-\", 4)');\nALTER TABLE Members.Player ALTER COLUMN DateOfBirth ADD MASKED WITH (FUNCTION = 'default()');\nALTER TABLE Members.Player ALTER COLUMN CreditBalance ADD MASKED WITH (FUNCTION = 'random(1, 100)');\n\nemail() shows the first letter and replaces the domain (aXXX@XXXX.com); partial(prefix, padding, suffix) exposes the last four characters of the phone; default() masks a date as 1900-01-01; random() returns a value in the range on every read."
            ),
            part(
              "Who sees real values",
              "Grants UNMASK to fraud_team at the column level for Email only (GRANT UNMASK ON Members.Player (Email) TO fraud_team), leaves support_agent masked, and notes administrators (server admin, Microsoft Entra admin, db_owner) always see unmasked data.",
              "GRANT UNMASK ON Members.Player (Email) TO fraud_team;\n\nUNMASK can be granted at database, schema, table or column level; granting it on the Email column alone gives the fraud team real emails while phones, birth dates and balances stay masked for them. Members of db_owner, the server admin and the Microsoft Entra admin are never masked, which is another reason to keep those memberships small."
            ),
            part(
              "Changing or removing a mask",
              "Removes a mask with ALTER TABLE ... ALTER COLUMN ... DROP MASKED and revokes UNMASK with REVOKE UNMASK ...; masks are metadata, so stored data never changes.",
              "ALTER TABLE Members.Player ALTER COLUMN Phone DROP MASKED;   -- remove a mask\nREVOKE UNMASK ON Members.Player (Email) FROM fraud_team;      -- take the exception back\n\nMasking is applied to query results; the rows in the table are untouched, so adding or dropping a mask is a quick metadata change."
            ),
            part(
              "What masking is not",
              "States that dynamic data masking is not encryption and does not protect data at rest or from privileged users, that a user with ad-hoc query rights can infer masked values (for example WHERE Email LIKE 'a%' or comparisons), and that it should sit beside TDE, Always Encrypted or RLS where real protection is needed.",
              "Dynamic data masking hides values in result sets for non-privileged users; it is not encryption. It does not protect the data at rest (TDE does) or from administrators, and anyone who can run their own queries can infer masked values with predicates such as WHERE CreditBalance > 1000 or WHERE Email LIKE 'ann%'. Use it to reduce casual exposure in the support tool, and pair it with Always Encrypted or row-level security where data must actually be unreadable."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Unit 3: Monitor, Configure, and Optimize Database Resources (2)
    // ----------------------------------------------------------------------
    {
      slug: "resolve-session-blocking",
      objective: "Identifying and resolving session blocking",
      kind: "case",
      title: "Find and clear a blocking chain in Azure SQL Database",
      brief:
        "At 09:40 the order-entry team at Fennel Lane Books, a fictional retailer, reports that every save in the orders screen hangs. The Azure SQL Database OrdersDb shows low CPU and no I/O pressure. You connect with SQL Server Management Studio as the Microsoft Entra admin. Nobody has deployed anything today, but a developer mentions they were 'fixing some prices in a query window' earlier.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The monitoring dashboard shows a spike in LCK_M_* waits starting at 09:31.",
          ask: "What do you query first, and what are you looking for?",
          parts: [
            part(
              "Finding the blocked requests",
              "Queries sys.dm_exec_requests for rows with blocking_session_id <> 0 (joining sys.dm_exec_sql_text for the statement, and wait_type / wait_resource), to see who is blocked and by which session.",
              "SELECT r.session_id, r.blocking_session_id, r.wait_type, r.wait_time, r.wait_resource, t.text\nFROM sys.dm_exec_requests AS r\nCROSS APPLY sys.dm_exec_sql_text(r.sql_handle) AS t\nWHERE r.blocking_session_id <> 0;\n\nThis lists every blocked request, the lock type it waits on (LCK_M_U, LCK_M_X ...), the resource, and the session blocking it. sys.dm_os_waiting_tasks and sys.dm_tran_locks give the same picture from the lock side."
            ),
            part(
              "Finding the head of the chain",
              "Follows blocking_session_id to the session that is not itself blocked, expecting it to be absent from sys.dm_exec_requests (sleeping) with an open transaction in sys.dm_tran_session_transactions, and reads its sys.dm_exec_sessions details and last statement with sys.dm_exec_input_buffer.",
              "SELECT s.session_id, s.status, s.login_name, s.host_name, s.program_name, s.last_request_end_time\nFROM sys.dm_exec_sessions AS s\nJOIN sys.dm_tran_session_transactions AS tst ON tst.session_id = s.session_id\nWHERE s.session_id NOT IN (SELECT session_id FROM sys.dm_exec_requests);\n\nThe head blocker is the session every chain leads to that is not waiting itself. A classic head blocker is sleeping (no active request) but holds an open transaction; sys.dm_exec_input_buffer(<session_id>, NULL) shows the last statement it ran."
            ),
          ],
        },
        {
          text: "The head blocker is session 73: status sleeping, login dev.amir@..., program 'Microsoft SQL Server Management Studio - Query', last request ended 09:30, one open transaction. Its last statement was an UPDATE on Sales.Products with no WHERE clause, and no COMMIT followed it.",
          ask: "What do you do about session 73, and in what order?",
          parts: [
            part(
              "Immediate action",
              "Contacts the developer to commit or roll back if that is quick; otherwise terminates the session with KILL 73, understanding that the uncommitted update rolls back (which can take as long as the update took) and the blocked requests then proceed.",
              "Ask Amir to run ROLLBACK (or COMMIT if the change was intended) in that window right now; if he cannot be reached in a minute or two, run KILL 73. Killing the session rolls back the open transaction -- the full-table UPDATE undo can take a while, and KILL 73 WITH STATUSONLY reports progress -- and the blocked saves complete as soon as the locks release."
            ),
            part(
              "Confirming recovery",
              "Re-runs the blocking query to confirm no rows remain, checks the application, and records the incident (session, statement, duration) for the post-mortem.",
              "Re-run the sys.dm_exec_requests query until no blocking_session_id remains, ask the order-entry team to retry, and note the time the chain started (09:31), the head session, the statement and who ran it. The missing WHERE clause also means Sales.Products needs checking, but the rollback has undone it."
            ),
          ],
        },
        {
          text: "The next day the same developer asks how to keep this from happening again, and the team lead asks whether a database setting would have prevented it.",
          ask: "Give the preventive changes.",
          parts: [
            part(
              "Working practices",
              "Recommends keeping transactions short and explicit (no open transactions left in query windows), using read-only access or a replica for ad-hoc work in production, and setting a lock timeout or alerting on long open transactions.",
              "No ad-hoc data changes in production from a query window; use change scripts with explicit BEGIN TRAN / COMMIT and a WHERE clause reviewed by someone else. Give developers read-only access to production (or a read replica), and add an alert when a transaction stays open longer than a few minutes using sys.dm_tran_active_transactions."
            ),
            part(
              "Database settings",
              "Explains that Azure SQL Database already uses READ_COMMITTED_SNAPSHOT by default, so readers were not blocked -- the blocked requests were writers, which no isolation setting helps -- and that reducing lock escalation or using smaller batches is what limits a large update's footprint.",
              "Azure SQL Database runs with READ_COMMITTED_SNAPSHOT on by default, which is why reports kept working: readers see the last committed version and do not wait on writers. The saves that hung were writers needing the same rows, and no isolation level lets two writers update the same row at once. What helps is keeping updates small (batches with their own commits) so locks are brief and do not escalate to the whole table."
            ),
          ],
        },
      ],
    },
    {
      slug: "index-change-for-slow-query",
      objective: "Identifying and implementing index changes for queries",
      kind: "build",
      title: "Design an index for a slow customer-orders query",
      brief:
        "In Fennel Lane Books' Azure SQL Database, this query runs 20,000 times an hour from the storefront:\n\nSELECT OrderId, OrderDate, TotalAmount FROM Sales.Orders WHERE CustomerId = @CustomerId AND Status = 'Open' ORDER BY OrderDate DESC;\n\nSales.Orders has 400 million rows and a clustered primary key on OrderId only. Query Store ranks it first by total logical reads; the actual execution plan shows a Clustered Index Scan with a residual predicate, a Sort, and about 1.9 million logical reads per execution. sys.dm_db_missing_index_details lists CustomerId and Status as equality columns with OrderDate and TotalAmount as included columns. A developer proposes rewriting the query as WHERE YEAR(OrderDate) = 2026 AND CustomerId = @CustomerId 'to make it faster'.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the index change, write the T-SQL, respond to the developer's rewrite, and say how you will confirm the result.",
          parts: [
            part(
              "Diagnosis",
              "Explains that with no index on CustomerId the engine scans the whole clustered index and then sorts, and that the missing-index DMV's suggestion matches the predicate (equality on CustomerId and Status) and the select list (OrderDate, TotalAmount).",
              "The only index is the clustered key on OrderId, so finding one customer's open orders means reading all 400 million rows and sorting the survivors. The missing-index DMV is suggesting exactly what the WHERE clause needs: a seek on CustomerId and Status, with the other selected columns carried along so no lookup back to the clustered index is needed."
            ),
            part(
              "The index",
              "Creates a nonclustered index keyed on CustomerId and Status, with OrderDate as a trailing key column (descending or ascending; it removes the Sort) and TotalAmount in INCLUDE so the index covers the query, built ONLINE.",
              "CREATE NONCLUSTERED INDEX IX_Orders_Customer_Status_OrderDate\nON Sales.Orders (CustomerId, Status, OrderDate DESC)\nINCLUDE (TotalAmount)\nWITH (ONLINE = ON);\n\nCustomerId and Status first because both are equality predicates; OrderDate next so rows come out in the ORDER BY order and the Sort disappears; TotalAmount included so the index covers the select list and there is no Key Lookup to the clustered index. OrderId is already carried as the clustered key."
            ),
            part(
              "The proposed rewrite",
              "Rejects WHERE YEAR(OrderDate) = 2026 because wrapping a column in a function makes the predicate non-sargable (no seek possible on OrderDate) and it also changes the results; offers a range predicate (OrderDate >= '2026-01-01' AND OrderDate < '2027-01-01') if a date filter is actually wanted.",
              "Do not use YEAR(OrderDate) = 2026: a function around the column stops the optimizer seeking on OrderDate (non-sargable) and it changes the query's meaning by dropping older open orders. If the business does want only this year's orders, write it as OrderDate >= '2026-01-01' AND OrderDate < '2027-01-01', which can use the new index's OrderDate key."
            ),
            part(
              "Verification and cost",
              "Compares the plan and logical reads before and after (SET STATISTICS IO ON or Query Store's plan comparison; expects an Index Seek with no Sort and reads in the tens, not millions), watches Query Store over the next day for regressions, and acknowledges the write and storage cost of the new index on a 400-million-row table.",
              "Run the query with SET STATISTICS IO ON before and after: expect the plan to change from Clustered Index Scan + Sort to an Index Seek on the new index with no Sort, and logical reads to fall from about 1.9 million to a few dozen per execution. Check Query Store the next day for the query's duration and for any regressed queries. The cost is extra storage and slower inserts/updates on Sales.Orders, which is acceptable for a query run 20,000 times an hour."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Unit 4: Configure and Manage Automation of Tasks (2)
    // ----------------------------------------------------------------------
    {
      slug: "elastic-jobs-tenant-maintenance",
      objective: "Creating and configuring elastic jobs",
      kind: "build",
      title: "Run nightly maintenance across 300 tenant databases with elastic jobs",
      brief:
        "Pelican SaaS, a fictional vendor, hosts 300 tenant databases on one Azure SQL logical server, tenants-sql.database.windows.net, in two elastic pools; new tenants are added every week and one database, tenant-template, must never be touched. The team wants a nightly index and statistics maintenance script to run on every tenant at 02:00 UTC, to limit how many databases run at once so the pools are not saturated, to collect each run's outcome centrally, and to use Microsoft Entra authentication rather than stored passwords. Azure SQL Database has no SQL Server Agent.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the elastic jobs solution and write the T-SQL.",
          parts: [
            part(
              "Agent, job database and identity",
              "Creates an elastic job agent with a new, empty job database (S1 or higher recommended) and a user-assigned managed identity (system-assigned is not supported), then creates a user for that identity in every tenant database (CREATE USER [name] FROM EXTERNAL PROVIDER) with the permissions the maintenance needs.",
              "Create an Elastic Job agent on the server with a new, empty Azure SQL database as its job database (Microsoft recommends S1 or higher; it cannot be Hyperscale or an auto-pausing serverless database). Give the agent a user-assigned managed identity (UMI); a system-assigned identity is not supported. In each tenant database (and in master for server/pool enumeration): CREATE USER [umi-elastic-jobs] FROM EXTERNAL PROVIDER; then ALTER ROLE db_owner ADD MEMBER [umi-elastic-jobs] or a narrower role that can rebuild indexes and update statistics. No passwords are stored anywhere."
            ),
            part(
              "Target group",
              "Creates a target group containing the whole logical server (enumerated at run time so new tenants are picked up automatically) and excludes tenant-template with an Exclude member.",
              "EXEC jobs.sp_add_target_group @target_group_name = N'AllTenants';\nEXEC jobs.sp_add_target_group_member @target_group_name = N'AllTenants',\n  @target_type = N'SqlServer', @server_name = N'tenants-sql.database.windows.net';\nEXEC jobs.sp_add_target_group_member @target_group_name = N'AllTenants',\n  @membership_type = N'Exclude', @target_type = N'SqlDatabase',\n  @server_name = N'tenants-sql.database.windows.net', @database_name = N'tenant-template';\n\nA server target is enumerated when the job runs, so databases added during the week are included without changing the job; the Exclude member keeps the template out."
            ),
            part(
              "Job, step and schedule",
              "Creates the job and a step with the idempotent maintenance script, @max_parallelism to cap concurrent databases, output to a central table, and a daily schedule starting at 02:00 UTC in the future (schedules are UTC and a past start time runs immediately).",
              "EXEC jobs.sp_add_job @job_name = N'NightlyMaintenance', @description = N'Index and statistics maintenance';\nEXEC jobs.sp_add_jobstep @job_name = N'NightlyMaintenance', @step_name = N'Maintain',\n  @command = N'EXEC dbo.usp_MaintainIndexesAndStats;', -- idempotent, safe to rerun\n  @target_group_name = N'AllTenants', @max_parallelism = 20,\n  @output_type = N'SqlDatabase', @output_server_name = N'tenants-sql.database.windows.net',\n  @output_database_name = N'ops-central', @output_table_name = N'MaintenanceResults';\nEXEC jobs.sp_update_job @job_name = N'NightlyMaintenance', @enabled = 1,\n  @schedule_interval_type = N'Days', @schedule_interval_count = 1,\n  @schedule_start_time = N'2026-11-09 02:00:00';\n\n@max_parallelism = 20 limits how many tenant databases run at once so the pools are not saturated. All times are UTC; set the start in the future, or an enabled job with a past start runs straight away. Steps may be retried after transient failures, so the script must be idempotent."
            ),
            part(
              "Monitoring and limits",
              "Checks jobs.job_executions (history kept 45 days) and the output table, sets an Azure Monitor alert on the agent's failed-jobs metric, and knows the agent's concurrency tier (JA100 = 100 concurrent targets by default) queues targets beyond its limit.",
              "SELECT * FROM jobs.job_executions WHERE job_name = N'NightlyMaintenance' ORDER BY start_time DESC; shows per-database outcomes and is kept for 45 days; the ops-central table keeps the script's own output. Add an Azure Monitor alert on the agent's Failed Elastic jobs metric. The default agent tier (JA100) runs up to 100 target connections at once and queues the rest, so 300 tenants with @max_parallelism 20 is well within it."
            ),
          ],
        },
      ],
    },
    {
      slug: "sql-agent-alerts-notifications",
      objective: "Configuring job alerts and notifications",
      kind: "build",
      title: "Configure SQL Server Agent alerts and job notifications on a managed instance",
      brief:
        "Marrowbrook Pharma, a fictional company, runs an Azure SQL Managed Instance with a nightly SQL Server Agent job, 'Nightly ETL', that has failed silently twice. The DBA team wants: an email to the on-call mailbox whenever the job fails; an email whenever SQL Server raises a severe error (severity 19 and above) or one of the I/O errors 823, 824 or 825; and no more than one alert email a minute for the same condition. Database Mail is not yet set up on the instance.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the configuration in T-SQL (msdb) and explain the pieces.",
          parts: [
            part(
              "Mail and operator",
              "Enables Database Mail (sp_configure 'Database Mail XPs', 1), creates a mail account and profile, points SQL Server Agent's alert system at that profile, and creates an operator with sp_add_operator for the on-call mailbox.",
              "EXEC sp_configure 'Database Mail XPs', 1; RECONFIGURE;\n-- create a Database Mail account and profile (sysmail_add_account_sp / sysmail_add_profile_sp / sysmail_add_profileaccount_sp),\n-- then set SQL Server Agent > Alert System to use that profile and restart the Agent.\nEXEC msdb.dbo.sp_add_operator @name = N'DBA On-Call', @enabled = 1,\n  @email_address = N'dba-oncall@marrowbrook.example';\n\nWithout Database Mail enabled and an Agent mail profile, alerts and job notifications are configured but nothing is sent; that is why the two failures were silent."
            ),
            part(
              "Job failure notification",
              "Updates the job with sp_update_job so it notifies the operator by email on failure (@notify_level_email = 2, @notify_email_operator_name).",
              "EXEC msdb.dbo.sp_update_job @job_name = N'Nightly ETL',\n  @notify_level_email = 2, -- 2 = when the job fails\n  @notify_email_operator_name = N'DBA On-Call';\n\nThe job's own notification fires on its outcome, independent of any alert. Levels: 1 on success, 2 on failure, 3 on completion."
            ),
            part(
              "Error alerts",
              "Creates alerts with sp_add_alert for severity 19-25 (one alert per severity, @severity) and for error numbers 823, 824 and 825 (@message_id with @severity = 0), each with @delay_between_responses = 60 and the event description included, then links each alert to the operator with sp_add_notification (@notification_method = 1 for email).",
              "EXEC msdb.dbo.sp_add_alert @name = N'Severity 019 Error', @severity = 19, @enabled = 1,\n  @delay_between_responses = 60, @include_event_description_in = 1;\nEXEC msdb.dbo.sp_add_notification @alert_name = N'Severity 019 Error',\n  @operator_name = N'DBA On-Call', @notification_method = 1;\n-- repeat for severities 20 to 25\nEXEC msdb.dbo.sp_add_alert @name = N'Error 823 I/O', @message_id = 823, @severity = 0, @enabled = 1,\n  @delay_between_responses = 60, @include_event_description_in = 1;\nEXEC msdb.dbo.sp_add_notification @alert_name = N'Error 823 I/O',\n  @operator_name = N'DBA On-Call', @notification_method = 1;\n-- repeat for 824 and 825\n\n@delay_between_responses = 60 seconds caps each alert at one email a minute; an alert is either on a severity or on a specific message_id, not both."
            ),
            part(
              "Verifying and troubleshooting",
              "Tests with a harmless RAISERROR at severity 19 WITH LOG (alerts fire only on logged errors) and by running the job to a deliberate failure, and checks msdb.dbo.sysmail_event_log / sysmail_allitems, sp_help_jobhistory and the Agent error log when nothing arrives.",
              "RAISERROR (N'Alert test', 19, 1) WITH LOG; -- alerts respond only to errors written to the log\nRun the job once with a step forced to fail and confirm the email. If nothing arrives: msdb.dbo.sysmail_event_log and sysmail_allitems show whether mail was queued and sent, sp_help_jobhistory shows the job outcome, and the SQL Server Agent error log shows whether the alert system has a mail profile."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Unit 5: Plan and Configure a High Availability and Disaster Recovery Environment (2)
    // ----------------------------------------------------------------------
    {
      slug: "hadr-strategy-from-rpo-rto",
      objective: "Recommending an HA/DR strategy based on Recovery Point Objective/Recovery Time Objective (RPO/RTO) requirements",
      kind: "build",
      title: "Choose an HA/DR design from RPO and RTO for Azure SQL Database",
      brief:
        "Ashgrove Financial's loan-servicing system runs on Azure SQL Database (Business Critical) in one region. Requirements: an availability-zone failure must cause no data loss and under a minute of downtime; a whole-region outage must lose no more than a few seconds of committed data with recovery in under five minutes, and the applications must reconnect without a connection-string change; accidental deletion of a table must be recoverable to the moment before it happened for up to 30 days; auditors require a restorable copy of month-end data for seven years. Cost should not exceed what the requirements need.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the HA/DR design, naming the feature for each requirement and the RPO/RTO it gives.",
          parts: [
            part(
              "Zone failure",
              "Enables zone redundancy on the database (or its elastic pool), which gives RPO 0 and RTO typically under 30 seconds for an availability-zone failure.",
              "Turn on zone redundancy for the Business Critical database so its replicas are spread across availability zones in the region. Microsoft states RPO 0 and an RTO typically under 30 seconds for this, which meets 'no data loss, under a minute'."
            ),
            part(
              "Regional outage",
              "Uses a failover group to a server in a different (ideally paired) region with the customer-managed failover policy, so applications use the group's read-write listener (<group>.database.windows.net) and need no connection-string change; cites RTO typically under 60 seconds and an RPO at or above 0 because geo-replication is asynchronous.",
              "Create a failover group between the primary server and a secondary logical server in the paired region (the secondary cannot be in the same region). Applications connect to the read-write listener <group-name>.database.windows.net, which follows the primary after a failover (DNS TTL 30 seconds), so no connection-string change. Microsoft gives RTO typically under 60 seconds and RPO equal to or greater than 0, since replication is asynchronous; a planned failover synchronises first and loses nothing, a forced failover can lose the last seconds. Keep the policy customer managed: the Microsoft-managed policy has a grace period of at least an hour, which would miss the five-minute target."
            ),
            part(
              "Accidental deletion",
              "Sets point-in-time restore retention to 30 days (configurable up to 35; default 7), and restores to a new database at a time just before the deletion, then copies the table back.",
              "Raise the database's backup retention for point-in-time restore from the 7-day default to 30 days (the maximum is 35). Backups are automatic: a full weekly, differentials every 12 or 24 hours and log backups every 5 to 10 minutes. To recover a dropped table, restore the database as a new database to a point just before the drop and copy the table across; the production database keeps running."
            ),
            part(
              "Seven-year audit copies and testing",
              "Configures a long-term retention policy keeping the first full backup of each month for 7 years (for example W=0, M=84, Y=0; LTR supports up to 10 years) and restores LTR backups as new databases; plans regular drills of the failover group and restores, and notes geo-restore from geo-redundant backup storage only as the last resort (RPO/RTO of minutes to hours).",
              "Add a long-term retention policy such as W=0, M=84, Y=0: the first full backup of each month is kept 84 months (7 years); LTR can go to 10 years and backups are restored as new databases on a server in the same subscription. Test the plan: perform a planned failover of the group and back in a maintenance window, time a point-in-time restore, and restore one LTR backup, each at least yearly. Geo-restore from geo-redundant backup storage remains the fallback if the failover group were ever unavailable, but its RPO and RTO are minutes to hours."
            ),
          ],
        },
      ],
    },
    {
      slug: "backup-restore-tsql-point-in-time",
      objective: "Backing up and restoring a database using T-SQL",
      kind: "build",
      title: "Back up to Azure Blob Storage and restore to a point in time with T-SQL",
      brief:
        "Marrowbrook Pharma, a fictional company, runs the LabResults database on SQL Server 2022 on an Azure virtual machine in the FULL recovery model. Backups must go to the Azure Blob Storage container https://mbpbackups.blob.core.windows.net/labresults using a shared access signature (no storage account key on the server). The DBA takes a full backup nightly and log backups every 15 minutes. At 14:52 a developer ran a DELETE without a WHERE clause against dbo.Results; the team wants the database back to 14:50 with everything up to that moment, and wants nothing committed after 14:50 to survive.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the backup and the point-in-time restore in T-SQL and explain each step.",
          parts: [
            part(
              "Credential",
              "Creates a server credential in master whose name is the container URL (https, no trailing slash) with IDENTITY = 'SHARED ACCESS SIGNATURE' and the SAS token as SECRET without the leading '?'.",
              "USE master;\nCREATE CREDENTIAL [https://mbpbackups.blob.core.windows.net/labresults]\n  WITH IDENTITY = 'SHARED ACCESS SIGNATURE',\n       SECRET = 'sv=...&sig=...';   -- the SAS token without the leading ?\n\nFor backup to URL with a SAS, the credential's name must match the container path exactly, start with https and have no trailing slash; the identity string is fixed, and the secret is the token minus its leading question mark."
            ),
            part(
              "Nightly full and 15-minute log backups",
              "Writes BACKUP DATABASE ... TO URL with COMPRESSION, CHECKSUM and STATS, and BACKUP LOG ... TO URL every 15 minutes, each to a unique file name, and notes FULL recovery is what makes log backups (and point-in-time restore) possible.",
              "BACKUP DATABASE LabResults\n  TO URL = 'https://mbpbackups.blob.core.windows.net/labresults/LabResults_20261106_2300.bak'\n  WITH COMPRESSION, CHECKSUM, STATS = 10;\n\nBACKUP LOG LabResults\n  TO URL = 'https://mbpbackups.blob.core.windows.net/labresults/LabResults_20261107_1445.trn'\n  WITH COMPRESSION, CHECKSUM;\n\nUnique file names per backup, CHECKSUM so damage is detected, COMPRESSION to cut storage and transfer. The FULL recovery model keeps the log chain, which is what point-in-time restore needs. (On Azure SQL Managed Instance a user backup to URL must be COPY_ONLY, since the service owns the backup chain.)"
            ),
            part(
              "Tail-log backup and restore sequence",
              "Takes a tail-log backup WITH NORECOVERY first (so the latest transactions are captured and the database goes into restoring state), restores the last full backup WITH NORECOVERY (and the latest differential if one exists), then restores the log backups in order WITH NORECOVERY up to the one covering 14:50.",
              "BACKUP LOG LabResults\n  TO URL = 'https://mbpbackups.blob.core.windows.net/labresults/LabResults_tail.trn'\n  WITH NORECOVERY;   -- capture everything since the last log backup; database enters RESTORING\n\nRESTORE DATABASE LabResults\n  FROM URL = 'https://mbpbackups.blob.core.windows.net/labresults/LabResults_20261106_2300.bak'\n  WITH NORECOVERY, REPLACE;\n\nRESTORE LOG LabResults FROM URL = '.../LabResults_20261107_0000.trn' WITH NORECOVERY;\n-- ... each 15-minute log backup in sequence, all WITH NORECOVERY ...\nRESTORE LOG LabResults FROM URL = '.../LabResults_20261107_1445.trn' WITH NORECOVERY;\n\nEverything stays WITH NORECOVERY so more log can be applied; the tail-log backup is taken first so the chain is unbroken up to the failure point."
            ),
            part(
              "Stopping at 14:50 and finishing",
              "Restores the log backup that spans 14:50 (the tail-log or the 15:00 backup) WITH STOPAT = '2026-11-07 14:50:00' and RECOVERY, so nothing after 14:50 is applied, then verifies dbo.Results and takes a new full backup because the log chain has restarted.",
              "RESTORE LOG LabResults\n  FROM URL = 'https://mbpbackups.blob.core.windows.net/labresults/LabResults_tail.trn'\n  WITH STOPAT = '2026-11-07 14:50:00', RECOVERY;\n\nSTOPAT replays the log only to 14:50:00, so the 14:52 DELETE and anything after it are not applied, and RECOVERY brings the database online. Check row counts in dbo.Results, then take a fresh full backup: a point-in-time restore starts a new recovery path, so the old log chain no longer applies going forward. If only the table were needed, restoring to a new database name WITH MOVE and copying the rows back would avoid taking production offline."
            ),
          ],
        },
      ],
    },
  ],
};
