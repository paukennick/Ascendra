import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-158: Google Cloud Professional Cloud Database Engineer.
//
// Aligned to the exam guide's four sections (Design 32%, Manage 25%, Migrate
// 23%, Deploy 20%) and the considerations the exam asks a candidate to DO:
// size and place a database, secure the connection path, read a slow query,
// design backup/PITR to RTO/RPO, pick scale-up vs scale-out, run a
// near-zero-downtime migration with a fallback, choose the migration tool,
// and provision and prove high availability. Density (docs/labs.md, policy
// "hybrid"): 3 / 3 / 2 / 1.
//
// Sources (all read 2026-11-07; the guides/<slug> page the track links now
// returns 404, the PDF below is what the certification page links):
//   exam guide  https://services.google.com/fh/files/misc/professional_cloud_database_engineer_exam_guide_english.pdf
//   Spanner SLA (multi-region / dual-region 99.999%, regional 99.99%)
//               https://cloud.google.com/spanner/sla
//   Cloud SQL SLA (Enterprise Plus HA 99.99%, Enterprise HA 99.95%)
//               https://cloud.google.com/sql/sla
//   Cloud SQL editions (PITR log retention up to 35 days Plus / 7 days
//   Enterprise; sub-second vs few-minutes maintenance downtime)
//               https://cloud.google.com/sql/docs/editions-intro
//   Cloud SQL HA (synchronous replication to a standby in a second zone)
//               https://cloud.google.com/sql/docs/mysql/high-availability
//   Cloud SQL PITR  https://cloud.google.com/sql/docs/postgres/backup-recovery/pitr
//   Cross-region replicas and promotion for DR
//               https://cloud.google.com/sql/docs/postgres/replication/cross-region-replicas
//   IAM database authentication  https://cloud.google.com/sql/docs/postgres/iam-authentication
//   Managed Connection Pooling    https://cloud.google.com/sql/docs/postgres/managed-connection-pooling
//   Query insights                https://cloud.google.com/sql/docs/postgres/using-query-insights
//   AlloyDB SLA (HA 99.99%)       https://cloud.google.com/alloydb/sla
//   AlloyDB AI (vector search)    https://cloud.google.com/alloydb/docs/ai
//   Spanner vector search         https://cloud.google.com/spanner/docs/find-k-nearest-neighbors
//   Bigtable schema design        https://cloud.google.com/bigtable/docs/schema-design
//   Memorystore for Redis Cluster https://cloud.google.com/memorystore/docs/cluster/memorystore-for-redis-cluster-overview
//   Database Migration Service    https://cloud.google.com/database-migration/docs/overview
//   Datastream                    https://cloud.google.com/datastream/docs/overview
// Every lab is needs_expert_review until a person checks it.

export const GCPDBE_LABS: SeedLabSet = {
  trackCode: "GCPDBE",
  sources: [
    source("https://services.google.com/fh/files/misc/professional_cloud_database_engineer_exam_guide_english.pdf", "exam_outline", "2026-11-07"),
    source("https://cloud.google.com/spanner/sla", "cloud_pricing_limits", "2026-11-07"),
    source("https://cloud.google.com/sql/sla", "cloud_pricing_limits", "2026-11-07"),
    source("https://cloud.google.com/sql/docs/editions-intro", "cloud_pricing_limits", "2026-11-07"),
    source("https://cloud.google.com/alloydb/sla", "cloud_pricing_limits", "2026-11-07"),
  ],
  labs: [
    // ---------------- Section 1: Design (3) ----------------
    {
      slug: "match-database-to-data-shape",
      objective: "Distinguishing SQL from NoSQL by business requirement: structured, semi-structured, unstructured, vector data",
      kind: "build",
      title: "Match a Google Cloud database to each workload",
      brief:
        "Harbourline Logistics is moving four workloads to Google Cloud. (1) Billing: invoices, payments and credit notes with multi-table transactions, foreign keys and monthly financial reports that join six tables; the team knows PostgreSQL. (2) Parcel telemetry: every scanner and truck writes a timestamped reading, several hundred thousand writes a second at peak, read back by device ID and time range, never joined. (3) Driver app sessions: a small amount of session state per signed-in driver that must be read in well under a millisecond on every request and can be rebuilt if lost. (4) Support search: agents type a free-text description of a damaged parcel and need the most similar past cases returned, ranked by meaning, alongside the structured case record. Harbourline wants one managed service per workload and a reason it fits better than the nearest alternative.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Choose a service for each workload and give the deciding reason, naming the alternative you rejected.",
          parts: [
            part(
              "Billing",
              "Chooses a managed relational engine (Cloud SQL for PostgreSQL or AlloyDB for PostgreSQL) for ACID multi-table transactions, foreign keys and SQL joins; rejects a NoSQL store for this shape.",
              "Cloud SQL for PostgreSQL (or AlloyDB for PostgreSQL if the reporting load grows): relational, ACID transactions across invoices and payments, foreign keys and SQL joins for the monthly reports, and the team already knows PostgreSQL. Bigtable or Firestore would push joins and transactions into the application."
            ),
            part(
              "Parcel telemetry",
              "Chooses Bigtable for very high write throughput of time-series rows read by key and range, and explains the row key should start with device ID then timestamp (not timestamp first, which hotspots).",
              "Bigtable: a wide-column store built for hundreds of thousands of writes a second and range scans by key. Row key device_id#reverse_timestamp (or device_id#timestamp) so one device's readings are contiguous and writes spread across devices; a timestamp-first key would send all writes to one node. Cloud SQL would need constant vertical scaling for this write rate."
            ),
            part(
              "Driver sessions",
              "Chooses Memorystore (Redis or Valkey) as an in-memory cache for sub-millisecond reads of rebuildable session state.",
              "Memorystore for Redis Cluster (or Valkey): in-memory key-value reads well under a millisecond, and losing a node only means a driver signs in again because the state can be rebuilt. A durable database adds latency the app does not need here."
            ),
            part(
              "Support search",
              "Recognizes a vector (embedding) similarity requirement alongside structured data and chooses a database with built-in vector search (AlloyDB AI with pgvector, or Spanner vector search), not plain keyword LIKE queries.",
              "AlloyDB for PostgreSQL with AlloyDB AI: store an embedding of each case description in a vector column and run a nearest-neighbor search joined to the structured case row in one SQL statement. Spanner's vector search would also fit; a LIKE query matches words, not meaning."
            ),
          ],
        },
      ],
    },
    {
      slug: "zonal-regional-multiregion-tradeoffs",
      objective: "Evaluating trade-offs between multi-regional, regional, and zonal database deployment",
      kind: "build",
      title: "Pick a deployment footprint from availability targets",
      brief:
        "Tessaly Health runs three systems and asks you to place each one. (1) A nightly reporting warehouse copy on PostgreSQL: if it is down for a day nobody is harmed, and it can be rebuilt from the source; lowest cost wins. (2) The appointment booking system on PostgreSQL: the business wants an availability commitment of at least 99.95% a month, failover without changing the connection string, and the last committed booking never lost if a zone fails. (3) A new patient-identity service that must serve reads and writes in Europe and North America with strong consistency and a 99.999% availability commitment, because every clinic depends on it. Give each system a deployment footprint and say what it costs them in money or latency.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Choose zonal, regional (high availability) or multi-region for each system, name the product configuration, and state the trade-off.",
          parts: [
            part(
              "Reporting copy",
              "Chooses a zonal (non-HA) Cloud SQL instance because the data is rebuildable and downtime is acceptable, and names the saving (no standby to pay for).",
              "A zonal Cloud SQL for PostgreSQL instance without high availability: a zone outage takes it down for a while and that is acceptable because it is rebuilt from the source nightly. It costs roughly half of an HA instance because there is no standby."
            ),
            part(
              "Appointment booking",
              "Chooses Cloud SQL with high availability (regional: primary plus synchronous standby in a second zone, automatic failover on the same endpoint) and matches the edition to the SLA: Enterprise Plus HA (99.99%) or Enterprise HA (99.95%) both meet 99.95%; notes synchronous replication means no committed write is lost on zone failure.",
              "Cloud SQL for PostgreSQL with high availability: a regional instance whose primary replicates synchronously to a standby in another zone, so a commit is durable in both zones and a zone failure triggers automatic failover behind the same IP. Enterprise edition HA carries a 99.95% monthly SLA, which meets the target exactly; Enterprise Plus HA carries 99.99% plus sub-second maintenance downtime if they want headroom. Trade-off: roughly double the instance cost for the standby."
            ),
            part(
              "Patient identity",
              "Chooses Spanner in a multi-region configuration spanning the two continents for strongly consistent reads and writes with the 99.999% SLA, and names the trade-offs: higher cost and write latency from cross-continent synchronous replication.",
              "Spanner, multi-region instance configuration with read-write replicas across the chosen regions in Europe and North America: strongly consistent, externally consistent reads and writes everywhere, and the multi-region SLA is 99.999% (regional Spanner is 99.99%). Trade-offs: the most expensive option, and write commits wait for a quorum across continents, so write latency is higher than a regional instance."
            ),
            part(
              "What regional does not give you",
              "States that a regional HA deployment protects against a zone failure, not a region-wide outage, so a cross-region replica (promoted manually or via advanced DR) is still needed for regional disaster recovery of the booking system.",
              "HA in one region survives the loss of a zone, not of the region. If the booking system must survive a regional outage, add a cross-region read replica of the Cloud SQL instance and plan the promotion (and the connection switch) as disaster recovery, with its own RTO/RPO."
            ),
          ],
        },
      ],
    },
    {
      slug: "secure-application-database-connectivity",
      objective: "Configuring networking, key management, encryption, and security for application-to-database connectivity",
      kind: "build",
      title: "Design the connection path from an app to Cloud SQL",
      brief:
        "Marrow & Finch, a payroll provider, is deploying a Cloud Run service that talks to a Cloud SQL for PostgreSQL instance. Today's draft gives the instance a public IP, opens it to 0.0.0.0/0 in authorized networks, stores the postgres superuser password in an environment variable, and lets the service open a new connection per request; the service scales to hundreds of instances at month end. Compliance also requires that the company controls the encryption key protecting payroll data at rest and can revoke it. Redesign the connection path.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the connectivity, authentication, encryption and pooling design.",
          parts: [
            part(
              "Network path",
              "Gives the instance a private IP only (no public IP, no 0.0.0.0/0 authorized network) and connects Cloud Run to it through the Cloud SQL connector / Auth Proxy or a Serverless VPC connector / Direct VPC egress to the private IP.",
              "Private IP only: remove the public IP and the open authorized network. Cloud Run reaches the instance over the VPC (Direct VPC egress or a Serverless VPC Access connector) using the Cloud SQL Auth Proxy / language connector, which authenticates with IAM and encrypts the connection with TLS without managing certificates."
            ),
            part(
              "Authentication",
              "Replaces the superuser password with IAM database authentication for the Cloud Run service account (a least-privilege database user, not the postgres superuser); any remaining secret lives in Secret Manager, not an environment variable.",
              "Create a database user for the Cloud Run service account and enable IAM database authentication, so the service logs in with a short-lived IAM token and no password exists to leak. Grant that user only the payroll schema privileges it needs, never superuser. If a password is unavoidable anywhere, it lives in Secret Manager and is mounted at runtime."
            ),
            part(
              "Encryption and key control",
              "Keeps TLS in transit and protects data at rest with a customer-managed encryption key (CMEK) in Cloud KMS on the instance, explaining that disabling or destroying the key makes the data unreadable, which is the revocation control compliance asked for.",
              "At rest: create the instance with a customer-managed encryption key (CMEK) from Cloud KMS in the same region; Google's default encryption would not let the company revoke access. Disabling the key version makes the instance's data inaccessible until re-enabled, which is the revocation control. In transit: require SSL/TLS on the instance (the connector does this for you)."
            ),
            part(
              "Connection handling",
              "Uses connection pooling (Managed Connection Pooling on Cloud SQL, or a pooler such as PgBouncer / pooling in the connector) so hundreds of Cloud Run instances do not exhaust the database's connection limit, with minimum instances or max connections per service instance tuned.",
              "Enable Managed Connection Pooling on the instance (or run PgBouncer) and keep a small pool per Cloud Run instance, with Cloud Run's max concurrency and max instances set so the total stays under the database's max_connections. Opening a connection per request at month-end scale would hit the connection limit and add latency to every request."
            ),
          ],
        },
      ],
    },

    // ---------------- Section 2: Manage (3) ----------------
    {
      slug: "slow-query-locks-missing-index",
      objective: "Assessing slow-running queries, database locking, and missing indexes",
      kind: "case",
      title: "Diagnose a slow checkout query on Cloud SQL",
      brief:
        "Kestrel Outdoor's web store runs on Cloud SQL for PostgreSQL (Enterprise Plus, 8 vCPU). Since a catalog import last week, checkout takes 6-9 seconds. The orders table has 40 million rows, order_items 200 million. Query insights is enabled. You are the database engineer on call.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Query insights shows the top query by total time is: SELECT * FROM order_items WHERE order_id = $1 AND status = 'pending'. Its plan is a Parallel Seq Scan on order_items with rows removed by filter: 199,999,994. CPU on the instance is at 95%.",
          ask: "What is wrong and what do you change first?",
          parts: [
            part(
              "Diagnosis",
              "Reads the sequential scan over 200 million rows for a selective predicate as a missing index on order_items(order_id) (optionally including status), and ties the CPU saturation to it.",
              "The plan scans all 200 million order_items rows to find a handful: there is no usable index on order_id, so every checkout does a full table scan in parallel, which is what is pinning CPU at 95%."
            ),
            part(
              "Fix",
              "Creates an index on order_items (order_id, status) or (order_id), using CREATE INDEX CONCURRENTLY to avoid blocking writes, then re-checks the plan for an Index Scan.",
              "CREATE INDEX CONCURRENTLY ON order_items (order_id, status); concurrently so the busy table is not locked against writes while it builds. Then re-run EXPLAIN (ANALYZE) and confirm an Index Scan with a few rows, and watch Query insights for the query's time to drop."
            ),
          ],
        },
        {
          text: "The index helps: the query now takes 3 ms. But Query insights shows a different query, UPDATE inventory SET qty = qty - 1 WHERE sku = $1, spending most of its time in the Lock wait state, and the application log shows a nightly job that runs UPDATE inventory SET reserved = 0 in one transaction over the whole table at 02:00, which coincides with checkout timeouts.",
          ask: "Explain the contention and how you remove it.",
          parts: [
            part(
              "Cause",
              "Identifies row-level lock contention: the nightly full-table UPDATE holds row locks on every inventory row until it commits, so checkout updates on the same rows wait (and may time out); names the long single transaction as the problem.",
              "The nightly job updates every inventory row in one transaction, holding a row lock on each until commit. Any checkout that decrements a locked SKU waits behind it, which shows as Lock wait. The issue is one long transaction touching rows the live path needs, not the UPDATE itself."
            ),
            part(
              "Remediation",
              "Batches the nightly update in small committed chunks (or restricts it to rows that need changing: WHERE reserved <> 0), runs it off-peak, keeps transactions short, and optionally uses lock_timeout / statement_timeout on the app so a wait fails fast instead of piling up.",
              "Rewrite the job to update in batches of a few thousand rows with a commit after each, and only rows WHERE reserved <> 0, so locks are held briefly. Set a lock_timeout on the checkout path so a blocked update fails fast and retries rather than stacking connections. Confirm in Query insights that Lock wait disappears."
            ),
          ],
        },
        {
          text: "A week later the team asks you to make sure this does not creep back as the store grows.",
          ask: "What do you put in place to catch the next slow query or lock storm before customers do?",
          parts: [
            part(
              "Ongoing monitoring",
              "Sets up Cloud Monitoring alerts on the instance (CPU utilization, active connections, lock waits / query latency from Query insights) and a routine review of Query insights top queries and plans, plus checking for unused or missing indexes after schema or data changes.",
              "Alert on CPU above a sustained threshold, on connections approaching the limit, and on Query insights query latency and lock-wait time for the top queries. Review the Query insights dashboard after every release or import, and run EXPLAIN on new queries before they ship, so a missing index is found in staging rather than at checkout."
            ),
          ],
        },
      ],
    },
    {
      slug: "backup-pitr-to-rto-rpo",
      objective: "Designing for RTO, RPO, and point-in-time recovery",
      kind: "build",
      title: "Design backup and recovery for a 5-minute RPO",
      brief:
        "Ondine Ticketing sells event tickets from a Cloud SQL for PostgreSQL database. The business sets: recovery point objective (RPO) 5 minutes for any failure including a bad deployment that corrupts rows; recovery time objective (RTO) 1 hour for an instance or zone failure and 4 hours for a region-wide outage; and the ability to restore the database to the state it was in at any minute during the last 30 days for a dispute investigation. Backups must also survive the accidental deletion of the instance. Write the backup and recovery design and say how you will prove it meets the numbers.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the design: which features, which settings, and the recovery procedure for each failure.",
          parts: [
            part(
              "Point-in-time recovery",
              "Enables automated backups and point-in-time recovery (write-ahead log archiving), and picks Cloud SQL Enterprise Plus because its transaction log retention can be set up to 35 days, covering the 30-day requirement (Enterprise edition retains up to 7 days); notes that PITR creates a new instance.",
              "Turn on automated daily backups and point-in-time recovery, which archives the write-ahead logs so the database can be restored to any moment within the retained log window. Choose Enterprise Plus and set transaction log retention to 30 days (Plus allows up to 35; Enterprise edition only up to 7, so it cannot meet the 30-day requirement). A PITR restore always creates a new instance, so the runbook includes repointing the application."
            ),
            part(
              "Meeting the RPO",
              "Explains that a bad deployment is recovered by PITR to the minute before the deploy (sub-5-minute data loss), and that zone failure with HA loses no committed data because replication to the standby is synchronous.",
              "Corruption from a deployment: restore with PITR to the minute before the release went out, so at most the minutes of writes after that point are lost, within the 5-minute RPO. Zone or instance failure: high availability replicates each commit synchronously to the standby, so failover loses nothing committed."
            ),
            part(
              "Meeting the RTOs",
              "Uses HA automatic failover for the 1-hour instance/zone RTO and a cross-region read replica that is promoted (plus a DNS/connection switch) for the 4-hour regional RTO, noting replica promotion is asynchronous so some recent writes may be missing.",
              "Instance or zone failure: HA failover completes in minutes behind the same endpoint, well within 1 hour. Regional outage: keep a cross-region read replica, promote it to a standalone primary and switch the application's connection, within the 4-hour RTO; because cross-region replication is asynchronous, the last seconds of writes may be missing, which must be stated against the 5-minute RPO."
            ),
            part(
              "Surviving deletion, and proving it",
              "Keeps backups that outlive the instance (retained backups / a backup vault, and periodic exports to Cloud Storage in another region or project), and schedules restore drills that time a PITR and a replica promotion against the RTO and RPO.",
              "Retained backups survive instance deletion and can be restored, and a scheduled export to a Cloud Storage bucket in another project (with retention) protects against a project-level mistake. Prove it quarterly: run a PITR to a new instance and time it, promote the cross-region replica in a drill and time the switch, and record both against the 1-hour and 4-hour RTOs and the data lost against the RPO."
            ),
          ],
        },
      ],
    },
    {
      slug: "scale-up-or-scale-out",
      objective: "Assessing scale-up versus scale-out options",
      kind: "build",
      title: "Decide scale-up or scale-out for three growing databases",
      brief:
        "Bramblewick Media's platform team has three scaling problems. (1) A Cloud SQL for MySQL instance for the content catalog: 90% of traffic is reads from the public site, the primary is at 85% CPU, and writes are a small, steady trickle from the editorial team. (2) A Cloud SQL for PostgreSQL instance behind the ad-auction service: writes have tripled, the 16 vCPU instance is saturated, and the forecast says writes will grow ten-fold over two years with strong consistency required worldwide. (3) An AlloyDB cluster for analytics dashboards whose queries are heavy aggregate scans on the same operational data; the primary slows whenever analysts run reports. Recommend scale-up or scale-out for each and say what you would not do.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "For each database, choose scale-up or scale-out, name the mechanism, and give the reason.",
          parts: [
            part(
              "Content catalog",
              "Chooses scale-out of reads with Cloud SQL read replicas (and a cache such as Memorystore for hot items), keeping writes on the primary; notes replicas are asynchronous so slightly stale reads must be acceptable for the public site.",
              "Scale out reads: add Cloud SQL read replicas and point the public site's read traffic at them (optionally cache the hottest catalog items in Memorystore). Writes stay on the primary, which is lightly loaded by them. Replication is asynchronous, so a reader may be a moment behind, which is fine for a public catalog. Scaling up the primary would be a short-term fix for a read-only problem."
            ),
            part(
              "Ad auction",
              "Recognizes that write throughput with ten-fold growth and global strong consistency outgrows a single-node relational instance (scale-up has a ceiling) and recommends horizontal scale-out on Spanner, with the migration planned rather than another machine-type bump.",
              "Scale up buys months, not years: a Cloud SQL instance has a largest machine type and a single writable node, and read replicas do not help writes. For ten-fold write growth with strong consistency, move the auction data to Spanner, which scales writes horizontally by adding compute and keeps strong consistency. Plan the migration now while a bigger machine type carries the next few months."
            ),
            part(
              "Analytics on AlloyDB",
              "Separates the analytical load from the primary with AlloyDB read pool instances (scale-out of reads), using the columnar engine for the aggregate scans, rather than scaling up the primary.",
              "Add an AlloyDB read pool and route the dashboards to it, enabling the columnar engine so aggregate scans run against column-oriented data. The primary keeps serving transactions; analysts no longer slow it. Scaling up the primary would make everyone pay for the analysts' peaks."
            ),
          ],
        },
      ],
    },

    // ---------------- Section 3: Migrate (2) ----------------
    {
      slug: "near-zero-downtime-migration",
      objective: "Developing and executing a migration strategy: zero/near-zero downtime, extended outage, fallback",
      kind: "case",
      title: "Run a near-zero-downtime MySQL migration with a fallback",
      brief:
        "Linden Grocers runs its 1.2 TB order database on self-managed MySQL 8.0 in a co-location data center with a Cloud Interconnect to Google Cloud. The business allows a 15-minute maintenance window for cutover, no longer, and insists on a tested way back to the old database for 48 hours after cutover. You are leading the move to Cloud SQL for MySQL.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The team proposes: stop the application Friday night, mysqldump the database, load it into Cloud SQL, and start the application Monday. The estimated dump and load time is 11 hours.",
          ask: "Why does that fail the requirements, and what approach do you take instead?",
          parts: [
            part(
              "Problem with the proposal",
              "Points out an 11-hour extended-outage approach breaks the 15-minute window and leaves no fallback once writes land in the new database.",
              "An 11-hour dump-and-load is an extended-outage migration; the business gave you 15 minutes. It also gives no way back: once Monday's orders are written to Cloud SQL, the old database is stale."
            ),
            part(
              "Approach",
              "Chooses a continuous (CDC) migration with Database Migration Service: initial load over the Interconnect while the source keeps serving, then ongoing binlog replication until cutover, with the source set up for replication (binary logging, a replication user).",
              "Use Database Migration Service with a continuous migration job: it copies the full database while the source stays live, then applies binary-log changes continuously so Cloud SQL stays within seconds of the source. Prerequisites on the source: binary logging enabled (row format), a replication user, and connectivity through the Interconnect by private IP."
            ),
          ],
        },
        {
          text: "The continuous job has been replicating for three days with replication lag under 2 seconds. Cutover is Saturday 02:00.",
          ask: "Write the cutover procedure for the 15-minute window.",
          parts: [
            part(
              "Cutover steps",
              "Orders the steps: stop application writes to the source, wait for lag to reach zero, verify row counts/checksums on key tables, promote the Cloud SQL instance (ends replication), repoint the application connection, run smoke tests, re-enable writes.",
              "1. Put the application in maintenance mode so no writes reach the source. 2. Watch replication lag reach zero. 3. Verify: row counts and checksums on orders and payments match. 4. Promote the destination in DMS, which stops replication and makes Cloud SQL writable. 5. Repoint the application's connection (private IP or connector) and run smoke tests. 6. Lift maintenance mode. Each step has a time budget so the total stays inside 15 minutes."
            ),
            part(
              "Go / no-go",
              "Defines a checkpoint before promotion with a rollback to the untouched source if verification fails, since nothing has been written to Cloud SQL yet.",
              "Before step 4 nothing has changed on the source, so if a checksum mismatches or lag will not reach zero, abort: lift maintenance mode on the source and try another night. The decision point is promotion; after it, falling back needs the reverse-replication plan."
            ),
          ],
        },
        {
          text: "Cutover succeeds. Finance reminds you of the 48-hour fallback requirement: if a defect appears on Monday, they want to return to the co-location database without losing the weekend's orders.",
          ask: "How do you make falling back possible without data loss?",
          parts: [
            part(
              "Reverse replication",
              "Sets up replication from Cloud SQL back to the source (reverse replication: the old MySQL as an external replica of Cloud SQL) immediately after cutover, so the source stays current and a fallback is a reverse cutover with the same lag-to-zero procedure.",
              "Right after promotion, configure the old MySQL as a replica of Cloud SQL (reverse replication, using Cloud SQL's binary logs and an external replica), so every weekend order also lands in the co-location database. A fallback is then the cutover procedure in reverse: stop writes, lag to zero, verify, repoint to the old server. After 48 clean hours, stop reverse replication and decommission."
            ),
          ],
        },
      ],
    },
    {
      slug: "choose-the-migration-tool",
      objective: "Choosing the correct database migration tool for a given scenario, including databases hosted outside Google Cloud",
      kind: "build",
      title: "Pick the migration tool for four source databases",
      brief:
        "Fennimore Insurance has four databases to bring to Google Cloud. (A) An Oracle claims database on-premises; the target is AlloyDB for PostgreSQL, and the application will be rewritten against PostgreSQL. (B) A MySQL database on Amazon RDS; the target is Cloud SQL for MySQL with minimal downtime. (C) A 400 GB SQL Server database for an HR system whose vendor requires SQL Server; the business accepts a one-evening outage and wants the simplest path to Cloud SQL for SQL Server. (D) An on-premises PostgreSQL sales database that must stay where it is for two more years, but whose changes must appear in BigQuery within minutes for analytics. Name the right Google Cloud tool for each and what makes it the fit.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Choose a tool for each database and give the deciding reason.",
          parts: [
            part(
              "A: Oracle to AlloyDB",
              "Chooses Database Migration Service's heterogeneous Oracle-to-PostgreSQL path (conversion workspace for schema/DDL conversion, then continuous data migration) and flags that application SQL and PL/SQL need conversion and testing.",
              "Database Migration Service, Oracle to AlloyDB for PostgreSQL: use its conversion workspace to convert the Oracle schema to PostgreSQL DDL, review what did not convert, then run a continuous migration job for the data. PL/SQL and vendor-specific SQL in the application still need rewriting and testing; the tool moves schema and data, not application logic."
            ),
            part(
              "B: RDS MySQL to Cloud SQL",
              "Chooses Database Migration Service homogeneous continuous migration (MySQL to Cloud SQL for MySQL), connecting to the RDS source over private connectivity or allowlisted IP, with binary logging enabled on RDS.",
              "Database Migration Service, MySQL to Cloud SQL for MySQL as a continuous job: it supports Amazon RDS MySQL as a source, performs the initial load and then replicates binlog changes until cutover, which gives the minimal-downtime switch. Enable binary logging and a replication user on the RDS instance and connect privately or by allowlisted IP."
            ),
            part(
              "C: SQL Server with an outage window",
              "Chooses a backup-and-restore import: take a full SQL Server backup (.bak) to Cloud Storage and import it into Cloud SQL for SQL Server during the evening window; notes DMS also supports SQL Server if downtime later becomes unacceptable.",
              "Native backup and restore: take a full backup of the 400 GB database, upload the .bak file to Cloud Storage and import it into Cloud SQL for SQL Server inside the agreed outage. It is the simplest path and the outage is allowed. Database Migration Service also migrates SQL Server with less downtime if the business changes its mind."
            ),
            part(
              "D: On-prem PostgreSQL into BigQuery",
              "Recognizes this is replication for analytics, not a migration, and chooses Datastream (change data capture from PostgreSQL into BigQuery) rather than DMS or nightly exports.",
              "Datastream: a serverless change data capture service that reads PostgreSQL's logical replication stream and writes changes into BigQuery within minutes, while the source database stays on-premises. Database Migration Service is for moving the database itself; a nightly export would miss the minutes-level requirement."
            ),
          ],
        },
      ],
    },

    // ---------------- Section 4: Deploy (1) ----------------
    {
      slug: "provision-and-prove-high-availability",
      objective: "Provisioning highly available database solutions in Google Cloud",
      kind: "build",
      title: "Provision a highly available Cloud SQL deployment and prove it",
      brief:
        "Saltmarsh Energy is launching a customer billing API on Cloud SQL for PostgreSQL in europe-west1 and must show its auditor that the database is highly available before go-live. Requirements: survive the loss of a zone with no data loss and automatic failover; survive the loss of the region with a documented, rehearsed recovery; planned maintenance must not interrupt billing for more than a second; and operations must learn of a failover or lag problem from an alert, not from customers. Write the provisioning plan and the evidence you will hand the auditor.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the provisioning plan: instance configuration, regional recovery, maintenance, monitoring, and the test that proves each requirement.",
          parts: [
            part(
              "Zone-resilient instance",
              "Provisions a Cloud SQL Enterprise Plus instance with high availability enabled (regional: primary and synchronous standby in different zones, automatic failover on the same endpoint), with automated backups and PITR on.",
              "Create a Cloud SQL for PostgreSQL Enterprise Plus instance in europe-west1 with high availability enabled, so a standby in a second zone receives every commit synchronously and failover is automatic behind the same IP. Enable automated backups and point-in-time recovery. Enterprise Plus HA carries the 99.99% SLA and sub-second planned maintenance."
            ),
            part(
              "Regional recovery",
              "Adds a cross-region read replica (for example in europe-west4) with a written promotion procedure (promote, repoint connection, re-establish HA and backups on the new primary) and a stated RPO reflecting asynchronous replication.",
              "Create a cross-region read replica in another EU region. Document the disaster procedure: promote the replica, repoint the API's connection string or connector, then enable HA and backups on the promoted instance. State in the runbook that cross-region replication is asynchronous, so the RPO is the replication lag at the time of the outage."
            ),
            part(
              "Maintenance and alerting",
              "Sets a maintenance window outside billing peaks and relies on Enterprise Plus near-zero (sub-second) maintenance downtime; configures Cloud Monitoring alerts on failover events, replication lag, CPU, storage and connection count, routed to the on-call channel.",
              "Set the maintenance window to the quietest hours and the Enterprise Plus edition keeps maintenance downtime sub-second. In Cloud Monitoring, alert on the replica's replication lag, instance CPU and storage utilization, connection count near the limit, and on failover and instance state log events, delivered to the on-call notification channel."
            ),
            part(
              "Evidence for the auditor",
              "Runs and records tests: a manual failover (gcloud sql instances failover) showing automatic recovery with no lost committed rows, a rehearsed replica promotion timed against the RTO, a PITR restore, and screenshots or exports of the alerts firing.",
              "Before go-live, trigger a manual failover and record the time to recover and a checksum showing no committed rows were lost; promote the cross-region replica in a rehearsal and time it against the RTO; restore a PITR copy and verify it; and capture the alert notifications that fired during each test. Those records, with the configuration, are the auditor's evidence."
            ),
          ],
        },
      ],
    },
  ],
};
