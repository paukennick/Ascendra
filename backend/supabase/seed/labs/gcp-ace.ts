import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-157: Google Cloud Associate Cloud Engineer.
//
// Aligned to the Associate Cloud Engineer exam guide (PDF, read 2026-11-07):
// four sections at 20/30/30/20. The ACE is the hands-on exam, so these labs
// ask for real gcloud commands and their flags as well as the reasoning:
// build a hierarchy and budget, choose compute, create an autoscaled MIG,
// write firewall rules, schedule snapshots, roll out and split traffic on
// Cloud Run, query logs, scope a service account, impersonate one.
// Density (docs/labs.md, policy "hybrid"): 2 / 3 / 3 / 2.
//
// Every command and flag below was checked against the installed Google
// Cloud SDK (570.0.0, core 2026.05.22) help on 2026-11-07; the reference
// pages at docs.cloud.google.com/sdk/gcloud/reference mirror that help.
// Figures: VPC firewall rule priority range 0-65535 (default 1000), deny
// beats allow only at equal priority, implied allow-egress / deny-ingress,
// default-network rules at 65534
// (docs.cloud.google.com/firewall/docs/firewalls); Cloud Run concurrency
// default 80 per instance, maximum 1000
// (docs.cloud.google.com/run/docs/about-concurrency); Spot VMs up to 91% off,
// preemptible at any time, no SLA (docs.cloud.google.com/compute/docs/instances/spot).
// Organization policy constraints are described by purpose, not by ID.

export const GCPACE_LABS: SeedLabSet = {
  trackCode: "GCPACE",
  sources: [
    source("https://services.google.com/fh/files/misc/associate_cloud_engineer_exam_guide_english.pdf", "exam_outline", "2026-11-07"),
    source("https://cloud.google.com/learn/certification/cloud-engineer", "exam_outline", "2026-11-07"),
    source("https://docs.cloud.google.com/firewall/docs/firewalls", "reference", "2026-11-07"),
    source("https://docs.cloud.google.com/run/docs/about-concurrency", "reference", "2026-11-07"),
    source("https://docs.cloud.google.com/compute/docs/instances/spot", "reference", "2026-11-07"),
    source("https://docs.cloud.google.com/sdk/gcloud/reference", "reference", "2026-11-07"),
  ],
  labs: [
    // ----------------------------------------------------------------------
    // Setting Up a Cloud Solution Environment (20%)
    // ----------------------------------------------------------------------
    {
      slug: "resource-hierarchy-and-org-policy",
      objective: "Building a resource hierarchy (organization, folders, projects) and applying organization policies to it",
      kind: "build",
      title: "Design a resource hierarchy and its guardrails for a new organization",
      brief:
        "Tollgate Retail Ltd is a fictional retailer starting fresh on Google Cloud with organization ID 123456789012. It has three business units (Stores, Online, Finance), each of which needs separate development and production environments, and a central platform team that owns shared networking and logging. Two rules must hold everywhere: no virtual machine may have an external IP address, and no resource may be created outside European regions, except that the Online unit's development environment may use external IPs for a public demo. Design the hierarchy, place the policies, and give the commands to create the first folder and project.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the hierarchy, where each organization policy is set and why, and the gcloud commands for the first folder and project.",
          parts: [
            part(
              "Hierarchy",
              "Proposes organization -> folders per business unit (Stores, Online, Finance) and a Platform/Shared folder -> per-unit environment folders or projects for dev and prod (for example a project per unit per environment), with shared services (network host, logging) in the platform folder, and explains that folders exist to group projects that share policy and IAM.",
              "Organization 123456789012 -> folders Stores, Online, Finance and Platform -> inside each business folder a dev and a prod project (or dev/prod sub-folders when a unit grows to many projects). Platform holds the Shared VPC host project and the central logging project. Folders are the unit of inherited policy and IAM, so each level groups what should be governed alike."
            ),
            part(
              "Where the two policies go",
              "Sets the external-IP restriction and the resource-location restriction as organization policies at the organization node so every folder and project inherits them, and explains inheritance (policies flow down the hierarchy) rather than setting them per project.",
              "Both at the organization node: the policy that restricts VM external IP access (set to deny all) and the policy that restricts resource locations (allowed values limited to European regions). Set once at the top, they are inherited by every folder and project below, including ones created later, which per-project settings would miss."
            ),
            part(
              "The Online dev exception",
              "Overrides the external-IP policy only on the Online dev project (or folder) by setting a policy there that allows it, and notes that a child can override an inherited policy only where the constraint permits it and that the exception should be as narrow as possible.",
              "On the Online dev project only, set the same external-IP constraint to allow (or allow for listed instances), which overrides the inherited deny for that project alone. The location policy stays inherited. Keep the override at the lowest level that needs it so prod never inherits it."
            ),
            part(
              "Commands",
              "Gives gcloud resource-manager folders create with --display-name and --organization, gcloud projects create with --folder (and optionally --name), and links billing with gcloud billing projects link --billing-account; policies are applied with gcloud org-policies set-policy from a YAML file naming the constraint on the organization or project resource.",
              "gcloud resource-manager folders create --display-name=Stores --organization=123456789012\ngcloud projects create tollgate-stores-dev --name=\"Stores dev\" --folder=FOLDER_ID\ngcloud billing projects link tollgate-stores-dev --billing-account=0X0X0X-0X0X0X-0X0X0X\nThen gcloud org-policies set-policy policy.yaml, where the YAML names organizations/123456789012/policies/CONSTRAINT with the deny (or allowed-values) rule, and a second file for the Online dev project's override."
            ),
          ],
        },
      ],
    },
    {
      slug: "billing-budget-and-alerts",
      objective: "Establishing billing budgets and alerts",
      kind: "build",
      title: "Set up a budget with threshold alerts for a project",
      brief:
        "Pelham Data Co. is a fictional analytics start-up. Its production project, pelham-prod, is linked to billing account 0X0X0X-0X0X0X-0X0X0X and is expected to spend about 8,000 USD a month. The founder wants an email when actual spend passes half and 90% of that amount, an earlier warning when the forecast for the month passes the full amount, and the alert also sent to a Pub/Sub topic so a Cloud Run function can post it to the team chat. She also asks whether the budget will stop spending once it is reached.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the gcloud command for the budget, say who receives alerts and how, and answer the founder's question.",
          parts: [
            part(
              "The budget command",
              "Uses gcloud billing budgets create with --billing-account, --display-name, --budget-amount=8000USD, --filter-projects scoped to pelham-prod, and --threshold-rule=percent=0.5 and percent=0.9 for actual spend plus a rule with basis=forecasted-spend at percent=1.0.",
              "gcloud billing budgets create --billing-account=0X0X0X-0X0X0X-0X0X0X --display-name=\"pelham-prod monthly\" --budget-amount=8000USD --filter-projects=projects/PELHAM_PROD_NUMBER --threshold-rule=percent=0.5 --threshold-rule=percent=0.9 --threshold-rule=percent=1.0,basis=forecasted-spend"
            ),
            part(
              "Who is alerted and how",
              "Explains that by default budget alerts go to billing account administrators and users by email, that Cloud Monitoring notification channels can add specific people, and that programmatic notifications go to a Pub/Sub topic (the budget's Pub/Sub option) which the Cloud Run function subscribes to.",
              "By default the threshold emails go to the billing account's administrators and users. Add a Cloud Monitoring notification channel for the founder's address. For the chat post, connect the budget to a Pub/Sub topic (the budget's programmatic notifications setting); the function subscribes to that topic and posts the message."
            ),
            part(
              "Does it stop spending?",
              "States clearly that a budget only notifies and never stops resources or disables billing on its own, and that automated action (for example a function that disables billing on the project) must be built deliberately and carefully because it stops all services.",
              "No. A budget is an alert, not a cap: resources keep running and billing continues past 100%. If Pelham wants spending to stop, the Pub/Sub message must drive something that acts, such as a function that disables billing on the project, which halts every service in it and should be used with great care."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Planning and Implementing a Cloud Solution (30%)
    // ----------------------------------------------------------------------
    {
      slug: "choose-compute-per-workload",
      objective:
        "Choosing the right compute option for a workload: Compute Engine, GKE, Cloud Run, Cloud Run functions, or Agent Runtime on the Gemini Enterprise Agent Platform",
      kind: "build",
      title: "Choose a compute option for each of four workloads",
      brief:
        "Marlin Freight is a fictional shipping broker consolidating onto Google Cloud. Four workloads need a home. (1) A licensed route-optimisation binary that needs a specific Windows Server version, a GPU, and a mapped network drive. (2) A dozen microservices the platform team already runs as containers with a service mesh, needing fine control over networking, sidecars and scheduling. (3) A stateless HTTPS API with traffic that is near zero at night and spiky by day, which the team wants to run without managing clusters. (4) A short function that must run whenever a shipping document lands in a Cloud Storage bucket, extract its text and write a Firestore record. Pick one option per workload and name the deciding factor and the near-miss alternative.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the compute option, deciding factor and the rejected near-miss for each workload.",
          parts: [
            part("Route-optimisation binary", "Chooses Compute Engine because a specific OS version, a GPU attachment and a mapped drive need a VM; rejects containers/serverless as unable to host it.", "Compute Engine: a Windows VM with an attached GPU and the network drive mounted. The binary dictates the OS and hardware, which only a VM gives you; GKE or Cloud Run cannot host a licensed Windows binary with a mapped drive."),
            part("Containerised microservices", "Chooses GKE because the team needs Kubernetes-level control (mesh, sidecars, scheduling) that Cloud Run abstracts away.", "GKE: the team already runs containers with a mesh and needs sidecars, scheduling and network control. Cloud Run would be simpler but hides exactly the knobs they rely on."),
            part("Spiky stateless API", "Chooses Cloud Run because it scales to zero and out with requests without cluster management; notes GKE Autopilot as the near-miss that still leaves a cluster to own.", "Cloud Run: a stateless HTTPS container that scales to zero overnight and out by day, with no cluster to manage. GKE Autopilot could run it but still leaves a cluster to own for a service that does not need Kubernetes."),
            part("Document-triggered function", "Chooses Cloud Run functions (triggered by the Cloud Storage object-finalised event through Eventarc) for a short event-driven task; notes that a Cloud Run service with an Eventarc trigger is the equivalent and that Agent Runtime is for hosting AI agents, not file processing.", "Cloud Run functions, triggered by the bucket's object-finalised event via Eventarc: one short piece of code per event, nothing running between files. A Cloud Run service with the same Eventarc trigger is the equivalent for a full container. Agent Runtime on the Gemini Enterprise Agent Platform is for deploying AI agents, not this."),
          ],
        },
      ],
    },
    {
      slug: "autoscaled-regional-mig",
      objective: "Creating an autoscaled managed instance group from an instance template",
      kind: "build",
      title: "Create an autoscaled, self-healing managed instance group",
      brief:
        "Harbourside Media, a fictional news site, runs its web tier on virtual machines in project hs-prod. You must build it properly: a template for e2-medium instances from the Debian 12 image family on subnet web-subnet (VPC hs-vpc) in europe-west1, tagged http-server, with a startup script in startup.sh, running as service account web@hs-prod.iam.gserviceaccount.com; then a regional managed instance group across europe-west1's zones, starting at 3 instances and scaling between 3 and 12 on 60% average CPU, with autohealing that replaces an instance whose HTTP health check on port 80 at /healthz fails, giving new instances 120 seconds to boot before checks count.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the gcloud commands for the template, the group, autoscaling and autohealing, and explain two choices.",
          parts: [
            part(
              "Instance template",
              "Uses gcloud compute instance-templates create with --machine-type=e2-medium, --image-family=debian-12 --image-project=debian-cloud, --network-interface naming the subnet (and no external address if appropriate), --tags=http-server, --metadata-from-file=startup-script=startup.sh, --service-account and --scopes.",
              "gcloud compute instance-templates create web-tpl --machine-type=e2-medium --image-family=debian-12 --image-project=debian-cloud --network-interface=subnet=web-subnet,no-address --tags=http-server --metadata-from-file=startup-script=startup.sh --service-account=web@hs-prod.iam.gserviceaccount.com --scopes=cloud-platform --region=europe-west1"
            ),
            part(
              "Regional group and autoscaling",
              "Creates a regional MIG with gcloud compute instance-groups managed create --template --size=3 --region=europe-west1, then gcloud compute instance-groups managed set-autoscaling with --min-num-replicas=3 --max-num-replicas=12 --target-cpu-utilization=0.6 (and the same --region).",
              "gcloud compute instance-groups managed create web-mig --template=web-tpl --size=3 --region=europe-west1\ngcloud compute instance-groups managed set-autoscaling web-mig --region=europe-west1 --min-num-replicas=3 --max-num-replicas=12 --target-cpu-utilization=0.6"
            ),
            part(
              "Autohealing",
              "Creates an HTTP health check (gcloud compute health-checks create http with --port=80 --request-path=/healthz) and attaches it with gcloud compute instance-groups managed update --health-check and --initial-delay=120, and notes the firewall must allow Google's health-check probe ranges to port 80 on the http-server tag.",
              "gcloud compute health-checks create http web-hc --port=80 --request-path=/healthz\ngcloud compute instance-groups managed update web-mig --region=europe-west1 --health-check=web-hc --initial-delay=120\nA firewall rule must allow the documented Google health-check probe source ranges to tcp:80 on the http-server tag, or every instance will look unhealthy and be recycled."
            ),
            part(
              "Two choices explained",
              "Explains regional over zonal (instances spread across zones so one zone's failure does not take the site down) and the initial delay (so a booting instance is not replaced before its startup script finishes), and that target CPU is an average across the group.",
              "Regional, not zonal: the group spreads instances across europe-west1's zones, so a zone outage leaves the site up. The 120-second initial delay stops autohealing from killing instances that are still running startup.sh. The 60% target is the group's average CPU, so the autoscaler adds instances as the average climbs past it."
            ),
          ],
        },
      ],
    },
    {
      slug: "firewall-rules-three-tier",
      objective:
        "Creating and applying VPC firewall rules and Cloud NGFW policies (action, source, destination, targets, protocols, ports)",
      kind: "build",
      title: "Write the VPC firewall rules for a three-tier application",
      brief:
        "Cobalt Bakery, a fictional online bakery, runs in custom-mode VPC cb-vpc. Web instances carry the tag web and listen on tcp:443; application instances run as service account app-sa@cb-prod.iam.gserviceaccount.com and listen on tcp:8080; a PostgreSQL VM runs as db-sa@cb-prod.iam.gserviceaccount.com on tcp:5432. Requirements: the internet may reach the web tier on 443 only; only the web tier may reach the app tier on 8080; only the app tier may reach the database on 5432; administrators connect to any VM over SSH only through IAP TCP forwarding; and everything else inbound is denied and logged. In a VPC network, created rules have priority 0-65535 (default 1000), a lower number wins, a deny beats an allow only at the same priority, and the implied rules are allow-all egress and deny-all ingress.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the rules as gcloud commands, with priorities, and explain the design decisions.",
          parts: [
            part(
              "Internet to web, and admins via IAP",
              "Allows tcp:443 from 0.0.0.0/0 to --target-tags=web, and allows tcp:22 from IAP's TCP-forwarding source range (not from 0.0.0.0/0) to all instances or an admin target, both with --direction=INGRESS.",
              "gcloud compute firewall-rules create allow-web-443 --network=cb-vpc --direction=INGRESS --action=ALLOW --rules=tcp:443 --source-ranges=0.0.0.0/0 --target-tags=web --priority=1000\ngcloud compute firewall-rules create allow-iap-ssh --network=cb-vpc --direction=INGRESS --action=ALLOW --rules=tcp:22 --source-ranges=IAP_TCP_FORWARDING_RANGE --priority=1000\n(The IAP range is the one documented for TCP forwarding; SSH is never opened to 0.0.0.0/0.)"
            ),
            part(
              "Web to app, app to database",
              "Uses identity-based matching: allows tcp:8080 with --source-tags=web (or the web tier's service account) and --target-service-accounts=app-sa; allows tcp:5432 with --source-service-accounts=app-sa and --target-service-accounts=db-sa; explains service accounts are preferred over tags because changing a tag needs far weaker permissions than changing a VM's service account.",
              "gcloud compute firewall-rules create allow-web-to-app --network=cb-vpc --direction=INGRESS --action=ALLOW --rules=tcp:8080 --source-tags=web --target-service-accounts=app-sa@cb-prod.iam.gserviceaccount.com\ngcloud compute firewall-rules create allow-app-to-db --network=cb-vpc --direction=INGRESS --action=ALLOW --rules=tcp:5432 --source-service-accounts=app-sa@cb-prod.iam.gserviceaccount.com --target-service-accounts=db-sa@cb-prod.iam.gserviceaccount.com\nService accounts identify the tier more safely than tags: anyone who can edit a VM can change its tags, while changing its service account needs stronger permissions."
            ),
            part(
              "Deny and log the rest",
              "Adds an explicit ingress deny-all rule (all protocols from 0.0.0.0/0) at a low priority such as 65000, above the implied deny, with --enable-logging, so denied attempts are visible; notes the implied deny-ingress exists but is not logged and cannot be edited.",
              "gcloud compute firewall-rules create deny-all-ingress-logged --network=cb-vpc --direction=INGRESS --action=DENY --rules=all --source-ranges=0.0.0.0/0 --priority=65000 --enable-logging\nThe implied deny-ingress rule already blocks the rest, but it does not log; an explicit deny at a lower priority than the allows (higher number) records what was blocked."
            ),
            part(
              "Why the priorities work",
              "Explains that the allow rules at 1000 are evaluated before the deny at 65000 because lower numbers win, that no two rules here share a priority with opposite actions, and that egress stays on the implied allow unless the bakery wants to restrict it.",
              "Allows at 1000 beat the deny at 65000 because the lower number has higher priority; the deny-beats-allow tie rule never applies since nothing shares a priority. Egress is left to the implied allow-all; if the database should never reach the internet, add an egress deny for db-sa later."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Ensuring Successful Operation of a Cloud Solution (30%)
    // ----------------------------------------------------------------------
    {
      slug: "snapshot-schedule-and-images",
      objective: "Working with snapshots and images: create, view, delete, schedule",
      kind: "build",
      title: "Schedule disk snapshots and build a golden image",
      brief:
        "Quillon Accounting is a fictional firm whose file server VM files-01 (zone europe-west2-b, boot disk files-01) in project quillon-ops has never been backed up. The IT lead wants: a nightly snapshot at 02:00 with snapshots kept for 14 days, snapshots stored in the EU multi-region, the schedule to stop creating snapshots if the disk is deleted but keep the existing ones; a one-off snapshot now before a risky upgrade; a way to list and remove the manual snapshot once the upgrade is confirmed; and a reusable image from the patched boot disk so new file servers start from it.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the gcloud commands for the schedule, the manual snapshot, the clean-up and the image, and explain snapshot versus image.",
          parts: [
            part(
              "Snapshot schedule",
              "Creates a resource policy with gcloud compute resource-policies create snapshot-schedule using --daily-schedule --start-time=02:00 --max-retention-days=14 --storage-location=eu --on-source-disk-delete=keep-auto-snapshots (region europe-west2), then attaches it with gcloud compute disks add-resource-policies --resource-policies on the disk in its zone.",
              "gcloud compute resource-policies create snapshot-schedule nightly-14d --region=europe-west2 --daily-schedule --start-time=02:00 --max-retention-days=14 --storage-location=eu --on-source-disk-delete=keep-auto-snapshots\ngcloud compute disks add-resource-policies files-01 --zone=europe-west2-b --resource-policies=nightly-14d"
            ),
            part(
              "Manual snapshot before the upgrade",
              "Creates it with gcloud compute disks snapshot (or gcloud compute snapshots create) naming the source disk and zone, optionally with --storage-location=eu, and notes the first snapshot is full and later ones incremental.",
              "gcloud compute disks snapshot files-01 --zone=europe-west2-b --snapshot-names=files-01-pre-upgrade --storage-location=eu\nSnapshots are incremental after the first, so the manual one costs only what has changed since the last scheduled one."
            ),
            part(
              "View and delete",
              "Lists with gcloud compute snapshots list (filtered by source disk or name) and describes one with gcloud compute snapshots describe, then deletes the manual snapshot with gcloud compute snapshots delete; notes deleting one snapshot in a chain is safe because the data later snapshots need is preserved.",
              "gcloud compute snapshots list --filter=\"sourceDisk~files-01\"\ngcloud compute snapshots describe files-01-pre-upgrade\ngcloud compute snapshots delete files-01-pre-upgrade\nDeleting a snapshot in the middle of a chain is safe: Compute Engine moves the blocks later snapshots depend on."
            ),
            part(
              "Golden image, and snapshot versus image",
              "Creates the image with gcloud compute images create --source-disk --source-disk-zone (optionally --family and --storage-location), and explains that snapshots are point-in-time backups of a disk while images are templates for creating new boot disks, which is why the image is what new servers start from.",
              "gcloud compute images create files-server-2026-11 --source-disk=files-01 --source-disk-zone=europe-west2-b --family=files-server --storage-location=eu\nA snapshot is a backup of a disk at a moment in time, used to restore or copy that disk; an image is a template for new boot disks, versioned through a family, which is what new file servers should start from."
            ),
          ],
        },
      ],
    },
    {
      slug: "cloud-run-rollout-and-traffic-split",
      objective:
        "Deploying new versions of a Cloud Run application, and adjusting traffic-splitting across Cloud Run, Cloud Run functions, and GKE",
      kind: "build",
      title: "Roll out a new Cloud Run revision with a traffic split",
      brief:
        "Seabright Tickets, a fictional events company, runs its checkout API as the Cloud Run service checkout in europe-west1 (project sb-prod). The new build is europe-west1-docker.pkg.dev/sb-prod/apps/checkout:2.4.0. The release plan: deploy the new revision so it receives no production traffic at first, give testers a stable URL to hit only the new revision, then send 10% of live traffic to it, then 100% once the error rate holds, and be able to put all traffic back on the previous revision in one command if it does not. The service currently runs revision checkout-00041-abc.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the gcloud commands for each stage of the plan and explain what a tag gives the testers.",
          parts: [
            part(
              "Deploy without traffic, with a tag",
              "Uses gcloud run deploy checkout --image=... --region=europe-west1 --no-traffic --tag=candidate so the new revision is created, serves no live traffic and gets a tag.",
              "gcloud run deploy checkout --image=europe-west1-docker.pkg.dev/sb-prod/apps/checkout:2.4.0 --region=europe-west1 --no-traffic --tag=candidate"
            ),
            part(
              "What the tag gives testers",
              "Explains that a tagged revision gets its own URL (the tag prefixed to the service URL) that routes only to that revision regardless of the traffic split, so testers can exercise 2.4.0 while customers see the old revision.",
              "The tag creates a dedicated URL for that revision (candidate---<service-url>), which always routes to 2.4.0 no matter what the live split is. Testers hit it; customers keep hitting the current revision."
            ),
            part(
              "10%, then 100%",
              "Uses gcloud run services update-traffic checkout --region=europe-west1 --to-tags=candidate=10 (or --to-revisions=<new>=10) and later --to-tags=candidate=100 or --to-latest, with the remainder staying on the previous revision automatically.",
              "gcloud run services update-traffic checkout --region=europe-west1 --to-tags=candidate=10\n(watch error rate and latency, then)\ngcloud run services update-traffic checkout --region=europe-west1 --to-latest\nThe unassigned percentage stays on the revision that had it, so 10% to the candidate leaves 90% on checkout-00041-abc."
            ),
            part(
              "Rollback",
              "Rolls back with gcloud run services update-traffic checkout --to-revisions=checkout-00041-abc=100, noting no redeploy is needed because the old revision still exists, and that this is what makes keeping named revisions valuable.",
              "gcloud run services update-traffic checkout --region=europe-west1 --to-revisions=checkout-00041-abc=100\nNo rebuild or redeploy: the previous revision is still there, so routing 100% back to it is instant."
            ),
          ],
        },
      ],
    },
    {
      slug: "investigate-with-cloud-logging",
      objective: "Viewing and filtering logs, and inspecting specific log message details, in Cloud Logging",
      kind: "case",
      title: "Investigate failed checkouts in Cloud Logging",
      brief:
        "Seabright Tickets (fictional) reports that some customers saw errors on checkout between 14:00 and 14:30 UTC today. The checkout API runs as the Cloud Run service checkout in europe-west1, project sb-prod. You have the Logs Explorer open and nothing else.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Support can only say 'some payments failed around two o'clock'. You need to find the failing requests first.",
          ask: "Write the Logs Explorer query that finds the server errors for this service in that window, and say which fields narrow it.",
          parts: [
            part(
              "The query",
              "Filters on resource.type=\"cloud_run_revision\" and resource.labels.service_name=\"checkout\" (optionally location), restricts the time range to 14:00-14:30 UTC (via the time picker or a timestamp>= and timestamp<= clause), and selects errors with severity>=ERROR and/or httpRequest.status>=500.",
              "resource.type=\"cloud_run_revision\"\nresource.labels.service_name=\"checkout\"\nresource.labels.location=\"europe-west1\"\nhttpRequest.status>=500\ntimestamp>=\"2026-11-07T14:00:00Z\" AND timestamp<=\"2026-11-07T14:30:00Z\"\nThe resource type and service name pick the service, the status filter picks server-side failures, and the timestamps (or the time picker) bound the window."
            ),
          ],
        },
        {
          text: "The query returns 212 request-log entries with status 502. Expanding one shows httpRequest.requestUrl=/api/pay, httpRequest.latency=\"60.001s\", and a trace field. The application's own log lines are not in these entries.",
          ask: "What does that entry tell you, and how do you get to the application's log lines for the same request?",
          parts: [
            part(
              "Reading the entry",
              "Reads a 60-second latency with 502 as the request hitting the service's request timeout (the container did not answer in time) on the /api/pay path, rather than a crash, and notes the entry is the platform's request log, not the app's.",
              "A 502 after exactly 60 seconds on /api/pay says the request hit the service's request timeout: the container never answered in time. This is Cloud Run's request log, written by the platform, so the app's own messages are elsewhere."
            ),
            part(
              "Correlating to application logs",
              "Uses the trace field: filters on trace=\"projects/sb-prod/traces/<id>\" (or the Logs Explorer's 'show entries for this trace' action) to pull every log line that shares the trace, including the app's stdout/stderr lines written as structured logs with the trace field.",
              "Copy the trace value and query trace=\"projects/sb-prod/traces/TRACE_ID\" (the explorer offers this from the entry's menu). Every entry sharing the trace appears together, including the application's own lines if it logs structured JSON with the logging.googleapis.com/trace field set from the request's trace header."
            ),
          ],
        },
        {
          text: "The correlated application lines show, for each failed request, 'payment gateway call started' and then nothing until the timeout. The team fixes the gateway client. The finance lead asks that this kind of failure be found without someone reading logs next time, and that the raw entries be kept longer than the default.",
          ask: "What do you set up for detection and for retention?",
          parts: [
            part(
              "Detection",
              "Creates a log-based metric (gcloud logging metrics create with --log-filter matching the 5xx request entries for the service) and an alerting policy on it, or an alert on the built-in Cloud Run request count metric filtered to 5xx responses.",
              "gcloud logging metrics create checkout-5xx --description=\"checkout 5xx\" --log-filter='resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"checkout\" AND httpRequest.status>=500'\nthen a Cloud Monitoring alerting policy on that metric (or on Cloud Run's request_count metric filtered to 5xx) with a notification channel, so the next burst pages someone."
            ),
            part(
              "Retention",
              "Routes the service's logs with a sink (gcloud logging sinks create with a --log-filter) to a user-defined log bucket with a longer retention period, or to BigQuery or Cloud Storage for long-term analysis, rather than changing the _Default bucket for everything.",
              "Create a dedicated log bucket with a longer retention period and a sink that routes only the checkout service's entries to it (gcloud logging sinks create checkout-sink logging.googleapis.com/projects/sb-prod/locations/europe-west1/buckets/checkout-logs --log-filter='resource.labels.service_name=\"checkout\"'), or route to BigQuery if finance wants to query them. That keeps the longer retention, and its cost, to the logs that need it."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Configuring Access and Security (20%)
    // ----------------------------------------------------------------------
    {
      slug: "least-privilege-service-account",
      objective: "Using service accounts in IAM policies with minimum permissions",
      kind: "build",
      title: "Give a VM a least-privilege service account",
      brief:
        "Fennimore Labs is a fictional research company. A batch VM, ingest-01, in project fl-data reads CSV files from the Cloud Storage bucket fl-raw-uploads and publishes one Pub/Sub message per file to the topic ingest-events. Today the VM runs as the default Compute Engine service account, which has the Editor role on the project, with the default access scopes. A reviewer has asked for the minimum access that still lets the job work, and for the change to be made without downloading any key file.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design and implement the service account, its grants and the VM change, and explain what was wrong before.",
          parts: [
            part(
              "Create a dedicated service account",
              "Creates a new user-managed service account with gcloud iam service-accounts create (display name), one per workload, instead of reusing the default Compute Engine service account.",
              "gcloud iam service-accounts create ingest-sa --display-name=\"CSV ingest batch\" --project=fl-data\nOne account for this job alone, so its permissions describe exactly what the job does."
            ),
            part(
              "Grant the minimum roles on the narrowest resources",
              "Grants roles/storage.objectViewer on the bucket only (gcloud storage buckets add-iam-policy-binding) and roles/pubsub.publisher on the topic only (gcloud pubsub topics add-iam-policy-binding), not project-wide and not Editor.",
              "gcloud storage buckets add-iam-policy-binding gs://fl-raw-uploads --member=serviceAccount:ingest-sa@fl-data.iam.gserviceaccount.com --role=roles/storage.objectViewer\ngcloud pubsub topics add-iam-policy-binding ingest-events --member=serviceAccount:ingest-sa@fl-data.iam.gserviceaccount.com --role=roles/pubsub.publisher\nBoth bindings sit on the resource, not the project: the account can read one bucket and publish to one topic and nothing else."
            ),
            part(
              "Attach it to the VM, no key file",
              "Attaches the account with gcloud compute instances set-service-account (VM stopped) using --service-account and --scopes=cloud-platform, explaining that the VM obtains short-lived credentials from the metadata server so no key is ever created, and that with the cloud-platform scope IAM roles alone decide access.",
              "gcloud compute instances stop ingest-01 --zone=ZONE\ngcloud compute instances set-service-account ingest-01 --zone=ZONE --service-account=ingest-sa@fl-data.iam.gserviceaccount.com --scopes=cloud-platform\ngcloud compute instances start ingest-01 --zone=ZONE\nThe VM gets short-lived tokens from the metadata server, so no key file exists to leak. With the cloud-platform scope, the IAM roles above are the only limit, which is what we want."
            ),
            part(
              "What was wrong",
              "Explains that the default Compute Engine service account with Editor let a compromised VM read, change or delete almost anything in the project, and that legacy access scopes are a coarse, outdated limit compared with IAM roles.",
              "Editor on the default account meant a bug or compromise on ingest-01 could change or delete nearly anything in fl-data. Access scopes are a coarse legacy control; the right limit is IAM roles on specific resources, which is what the new account has."
            ),
          ],
        },
      ],
    },
    {
      slug: "service-account-impersonation",
      objective: "Managing service account impersonation",
      kind: "build",
      title: "Set up service account impersonation for a deployment task",
      brief:
        "Wrenfield Software is a fictional company. Its release engineer, priya@wrenfield.example, must occasionally run a deployment script that needs the permissions of deployer@wf-prod.iam.gserviceaccount.com, which can update the production Cloud Run service. Today she has a downloaded JSON key for that account on her laptop. Security wants the key gone, Priya to use the account's permissions only when running the script, and every such use to be traceable to her in the audit logs.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Set up impersonation end to end: the grant, how Priya runs commands, what the logs show, and the clean-up.",
          parts: [
            part(
              "The grant",
              "Grants Priya roles/iam.serviceAccountTokenCreator on the deployer service account itself (gcloud iam service-accounts add-iam-policy-binding on the SA resource), not on the project, so she can mint tokens for that one account only.",
              "gcloud iam service-accounts add-iam-policy-binding deployer@wf-prod.iam.gserviceaccount.com --member=user:priya@wrenfield.example --role=roles/iam.serviceAccountTokenCreator\nThe binding is on the service account, so Priya can impersonate deployer and no other account."
            ),
            part(
              "Running the script",
              "Has Priya authenticate as herself and add --impersonate-service-account=deployer@... to the gcloud commands (or set the auth/impersonate_service_account property for the session), so gcloud requests short-lived tokens for the account on her behalf.",
              "gcloud run deploy checkout --image=... --region=europe-west1 --impersonate-service-account=deployer@wf-prod.iam.gserviceaccount.com\n(or gcloud config set auth/impersonate_service_account deployer@wf-prod.iam.gserviceaccount.com for the session). Priya stays signed in as herself; gcloud fetches short-lived tokens for deployer only while the commands run."
            ),
            part(
              "Traceability",
              "Explains that Cloud Audit Logs record the token generation (who impersonated which account) once IAM Data Access audit logs are enabled -- they are off by default -- and that actions performed with the impersonated token carry the service account as principal with Priya's identity visible in the delegation (first-party principal) information, so the change is attributable to her.",
              "Turn on Data Access audit logs for IAM (the Service Account Credentials API) first: they are off by default, and without them the token generation is not logged. With them on, the audit log records the GenerateAccessToken call with Priya as the caller and deployer as the target, and the deployment entry shows deployer as the principal with the delegation chain pointing back to priya@wrenfield.example. Both halves together make the change hers."
            ),
            part(
              "Clean-up",
              "Deletes the downloaded key (gcloud iam service-accounts keys delete with the key ID) and recommends an organization policy preventing new service account key creation, so the team cannot drift back to key files.",
              "gcloud iam service-accounts keys list --iam-account=deployer@wf-prod.iam.gserviceaccount.com, then gcloud iam service-accounts keys delete KEY_ID --iam-account=deployer@wf-prod.iam.gserviceaccount.com, and ask for the organization policy that disables service account key creation so nobody can download a new one."
            ),
          ],
        },
      ],
    },
  ],
};
