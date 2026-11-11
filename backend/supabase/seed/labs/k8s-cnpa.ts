import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-164: Certified Cloud Native Platform Engineering Associate (CNPA).
//
// Aligned to the six CNPA domains (Platform Engineering Core Fundamentals
// 36%, Platform Observability, Security, and Conformance 20%, Continuous
// Delivery & Platform Engineering 16%, Platform APIs and Provisioning
// Infrastructure 12%, IDPs and Developer Experience 8%, Measuring your
// Platform 8%), read on 2026-11-08 from github.com/cncf/curriculum
// (CNPA_Curriculum.pdf) and training.linuxfoundation.org. Density
// (docs/labs.md, hybrid): 3 / 2 / 2 / 2 / 2 / 1.
//
// CNPA is a multiple-choice exam about platform engineering as a practice,
// so these labs apply the concepts to a fictional platform team's decisions:
// designs, reviews and metric plans, with concrete Kubernetes and CNCF
// mechanisms named. Every lab is needs_expert_review.

export const CNPA_LABS: SeedLabSet = {
  trackCode: "CNPA",
  sources: [
    source("https://github.com/cncf/curriculum/blob/0a8cc08a502710a894e5724c2bec7b88404e5a6b/CNPA_Curriculum.pdf", "exam_outline", "2026-11-08"),
    source("https://training.linuxfoundation.org/certification/certified-cloud-native-platform-engineering-associate-cnpa/", "exam_outline", "2026-11-08"),
    source("https://tag-app-delivery.cncf.io/whitepapers/platforms/", "reference", "2026-11-08"),
    source("https://dora.dev/guides/dora-metrics-four-keys/", "reference", "2026-11-08"),
    source("https://docs.crossplane.io/v2.2/whats-new/", "reference", "2026-11-09"),
  ],
  labs: [
    // ----------------------------------------------------------------- 36%
    {
      slug: "platform-architecture-sketch",
      objective:
        "Design a platform architecture and its capabilities: compute, networking, storage, identity, delivery, observability and governance as platform capabilities, and the layering from infrastructure to developer interface",
      kind: "build",
      title: "Sketch a platform for twelve product teams",
      brief:
        "The fictional retailer Hartwell Group has twelve product teams, each running its own Kubernetes clusters, CI scripts and monitoring, with no shared standards. Leadership has funded a platform team of five and wants a plan: what the platform will provide, in what layers, and what the teams will see.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Lay out the platform's capabilities and layers, name a concrete implementation for each capability, and describe the developer-facing interface.",
          parts: [
            part(
              "Capabilities",
              "Lists the capability areas from the CNCF Platforms white paper -- compute and workload scheduling, networking and service connectivity, storage and data, identity and secrets, delivery (CI/CD, GitOps), observability, security and policy, developer environments and portals -- and says which teams currently rebuild each one twelve times.",
              "The platform offers capabilities, not just clusters: compute (shared Kubernetes clusters with node pools per workload class), networking (ingress, DNS, certificates, network policy, service mesh where needed), storage (StorageClasses, backups), identity and secrets (SSO-backed RBAC, workload identity, a secret store), delivery (a standard CI pipeline and GitOps reconciliation), observability (metrics, logs, traces with per-team views), security and policy (admission policies, image verification, scanning), and developer experience (templates, a portal, documentation). Today each of the twelve teams hand-builds most of these -- that duplication is the business case."
            ),
            part(
              "Layers",
              "Describes layering: cloud infrastructure at the bottom; a Kubernetes-based runtime layer with cluster add-ons; platform services (delivery, observability, policy, secrets) as declarative capabilities; and the developer interface on top (portal, templates, CLI, documentation); explains that teams consume the top layer and the platform team owns the layers beneath.",
              "Bottom: cloud accounts, networks and managed Kubernetes clusters (or Cluster API), provisioned declaratively. Runtime: cluster add-ons the platform installs everywhere -- CNI, ingress controller, cert-manager, external-dns, metrics and logging agents, policy engine. Platform services: GitOps reconciler (Argo CD or Flux), CI (Tekton or the organization's CI with standard pipelines), observability stack (Prometheus/Grafana, Loki, Tempo or Jaeger via OpenTelemetry), secrets (External Secrets Operator to a vault), policy (Kyverno). Developer interface: a Backstage portal with a service catalog, golden-path templates, a CLI/CRDs for self-service, and docs. Product teams live on the top layer; everything beneath is the platform team's product."
            ),
            part(
              "Implementations and defaults",
              "For each capability names a default implementation and the paved-road defaults teams get (namespace per team with quotas, default network policy, a standard Deployment template with probes and resources, a pipeline that builds/scans/signs and commits to a config repo, dashboards generated per service), noting that defaults are overridable with review rather than mandatory.",
              "Defaults a team gets by onboarding: a namespace per environment with ResourceQuota, LimitRange and default-deny NetworkPolicy; a Helm chart/Kustomize base with probes, resources and security context already right; a CI pipeline template that builds, scans, signs and pushes the image and opens the promotion PR; an Argo CD Application wired to their config repo; a Grafana folder with RED dashboards per service and an SLO template; ExternalSecret references to the vault path they own; Kyverno policies that enforce the baseline. Paved road, not a cage: a team can deviate with a documented exception reviewed by the platform team."
            ),
            part(
              "Developer interface",
              "Describes what a team member does: creates a service from a template in the portal, which scaffolds the repo, pipeline, config and catalog entry; views the service's deployments, docs, alerts and cost in one place; requests infrastructure (a database, a bucket) by committing a short platform resource; and gets support through a defined channel with SLAs -- platform as a product with a roadmap and feedback loop.",
              "A developer opens the portal, picks 'Go service' and fills in a form; the template creates the repository, pipeline, Kubernetes config, Argo CD Application and catalog-info.yaml. Within minutes the service builds, deploys to dev and appears in the catalog with its dashboards and runbook links. Needing a database, they commit a namespaced PostgreSQLInstance resource to their config repo and the platform provisions it and delivers connection details as a Secret. The portal shows deployments, alerts, cost and docs for their services. The platform team runs it as a product: a roadmap, office hours, a feedback channel and measured adoption."
            ),
          ],
        },
      ],
    },
    {
      slug: "declarative-vs-imperative-review",
      objective: "Declarative resource management: describing desired state, reconciliation, idempotency, and why platforms are built from declarative APIs",
      kind: "case",
      title: "Review a provisioning script and turn it declarative",
      brief:
        "A team at the fictional insurer Marchmont wrote a shell script that sets up a new environment on the shared platform. The platform team is asked whether it should become the standard onboarding tool.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "#!/bin/bash\n# onboard.sh <team> <env>\nkubectl create namespace $1-$2\nkubectl create quota compute -n $1-$2 --hard=cpu=20,memory=64Gi,pods=100\nkubectl label namespace $1-$2 team=$1 env=$2\nkubectl apply -f default-deny.yaml -n $1-$2\nkubectl create secret docker-registry regcred -n $1-$2 --docker-server=registry.marchmont.example --docker-username=ci --docker-password=$REGISTRY_PASSWORD\nkubectl create rolebinding $1-admins -n $1-$2 --clusterrole=admin --group=$1\necho \"Environment $1-$2 ready\"\n\n$ ./onboard.sh claims staging\nnamespace/claims-staging created\nresourcequota/compute created\nnamespace/claims-staging labeled\nnetworkpolicy.networking.k8s.io/default-deny created\nsecret/regcred created\nrolebinding.rbac.authorization.k8s.io/claims-admins created\nEnvironment claims-staging ready\n\n$ ./onboard.sh claims staging\nError from server (AlreadyExists): namespaces \"claims-staging\" already exists",
          ask: "Assess the script against declarative resource management -- desired state, reconciliation, idempotency -- and explain what goes wrong over time.",
          parts: [
            part(
              "Not idempotent, not reconciled",
              "The script fails on a second run (create is not idempotent), so it cannot be re-run to repair drift; it records no desired state anywhere -- the only record of what an environment should contain is the script's current text, and environments created with older versions silently differ; nothing reconciles if someone deletes the quota or edits the RoleBinding.",
              "kubectl create is imperative: it works once and errors on repeat, so the script cannot be used to converge an existing environment. Desired state exists only implicitly in the script; change the quota numbers next month and the forty environments created before keep the old values with nothing to tell you. If an engineer deletes default-deny in claims-staging, nothing notices or restores it. The script is a one-shot command sequence, not a description of how environments should be."
            ),
            part(
              "Secrets and drift",
              "The registry password is passed through the environment at run time and copied into every namespace as a plain Secret with no rotation path; the script's state is scattered across many namespaces, so a rotation means re-running a non-idempotent script everywhere; the label/quota values are hard-coded with no review trail.",
              "The regcred Secret is created once per namespace from whatever REGISTRY_PASSWORD the operator had; rotating the registry credential means recreating it in every namespace -- with a script that cannot re-run. There is no place where 'the registry credential for all team namespaces' is declared once. Hard-coded quota values and labels have no review history: who approved cpu=20 for every team, and when?"
            ),
          ],
        },
        {
          text: "The platform team decides to replace the script with a declarative approach but is unsure between (a) committing the generated manifests per environment to Git and letting Argo CD apply them, and (b) a Kyverno generate policy that creates the namespace defaults whenever a Namespace with a team label appears, with the registry Secret cloned from a central one.",
          ask: "Compare the two and recommend, then explain how either achieves reconciliation and idempotency.",
          parts: [
            part(
              "Comparison",
              "(a) is fully explicit: every environment's resources are files in Git, reviewed and reconciled by Argo CD -- maximum visibility, more files; (b) encodes the rule once ('every team namespace gets these') and Kyverno generates and synchronizes them -- less repetition, rule-based, but the generated resources are not in Git individually; both are declarative and reconciled; recommends (b) for uniform defaults plus (a) for team-specific configuration, with the Namespace itself and the Kyverno policy in Git.",
              "Option (a) -- manifests per environment in a config repo applied by Argo CD -- makes every object explicit and reviewable, and Argo CD reconciles drift and prunes removals; the cost is many near-identical files (Kustomize or Helm reduces it). Option (b) -- a Kyverno ClusterPolicy with generate rules triggered by Namespace creation (quota, LimitRange, default-deny NetworkPolicy, a clone of the central regcred Secret, the team RoleBinding from the label) with synchronize: true -- states the rule once and keeps every namespace converged, including the Secret when the central one rotates. Recommend (b) for the uniform defaults, with the Namespace objects and the Kyverno policy themselves in Git under Argo CD, and (a) for what differs per team."
            ),
            part(
              "How they achieve the principles",
              "Desired state: declared in Git (manifests or the policy); reconciliation: Argo CD's sync loop or Kyverno's synchronize re-applies when drift or deletion occurs; idempotency: apply semantics converge rather than fail on repeat, so onboarding is 'create the Namespace manifest', re-runnable forever; rotation: change the central Secret once and the clones follow.",
              "Desired state lives in Git: a Namespace manifest with team and env labels, plus either the environment's manifests or the generate policy. Reconciliation: Argo CD compares and re-applies on an interval and on change; Kyverno's generate with synchronize: true recreates or repairs the quota, policy, Secret and RoleBinding if anyone alters them. Idempotency: kubectl apply / server-side apply converge, so the same desired state can be applied any number of times; onboarding claims-staging becomes one Namespace file, and re-running produces no error. Rotation: update the one central regcred and the clones update. A platform built this way can be rebuilt from Git and never drifts silently."
            ),
          ],
        },
      ],
    },
    {
      slug: "cd-gitops-approach-choice",
      objective: "Choose continuous delivery and GitOps approaches: deployment pipelines, environments promoted through Git, and the role of reconcilers",
      kind: "build",
      title: "Pick a delivery approach for a platform's three kinds of tenant",
      brief:
        "The fictional media company Ravenscar Studios is designing the delivery layer of its platform. Tenants fall into three groups: fast-moving web teams who deploy many times a day, a regulated payments team that needs approvals and evidence, and a data team that runs batch jobs and notebooks rather than services. The platform must give each a sensible default without three different systems.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Choose the delivery approach, repository and environment model, and reconciler setup, and describe how each tenant group uses it.",
          parts: [
            part(
              "One reconciler, one model",
              "A single GitOps reconciler (Argo CD or Flux) across clusters with a config repository per team following a shared structure (base plus environment overlays), CI that produces artifacts and commits desired state, and promotion by pull request; explains why one model with different policies beats three systems.",
              "Standardize on one reconciler -- Argo CD with ApplicationSets across the clusters -- and one repository shape: each team owns a config repo with a Kustomize base and overlays per environment, and CI only builds, tests, signs and pushes images, then commits the digest to the dev overlay. Promotion is a pull request copying the digest to the next overlay. One model means one set of dashboards, one audit trail, one onboarding template; tenant differences become branch-protection rules and sync policies, not separate tools."
            ),
            part(
              "Web teams",
              "Automated sync with self-heal and prune, auto-merge for dev, single review for production with progressive delivery (Argo Rollouts canary gated on metrics) so many deploys a day are safe; short-lived preview environments via an ApplicationSet pull-request generator.",
              "Web teams get the fast lane: dev overlay auto-merges from CI, production needs one review, the Rollout strategy does a metric-gated canary so a bad build aborts itself, and an ApplicationSet with the pull-request generator spins up a preview environment per open PR and deletes it on merge. Deployment frequency stays high because the safety is automated, not procedural."
            ),
            part(
              "Payments team",
              "Same pipeline with stricter gates: two reviewers and a change-ticket check on the production overlay, manual sync or a sync window, signed commits and image signature verification at admission, and evidence produced from Git history and Argo CD sync history for auditors.",
              "The payments team uses the identical repo and pipeline with policy turned up: CODEOWNERS requires two reviewers and a CHG- ticket reference on overlays/prod, the production Application uses manual sync (or a sync window) so a human triggers the final step after merge, commits are signed and Kyverno verifies image signatures at admission. Evidence for auditors is automatic: the PR (who approved, which ticket), the commit, and Argo CD's sync history (when it went live, by whom)."
            ),
            part(
              "Data team",
              "Batch jobs and notebooks delivered as declared resources too: CronJobs/Argo Workflows templates and notebook server definitions in their config repo reconciled by the same Argo CD, with the pipeline building their images; explains that GitOps is not only for long-running services.",
              "Batch work is still desired state: CronJobs, Argo Workflows WorkflowTemplates and notebook-server Deployments live in the data team's config repo and are reconciled like any other manifest, with images built by the same CI. What differs is the shape of the objects, not the delivery. Their 'deploy' is a merge that changes a WorkflowTemplate or a schedule; rollbacks are reverts. The platform offers them a Workflow template and a notebook template instead of a web service template."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 20%
    {
      slug: "policy-as-platform-capability",
      objective: "Apply policy engines for platform governance: Kyverno, OPA Gatekeeper and ValidatingAdmissionPolicy, policy as code and conformance reporting",
      kind: "build",
      title: "Turn five governance rules into platform policy",
      brief:
        "The fictional bank Castleford Direct has five rules every team must follow on the platform: images only from the company registry; every workload has an owner label; no privileged Pods outside the platform namespace; every Deployment has resource requests; and production namespaces must have a NetworkPolicy. Today these are a wiki page. The platform team wants them enforced as code with a conformance report leadership can read.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Choose the enforcement mechanism for each rule, explain the policy-engine options, and describe the conformance reporting.",
          parts: [
            part(
              "Choosing the engine",
              "Compares Kyverno (Kubernetes-native YAML policies with validate/mutate/generate and reports), OPA Gatekeeper (Rego constraint templates, audit) and ValidatingAdmissionPolicy (built-in CEL, no extra component, validation only); recommends one primary engine (Kyverno for its mutate and generate abilities and reports) with VAP for simple validations, avoiding two overlapping engines.",
              "Three ways to say no at admission: Kyverno writes policies as Kubernetes YAML and can also mutate (add defaults) and generate (create resources) and produces PolicyReports; OPA Gatekeeper expresses constraints in Rego with ConstraintTemplates and has an audit mode; ValidatingAdmissionPolicy is built into the API server with CEL expressions -- no webhook, fastest, validation only. Pick one primary engine to keep the mental model and reports in one place -- Kyverno here, because two of the five rules are best met by mutation and generation -- and use VAP for a couple of simple, high-volume validations. Running Kyverno and Gatekeeper together doubles the policy language and the webhooks."
            ),
            part(
              "Rules 1-3: validate",
              "Registry allowlist as a validate rule (or a VAP CEL expression) on Pods checking image prefixes; owner label as a validate rule on Deployments/StatefulSets/Jobs with a clear message; privileged Pods denied by applying Pod Security Admission baseline/restricted per namespace (the built-in mechanism) with the platform namespace exempt, rather than a custom rule.",
              "Images from the company registry: a Kyverno validate rule (or a VAP: object.spec.containers.all(c, c.image.startsWith('registry.castleford.example/'))) on Pods, Enforce, with a message that says where to find the mirror. Owner label: validate on Deployment, StatefulSet, DaemonSet, Job and CronJob requiring metadata.labels.owner, Audit for two weeks then Enforce. No privileged Pods: use what Kubernetes already provides -- Pod Security Admission with enforce=baseline (restricted where possible) on every tenant namespace, and the platform namespace labelled privileged; the policy engine then only needs to ensure the labels are present on namespaces."
            ),
            part(
              "Rules 4-5: mutate and generate",
              "Resource requests: a mutate rule adding default requests where missing (and a validate rule requiring them after a grace period), because fixing the gap is friendlier than rejecting; production NetworkPolicy: a generate rule that creates a default-deny NetworkPolicy in any namespace labelled env=production with synchronize true, so the rule enforces itself.",
              "Resource requests: rather than rejecting every Deployment that forgot them, a Kyverno mutate rule adds default requests (and a LimitRange per namespace does the same at Pod level), with a validate rule in Audit that lists who still relies on defaults; later, Enforce the validate once teams have set real values. Production NetworkPolicy: a generate rule triggered by Namespace create/update with label env=production that creates default-deny with synchronize: true -- the requirement is satisfied by construction and restored if deleted, instead of being checked after the fact."
            ),
            part(
              "Conformance reporting",
              "Kyverno PolicyReports per namespace aggregated by the Policy Reporter (UI and metrics) or exported to Grafana: pass/fail per rule per team, trend over time, exceptions listed; a weekly summary for leadership built from kyverno_policy_results_total; explains that the same policies run in Audit give a conformance view before enforcement and that exceptions are PolicyException resources with owners.",
              "Every rule produces PolicyReport results for existing resources (background scans) as well as admission decisions, so conformance is measurable from day one in Audit mode: Policy Reporter (or Grafana on kyverno_policy_results_total) shows pass/fail counts per policy, per namespace and per team label, with trend lines as teams fix findings. Exceptions are PolicyException resources in Git with an owner and a review date, so the report can list them honestly. Leadership gets one chart: percentage of workloads conformant per rule, per team, per week -- the wiki page turned into numbers."
            ),
          ],
        },
      ],
    },
    {
      slug: "platform-observability-tenants",
      objective: "Observability fundamentals for platforms: traces, metrics, logs and events, OpenTelemetry and Prometheus as platform capabilities, and dashboards per tenant",
      kind: "case",
      title: "Make observability a platform capability instead of twelve stacks",
      brief:
        "At the fictional logistics group Penhale, each product team runs its own Prometheus and Grafana, logs go to three different systems, and nobody has traces. The platform team must propose a shared observability capability and answer the teams' worry: 'we will lose control of our dashboards and data'.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Inventory gathered by the platform team:\n - 12 Prometheus servers (retention 7-30 days), 9 Grafana instances, 0 shared alert routing\n - Logs: 5 teams on Elasticsearch, 4 on a cloud logging service, 3 on kubectl logs only\n - Traces: none; two teams have OpenTelemetry SDKs enabled but no backend\n - Incidents in Q3: 14; median time to identify the failing service: 41 minutes, mostly spent 'finding the right dashboard'",
          ask: "Design the shared observability capability -- signals, collection, storage, access and defaults -- and address the teams' concern about control.",
          parts: [
            part(
              "Collection as a platform default",
              "An OpenTelemetry Collector per node (DaemonSet agent) plus a gateway tier, collecting metrics (Prometheus-style scraping and OTLP), logs (container stdout via the filelog receiver) and traces (OTLP from SDKs), enriched with k8sattributes so every signal carries namespace, workload and team labels automatically; teams instrument with OpenTelemetry SDKs or Prometheus client libraries and nothing else.",
              "Install the OpenTelemetry Collector as a DaemonSet agent on every node and a gateway Deployment: the agents scrape Prometheus endpoints (or receive OTLP), tail container logs with the filelog receiver and receive traces over OTLP, and the k8sattributes processor stamps namespace, pod, deployment and the team label onto every metric, log and span. A team's only job is to expose metrics and emit traces with the OpenTelemetry SDK; collection, enrichment and shipping are the platform's. The two teams already emitting traces get a backend for free."
            ),
            part(
              "Storage and the three signals",
              "Central Prometheus-compatible metrics storage (Mimir or Thanos) with long retention, a log store (Loki or the existing Elasticsearch, consolidated), and a trace backend (Tempo or Jaeger), all multi-tenant by team label; explains each signal's question (metrics: is it broken and how much; logs: what happened; traces: where) and that correlation needs the shared labels.",
              "Metrics into one Prometheus-compatible store (Mimir or Thanos) with 13 months of retention instead of 12 islands with 7 days; logs into Loki (or one consolidated Elasticsearch) indexed by the same labels; traces into Tempo or Jaeger. Each store is multi-tenant keyed on the team label the collector added, so cost and access can be attributed. Because namespace and workload labels are identical across the three stores, a Grafana panel can jump from a spiking error metric to the matching logs and to example traces -- the correlation that cuts the 41 minutes."
            ),
            part(
              "Per-team dashboards and alerting",
              "Grafana as one instance with a folder per team and RBAC by team, dashboards generated from templates (RED per service, resource usage per namespace) plus the team's own; Alertmanager with routing by team label to each team's channel, and platform-level alerts owned by the platform team; SLO templates teams fill in.",
              "One Grafana, SSO-backed, with a folder per team (edit rights for the team, read for everyone), seeded with generated dashboards: RED metrics per service from the standard HTTP instrumentation, saturation per namespace, and an SLO dashboard template with the error budget. Alerts route through one Alertmanager by the team label to each team's channel, and platform alerts (node pressure, control plane, collector health) go to the platform on-call. A new service onboarded through the template gets its dashboards and alert routing on day one."
            ),
            part(
              "Answering 'we lose control'",
              "Teams keep ownership of their dashboards and alert rules (in their folders and repos, reconciled by GitOps), gain longer retention, correlation across signals and cross-team views, and shed operating twelve stacks; data access is per team by label with cross-team read for incidents; the platform publishes SLOs for the observability stack itself.",
              "Teams lose the chore of running Prometheus, not control: their dashboards and alert rules live in their Git repos (as Grafana dashboard ConfigMaps or PrometheusRule objects) and are reconciled into their folder; nobody edits them but the team. They gain retention, correlation, and the ability to see a dependency's health during an incident. Access is scoped by team label with incident-time read across teams. The platform commits to an SLO for the stack (ingest availability, query latency) so 'shared' does not mean 'someone else's problem'."
            ),
          ],
        },
        {
          text: "Six months later the shared stack is in place. The platform's own metrics show ingest at 40 million active series and a monthly cost 3x the estimate; one team's service emits a metric labeled by order_id. Teams ask for 'unlimited retention of everything'.",
          ask: "Explain the cost problem and the governance you would add without taking the capability away.",
          parts: [
            part(
              "Cardinality and cost",
              "The order_id label creates a series per order -- unbounded cardinality that dominates the 40 million and the bill; metrics cost scales with active series, logs with volume, traces with spans; explains that per-event identifiers belong in logs and traces, not metric labels.",
              "Metrics storage cost is a function of active series, and a label with one value per order turns one metric into millions of series -- that single service is probably most of the 40 million. Order ids are per-event data: they belong on a log line or a span attribute, where cost scales with volume you can sample, not with cardinality that explodes. The 'unlimited retention' request has the same shape: retention multiplies storage cost linearly for every tenant."
            ),
            part(
              "Governance that keeps the capability",
              "Per-tenant limits in the metrics store (max series per tenant, sample rate), a relabel/drop rule in the collector for known-bad labels, chargeback or showback by team label so cost is visible, retention tiers (e.g. 30 days raw, 13 months downsampled, logs 14 days with archive on request), trace sampling with 100% of errors, and a review path for exceptions; the platform publishes the per-team cost dashboard.",
              "Set per-tenant limits in Mimir/Loki (max active series, ingestion rate) so one team cannot take the stack down; add a collector processor that drops metric labels matching known identifiers (order_id, user_id, request_id) with a warning to the team; tier retention (30 days full resolution, 13 months downsampled; logs 14 days online, archive to object storage on request); sample traces in the collector (100% of errors and slow requests, 10% otherwise). Make cost visible: a per-team showback dashboard from the tenant labels. Exceptions -- a team that genuinely needs longer retention -- go through a request with the cost attached. The capability stays shared; its economics become visible and fair."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 16%
    {
      slug: "gitops-for-environments",
      objective: "Design GitOps for application environments: repository structure, promotion between environments, and progressive delivery",
      kind: "build",
      title: "Design the environment and promotion model for a platform's tenants",
      brief:
        "The fictional e-learning company Thornby Learn wants its platform to give every team dev, staging and production environments with a standard promotion flow, plus short-lived preview environments for pull requests. Teams currently promote by rebuilding images per environment, which has caused 'works in staging, broke in prod' incidents.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the repository structure, the promotion mechanism, preview environments and progressive delivery, explaining why the current practice causes incidents.",
          parts: [
            part(
              "Why rebuilding per environment fails",
              "Rebuilding produces a different artifact for each environment (different base image state, dependency resolution, build time), so staging never tested what production runs; the fix is one immutable artifact per commit, referenced by digest, promoted unchanged.",
              "A rebuild for production is a different binary from the one tested in staging: base images and dependencies may have moved, build caches differ, timestamps change. 'Works in staging, broke in prod' is the expected outcome of testing one artifact and shipping another. The platform rule: build once per commit, push by digest, and promote that same digest through every environment; only configuration differs."
            ),
            part(
              "Repository structure",
              "Application repo (code, Dockerfile, CI) and a config repo per team with base/ and overlays/{dev,staging,prod} (Kustomize) or a chart with per-environment values; environment differences limited to overlays; a platform-owned template generates this structure for new services.",
              "team-config/\n  apps/<service>/base/            # Deployment, Service, HPA, probes, security context\n  apps/<service>/overlays/dev/     # image digest, replicas: 1, feature flags\n  apps/<service>/overlays/staging/\n  apps/<service>/overlays/prod/    # image digest, replicas, PDB, stricter limits\nOnly the overlays differ between environments, and the biggest difference should be the image digest and sizing. The service template in the developer portal generates this layout so every team's repos look alike and the platform's tooling can assume it."
            ),
            part(
              "Promotion by pull request",
              "CI updates the dev overlay's digest automatically; promotion to staging and production is a PR that copies the digest (optionally opened automatically by a bot after dev health checks pass), gated by CODEOWNERS rules per environment; Argo CD or Flux reconciles each environment from its overlay; explains the audit trail and rollback (revert).",
              "On merge to main, CI builds and pushes registry/service@sha256:... and commits the digest to overlays/dev; Argo CD syncs dev. A bot (or the developer) opens a PR moving the same digest to overlays/staging; after staging's checks, another PR to overlays/prod with the production review rules. Each environment's Argo CD Application watches only its overlay path. Promotion history is the PR history; rollback is git revert of the digest bump, reconciled in minutes. No image is ever rebuilt for an environment."
            ),
            part(
              "Preview environments and progressive delivery",
              "An ApplicationSet with the pull-request generator creating a namespace and Application per open PR from a preview overlay (ephemeral, auto-deleted on merge/close, with quotas and TTL); in production a canary Rollout gated on metrics (Argo Rollouts or Flagger) so even a correctly promoted digest is exposed gradually.",
              "Previews: an ApplicationSet using the pull-request generator watches the app repo and, for each open PR, creates Application pr-<number> deploying the PR's image into namespace preview-<number> from a preview overlay (small replicas, a generated hostname); closing the PR deletes it, and a Kyverno TTL label caps the lifetime. Production: the Deployment in base is an Argo Rollouts Rollout with canary steps gated by an AnalysisTemplate on error ratio and latency, so a promoted digest that misbehaves under real traffic aborts automatically. Same artifact everywhere; progressively exposed where it matters."
            ),
          ],
        },
      ],
    },
    {
      slug: "platform-incident-response",
      objective: "Plan incident response in platform engineering: on-call for the platform, runbooks, blameless reviews and error budgets shared with tenants",
      kind: "case",
      title: "Run the first platform incident review",
      brief:
        "The fictional payments company Oakhurst Pay's new platform had its first serious incident: a Kyverno upgrade with a bad policy blocked all deployments for 3 hours during a tenant's urgent fix. Tenant teams are angry; the platform team is defensive. You facilitate the review and set the incident process going forward.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Timeline from the review:\n 10:02 Platform engineer upgrades Kyverno via helm upgrade in production (no staging run; staging cluster was 'behind').\n 10:05 A policy fails to load on the new version; the webhook's failurePolicy is Fail; every Pod create in tenant namespaces is rejected with 'context deadline exceeded'.\n 10:40 Payments team notices their hotfix rollout is stuck; files a ticket (no platform on-call rota exists; the ticket queue is checked twice a day).\n 11:55 A tenant engineer finds the platform engineer on chat.\n 12:30 Policy fixed; deployments resume at 13:05 after the backlog drains.\n Impact: the payments hotfix was delayed 3 hours; no customer data affected.",
          ask: "Identify the contributing factors (blameless), the immediate fixes, and the process changes -- on-call, runbooks, shared error budgets -- that make the platform a dependable product.",
          parts: [
            part(
              "Contributing factors",
              "No staging path for platform changes (staging drifted); a fail-closed webhook covering every tenant namespace with no exemption or canary; no alert on Kyverno health or on admission rejections; no platform on-call or escalation route, so detection depended on a tenant noticing; the review must name conditions, not the engineer.",
              "Several conditions lined up: platform changes had no staging rehearsal because the staging cluster was allowed to drift; the policy webhook failed closed across all tenant namespaces with no canary rollout of the new version; nothing alerted on Kyverno's health or on a spike in admission rejections, so the platform team learned of the outage from a tenant 38 minutes in; and there was no on-call or escalation path, so finding a responder took another 75 minutes. A blameless review states these as system conditions -- any engineer upgrading that day would have produced the same outage."
            ),
            part(
              "Immediate fixes",
              "Alert on kyverno_policy_rule_info_total ready=false and on admission rejection rate; keep staging in step with production and rehearse upgrades there; roll platform component upgrades as canaries (one cluster or revision first) and set failurePolicy Ignore for non-security policies during upgrades or exempt a break-glass namespace; a documented rollback (helm rollback) in a runbook.",
              "Within the week: alerts on Kyverno policies not ready and on rate(kyverno_admission_requests_total{request_allowed=\"false\"}) spiking, paging the platform team; staging cluster reconciled from the same Git as production so upgrades are rehearsed; platform upgrades staged -- one cluster, then the rest -- with helm rollback documented in a runbook; security policies stay fail-closed but convenience policies move to failurePolicy Ignore, and kube-system plus a break-glass namespace are excluded from the webhook so the platform can always repair itself."
            ),
            part(
              "On-call, runbooks and escalation",
              "A platform on-call rota with a paging channel tenants can reach, response-time targets, runbooks for the top platform components (Kyverno, Argo CD, ingress, observability) with 'how to tell', 'how to mitigate', 'how to roll back'; a status page or channel for platform incidents; tenants told how to escalate.",
              "The platform is a product and products have support: a rota with a pager, a clearly published escalation path (a channel and a page button, not a ticket queue), a 15-minute acknowledgment target for 'deployments blocked' class incidents, and runbooks per component with symptoms, checks, mitigations and rollbacks. A platform status channel announces incidents and upgrades. The payments team's ticket would have been a page at 10:40, or -- with the alerts -- the platform's own page at 10:06."
            ),
            part(
              "Shared error budgets and the review's outcome",
              "Define platform SLOs tenants depend on (deployment path availability, cluster API availability, observability ingest) with error budgets; a platform outage consumes the platform's budget, and tenants' SLO reviews can attribute downtime to the platform rather than to their service; the blameless write-up with actions and owners is published to tenants; changes to risky components pause when the platform's budget is spent.",
              "Publish platform SLOs: 'a merged change reaches the cluster within 15 minutes 99.5% of the month', 'admission is available 99.9%', 'metrics ingest 99.9%'. This incident spent most of the deployment-path budget for the month, which triggers the policy: no non-urgent risky platform changes until the budget recovers, and every platform upgrade follows the staged path. Tenants can attribute their own SLO impact to the platform's incident instead of to their code. The write-up -- timeline, conditions, actions with owners and dates -- goes to all tenants; openness is what turns anger into trust."
            ),
          ],
        },
        {
          text: "A tenant asks in the review: 'Why should we trust a shared platform at all? When we ran our own cluster, only we could break it.'",
          ask: "Give the honest answer, with the trade-off and the commitments that make it fair.",
          parts: [
            part(
              "The honest trade-off",
              "A shared platform concentrates risk (one bad upgrade hits everyone) in exchange for concentrated expertise, standardization and far less duplicated toil; the question is not whether outages happen but whether the platform is run with the discipline -- SLOs, on-call, staged change, transparency -- that a team would not sustain on its own cluster.",
              "The tenant is right that shared means shared blast radius: this incident touched everyone, where their own cluster would have failed alone. In return, twelve teams no longer each run Kyverno, Argo CD and monitoring badly in their spare time; upgrades happen once, by people whose job it is, with rehearsal and rollback. Trust is earned by discipline, not asserted: the platform team must run the platform better than any single team ran its cluster, and prove it."
            ),
            part(
              "Commitments",
              "Published SLOs and monthly reports against them, blameless reviews shared with tenants, staged changes with announced windows, a real on-call with response targets, an exit path (a team can run outside the platform with documented costs), and tenant representation on the platform's roadmap; measure trust with adoption and satisfaction surveys.",
              "Commitments in writing: SLOs with a monthly report; every incident reviewed blamelessly and published; changes to shared components staged and announced; an on-call with a 15-minute acknowledgment target; a documented exit path so staying on the platform is a choice, not a trap; and a tenant council that shapes the roadmap. Then measure it -- adoption, incidents attributable to the platform, time to deploy, developer satisfaction -- and publish those too."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 12%
    {
      slug: "design-a-platform-crd",
      objective: "Design APIs for self-service platforms with CustomResourceDefinitions: schema, validation, status, and versioning",
      kind: "build",
      title: "Design a self-service PostgreSQL API for tenants",
      brief:
        "Tenants at the fictional healthcare scheduler Birchwood Health ask the platform for databases by ticket and wait days. The platform team wants a Kubernetes API: a tenant commits a resource describing the database they need and the platform provisions it. They must decide what the API exposes, how it is validated, how status is reported and how it can evolve.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the CRD (group, kind, spec, validation, status), explain the design choices, and say how it will be versioned and fulfilled.",
          parts: [
            part(
              "Group, kind and spec",
              "A namespaced CRD such as platform.birchwood.example/v1alpha1 PostgresDatabase whose spec exposes intent, not implementation: size tier (small/medium/large), version (major only), backupRetentionDays, highAvailability boolean; hides instance types, storage classes and passwords; explains the abstraction level is the platform's product decision.",
              "apiVersion: platform.birchwood.example/v1alpha1\nkind: PostgresDatabase\nmetadata: {name: appointments-db, namespace: scheduling}\nspec:\n  tier: medium            # small | medium | large -- maps to CPU/memory/storage the platform chooses\n  version: \"16\"           # major version only; minors are the platform's business\n  highAvailability: true\n  backupRetentionDays: 14\n  maintenanceWindow: \"Sun 02:00-04:00\"\nThe spec is what a tenant may decide; everything else (instance class, storage class, parameter tuning, networking, credentials) is the platform's implementation and stays out of the API. A small, opinionated surface is what makes it self-service and supportable."
            ),
            part(
              "Validation",
              "OpenAPI v3 schema in the CRD with enums for tier and version, integer bounds for backupRetentionDays, required fields and defaults, plus CEL validation rules (x-kubernetes-validations) for cross-field constraints (e.g. highAvailability requires tier != small) and immutability of version via a transition rule; explains validation at admission beats failing provisioning later.",
              "In the CRD's openAPIV3Schema: tier enum [small, medium, large], version enum [\"15\", \"16\", \"17\"], backupRetentionDays integer minimum 1 maximum 35 default 7, highAvailability boolean default false, required [tier, version]. x-kubernetes-validations:\n- rule: \"!self.highAvailability || self.tier != 'small'\"\n  message: \"highAvailability requires tier medium or large\"\n- rule: \"self.version == oldSelf.version\"\n  message: \"version cannot be changed in place; create a new database and migrate\"\nValidation at admission gives the tenant an immediate, specific error instead of a reconciler failing hours later. Defaults make the minimal manifest tiny."
            ),
            part(
              "Status",
              "A status subresource with conditions (Ready, Provisioning, Degraded) following the standard condition shape, observedGeneration, and useful fields such as connectionSecretRef and endpoint, written by the controller only; explains why status is separate from spec and how tenants and tooling read it.",
              "status:\n  observedGeneration: 3\n  conditions:\n  - type: Ready\n    status: \"True\"\n    reason: Provisioned\n    lastTransitionTime: \"2026-11-08T10:12:00Z\"\n  endpoint: appointments-db.scheduling.svc:5432\n  connectionSecretRef: {name: appointments-db-conn}\nThe status subresource is written only by the controller (RBAC separates spec and status updates), so a tenant's apply never clobbers it and the controller's updates never bump the generation. Standard conditions let kubectl wait --for=condition=Ready and Argo CD health checks work; observedGeneration tells readers whether status reflects the latest spec. Connection details go into a Secret the tenant's Pods mount, referenced from status."
            ),
            part(
              "Versioning and fulfilment",
              "Start at v1alpha1 with a conversion plan: serve v1beta1/v1 alongside, mark one storage version, use a conversion webhook or none if fields only add; fulfilment by a controller -- Crossplane Composition (the PostgresDatabase as a namespaced composite resource defined by an XRD and composed of cloud resources) or a Kubernetes operator (CloudNativePG) driven by a thin controller; explains the controller reconciles spec to real resources and writes status.",
              "Version the API like Kubernetes does: ship v1alpha1, learn, then add v1beta1 with both served and v1beta1 as the storage version; additive changes need no conversion webhook, renames do. Fulfilment: implement PostgresDatabase as a Crossplane v2 namespaced composite resource -- an XRD plus a Composition that maps tier to a cloud database instance size, storage and backup settings and composes the connection Secret (v2 XRs have no built-in connection details) -- or, for in-cluster databases, a small controller that creates a CloudNativePG Cluster from the spec and mirrors its status. Either way the controller reconciles continuously: edit backupRetentionDays and the real backup policy follows."
            ),
          ],
        },
      ],
    },
    {
      slug: "operator-vs-crossplane",
      objective: "Apply the Kubernetes operator pattern for integration: operators that reconcile custom resources into applications, databases and external systems",
      kind: "case",
      title: "Choose how to fulfill a self-service API: operator, Crossplane or pipeline",
      brief:
        "The fictional media firm Greystone Press has designed a self-service API for message queues and must decide how requests get fulfilled. Three proposals are on the table; the platform team asks you to evaluate them.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Proposals:\n A. A CI pipeline watches the config repo for new MessageQueue manifests and runs Terraform to create the queue in the cloud, then kubectl-creates a Secret with credentials.\n B. Crossplane: an XRD MessageQueue with a Composition of the cloud provider's queue and IAM policy resources; the Composition also composes a Secret with the connection details automatically.\n C. A custom operator written in Go (controller-runtime) that reconciles MessageQueue resources by calling the cloud API directly and manages credentials.\n\nConstraints: the team has two engineers with Go experience; queues must be reconciled continuously (drift corrected); the cloud provider is one of the big three; the organization already runs Crossplane for databases.",
          ask: "Evaluate each proposal against the operator pattern -- continuous reconciliation, status, idempotency -- and the team's constraints, then recommend.",
          parts: [
            part(
              "A: pipeline",
              "A pipeline is event-driven, not reconciling: it acts when the repo changes, does not detect or correct drift in the cloud, has no status reported back on the resource, and pushes credentials with kubectl from CI; it is the imperative approach dressed as GitOps and fails the operator pattern's core property.",
              "Proposal A reacts to commits; it does not observe the real queue. If someone deletes or changes the queue in the cloud console, nothing notices until the next unrelated pipeline run -- no continuous reconciliation. The MessageQueue resource never gets a status; tenants cannot kubectl wait on it. Credentials are created by CI with cluster write access. It works for a demo and decays in production."
            ),
            part(
              "B: Crossplane",
              "Crossplane's providers are operators for cloud APIs: the Composition turns a tenant's namespaced composite resource into managed resources that are continuously reconciled (drift corrected), with status conditions built in and the connection Secret composed alongside, no code to write, and the organization already operates it; limitations: compositions can be verbose and complex logic needs composition functions.",
              "Proposal B uses an operator the organization already runs. Crossplane's provider controllers reconcile every managed resource (the queue, the IAM policy) against the cloud continuously, repairing drift; the tenant's MessageQueue gets Ready/Synced conditions, and the Composition writes a connection Secret next to it in the tenant namespace; the whole thing is YAML in Git, reviewed like any manifest. Costs: Composition YAML gets long, and anything beyond mapping fields (naming rules, conditional resources) needs composition functions; provider versions and cloud API changes need upkeep."
            ),
            part(
              "C: custom operator",
              "A controller-runtime operator gives full control and a clean API, continuous reconciliation and status, but the team owns the code, tests, upgrades, cloud SDK changes, credential handling and the controller's own reliability -- a product in itself for a two-person Go team already running Crossplane; justified only when the logic cannot be expressed in Crossplane.",
              "Proposal C is the operator pattern done by hand: a Reconcile loop fetching the MessageQueue, comparing with the cloud, creating or updating, and writing status -- idempotent and continuous if written well. The team then owns a Go codebase forever: cloud SDK upgrades, retries and rate limits, secret rotation, leader election, metrics, tests, releases. Two Go engineers can do it, but it competes with everything else they must do, and it duplicates what the Crossplane provider already offers. The case for C appears when the fulfilment logic is genuinely bespoke (an internal system with no provider) or when Crossplane's abstraction fights the design."
            ),
            part(
              "Recommendation",
              "B: build the MessageQueue XRD and Composition in Crossplane, reusing the organization's existing platform; keep the API tenant-facing and thin; add a composition function only if needed; revisit C if an internal non-cloud system must be integrated.",
              "Choose B. It satisfies continuous reconciliation, status and credential delivery out of the box, uses a system the team already operates and monitors, and keeps the platform's fulfilment layer uniform with the databases. Write the XRD for MessageQueue with the same conventions as PostgresDatabase (tier, retention, status conditions), compose the cloud queue plus its access policy, and compose a connection Secret in the tenant's namespace (Crossplane v2 XRs have no claims and no writeConnectionSecretToRef). Reserve a custom operator for the day an internal system with no Crossplane provider needs the same self-service treatment."
            ),
          ],
        },
        {
          text: "Crossplane it is. Three weeks in, a tenant reports that their MessageQueue says Ready but messages fail with access denied; the cloud console shows the IAM policy was edited by hand two days ago to 'fix a permissions issue'.",
          ask: "Explain what happened in operator terms and how the platform should respond.",
          parts: [
            part(
              "Drift and reconciliation",
              "The hand edit created drift between the managed resource's desired state and the cloud; Crossplane's provider reconciles on an interval and should have reverted it -- either the IAM policy field edited is not managed (ignored or late-initialized) or the managementPolicies allow observe-only; the Ready condition reflects the provider's view of the resources it manages, so a field outside its spec can diverge while Ready stays true.",
              "Someone changed the real IAM policy outside the API. A managed resource is reconciled on its poll interval (default 1 minute for many providers), so a managed field should have been restored within minutes; that it stayed changed means the edited part is not in the managed resource's spec (late-initialized from the cloud, or a field the Composition does not set) or the resource runs with managementPolicies that observe but do not update. Ready reports the provider's success at reconciling what it manages; it says nothing about fields it does not."
            ),
            part(
              "Response",
              "Make the policy document fully managed in the Composition so drift is reverted, remove console write access for platform-managed resources (least privilege for humans; changes go through the API), alert on reconciliation errors and on drift where the provider surfaces it, and tell the tenant the right route: change the MessageQueue spec (e.g. add a consumer) rather than editing the cloud.",
              "Fix the model: put the full IAM policy document under the Composition's control so the provider owns it and reverts manual edits; audit managementPolicies on the managed resources to ensure they include Update. Fix the access: humans lose write access to platform-managed cloud resources (read-only console; changes through the API or a break-glass with alerts). Fix the signal: alert on managed resources with Synced=False or reconcile errors, and consider the provider's drift metrics. Then close the loop with the tenant: the permissions 'fix' belongs in the MessageQueue spec (a consumers field the Composition maps to policy), reviewed in Git -- which is exactly why the API exists."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 8%
    {
      slug: "golden-path-template",
      objective: "Simplified access to platform capabilities: golden paths, templates, CLIs and abstractions that hide complexity without removing control",
      kind: "build",
      title: "Define the golden path for a new service",
      brief:
        "New services at the fictional retailer Wexford & Lane take two weeks to reach production because each team assembles pipeline, manifests, monitoring and access by hand. The platform team wants a golden path: a template that gets a new service to production in a day without hiding what teams need to understand or control.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Specify what the golden path provides, how it is delivered (template, CLI, abstractions), what remains in the team's control, and how you keep it from becoming a cage.",
          parts: [
            part(
              "What the path provides",
              "A service template (Backstage scaffolder or an equivalent CLI) that generates: a repository with a working hello-world in the team's language, Dockerfile, CI pipeline (build, test, scan, sign, push, commit digest), Kubernetes config with base and overlays, Argo CD Application, catalog entry with ownership and annotations, dashboards and alerts, and a runbook stub; all wired to platform conventions.",
              "Running the template with a service name, team and language yields: a repo with a minimal service and tests; a Dockerfile following the platform base image; a pipeline that builds, tests, scans, signs and pushes by digest and bumps the dev overlay; a config directory with base and overlays carrying probes, resources, security context and HPA; an Argo CD Application for each environment; catalog-info.yaml with owner, system and annotations for CI, Kubernetes and TechDocs; a Grafana folder with RED dashboards and SLO template; alert routing to the team's channel; and a docs/ folder with a runbook skeleton. A deploy to dev happens on the first commit."
            ),
            part(
              "Delivery mechanisms",
              "A portal template (Backstage Software Template) for the guided path, a CLI for the same actions for people who prefer terminals and for automation, and abstractions as declarative resources (the PostgresDatabase or Ingress resource) for capabilities; explains that templates generate editable code rather than hiding it behind a black box.",
              "Three doors into the same path: the portal form for discoverability and guidance; a platform CLI (platform svc new --lang go --team checkout) that calls the same template for people in terminals and for scripts; and platform CRDs for capabilities teams add later (a database API, an ingress API). Templates generate plain files into the team's repo -- the team can read and edit every line -- rather than a hidden service that owns the configuration."
            ),
            part(
              "What teams keep",
              "Teams own their repo, code, Dockerfile, pipeline steps after the standard stages, environment overlays, dashboards and alerts; they can deviate from defaults with a documented exception; the platform owns the template, the base image, the standard stages and the policies that enforce the floor (security, resources, ownership).",
              "After generation the team owns everything in their repository: they add pipeline steps, change replicas and resources, write dashboards, tune probes. The platform owns the template itself, the base images, the shared pipeline stages (scan, sign) and the admission policies that define the floor -- no root containers, images from the registry, owner labels. Deviations from defaults are allowed with a documented reason; deviations from the floor need an exception with an owner. Control stays with the team; the floor stays with the platform."
            ),
            part(
              "Avoiding the cage",
              "Keep the path optional with a visible exit (teams may not use the template and still deploy if they meet the floor), version the template and offer upgrades as PRs rather than forced changes, measure adoption and satisfaction, collect feedback, and fix the path when teams route around it -- a golden path is a product that competes on being the easiest way, not the only way.",
              "A golden path is the easiest way, not the only way: a team may build its own path as long as it meets the policy floor. Version the template and publish upgrades as pull requests teams can accept (template drift is managed, not forced). Watch the signals: adoption rate, time to first production deploy, and where teams route around the template -- each workaround is a requirement the path missed. Run office hours and a feedback channel; treat the template's roadmap like a product's. When the paved road is genuinely better, people take it."
            ),
          ],
        },
      ],
    },
    {
      slug: "service-catalog-design",
      objective: "Design API-driven service catalogs: cataloguing services, ownership and dependencies, and exposing platform services as catalog entries",
      kind: "case",
      title: "Fix a catalog nobody trusts",
      brief:
        "The fictional airline Dunmore Air launched a developer portal a year ago. Engineers say the catalog is 'half wrong': ownerless services, dependencies that no longer exist, and platform services (the message bus, the identity service) missing entirely. The platform lead asks how to make the catalog something people rely on during incidents.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Catalog audit:\n - 412 Component entities; 131 have owner: unknown or a team that no longer exists\n - 88 entities last updated more than a year ago (manually registered, repos renamed or archived)\n - dependsOn edges: 240; sampled 20, 9 point at components that no longer run\n - Platform services (Kafka clusters, SSO, API gateway) have no entities; teams document them in wikis\n - Catalog populated by manual registration only; no automation",
          ask: "Diagnose why the catalog decayed and design the fixes for ownership, freshness, dependencies and platform services.",
          parts: [
            part(
              "Why it decayed",
              "Manual registration with no automated ingestion means the catalog reflects the day someone registered a service, not today; ownership was free text rather than references to Group entities maintained from the identity system; dependencies were hand-declared and never verified; platform services were never modeled because the catalog was framed as 'your microservices', not 'everything a team depends on'.",
              "A catalog is only as fresh as its sources. Manual registration captured a snapshot and nothing refreshed it when repos moved or were archived -- hence 88 stale entities. owner was typed by hand, so renamed teams left 131 orphans; nothing tied owners to the identity system. dependsOn was written once and never checked against reality. And the catalog's scope excluded the platform itself, so the things every service depends on in an incident were not there."
            ),
            part(
              "Ownership and freshness",
              "Ingest Groups and Users automatically from the identity provider (GitHub org or LDAP provider) and validate that every owner references an existing Group (a policy or a catalog check that flags unknown owners); discover catalog-info.yaml files automatically from the source hosts and let orphan/removed locations expire; make ownership a required field in the service template.",
              "Teams come from the identity provider via an org entity provider, so Groups are always current and renamed teams update. A validation (a catalog processor or a nightly check) flags any Component whose owner does not resolve to a Group and opens a ticket to the last committer. Discovery providers scan every repository for catalog-info.yaml on a schedule, so moved repos are followed and archived ones drop out (or are marked), ending the year-old entities. The service template writes owner and system, so new services are never ownerless."
            ),
            part(
              "Dependencies from evidence",
              "Derive dependencies from observed data where possible -- service mesh or network telemetry, tracing spans, cloud resource relations -- and reconcile them with declared dependsOn, flagging declared-but-unobserved and observed-but-undeclared edges; keep declared edges for intent, but show observed ones for incidents.",
              "Stop trusting hand-written dependsOn alone. Pull observed call graphs from tracing (OpenTelemetry service graphs) or the mesh (Istio/Linkerd metrics) and compare with declared edges: an edge declared but never observed in 30 days is flagged as stale; an observed call with no declaration is flagged as undeclared. Present both in the entity's dependency view -- declared (intent) and observed (reality) -- so during an incident the on-call sees who actually calls whom today."
            ),
            part(
              "Platform services as entities",
              "Model platform capabilities as Resources and Systems owned by the platform team (Kafka clusters, SSO, API gateway, databases provisioned through the platform API) with their own docs, runbooks, SLOs and on-call links, and auto-create entities for resources provisioned via platform CRDs so a tenant's PostgresDatabase appears as a Resource owned by the tenant with a dependsOn from their Component.",
              "Catalog the platform: a System per platform capability (messaging, identity, edge) owned by the platform team, with Resource entities for each Kafka cluster, the SSO provider, the API gateway -- each carrying TechDocs, runbook links, SLO dashboards and the on-call channel. Then automate the long tail: an entity provider that turns every platform CRD instance (PostgresDatabase, MessageQueue) into a Resource owned by the requesting team, with dependsOn edges to the consuming Components. During an incident the catalog now answers 'what does this service depend on, who owns it, how do I reach them' -- which is the point of having one."
            ),
          ],
        },
        {
          text: "The fixes are agreed. A product manager asks whether an AI assistant in the portal could 'just answer questions about services' and whether it is safe to let it change things.",
          ask: "Explain where AI assistance fits the catalog and the guardrails it needs.",
          parts: [
            part(
              "Where it helps",
              "Answering questions over trustworthy catalog, docs and telemetry data (who owns this, what depends on it, what changed recently, what the runbook says), drafting configuration from templates, summarizing incidents -- all read-only or proposal-generating uses whose value depends on the catalog being accurate, which is why fixing the data comes first.",
              "An assistant is only as good as the catalog beneath it -- the fixes above are the prerequisite. With trustworthy data it is genuinely useful read-only: 'who owns payments-api and what does it depend on', 'what changed in checkout in the last 24 hours', 'summarize this runbook', 'draft a catalog-info.yaml for this repo', 'generate the overlay for a new environment from the template'. It turns the catalog, docs and telemetry into answers instead of searches."
            ),
            part(
              "Guardrails for actions",
              "No direct writes to clusters or production systems; any change the assistant proposes becomes a pull request or a template invocation that goes through the normal review and policy path; the assistant acts with the requesting user's permissions, never a privileged identity; its suggestions are labeled, logged and verifiable against sources; sensitive data stays out of prompts.",
              "Let it propose, not act: changes become pull requests (reviewed, policy-checked, reconciled by GitOps like any other) or template runs the user confirms -- never kubectl against a cluster. It runs as the user, with the user's RBAC, so it cannot see or change more than they could. Every suggestion cites its sources (catalog entity, doc, metric) so a human can verify, and every action is logged. Secrets and personal data are excluded from what it reads. The same principle as the rest of the platform: the API and the review path are the control; the assistant is a faster way to use them."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 8%
    {
      slug: "dora-metrics-plan",
      objective: "Measure platform initiatives with DORA metrics: deployment frequency, lead time for changes, change failure rate and time to restore, and how a platform moves them",
      kind: "build",
      title: "Measure whether the platform is working",
      brief:
        "Leadership at the fictional insurer Rathmore asks the platform team to prove, within two quarters, that the platform investment is paying off. The team wants to use DORA metrics plus platform-specific measures, collected automatically rather than by survey alone, and reported honestly.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Define each DORA metric for this organization with its data source, add the platform-specific measures, and describe the report and the pitfalls.",
          parts: [
            part(
              "Deployment frequency and lead time",
              "Deployment frequency: production deployments per service per week, from Argo CD sync history or the production overlay's commit history; lead time for changes: time from a commit's first appearance on main (or PR merge) to its running in production, computed by joining Git commit timestamps with the deployment event that carried that commit; both per team and in aggregate.",
              "Deployment frequency: count successful production syncs per service per week from Argo CD's application history (or from commits to overlays/prod), aggregated per team and overall. Lead time for changes: for each production deployment, the time from the merge of the newest commit it contains to the moment the sync completed and the Rollout became healthy -- joinable because the image digest maps back to the commit via the pipeline's provenance. Both are computed, not asked; the platform's standard pipeline and GitOps layer are what make the join possible across every team."
            ),
            part(
              "Change failure rate and time to restore",
              "Change failure rate: share of production deployments followed by a rollback, an aborted canary or an incident linked to them, from Rollouts abort events, revert commits and the incident tracker's linked deployments; time to restore: from incident open (or alert) to resolution, from the incident system, measured as median and distribution rather than averages.",
              "Change failure rate: deployments that caused degradation divided by deployments -- detected automatically as Argo Rollouts aborts, git reverts of a production digest within 24 hours, and incidents whose record links a deployment (the incident template asks for it). Time to restore: from the first page or incident creation to the resolved time in the incident tool, reported as a median with a distribution, since one long incident should not be hidden by an average. Both need honest incident records, which the blameless process encourages."
            ),
            part(
              "Platform-specific measures",
              "Adoption (share of services on the golden path and on the platform clusters), time to first production deploy for a new service, platform support load (tickets per tenant per month, time to resolve), cost per workload or per team (showback), platform SLO attainment, and developer satisfaction from a short quarterly survey; explains these show whether the platform is used and liked, not just whether delivery improved.",
              "DORA says whether delivery improved; these say whether the platform caused it: adoption (percentage of services using the template, the standard pipeline and the shared clusters), time to first production deploy for new services (the two-weeks-to-one-day promise), support load (tickets and questions per tenant, time to resolve), cost per team from showback, the platform's own SLO attainment, and a short quarterly developer satisfaction survey (two or three questions, trend over time). Collect the first five automatically from the catalog, Git, the ticket system and the cost tooling."
            ),
            part(
              "Reporting honestly and pitfalls",
              "Report per team and aggregate with trends, segment by platform-adopted versus not, show distributions, never rank teams publicly or tie metrics to individual performance (Goodhart's law), attribute changes carefully (other things changed too), and include negative results; a one-page quarterly report with the chart, the method and the caveats.",
              "Pitfalls first: metrics used as targets get gamed -- publish team-level numbers to the team, aggregates to leadership, never a league table; tiny deployments can inflate frequency, so pair it with change failure rate; a median lead time can hide a long tail, so show the distribution; and the platform is not the only thing that changed in two quarters, so compare adopted versus not-yet-adopted services over the same period rather than before versus after alone. The report: one page per quarter -- the four DORA charts plus adoption and satisfaction, the method and data sources, and what got worse as well as better."
            ),
          ],
        },
      ],
    },
  ],
};
