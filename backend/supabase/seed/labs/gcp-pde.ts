import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-158: Google Cloud Professional Data Engineer.
//
// Aligned to the exam guide's five sections (Design 22%, Ingest and process
// 25%, Store 20%, Prepare and use 15%, Maintain and automate 18%) and the
// considerations a candidate performs in scenario items: lay out projects
// and datasets for governance, de-identify PII, window a stream, pick the
// processing service, orchestrate a DAG, choose storage, design a table for
// cost, secure analysts' access, fix a slow query, size BigQuery capacity and
// choose a Dataproc cluster model. Density ("hybrid"): 2 / 3 / 2 / 2 / 2.
//
// Product names follow the exam guide; where Google renamed a product after
// the guide was written the current documentation name is given once in the
// lab (Cloud Composer -> Managed Service for Apache Airflow; Dataproc
// Serverless -> Managed Service for Apache Spark; Dataplex Universal Catalog
// -> Knowledge Catalog, 2026-04-10). Sources (all read 2026-11-07):
//   exam guide  https://services.google.com/fh/files/misc/professional_data_engineer_exam_guide_english.pdf
//   Storage classes (Nearline 30 / Coldline 90 / Archive 365-day minimums)
//               https://cloud.google.com/storage/docs/storage-classes
//   Object lifecycle  https://cloud.google.com/storage/docs/lifecycle
//   Partitioned / clustered tables
//               https://cloud.google.com/bigquery/docs/partitioned-tables
//               https://cloud.google.com/bigquery/docs/clustered-tables
//   Column-level security, row-level security, data masking
//               https://cloud.google.com/bigquery/docs/column-level-security-intro
//               https://cloud.google.com/bigquery/docs/row-level-security-intro
//               https://cloud.google.com/bigquery/docs/column-data-masking-intro
//   Materialized views  https://cloud.google.com/bigquery/docs/materialized-views-intro
//   Pricing (long-term storage after 90 days, batch loads free)
//               https://cloud.google.com/bigquery/pricing
//   Editions, reservations, slot autoscaling (Standard: autoscaling only,
//   1,600-slot max; Enterprise adds baseline, 1-yr 20% / 3-yr 40% commitments)
//               https://cloud.google.com/bigquery/docs/editions-intro
//               https://cloud.google.com/bigquery/docs/reservations-intro
//               https://cloud.google.com/bigquery/docs/slots-autoscaling-intro
//   Sensitive Data Protection de-identification
//               https://cloud.google.com/sensitive-data-protection/docs/deidentify-sensitive-data
//   Beam windowing / watermarks  https://beam.apache.org/documentation/programming-guide/
//   Dataflow exactly-once  https://cloud.google.com/dataflow/docs/concepts/exactly-once
//   Managed Service for Apache Spark (Dataproc)  https://cloud.google.com/dataproc-serverless/docs/overview
//   Managed Service for Apache Airflow (Composer)  https://cloud.google.com/composer/docs/concepts/overview
//   Knowledge Catalog (Dataplex)  https://cloud.google.com/dataplex/docs/introduction
//   Datastream  https://cloud.google.com/datastream/docs/overview
// Every lab is needs_expert_review until a person checks it.

export const GCPPDE_LABS: SeedLabSet = {
  trackCode: "GCPPDE",
  sources: [
    source("https://services.google.com/fh/files/misc/professional_data_engineer_exam_guide_english.pdf", "exam_outline", "2026-11-07"),
    source("https://cloud.google.com/storage/docs/storage-classes", "reference", "2026-11-07"),
    source("https://cloud.google.com/bigquery/docs/editions-intro", "cloud_pricing_limits", "2026-11-07"),
    source("https://cloud.google.com/bigquery/docs/slots-autoscaling-intro", "reference", "2026-11-07"),
    source("https://cloud.google.com/bigquery/pricing", "cloud_pricing_limits", "2026-11-07"),
  ],
  labs: [
    // ---------------- Section 1: Design (2) ----------------
    {
      slug: "project-dataset-table-governance-layout",
      objective: "Designing project, dataset, and table architecture for proper data governance",
      kind: "build",
      title: "Lay out projects, datasets and tables for governance",
      brief:
        "Corvid Retail is building its first BigQuery platform. Three teams load data: Sales, Supply Chain and People (HR). Analysts across the company should query curated sales and supply-chain data freely, but HR data contains salaries and must be visible only to the People team and two finance directors. Each team has a development and a production environment, and the CFO wants each team's BigQuery spend billed to that team's cost center. Today the proposal is a single project called 'data' with one dataset called 'tables'. Redesign the layout.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the project, dataset and table layout, and how access and cost follow it.",
          parts: [
            part(
              "Projects",
              "Separates production from development and gives each team (or data domain) its own project(s) under folders, so IAM, quotas and billing attribute naturally; attaches projects to the team's billing account or uses labels for cost allocation.",
              "A folder per team (sales, supply-chain, people) with a -dev and a -prod project in each, plus a shared analytics project for cross-team curated data. Projects are the IAM and billing boundary: each team's projects carry a cost-center label (or billing account), so Cloud Billing export shows spend per team without any tagging of individual queries."
            ),
            part(
              "Datasets",
              "Organizes datasets by domain and by layer (raw/landing, curated/published) rather than one dataset for everything, with the dataset as the main IAM grant point (groups, not individuals) and the HR datasets in their own project with restricted groups.",
              "Within each prod project: a raw dataset (loaders write, nobody else reads) and a curated dataset (published, read by analysts). Grant at the dataset level to Google Groups: analysts@ gets BigQuery Data Viewer on sales and supply-chain curated datasets; the people-prod project's datasets are readable only by people-team@ and finance-directors@. No individual user grants."
            ),
            part(
              "Tables and sharing",
              "Uses authorized views or authorized datasets to expose a derived, non-sensitive slice of HR data (for example headcount by department) to analysts without granting access to the underlying tables; applies policy tags for column-level control on salary columns.",
              "For the company-wide headcount dashboard, create an authorized view (or authorized dataset) in the shared analytics project that aggregates HR data without salaries; analysts can query the view but not the source tables. Tag the salary and bank-detail columns with a policy tag so even People-team members without the fine-grained reader role see the table but not those columns."
            ),
            part(
              "Why not one project and one dataset",
              "Explains that a single project/dataset makes least-privilege impossible (dataset-level grants expose HR to everyone), mixes dev and prod risk, and gives the CFO no cost attribution.",
              "One dataset means one access list: anyone who can read sales can read salaries. One project means dev experiments share quotas, reservations and audit logs with production, and there is no boundary to bill to a cost center. The layout above gives a grant point, a blast-radius limit and a billing line per team."
            ),
          ],
        },
      ],
    },
    {
      slug: "pii-strategy-for-customer-events",
      objective: "Designing privacy strategies to handle personally identifiable information",
      kind: "build",
      title: "Design the PII handling for a customer-events warehouse",
      brief:
        "Pelham & Vale, an online pharmacy, streams customer order events into BigQuery. Each event carries the customer's email, full name, date of birth, delivery address, the last four digits of their payment card, and the items ordered. Marketing analysts need to count repeat customers and segment by age band and region but must never see who a customer is. Customer-care staff need to look up a specific customer's orders by email. Legal requires that PII can be removed for a customer on request and that analysts' copies hold no direct identifiers. Design the privacy strategy using Google Cloud tools.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the de-identification and access design, naming the technique for each field and where it is applied.",
          parts: [
            part(
              "Direct identifiers",
              "Pseudonymizes email and name with a deterministic, keyed transformation (Sensitive Data Protection deterministic encryption or crypto-hash with a KMS-wrapped key) so the same customer maps to the same token, which keeps repeat-customer counts possible without revealing identity.",
              "Run events through a Sensitive Data Protection de-identification template in the pipeline: replace email and full name with deterministic encryption tokens keyed by a Cloud KMS-wrapped key, so a customer always gets the same token and analysts can count repeat customers and joins still work, but nobody can read the identity back without the key."
            ),
            part(
              "Quasi-identifiers",
              "Generalizes date of birth to an age band (bucketing) and address to a region/postcode district, since exact values re-identify people when combined, and keeps the card digits out of the analysts' table entirely or masked.",
              "Bucket date of birth into age bands (for example 25-34) and reduce the delivery address to a region or outward postcode with Sensitive Data Protection generalization, because exact birth date plus address re-identifies someone. Drop the card digits from the analytics copy; if a column must stay, apply format-preserving encryption so it keeps the shape but not the value."
            ),
            part(
              "Two audiences, two paths",
              "Lands the raw events in a restricted dataset readable only by the customer-care system and a small group, publishes the de-identified table to analysts, and uses BigQuery column-level security (policy tags) or data masking as a second layer where a column must exist in both.",
              "Raw events go to a locked-down dataset in the operations project that only the customer-care application's service account and a small on-call group can read; care staff search by email through that application. The de-identified table is what marketing's dataset contains. Where a column must be present in both, policy tags on the PII columns and a data-masking rule (for example hash or nullify) mean analysts without the fine-grained reader role see masked values."
            ),
            part(
              "Deletion on request",
              "Keys the token-to-identity mapping (or the raw rows) on the customer ID so a deletion request removes the raw rows and the key material or mapping for that customer, making the pseudonymous tokens unlinkable; notes partitioning raw data makes targeted deletes cheaper.",
              "A deletion request deletes the customer's rows from the raw dataset (partitioned by ingestion date and clustered by customer ID so the delete is targeted) and removes the mapping or the per-customer key material, after which the tokens in the analytics copy point to nothing. Record the request and its completion for the legal team."
            ),
          ],
        },
      ],
    },

    // ---------------- Section 2: Ingest and process (3) ----------------
    {
      slug: "windowing-late-data-clickstream",
      objective: "Designing streaming transformations: windowing, late-arriving data",
      kind: "build",
      title: "Window a clickstream with late and duplicate events",
      brief:
        "Quillon Games publishes player events to Pub/Sub from mobile devices. Each event has a player_id, an event_time set on the device, an event_id, and a type (level_start, level_end, purchase). Devices lose connectivity and upload batches up to 30 minutes late; Pub/Sub may redeliver a message. Product wants three Dataflow outputs: (1) purchases per minute by country updated as events arrive; (2) the number of distinct active players over each rolling 10-minute span, refreshed every minute; (3) one row per play session, where a session ends after 15 minutes without events. Design the Apache Beam transformations.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the windowing, lateness and deduplication design for the three outputs.",
          parts: [
            part(
              "Time and windows",
              "Uses event time (the device timestamp, not processing time) and picks fixed 1-minute windows for purchases per minute, sliding windows of 10 minutes every 1 minute for active players, and session windows with a 15-minute gap for play sessions.",
              "Assign each element its device event_time as the Beam timestamp. Output 1: fixed (tumbling) 1-minute windows keyed by country, summing purchases. Output 2: sliding windows of size 10 minutes, period 1 minute, counting distinct player_id. Output 3: session windows with a 15-minute gap duration keyed by player_id, so a session closes after 15 quiet minutes."
            ),
            part(
              "Late data",
              "Sets allowed lateness of at least 30 minutes with a trigger that emits early/speculative results and fires again for late data, choosing accumulating or discarding panes deliberately (for example accumulating for the per-minute totals written to a table keyed by window).",
              "Set allowedLateness to 30 minutes (the upload delay) past the watermark so late uploads still land in their windows. Trigger: AfterWatermark with early firings (for example every 30 seconds while the window is open) and late firings on each late element. Use accumulating panes so each firing writes the full corrected total for that minute, overwriting the previous value for the window key."
            ),
            part(
              "Duplicates",
              "Deduplicates on event_id (Beam Deduplicate / Distinct by event_id within a time domain, or Pub/Sub message ID exactly-once from Dataflow) rather than trusting at-least-once delivery.",
              "Pub/Sub delivers at least once, so apply Deduplicate keyed by event_id over an event-time window at least as wide as the lateness, so a redelivered or re-uploaded event is dropped before counting. Dataflow already deduplicates by Pub/Sub message ID for its own retries; the event_id step covers duplicates created upstream by the device."
            ),
            part(
              "Sinks",
              "Writes per-window results to BigQuery keyed by window start (so late firings update rather than duplicate rows, or uses a merge/last-writer pattern), and notes the Storage Write API for streaming writes.",
              "Write outputs 1 and 2 to BigQuery via the Storage Write API with window_start as part of the key, so a late firing for a minute replaces that minute's row (merge or last-write-wins on window_start, country). Output 3 writes one row per closed session with session start and end; sessions are final once the window closes plus lateness."
            ),
          ],
        },
      ],
    },
    {
      slug: "choose-processing-service",
      objective: "Choosing the right data processing service: Dataflow, Apache Beam, Dataproc, Cloud Data Fusion, BigQuery, Pub/Sub, Apache Spark, the Hadoop ecosystem, Apache Kafka",
      kind: "build",
      title: "Choose the processing service for four pipelines",
      brief:
        "Oakhurst Bank's data platform team has four new pipelines. (1) A stream of card authorizations needing per-merchant fraud features computed within seconds, with exactly-once results and autoscaling. (2) A 60-node on-premises Hadoop estate running 300 Spark and Hive jobs nightly that must move to Google Cloud this quarter with minimal code change. (3) A daily transformation of data already in BigQuery: joining the loan book to rates and writing a reporting table, maintained by analysts who know SQL but not Java or Python. (4) Integration of 40 SaaS and on-premises sources into the warehouse by a team of ETL developers who want a visual, code-free tool with prebuilt connectors. Name the service for each and the reason.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Choose a Google Cloud processing service for each pipeline and give the deciding reason, naming an alternative you rejected.",
          parts: [
            part(
              "Fraud features stream",
              "Chooses Pub/Sub for ingestion and Dataflow (Apache Beam) streaming for the processing, citing event-time windowing, exactly-once processing and autoscaling as the fit; rejects a Spark cluster for a managed streaming need.",
              "Pub/Sub into a Dataflow streaming pipeline written with Apache Beam: Beam gives event-time windows and triggers for the per-merchant features, Dataflow provides exactly-once processing and autoscaling workers with no cluster to manage. Spark Structured Streaming on Dataproc could do it but adds cluster management for no gain."
            ),
            part(
              "Hadoop estate",
              "Chooses Dataproc (Managed Service for Apache Spark) as a lift-and-shift target for Spark and Hive with minimal code change, with data moved from HDFS to Cloud Storage and the Hive metastore externalized; rejects rewriting everything in Beam this quarter.",
              "Dataproc, now called Managed Service for Apache Spark: it runs the existing Spark and Hive jobs largely as-is, so the quarter's deadline is realistic. Move the data from HDFS to Cloud Storage (the connector makes gs:// a drop-in) and use a managed metastore, so clusters become ephemeral. Rewriting 300 jobs as Beam pipelines would not fit the timeline."
            ),
            part(
              "In-warehouse daily transform",
              "Chooses BigQuery itself (scheduled SQL, Dataform for versioned SQL transformations) because the data is already there and the team knows SQL; rejects exporting to Dataflow or Spark.",
              "BigQuery: write the join as SQL and run it with Dataform (or a scheduled query) so the transformation is versioned and tested, with no data leaving the warehouse and no Java or Python. Pulling the loan book out to Dataflow or Spark to join it and load it back would add cost and a skill the team does not have."
            ),
            part(
              "SaaS and on-prem integration",
              "Chooses Cloud Data Fusion for its visual, code-free pipeline design and library of prebuilt connectors, suited to the ETL developers' profile; notes it runs on Dataproc under the hood.",
              "Cloud Data Fusion: a visual ETL designer with prebuilt connectors for SaaS applications and databases, which is what a code-free ETL team needs for 40 sources. It executes on Dataproc clusters it manages. Hand-coding 40 Beam connectors would be slower and harder for this team to maintain."
            ),
          ],
        },
      ],
    },
    {
      slug: "composer-dag-for-nightly-load",
      objective: "Automating and orchestrating jobs with Cloud Composer and Workflows",
      kind: "case",
      title: "Orchestrate a nightly load that keeps failing",
      brief:
        "Wrenfield Insurance loads policy and claims files into BigQuery every night. A supplier drops CSV files into a Cloud Storage bucket 'around midnight', a Dataflow batch job cleans them, a BigQuery job builds the reporting tables, and a Looker Studio report must be fresh by 07:00. Today this is a cron job on a VM that runs the three steps in sequence at 00:30. You are moving it to Cloud Composer (Managed Service for Apache Airflow).",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Last night the supplier's files arrived at 00:52. The cron job had already run at 00:30 against yesterday's files and the 07:00 report showed stale data. Nobody was alerted.",
          ask: "Design the DAG so this cannot happen.",
          parts: [
            part(
              "Dependency on arrival",
              "Starts the DAG with a Cloud Storage sensor (or an event-driven trigger on object arrival) that waits for the day's files rather than running at a fixed time, with a timeout and a dated path so it waits for the right files.",
              "First task: a GCSObjectExistenceSensor (deferrable, so it does not hold a worker) on gs://wrenfield-landing/policies/{{ ds }}/_SUCCESS, or trigger the DAG from a Cloud Storage object-finalized event. Downstream tasks depend on it, so the Dataflow and BigQuery steps cannot run on yesterday's files. Give the sensor a timeout (for example 05:00) so a missing delivery becomes a failure, not a silent wait."
            ),
            part(
              "Alerting and SLA",
              "Adds failure callbacks / email or chat notification on task failure and an SLA (or deadline alert) so a late run before 07:00 pages someone.",
              "Set on_failure_callback (or email_on_failure) to notify the data on-call channel, and an sla of, say, 06:00 on the final task so Airflow records an SLA miss and alerts if the report tables are not built in time, giving an hour to intervene before 07:00."
            ),
          ],
        },
        {
          text: "The DAG works for two weeks. Then the supplier re-sends corrected files for 3 March and an engineer re-runs that day's DAG. The claims reporting table now shows 3 March claims twice.",
          ask: "Why did re-running duplicate the data, and how do you make the DAG safe to re-run?",
          parts: [
            part(
              "Cause",
              "Identifies that the load appends rows per run, so a second run for the same logical date inserts the same day again; the tasks are not idempotent.",
              "The BigQuery load task appends to the claims table, so running the 3 March DAG twice appended 3 March twice. Re-runs and backfills are normal in Airflow; every task must produce the same end state however many times it runs."
            ),
            part(
              "Idempotent design",
              "Makes each task idempotent for its logical date: write to the date partition with WRITE_TRUNCATE (partition decorator claims$20260303) or a MERGE on a key, and parameterise every path and partition by the execution date, not now().",
              "Partition the claims table by date and have the load write the partition for {{ ds }} with WRITE_TRUNCATE (table decorator claims$20260303) or run a MERGE keyed on claim_id, so a re-run replaces that day's rows instead of adding to them. Use {{ ds }} for the input path and output partition everywhere, never the wall clock, so a backfill for 3 March touches only 3 March."
            ),
          ],
        },
        {
          text: "Finally, a different team asks you to add a small step: when a single file lands in another bucket, call a Cloud Run service to validate it and, if valid, publish a Pub/Sub message. No heavy data processing, no schedule, and they do not want to learn Airflow.",
          ask: "Would you add this to Composer or use something else, and why?",
          parts: [
            part(
              "Tool choice",
              "Chooses Workflows (event-triggered via Eventarc) for a lightweight, serverless, API-call sequence with no data processing, rather than adding it to the Composer environment, and gives the reason (cost, no always-on environment, simpler for that team).",
              "Use Workflows triggered by Eventarc on the object-finalized event: it calls the Cloud Run validation service, branches on the result and publishes to Pub/Sub, all serverless and paid per execution. Composer is an always-on Airflow environment suited to scheduled, dependency-heavy data pipelines; a two-step API orchestration does not justify adding that team to it."
            ),
          ],
        },
      ],
    },

    // ---------------- Section 3: Store (2) ----------------
    {
      slug: "choose-managed-storage-service",
      objective: "Choosing a managed storage service: BigQuery, BigLake, AlloyDB, Bigtable, Spanner, Cloud SQL, Cloud Storage, Firestore, Memorystore",
      kind: "build",
      title: "Choose a storage service for five data needs",
      brief:
        "Halverson Mobility, a scooter-sharing company, needs homes for five kinds of data. (1) Ten years of ride history, 30 TB, queried with ad-hoc SQL aggregations by analysts and never updated row by row. (2) Raw GPS traces as Parquet files, 2 PB, kept for compliance, queried a few times a year with SQL without loading them into a warehouse. (3) Live scooter telemetry: 50,000 writes a second, reads of the latest position by scooter ID and recent history by time. (4) The rider app's user profiles and ride receipts, read and written by the mobile app with a flexible document schema and offline sync. (5) The payments ledger: strongly consistent transactions for riders across Europe and Asia with 99.999% availability. Name a service for each and the reason.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Choose a Google Cloud storage service for each need and give the deciding reason.",
          parts: [
            part("Ride history analytics", "Chooses BigQuery for large-scale ad-hoc SQL analytics on append-only data.", "BigQuery: a serverless warehouse for ad-hoc SQL over 30 TB, partition by ride date and cluster by city; data is appended, not updated, which suits it."),
            part("GPS traces in place", "Chooses Cloud Storage (Archive or Coldline class for rarely read compliance data) with BigLake external tables so SQL runs on the Parquet in place.", "Cloud Storage in Coldline or Archive class (read a few times a year; 90- and 365-day minimum storage durations are fine for retention data), with a BigLake table over the Parquet so analysts query it from BigQuery without loading 2 PB."),
            part("Scooter telemetry", "Chooses Bigtable for very high write throughput with key and time-range reads, with a row key of scooter_id plus timestamp.", "Bigtable: built for 50,000+ writes a second and low-latency reads by key; row key scooter_id#timestamp gives the latest position and recent history as a short range scan."),
            part("Rider app documents", "Chooses Firestore for a document model with mobile SDKs and offline synchronization.", "Firestore: flexible JSON-like documents, mobile client SDKs with offline persistence and sync, and per-document security rules for the rider app."),
            part("Payments ledger", "Chooses Spanner in a multi-region configuration for strongly consistent, globally available transactions with the 99.999% SLA.", "Spanner, multi-region configuration spanning Europe and Asia: relational schema, strongly consistent transactions everywhere and a 99.999% availability SLA for multi-region instances."),
          ],
        },
      ],
    },
    {
      slug: "bigquery-table-cost-performance",
      objective: "Planning for storage cost and performance",
      kind: "build",
      title: "Design a BigQuery event table for cost and speed",
      brief:
        "Nordlicht Media's web-events table in BigQuery is 80 TB and grows 300 GB a day. Nearly every query filters on event_date (usually the last 7 days) and most also filter on site_id and then group by page. The on-demand bill is rising because dashboard queries read the whole table. Legal requires keeping only 400 days of events. The table is currently unpartitioned and unclustered, loaded by streaming inserts into a single table. Redesign the table and the loading approach.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the table design and explain each choice's effect on cost and performance.",
          parts: [
            part(
              "Partitioning",
              "Partitions the table by event_date (daily) so queries on the last 7 days scan only those partitions, and sets require_partition_filter so no query can accidentally scan 80 TB.",
              "Partition by DATE(event_date) daily. A last-7-days dashboard then scans about 2 TB instead of 80 TB, which on on-demand pricing is what you pay for. Set require_partition_filter = true so a query without an event_date filter is rejected rather than billed for the whole table."
            ),
            part(
              "Clustering",
              "Clusters by site_id then page (the common filter and group columns, most selective first, up to four columns) to cut the bytes read within each partition.",
              "Cluster by site_id, page: within each daily partition BigQuery sorts and co-locates data by these columns, so a filter on site_id reads a fraction of the partition. Order matters: the column used in filters most often comes first."
            ),
            part(
              "Retention",
              "Sets a partition expiration of 400 days so old partitions are deleted automatically, meeting the legal limit and stopping storage growth; notes partitions untouched for 90 days move to the cheaper long-term storage price anyway.",
              "Set partition_expiration_days = 400: each daily partition is dropped when it ages out, which is the legal requirement and caps storage at about 400 days of data. Partitions not modified for 90 consecutive days are billed at the long-term storage rate automatically, so history gets cheaper without any action."
            ),
            part(
              "Loading and query cost model",
              "Replaces legacy streaming inserts with the Storage Write API or batch loads (batch loading is free of ingestion charges) and considers moving heavy, steady dashboard usage to a BigQuery edition reservation with autoscaling instead of per-TiB on-demand billing.",
              "Load with the Storage Write API (or batch load jobs from Cloud Storage, which carry no ingestion charge) rather than legacy streaming inserts. For the dashboards, compare on-demand per-TiB pricing with an Enterprise edition reservation using autoscaled slots: steady, heavy query load is usually cheaper on slots, and reservations also cap the spend."
            ),
          ],
        },
      ],
    },

    // ---------------- Section 4: Prepare and use (2) ----------------
    {
      slug: "secure-analyst-access-masking-rls",
      objective: "Applying security, data masking, IAM, and Cloud DLP to data prepared for analysis",
      kind: "build",
      title: "Give three analyst groups the right view of one table",
      brief:
        "Ardmore Telecom has a BigQuery table 'customers' with columns customer_id, full_name, email, phone, region, plan, monthly_spend, and support_notes (free text that sometimes contains card numbers customers typed into chat). Three groups need it: regional analysts may see only rows for their own region and must not see names, email or phone; the finance team sees every row but the email must show only its domain; the fraud team sees everything. Nobody should see card numbers inside support_notes. Design the controls without making copies of the table.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the access design: row filtering, column controls, masking, and the free-text problem.",
          parts: [
            part(
              "Row-level security",
              "Creates row-level access policies on the table that filter by region for each regional analyst group (for example SESSION_USER or group membership mapped to region), with no policy needed for fraud/finance groups that see all rows (or a TRUE filter for them).",
              "CREATE ROW ACCESS POLICY per region, GRANT TO the regional group, FILTER USING (region = 'north'), and an all-rows policy for the finance and fraud groups. Analysts query the same table and BigQuery returns only their region's rows; there are no per-region copies to keep in sync."
            ),
            part(
              "Column-level security",
              "Applies policy tags (Knowledge Catalog / Data Catalog taxonomy) to full_name, email and phone so only principals with the Fine-Grained Reader role on the tag can read them, and grants that role to the fraud team.",
              "Create a taxonomy with a 'customer_pii' policy tag, attach it to full_name, email and phone, and grant Data Catalog Fine-Grained Reader on the tag to the fraud group. Regional analysts have no access to those columns: a SELECT * fails or they select the other columns."
            ),
            part(
              "Masking for finance",
              "Attaches a data-masking rule to the email column (the email mask replaces the username with XXXXX and keeps the domain) and grants finance the Masked Reader role so they see the masked value rather than an error; fraud keeps the unmasked view.",
              "Add a data policy with the email masking rule to the policy tag on email and grant the finance group BigQuery Masked Reader on it: finance sees XXXXX@example.com (the username replaced, the domain kept), fraud (Fine-Grained Reader) sees the full address, regional analysts see neither."
            ),
            part(
              "Card numbers in free text",
              "Uses Sensitive Data Protection (Cloud DLP) to inspect and redact or tokenize card numbers in support_notes, either at load time in the pipeline or as a stored de-identified column, and profiles the table to find other sensitive text.",
              "Run support_notes through Sensitive Data Protection with the CREDIT_CARD_NUMBER infoType in the load pipeline, redacting matches (or replacing them with a surrogate) before the row lands, and store only the cleaned text. Turn on sensitive data discovery profiles for the dataset to catch other columns that collect PII over time."
            ),
          ],
        },
      ],
    },
    {
      slug: "troubleshoot-slow-dashboard-query",
      objective: "Troubleshooting a poorly performing query",
      kind: "case",
      title: "Speed up a dashboard query that times out",
      brief:
        "Ferncastle Bank's executive dashboard runs a BigQuery query every time a user opens it. The query joins a 20 TB transactions table (partitioned by transaction_date, clustered by account_id) to a 5 GB accounts table and a 2 MB branches table, and shows totals by branch for the current month. Users complain it takes over a minute and the monthly bill has jumped. You are asked to fix it.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "You open the query: SELECT * FROM transactions t JOIN accounts a ON t.account_id = a.account_id JOIN branches b ON a.branch_id = b.branch_id WHERE EXTRACT(MONTH FROM t.transaction_date) = EXTRACT(MONTH FROM CURRENT_DATE()) ... and the job statistics show 20 TB processed.",
          ask: "What is making this query read the whole table, and how do you rewrite it?",
          parts: [
            part(
              "Diagnosis",
              "Identifies that wrapping the partition column in a function (EXTRACT(MONTH ...)) prevents partition pruning, and SELECT * reads every column of a columnar store; so all 20 TB are scanned.",
              "EXTRACT(MONTH FROM t.transaction_date) hides the partition column inside a function, so BigQuery cannot prune partitions and scans all of them; and SELECT * reads every column, when the dashboard needs a few. Both drive the 20 TB."
            ),
            part(
              "Rewrite",
              "Filters directly on the partition column with a range (transaction_date >= DATE_TRUNC(CURRENT_DATE(), MONTH) AND transaction_date < next month) and selects only the needed columns, aggregating before or during the join where possible.",
              "WHERE t.transaction_date >= DATE_TRUNC(CURRENT_DATE(), MONTH) AND t.transaction_date < DATE_ADD(DATE_TRUNC(CURRENT_DATE(), MONTH), INTERVAL 1 MONTH), and SELECT only branch_id, amount and the join keys. Aggregate transactions by account_id first, then join the much smaller result to accounts and branches. Bytes processed should fall to the current month's partitions and columns."
            ),
          ],
        },
        {
          text: "After the rewrite the query processes 400 GB and takes 12 seconds. The dashboard is opened about 2,000 times a day and the result changes only when the hourly load finishes.",
          ask: "How do you make it fast and cheap for 2,000 opens a day?",
          parts: [
            part(
              "Precompute",
              "Creates a materialized view (or a scheduled summary table) over the aggregation so the dashboard reads a small precomputed result that BigQuery keeps refreshed incrementally, and optionally enables BI Engine for in-memory acceleration.",
              "Create a materialized view that aggregates the current month's transactions by branch; BigQuery maintains it incrementally as the hourly load appends, and the dashboard query is rewritten to use it automatically, reading megabytes instead of 400 GB. Add a BI Engine reservation for the dashboard project so repeated reads are served from memory in well under a second."
            ),
            part(
              "Caching behavior",
              "Notes BigQuery's query result cache serves identical queries for free until the underlying table changes, so removing non-deterministic parts (or keeping the query text identical) lets most of the 2,000 opens hit cache between hourly loads.",
              "Between hourly loads the result cache returns identical queries at no charge, as long as the query text is the same and the tables have not changed. Keep CURRENT_DATE() out of the dashboard query (pass the month as a fixed parameter the dashboard computes) so the text stays identical and most opens are cache hits."
            ),
          ],
        },
        {
          text: "A week later the ops team reports one branch-level query still runs for minutes. The execution graph shows a single stage taking most of the time, with one worker processing far more rows than the others, on a join where thousands of transactions have a NULL account_id.",
          ask: "What is the problem and how do you fix it?",
          parts: [
            part(
              "Skew",
              "Recognizes data skew from a hot key (NULL account_id) in the join, and fixes it by filtering or separating the NULL/hot keys (COALESCE to a spread value, handle NULLs in a separate branch) or pre-aggregating before the join.",
              "A hot join key: thousands of rows with account_id NULL all land on one worker, so that stage waits for it. Filter the NULLs out before the join (they match nothing anyway) or handle them in a separate UNION branch, and pre-aggregate transactions by account_id before joining so each key carries one row."
            ),
          ],
        },
      ],
    },

    // ---------------- Section 5: Maintain and automate (2) ----------------
    {
      slug: "bigquery-editions-and-reservations",
      objective: "Managing capacity: BigQuery Editions and reservations",
      kind: "build",
      title: "Size BigQuery capacity for three workloads",
      brief:
        "Stillwater Analytics runs everything in BigQuery on on-demand pricing and last month's bill was unpredictable. Three workloads share one project: (1) a nightly ELT batch that must finish between 01:00 and 05:00 and uses heavy compute for those hours; (2) interactive analysts whose queries spike mid-morning and are idle at night; (3) a customer-facing dashboard that must never be starved of capacity by the other two. Finance wants a predictable monthly cost and a cap on spend, while keeping the batch inside its window. Design the capacity plan with BigQuery editions and reservations.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the reservation design: editions, baseline and autoscaling slots, assignments, and how it meets each requirement.",
          parts: [
            part(
              "Pricing model",
              "Moves the steady, heavy workloads from on-demand (per TiB scanned) to capacity-based pricing with an edition reservation so cost tracks slot-hours rather than bytes, and picks Enterprise (or Enterprise Plus) because baseline slots, commitments and BI Engine need it; Standard edition is autoscaling-only with no baseline or commitments.",
              "Switch from on-demand per-TiB billing to editions capacity pricing: a reservation bills for slot-hours used (baseline plus autoscaled), so the monthly cost is bounded by the slot limits you set, not by how many bytes each query touches. Choose Enterprise edition: Standard edition offers autoscaling only (no baseline slots, no capacity commitments, 1,600-slot maximum reservation), while Enterprise adds baseline slots, 1- and 3-year commitments, folder-level assignments and BI Engine, which the dashboard guarantee and the cost cap rely on."
            ),
            part(
              "Reservations and assignments",
              "Creates separate reservations (for example batch, analysts, dashboard) and assigns workloads to them by project or folder; or at least isolates the dashboard in its own reservation so it has guaranteed baseline slots.",
              "Create three reservations in the admin project: etl-batch, analysts and dashboard. Put the dashboard's service account's project (or a dedicated project) into the dashboard reservation with a baseline of guaranteed slots so the other two can never starve it. Assign the ELT project to etl-batch and the analysts' project to analysts."
            ),
            part(
              "Baseline versus autoscaling",
              "Gives the dashboard a baseline (always-on) slot count, gives the batch a low baseline with a high autoscale maximum sized so the job finishes in the 01:00-05:00 window, and gives analysts a small baseline with autoscaling for the mid-morning spike; explains baseline is paid continuously and autoscaled slots only while in use.",
              "dashboard: baseline 100 slots, max 100 (steady, guaranteed). etl-batch: baseline 0, autoscale max 800 so the nightly run gets enough slots to finish in the window and costs nothing by day. analysts: baseline 50, autoscale max 300 for the morning spike. Baseline slots bill around the clock; autoscaled slots bill only while allocated, which is why the bursty workloads get little or no baseline."
            ),
            part(
              "Cost cap and proof",
              "Notes that the maximum slot settings cap spend, that slot commitments (1- or 3-year) can lower the price of the steady baseline, and that the Slot Estimator / INFORMATION_SCHEMA jobs data is used to right-size and to confirm the batch meets its window.",
              "The sum of the maximum slot settings is the hard spend ceiling finance asked for. Buy a 1-year commitment (20% discount; 3-year is 40%) for the 150 slots that are always on (dashboard plus analysts' baseline) to cut their price. Use the slot estimator and INFORMATION_SCHEMA.JOBS_TIMELINE to check the batch's slot usage and finish time each week and adjust the maximum before it threatens the 05:00 deadline."
            ),
          ],
        },
      ],
    },
    {
      slug: "dataproc-persistent-or-ephemeral",
      objective: "Choosing between persistent and job-based clusters in Dataproc",
      kind: "build",
      title: "Decide the Dataproc cluster model for three Spark workloads",
      brief:
        "Greyhaven Shipping has three Spark workloads to run on Dataproc (Managed Service for Apache Spark). (1) A nightly batch of 40 PySpark jobs, each 10-60 minutes, reading and writing Parquet in Cloud Storage; today they run on one cluster that stays up 24 hours a day and sits idle 20 of them. (2) A data-science team that runs interactive Spark notebooks all day, with wildly varying load. (3) A new team with a single Spark job per hour that wants no cluster tuning at all. For each, choose persistent, ephemeral (job-based) or serverless, and explain cost and operational effects.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Choose a cluster model for each workload, with the configuration that makes it work and the reason.",
          parts: [
            part(
              "Nightly batch",
              "Moves to ephemeral, job-scoped clusters created by the orchestrator per job or per batch and deleted when done (or Dataproc workflow templates), with data in Cloud Storage not HDFS so nothing is lost when the cluster goes; names the saving of the 20 idle hours.",
              "Ephemeral clusters: the orchestrator (Composer or a workflow template) creates a cluster sized for the job, runs it, and deletes it, so the company stops paying for 20 idle hours a day. Keep the data in Cloud Storage (the connector makes it a drop-in for HDFS) and use an external metastore, so deleting a cluster loses nothing. Use preemptible/Spot secondary workers for the fault-tolerant batch stages to cut cost further."
            ),
            part(
              "Interactive notebooks",
              "Keeps a persistent cluster for the data scientists but with autoscaling (secondary workers scale with YARN pending memory) and scheduled deletion / idle TTL overnight, or Serverless interactive sessions, so cost follows use.",
              "A long-running (persistent) cluster suits all-day interactive use, but configure an autoscaling policy so secondary workers grow with notebook load and shrink when idle, and set an idle-delete TTL or a scheduled stop overnight. Alternatively give each scientist a Serverless Spark interactive session, which removes the cluster entirely."
            ),
            part(
              "Hourly job with no tuning",
              "Chooses Serverless Spark (Managed Service for Apache Spark serverless batches): submit the job and Google provisions and autoscales the executors, so there is no cluster to size or maintain.",
              "Serverless Spark batches: submit the hourly job and the service provisions compute, autoscales it and tears it down; the team never sizes a cluster. It costs per use and fits a team that does not want to learn cluster tuning."
            ),
          ],
        },
      ],
    },
  ],
};
