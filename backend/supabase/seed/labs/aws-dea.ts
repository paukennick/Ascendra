import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";

// REQ-154: AWS Certified Data Engineer - Associate (DEA-C01).
//
// Aligned to the DEA-C01 exam guide's four domains (Data Ingestion and
// Transformation 34%, Data Store Management 26%, Data Operations and Support
// 22%, Data Security and Governance 18%; 50 scored + 15 unscored questions,
// pass 720; checked 2026-11-07):
//   https://docs.aws.amazon.com/aws-certification/latest/data-engineer-associate-01/data-engineer-associate-01.html
// Density (docs/labs.md, policy "hybrid"): 3 / 3 / 2 / 2.
// Associate depth: the exam asks a candidate to pick the service, lay out
// the pipeline, design the schema and the lake layout, and find the bad
// number -- so the labs are mostly builds with cases for troubleshooting.
//
// Figures, each read on the named AWS documentation page on 2026-11-07:
//   - Kinesis Data Streams quotas (1 MB/s or 1,000 records/s write per
//     shard; 2 MB/s read per shard via GetRecords; five GetRecords calls per
//     second per shard; on-demand streams start at 4 MB/s write):
//     https://docs.aws.amazon.com/streams/latest/dev/service-sizes-and-limits.html
//   - Enhanced fan-out (up to 2 MB/s per shard per consumer, pushed over
//     HTTP/2 with SubscribeToShard; ~70 ms propagation):
//     https://docs.aws.amazon.com/streams/latest/dev/enhanced-consumers.html
//   - Lambda quotas (900-second timeout for standard functions; 128 MB to
//     10,240 MB memory; /tmp 512 MB to 10,240 MB; 6 MB synchronous payload):
//     https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
//   - DynamoDB partition key design (3,000 read units and 1,000 write units
//     per second per partition; write sharding):
//     https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html
//   - Athena table optimisation (Parquet/ORC recommended; Parquet block size
//     128 MB by default; partition on filter columns; over-partitioning
//     costs; bucketing on a high-cardinality column):
//     https://docs.aws.amazon.com/athena/latest/ug/performance-tuning-s3-throttling-optimizing-your-tables.html
//   - Athena Iceberg optimisation (OPTIMIZE ... REWRITE DATA USING BIN_PACK;
//     VACUUM; vacuum_max_snapshot_age_seconds):
//     https://docs.aws.amazon.com/athena/latest/ug/querying-iceberg-data-optimization.html
//   - Glue Data Quality DQDL (Rules = [...]; IsComplete, Completeness,
//     RowCount, ColumnValues, IsUnique, ReferentialIntegrity, DataFreshness,
//     dynamic rules with last()):
//     https://docs.aws.amazon.com/glue/latest/dg/dqdl.html
//     https://docs.aws.amazon.com/glue/latest/dg/dqdl-rule-types.html

export const AWSDEA_LABS: SeedLabSet = {
  trackCode: "AWSDEA",
  sources: [
    "https://docs.aws.amazon.com/aws-certification/latest/data-engineer-associate-01/data-engineer-associate-01.html",
    "https://docs.aws.amazon.com/streams/latest/dev/service-sizes-and-limits.html",
    "https://docs.aws.amazon.com/streams/latest/dev/enhanced-consumers.html",
    "https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html",
    "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html",
    "https://docs.aws.amazon.com/athena/latest/ug/performance-tuning-s3-throttling-optimizing-your-tables.html",
    "https://docs.aws.amazon.com/athena/latest/ug/querying-iceberg-data-optimization.html",
    "https://docs.aws.amazon.com/glue/latest/dg/dqdl.html",
  ],
  labs: [
    // ----------------------------------------------------------------------
    // Domain 1: Data Ingestion and Transformation (3)
    // ----------------------------------------------------------------------
    {
      slug: "choose-transformation-service",
      objective: "Choosing a transformation service for the requirement: Amazon EMR, AWS Glue, Lambda, Amazon Redshift",
      kind: "build",
      title: "Pick the transformation engine for four jobs",
      brief:
        "Lantern Grocers has four transformation jobs to place. (1) A nightly job that joins 2 TB of click events with product and store dimensions, written in PySpark by a small team that does not want to manage clusters. (2) A per-file job that runs when a 2 MB supplier price list lands in S3, validates it, converts it to Parquet and finishes in seconds. (3) A genomics-style workload for the data science team that needs a specific Spark version, custom Hadoop ecosystem components (Hive with a custom SerDe, Presto) and spot capacity, running for 6-8 hours. (4) A set of SQL aggregations over data already loaded into the warehouse, run after each load, that analysts want to own in SQL.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Name the engine for each job and the deciding reason.",
          parts: [
            part(
              "Nightly PySpark join",
              "Chooses AWS Glue (serverless Spark ETL jobs, no cluster management, PySpark supported) and gives the reason as managed Spark without operating a cluster.",
              "AWS Glue: a serverless Spark ETL job runs the existing PySpark with no cluster to size or patch; workers scale with the job and the Data Catalog holds the tables."
            ),
            part(
              "Small per-file validation",
              "Chooses AWS Lambda triggered by the S3 event, citing the small object, seconds of work, and a standard function's limits (the 900-second timeout and memory up to 10,240 MB are far more than it needs), and notes Lambda would be the wrong tool for the 2 TB job.",
              "Lambda, triggered by the S3 object-created event: a 2 MB file validated and written as Parquet in seconds fits comfortably inside a standard function's 15-minute (900-second) timeout and memory range, and there is no idle cost. It would not fit the 2 TB join."
            ),
            part(
              "Custom Spark and Hadoop ecosystem",
              "Chooses Amazon EMR, citing control over the Spark/Hadoop versions and components, custom SerDes, and Spot Instances for the long-running cluster.",
              "Amazon EMR: it lets the team pin the Spark version, install Hive with the custom SerDe and Presto, and run core and task nodes on Spot Instances for a multi-hour job -- control Glue does not give."
            ),
            part(
              "SQL aggregations in the warehouse",
              "Chooses Amazon Redshift (ELT in SQL where the data already lives, for example stored procedures or scheduled queries), citing analyst ownership and avoiding moving the data out.",
              "Amazon Redshift: run the aggregations as SQL inside the warehouse (stored procedures or scheduled queries after each load). The data is already there, analysts own SQL, and nothing is copied out to another engine."
            ),
          ],
        },
      ],
    },
    {
      slug: "orchestrate-etl-with-step-functions",
      objective: "Orchestrating ETL workflows with Lambda, EventBridge, Amazon MWAA, AWS Step Functions, and AWS Glue workflows",
      kind: "build",
      title: "Orchestrate a daily pipeline that can fail halfway",
      brief:
        "Riverbend Health's daily pipeline has five stages: (1) copy yesterday's claims extract from an SFTP drop to S3; (2) run a Glue job to standardise it; (3) run a Glue crawler to pick up new partitions; (4) load the result into Redshift with COPY; (5) refresh three downstream Glue jobs that can run in parallel. Today it is a cron script on one EC2 instance that runs the steps in sequence and emails on failure. Last week stage 4 failed after stage 2 had already run; the on-call engineer re-ran the whole script and the Redshift table ended up with duplicates. The team wants a managed orchestration that retries, alerts and never double-loads.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the orchestration.",
          parts: [
            part(
              "Orchestrator and trigger",
              "Chooses AWS Step Functions (a Standard workflow) started by an EventBridge schedule (or by the S3 object-created event of the extract), explaining why a state machine beats a cron script: durable state, built-in retries, parallel branches and a visible history.",
              "A Step Functions Standard workflow, started by an EventBridge schedule rule (or by the S3 event when the extract arrives). The state machine records each state's result, retries by policy, runs the three downstream jobs as a Parallel state and shows exactly where a run stopped."
            ),
            part(
              "Service integrations and waiting",
              "Uses the Step Functions optimised integrations for Glue (StartJobRun with .sync so the state waits for completion) and for Redshift (Redshift Data API ExecuteStatement, polling or a callback), and the crawler via StartCrawler plus a wait/poll loop since crawlers have no sync integration.",
              "Glue job states use glue:startJobRun.sync so the workflow waits for the job to finish; the crawler uses StartCrawler followed by a Wait/GetCrawler loop until it is READY; the COPY runs through the Redshift Data API (ExecuteStatement, then DescribeStatement until FINISHED). The parallel refresh is a Parallel state with three .sync Glue branches."
            ),
            part(
              "Idempotent load",
              "Makes stage 4 safe to re-run: load into a staging table and MERGE (or delete-then-insert by the batch's date key) in one transaction, keyed on the run date / batch id, so re-running a run never duplicates rows; the Glue job writes to a run-specific prefix or overwrites the day's partition.",
              "COPY into a staging table, then MERGE into the target (or DELETE WHERE claim_date = :run_date followed by INSERT) in one transaction. Rows are keyed by the batch date, so running the state twice leaves one copy. The Glue job writes its output to a prefix for that run date and overwrites it on retry."
            ),
            part(
              "Retries, errors and alerts",
              "Adds Retry blocks with backoff on transient errors (for example Glue.ConcurrentRunsExceededException, throttling), Catch blocks routing to a failure state that publishes to SNS (or EventBridge) with the run's details, and uses the execution history rather than email as the record; considers Amazon MWAA only if the team already lives in Airflow.",
              "Each task has a Retry with exponential backoff for transient errors (concurrent-runs exceeded, throttling) and a Catch that sends the error and execution ARN to an SNS topic the on-call subscribes to. Alerting also comes from an EventBridge rule on Step Functions execution FAILED/TIMED_OUT events. MWAA would be the choice if the team already writes Airflow DAGs; here Step Functions is less to run."
            ),
          ],
        },
      ],
    },
    {
      slug: "kinesis-throttling-case",
      objective: "Throttling and rate limits in DynamoDB, Amazon RDS, and Kinesis, and how to work within them",
      kind: "case",
      title: "Work through throttling on a clickstream pipeline",
      brief:
        "Pinewood Media ingests website click events into a Kinesis Data Stream with 4 provisioned shards. Three consumers read the stream: a Lambda function that writes to DynamoDB, a Flink application for live dashboards, and a Firehose delivery stream to S3. A marketing campaign has tripled traffic to about 9,000 events per second, each event roughly 600 bytes. Alarms are firing.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Producers report WriteProvisionedThroughputExceeded errors and the stream's IncomingBytes metric is flat at about 4 MB per second while the producers' retry queues grow.",
          ask: "Explain the write throttling and fix it.",
          parts: [
            part(
              "Why writes are throttled",
              "Computes the load against the per-shard write limit of 1 MB/s or 1,000 records/s: 9,000 records/s at 600 bytes is about 5.4 MB/s and 9,000 records/s, which exceeds 4 shards' 4 MB/s and 4,000 records/s on both counts.",
              "Each shard accepts up to 1 MB/s or 1,000 records/s. 9,000 events/s x 600 bytes is about 5.4 MB/s and 9,000 records/s; four shards give 4 MB/s and 4,000 records/s, so the stream is over on bytes and well over on record count."
            ),
            part(
              "Fix",
              "Scales the stream to enough shards for the record rate with headroom (at least 9 shards for 9,000 records/s, say 10-12), or switches to on-demand capacity mode; also checks the partition key is well distributed so no shard is hot, and keeps producers retrying with backoff (or aggregating records with the KPL) so no event is lost.",
              "Increase to around 12 shards (UpdateShardCount) -- the record rate, not the bytes, is the binding limit -- or switch the stream to on-demand mode so it scales with traffic. Confirm the partition key (for example a session or user id, not a page name) spreads evenly across shards, and keep producers retrying with backoff; KPL aggregation would also cut the record count."
            ),
          ],
        },
        {
          text: "Writes are healthy at 12 shards. Now the dashboards lag by several minutes and all three consumers log ReadProvisionedThroughputExceeded. The Lambda function's IteratorAge metric is climbing.",
          ask: "Explain the read-side problem and fix it so the dashboard team gets low latency.",
          parts: [
            part(
              "Why reads are throttled",
              "Explains that consumers sharing a shard share its 2 MB/s read throughput and five GetRecords calls per second, so three polling consumers contend with each other and each gets a third of the shard's budget, increasing latency and throttling.",
              "Standard (shared-throughput) consumers share each shard's 2 MB/s and five GetRecords calls per second. Three consumers polling the same shards split that budget three ways, so each is throttled and reads fall behind -- the growing IteratorAge is the backlog."
            ),
            part(
              "Fix",
              "Registers the latency-sensitive consumer(s) for enhanced fan-out so each gets its own 2 MB/s per shard pushed over HTTP/2 (SubscribeToShard) with about 70 ms propagation, leaving the shared budget to the rest; for the Lambda consumer tunes batch size / parallelization factor if it is the slow one.",
              "Register the Flink application (and the Lambda function if needed) as enhanced fan-out consumers: each gets a dedicated 2 MB/s per shard, pushed over HTTP/2, typically around 70 ms propagation, independent of other consumers. Firehose can stay on shared throughput. For the Lambda consumer, raise the batch size and parallelization factor so it drains faster, and watch IteratorAge fall."
            ),
          ],
        },
        {
          text: "The stream is fine. The Lambda consumer's DynamoDB writes now throw ProvisionedThroughputExceededException on a table in provisioned mode with 2,000 WCU. CloudWatch shows consumed WCU averaging only 900, but ThrottledRequests is non-zero. The table's partition key is the page URL, and one landing page gets 70% of clicks.",
          ask: "Explain the DynamoDB throttling and redesign the key.",
          parts: [
            part(
              "Why DynamoDB throttles below the table's capacity",
              "Explains that throughput is spread across partitions and any one partition delivers at most 3,000 read units and 1,000 write units per second; a hot key (one page URL) concentrates writes on one partition, so it throttles while the table average looks low.",
              "Table capacity is split across partitions, and a single partition can deliver at most 3,000 read units and 1,000 write units per second. With the page URL as the key, 70% of 9,000 writes land on one item collection, far past one partition's 1,000 WCU, so that partition throttles while the table-wide average sits at 900."
            ),
            part(
              "Key redesign",
              "Uses a high-cardinality key (for example session or event id) or write-shards the hot key by appending a calculated suffix (url#0..url#N) so writes spread across partitions, with reads querying the shards and merging; mentions on-demand mode does not remove the per-partition limit.",
              "Change the partition key to something high-cardinality (event id or session id, with page URL as an attribute or GSI) or shard the hot key: write to url#<0..9> with a random or hashed suffix so the landing page's writes spread over ten partitions, and have readers query the ten shards and merge. Switching to on-demand would not fix it: the per-partition limit still applies."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Domain 2: Data Store Management (3)
    // ----------------------------------------------------------------------
    {
      slug: "redshift-and-dynamodb-schema-design",
      objective: "Designing schemas for Amazon Redshift, DynamoDB, and Lake Formation",
      kind: "build",
      title: "Design a Redshift fact table and a DynamoDB access-pattern table",
      brief:
        "Harbourline Shipping needs two schemas. In Amazon Redshift: a shipments fact table (about 2 billion rows, growing 5 million a day) joined on every query to a 40,000-row ports dimension and a 300-row carriers dimension; nearly every query filters on ship_date and most group by carrier. In Amazon DynamoDB: a tracking table serving an app with three access patterns -- get the latest status of a shipment by shipment_id; list all status events for a shipment in time order; list all shipments for a customer created in the last 30 days, newest first. Write both designs.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the Redshift and DynamoDB schema designs.",
          parts: [
            part(
              "Redshift distribution",
              "Gives the fact table a KEY distribution on the join column to the larger dimension (port id) with that dimension also KEY-distributed, or EVEN/AUTO if the join is not dominant, and distributes the small carriers dimension with ALL; explains distribution reduces data movement on joins.",
              "shipments: DISTSTYLE KEY on port_id, and ports (40,000 rows) also DISTKEY port_id so the frequent join is co-located on each slice. carriers (300 rows): DISTSTYLE ALL so every node holds it and no redistribution is needed for the group-by join. (AUTO would be acceptable if the team wants Redshift to manage it, but the stated access pattern makes the explicit choice safe.)"
            ),
            part(
              "Redshift sort key and compression",
              "Uses a sort key led by ship_date (compound sort key ship_date, then carrier_id) so range filters prune blocks via zone maps; lets Redshift choose column encodings (ENCODE AUTO) or picks them from ANALYZE COMPRESSION, and notes vacuum/analyze or automatic table optimisation keeps it effective.",
              "SORTKEY (ship_date, carrier_id): the ship_date filter on nearly every query lets zone maps skip blocks, and carrier_id helps the common grouping. Use ENCODE AUTO (or ANALYZE COMPRESSION) for column encodings, and rely on automatic table optimisation / VACUUM so the sort stays effective as 5 million rows arrive daily."
            ),
            part(
              "DynamoDB base table",
              "Designs a single table with partition key shipment_id and sort key an event timestamp (or a composite like STATUS#<ts>), so the latest status is a Query with ScanIndexForward=false and Limit 1 and the history is the same Query without the limit.",
              "Table: PK = shipment_id, SK = event_ts (ISO-8601 so it sorts chronologically). Latest status: Query shipment_id with ScanIndexForward = false and Limit = 1. Full history in time order: the same Query ascending. No scans."
            ),
            part(
              "DynamoDB customer access pattern",
              "Adds a global secondary index with partition key customer_id and sort key created_at (projected attributes as needed) so 'shipments for a customer in the last 30 days, newest first' is a Query with a sort-key range condition and ScanIndexForward=false; notes GSIs are eventually consistent and have their own capacity.",
              "GSI1: PK = customer_id, SK = created_at, written only on the shipment's creation item (so one entry per shipment). Query customer_id with created_at >= now-30d, ScanIndexForward = false. Project the attributes the list screen shows. The GSI is eventually consistent and (in provisioned mode) needs its own capacity."
            ),
          ],
        },
      ],
    },
    {
      slug: "data-lake-layout-partitioning",
      objective: "Indexing, partitioning strategies, compression, and other data optimization techniques",
      kind: "build",
      title: "Lay out an S3 data lake so Athena queries are fast and cheap",
      brief:
        "Greyfield Energy lands smart-meter readings in S3 as about 40,000 small gzip-compressed JSON files a day (around 20 KB each, 800 MB a day in total, 3 years of history). Analysts query with Amazon Athena, almost always filtering by reading date and region, and often by a single meter_id. Queries scan everything, take minutes and cost more each month. Write the optimisation plan.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the lake layout and optimisation plan.",
          parts: [
            part(
              "File format and compression",
              "Converts the data to a columnar format (Apache Parquet or ORC) with a splittable, column-friendly codec (Snappy or ZSTD), explaining that columnar storage lets Athena read only the columns a query needs and that gzip JSON is neither columnar nor splittable.",
              "Convert to Parquet (or ORC) with Snappy or ZSTD compression using a Glue job. Athena then reads only the selected columns and skips row groups using the file statistics; gzip-compressed JSON forces a full read of every byte and a gzip file cannot be split across readers."
            ),
            part(
              "File sizing",
              "Compacts the 20 KB files into far fewer, larger files (on the order of the Parquet block size, 128 MB by default, or at least tens of MB), explaining the small-files problem: per-object overhead and many S3 requests dominate scan time.",
              "Compact each day's 40,000 small files into a handful of Parquet files of roughly 128 MB (the default Parquet block size) -- 800 MB a day of JSON becomes a few files once columnar and compressed. Tens of thousands of 20 KB objects mean the query spends its time on S3 requests and file-open overhead rather than reading data."
            ),
            part(
              "Partitioning",
              "Partitions by the common filter columns in a sensible hierarchy (region, then date, for example region=eu/dt=2026-11-07), avoids partitioning on meter_id (far too many partitions) and warns that over-partitioning increases metadata work; optionally uses partition projection for the date partitions.",
              "Partition on the filter columns: region=.../dt=YYYY-MM-DD (Hive-style keys so crawlers and MSCK pick them up, or partition projection so Athena computes the date partitions without catalog lookups). Do not partition on meter_id: millions of tiny partitions would make metadata retrieval slower than the scan it saves."
            ),
            part(
              "Point lookups on meter_id",
              "Handles the single-meter queries with bucketing on meter_id (high cardinality, uniformly distributed, frequently filtered) or by sorting within files so Parquet statistics prune, rather than adding more partitions.",
              "For 'one meter' queries, bucket the data on meter_id (a high-cardinality, evenly distributed, frequently filtered column) so Athena reads only the matching bucket, or at least sort rows by meter_id inside each file so Parquet min/max statistics skip row groups. That gives the lookup speed without exploding the partition count."
            ),
          ],
        },
      ],
    },
    {
      slug: "iceberg-table-evolution-case",
      objective: "Managing open table formats, such as Apache Iceberg",
      kind: "case",
      title: "Run an Iceberg table through a schema change and a bad load",
      brief:
        "Stonebridge Retail keeps its orders table in Apache Iceberg format on S3, registered in the AWS Glue Data Catalog and queried with Amazon Athena and Spark on Amazon EMR. The table receives hourly micro-batch upserts. Three things happen over one week.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Monday: the source system adds a column, loyalty_tier, and renames discount_pct to discount_rate. The ETL owner proposes dropping and recreating the table 'to be safe', which would take the dashboards down for hours.",
          ask: "How do you handle the schema change without rebuilding the table?",
          parts: [
            part(
              "Schema evolution",
              "Uses Iceberg's in-place schema evolution (ALTER TABLE ADD COLUMNS for loyalty_tier, ALTER TABLE ... RENAME COLUMN for discount_rate), explaining that Iceberg tracks columns by id so a rename does not rewrite data and old files remain readable.",
              "ALTER TABLE orders ADD COLUMNS (loyalty_tier string) and ALTER TABLE orders CHANGE COLUMN discount_pct discount_rate ... (rename). Iceberg identifies columns by id in its metadata, so renaming is a metadata change and existing Parquet files stay valid; no rebuild and no downtime."
            ),
          ],
        },
        {
          text: "Wednesday: a bug in the upsert job wrote wrong quantities for every order in the 14:00 batch. The team notices at 17:30; three more hourly batches have landed since.",
          ask: "How do you recover the data, and how do you avoid overwriting the good batches?",
          parts: [
            part(
              "Time travel",
              "Uses Iceberg time travel to read the table as of just before the 14:00 commit (query by snapshot id or timestamp, for example FOR TIMESTAMP AS OF / FOR VERSION AS OF in Athena or snapshot reads in Spark) to recover the correct quantities for the affected orders.",
              "Read the table as it was before the 14:00 commit -- SELECT ... FROM orders FOR TIMESTAMP AS OF TIMESTAMP '... 13:59' (or FOR VERSION AS OF the prior snapshot id from the history metadata) -- to get the correct quantities for the orders in that batch."
            ),
            part(
              "Targeted repair",
              "Repairs only the affected rows (MERGE/UPDATE the 14:00 orders from the time-travel read) rather than rolling the whole table back to the earlier snapshot, which would discard the three good batches; mentions rollback as the right tool only when nothing good landed after the bad commit.",
              "MERGE the recovered rows for that batch's order ids back into the current table (or UPDATE quantities for those ids). Do not roll the table back to the pre-14:00 snapshot -- that would throw away the 15:00, 16:00 and 17:00 batches. Rollback is right only when the bad commit is the latest one."
            ),
          ],
        },
        {
          text: "Friday: Athena queries have slowed. The table's data directory holds tens of thousands of small files and many delete files from the hourly upserts, and the metadata has months of snapshots.",
          ask: "What maintenance do you run, and how do you keep it running?",
          parts: [
            part(
              "Compaction",
              "Runs OPTIMIZE orders REWRITE DATA USING BIN_PACK (optionally with a WHERE on recent partitions) to merge small files and apply delete files into data files, and schedules it (for example after the daily load, via Step Functions/EventBridge or Glue's automatic compaction for Iceberg tables).",
              "OPTIMIZE orders REWRITE DATA USING BIN_PACK WHERE order_date >= current_date - interval '7' day to compact recent partitions and fold the delete files into data files. Schedule it after the daily load, or enable Glue Data Catalog automatic compaction for the table so it runs without a job of its own."
            ),
            part(
              "Snapshot and orphan clean-up",
              "Sets a retention (for example vacuum_max_snapshot_age_seconds) that still allows the time travel the team relies on, then runs VACUUM orders to expire old snapshots and remove orphan files; notes VACUUM shortens how far back time travel can go.",
              "ALTER TABLE orders SET TBLPROPERTIES ('vacuum_max_snapshot_age_seconds'='604800') to keep seven days of snapshots -- enough for the Wednesday-style recovery -- then VACUUM orders to expire older snapshots and delete orphan files. Once expired, those snapshots cannot be time-travelled to, so the retention is a business decision, not just a storage one."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Domain 3: Data Operations and Support (2)
    // ----------------------------------------------------------------------
    {
      slug: "wrong-dashboard-numbers-data-quality",
      objective: "Running data quality checks during processing, such as checking for empty fields",
      kind: "case",
      title: "Trace a wrong dashboard number back to the missing check",
      brief:
        "Fernhill Logistics' finance dashboard showed yesterday's revenue at one third of normal. Nothing failed: the Glue ETL job succeeded, the Redshift load succeeded, the dashboard refreshed. You are the data engineer asked to find out what happened and make sure a check catches it before anyone looks at a dashboard again.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The Glue job's output for yesterday has 412,000 rows; the previous 30 days average 1.2 million rows a day. In the output, the amount column is null in 64% of rows. The source extract came from a new upstream version that renamed amount_gbp to amount.",
          ask: "What went wrong, and which data quality rules would have stopped the load?",
          parts: [
            part(
              "Diagnosis",
              "Identifies a schema change upstream (column rename) that the job silently handled by producing nulls and dropping or failing to map rows, so the pipeline 'succeeded' with bad data -- a data quality failure, not an infrastructure one.",
              "The upstream rename meant the job's mapping found no amount_gbp, so the amount it wrote was null for most rows and the join/filter logic dropped others. Every stage reported success because nothing crashed; the data was wrong, not the jobs."
            ),
            part(
              "Rules",
              "Writes AWS Glue Data Quality (DQDL) rules that would have failed the run: a row count check against history (for example RowCount > avg(last(10)) * 0.8 or a fixed floor), a completeness check on amount (IsComplete \"amount\" or Completeness \"amount\" > 0.99), and a schema check (ColumnExists \"amount_gbp\" or ColumnExists on the expected names).",
              'Rules = [ RowCount > avg(last(10)) * 0.8, IsComplete "amount", ColumnExists "order_id", ColumnValues "amount" > 0 ]. The dynamic row-count rule compares today with recent history; IsComplete requires 100% non-null amounts (or Completeness "amount" > 0.99 if a few nulls are legitimate); ColumnExists on the columns the job depends on fails the moment the schema changes.'
            ),
          ],
        },
        {
          text: "Leadership asks that bad data never reaches Redshift again, but also that a single late supplier file (a legitimate 10% dip) does not block the whole day's load.",
          ask: "Where do the checks run, and what happens when they fail?",
          parts: [
            part(
              "Placement",
              "Runs the Data Quality evaluation inside the Glue job (EvaluateDataQuality transform) on the transformed output before it is written to the load location, and/or as a Data Catalog data quality run on the staging table before the Redshift COPY, so failing checks stop the pipeline before the load.",
              "Add an EvaluateDataQuality transform in the Glue job on the final DataFrame, with the ruleset above, writing results to S3/CloudWatch; the job fails (or routes rows to a quarantine prefix) when a rule fails, so the Step Functions workflow never reaches the COPY step. A catalog-level data quality run on the staging table is a second gate."
            ),
            part(
              "Thresholds and severity",
              "Tunes the thresholds so a 10% dip passes (RowCount > avg(last(10)) * 0.8) while a two-thirds drop fails, and separates hard-fail rules (schema, completeness) from warn-only rules (moderate volume changes) that alert via SNS without blocking.",
              "Keep the row-count floor at 80% of the recent average so a 10% supplier delay passes and a 66% drop fails. Mark schema and completeness rules as fail-the-job and treat moderate volume anomalies (DetectAnomalies on RowCount, or a 90% floor) as warnings that publish to SNS without stopping the load."
            ),
          ],
        },
      ],
    },
    {
      slug: "pipeline-observability-design",
      objective: "Deploying logging and monitoring that makes a pipeline auditable and traceable",
      kind: "build",
      title: "Make a Glue and Step Functions pipeline observable and auditable",
      brief:
        "Quillon Analytics runs 30 Glue jobs orchestrated by Step Functions, loading a Redshift warehouse. Auditors have asked three questions the team cannot currently answer: who changed a job definition last month; why a particular run on 3 March produced a late load; and whether any run read a bucket it should not have. Operations also want to be paged on failure but not on every retry. Design the monitoring and audit trail.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the observability and audit design.",
          parts: [
            part(
              "Logs",
              "Enables continuous logging for Glue jobs to CloudWatch Logs (driver and executor logs, with a sensible retention period) and Step Functions execution logging to a log group, and standardises structured log lines (run id, job name, stage) so a run can be traced end to end.",
              "Turn on Glue continuous logging to CloudWatch Logs with a retention policy (for example 90 days, longer to S3 for audit), enable Step Functions execution logging at ALL or ERROR level to its own log group, and have every job log structured JSON with the Step Functions execution id so one query follows a run across jobs."
            ),
            part(
              "Metrics and alarms",
              "Uses Glue job metrics and Step Functions metrics (ExecutionsFailed, ExecutionsTimedOut, job duration) with CloudWatch alarms; pages on an EventBridge rule for Glue Job State Change FAILED/TIMEOUT or Step Functions execution FAILED, not on individual retries (retries are inside the state machine; alarm on the final outcome or on a retry-count threshold).",
              "Alarms on Step Functions ExecutionsFailed and ExecutionsTimedOut, and on job duration exceeding its baseline (for the 'why late' question). An EventBridge rule on the Glue Job State Change event with state FAILED or TIMEOUT and on Step Functions execution status FAILED sends to SNS/PagerDuty. Retries happen inside the state machine's Retry policy and are not alarmed; a run that exhausts retries fails the execution, which pages."
            ),
            part(
              "Audit of changes and access",
              "Relies on AWS CloudTrail management events for who changed a job definition (glue:UpdateJob) and S3 data events (or CloudTrail Lake queries) for which buckets a job's role read, with the trail delivered to a locked-down bucket; notes AWS Config history for configuration changes.",
              "CloudTrail management events answer 'who called glue:UpdateJob and when'; enable S3 data events for the data buckets so GetObject calls by each job's IAM role are recorded, and query them in CloudTrail Lake or Athena. Deliver the trail to a central, write-once bucket. AWS Config adds a timeline of the Glue job and IAM role configuration."
            ),
            part(
              "Tracing one run",
              "Shows how the 3 March question is answered: Step Functions execution history for timings per state, the correlated Glue job run id and its CloudWatch logs and metrics, plus the Redshift load's STL/SYS load history -- all keyed by the execution id.",
              "For 3 March: open the Step Functions execution for that date, read each state's start and end times to find the slow stage, follow its Glue job run id into CloudWatch Logs and the job's metrics (executor memory, shuffle), and check Redshift's load history (SYS_LOAD_HISTORY) for the COPY timing. The execution id ties the pieces together."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Domain 4: Data Security and Governance (2)
    // ----------------------------------------------------------------------
    {
      slug: "lake-formation-fine-grained-access",
      objective: "Managing permissions through AWS Lake Formation for Amazon Redshift, Amazon EMR, Amazon Athena, and Amazon S3",
      kind: "build",
      title: "Grant column- and row-level access to a shared data lake",
      brief:
        "Ashdown Health's data lake holds a patients table (S3, Glue Data Catalog) with columns patient_id, name, date_of_birth, postcode, diagnosis_code, region and visit_cost. Three groups need access through Athena and Redshift Spectrum: analysts in the North region may see every column except name and date_of_birth, for rows where region = 'North' only; the finance team may see patient_id, region and visit_cost for all rows; the clinical lead may see everything. Today everyone uses the same IAM role with s3:GetObject on the whole bucket. Design the Lake Formation permissions.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the Lake Formation design.",
          parts: [
            part(
              "Moving control to Lake Formation",
              "Registers the S3 location with Lake Formation (using a Lake Formation service role, not the users' role), removes direct s3:GetObject from the users' IAM roles, and revokes the IAMAllowedPrincipals default so catalog access is governed by Lake Formation grants rather than IAM alone.",
              "Register s3://ashdown-lake/patients/ with Lake Formation using a dedicated registration role. Strip s3:GetObject on the bucket from the user roles (they need only Lake Formation's lakeformation:GetDataAccess, Glue catalog read and Athena permissions). Revoke IAMAllowedPrincipals on the database and table, so an IAM policy alone no longer grants data access."
            ),
            part(
              "North analysts",
              "Creates a data filter on the patients table with a row filter expression region = 'North' and column-level exclusion of name and date_of_birth (or an include list), and grants SELECT on that filter to the analysts' role.",
              "Data filter 'north-analysts': row filter region = 'North'; column exclusion name, date_of_birth. GRANT SELECT on patients with that data filter to role AshdownNorthAnalysts. Queries from Athena and Redshift Spectrum then return only North rows without the excluded columns."
            ),
            part(
              "Finance and clinical lead",
              "Grants finance SELECT with column-level permission limited to patient_id, region, visit_cost (all rows), and grants the clinical lead SELECT on all columns; optionally uses LF-Tags (for example sensitivity=pii) to make the rule scale to new tables.",
              "Finance: GRANT SELECT on patients, columns patient_id, region, visit_cost (no row filter). Clinical lead: GRANT SELECT on all columns. To scale, tag columns name and date_of_birth with an LF-Tag sensitivity=pii and grant finance and analysts on sensitivity=non-pii, so new PII columns are excluded automatically."
            ),
            part(
              "Verification and audit",
              "Tests each role's query (Athena and Redshift Spectrum) to confirm the filtered results, and uses CloudTrail's Lake Formation data access events (GetDataAccess) plus Athena query history to audit who read what.",
              "Run the same SELECT as each role: North analysts see only North rows and no name/DOB; finance sees three columns; the clinical lead sees everything. Audit through CloudTrail (lakeformation:GetDataAccess events record the principal, table and filter) alongside Athena and Redshift query logs."
            ),
          ],
        },
      ],
    },
    {
      slug: "cross-account-kms-encrypted-sharing",
      objective: "Configuring encryption across AWS account boundaries",
      kind: "build",
      title: "Share a KMS-encrypted bucket with a partner account",
      brief:
        "Bellweather Insurance (account 111111111111) stores claims extracts in S3 bucket bellweather-claims-export, encrypted with a customer managed KMS key in the same account. A reinsurance partner using account 222222222222 must read the objects under the partner/ prefix with its own IAM role, ReinsuranceReader. The partner must not be able to read anything else, Bellweather must be able to revoke access in one place, and every read must be auditable. Write the access and encryption configuration.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the cross-account configuration.",
          parts: [
            part(
              "Bucket policy",
              "Adds a bucket policy statement allowing the partner role's ARN s3:GetObject on arn:aws:s3:::bellweather-claims-export/partner/* (and s3:ListBucket with a prefix condition if listing is needed), naming the role rather than the whole account.",
              '{"Effect":"Allow","Principal":{"AWS":"arn:aws:iam::222222222222:role/ReinsuranceReader"},"Action":"s3:GetObject","Resource":"arn:aws:s3:::bellweather-claims-export/partner/*"} plus, if they need to list, s3:ListBucket on the bucket ARN with "Condition":{"StringLike":{"s3:prefix":"partner/*"}}. Granting the role, not the account root, keeps the grant narrow.'
            ),
            part(
              "KMS key policy",
              "Explains that a bucket grant is not enough for SSE-KMS objects: the key policy must also allow the partner role kms:Decrypt (and kms:DescribeKey) on the key, optionally conditioned on kms:ViaService s3.<region>.amazonaws.com and the encryption context, because cross-account KMS use requires the key policy to grant the external account/principal.",
              'The key policy needs a statement for the partner role: {"Effect":"Allow","Principal":{"AWS":"arn:aws:iam::222222222222:role/ReinsuranceReader"},"Action":["kms:Decrypt","kms:DescribeKey"],"Resource":"*","Condition":{"StringEquals":{"kms:ViaService":"s3.eu-west-2.amazonaws.com"}}}. Without it the object read fails with AccessDenied even though the bucket policy allows it, because the data key cannot be decrypted across accounts.'
            ),
            part(
              "Partner-side policy",
              "Attaches an identity policy to ReinsuranceReader in account 222222222222 allowing the same s3:GetObject on the prefix and kms:Decrypt on the specific key ARN, because cross-account access requires both the resource policies and the caller's identity policy to allow it.",
              "In the partner account, ReinsuranceReader's policy allows s3:GetObject on arn:aws:s3:::bellweather-claims-export/partner/* and kms:Decrypt on arn:aws:kms:eu-west-2:111111111111:key/<key-id>. Cross-account access is the intersection: the bucket policy and key policy on Bellweather's side, and the role's own policy on the partner's side."
            ),
            part(
              "Revocation and audit",
              "Makes the KMS key policy (or the bucket policy) the single revocation point -- removing the partner statement from the key policy stops every read at once -- and relies on CloudTrail (KMS Decrypt events show the partner principal; S3 data events show the objects) for the audit trail; mentions S3 Bucket Keys to reduce KMS request volume.",
              "Revoke by deleting the partner statement from the key policy: every decrypt then fails regardless of the bucket policy. CloudTrail records each kms:Decrypt with the partner role as the principal, and S3 data events on the bucket record each GetObject. Enable S3 Bucket Keys on the bucket to cut the number of KMS calls (and cost) without changing the security model."
            ),
          ],
        },
      ],
    },
  ],
};
