import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-158: CompTIA Cloud+ (CV0-004, V4).
//
// Aligned to the six domains on CompTIA's certification page (Cloud
// architecture 23%, Deployment 19%, Security 19%, Operations 17%,
// Troubleshooting 12%, DevOps fundamentals 10%) and the performance tasks
// the exam's performance-based questions ask for: choose a deployment model,
// right-size and cut cost, plan a migration, write infrastructure as code,
// set up IAM, harden containers, design backups to RPO/RTO, build monitoring,
// handle a leaked credential, work a DNS/NTP/DHCP outage, lay out a CI/CD
// pipeline and an event-driven design. Vendor-neutral, as the exam is: no
// provider-specific service names are required in an answer, though a
// learner may use them. Density ("hybrid"): 2 per domain.
//
// These build and case labs are in addition to the course's self-reported
// labs (objectives.lab_prompt, docs/labs.md "Three kinds of lab"), which are
// unchanged. Sources (all read 2026-11-07):
//   CompTIA Cloud+ page, exam details and V4 objectives summary
//               https://www.comptia.org/en-us/certifications/cloud/
// Every lab is needs_expert_review until a person checks it.

export const CLOUDPLUS_LABS: SeedLabSet = {
  trackCode: "CLOUDPLUS",
  sources: [source("https://www.comptia.org/en-us/certifications/cloud/", "exam_outline", "2026-11-07")],
  labs: [
    // ---------------- Cloud architecture (2) ----------------
    {
      slug: "choose-deployment-model",
      objective: "Comparing public, private, hybrid, and multi-cloud deployment models against a business need",
      kind: "build",
      title: "Recommend a cloud deployment model for a hospital group",
      brief:
        "Marlowe Health runs three hospitals. Its needs: (1) a patient-records system whose data must, by regulation, stay in facilities the group controls, with sub-10 ms latency to bedside devices; (2) a research analytics platform that processes anonymised data in huge bursts a few days a month; (3) a public appointment-booking website with unpredictable traffic; (4) an email and collaboration suite the IT team no longer wants to run. The board has asked for 'a cloud strategy' and one director wants everything on two public providers 'so we are never locked in'. Recommend a deployment model for the group and say where each system runs.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Name the overall model, place each system, and address the two-provider proposal.",
          parts: [
            part(
              "Overall model",
              "Recommends a hybrid cloud: a private cloud (on-premises or hosted in group-controlled facilities) for the regulated, latency-sensitive system, connected to a public cloud for elastic and commodity workloads.",
              "Hybrid: keep a private cloud in the group's own data centre for what regulation and latency pin down, and use a public cloud for everything elastic or commodity, joined by a private connection or VPN so systems can talk and identity is shared. Neither all-private (no elasticity) nor all-public (breaks the data-location rule) fits."
            ),
            part(
              "Placing the systems",
              "Puts patient records on the private cloud (data control, latency), research analytics on public cloud (burst capacity paid per use), the booking site on public cloud (autoscaling for unpredictable traffic), and the collaboration suite on public SaaS.",
              "Patient records: private cloud on-site, which satisfies the data-location rule and gives bedside devices local latency. Research analytics: public cloud, spinning up large compute for the few burst days and paying nothing between them. Booking website: public cloud with autoscaling behind a load balancer. Email and collaboration: a public SaaS suite, so IT stops running servers for it."
            ),
            part(
              "Multi-cloud proposal",
              "Evaluates multi-cloud honestly: it reduces single-provider dependence but doubles skills, tooling and security surface and rarely helps a group of this size; recommends portability practices (containers, IaC, open standards) over running two providers from day one.",
              "Running every workload on two public providers would double the skills, tooling, identity integration and security monitoring the team must master, for a lock-in risk that is better managed by portability: containerise applications, define infrastructure as code, and avoid provider-only services where a standard one exists. Use a second provider only where a specific service or resilience need justifies it."
            ),
          ],
        },
      ],
    },
    {
      slug: "cut-cloud-bill-without-breaking-slas",
      objective: "Optimizing cloud resources for performance and cost efficiency",
      kind: "build",
      title: "Cut a cloud bill by a third without breaking service levels",
      brief:
        "Fenwick Apparel's monthly cloud bill is 180,000 and finance wants it under 120,000. The inventory shows: 400 virtual machines averaging 9% CPU and 20% memory use; a 24/7 fleet of 30 large instances for a batch job that runs 02:00-05:00; 200 TB of object storage in the premium tier, 90% of it not accessed in a year; 60 unattached block volumes and 25 idle load balancers from finished projects; and a production web tier running on-demand at a steady baseline of 50 instances all year. Nothing may breach the 99.9% availability target for production. Write the optimisation plan.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the plan: what you change for each line item, the saving mechanism, and how you protect availability.",
          parts: [
            part(
              "Right-sizing",
              "Right-sizes the under-used VMs (smaller instance types or fewer instances based on measured utilisation) in stages with monitoring, and considers autoscaling where load varies.",
              "The 400 VMs at 9% CPU and 20% memory are oversized: using 30 days of utilisation metrics, move each to a size that puts peak use around 60-70%, in waves by environment (non-production first), watching performance after each wave. Where load varies by time of day, put them in autoscaling groups so capacity follows demand."
            ),
            part(
              "Scheduling and purchasing",
              "Schedules the batch fleet to run only during its window (or uses on-demand/spot capacity created for the job and destroyed afterwards) and covers the steady 50-instance web baseline with reserved or committed-use pricing, keeping bursts on-demand.",
              "The batch fleet runs three hours a day: start it at 01:55 and stop it at 05:05 with a scheduler, or create it per job and delete it afterwards, using spot or preemptible capacity if the job tolerates interruption; that removes 21 idle hours a day. The web tier's 50 steady instances run all year, so buy a 1- or 3-year reservation or committed-use discount for that baseline and keep peak capacity on-demand."
            ),
            part(
              "Storage tiering and waste",
              "Moves rarely accessed objects to cold or archive tiers with a lifecycle policy (noting retrieval costs and minimum durations), deletes unattached volumes and idle load balancers after snapshotting what might be needed.",
              "Add a lifecycle policy that moves objects untouched for 90 days to a cold tier and after a year to archive, accepting slower, charged retrieval for the 90% nobody reads. Snapshot the 60 unattached volumes that might hold something, then delete them and the 25 idle load balancers; both bill every hour they exist."
            ),
            part(
              "Guarding availability and governance",
              "Protects the 99.9% target by right-sizing with headroom and autoscaling rather than cutting production capacity, testing changes in non-production, and adds tagging, budgets and alerts so waste does not return.",
              "Production changes keep headroom (target 60-70% at peak, not 95%) and autoscaling covers surprises, so the 99.9% target is protected; every change is tried in staging first. Tag every resource with owner and project, set budgets with alerts per team, and run a monthly report of idle resources, so the saving is kept rather than made once."
            ),
          ],
        },
      ],
    },

    // ---------------- Deployment (2) ----------------
    {
      slug: "plan-workload-migration",
      objective: "Planning and executing workload migrations to a cloud environment",
      kind: "build",
      title: "Plan the migration of three applications",
      brief:
        "Tarrant Freight is closing its data centre in nine months and moving three applications to a public cloud. (1) A dispatch system: a Windows application server and SQL database, business-critical, change-averse vendor, 2-hour maximum downtime allowed. (2) An internal wiki on an old Linux server with a vendor that no longer exists. (3) A customer tracking portal: a modern web app on containers already, stateless, with its data in a managed database the team can replicate. Write the migration plan: the strategy for each application, the order, the cutover and rollback approach, and how you validate success.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the migration plan.",
          parts: [
            part(
              "Strategy per application",
              "Chooses rehost (lift and shift) for the change-averse dispatch system, replace with a SaaS/hosted wiki for the orphaned application, and replatform/refactor-light for the containerised portal onto a managed container service with database replication.",
              "Dispatch: rehost, moving the application server and database as virtual machines with minimal change, because the vendor will not support changes. Wiki: replace, exporting content into a hosted wiki product, since there is no vendor to support the old one. Portal: replatform onto a managed container service, replicating the database to a managed equivalent, with no application rewrite."
            ),
            part(
              "Order and preparation",
              "Sequences low-risk first (wiki, then portal, dispatch last), and prepares with an assessment of dependencies, network and identity set-up, a pilot/test migration, and performance baselines.",
              "Order: wiki first (low risk, builds confidence), portal second, dispatch last with the most rehearsal. Before any move: map dependencies (DNS, authentication, file shares, integrations), stand up the cloud landing zone (network, identity, logging), capture performance baselines, and run a test migration of each application into a test environment."
            ),
            part(
              "Cutover and rollback",
              "Uses replication-based cutover for the dispatch database (continuous replication, then a short freeze inside the 2-hour window), DNS/traffic switch with low TTLs, and a rollback plan that keeps the source running and reversible until acceptance.",
              "Dispatch: replicate the database continuously to the cloud, then in the window freeze writes, let replication catch up, switch the application servers and DNS (TTL lowered days earlier), and test; the old environment stays untouched so rollback is switching DNS back inside the same window. Portal: run both sides, shift traffic gradually, roll back by shifting it back. Decommission the source only after sign-off."
            ),
            part(
              "Validation",
              "Validates with functional tests, data integrity checks (row counts, checksums), performance against the baseline, security checks, and a documented acceptance by the business owner.",
              "After each cutover: run the application's functional test script, compare row counts and checksums between source and target databases, compare response times with the baseline, confirm backups and monitoring are active in the new home, and get written acceptance from the business owner before the old servers are powered off."
            ),
          ],
        },
      ],
    },
    {
      slug: "iac-for-three-environments",
      objective: "Implementing infrastructure as code (IaC) techniques for automation",
      kind: "build",
      title: "Turn a hand-built environment into infrastructure as code",
      brief:
        "Caldwell Analytics has development, staging and production environments that were built by hand in the console over two years. They differ in ways nobody can list, production changes are made directly by whoever is on call, and a recent outage came from a firewall rule someone added at 02:00 and forgot. The team wants all three environments defined as code with one definition and per-environment differences, changes reviewed before they apply, and drift detected. Design the IaC approach.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the IaC approach: structure, environments, change process, and drift control.",
          parts: [
            part(
              "Declarative, modular structure",
              "Uses a declarative IaC tool with reusable modules (network, compute, database) and one root configuration per environment that passes variables (size, counts, names), so the three environments share definitions and differ only in parameters.",
              "Write the infrastructure declaratively in a tool such as Terraform: modules for network, compute and database, and a thin configuration per environment that calls the same modules with different variables (instance size, replica count, CIDR ranges, domain). The environments can no longer drift apart in structure, only in the parameters you chose."
            ),
            part(
              "Import and state",
              "Imports the existing hand-built resources into IaC state rather than recreating them, keeps remote state in a shared, locked, versioned backend, and never edits state by hand.",
              "Import the existing resources into the tool's state so they come under management without being destroyed and rebuilt. Keep state in a remote backend with locking and versioning (an object store with locking), one state per environment, with access limited to the pipeline and a few operators; nobody edits state files by hand."
            ),
            part(
              "Change process",
              "Puts the code in version control, requires a pull request with a plan/preview and a peer review, and applies through a pipeline (with approval for production); console changes are removed from normal operation.",
              "All changes go through version control: a branch, a pull request that shows the tool's plan (what will be added, changed, destroyed), a review by a second engineer, and an automated apply from the pipeline after merge, with a manual approval gate for production. The on-call engineer loses write access to the console in production and makes the 02:00 change as a reviewed emergency PR instead."
            ),
            part(
              "Drift detection",
              "Runs scheduled plan/drift checks that compare real infrastructure to code and alert on differences, and reconciles either by codifying the change or reverting it; adds policy checks for forbidden changes.",
              "Run the plan on a schedule (for example hourly) against each environment; any difference between code and reality is drift and raises an alert. The team decides to codify it (if it was right) or re-apply the code (if it was not). Add policy-as-code checks in the pipeline that block dangerous resources, such as a firewall rule open to the internet, before they can be applied."
            ),
          ],
        },
      ],
    },

    // ---------------- Security (2) ----------------
    {
      slug: "iam-for-a-cloud-tenant",
      objective: "Implementing identity and access management (IAM) to control resource access",
      kind: "build",
      title: "Design identity and access for a new cloud tenant",
      brief:
        "Ravelston Media is standing up a cloud tenant for 80 people: 10 platform engineers, 40 developers across four product teams, 20 analysts, and 10 finance and audit staff who only need to read billing and logs. The company has a corporate directory with single sign-on. Today a shared 'admin' login is used by everyone with the password in a chat channel, and three CI pipelines use the same login. Design the IAM model.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the identity model, authorisation model, non-human access, and the controls that keep it honest.",
          parts: [
            part(
              "Identities",
              "Federates the cloud tenant to the corporate directory via SSO so every person uses their own identity, enforces MFA, removes the shared admin login and locks away the root/break-glass account with MFA and no daily use.",
              "Connect the tenant to the corporate directory with SAML/OIDC single sign-on, so everyone signs in as themselves and leavers lose access when HR disables them. Require MFA for all. Retire the shared admin login; the tenant's root or owner account gets a long random password, hardware MFA, no API keys, and is used only in a documented emergency."
            ),
            part(
              "Authorisation",
              "Applies role-based access control through groups mapped from the directory (platform-admins, team-X-developers, analysts, finance-readers) with least-privilege roles scoped to each team's projects or accounts, and read-only roles for finance and audit.",
              "Role-based access through directory groups: platform engineers get administrative roles on shared infrastructure; each product team's developers get developer roles only in their own projects or accounts; analysts get read access to the data platform; finance and audit get read-only billing and log-viewer roles and nothing else. Grants go to groups, never to individuals."
            ),
            part(
              "Non-human access",
              "Gives each CI pipeline its own service identity with least privilege (and short-lived credentials or federation where supported), never a human login, and stores any unavoidable secret in a secrets manager with rotation.",
              "Each pipeline gets its own service identity with only the permissions its deployments need, authenticating with short-lived credentials via workload identity federation from the CI system where the provider supports it; otherwise its credential lives in a secrets manager, is rotated on a schedule, and never in a chat channel or repository."
            ),
            part(
              "Keeping it honest",
              "Adds privileged access controls (just-in-time elevation or approval for admin roles), quarterly access reviews, audit logging of IAM changes with alerts, and a joiner/mover/leaver process tied to the directory.",
              "Admin rights are not standing: engineers request time-boxed elevation with approval and it expires. Review group membership and roles quarterly with the owners. Log every IAM change and alert on new admin grants or new access keys. Joiners, movers and leavers are handled in the directory, so the cloud follows automatically."
            ),
          ],
        },
      ],
    },
    {
      slug: "harden-container-platform",
      objective: "Safeguarding containerized applications and resources",
      kind: "build",
      title: "Harden a containerised application platform",
      brief:
        "Ashby & Stone's order-processing application runs as 14 containerised services on a managed Kubernetes cluster. A security review found: images are built from 'latest' base tags and never scanned; containers run as root; database passwords are baked into image environment variables; any pod can talk to any other pod and to the internet; and the registry accepts pushes from any developer laptop. Write the hardening plan for the build, the registry, the runtime and the network.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the hardening plan across build, registry, runtime and network.",
          parts: [
            part(
              "Build and images",
              "Pins base images to specific versions/digests, uses minimal base images, scans images for vulnerabilities in the pipeline and fails the build on high/critical findings, and rebuilds regularly to pick up patches.",
              "Pin base images to a specific version or digest instead of 'latest', switch to minimal (distroless or slim) bases to shrink the attack surface, scan every image for CVEs in the CI pipeline and fail on critical or high findings, and rebuild images on a schedule so patched bases flow through."
            ),
            part(
              "Registry and supply chain",
              "Restricts pushes to the CI pipeline's identity only, signs images and enforces that the cluster deploys only signed images from the trusted registry (admission control), and keeps the registry private.",
              "Only the CI pipeline's service identity may push; developers lose push rights. Sign images in the pipeline and enforce an admission policy on the cluster that admits only signed images from the company registry, so an image pushed from a laptop cannot run. Keep the registry private and scan it continuously."
            ),
            part(
              "Runtime",
              "Runs containers as a non-root user with a read-only root filesystem and dropped Linux capabilities, enforced by pod security standards/admission; moves secrets to a secrets manager or the orchestrator's secret store injected at runtime, not image environment variables; sets resource limits.",
              "Set each container to run as a non-root user with a read-only root filesystem, drop all Linux capabilities and disallow privilege escalation, and enforce it with the cluster's pod security admission at the restricted level. Move database passwords into a secrets manager (or orchestrator secrets backed by one) mounted at runtime; rotate them, since they are already exposed in image layers. Set CPU and memory limits so one compromised service cannot starve the others."
            ),
            part(
              "Network",
              "Applies network policies that default-deny pod-to-pod and egress traffic and allow only the required service paths and the database; routes internet egress through a controlled gateway; encrypts service traffic (mTLS via a service mesh if needed).",
              "Apply a default-deny network policy per namespace, then allow only the specific paths each service needs (for example order-api to payments on its port, payments to the database). Deny direct internet egress and send what is needed through an egress gateway or proxy with logging. Encrypt service-to-service traffic with mutual TLS, via a service mesh if the platform does not provide it."
            ),
          ],
        },
      ],
    },

    // ---------------- Operations (2) ----------------
    {
      slug: "backup-strategy-to-rpo-rto",
      objective: "Implementing backup and recovery strategies to ensure data integrity",
      kind: "build",
      title: "Design backups and recovery for three data sets",
      brief:
        "Gowerton Legal has three data sets in the cloud. (1) A document management database: RPO 15 minutes, RTO 2 hours, and the firm must be able to recover from ransomware that encrypts everything it can reach. (2) Ten years of closed-case archives in object storage: must be retained for the regulatory period, almost never read, RTO 48 hours. (3) Developer virtual machines: RPO 24 hours, RTO 1 day, lowest cost. The firm has been burned before by backups that would not restore. Design the backup and recovery strategy.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the strategy for each data set and the practices that guarantee restores work.",
          parts: [
            part(
              "Document database",
              "Uses frequent backups matching the RPO (transaction-log or continuous backups enabling point-in-time recovery to within 15 minutes) plus daily full backups, with a tested restore procedure that fits the 2-hour RTO.",
              "Enable continuous or transaction-log backups so the database can be restored to any point within the last 15 minutes, plus a daily full backup. Document and time the restore procedure (provision, restore, repoint the application) to prove it fits inside 2 hours; a restore that takes 3 hours fails the requirement however good the backups are."
            ),
            part(
              "Ransomware resilience",
              "Follows 3-2-1 (three copies, two media or locations, one offline/offsite) with an immutable or air-gapped copy (write-once / object lock, separate account or credentials) so an attacker with production access cannot delete or encrypt backups.",
              "Keep at least three copies on two different storage types or locations with one isolated from production: copy backups to a separate account or vault with different credentials and immutability (write-once, object lock) for the retention period. An attacker who owns production cannot delete or encrypt an immutable copy they cannot authenticate to. Alert on backup deletions and failed jobs."
            ),
            part(
              "Archives and developer VMs",
              "Keeps archives in an archive storage tier with retention/legal-hold settings and versioning (48-hour RTO tolerates slow retrieval); protects developer VMs with daily snapshots and a short retention, or rebuilds them from images/IaC.",
              "Archives: store in an archive tier with a retention policy set to the regulatory period and versioning on, accepting retrieval times of hours because the RTO is 48 hours; replicate to a second region if regulation requires. Developer VMs: a daily snapshot kept for seven days meets the 24-hour RPO cheaply, or define the machines as images plus code so a 'restore' is a rebuild."
            ),
            part(
              "Proving restores",
              "Schedules regular restore tests (full restore to an isolated environment, integrity checks, timed against RTO), monitors backup job success, and documents runbooks; treats an untested backup as no backup.",
              "Every month restore the document database to an isolated environment, run integrity checks and application smoke tests, and record the elapsed time against the 2-hour RTO; quarterly, retrieve a sample of archives and boot a snapshot. Monitor and alert on failed or missed backup jobs. Keep the runbooks where they can be read when production is down."
            ),
          ],
        },
      ],
    },
    {
      slug: "monitoring-for-a-web-platform",
      objective: "Monitoring and analyzing cloud environments for performance optimization",
      kind: "build",
      title: "Build monitoring for a platform that finds out from customers",
      brief:
        "Heslop Travel's booking platform (web tier, API tier, database, queue workers) runs in the cloud, but the team learns about problems from customer tweets. There are dashboards of CPU for every server, which nobody watches, and an alert on 'CPU above 80%' that fires 40 times a day and is ignored. Design monitoring that tells the team about real user impact first, helps them find the cause, and drives performance tuning rather than noise.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the monitoring: what you measure, how you alert, what you keep for diagnosis, and how it feeds optimisation.",
          parts: [
            part(
              "Measure user impact",
              "Defines service-level indicators at the user edge (request latency percentiles, error rate, availability, booking completion rate) with service-level objectives, and synthetic checks from outside; treats CPU as a diagnostic, not the primary signal.",
              "Measure what customers feel: p95 and p99 latency and error rate at the load balancer or API gateway, availability from synthetic bookings run every minute from outside the cloud, and the booking-completion rate as a business indicator. Set objectives (for example 99.9% of requests succeed, p95 under 800 ms). CPU stays on dashboards as a diagnostic; it is not what pages people."
            ),
            part(
              "Alerting that is acted on",
              "Alerts on symptoms against SLOs (error budget burn rate, sustained latency breach) with thresholds and durations tuned to be actionable, routes by severity (page vs ticket), and retires the CPU alert or converts it to a non-paging signal.",
              "Page on symptoms: error-budget burn (errors or latency breaching the objective for several minutes), synthetic booking failures, or a queue backlog growing for 10 minutes. Everything else creates a ticket or a dashboard annotation. The 'CPU above 80%' page is removed; a sustained saturation warning becomes a low-priority ticket. Every alert that pages has a runbook link."
            ),
            part(
              "Diagnosis",
              "Keeps the three pillars together: centralised structured logs with request IDs, metrics per tier (saturation: CPU, memory, connections, queue depth, database locks) and distributed traces across web, API, database and workers, so an alert can be followed to a cause.",
              "Centralise logs with a correlation ID carried from the web tier through the API to the workers; collect per-tier saturation metrics (connections, queue depth, database lock waits, cache hit rate) alongside CPU and memory; and add distributed tracing so a slow booking shows which hop took the time. An alert links to the dashboard of that service and its traces."
            ),
            part(
              "Optimisation loop",
              "Uses baselines and trends (capacity planning, right-sizing, autoscaling policies driven by the right metric such as request rate or queue depth), reviews incidents and SLO reports regularly, and tunes thresholds from data.",
              "Review weekly: SLO attainment, the slowest endpoints from traces, and resource trends for capacity planning. Drive autoscaling from request rate or queue depth rather than CPU alone, right-size from 30-day utilisation, and adjust alert thresholds based on what actually preceded incidents. Each incident review adds or removes a signal."
            ),
          ],
        },
      ],
    },

    // ---------------- Troubleshooting (2) ----------------
    {
      slug: "leaked-credential-and-privilege-escalation",
      objective: "Addressing security incidents such as leaked credentials and privilege escalation",
      kind: "case",
      title: "Handle a leaked API key that becomes a privilege escalation",
      brief:
        "You are the cloud engineer on call at Birchwood Games. The company runs its game backend in a single cloud account with several teams' resources in it.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "At 09:10 a developer reports that a cloud API key belonging to the 'build-bot' service identity was pushed to a public code repository two days ago. The key is still active. build-bot has permissions to deploy compute and read a storage bucket of game assets.",
          ask: "What do you do first, and what do you look for?",
          parts: [
            part(
              "Contain",
              "Deactivates or deletes the exposed key immediately (issuing a replacement for the pipeline), before investigation, and removes it from the repository history.",
              "Revoke the key now: deactivate it, issue a fresh credential for the pipeline from a secrets manager, then delete the old key. Purge it from the repository history and treat it as compromised regardless, because scrapers find public keys within minutes."
            ),
            part(
              "Investigate",
              "Reviews the cloud audit logs for all actions by that key since the exposure: unusual regions, compute launched, data read, and any identity or permission changes it made.",
              "Pull the audit log for build-bot since two days before the push: API calls, source IPs, regions, compute created, objects read from the asset bucket, and above all any identity or permission changes (new keys, roles granted, policies edited) that could keep an attacker in after the key dies."
            ),
          ],
        },
        {
          text: "The audit log shows the key was used from an unknown IP to attach an administrator policy to build-bot, then to create a new user 'svc-maint' with its own access key and administrator rights, and to launch 60 large compute instances in a region you never use.",
          ask: "What has happened, and what do you do now?",
          parts: [
            part(
              "Recognise the escalation",
              "Identifies privilege escalation (an over-permissive identity allowed to modify its own permissions) and persistence (a new admin user and key), and contains both: remove the admin policy, disable and delete svc-maint and its key, and check for other persistence (roles, keys, instance profiles, scheduled tasks).",
              "build-bot could change IAM, which is how a deployment key became an administrator; the attacker then created their own admin user as persistence. Remove the administrator policy from build-bot, disable and delete svc-maint and its key, and search for anything else created in the same window: other users or keys, modified roles, new instance identities, scheduled tasks or functions that could re-create access."
            ),
            part(
              "Clean up and preserve evidence",
              "Terminates the unauthorised instances after capturing evidence (snapshots, logs) if needed, checks the bill, and documents the timeline for the incident report and any disclosure obligation.",
              "Snapshot one or two of the instances if forensics wants them, then terminate all 60 and any attached storage, and ask the provider about the charges. Record the timeline (push, first misuse, escalation, detection, containment) for the incident report, and involve legal about whether any customer data in the asset bucket triggers a disclosure duty."
            ),
          ],
        },
        {
          text: "The incident is over. Leadership asks what prevents the next one.",
          ask: "Name the preventive and detective controls you put in place.",
          parts: [
            part(
              "Prevent",
              "Applies least privilege (build-bot cannot touch IAM), replaces long-lived keys with short-lived credentials or workload identity federation for CI, adds secret scanning to repositories and pre-commit hooks, and restricts unused regions by policy.",
              "Least privilege: no service identity may modify IAM unless that is its job, and build-bot's permissions shrink to deploying its own application. Replace long-lived keys for CI with short-lived credentials via federation from the CI system. Turn on secret scanning on all repositories with push blocking and pre-commit hooks. Restrict resource creation to approved regions with an organisation-level policy."
            ),
            part(
              "Detect",
              "Adds alerts on IAM changes (policy attachments, new users and keys, administrator grants), anomalous API activity (new regions, unusual IPs), and billing spikes, routed to the on-call, plus a rehearsed runbook.",
              "Alert on any IAM policy attachment, new user or key, or administrator grant; on API calls from new countries or regions; and on hourly spend above baseline. Route them to the on-call, not an inbox. Turn today's steps into a leaked-credential runbook and rehearse it twice a year."
            ),
          ],
        },
      ],
    },
    {
      slug: "dns-ntp-dhcp-outage",
      objective: "Resolving service disruptions in DNS, DHCP, and NTP",
      kind: "case",
      title: "Work a morning of DNS, NTP and DHCP failures",
      brief:
        "You are the cloud operations engineer at Penrose Manufacturing, which runs a hybrid environment: an on-premises network for the factory floor and a cloud virtual network for business applications, connected by a VPN. It is 07:30 on a Monday after a weekend change window.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Users report the inventory application (in the cloud) is 'down'. From an on-premises workstation, pinging the application's IP address works, but opening inventory.penrose.example fails. nslookup inventory.penrose.example returns 'server can't find' from the on-premises DNS server, while the same lookup against the cloud DNS resolver succeeds.",
          ask: "What is the fault, and how do you fix and prevent it?",
          parts: [
            part(
              "Diagnosis",
              "Identifies a DNS resolution failure for the cloud zone from on-premises: the on-premises DNS server is no longer forwarding the penrose.example cloud zone to the cloud resolver (conditional forwarder lost or changed in the weekend window); the application itself is up.",
              "Reachability by IP works and the cloud resolver answers, so the application and network are fine: the on-premises DNS server has lost its conditional forwarder for the cloud zone, almost certainly in the weekend change. It answers 'not found' from its own data instead of asking the cloud resolver."
            ),
            part(
              "Fix and prevention",
              "Restores the conditional forwarder (or zone delegation) to the cloud resolver, confirms with nslookup/dig, and prevents recurrence with DNS configuration in code and monitoring of resolution from both sides.",
              "Re-add the conditional forwarder for the cloud zone pointing at the cloud resolver's IP (allowed through the VPN), flush caches, and confirm with dig from a workstation. Put the DNS server configuration under version control and add a synthetic check that resolves a cloud name from on-premises every minute, so the next broken forwarder is caught before Monday morning."
            ),
          ],
        },
        {
          text: "DNS is fixed. Now the finance team cannot sign in to the cloud-hosted ERP system: authentication fails with 'token expired' or 'clock skew too great', though the password is right. The ERP servers show a time of 07:58 while your workstation shows 08:17. The servers' configured NTP source is an on-premises appliance that was replaced at the weekend.",
          ask: "What is wrong and what do you do?",
          parts: [
            part(
              "Diagnosis and fix",
              "Identifies clock skew from lost NTP synchronisation (the servers drifted after their time source was replaced) breaking time-sensitive authentication (Kerberos/token validity), and fixes by pointing the servers at a reachable NTP source (the cloud provider's time service or a pool), resynchronising, and verifying the offset.",
              "Authentication tokens and Kerberos tickets have validity windows of minutes; the ERP servers are 19 minutes behind because their NTP source vanished, so every token looks expired. Point them at a reachable, reliable NTP source (the cloud provider's time service or at least two public pool servers), force a resync, and verify the offset is under a second. Then fix the on-premises appliance's address or decommission it as a source."
            ),
            part(
              "Prevention",
              "Monitors NTP offset and stratum on servers with an alert, and uses redundant time sources so one appliance replacement cannot stop synchronisation.",
              "Add NTP offset and synchronisation status to monitoring with an alert at, say, 500 ms of skew, and configure every server with at least two independent time sources so one replaced appliance never leaves a fleet drifting."
            ),
          ],
        },
        {
          text: "By 09:00 the factory-floor team reports that new handheld scanners powered on this morning cannot get on the network. Scanners that stayed on over the weekend still work. The scanners show self-assigned 169.254.x.x addresses. The weekend change added 120 new scanners to the same floor VLAN.",
          ask: "What is the problem and how do you resolve it?",
          parts: [
            part(
              "Diagnosis and fix",
              "Identifies DHCP scope exhaustion (169.254 self-assigned addresses mean no DHCP offer; adding 120 devices used up the VLAN's address pool), and fixes by enlarging the scope/subnet or shortening lease times (and reclaiming stale leases), or adding a new VLAN/subnet for the new devices; checks the DHCP relay if the server is remote.",
              "A 169.254.x.x address is a device that asked for DHCP and got no offer; devices with existing leases still work, so the server is up but its pool for that VLAN is exhausted by the 120 new scanners. Immediately shorten the lease time and clear stale leases to free addresses, then properly enlarge the subnet and scope or add a second VLAN and scope for the new scanners, and confirm the DHCP relay on the floor switch points at the right server."
            ),
          ],
        },
      ],
    },

    // ---------------- DevOps fundamentals (2) ----------------
    {
      slug: "design-ci-cd-pipeline",
      objective: "Building and managing CI/CD pipelines",
      kind: "build",
      title: "Design a CI/CD pipeline for a containerised API",
      brief:
        "Linwood Payments deploys its containerised API by hand: a developer builds an image on a laptop, pushes it, and edits the production deployment at lunchtime. Releases break about once a month and take an hour to roll back. Requirements for the new pipeline: every change is tested and scanned before it can reach production, production deploys happen without downtime, a bad release is detected and reversed in minutes, and auditors can see who approved what. Design the pipeline.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the pipeline stages, the deployment strategy, the rollback mechanism and the audit trail.",
          parts: [
            part(
              "Integration stages",
              "Triggers on every commit/pull request: build the image once in CI (not on laptops), run unit and integration tests, static analysis and dependency/image vulnerability scans, and fail the pipeline on test failures or critical findings; tags the image immutably (digest or version).",
              "On every pull request: check out, build the image in the CI runner, run unit and integration tests, lint and static analysis, scan dependencies and the image for vulnerabilities, and fail on any test failure or critical finding. On merge to main, the same build is tagged with the commit SHA and version and pushed to the registry; the same artefact is promoted through every environment, never rebuilt."
            ),
            part(
              "Delivery stages",
              "Deploys automatically to a staging environment with smoke and end-to-end tests, then requires an approval gate before production, with configuration separated from the image.",
              "Deploy the tagged image to staging automatically, run smoke and end-to-end tests against it, and record results. Production deployment requires a manual approval from a release owner in the pipeline tool. Environment configuration (URLs, secrets references) is injected at deploy time, so the image is identical in staging and production."
            ),
            part(
              "Zero-downtime deployment and rollback",
              "Uses a blue-green or canary deployment strategy with health checks so the new version takes traffic only when healthy, with automated rollback (shift traffic back or redeploy the previous tag) triggered by error-rate or latency alerts.",
              "Deploy with a canary: the new version receives a small share of traffic behind the load balancer while health checks, error rate and latency are compared with the old version; if they stay within limits, traffic shifts in steps to 100%. If an alert fires, the pipeline shifts traffic back to the previous version automatically, which takes seconds because the old version is still running. Blue-green works the same way with a full switch."
            ),
            part(
              "Audit trail",
              "Keeps everything in version control and the pipeline: who committed, who reviewed, test and scan results, who approved production, which image digest was deployed when; protects main with required reviews and removes direct production access.",
              "Every production change is traceable: the commit and its reviewer in version control, the pipeline run with its test and scan reports, the named approver and timestamp, and the image digest deployed. Protect the main branch with required reviews, and remove developers' direct write access to production so the pipeline is the only path."
            ),
          ],
        },
      ],
    },
    {
      slug: "event-driven-order-processing",
      objective: "Event-driven architectures in cloud applications",
      kind: "build",
      title: "Redesign order processing as an event-driven system",
      brief:
        "Marchbank Books' web shop calls three services in sequence when a customer pays: update stock, send a confirmation email, and notify the warehouse. If the email provider is slow, checkout hangs; if the warehouse system is down, orders are lost. A nightly job scans the database for orders the warehouse never received. The team wants checkout to be fast, no order to be lost, each downstream service to be independent, and new consumers (fraud checks, analytics) to be added without changing the checkout code. Redesign it as an event-driven architecture.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Describe the event-driven design, how it handles failure, and how it stays correct under retries.",
          parts: [
            part(
              "Event flow",
              "Publishes an OrderPaid event once to a message broker/event bus (publish-subscribe) and has stock, email and warehouse services each consume from their own subscription or queue, so checkout returns after the publish and consumers run independently.",
              "Checkout writes the order and publishes one OrderPaid event to an event bus or topic. Stock, email and warehouse each subscribe through their own queue and process at their own pace; checkout returns as soon as the publish is acknowledged, so a slow email provider no longer delays the customer."
            ),
            part(
              "Failure handling",
              "Uses durable queues with retries and backoff per consumer, a dead-letter queue for messages that keep failing, and alerting on dead-letter depth, so a down warehouse system means delayed delivery, not lost orders.",
              "Queues are durable: if the warehouse service is down, its messages wait and are retried with backoff when it returns. Messages that still fail after a set number of attempts move to a dead-letter queue that raises an alert and can be replayed, so the nightly 'lost orders' scan is no longer needed."
            ),
            part(
              "Idempotency and ordering",
              "Makes consumers idempotent (de-duplicate on order ID, since delivery is at least once) and uses ordering keys/FIFO only where order matters (for example stock updates per product), with the event carrying enough data or a reference to fetch it.",
              "Delivery is at least once, so every consumer treats the order ID as an idempotency key: stock checks whether this order has already been deducted, email records sent message IDs, the warehouse upserts by order ID. Where sequence matters (several events for the same product's stock), use a partition or ordering key per product; elsewhere, plain parallel processing is fine. The event carries the order ID and the fields consumers need, or a reference to fetch the full order."
            ),
            part(
              "Extensibility",
              "Adds new consumers (fraud, analytics) by subscribing to the same event with no change to checkout, versions the event schema compatibly, and documents the contract.",
              "A fraud service or an analytics pipeline is added by creating a new subscription to OrderPaid; checkout does not change. Keep the event schema in a shared registry, add fields in backward-compatible ways, and document the contract so producers and consumers evolve independently."
            ),
          ],
        },
      ],
    },
  ],
};
