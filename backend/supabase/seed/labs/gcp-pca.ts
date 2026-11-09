import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-157: Google Cloud Professional Cloud Architect.
//
// Aligned to the Professional Cloud Architect exam guide (PDF, read
// 2026-11-07): six sections at 25/17.5/17.5/15/12.5/12.5. The exam leans on
// case studies (fictitious businesses with an overview, existing environment,
// business and technical requirements and an executive statement), so the
// first lab of each unit is written in that shape around one fictional
// company, Harborline Logistics, and the rest stand alone. Architect-level:
// trade-offs, pillars, controls and processes, not console steps.
// Density (docs/labs.md, policy "hybrid"): 2 per unit.
//
// Figures used, verified 2026-11-07 against cloud.google.com docs:
//   - Cloud SQL SLA: Enterprise Plus with HA 99.99%, Enterprise with HA
//     99.95%, zonal instances not covered (cloud.google.com/sql/sla;
//     docs.cloud.google.com/sql/docs/mysql/editions-intro).
//   - Spanner: regional 99.99%; multi-region up to 99.999% (Enterprise Plus
//     edition) (docs.cloud.google.com/spanner/docs/editions-overview).
//   - Cloud Storage classes: Nearline 30 / Coldline 90 / Archive 365 day
//     minimums, retrieval fees; lifecycle SetStorageClass only toward colder
//     classes and no early-deletion fee on lifecycle transitions
//     (docs.cloud.google.com/storage/docs/storage-classes, .../lifecycle,
//     cloud.google.com/storage/pricing).
//   - Cloud Logging: _Required bucket 400 days (not configurable), _Default
//     30 days, user buckets 1-3650 days (docs.cloud.google.com/logging/quotas).
//   - Error-budget burn-rate alerting: 14.4x/1h and 6x/6h page, 1x/3d
//     ticket for a 30-day SLO; 99.9% over 30 days is 43.2 minutes
//     (sre.google/workbook/alerting-on-slos; docs.cloud.google.com/stackdriver/
//     docs/solutions/slo-monitoring/alerting-on-budget-burn-rate).
//   - Committed use discounts: resource-based up to 55% (up to 70% for
//     memory-optimised); compute flexible CUDs 28% (1-year) / 46% (3-year)
//     on E2 (docs.cloud.google.com/compute/docs/instances/committed-use-discounts-overview).
//   - Spot VMs: up to 91% off, preemptible at any time, no SLA
//     (docs.cloud.google.com/compute/docs/instances/spot).

const HARBORLINE =
  "Case study: Harborline Logistics (fictional). Company overview: a European freight forwarder with 2,400 staff, 11 warehouses and a customer portal used by 9,000 shipping customers. Existing environment: two leased data centres (Rotterdam, Hamburg) running a Java shipment-tracking monolith on 60 VMs against an Oracle database, a nightly batch that reprices 4 million shipments, and a warehouse scanner system that must keep working if the WAN link fails. Business requirements: exit the Hamburg data centre within 18 months; give customers live shipment tracking with sub-second page loads across Europe; add a predictive-ETA feature; cut infrastructure spend 25%; keep all customer data in the EU. Technical requirements: the tracking API must survive the loss of a region with no more than 5 minutes of data loss; the Oracle licence will not be renewed; warehouse scanners need local operation during WAN outages; all changes to production go through a reviewed pipeline. Executive statement (CEO): \"Our customers now compare us with digital-native forwarders. I want tracking that feels instant, an ETA we can stand behind, and a cost base that lets us invest in it.\"";

export const GCPPCA_LABS: SeedLabSet = {
  trackCode: "GCPPCA",
  sources: [
    source("https://services.google.com/fh/files/misc/professional_cloud_architect_exam_guide_english.pdf", "exam_outline", "2026-11-07"),
    source("https://cloud.google.com/learn/certification/cloud-architect", "exam_outline", "2026-11-07"),
    source("https://cloud.google.com/sql/sla", "cloud_pricing_limits", "2026-11-07"),
    source("https://docs.cloud.google.com/sql/docs/mysql/editions-intro", "cloud_pricing_limits", "2026-11-07"),
    source("https://docs.cloud.google.com/spanner/docs/editions-overview", "reference", "2026-11-07"),
    source("https://docs.cloud.google.com/storage/docs/storage-classes", "reference", "2026-11-07"),
    source("https://docs.cloud.google.com/storage/docs/lifecycle", "reference", "2026-11-07"),
    source("https://cloud.google.com/storage/pricing", "cloud_pricing_limits", "2026-11-07"),
    source("https://docs.cloud.google.com/logging/quotas", "cloud_pricing_limits", "2026-11-07"),
    source("https://sre.google/workbook/alerting-on-slos/", "reference", "2026-11-07"),
    source("https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/alerting-on-budget-burn-rate", "reference", "2026-11-07"),
    source("https://docs.cloud.google.com/compute/docs/instances/committed-use-discounts-overview", "reference", "2026-11-07"),
    source("https://docs.cloud.google.com/compute/docs/instances/spot", "reference", "2026-11-07"),
    source("https://docs.cloud.google.com/architecture/infra-reliability-guide/building-blocks", "reference", "2026-11-07"),
  ],
  labs: [
    // ----------------------------------------------------------------------
    // Designing and Planning a Cloud Solution Architecture (25%)
    // ----------------------------------------------------------------------
    {
      slug: "harborline-target-architecture",
      objective: "Matching a cloud architecture to a business use case and product strategy",
      kind: "build",
      title: "Propose a target architecture for the Harborline case study",
      brief: `${HARBORLINE} You are the architect. Produce the target architecture: how the tracking workload runs, what replaces Oracle, how the nightly batch and the ETA feature are served, and how the warehouses keep working offline. Every choice must trace back to a stated requirement.`,
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the architecture, one decision per part, each tied to the requirement it serves and the trade-off it accepts.",
          parts: [
            part(
              "Tracking application and its front door",
              "Runs the tracking service in at least two EU regions (containers on GKE or Cloud Run) behind a global external Application Load Balancer with Cloud CDN for static content, so European users get low latency and a regional failure is survived; ties this to 'sub-second across Europe' and 'survive loss of a region'; notes the monolith may be rehosted first then decomposed.",
              "Run the tracking service in two EU regions (for example europe-west4 and europe-west1) as containers on GKE (or Cloud Run if it is made stateless), behind one global external Application Load Balancer with Cloud CDN for static assets. The global anycast front door gives Europe-wide low latency and fails over between regions, meeting 'instant tracking' and 'survive a region'. Trade-off: two regions roughly double the serving footprint; start by rehosting the monolith into containers and split it later."
            ),
            part(
              "Replacing Oracle",
              "Chooses a managed database that meets the 5-minute RPO across regions and the EU-only rule: Spanner in an EU multi-region or dual-region configuration (strongly consistent, up to 99.999% SLA) or Cloud SQL / AlloyDB for PostgreSQL with a cross-region replica (cheaper, more migration work for schema compatibility, async replication); names the trade-off and ties it to 'Oracle not renewed' and 'RPO 5 minutes'.",
              "Replace Oracle with a managed relational service. Spanner in an EU dual-region or multi-region configuration gives synchronous replication across regions (RPO effectively zero, up to 99.999% availability on Enterprise Plus) and removes the licence, at the cost of schema and SQL changes and a higher price. The cheaper path is AlloyDB or Cloud SQL for PostgreSQL with a cross-region read replica, whose asynchronous replication must be measured against the 5-minute RPO. Both keep data in EU locations. The choice is a cost-versus-consistency trade-off the business must sign off."
            ),
            part(
              "Nightly repricing batch and predictive ETA",
              "Moves the batch to Dataflow (or a batch job on GKE/Cloud Run jobs) reading from BigQuery, with BigQuery as the analytical store for shipment history, and builds the ETA model on that history with Vertex AI / BigQuery ML served as a prediction endpoint called by the tracking service; ties to 'predictive ETA' and 'cost base'.",
              "Land shipment history in BigQuery and run the 4-million-shipment repricing as a Dataflow batch (or a Cloud Run job) that scales for the hour it runs and costs nothing otherwise. Train the ETA model on that history (BigQuery ML or a custom model on Vertex AI) and expose it as a prediction endpoint the tracking service calls. This serves the ETA requirement and turns the nightly fixed cost into pay-per-run."
            ),
            part(
              "Warehouse scanners during WAN outages",
              "Keeps a local component at each warehouse (for example an edge/GKE-on-site node or local service with a store-and-forward queue) that buffers scans and syncs to Pub/Sub when the link returns, rather than making scanners depend on the cloud; ties to 'local operation during WAN outages'.",
              "Each warehouse runs a small local service (for example on a local Kubernetes node managed with GKE Enterprise, or a lightweight gateway) that accepts scans and queues them store-and-forward; when the WAN is up it publishes to Pub/Sub and the cloud reconciles. Scanners never depend on the link being up, which is the stated requirement."
            ),
            part(
              "Cost and the 18-month exit",
              "Sequences the exit (rehost Hamburg workloads first, Oracle replacement in parallel, decompose later), and names the levers for the 25% target: pay-per-use batch, right-sized containers, committed use discounts for the steady tier, Spot for restartable work, and retiring the Hamburg lease.",
              "Phase it: rehost Hamburg's VMs to Compute Engine first to make the 18-month exit, run the Oracle replacement in parallel, and decompose the monolith after. The 25% comes from retiring the lease, pay-per-run batch, right-sized containers, committed use discounts on the always-on tier and Spot VMs for the restartable batch, measured monthly against the current data-centre cost."
            ),
          ],
        },
      ],
    },
    {
      slug: "business-continuity-from-rto-rpo",
      objective: "Building a business continuity plan into the architecture",
      kind: "case",
      title: "Build business continuity into an architecture from its RTO and RPO",
      brief: `${HARBORLINE} The board has now set formal targets for the tracking platform: recovery time objective 30 minutes and recovery point objective 5 minutes for the loss of an entire region. The platform will use Cloud SQL for PostgreSQL unless you argue otherwise.`,
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The first draft from the team is a single Cloud SQL Enterprise instance in one zone with nightly backups to Cloud Storage, and the tracking service in one region.",
          ask: "Measure the draft against the targets and say what fails.",
          parts: [
            part(
              "Against RPO and RTO",
              "States that nightly backups give an RPO of up to 24 hours (fails 5 minutes), that a single zonal instance has no SLA and a zone or region loss means a restore measured in hours (fails 30 minutes), and that one region for the service fails the region-loss requirement outright.",
              "Nightly backups mean up to a day of lost data, far from a 5-minute RPO. A single-zone Cloud SQL instance is not covered by the SLA and recovering it in another region means restoring from backup, which takes well over 30 minutes. One serving region fails the requirement before we even get to the database."
            ),
          ],
        },
        {
          text: "The team revises: Cloud SQL Enterprise Plus with high availability (primary and standby in two zones) in europe-west4, and the tracking service in two regions behind a global load balancer.",
          ask: "What does HA buy, what does it not, and what must change to meet the region-loss targets?",
          parts: [
            part(
              "What HA buys and does not",
              "Explains regional HA protects against a zone failure with automatic failover and a 99.99% SLA on Enterprise Plus, but both zones are in one region, so a regional outage still loses the database; the service being in two regions does not help if its only database is gone.",
              "HA gives automatic failover to a standby zone with the same IP and no data loss, and Enterprise Plus with HA carries a 99.99% uptime SLA. But primary and standby are both in europe-west4; if the region is lost, so is the database, and the second serving region has nothing to talk to."
            ),
            part(
              "The change",
              "Adds a cross-region read replica in the second region (asynchronous, so replication lag must be monitored against the 5-minute RPO) with a documented, rehearsed promotion procedure, plus point-in-time recovery and backups stored in a multi-region EU location; or argues for Spanner (dual/multi-region, synchronous) if the RPO must be guaranteed rather than usually met.",
              "Add a cross-region read replica in the second region and keep automated backups with point-in-time recovery in an EU multi-region bucket. Replication is asynchronous, so alert on replica lag approaching 5 minutes and rehearse promoting the replica. If the 5-minute RPO must be guaranteed rather than typical, the alternative is Spanner in an EU dual-region or multi-region configuration, where replication is synchronous."
            ),
          ],
        },
        {
          text: "Six months after go-live, a real regional incident occurs. The replica is promoted in 12 minutes, but the tracking service in the surviving region keeps failing for another 40 minutes because its configuration still points at the old primary's address, and the on-call engineer cannot find the runbook.",
          ask: "What does this incident teach about the continuity plan, and what do you change?",
          parts: [
            part(
              "Lessons",
              "Identifies that the plan covered data but not the application's dependency on the database endpoint (connection configuration should resolve via a name or connector that the failover updates, not a fixed address) and that an untested, unfindable runbook is not a plan; proposes regular failover drills that measure actual RTO and RPO, automated reconfiguration, and the runbook stored where on-call can reach it.",
              "Data was recoverable but the service was not: configuration hard-wired the old primary, so the 12-minute promotion became a 52-minute outage, missing the 30-minute RTO. Make the application resolve the database through a name or the Cloud SQL connector updated as part of promotion, automate that step in the failover procedure, keep the runbook in the on-call tooling, and run a scheduled regional failover drill that records the measured RTO and RPO against the targets."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Managing and Provisioning a Cloud Solution Infrastructure (17.5%)
    // ----------------------------------------------------------------------
    {
      slug: "vpc-topology-and-load-balancing",
      objective: "Designing VPC topology and load balancing for cloud, internet, and cloud-adjacent access",
      kind: "build",
      title: "Design the VPC topology and load balancers for the Harborline platform",
      brief: `${HARBORLINE} Design the network: how projects share networking, how the public tracking portal, the internal services and the warehouse-facing services are exposed, how the two EU regions connect, and how managed services are reached without public IP addresses.`,
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Lay out the topology: network ownership, public entry, internal traffic, warehouse and on-premises access, and private access to managed services.",
          parts: [
            part(
              "Network ownership",
              "Uses a Shared VPC: a host project owned by the platform team with subnets per region and tier, and service projects per workload/environment that attach to it; explains it centralises firewall and routing while letting teams own their compute, and that a single global VPC already spans both regions.",
              "One Shared VPC host project owned by the platform team, with subnets in europe-west4 and europe-west1 for each tier (web, services, data). Tracking, batch and ETA live in their own service projects attached to the host. A VPC is global, so both regions sit in one network with central firewall and routing, while teams keep ownership of their own compute."
            ),
            part(
              "Public entry",
              "Puts the customer portal and tracking API behind a single global external Application Load Balancer with backends in both regions, Google-managed certificates, Cloud CDN for static content and Google Cloud Armor in front; explains anycast IP and cross-region failover.",
              "A global external Application Load Balancer with one anycast IP, Google-managed TLS certificates, backends in both regions, Cloud CDN for static assets and a Cloud Armor policy for WAF and DDoS. Users reach the nearest healthy region; if one region fails, traffic shifts to the other without a DNS change."
            ),
            part(
              "Internal service traffic",
              "Uses internal load balancing (regional internal Application Load Balancers or service-to-service via Private Service Connect / mesh) so services call each other on private addresses; firewall rules keyed on service accounts; no internal service has an external IP (organization policy).",
              "Services call each other through regional internal Application Load Balancers (or the mesh if GKE is used) on private addresses only, with firewall rules keyed to service accounts rather than IP ranges. An organization policy forbids external IPs on VMs, so nothing internal is reachable from the internet by accident."
            ),
            part(
              "Warehouses and the remaining data centre",
              "Connects the Rotterdam data centre and warehouses with Cloud Interconnect (Dedicated or Partner) with HA VPN as backup, Cloud Router with global dynamic routing so on-premises reaches both regions, and non-overlapping IP planning; warehouse scanners use the local gateway from the architecture.",
              "Cloud Interconnect from Rotterdam (Partner if no colocation presence, Dedicated for high bandwidth) with HA VPN as a backup path, Cloud Routers using global dynamic routing so on-premises routes reach subnets in both regions. Warehouses connect over the Rotterdam link or SD-WAN/VPN, and their local gateways buffer scans when the link is down. IP ranges are planned so nothing overlaps."
            ),
            part(
              "Private access to managed services",
              "Reaches Cloud SQL / AlloyDB and other producer services privately through Private Service Connect (or private services access) and Google APIs through Private Google Access, so no traffic to managed services traverses public IPs.",
              "Cloud SQL or AlloyDB is reached over Private Service Connect endpoints (or private services access) inside the Shared VPC, and Google APIs such as Cloud Storage and Pub/Sub over Private Google Access, so none of the platform's traffic to managed services uses a public IP."
            ),
          ],
        },
      ],
    },
    {
      slug: "retention-and-lifecycle-policy",
      objective: "Setting data retention and lifecycle management policy",
      kind: "build",
      title: "Write a retention and lifecycle policy for shipment documents",
      brief:
        "Harborline Logistics (fictional) stores proof-of-delivery scans and customs documents in Cloud Storage. Rules from legal and operations: documents are read often for 30 days (disputes), occasionally for the rest of the first year, and almost never after that, but must be kept for 7 years and must be impossible to delete or alter before then, even by an administrator; the bucket must also be protected against accidental overwrites of the current version. Cloud Storage minimum storage durations are 30 days (Nearline), 90 days (Coldline) and 365 days (Archive), lifecycle transitions move objects only to colder classes and incur no early-deletion fee, and the colder classes charge retrieval fees.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the lifecycle rules, the retention control, the versioning plan, and the cost reasoning.",
          parts: [
            part(
              "Lifecycle transitions and deletion",
              "Sets SetStorageClass to Nearline at age 30 days, Coldline at 90 (or 365) and Archive at 365 days, and a Delete action at about 7 years (2,555 days), using age conditions; notes transitions go only toward colder classes.",
              "Rules: age 30 -> SetStorageClass NEARLINE; age 365 -> SetStorageClass ARCHIVE (optionally COLDLINE at 90 in between); age 2555 (7 years) -> Delete. Each step moves to a colder class, which is the only direction lifecycle allows, and the Delete removes documents only once the retention period has passed."
            ),
            part(
              "Making deletion impossible before 7 years",
              "Sets a bucket retention policy of 7 years and locks it (bucket lock), explaining that a locked policy cannot be removed or shortened by anyone, including administrators, and that objects cannot be deleted or overwritten until they age past the period; notes the lifecycle Delete rule is therefore effective only after 7 years.",
              "Apply a 7-year retention policy to the bucket and lock it. Once locked, nobody can remove the policy or shorten it, and no object can be deleted or replaced until it is older than 7 years; the only way to be rid of it is to delete the bucket once it is empty. The lifecycle Delete at 2,555 days then works exactly when the policy lets it."
            ),
            part(
              "Overwrite protection",
              "Enables object versioning so an overwrite keeps the previous version as a noncurrent object, with a lifecycle rule (isLive false / numNewerVersions or daysSinceNoncurrentTime) to tidy old versions, while acknowledging retention lock already blocks replacement within the period.",
              "Turn on object versioning so any overwrite keeps the earlier version as a noncurrent object, and add a rule that deletes noncurrent versions after, say, 90 days or when more than 3 newer versions exist. Inside the 7 years the retention policy already blocks replacement; versioning covers everything else and the period after."
            ),
            part(
              "Cost reasoning",
              "Explains the trade: colder classes cut storage cost but add retrieval fees and minimum durations, so Standard for the dispute window avoids retrieval charges on frequent reads, and Archive from year one onward is cheapest because reads are rare and data is kept anyway; lifecycle transitions themselves do not trigger early-deletion fees.",
              "Keep the first 30 days in Standard because disputes read often and colder classes would charge retrieval on every read. Nearline fits the occasional reads of the rest of year one. From year one, Archive's 365-day minimum is irrelevant (the data stays 7 years anyway) and its storage price is lowest; the rare retrieval fee is cheaper than paying Standard rates for six years. Lifecycle transitions add no early-deletion charge."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Designing for Security and Compliance (17.5%)
    // ----------------------------------------------------------------------
    {
      slug: "security-controls-for-regulated-data",
      objective:
        "Designing security controls: auditing, VPC Service Controls, context-aware access, organization policy, hierarchical firewall policy",
      kind: "build",
      title: "Design the security controls for a regulated health-data platform",
      brief:
        "Caldera Health Analytics is a fictional company processing hospital records for research in Google Cloud. Requirements from the compliance officer: data must never leave the EU or the company's own projects, even if someone with access copies it; administrators may reach the console only from managed devices on the corporate identity provider; every read of patient data by a person must be recorded and kept for the regulator's six-year review window; no project in the organisation may expose SSH or RDP to the internet; and all of this must apply automatically to new projects.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Name the control for each requirement, where it is applied in the hierarchy, and why that control rather than a nearby one.",
          parts: [
            part(
              "Data cannot leave the company's projects",
              "Uses VPC Service Controls: a service perimeter around the projects holding patient data covering BigQuery, Cloud Storage and related APIs, with ingress/egress rules for the few sanctioned flows, explaining it blocks exfiltration via the APIs even by an authorised identity, which IAM alone cannot do.",
              "A VPC Service Controls perimeter around the data projects, restricting BigQuery, Cloud Storage, Healthcare and related APIs, with explicit ingress and egress rules only for sanctioned flows. IAM says who may read; the perimeter stops a permitted identity from copying data to a bucket or project outside, which is the exfiltration case the officer described."
            ),
            part(
              "Data stays in the EU, and no SSH/RDP from the internet, everywhere",
              "Applies organization policies at the organization node (resource location restriction to EU locations; restrictions on external IPs) and a hierarchical firewall policy at the organization or top folder that denies ingress tcp:22 and tcp:3389 from 0.0.0.0/0 (with IAP's TCP-forwarding range allowed), explaining both are inherited by every current and future project.",
              "At the organization node: the resource-locations organization policy limited to EU locations, plus the external-IP restriction. Also at the organization (or the top folder): a hierarchical firewall policy with a high-priority deny for ingress tcp:22 and tcp:3389 from 0.0.0.0/0 and an allow for the IAP TCP-forwarding range. Both are inherited, so a project created tomorrow is covered without anyone remembering to configure it."
            ),
            part(
              "Admins only from managed devices",
              "Uses context-aware access (Access Context Manager access levels on device state and identity, applied through IAM conditions or Chrome Enterprise Premium / Identity-Aware Proxy) so console and API access requires a managed device and the corporate identity provider, and notes this is about context, not a VPN.",
              "Context-aware access: define an access level in Access Context Manager requiring a company-managed device and the corporate identity, and bind it to administrators' access (through IAM conditions and Identity-Aware Proxy / Chrome Enterprise Premium). Access depends on who and from what device, not on being inside a network."
            ),
            part(
              "Every human read of patient data is recorded for six years",
              "Enables Data Access audit logs (DATA_READ, DATA_WRITE) for the data services on the data projects, because Admin Activity logs do not record reads, and routes them with a sink to a dedicated log bucket (or Cloud Storage) with retention set to the required period, noting user-defined bucket retention can be set up to 3,650 days while the default _Default bucket keeps 30 days.",
              "Turn on Data Access audit logs (data read and write) for BigQuery, Cloud Storage and the Healthcare API on the data projects; Admin Activity logs are always on but do not record reads. Route them with an organization-level sink to a dedicated log bucket whose retention is set to cover the six-year window (user-defined buckets allow 1 to 3,650 days; the _Default bucket's 30 days is not enough), with the bucket locked so retention cannot be shortened."
            ),
          ],
        },
      ],
    },
    {
      slug: "key-management-and-secrets-design",
      objective: "Designing data security: key management, encryption, secret management",
      kind: "build",
      title: "Design key management and secret handling for a payments platform",
      brief:
        "Northgate Pay is a fictional payment processor moving onto Google Cloud. Its auditors require: customer data at rest encrypted with keys the company controls and can revoke; key rotation on a schedule; the people who administer keys must not be the people who can read the data; database passwords and API credentials must never appear in code, images or environment files checked into source control, and must be rotatable without redeploying; and the company must be able to show which service accessed which secret and when.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the encryption, key management, separation of duties and secret management, and say how each auditor point is evidenced.",
          parts: [
            part(
              "Encryption at rest with company-controlled keys",
              "Uses customer-managed encryption keys in Cloud KMS for Cloud Storage, Cloud SQL/AlloyDB, BigQuery and disks, explaining that Google-managed encryption is on by default but CMEK gives the company control, including disabling or destroying a key to make the data unreadable (crypto-shredding); mentions Cloud HSM or external key manager tiers if the auditor requires hardware or off-cloud control.",
              "Everything is encrypted at rest by default with Google-managed keys; to meet 'control and revoke', configure customer-managed encryption keys (CMEK) from Cloud KMS on the buckets, databases, BigQuery datasets and disks. Disabling or destroying a key makes the protected data unreadable, which is the revocation the auditors want. If they require hardware-backed or externally held keys, use Cloud HSM or Cloud External Key Manager."
            ),
            part(
              "Rotation",
              "Sets an automatic rotation period on each KMS key (new key versions on a schedule; old versions retained to decrypt existing data) and explains rotation re-encrypts going forward rather than rewriting everything.",
              "Set an automatic rotation period on each key ring's keys so Cloud KMS creates a new primary version on schedule. Older versions stay enabled to decrypt data they wrote; new writes use the new version. Rotation is a policy on the key, not a bulk re-encryption job."
            ),
            part(
              "Separation of duties",
              "Keeps keys in a separate security project administered by a key-admin group with Cloud KMS admin roles, while workload service accounts receive only the encrypter/decrypter role on specific keys and data-team humans get data roles but no KMS admin; no one holds both key administration and data access.",
              "Keys live in a dedicated security project. A key-administrator group holds Cloud KMS admin roles there and no data roles anywhere; workload service accounts get only the CryptoKey Encrypter/Decrypter role on the specific keys they need; analysts have data roles and no key roles. Nobody can both manage keys and read data."
            ),
            part(
              "Secrets",
              "Stores credentials in Secret Manager with versions, grants each workload's service account Secret Accessor on only its secrets, mounts or fetches them at runtime (for example Cloud Run --set-secrets or the client library) rather than baking them into images or repos, and rotates by adding a new version and having the app read the latest, optionally with rotation notifications to a Pub/Sub topic.",
              "Put database passwords and API credentials in Secret Manager. Each service's account gets the Secret Accessor role on its own secrets only. Services read them at start or on demand (Cloud Run's --set-secrets mounts a version as an environment variable or file), so nothing is in code, images or checked-in files. Rotate by adding a new secret version; configure rotation reminders to a Pub/Sub topic to drive the change."
            ),
            part(
              "Evidence",
              "Points to Cloud Audit Logs: Admin Activity logs for key and secret administration and Data Access logs (enabled for Secret Manager and Cloud KMS) recording which principal accessed which secret version or used which key, exported to a retained log bucket for the auditors.",
              "Cloud Audit Logs provide the evidence: Admin Activity logs record key and secret changes; with Data Access logging enabled for Secret Manager and Cloud KMS, every secret access and key use is recorded with the calling service account and time. Route those logs to a retained bucket the auditors can query."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Analyzing and Optimizing Technical and Business Processes (15%)
    // ----------------------------------------------------------------------
    {
      slug: "blameless-postmortem-case",
      objective: "Applying troubleshooting and root-cause-analysis best practices",
      kind: "case",
      title: "Lead the root-cause analysis after a checkout outage",
      brief:
        "Brightwater Grocers is a fictional online grocer. Last Thursday its checkout was down for 95 minutes during the evening peak. The engineering director wants a root-cause analysis and 'the person responsible'. You are asked to run the process.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The timeline so far: 18:02 a configuration change raised the checkout service's database connection pool from 50 to 500 per instance; 18:05 the database hit its connection limit and began refusing connections; 18:10 alerts fired on error rate; 18:20 the on-call engineer restarted the service, which reconnected and immediately exhausted connections again; 19:25 a second engineer found the change in the deployment history and reverted it; 19:37 checkout recovered.",
          ask: "How do you frame the investigation, and what is the root cause versus the trigger?",
          parts: [
            part(
              "Framing",
              "Runs a blameless postmortem: focus on systems and process, not the individual; the director's request for 'the person responsible' is redirected to 'what allowed a single change to cause this and why it took 95 minutes to find'.",
              "Blameless: the engineer who made the change acted in good faith inside a system that let one setting take checkout down. The questions are why that was possible and why recovery took 95 minutes, not who typed the number. Naming a person would make the next incident harder to learn from."
            ),
            part(
              "Trigger versus root cause",
              "Names the pool change as the trigger and identifies root causes behind it: no limit or review on configuration changes, no pre-production test of the change, alerts on symptoms without a link to recent changes, and a restart runbook that did not include 'what changed recently'.",
              "The trigger was the pool change from 50 to 500. The root causes are what let it through and hide it: configuration changes bypassed review and testing, the database had no guard against a client flooding it, the alert said 'errors' without pointing to the recent change, and the on-call's first move was a restart rather than checking what changed."
            ),
          ],
        },
        {
          text: "Digging further, you find the pool change was made because the previous week's incident report blamed 'too few connections' for slow checkouts, and the engineer was following that report's recommendation. Nobody had checked the database's maximum connections (300) before writing the recommendation.",
          ask: "What does this add to the analysis, and what are the action items?",
          parts: [
            part(
              "What it adds",
              "Recognises a contributing cause in the earlier postmortem: an unverified recommendation with no capacity check, and a systemic pattern (changes driven by assumption rather than measurement); adds 'ask why' until the process gap is reached.",
              "The earlier incident report recommended more connections without checking the database's 300-connection ceiling, so the fix for one incident caused the next. The deeper cause is a process that produces recommendations without measurement or review, which the five-whys exposes."
            ),
            part(
              "Action items",
              "Writes specific, owned, dated actions: configuration changes go through the reviewed pipeline with a staging soak; connection pooling or a limit enforced at the database (a pooler or max connections per instance) so clients cannot exhaust it; alerts link to recent deployments and a 'what changed' step opens the on-call runbook; postmortem recommendations include the evidence and a capacity check before adoption.",
              "1) Configuration changes go through the same reviewed pipeline as code, with a staging soak (owner: platform lead, two weeks). 2) Put a connection pooler or per-instance connection cap between the service and the database so no client can exhaust it (owner: database lead). 3) On-call runbook step one becomes 'list the last changes'; alerts include a link to the deployment history (owner: SRE). 4) Postmortem recommendations must state the evidence and a capacity check before being actioned (owner: engineering director). Each item has an owner and a date and is tracked to closure."
            ),
          ],
        },
      ],
    },
    {
      slug: "capex-opex-tco-decision",
      objective: "Optimizing cost and resources: CapEx versus OpEx",
      kind: "build",
      title: "Advise on a data-centre refresh versus a cloud move",
      brief:
        "Stillwater Mutual is a fictional insurer whose servers reach end of life next year. Option A: a hardware refresh costing 6 million (capital expenditure) for equipment expected to last five years, plus the existing data-centre lease and staff. Option B: move to Google Cloud, where the finance team estimates 1.5 million a year at today's usage, all operating expenditure. Workload facts: a steady core of 400 virtual machines runs 24/7 and is predictable; a claims-processing batch runs 4 hours a night and can be interrupted and resumed; development environments are used 50 hours a week; and usage drops by a third every year's second half. The CFO asks for a recommendation on total cost of ownership and on what the company must change to make option B's number real.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Compare the options on total cost of ownership, then name the specific levers that make the cloud estimate achievable and the governance that keeps it.",
          parts: [
            part(
              "CapEx versus OpEx on TCO",
              "Explains that option A's 6 million is capital spent up front for capacity sized to peak and depreciated over five years, plus lease, power, staff and refresh risk, while option B is pay-as-you-go operating cost that can track usage (including the second-half drop); notes the naive comparison (6M over 5 years = 1.2M/yr vs 1.5M/yr) ignores the lease, staff, power and the cost of idle peak capacity, so TCO must include them.",
              "Option A is 6 million up front for five years of fixed, peak-sized capacity, depreciated, plus the lease, power, cooling, hardware support and staff, and the risk of another refresh in year six. Option B turns that into operating cost that can follow demand, including the one-third drop each second half, which fixed hardware can never give back. Comparing 1.2 million a year of depreciation with 1.5 million of cloud ignores the lease, staff and power that stay with option A; a true TCO adds those and values the elasticity."
            ),
            part(
              "Levers for the steady core",
              "Applies committed use discounts to the predictable 24/7 core (resource-based CUDs up to 55% for most machine series, up to 70% for memory-optimised; or compute flexible CUDs where machine types may change), after right-sizing with recommender data, explaining the commitment trade-off.",
              "The 400 always-on VMs are what commitments are for: right-size them first using recommender data, then cover the baseline with committed use discounts, resource-based for a fixed machine family (Google quotes up to 55% off, up to 70% for memory-optimised machines) or compute flexible commitments if the machine mix will change. The trade-off is that the commitment is paid whether or not the capacity is used."
            ),
            part(
              "Levers for the batch and dev",
              "Runs the interruptible nightly batch on Spot VMs (up to 91% off, may be preempted, no SLA) and stops development environments outside their 50 hours (scheduled start/stop), noting both convert idle time into savings that hardware cannot.",
              "The claims batch tolerates interruption, so it runs on Spot VMs at up to 91% off on-demand, with checkpointing so a preemption costs minutes. Development environments are scheduled to run only their 50 hours a week (about 30% of the week) instead of 168. Neither saving exists with owned hardware."
            ),
            part(
              "Governance that keeps the number",
              "Puts in place budgets with threshold alerts per department, labels for cost allocation and billing export to BigQuery for showback/chargeback, quotas on sandbox projects, and a regular review of recommender findings; explains OpEx needs continuous management where CapEx was a one-time decision.",
              "OpEx is only cheaper if it is managed: budgets with alerts per department, a labelling standard with billing export to BigQuery for showback, quotas on non-production projects, and a monthly review of rightsizing and idle-resource recommendations. Hardware was one decision every five years; cloud cost is a continuous practice."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Managing Implementation (12.5%)
    // ----------------------------------------------------------------------
    {
      slug: "terraform-operating-model",
      objective: "Using Infrastructure as Code, including Terraform",
      kind: "build",
      title: "Advise a team on its Terraform operating model",
      brief:
        "Kingsmere Media is a fictional broadcaster whose platform team has started using Terraform for Google Cloud. Problems so far: two engineers applied changes from their laptops at the same time and corrupted the state file kept in a shared folder; production and staging are copies of one another with hand-edited differences; a secret was committed in a .tfvars file; and nobody can say what the last apply changed. The team asks you, as architect, what their operating model should be.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Advise on state, structure, the delivery pipeline and secrets, each with the reason.",
          parts: [
            part(
              "State",
              "Moves state to a remote backend in a Cloud Storage bucket with object versioning (the GCS backend provides state locking), one state per environment/component, with access limited to the pipeline's service account; explains why shared folders and laptops fail.",
              "Use the GCS backend: a versioned Cloud Storage bucket per organisation with a state prefix per environment and component. The backend locks state during an apply, so two concurrent applies cannot corrupt it, and versioning lets you recover a bad state. Only the pipeline's service account can write to the bucket."
            ),
            part(
              "Structure",
              "Uses reusable modules with per-environment root configurations (or workspaces) that differ only in variables, so staging and production are the same code with declared differences; recommends Google's blueprints / Cloud Foundation Toolkit modules where they fit.",
              "Write modules once and instantiate them from small per-environment root configurations whose .tfvars declare the differences (sizes, counts, domains). Staging and production then run identical code with visible, reviewed differences instead of hand edits. Start from Google's Cloud Foundation Toolkit blueprints for the landing zone."
            ),
            part(
              "Pipeline",
              "Runs terraform plan on pull requests and apply from the main branch via Cloud Build (or Infrastructure Manager) using a dedicated service account, with the plan output reviewed and stored, policy checks before apply, and no applies from laptops; this also answers 'what did the last apply change'.",
              "No applies from laptops. A Cloud Build trigger runs terraform plan on every pull request and posts the plan for review; merging to main runs apply with a dedicated deployer service account (via impersonation, no keys). Plans and logs are kept with the build, so 'what changed' is the stored plan. Add policy checks (for example on public buckets or external IPs) that fail the build before apply."
            ),
            part(
              "Secrets",
              "Removes secrets from .tfvars and state where possible: reads them from Secret Manager at apply time or has Terraform create the secret container with the value supplied out of band, treats state as sensitive (it can contain secrets) and restricts the bucket, and rotates the committed secret immediately.",
              "Rotate the committed secret now. Keep secrets out of .tfvars: fetch them at apply time from Secret Manager (data source) or let Terraform create the Secret Manager secret and add the value outside Terraform. Treat the state bucket as sensitive because state can hold secret values, and restrict who can read it."
            ),
          ],
        },
      ],
    },
    {
      slug: "test-strategy-for-launch",
      objective: "Choosing testing frameworks: load, unit, integration",
      kind: "build",
      title: "Define the test strategy before a public launch",
      brief:
        "Lumen Learning is a fictional education company launching a new enrolment service on Cloud Run with Cloud SQL and Pub/Sub, expected to take 2,000 sign-ups a minute on launch day with a target of 99% of requests under 500 milliseconds. Today the team has some unit tests that run on laptops, no integration tests, and has never load-tested. The release is in six weeks. Recommend what to test, with which kind of test, where it runs, and what decides go or no-go.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Lay out unit, integration and load testing for this service, and the go/no-go criteria.",
          parts: [
            part(
              "Unit tests",
              "Runs unit tests in the CI pipeline (Cloud Build) on every change, fast and isolated with external dependencies mocked, as the gate for merging; recommends the team's language framework rather than a Google-specific tool.",
              "Unit tests run in Cloud Build on every pull request, isolated from the network with Cloud SQL and Pub/Sub mocked, in the language's own framework. They must pass to merge. They are the cheapest and fastest signal, so they run most often."
            ),
            part(
              "Integration tests",
              "Adds integration tests in Cloud Build against real or emulated dependencies (the Pub/Sub emulator, a test Cloud SQL instance or container) exercising the enrolment flow end to end, run on merge or nightly, catching contract and configuration errors unit tests cannot.",
              "Add integration tests that exercise a real sign-up: service, database and messaging together, using the Pub/Sub emulator and a disposable PostgreSQL (container or test Cloud SQL instance) started as Cloud Build steps. Run them on merge and nightly. They catch what mocks hide: schema mismatches, permissions, message formats."
            ),
            part(
              "Load tests",
              "Runs load tests against a production-like staging environment at and above the expected 2,000 sign-ups a minute using a load tool run from Google Cloud (for example a distributed load generator on GKE or Cloud Run jobs), measuring p99 latency against 500 ms and error rate, finding limits (database connections, Cloud Run concurrency and max instances, quotas) before launch day.",
              "Load-test a production-like staging environment with a distributed load generator (for example k6 or Locust running on GKE or Cloud Run jobs) at 2,000 sign-ups a minute, then 2x and 3x, while watching p99 latency, error rate, Cloud SQL connections and Cloud Run instance counts. The point is to find the first bottleneck, whether the connection pool, Cloud Run's max instances or a quota, with weeks to fix it."
            ),
            part(
              "Go / no-go",
              "Defines objective criteria: all unit and integration tests green; load test at 1x and 2x expected traffic meets p99 under 500 ms with error rate below the SLO; quotas raised for 3x; a rollback tested; and monitoring and alerting in place before launch.",
              "Go only if: unit and integration suites pass on the release build; the load test at 2x expected traffic holds p99 under 500 ms with errors inside the SLO; quotas are raised to cover 3x; rollback has been rehearsed on staging; and dashboards and alerts for latency, errors and saturation exist. Anything else is a no-go with a named fix."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Ensuring Solution and Operations Excellence (12.5%)
    // ----------------------------------------------------------------------
    {
      slug: "slo-based-alerting-strategy",
      objective: "Designing alerting strategies",
      kind: "build",
      title: "Design an alerting strategy around an SLO",
      brief:
        "Harborline Logistics (fictional) has set an SLO for its tracking API: 99.9% of requests succeed, measured over a rolling 30 days. The on-call team currently receives about 40 alerts a night from CPU, memory and disk thresholds on every VM, most of which need no action, and missed last month's real outage because the error-rate alert was tuned to fire only after 30 minutes. Design the alerting strategy: what pages, what tickets, what is only a dashboard, and the numbers behind the pages.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the error budget, the paging rules with their burn rates and windows, what becomes a ticket or a dashboard, and how to prevent alert fatigue.",
          parts: [
            part(
              "Error budget",
              "Computes 0.1% of 30 days = 43.2 minutes of full outage equivalent (or 0.1% of requests), and states that alerting should be on how fast that budget is being consumed, not on raw thresholds.",
              "A 99.9% SLO over 30 days leaves 0.1% of requests, equivalent to 43.2 minutes of total failure in the month. Alerts should fire on how fast that budget is burning, so a fast-moving incident pages quickly and a slow leak is noticed before the month is lost."
            ),
            part(
              "Paging rules",
              "Uses multi-window, multi-burn-rate alerts in Cloud Monitoring: page at burn rate 14.4 over 1 hour (2% of budget in an hour) with a 5-minute short window, and at burn rate 6 over 6 hours (5% in six hours) with a 30-minute short window; explains the short window stops paging once the problem ends and that a burn rate of 1 would spend exactly the month's budget.",
              "Two paging policies on the SLO's burn rate: 14.4x over 1 hour (that pace spends 2% of the month's budget in an hour) confirmed by a 5-minute window, and 6x over 6 hours (5% in six hours) confirmed by a 30-minute window. A burn rate of 1 would use exactly the budget over the 30 days, so these pages mean 'at this pace we are out of budget in days or hours'. The short window makes the alert clear quickly once the problem stops. Cloud Monitoring's SLO alerting uses the same burn-rate idea with a lookback window."
            ),
            part(
              "Tickets and dashboards",
              "Makes the slow burn (rate 1 over 3 days with a 6-hour short window, 10% of budget) a ticket not a page; demotes VM CPU/memory/disk thresholds to dashboards or tickets unless they predict user impact (for example disk full on the database); keeps symptom-based alerts over cause-based ones.",
              "A burn rate of 1 sustained for 3 days (10% of the budget, 6-hour short window) opens a ticket for working hours. The CPU, memory and disk alerts stop paging; they become dashboard panels, except where they predict user impact, such as the database disk filling, which can stay a ticket with headroom. Alert on what users feel (errors, latency), not on every cause."
            ),
            part(
              "Fatigue and follow-through",
              "Routes pages to the on-call channel with runbook links, reviews alert volume and actionability regularly (every page should need a human), deletes or tunes alerts nobody acts on, and tests alerts by injecting failures or using synthetic monitors.",
              "Every page carries a runbook link and must need a human; review monthly which alerts led to action and remove or tune the rest. Add a synthetic monitor on the tracking endpoint so the SLI is measured even at 3 a.m. with no traffic, and verify the pages fire by running a controlled failure in staging."
            ),
          ],
        },
      ],
    },
    {
      slug: "release-management-case",
      objective: "Managing deployment and release",
      kind: "case",
      title: "Manage a risky release of the tracking service",
      brief:
        "Harborline Logistics (fictional) must release a new version of its tracking service that changes the pricing calculation shown to customers. The last release of this kind went to 100% of users at once and a rounding bug cost a week of customer complaints. The service runs on GKE in two regions, with Cloud Deploy pipelines already in place and a 99.9% SLO on request success.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The product owner wants the release out on Tuesday and asks whether it can 'just be deployed carefully'.",
          ask: "Design the release: strategy, stages and the metrics that decide whether it continues.",
          parts: [
            part(
              "Strategy and stages",
              "Chooses a progressive delivery: Cloud Deploy pipeline dev -> staging -> production with a canary in production (for example 10% then 50% then 100%, one region first) and a required approval before the production stage; explains why canary over blue/green here (user-facing calculation change needs real traffic signal).",
              "Promote through the existing Cloud Deploy pipeline: dev, staging with the integration suite, then production with a required approval and a canary strategy, 10% of traffic in one region, then 50%, then 100%, then the second region. A canary gives real-user evidence on the pricing change, which a blue/green switch of 100% would not."
            ),
            part(
              "Success metrics",
              "Defines metrics compared between canary and baseline over a fixed bake time: request error rate, p95/p99 latency, and a business metric for this change (price-complaint rate or pricing-mismatch count from logs), with explicit abort thresholds tied to the SLO's error budget.",
              "During each canary step, compare canary against baseline for 30 minutes: error rate (abort if canary exceeds baseline by more than the SLO allows), p99 latency, and a change-specific signal, such as a log-based metric counting price values that fail a validation check or support contacts tagged 'price'. Any abort threshold hit means automatic rollback, not a discussion."
            ),
          ],
        },
        {
          text: "At 10% the canary's error rate is unchanged, but the pricing-mismatch metric shows 0.4% of canary responses with a different price than the baseline would have shown; the finance lead says 'that could be the correct new price'.",
          ask: "Do you proceed? What do you do with the signal?",
          parts: [
            part(
              "Decision",
              "Does not advance on an unexplained business-metric difference even with healthy technical metrics: holds the canary at 10% (or rolls back), samples the mismatched responses to determine whether the new price is intended, and resumes only when finance confirms the sample; explains that 'could be correct' is not a pass.",
              "Hold at 10%. Technical health is not the question; a 0.4% price difference is either the intended change or last time's bug again. Pull a sample of the mismatched responses, have finance confirm each is the intended new price, and only then advance. If they cannot confirm within the bake window, roll back and investigate offline. 'Could be correct' is not a pass criterion."
            ),
          ],
        },
        {
          text: "Finance confirms the sample is correct. The canary advances to 50% and then 100% in region one, and the second region follows. Two days later the product owner asks how to make the next release of this size less stressful.",
          ask: "What do you change in the release process going forward?",
          parts: [
            part(
              "Process improvements",
              "Proposes decoupling deploy from release with feature flags so pricing logic can be enabled per customer segment and turned off without a deployment, automating the canary analysis and rollback in the pipeline, smaller and more frequent releases, and recording the release and its metrics in Cloud Deploy and audit logs for traceability.",
              "Separate deploying code from releasing behaviour: put the pricing logic behind a feature flag so it can be enabled for a segment and switched off instantly without a rollout. Automate the canary verification and rollback in the Cloud Deploy pipeline so no one watches dashboards by hand, ship smaller changes more often so each release carries less risk, and keep the release record (what, who approved, metrics) in Cloud Deploy and the audit logs."
            ),
          ],
        },
      ],
    },
  ],
};
