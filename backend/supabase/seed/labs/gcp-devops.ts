import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";

// REQ-157: Google Cloud Professional Cloud DevOps Engineer.
//
// Aligned to the Professional Cloud DevOps Engineer exam guide (PDF, read
// 2026-11-07): five sections at 20/25/18/25/12. The current PDF says a new
// guide applies to exams taken "on or after November 23" (no year, no link
// found); the repo's outline matches the PDF that is live today, and that
// note is reported to the lead rather than acted on here. SRE practice is
// the heart of this exam, so the SLO and error-budget labs show the
// arithmetic and every number is checked.
// Density (docs/labs.md, policy "hybrid"): 2 / 3 / 2 / 2 / 2.
//
// Figures, verified 2026-11-07:
//   - Burn-rate alerting for a 30-day SLO: 14.4x over 1 h (2% of budget),
//     6x over 6 h (5%), 1x over 3 d (10%); short windows 5 m / 30 m / 6 h;
//     at burn rate 1,000 a 99.9% budget is gone in about 43 minutes
//     (sre.google/workbook/alerting-on-slos). Cloud Monitoring's SLO alerting
//     defines error budget as (1 - goal) x eligible events and burn rate
//     normalised so that >1 means out of SLO if sustained; fast-burn 10x on
//     1-2 h, slow-burn 2x on 24 h as starting points
//     (docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/alerting-on-budget-burn-rate).
//   - 99.9% over 30 days = 43.2 minutes; 99.99% = 4.3 minutes
//     (docs.cloud.google.com/architecture/infra-reliability-guide/building-blocks).
//   - Cloud Logging: $0.50/GiB ingestion after 50 GiB free per project per
//     month, retention $0.01/GiB/month beyond 30 days, _Required bucket free
//     at 400 days, vended network logs $0.25/GiB; user-defined log-based
//     metrics are chargeable custom metrics
//     (cloud.google.com/products/observability/pricing; docs.cloud.google.com/logging/quotas).
//   - Committed use discounts: resource-based up to 55% (70% memory-
//     optimised); compute flexible CUDs 28% (1-year) / 46% (3-year) on E2
//     (docs.cloud.google.com/compute/docs/instances/committed-use-discounts-overview).
//   - Spot VMs up to 91% off, preemption at any time, no SLA
//     (docs.cloud.google.com/compute/docs/instances/spot).
//   - Cloud Run concurrency default 80, up to 1,000
//     (docs.cloud.google.com/run/docs/about-concurrency).
// Commands were checked against the installed Google Cloud SDK (570.0.0).

export const GCPDEVOPS_LABS: SeedLabSet = {
  trackCode: "GCPDEVOPS",
  sources: [
    "https://services.google.com/fh/files/misc/professional_cloud_devops_engineer_exam_guide_english.pdf",
    "https://cloud.google.com/learn/certification/cloud-devops-engineer",
    "https://sre.google/workbook/alerting-on-slos/",
    "https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/alerting-on-budget-burn-rate",
    "https://docs.cloud.google.com/architecture/infra-reliability-guide/building-blocks",
    "https://cloud.google.com/products/observability/pricing",
    "https://docs.cloud.google.com/logging/quotas",
    "https://docs.cloud.google.com/compute/docs/instances/committed-use-discounts-overview",
    "https://docs.cloud.google.com/compute/docs/instances/spot",
    "https://docs.cloud.google.com/run/docs/about-concurrency",
  ],
  labs: [
    // ----------------------------------------------------------------------
    // Bootstrapping and Maintaining a Google Cloud Organization (20%)
    // ----------------------------------------------------------------------
    {
      slug: "iam-and-org-policy-baseline",
      objective: "Designing IAM roles and organization-level policies",
      kind: "build",
      title: "Design the IAM and organization-policy baseline for a new organization",
      brief:
        "Verdant Energy is a fictional utility bootstrapping Google Cloud. Findings from the first week: individual users were granted Owner on projects by email address; a developer downloaded a service-account key to run scripts; a test bucket was shared with a personal Gmail account; and a team created VMs with public IPs in a US region although the company operates only in Europe. The platform lead asks for a baseline that prevents all four classes of mistake across every current and future project, with a break-glass path for emergencies.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the IAM model, the organization policies and their placement, and the break-glass path.",
          parts: [
            part(
              "IAM model",
              "Grants roles to Google Groups (from Cloud Identity) rather than individuals, uses predefined or custom roles scoped to the job instead of basic roles (no Owner/Editor for daily work), places grants at the folder or project level matching the team's scope, and reviews grants regularly (for example with IAM Recommender's role recommendations).",
              "Roles go to groups, never to people: a group per team and environment (gcp-payments-dev, gcp-payments-prod) bound at the folder or project that matches its scope. Daily work uses predefined roles (or custom roles trimmed from them), not Owner or Editor. Membership is managed in Cloud Identity, and IAM Recommender's excess-permission findings are reviewed each quarter."
            ),
            part(
              "Organization policies and where",
              "Sets at the organization node: disable service-account key creation; domain-restricted sharing (only the company's Cloud Identity domain may be granted IAM roles); restrict VM external IP access; and restrict resource locations to European locations; explains inheritance means every new folder and project is covered, and that an exception is set lower in the hierarchy only where justified.",
              "At the organization node: the constraint that disables service-account key creation (so keys cannot be downloaded), domain-restricted sharing limited to Verdant's own identity domain (so a personal Gmail account can never appear in a policy), the constraint restricting VM external IP access (deny by default), and the resource-locations constraint allowing only EU locations. Set once at the top they are inherited by everything created later. If a project truly needs a public IP, the override is set on that project alone and reviewed."
            ),
            part(
              "Why organization level, not project checks",
              "Explains policies inherited from the organization apply before anyone acts and cannot be forgotten on a new project, whereas scanning projects after the fact finds mistakes only after they exist; policies are preventive, audits are detective, and both are kept.",
              "A policy inherited from the organization blocks the action at the API, in every project, including ones created tomorrow. Checking projects afterwards only tells you a key was downloaded or a bucket was shared after it happened. Keep the detective controls (Security Command Center findings), but the baseline must be preventive."
            ),
            part(
              "Break-glass",
              "Defines a tightly controlled emergency path: a dedicated break-glass group or account with elevated roles granted through a time-bound mechanism (for example a conditional IAM binding with an expiry or Privileged Access Manager), with MFA, alerting on its use, and a mandatory postmortem; the organization policies themselves are changed only by the organization-policy administrators via change control.",
              "An emergency group holds no standing power; when needed, a member is granted elevated roles for a bounded period (an IAM condition with an expiry, or a Privileged Access Manager entitlement with justification), with MFA enforced, an alert when the grant is used, and a written review afterwards. Organization policies are changed only by the organization-policy admin group through the normal change process, never by the break-glass account."
            ),
          ],
        },
      ],
    },
    {
      slug: "cloud-deploy-pipeline-design",
      objective: "Designing continuous delivery with Cloud Deploy, including Kustomize and Skaffold",
      kind: "build",
      title: "Design a Cloud Deploy pipeline with Skaffold profiles and Kustomize overlays",
      brief:
        "Verdant Energy (fictional) runs a billing service on three GKE clusters: dev, staging and prod, each in its own project. Requirements: one pipeline promotes the same image through dev -> staging -> prod; each environment needs different replica counts, resource limits and a config map; a human must approve before production; production rollouts must be canaried; and auditors must be able to see who promoted and approved what. The team already builds images with Cloud Build.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the delivery pipeline, the Skaffold/Kustomize layout, the production stage, and the audit trail.",
          parts: [
            part(
              "Delivery pipeline and targets",
              "Defines a Cloud Deploy DeliveryPipeline with a serialPipeline of three stages (dev, staging, prod) and a Target per GKE cluster referencing its cluster and project; a release is created once from the built image and promoted through the stages.",
              "A DeliveryPipeline resource with serialPipeline stages dev -> staging -> prod and three Target resources, each pointing at one GKE cluster in its project. Cloud Build finishes by creating a release (gcloud deploy releases create billing-$SHORT_SHA --delivery-pipeline=billing --region=europe-west1 --images=billing=IMAGE@sha256:...), and the same release is promoted stage to stage (gcloud deploy releases promote), so the artifact never changes between environments."
            ),
            part(
              "Skaffold and Kustomize",
              "Uses one skaffold.yaml with a profile per environment, each pointing at a Kustomize overlay directory (base plus overlays/dev, overlays/staging, overlays/prod) that patches replicas, resources and the config map; each stage's profiles field selects its profile so the same release renders differently per target.",
              "skaffold.yaml declares manifests with kustomize paths and three profiles (dev, staging, prod), each setting the overlay path. The repo holds kustomize/base with the Deployment, Service and ConfigMap, and overlays per environment that patch replica count, resource requests/limits and the config map values. In the pipeline, each stage lists its profile (profiles: [prod]), so Cloud Deploy renders the prod overlay for the prod target from the same release."
            ),
            part(
              "Production stage",
              "Sets requireApproval: true on the prod target so a rollout waits for gcloud deploy rollouts approve, and configures a canary strategy on the prod stage (for example percentages 10, 50 then 100, with verification) so traffic shifts gradually and can be advanced or rolled back.",
              "The prod Target has requireApproval: true, so the rollout pauses in Approval Required until someone with the approver role runs gcloud deploy rollouts approve. The prod stage uses strategy.canary with runtimeConfig for GKE and percentages [10, 50], plus a verify step that runs smoke tests; each phase is advanced with gcloud deploy rollouts advance or, on failure, the target is rolled back with gcloud deploy targets rollback."
            ),
            part(
              "Audit trail",
              "Relies on Cloud Deploy's release and rollout history plus Cloud Audit Logs (Admin Activity) recording who created releases, promoted and approved, with IAM separating the roles (releaser vs approver) so no one approves their own change.",
              "Cloud Deploy keeps the release and rollout history per pipeline, and Cloud Audit Logs record who created each release, promoted it and approved it. Grant roles/clouddeploy.releaser to the CI service account and roles/clouddeploy.approver to the release-manager group only, so the person who approves is never the identity that created the release."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Building and Implementing CI/CD Pipelines (25%)
    // ----------------------------------------------------------------------
    {
      slug: "deployment-strategy-per-service",
      objective:
        "Choosing a deployment strategy -- canary, blue/green, rolling, traffic splitting, feature flags -- and defining success metrics from application or ML pipeline telemetry",
      kind: "build",
      title: "Choose a deployment strategy and success metrics for three services",
      brief:
        "Verdant Energy (fictional) is about to ship changes to three systems. (1) The customer billing API on GKE: a performance-sensitive refactor with no behaviour change; the team wants real-traffic evidence before full exposure. (2) The meter-reading batch processor on Compute Engine: it runs nightly against a database, cannot run two versions concurrently against the same data, and must be switchable back within minutes. (3) The web portal on Cloud Run: a redesigned sign-up page that product wants to show to 10% of visitors for two weeks to measure completion rate, and be able to turn off instantly without a deploy. Choose a strategy and define the success and abort metrics for each.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "For each system give the strategy, why it fits, and the telemetry-based success and abort criteria.",
          parts: [
            part(
              "Billing API",
              "Chooses a canary (progressive traffic shift, for example 5% -> 25% -> 100%) via Cloud Deploy or the GKE Gateway, because real-traffic evidence is wanted with limited blast radius; success metrics compare canary with baseline: p95/p99 latency, error rate, CPU/memory per request; abort if canary latency or errors exceed baseline by a set margin or burn error budget.",
              "Canary: shift 5%, then 25%, then 100% of traffic to the new version with Cloud Deploy's canary strategy on GKE, comparing canary pods against baseline pods for the same window. Success: p99 latency no worse than baseline plus 10%, error rate within the SLO, CPU per request lower (the point of the refactor). Abort automatically if canary error rate exceeds baseline by more than the SLO margin or latency regresses."
            ),
            part(
              "Batch processor",
              "Chooses blue/green: stand up the new version on a second instance group or VM set, cut over the nightly job to it in one switch (scheduler target or DNS), keep the old one idle for fast rollback; explains canary and traffic splitting do not fit a single-writer batch.",
              "Blue/green: build the new version as a separate instance group (green) while the current (blue) keeps running the nightly job; switch the job trigger to green for one run, keep blue intact and switch back in minutes if needed. A canary or a split is wrong here because two versions cannot process the same data at once. Success: the run completes within its window with record counts and checksums matching expectations; abort means pointing the trigger back to blue."
            ),
            part(
              "Web portal sign-up page",
              "Chooses a feature flag (decouple deploy from release): deploy the code dark, enable the new page for 10% of visitors by flag for two weeks, and kill it instantly by flipping the flag; defines success as completion rate for the flagged cohort versus control with a predefined sample, plus error and latency guardrails; notes Cloud Run's traffic split is per request and would not hold a visitor in one variant.",
              "Feature flag with cohort assignment: ship the new page in the same revision, turned off, then enable it for 10% of visitors (sticky per visitor) for two weeks. Success: sign-up completion rate for the cohort versus control at the predefined sample size, with error rate and latency as guardrails. Turning it off is a flag change, not a deploy. Cloud Run's percentage split assigns requests randomly, so a visitor could see both designs; that is why a flag, not a split."
            ),
            part(
              "Where the metrics come from",
              "Names the telemetry sources: Cloud Monitoring metrics per revision/pod version (labelled by version), log-based or custom metrics for business events (sign-up completed, job record count), traces for latency breakdown, and SLO burn rate as the universal abort signal; metrics must be labelled by version to compare.",
              "Every metric must be split by version: Cloud Run and GKE metrics by revision or pod label, custom or log-based metrics for business events (sign-up completed, records processed) tagged with the version, and the SLO's burn rate as the common abort trigger. Without a version label there is no baseline to compare the canary against."
            ),
          ],
        },
      ],
    },
    {
      slug: "supply-chain-binary-authorization",
      objective: "Applying software supply chain security: Binary Authorization, the SLSA framework",
      kind: "build",
      title: "Lock the software supply chain with provenance and Binary Authorization",
      brief:
        "Verdant Energy (fictional) found an image running in production that nobody could trace to a build: a developer had built it on a laptop and pushed it directly to Artifact Registry. Requirements: only images built by the company's Cloud Build pipeline from the main branch may run on the production GKE cluster and Cloud Run services; images with known critical vulnerabilities must not deploy; an emergency path must exist and be visible; and the team wants to explain the design in SLSA terms to the auditors.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the build provenance, the Binary Authorization policy, the vulnerability gate and the emergency path, and explain it in SLSA terms.",
          parts: [
            part(
              "Provenance from the build",
              "Has Cloud Build produce signed build provenance (attestations) for each image, tied to the source commit and build, pushed to Artifact Registry alongside the image; images are referenced by digest, not tag.",
              "Cloud Build generates signed provenance for every image it builds: which source commit, which build, which builder. Store it with the image in Artifact Registry and always deploy by digest (image@sha256:...), so the thing running is exactly the thing attested."
            ),
            part(
              "Binary Authorization policy",
              "Writes a Binary Authorization policy for the production cluster and Cloud Run services that denies by default and requires an attestation from a trusted attestor (one whose attestations only the Cloud Build pipeline can create, for example via the built-by-Cloud-Build check or an attestor signed in the pipeline), so laptop-built images are rejected at admission.",
              "Enable Binary Authorization on the prod cluster and the Cloud Run services with a policy whose default rule is 'require attestations' from an attestor only the pipeline can sign for (the attestor's note and signing key live in a project the developers cannot write to; or use the built-by-Cloud-Build requirement). An unattested image is rejected by the admission controller before a pod starts; the laptop image would never have run."
            ),
            part(
              "Vulnerability gate",
              "Enables Artifact Analysis scanning on the repository and adds a pipeline step (or a Binary Authorization check) that blocks images with critical findings above a threshold, so the attestation is only created when the scan passes; notes continuous scanning catches vulnerabilities found later.",
              "Turn on Artifact Analysis scanning for the repository. In the pipeline, after the push and scan, a step reads the findings and refuses to create the attestation if any critical vulnerability is present; no attestation, no deploy. Because scanning continues after push, a newly published CVE shows up on images already deployed and triggers a rebuild."
            ),
            part(
              "Emergency path",
              "Uses Binary Authorization's break-glass annotation on the deployment so a policy violation is allowed but logged in Cloud Audit Logs and alerted on, restricted by IAM to a small group, with a mandatory follow-up to attest or replace the image.",
              "Keep break-glass: a deployment carrying the Binary Authorization break-glass annotation is admitted even if it violates the policy, but the violation is recorded in Cloud Audit Logs and an alert fires. Only the on-call lead's group may set it, and every use requires a follow-up to get the image properly built and attested."
            ),
            part(
              "In SLSA terms",
              "Explains SLSA as a ladder of build-integrity levels: higher levels require provenance that is generated by the build service, signed and unforgeable, from an isolated, hardened builder; Binary Authorization is the policy enforcement that verifies the provenance before deploy; the laptop build had no provenance at all.",
              "SLSA (Supply-chain Levels for Software Artifacts) grades how trustworthy an artifact's build is: at the low end you merely have provenance; higher levels require that the provenance is produced and signed by the build platform itself, from an isolated build that developers cannot tamper with. Cloud Build's signed provenance moves Verdant up that ladder, and Binary Authorization is the gate that checks the provenance before anything runs. The laptop image was level zero: no provenance, no verification."
            ),
          ],
        },
      ],
    },
    {
      slug: "troubleshoot-failed-rollout",
      objective: "Troubleshooting and mitigating deployment issues",
      kind: "case",
      title: "Troubleshoot and mitigate a failing production rollout",
      brief:
        "Verdant Energy (fictional) is rolling out billing release 2.8.0 through Cloud Deploy to the production GKE cluster using a canary strategy. At the 10% phase the rollout stalls and the on-call engineer is paged.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Cloud Deploy shows the rollout in progress but the canary Deployment's new pods are in CrashLoopBackOff. Customer-facing error rate is unchanged.",
          ask: "What do you do first, and where do you look to find the cause?",
          parts: [
            part(
              "First move",
              "Keeps or halts the canary at 10% rather than advancing (traffic is still served by the stable pods because the crashing pods never became ready), and gathers evidence: kubectl describe pod and kubectl logs --previous on a crashing pod, plus the rollout's render and deploy logs in Cloud Deploy.",
              "Do not advance. The new pods never passed readiness so the old pods are still serving and users are unaffected; there is time to look. kubectl describe pod on a canary pod (events, exit code, last state) and kubectl logs --previous for the crashed container's output, and the Cloud Deploy rollout's logs for the render and apply steps."
            ),
            part(
              "Reading the evidence",
              "Interprets the typical signals: a non-zero exit with an application stack trace points at config or code; an exit from a missing environment variable or secret points at the manifest/overlay; an ImagePullBackOff would be registry/IAM; OOMKilled would be resource limits; and compares the rendered prod manifest with staging's.",
              "The container's own log and exit code say which kind of failure this is: a stack trace on startup is the app or its configuration; 'missing required env var' or a secret mount failure points at the prod Kustomize overlay; ImagePullBackOff would be the registry or node permissions; OOMKilled would be the memory limit. Diff the rendered prod manifest against the one that worked in staging."
            ),
          ],
        },
        {
          text: "The crashed container's log ends with: 'FATAL: environment variable PAYMENTS_API_KEY not set'. The staging overlay mounts the key from Secret Manager through the Secret Manager add-on; the prod overlay was updated last week to a new secret name, but the secret with that name does not exist in the prod project.",
          ask: "How do you mitigate now, and how do you fix it properly?",
          parts: [
            part(
              "Mitigation",
              "Rolls back the rollout to the previous release (gcloud deploy targets rollback or cancel the rollout so the stable version stays), confirming the stable pods are healthy and the canary pods are removed, before touching the secret.",
              "Roll back: gcloud deploy targets rollback prod --delivery-pipeline=billing --region=europe-west1 (or cancel the rollout), which returns the target to the last good release and removes the crashing canary pods. Then confirm the stable pods are healthy."
            ),
            part(
              "Proper fix",
              "Creates the secret in the prod project with the right name and grants the workload's identity access (Workload Identity Federation for GKE binding to a service account with Secret Accessor), then re-releases 2.8.0 (or 2.8.1) through the pipeline so staging also exercises the same secret name; does not hand-edit production.",
              "Create PAYMENTS_API_KEY in the prod project's Secret Manager, grant the billing workload's Google service account (bound through Workload Identity Federation for GKE) roles/secretmanager.secretAccessor on it, and align staging and prod overlays on the same secret name. Then promote the release again through the pipeline rather than patching the cluster by hand, so the fix is recorded and repeatable."
            ),
          ],
        },
        {
          text: "The release goes out successfully the next day. In the retrospective the team asks how a prod-only configuration difference got past staging.",
          ask: "What do you change in the pipeline so this class of failure is caught earlier?",
          parts: [
            part(
              "Prevention",
              "Adds pre-deploy checks: a pipeline step (or Cloud Deploy verify/predeploy hook) that validates referenced secrets and config exist in the target project before applying; keeps environment overlays minimal and reviewed; adds a smoke test as the canary's verify step so a startup failure fails the rollout fast and automatically rolls back; and alerts on CrashLoopBackOff in prod.",
              "Validate before you apply: a predeploy hook in the prod stage that checks every secret and ConfigMap the rendered manifest references actually exists in the target project, failing the rollout before pods are touched. Make the canary's verify step a smoke test so a crash fails the phase and triggers automatic rollback instead of a page at 3 a.m. Review overlay changes like code, and add an alert on CrashLoopBackOff and failed rollouts in prod."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Applying Site Reliability Engineering Practices (18%)
    // ----------------------------------------------------------------------
    {
      slug: "define-slis-slos-sla",
      objective: "Defining SLIs (availability, latency), SLOs, and SLAs",
      kind: "build",
      title: "Define the SLIs, SLOs and SLA for a checkout API",
      brief:
        "Verdant Energy (fictional) exposes a checkout API used by its own web app and by three partner energy brokers under contract. Facts: the API handles about 50 million requests per 30 days; a request is counted at the load balancer; the product team says customers notice when a response takes longer than 300 milliseconds; last quarter's measured success rate was 99.95%; the partner contract currently promises nothing measurable. Write the SLIs, propose SLOs with their error budgets, and propose an SLA.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Define an availability SLI and a latency SLI precisely, set SLOs with computed budgets, and propose an SLA that is looser than the SLOs.",
          parts: [
            part(
              "Availability SLI",
              "Defines it as a ratio of good events to valid events measured at the load balancer: requests that returned a non-5xx response divided by all requests excluding client errors that are the caller's fault (for example 4xx other than 429), measured over the compliance window; names where it is measured and what is excluded.",
              "Availability SLI = (requests answered without a 5xx) / (all valid requests), measured at the load balancer over a rolling 30 days. Valid requests exclude 4xx responses caused by the caller (bad input, unauthenticated), because those are not the service failing. Measuring at the load balancer counts requests that never reached a healthy instance, which an in-process counter would miss."
            ),
            part(
              "Latency SLI",
              "Defines it as the fraction of valid requests that complete within the 300 ms threshold (a request-based threshold SLI), measured at the same point, and explains why a fraction-under-threshold is preferred to an average.",
              "Latency SLI = (valid requests completed in 300 ms or less) / (all valid requests), measured at the load balancer. A fraction under a threshold describes what users feel; an average hides a slow tail where 5% of customers wait seconds."
            ),
            part(
              "SLOs and error budgets",
              "Sets an availability SLO of 99.9% over 30 days (below the measured 99.95%, leaving room to release) and computes the budget: 0.1% x 50 million = 50,000 failed requests, or 43.2 minutes of total outage equivalent; sets a latency SLO such as 99% under 300 ms (budget 1% = 500,000 slow requests) and explains that the SLO should be achievable with margin, not aspirational.",
              "Availability SLO: 99.9% of valid requests succeed over a rolling 30 days. Error budget: 0.1% of 50 million = 50,000 failed requests a month, the same as 43.2 minutes of complete outage (0.1% of 43,200 minutes). Latency SLO: 99% of valid requests under 300 ms, a budget of 500,000 slow requests. 99.9% sits under last quarter's 99.95%, so the team can spend the margin on releases rather than freezing at the first blip."
            ),
            part(
              "The SLA",
              "Proposes an SLA to the brokers that is deliberately looser than the SLO (for example 99.5% monthly availability, with service credits), measured by the same SLI definition, explaining the gap means internal action happens well before the contract is at risk.",
              "SLA for the brokers: 99.5% monthly availability, measured by the same SLI, with service credits if missed. It is intentionally looser than the 99.9% SLO: the team is alerted and acting at the SLO line, long before the contractual line and its credits are in danger. Promising the SLO itself would leave no room to breathe."
            ),
          ],
        },
      ],
    },
    {
      slug: "error-budget-policy-case",
      objective: "Defining error budgets, including Cloud Service Mesh's own definitions",
      kind: "case",
      title: "Manage an error budget through a bad month",
      brief:
        "Verdant Energy's (fictional) checkout API has an availability SLO of 99.9% over a rolling 30-day window and handles about 50 million requests in that window, so its error budget is 50,000 failed requests, equivalent to 43.2 minutes of complete outage. The service runs behind Cloud Service Mesh, whose service dashboards show the SLO and the remaining error budget. It is the 9th of the month and the window so far has been clean.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "On the 9th a bad configuration push takes the API fully down for 26 minutes before it is rolled back. The mesh dashboard's error budget shows a sharp drop.",
          ask: "How much budget did the outage consume, what is left, and what was the burn rate during it?",
          parts: [
            part(
              "Consumption and remainder",
              "Computes 26 / 43.2 = about 60% of the budget consumed (the same as 30,000 of 50,000 failed requests at the average rate), leaving about 17 minutes or 20,000 failures for the remaining 21 days of the window.",
              "26 minutes of full outage out of a 43.2-minute budget is 60% gone in one incident (at the average rate of about 1,160 requests a minute, roughly 30,000 of the 50,000 allowed failures). About 17 minutes, or 20,000 failures, remain for the next three weeks."
            ),
            part(
              "Burn rate",
              "Explains burn rate as error rate relative to the SLO's allowance: at 100% failure the burn rate is 1 / (1 - 0.999) = 1,000, which spends the whole 30-day budget in about 43 minutes; a burn rate of 1 spends it exactly over the window.",
              "Burn rate is how fast the budget is consumed relative to the SLO: 100% errors against a 0.1% allowance is a burn rate of 1,000, which would exhaust the budget in 43.2 minutes, which is why 26 minutes took 60%. A burn rate of 1 means spending exactly the budget over the 30 days."
            ),
          ],
        },
        {
          text: "The team asks for alerts that would have paged sooner (the outage was noticed by a customer), without paging for every blip. The SLO stays at 99.9% over 30 days.",
          ask: "Specify the burn-rate alerts and explain what each catches.",
          parts: [
            part(
              "Fast burn",
              "Pages at burn rate 14.4 over a 1-hour window (consuming 2% of the 30-day budget in an hour), confirmed by the same rate over a 5-minute short window, catching an outage within minutes; notes 14.4 is about 1.44% errors sustained for an hour.",
              "Page when the burn rate over the last hour exceeds 14.4 and the last 5 minutes also exceed 14.4. That pace spends 2% of the month's budget in an hour (14.4 x 1/720 = 2%), and a total outage (burn rate 1,000) crosses it within the first couple of minutes. The 5-minute window stops the page re-firing after recovery."
            ),
            part(
              "Slower burns",
              "Pages at burn rate 6 over 6 hours (5% of budget) with a 30-minute short window, and opens a ticket at burn rate 1 over 3 days (10% of budget) with a 6-hour short window; explains these catch elevated error rates that would exhaust the budget before the window ends but are not emergencies; notes Cloud Monitoring's SLO alerting expresses the same idea with a lookback window and burn-rate threshold.",
              "Second page: burn rate 6 over 6 hours (5% of the budget, 6 x 6/720), confirmed over 30 minutes, for a partial degradation such as 0.6% errors all afternoon. Ticket: burn rate 1 over 3 days (10% of the budget), confirmed over 6 hours, for a slow leak that would use the whole budget by month end. In Cloud Monitoring the same alerts are SLO burn-rate conditions with a lookback window and threshold (its suggested starting points are 10x over 1-2 hours for fast burn and 2x over 24 hours for slow burn)."
            ),
          ],
        },
        {
          text: "On the 22nd, two smaller incidents have pushed the window's consumption past 100%: the budget is exhausted. Product has three feature releases scheduled this week, and the mesh dashboard now shows negative remaining budget.",
          ask: "What does the error-budget policy require, and how do you explain the Cloud Service Mesh figures?",
          parts: [
            part(
              "Policy actions",
              "Applies a pre-agreed error-budget policy: with budget exhausted, feature releases are frozen and engineering effort goes to reliability work (postmortem actions, tests, rollback automation) until the rolling window recovers; exceptions need explicit sign-off; the freeze is a decision rule agreed in advance, not a punishment.",
              "The policy, agreed before this month, is what decides: budget exhausted means no feature releases, only reliability fixes and the postmortem action items, until the rolling 30-day window climbs back above the SLO (which happens as the 9th's outage ages out). Product can ask for an exception, which needs the agreed sign-off and is recorded. Nobody is blamed; the rule was set when everyone was calm."
            ),
            part(
              "The mesh dashboard",
              "Explains that Cloud Service Mesh computes the same definitions per service: an availability SLI as the fraction of successful requests and a latency SLI as the fraction under a threshold, the SLO as the goal over a compliance period, and error budget remaining as (allowed bad events minus actual bad events), which goes negative when more requests failed than the SLO allowed in the window.",
              "The mesh dashboard uses the same definitions: the availability SLI is successful requests over total, the latency SLI is requests under the threshold over total, the SLO is the goal over the compliance window, and remaining error budget is the allowed failures minus the actual ones. With 50,000 allowed and more than that failed in the window, the remainder is negative, which is simply 'over budget', not a different measure."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Implementing Observability Practices and Troubleshooting Issues (25%)
    // ----------------------------------------------------------------------
    {
      slug: "cut-logging-cost-without-losing-evidence",
      objective: "Optimizing logs: filtering, sampling, exclusions, cost management, source considerations",
      kind: "build",
      title: "Cut a project's logging cost without losing the evidence that matters",
      brief:
        "Verdant Energy's (fictional) prod project ingests about 900 GiB of logs a month. A breakdown shows: 500 GiB of load-balancer request logs, mostly health checks and static-asset hits; 250 GiB of application DEBUG-level logs left on after an incident; 100 GiB of VPC Flow Logs at the default sampling; 50 GiB of audit and application ERROR logs. Requirements: keep every audit log and every application ERROR and above for a year; keep enough request logs to investigate incidents; stay able to see flow logs for the two subnets that matter; and cut the bill substantially. Cloud Logging charges 0.50 USD per GiB ingested after the first 50 GiB per project per month, 0.01 USD per GiB per month for retention beyond 30 days, vended network logs such as VPC Flow Logs at 0.25 USD per GiB, and the _Required bucket (Admin Activity audit logs, 400 days) is free.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Decide what to exclude, sample, reduce at source and retain, with the reasoning and the approximate saving.",
          parts: [
            part(
              "Load-balancer request logs",
              "Adds an exclusion filter on the _Default sink for health-check requests and static-asset paths (for example by user agent or path), or lowers the load balancer's logging sample rate in its backend service, keeping error and slow requests; estimates most of the 500 GiB can go.",
              "Exclude what nobody will ever read: an exclusion on the _Default sink for request logs where the user agent is the health checker or the path is under /static/, and lower the backend service's log sample rate for successful 2xx requests while keeping 100% of 5xx and slow responses. That removes most of the 500 GiB, roughly 200 USD a month at 0.50 per GiB, while keeping the requests an incident investigation needs."
            ),
            part(
              "Application DEBUG logs",
              "Fixes it at the source: turn the log level back to INFO in the application configuration rather than ingesting and excluding, since excluded logs still cost nothing but logging at DEBUG costs CPU and network; optionally sample a small fraction with the query language's sample() in an exclusion for diagnostics.",
              "Turn DEBUG off in the app's configuration; this is a source fix, not a sink filter. Excluding at the sink would stop the ingestion charge too, but the app would still spend CPU and egress writing 250 GiB nobody reads. If engineers want a trickle for diagnostics, keep a 1-5% sample with an exclusion using sample(insertId, 0.95) so most DEBUG entries are dropped. Saving: about 125 USD a month."
            ),
            part(
              "VPC Flow Logs",
              "Reduces at the source: disable flow logs on subnets that do not need them, and on the two important subnets lower the sampling rate and raise the aggregation interval (for example 0.1 sampling, 5-minute interval) and trim metadata, explaining vended logs cost per GiB with no free tier.",
              "Flow logs are generated per subnet, so turn them off where they are not needed and keep them on the two subnets that matter with gcloud compute networks subnets update SUBNET --enable-flow-logs --logging-flow-sampling=0.1 --logging-aggregation-interval=interval-5-min --logging-metadata=exclude-all. Vended network logs are charged at 0.25 per GiB with no free allotment, so reducing volume at the source is the only lever."
            ),
            part(
              "What to keep, and for how long",
              "Routes audit logs and application ERROR+ to a dedicated log bucket with 365-day retention via a sink filter (severity>=ERROR plus the Data Access audit logs), leaving the _Default bucket at 30 days, and notes retention beyond 30 days costs 0.01 per GiB per month on that bucket only, with the _Required bucket already free at 400 days.",
              "Create a log bucket 'evidence' with retention 365 days and a sink whose filter is severity>=ERROR OR logName:cloudaudit.googleapis.com (Data Access logs; Admin Activity logs are already in the free _Required bucket for 400 days). Everything else stays in _Default at 30 days. Retention beyond 30 days costs 0.01 per GiB per month, so a year of 50 GiB a month is cheap, and the rest of the project never pays for retention at all."
            ),
          ],
        },
      ],
    },
    {
      slug: "log-based-metrics-for-alerting",
      objective: "Creating custom metrics, including log-based metrics",
      kind: "build",
      title: "Create log-based metrics and alert on them",
      brief:
        "Verdant Energy's (fictional) payment worker on GKE writes structured JSON logs. Two patterns matter: a line with jsonPayload.event=\"payment_declined\" and a jsonPayload.reason field (values like insufficient_funds, expired_card, gateway_timeout), and a line with jsonPayload.event=\"gateway_call\" carrying jsonPayload.duration_ms. The team wants to alert when gateway_timeout declines spike, chart declines by reason, and see the gateway latency distribution, without changing the application code.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Define the counter and distribution metrics, the alert, and the limits and costs to know about.",
          parts: [
            part(
              "Counter with a label",
              "Creates a counter log-based metric filtered on resource.type=\"k8s_container\" and jsonPayload.event=\"payment_declined\", with a user label reason extracted from jsonPayload.reason, so one metric can be charted and filtered by reason; via gcloud logging metrics create with --config-from-file for labels (the simple form takes --log-filter and --description).",
              "A counter metric payment_declined with filter resource.type=\"k8s_container\" AND jsonPayload.event=\"payment_declined\" and a label reason extracted from the field jsonPayload.reason. Labels need the config-file form: gcloud logging metrics create payment_declined --config-from-file=metric.yaml, where the YAML sets filter, metricDescriptor with a STRING label 'reason', and labelExtractors reason: EXTRACT(jsonPayload.reason). Charting by reason is then a group-by on the label."
            ),
            part(
              "Distribution for latency",
              "Creates a distribution log-based metric on jsonPayload.event=\"gateway_call\" with the value extracted from jsonPayload.duration_ms and explicit or exponential buckets, so percentiles (p50/p95/p99) can be charted without new instrumentation.",
              "A distribution metric gateway_latency_ms filtered on jsonPayload.event=\"gateway_call\", valueExtractor EXTRACT(jsonPayload.duration_ms), with exponential buckets (for example 50 buckets, growth 1.5, scale 10). Metrics Explorer then draws the 50th, 95th and 99th percentiles, which a counter could never give."
            ),
            part(
              "The alert",
              "Creates an alerting policy on logging.googleapis.com/user/payment_declined filtered to reason=gateway_timeout with a rate condition (for example more than N per minute over a 5-minute window), a notification channel, and documentation in the policy; or a ratio against total declines.",
              "An alerting policy on the metric logging.googleapis.com/user/payment_declined, filter metric.label.reason=\"gateway_timeout\", aligned as a per-minute rate over 5 minutes, condition above a threshold tuned from the last month's baseline (or as a ratio of gateway_timeout to all declines), with the on-call channel and a runbook link in the policy's documentation."
            ),
            part(
              "Limits and cost",
              "Notes log-based metrics only count entries ingested after creation (no backfill), only see logs that reach the bucket (excluded logs are not counted unless the metric is on an excluded path), that user-defined log-based metrics are chargeable like custom metrics, and that high-cardinality labels (raw IDs) should be avoided.",
              "They count from creation onward; nothing is backfilled. They are computed on ingested logs, so an exclusion on the sink hides those entries from the metric too. User-defined log-based metrics are billed as custom metrics, and every label value creates a time series, so never extract a customer ID or request ID as a label; keep labels to small enumerations like reason."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Optimizing Performance and Cost (12%)
    // ----------------------------------------------------------------------
    {
      slug: "infrastructure-cost-plan",
      objective: "Planning infrastructure cost: committed-use discounts, sustained-use discounts, network tiers",
      kind: "build",
      title: "Plan commitments, discounts and network tier for a steady platform",
      brief:
        "Verdant Energy (fictional) has twelve months of billing data. Compute Engine: a steady floor of 120 vCPUs and 480 GB of memory on E2 machines in europe-west4 that has never dipped in a year; a nightly batch peak of another 200 vCPUs for 4 hours; and a GKE cluster whose node machine types the team expects to change next year. Network: the customer portal serves users in Europe only, through a global external Application Load Balancer, and a bulk data-export job pushes 20 TB a month from one region to a partner's data centre and is not latency-sensitive. Google's current figures: resource-based committed use discounts give up to 55% (up to 70% for memory-optimised machines); compute flexible commitments on E2 give 28% for one year and 46% for three; Spot VMs are up to 91% off with no SLA.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Recommend the commitment type and term for each compute pattern, and the network tier for each traffic pattern, with the trade-offs.",
          parts: [
            part(
              "The steady floor",
              "Covers the 120 vCPU / 480 GB floor with a committed use discount: resource-based (specific family and region) for the deepest discount if the E2 footprint will stay, or compute flexible if the machine types may change; chooses a term (3-year for the deepest discount on a floor that never dipped) and names the trade-off (paid whether used or not, no cancellation).",
              "Commit the floor. If Verdant is confident it stays on E2 in europe-west4, a resource-based commitment for 120 vCPUs and 480 GB gives the largest discount (Google quotes up to 55% for most series). A 3-year term makes sense for a floor that has not dipped in a year; the trade-off is that the commitment is billed whether or not the capacity is used and cannot be cancelled."
            ),
            part(
              "The GKE cluster with changing machine types",
              "Uses compute flexible (spend-based) commitments for the cluster because they are not tied to a machine type or region and cover GKE and Cloud Run too (28% one-year / 46% three-year on E2); explains the lower discount buys flexibility.",
              "The cluster's node types will change, so a resource-based commitment would strand itself. Use a compute flexible commitment on an hourly spend amount: it applies across machine families and regions and to GKE, with 28% off for one year or 46% for three on E2. Less discount than resource-based, in exchange for not betting on a machine type."
            ),
            part(
              "The nightly batch and sustained use",
              "Runs the 4-hour batch on Spot VMs (restartable, up to 91% off, no SLA) rather than committing to capacity used 4 of 24 hours; explains sustained use discounts apply automatically only to eligible machine series that run a large share of the month and do not stack on committed usage, so they are not the plan for a 4-hour job.",
              "Do not commit to 200 vCPUs used four hours a night; run the batch on Spot VMs with checkpointing, at up to 91% off, accepting that instances can be reclaimed at any time. Sustained use discounts are automatic for eligible machine series that run most of the month, do not apply to usage already covered by a commitment, and do nothing for a four-hour job."
            ),
            part(
              "Network tiers",
              "Keeps the customer portal on Premium Tier because a global external Application Load Balancer with a single anycast IP needs Premium and users benefit from Google's backbone; moves the bulk export to Standard Tier (regional, ISP-routed, cheaper egress) since it is one region to one destination and not latency-sensitive.",
              "The portal stays on Premium Tier: the global external Application Load Balancer and its anycast IP require Premium, and the traffic rides Google's backbone to European users. The 20 TB monthly export does not need that: give its VMs or regional load balancer Standard Tier, where egress leaves Google's network near the source region over the public internet at a lower price; it is one region, one destination and not latency-sensitive."
            ),
          ],
        },
      ],
    },
    {
      slug: "workload-cost-optimisation",
      objective: "Optimizing individual workload costs: GKE, Cloud Run, Compute Engine",
      kind: "build",
      title: "Cut the cost of three workloads without hurting their SLOs",
      brief:
        "Verdant Energy (fictional) has three cost findings. (1) A GKE Standard cluster: nodes average 22% CPU utilisation; most Deployments request 2 vCPU and 4 GiB but use 200 millicores and 500 MiB; the cluster has no autoscaling and a nightly report job runs on the same nodes. (2) A Cloud Run service with concurrency 1, CPU always allocated, and 5 minimum instances for an internal tool that gets 200 requests an hour, almost all in office hours. (3) A fleet of 40 n2-standard-8 Compute Engine VMs for a dev environment, running 24/7, with the rightsizing recommender showing most would fit n2-standard-2. Recommend specific changes for each.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the concrete optimisation for each workload and the check that it did not harm reliability.",
          parts: [
            part(
              "GKE cluster",
              "Right-sizes requests to measured usage plus headroom (using the Vertical Pod Autoscaler in recommendation mode), enables cluster autoscaling (or moves suitable workloads to Autopilot, which bills for pod requests), puts the nightly job on a separate Spot node pool with a taint, and verifies with pod CPU throttling and OOM metrics plus the SLO.",
              "Fix the requests first: run VPA in recommendation mode and set requests to observed usage with headroom (for example 300m / 768Mi instead of 2 vCPU / 4 GiB), so the scheduler packs nodes properly. Turn on the cluster autoscaler so empty nodes are removed, or move these services to Autopilot and pay for the pod requests themselves. Give the nightly report its own Spot node pool with a taint and toleration so it never competes with serving pods. Check: no new CPU throttling or OOMKilled events, and the service SLO unchanged."
            ),
            part(
              "Cloud Run internal tool",
              "Raises concurrency from 1 toward the default of 80 (the tool is light), removes or reduces minimum instances (200 requests an hour do not justify five warm instances) and switches to request-based CPU allocation (--cpu-throttling) unless background work needs the CPU, checking cold-start latency against what the tool's users tolerate.",
              "Concurrency 1 forces one instance per request; set it to the default of 80 (or 20 if the tool is heavy) so a handful of instances cover everything. Drop min-instances from 5 to 0 or 1; 200 requests an hour do not need five idle instances. Use request-based CPU allocation (--cpu-throttling) so CPU is billed only while serving, unless the tool does background work after responding. Check: cold-start latency on the first request after idle is acceptable to office users; if not, keep min-instances=1."
            ),
            part(
              "Compute Engine dev fleet",
              "Applies the rightsizing recommendations (n2-standard-8 to n2-standard-2 where indicated, a quarter of the vCPUs and memory), schedules the dev VMs to stop outside working hours (about 50 of 168 hours a week), and considers Spot for throwaway dev instances; verifies with developer feedback and CPU/memory utilisation after the change.",
              "Resize the recommended VMs from n2-standard-8 to n2-standard-2, cutting their compute to a quarter, and put the fleet on a schedule that stops them nights and weekends, so they run roughly 50 of 168 hours. Where a dev box can be recreated from a template, run it as a Spot VM. Check: utilisation after resizing stays below saturation and developers report no slowdowns; keep the recommender on to catch drift."
            ),
            part(
              "The common method",
              "States the shared approach: measure actual usage, use the platform's recommendations (recommender, VPA), match capacity to demand (autoscaling, scale-to-zero, schedules), use cheaper capacity classes for interruptible work, and verify against SLOs and error rates before declaring the saving.",
              "Every change followed the same loop: measure real usage, take the platform's recommendation, make capacity follow demand (autoscaling, scaling to zero, stopping on a schedule), use Spot or request-based billing for work that tolerates it, then confirm the SLO and error rates are unchanged before counting the saving."
            ),
          ],
        },
      ],
    },
  ],
};
