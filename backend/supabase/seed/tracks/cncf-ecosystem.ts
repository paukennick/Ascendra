// REQ-164: CNCF project certification tracks beyond Kubernetes itself --
// the Associate exams for Prometheus, OpenTelemetry, GitOps, Argo, Cilium,
// Istio, Kyverno and Backstage, and the platform engineering pair (CNPA and
// CNPE).
//
// Every domain, weight and competency was read on 2026-11-08 from the
// official curriculum PDF in github.com/cncf/curriculum (commit 0a8cc08 of
// 2026-11-03; the image-only PDFs -- CCA, CAPA, CGOA -- were read page by
// page) and each exam's page on training.linuxfoundation.org (format,
// duration, price, level, prerequisites), with passing scores from the
// Linux Foundation FAQs: multiple-choice exams 75%; ICA 68%; CNPE 64%.
// Competencies in these PDFs are short headings; each unit expands them in
// order into the concepts and skills the heading covers.

import type { SeedTrack } from "../data";

const LF_PROVIDER = {
  providerSlug: "linux-foundation",
  providerName: "The Linux Foundation / CNCF",
  providerUrl: "https://training.linuxfoundation.org/certification-catalog/",
  subcategorySlug: "cncf-certifications",
  credentialType: "certification",
} as const;

const VERIFIED_AT = "2026-11-08T00:00:00Z";
const CURRICULUM = "https://github.com/cncf/curriculum/blob/0a8cc08a502710a894e5724c2bec7b88404e5a6b";
const MC_FORMAT = "Online, proctored, multiple-choice exam, 90 minutes (Linux Foundation multiple-choice exam FAQ).";
const MC_PASS = "75% or above to pass (Linux Foundation multiple-choice exam FAQ). Certification valid for 2 years; one retake included.";

// ---------------------------------------------------------------------------
// Prometheus Certified Associate (PCA)
// Multiple choice, 90 minutes, $250, beginner; PromQL 28%, Prometheus
// Fundamentals 20%, Observability Concepts 18%, Alerting & Dashboarding 18%,
// Instrumentation and Exporters 16%.
// ---------------------------------------------------------------------------
export const PCA_TRACK: SeedTrack = {
  code: "PCA",
  title: "Prometheus Certified Associate (PCA) Coach",
  description:
    "PCA: Prometheus from the data model up. Write PromQL that answers real questions -- rates, aggregations, histograms, binary operators -- understand scraping, service discovery and Prometheus's limits, instrument code and use exporters well, and turn metrics into alerts and dashboards that mean something.",
  trackType: "certification",
  subcategorySlug: "cncf-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://training.linuxfoundation.org/certification/prometheus-certified-associate/",
  sourceVerifiedAt: VERIFIED_AT,
  credential: {
    ...LF_PROVIDER,
    credentialSlug: "pca",
    credentialName: "Prometheus Certified Associate",
    credentialUrl: "https://training.linuxfoundation.org/certification/prometheus-certified-associate/",
    basis: "vendor_exam",
    examCode: "PCA",
    objectivesRevision: "Curriculum, cncf/curriculum 0a8cc08",
    status: "active",
    officialObjectivesUrl: `${CURRICULUM}/PCA_Curriculum.pdf`,
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience: "No prerequisites. Beginner level: for engineers and SREs who run or use Prometheus and want to prove observability fundamentals.",
    durationMinutes: 90,
    questionFormat: MC_FORMAT,
    passingScorePolicy: MC_PASS,
  },
  units: [
    {
      title: "PromQL",
      weight: 28,
      gate: "Given a question about a service and the metrics it exposes, write the PromQL that answers it, choose the right function for the metric type, and say what the result's labels and units are.",
      objectives: [
        "Selecting data: instant and range vector selectors, label matchers (=, !=, =~, !~), the __name__ label, offset and @ modifiers",
        "Rates and derivatives: rate, irate and increase on counters, deriv and delta on gauges, and why the range window matters relative to the scrape interval",
        "Aggregating over time: the *_over_time functions (avg, max, min, sum, count, quantile, last) on range vectors",
        "Aggregating over dimensions: sum, avg, min, max, count, topk, bottomk and quantile with by and without",
        "Binary operators: arithmetic and comparison between vectors, one-to-one and many-to-one matching with on, ignoring and group_left/group_right, and set operators and, or, unless",
        "Histograms: _bucket, _sum and _count series, histogram_quantile over rate of buckets, and what a quantile estimate can and cannot tell you",
        "Timestamp metrics: timestamp(), time(), and computing age or freshness from metrics that carry a Unix time as their value",
        "Writing readable queries: subqueries, recording-rule naming (level:metric:operations), and avoiding common PromQL mistakes",
      ],
    },
    {
      title: "Prometheus Fundamentals",
      weight: 20,
      gate: "Given a prometheus.yml and a set of targets, explain how Prometheus discovers, scrapes, relabels and stores their samples, and name a limit of the system that a design must respect.",
      objectives: [
        "System architecture: the Prometheus server (retrieval, TSDB, HTTP API), Alertmanager, exporters, Pushgateway and the pull model, and how they fit together",
        "Configuration and scraping: prometheus.yml global settings, scrape_configs, scrape_interval and timeout, relabel_configs and metric_relabel_configs, and target health",
        "Service discovery: static_configs, file_sd and the kubernetes_sd roles (node, pod, service, endpoints), and relabelling discovered metadata into target labels",
        "Understanding Prometheus limitations: single-node storage, no long-term durability by default, cardinality, no cross-server queries without federation or remote write, and what remote write and Thanos/Cortex-style systems add",
        "Data model and labels: metric names, labels and the time series they identify, sample values and timestamps, and how cardinality grows",
        "Exposition format: the text format's HELP and TYPE lines, sample lines with labels and timestamps, and how a scrape is parsed",
        "Storage and retention: TSDB blocks and WAL, retention.time and retention.size, and what deleting or compacting series means",
      ],
    },
    {
      title: "Observability Concepts",
      weight: 18,
      gate: "Given a reliability goal, define the SLI, SLO and the alert that follows, and say which signal -- metric, log, trace or event -- answers each question about the system.",
      objectives: [
        "Metrics: counters, gauges, histograms and summaries, what each measures, and how they differ from logs and events",
        "Logs and events: when a log line or an event answers what a metric cannot, and how the three signals are correlated",
        "Tracing and spans: distributed traces, spans and context propagation, and what tracing adds to metrics",
        "Push versus pull: why Prometheus pulls, when the Pushgateway is appropriate (batch jobs) and when it is misused",
        "Service discovery as an observability concept: keeping monitoring in step with a dynamic infrastructure",
        "Basics of SLIs, SLOs and SLAs: choosing indicators, setting objectives, error budgets and burn rate",
      ],
    },
    {
      title: "Alerting & Dashboarding",
      weight: 18,
      gate: "Given a service and its SLO, write the alerting rule, route it through Alertmanager to the right people without flooding them, and lay out the dashboard panels that explain the alert.",
      objectives: [
        "Alerting basics: when to alert (symptoms over causes), what to alert on (SLO burn, saturation that predicts impact) and why pages must be actionable",
        "Configuring alerting rules: alert, expr, for, labels and annotations with templating, rule groups and evaluation interval",
        "Configure Alertmanager: routing trees, matchers, grouping, inhibition, silences, receivers and repeat intervals",
        "Design dashboards: panels that match the metric type, rate windows, units, legends, variables and avoiding misleading aggregations",
        "Recording rules for dashboards and alerts: precomputing expensive queries and naming them consistently",
      ],
    },
    {
      title: "Instrumentation and Exporters",
      weight: 16,
      gate: "Given an application or a third-party system, decide how to expose its metrics -- client library or exporter -- and name the metrics with types and labels that will make useful queries later.",
      objectives: [
        "Client libraries: instrumenting code with the official libraries, exposing /metrics, and the four metric types in code",
        "Instrumentation: what to measure (RED and USE methods), choosing counters and histograms, label choices and bucket boundaries",
        "Exporters: node_exporter, blackbox_exporter and third-party exporters, how they translate another system's state into the exposition format, and when to write your own",
        "Structuring and naming metrics: the _total, _seconds and _bytes conventions, base units, label cardinality limits, and avoiding high-cardinality labels",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// OpenTelemetry Certified Associate (OTCA)
// Multiple choice, 90 minutes, $250, beginner; Fundamentals of Observability
// 18%, The OpenTelemetry API and SDK 46%, The OpenTelemetry Collector 26%,
// Maintaining and Debugging Observability Pipelines 10%.
// ---------------------------------------------------------------------------
export const OTCA_TRACK: SeedTrack = {
  code: "OTCA",
  title: "OpenTelemetry Certified Associate (OTCA) Coach",
  description:
    "OTCA: OpenTelemetry end to end. Telemetry signals and semantic conventions, instrumenting with the API and SDK -- tracers, meters, loggers, context propagation and SDK pipelines -- and running the Collector: receivers, processors, exporters, deployment patterns and scaling, plus debugging the pipeline when data goes missing.",
  trackType: "certification",
  subcategorySlug: "cncf-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://training.linuxfoundation.org/certification/opentelemetry-certified-associate-otca/",
  sourceVerifiedAt: VERIFIED_AT,
  credential: {
    ...LF_PROVIDER,
    credentialSlug: "otca",
    credentialName: "OpenTelemetry Certified Associate",
    credentialUrl: "https://training.linuxfoundation.org/certification/opentelemetry-certified-associate-otca/",
    basis: "vendor_exam",
    examCode: "OTCA",
    objectivesRevision: "Curriculum, cncf/curriculum 0a8cc08",
    status: "active",
    officialObjectivesUrl: `${CURRICULUM}/OTCA_Curriculum.pdf`,
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience: "No prerequisites. Beginner level: for developers and operators adopting OpenTelemetry for traces, metrics and logs.",
    durationMinutes: 90,
    questionFormat: MC_FORMAT,
    passingScorePolicy: MC_PASS,
  },
  units: [
    {
      title: "Fundamentals of Observability",
      weight: 18,
      gate: "Given a system and a question about its behaviour, name the telemetry signal and the semantic conventions that would answer it, and describe how it would be instrumented and analysed.",
      objectives: [
        "Telemetry data: traces, metrics and logs as signals, resources and attributes, and how OpenTelemetry's model relates them",
        "Semantic conventions: standard attribute names for HTTP, databases, messaging, resources and more, and why consistency across services matters",
        "Choose automatic (agent and library) versus manual instrumentation for a service, and combine them",
        "Analysis and outcomes: what traces, metrics and logs each let you ask, and how correlated telemetry shortens incident response",
      ],
    },
    {
      title: "The OpenTelemetry API and SDK",
      weight: 46,
      gate: "Given a service to instrument, choose API calls for spans, metrics and logs, configure the SDK pipeline to export them, and explain how context crosses process boundaries.",
      objectives: [
        "Data model: spans with names, kinds, status, attributes, events and links; metric instruments (counter, up-down counter, histogram, gauge, observable variants) and aggregations; log records",
        "Composability and extension: the separation of API and SDK, providers, processors, exporters and samplers as pluggable components",
        "Configure the SDK with environment variables (OTEL_SERVICE_NAME, OTEL_EXPORTER_OTLP_ENDPOINT, OTEL_TRACES_SAMPLER and others), resource detection and declarative configuration",
        "Create tracers and spans: span kinds, attributes and events, recording exceptions and status, and sampling strategies",
        "Create meters and instruments: synchronous versus asynchronous instruments, views, temporality and exemplars",
        "Implement logging with the logs bridge API, log appenders, and correlation of logs with traces",
        "Build SDK pipelines: span processors (simple, batch), metric readers (periodic, pull), log record processors, and OTLP and other exporters",
        "Implement context propagation: the context API, baggage, the W3C Trace Context and Baggage propagators, and propagating across threads and services",
        "Agents: zero-code instrumentation agents (Java agent, Python auto-instrumentation and others), the Operator's injection on Kubernetes, and their limits",
      ],
    },
    {
      title: "The OpenTelemetry Collector",
      weight: 26,
      gate: "Given telemetry requirements, write a Collector configuration with the right receivers, processors and exporters, choose agent or gateway deployment, and scale it without losing data.",
      objectives: [
        "Write a Collector configuration: receivers, processors, exporters, connectors and extensions wired into service pipelines per signal",
        "Choose a deployment pattern: agent (sidecar or DaemonSet) and gateway, the Collector distributions (core, contrib, custom builds with the builder) and the Operator",
        "Scaling: horizontal scaling with load balancing, the load-balancing exporter for tail sampling, resource limits and the memory_limiter processor",
        "Design pipelines: batching, retries and queues, fan-out to multiple exporters, and ordering of processors",
        "Transforming data: attributes, resource, filter and transform (OTTL) processors, redaction, and tail-based sampling",
      ],
    },
    {
      title: "Maintaining and Debugging Observability Pipelines",
      weight: 10,
      gate: "Given telemetry that is missing, broken or inconsistent, trace the problem through propagation, the SDK and the Collector to the step at fault and fix it.",
      objectives: [
        "Diagnose context propagation problems: broken traces from missing propagators or headers, and how to find where a trace splits",
        "Debugging pipelines: the debug exporter, Collector internal telemetry (zpages, metrics), logging levels and checking each stage",
        "Error handling: exporter failures, retries and queue behaviour, backpressure, and what is dropped when",
        "Schema management: telemetry schemas, schema URLs and evolving semantic conventions without breaking dashboards",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Certified GitOps Associate (CGOA)
// Multiple choice, 90 minutes, $250, beginner; GitOps Terminology 20%, GitOps
// Principles 30%, Related Practices 16%, GitOps Patterns 20%, Tooling 14%
// (CGOA_Curriculum.pdf, read page by page on 2026-11-08).
// ---------------------------------------------------------------------------
export const CGOA_TRACK: SeedTrack = {
  code: "CGOA",
  title: "Certified GitOps Associate (CGOA) Coach",
  description:
    "CGOA: GitOps as the OpenGitOps project defines it. The vocabulary (desired state, drift, reconciliation, state store), the four principles, how GitOps relates to IaC, CI/CD and DevSecOps, the deployment and architecture patterns teams use, and the tooling -- manifests, state stores, reconcilers such as Argo CD and Flux -- that implements it.",
  trackType: "certification",
  subcategorySlug: "cncf-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://training.linuxfoundation.org/certification/certified-gitops-associate-cgoa/",
  sourceVerifiedAt: VERIFIED_AT,
  credential: {
    ...LF_PROVIDER,
    credentialSlug: "cgoa",
    credentialName: "Certified GitOps Associate",
    credentialUrl: "https://training.linuxfoundation.org/certification/certified-gitops-associate-cgoa/",
    basis: "vendor_exam",
    examCode: "CGOA",
    objectivesRevision: "Curriculum, cncf/curriculum 0a8cc08",
    status: "active",
    officialObjectivesUrl: `${CURRICULUM}/CGOA_Curriculum.pdf`,
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience: "No prerequisites. Beginner level: for anyone adopting or operating GitOps-based delivery, from developers to platform and release engineers.",
    durationMinutes: 90,
    questionFormat: MC_FORMAT,
    passingScorePolicy: MC_PASS,
  },
  units: [
    {
      title: "GitOps Terminology",
      weight: 20,
      gate: "Given a description of a delivery setup, name each GitOps term that applies -- desired state, drift, reconciliation, state store, feedback loop -- and spot where the description misuses one.",
      objectives: [
        "Continuous: what 'continuous' means in GitOps -- reconciliation that keeps running, not a one-time deployment",
        "Declarative description and desired state: describing what the system should be rather than steps to get there, and where the desired state is recorded",
        "State drift and state reconciliation: how the actual state diverges and how an agent detects and corrects the difference",
        "GitOps managed software system and the state store: what is under GitOps control and the versioned, immutable store that holds its desired state",
        "Feedback loop and rollback: how observed state informs operators, and how rollback is a change to desired state rather than a manual intervention",
        "Recognise GitOps terminology misuse: 'GitOps' claimed for a CI pipeline that pushes with kubectl, or for a system with no reconciler",
      ],
    },
    {
      title: "GitOps Principles",
      weight: 30,
      gate: "Given a delivery design, evaluate it against each of the four OpenGitOps principles, identify which it violates, and redesign it to satisfy them.",
      objectives: [
        "Declarative: the whole desired state expressed declaratively, and why imperative steps and scripts break the principle",
        "Versioned and immutable: desired state stored in a way that enforces immutability and versioning with full history, and what that enables (audit, rollback, review)",
        "Pulled automatically: software agents pull the desired state from the source rather than having changes pushed to them, and why pull matters for security and reliability",
        "Continuously reconciled: agents continuously observe actual state and attempt to apply the desired state, and the implications for manual changes and drift",
        "Evaluate a design against the four principles and identify which are violated by common shortcuts (CI pushing to the cluster, hand-edited live resources, unversioned config stores)",
        "Design a delivery flow that satisfies all four principles for a given application and team",
      ],
    },
    {
      title: "Related Practices",
      weight: 16,
      gate: "Given a team's existing practices, say how GitOps relates to and differs from each -- IaC, CaC, DevOps, DevSecOps, CI and CD -- and where it fits in their pipeline.",
      objectives: [
        "Configuration as Code (CaC): managing configuration in version control and how GitOps consumes it",
        "Infrastructure as Code (IaC): declarative infrastructure (Terraform, Crossplane, cluster API) and how GitOps reconciles infrastructure as well as applications",
        "DevOps and DevSecOps: GitOps as an implementation of DevOps principles and how security review and policy enter the Git workflow",
        "CI and CD: the boundary between integration (build, test, publish) and delivery (reconcile desired state), and why GitOps separates them",
        "Choose where GitOps fits a given pipeline and which practices it replaces, complements or leaves unchanged",
      ],
    },
    {
      title: "GitOps Patterns",
      weight: 20,
      gate: "Given release and architecture requirements, select the GitOps patterns that meet them -- deployment strategy, progressive delivery, pull or event-driven reconciliation, reconciler placement -- and justify each.",
      objectives: [
        "Deployment and release patterns: environment promotion through branches or directories, release by pull request, and tagging and pinning versions",
        "Progressive delivery patterns: canary, blue/green and feature flags driven from desired state, and the role of metrics in automated promotion",
        "Pull versus event-driven: scheduled reconciliation versus webhook-triggered reconciliation, and their trade-offs for latency and robustness",
        "Architecture patterns: in-cluster versus external reconcilers, hub-and-spoke for many clusters, and state store management (monorepo, repo per team or environment)",
        "Select patterns for a given scenario and explain the trade-offs between them",
      ],
    },
    {
      title: "Tooling",
      weight: 14,
      gate: "Given an organisation's stack, choose the manifest format, state store and reconciliation engine, and describe how they interoperate with notifications, observability and CI.",
      objectives: [
        "Select a manifest format and packaging: plain YAML, Kustomize, Helm and OCI artifacts as inputs to a reconciler",
        "State store systems: Git and its alternatives (OCI registries, object storage) and what makes a store suitable as a GitOps state store",
        "Configure a reconciliation engine: Argo CD, Flux and alternatives -- their models (Applications, Kustomizations/HelmReleases), sync and health",
        "Interoperability with notifications, observability and continuous integration tools: alerts on drift and sync failure, metrics, and CI that updates desired state",
        "Choose tooling for a given organisation and justify the choice",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Certified Argo Project Associate (CAPA)
// Multiple choice, 90 minutes, $250, beginner; Argo Workflows 36%, Argo CD
// 34%, Argo Rollouts 18%, Argo Events 12% (CAPA_Curriculum.pdf, read page
// by page on 2026-11-08).
// ---------------------------------------------------------------------------
export const CAPA_TRACK: SeedTrack = {
  code: "CAPA",
  title: "Certified Argo Project Associate (CAPA) Coach",
  description:
    "CAPA: the four Argo projects. Argo Workflows for container-native pipelines and DAGs with artifacts and templates, Argo CD for GitOps delivery with Applications, Helm and Kustomize, Argo Rollouts for canary and blue/green with analysis, and Argo Events for event-driven automation.",
  trackType: "certification",
  subcategorySlug: "cncf-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://training.linuxfoundation.org/certification/certified-argo-project-associate-capa/",
  sourceVerifiedAt: VERIFIED_AT,
  credential: {
    ...LF_PROVIDER,
    credentialSlug: "capa",
    credentialName: "Certified Argo Project Associate",
    credentialUrl: "https://training.linuxfoundation.org/certification/certified-argo-project-associate-capa/",
    basis: "vendor_exam",
    examCode: "CAPA",
    objectivesRevision: "Curriculum, cncf/curriculum 0a8cc08",
    status: "active",
    officialObjectivesUrl: `${CURRICULUM}/CAPA_Curriculum.pdf`,
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience: "No prerequisites. Beginner level: for engineers using or evaluating the Argo projects on Kubernetes.",
    durationMinutes: 90,
    questionFormat: MC_FORMAT,
    passingScorePolicy: MC_PASS,
  },
  units: [
    {
      title: "Argo Workflows",
      weight: 36,
      gate: "Given a multi-step job, write the Workflow with the right templates, pass artifacts and parameters between steps, and structure it as steps or a DAG that runs in the right order.",
      objectives: [
        "Argo Workflow fundamentals: the Workflow CRD, the controller, templates and the entrypoint, and how each step runs as a Pod",
        "Configure artifacts: inputs and outputs, artifact repositories (S3-compatible, GCS, and others), and passing files and parameters between steps",
        "Write Workflow templates: container, script, resource and suspend templates, WorkflowTemplate and ClusterWorkflowTemplate for reuse, and CronWorkflow for schedules",
        "Understand the Workflow spec: parameters, volumes, retryStrategy, timeouts, activeDeadlineSeconds, exit handlers, and workflow and pod garbage collection",
        "Build DAGs: tasks with dependencies, conditional execution with when, loops with withItems and withParam, and fan-out and fan-in",
        "Design data processing jobs with Argo Workflows: parallelism controls, memoization, resource requests per step, and patterns for large batch pipelines",
      ],
    },
    {
      title: "Argo CD",
      weight: 34,
      gate: "Given an application repository and target clusters, write the Argo CD Application (or ApplicationSet), choose sync and health options, and explain how a change in Git becomes a change in the cluster -- and what happens when it does not.",
      objectives: [
        "Argo CD fundamentals: the Application and AppProject CRDs, the application controller, repo server and API server, and sync status versus health status",
        "Configure synchronization in Argo CD: manual and automated sync, prune and self-heal, sync waves and hooks, sync options, and reading diffs",
        "Build Applications and ApplicationSets: source (repo, path, revision), destination (cluster, namespace), generators for many clusters or teams, and the app-of-apps pattern",
        "Configure Argo CD with Helm and Kustomize: Helm values and parameters, Kustomize overlays and images, and multiple sources",
        "Troubleshoot common reconciliation patterns: OutOfSync caused by drift, ignoring differences, resource hooks, degraded health, and a sync that fails",
      ],
    },
    {
      title: "Argo Rollouts",
      weight: 18,
      gate: "Given a release requirement, write the Rollout with a canary or blue/green strategy, wire an AnalysisTemplate to metrics, and explain how the controller promotes or aborts.",
      objectives: [
        "Argo Rollouts fundamentals: the Rollout CRD as a Deployment replacement, the controller, and how it integrates with Services, Ingress and service meshes for traffic shaping",
        "Implement progressive rollout strategies: canary with steps (setWeight, pause, analysis), blue/green with preview and active Services, and manual or automatic promotion and abort",
        "Design AnalysisTemplates and AnalysisRuns: metric providers (Prometheus, Datadog, Kayenta, web, job), success and failure conditions, and how analysis gates a rollout",
      ],
    },
    {
      title: "Argo Events",
      weight: 12,
      gate: "Given an external event that should trigger work in the cluster, wire the EventSource, EventBus and Sensor so the event becomes a Workflow or Kubernetes object, with filtering and parameters.",
      objectives: [
        "Argo Events fundamentals: event-driven automation for Kubernetes and how it connects external systems to Workflows and other resources",
        "Build event flows from the Argo Events components: EventSource types (webhook, S3, Kafka, calendar, resource and more), the EventBus (NATS/JetStream), Sensors with dependencies, filters and triggers, and trigger parameterization",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Cilium Certified Associate (CCA)
// Multiple choice, 90 minutes, $250, beginner (Kubernetes and basic
// networking knowledge recommended). Architecture 20%, Network Policy 18%,
// Service Mesh 16%, Network Observability 10%, Installation and
// Configuration 10%, Cluster Mesh 10%, eBPF 10%, BGP and External Networking
// 6% (CCA_Curriculum.pdf, read page by page on 2026-11-08).
// ---------------------------------------------------------------------------
export const CCA_TRACK: SeedTrack = {
  code: "CCA",
  title: "Cilium Certified Associate (CCA) Coach",
  description:
    "CCA: Cilium as the Kubernetes network layer. Its eBPF datapath and components, identity-based network policy, Ingress and Gateway API with sidecarless service mesh, Hubble observability, installation with the Cilium CLI, Cluster Mesh across clusters, and BGP for external connectivity.",
  trackType: "certification",
  subcategorySlug: "cncf-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://training.linuxfoundation.org/certification/cilium-certified-associate-cca/",
  sourceVerifiedAt: VERIFIED_AT,
  credential: {
    ...LF_PROVIDER,
    credentialSlug: "cca",
    credentialName: "Cilium Certified Associate",
    credentialUrl: "https://training.linuxfoundation.org/certification/cilium-certified-associate-cca/",
    basis: "vendor_exam",
    examCode: "CCA",
    objectivesRevision: "Curriculum, cncf/curriculum 0a8cc08",
    status: "active",
    officialObjectivesUrl: `${CURRICULUM}/CCA_Curriculum.pdf`,
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience: "No prerequisites, but Kubernetes and basic networking knowledge (the 7-layer model, TCP/UDP, IP addressing) are recommended. Beginner level.",
    durationMinutes: 90,
    questionFormat: MC_FORMAT,
    passingScorePolicy: MC_PASS,
  },
  units: [
    {
      title: "Architecture",
      weight: 20,
      gate: "Given a cluster running Cilium, explain what each component does, how a Pod gets an address, and which datapath mode a packet takes between two Pods.",
      objectives: [
        "Understand the role of Cilium in Kubernetes environments: CNI, kube-proxy replacement, network policy, observability and service mesh in one agent",
        "Cilium architecture: the agent DaemonSet, operator, Envoy proxy, Hubble relay and UI, and the Cilium CLI",
        "Configure IP address management (IPAM) with Cilium: cluster-scope and Kubernetes host-scope modes, pod CIDRs per node, and cloud-native IPAM (ENI, Azure, GKE)",
        "Cilium component roles: what the agent, operator and proxy each own, and how they interact with the Kubernetes API",
        "Datapath models: encapsulation (VXLAN, Geneve) versus native routing, and how to choose between them",
      ],
    },
    {
      title: "Network Policy",
      weight: 18,
      gate: "Given an application's required flows, write Cilium network policies that allow exactly them at L3, L4 and L7, read an existing policy's intent, and explain how identities make it work.",
      objectives: [
        "Interpret Cilium network policies and their intent: endpointSelector, ingress and egress rules, and what a policy allows at L3, L4 and L7",
        "Understand Cilium's identity-based network security model: security identities derived from labels, how they replace IP-based rules, and how identities are shared across nodes",
        "Policy enforcement modes: default, always and never, and what each means for endpoints with no policy",
        "Write policy rules using the policy rule structure: CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy, toEndpoints, toFQDNs, toEntities, toCIDR, toPorts with L7 rules",
        "Kubernetes NetworkPolicies versus Cilium network policies: what each can express, and how Cilium enforces both",
      ],
    },
    {
      title: "Service Mesh",
      weight: 16,
      gate: "Given an application that needs north-south routing and encrypted east-west traffic, configure Cilium's Ingress or Gateway API and transparent encryption, and explain the sidecarless model's trade-offs.",
      objectives: [
        "Know how to use Ingress or Gateway API for ingress routing with Cilium: the Cilium ingress controller, GatewayClass, Gateway and HTTPRoute",
        "Service mesh use cases: traffic management, observability, mutual authentication and encryption without application changes",
        "Understand the benefits of Gateway API over Ingress: role-oriented resources, expressive routing, and portability",
        "Configure encryption of traffic in transit with Cilium: WireGuard and IPsec transparent encryption, and node-to-node encryption",
        "Sidecar-based versus sidecarless architectures: Cilium's per-node Envoy and eBPF datapath compared with per-Pod sidecar meshes",
      ],
    },
    {
      title: "Network Observability",
      weight: 10,
      gate: "Given a connectivity complaint, use Hubble to see the flows, the verdicts and the Layer 7 details, and point to the policy or endpoint responsible.",
      objectives: [
        "Understand the observability capabilities of Hubble: flow logs, verdicts (forwarded, dropped, audited), service maps and metrics",
        "Configure Layer 7 protocol visibility: visibility annotations and L7 policy rules that make HTTP, DNS and Kafka visible in Hubble",
        "Troubleshoot connectivity with Hubble from the command line or the Hubble UI: hubble observe filters, hubble status, and reading the UI's service map",
      ],
    },
    {
      title: "Installation and Configuration",
      weight: 10,
      gate: "Given a new cluster, install Cilium with the CLI or Helm, run the connectivity test, and read and change the running configuration.",
      objectives: [
        "Know how to use the Cilium CLI to query and modify the configuration: cilium status, cilium config view and set, and Helm values",
        "Use the Cilium CLI to install Cilium, run connectivity tests and monitor its status: cilium install, cilium connectivity test, cilium status --wait",
      ],
    },
    {
      title: "Cluster Mesh",
      weight: 10,
      gate: "Given two clusters, explain what Cluster Mesh connects, enable it, and make a Service global so it is discovered and load balanced across clusters.",
      objectives: [
        "Understand the benefits of Cluster Mesh for multi-cluster connectivity: Pod IP routing across clusters, shared identities and policy, and high availability",
        "Configure service discovery and load balancing across clusters with Cluster Mesh: cilium clustermesh enable and connect, global services, and affinity annotations",
      ],
    },
    {
      title: "eBPF",
      weight: 10,
      gate: "Explain what eBPF is, why Cilium is built on it, and what it changes compared with an iptables-based datapath.",
      objectives: [
        "Understand the role of eBPF in Cilium: programs attached to kernel hooks for networking, policy, load balancing and observability",
        "eBPF key benefits: safety through verification, performance, programmability without kernel modules, and in-kernel visibility",
        "eBPF-based platforms versus iptables-based platforms: per-packet cost, rule-chain growth, kube-proxy replacement and identity-aware policy",
      ],
    },
    {
      title: "BGP and External Networking",
      weight: 6,
      gate: "Given a cluster that must exchange routes with the data centre network, configure Cilium's BGP control plane and explain how Pod and Service addresses reach external systems.",
      objectives: [
        "Egress connectivity requirements: masquerading, Egress Gateway for predictable source IPs, and routing Pod traffic to external networks",
        "Understand options to connect Cilium-managed clusters with external networks: the BGP control plane (peering policies, advertised Pod CIDRs and LoadBalancer IPs) and LB IPAM",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Istio Certified Associate (ICA)
// Performance-based and multiple-choice, 2 hours, $250, intermediate; pass
// mark 68% (Linux Foundation ICA FAQ). Installation, Upgrades and
// Configuration 20%, Traffic Management 35%, Securing Workloads 25%,
// Troubleshooting 20% (ICA_Curriculum.pdf).
// ---------------------------------------------------------------------------
export const ICA_TRACK: SeedTrack = {
  code: "ICA",
  title: "Istio Certified Associate (ICA) Coach",
  description:
    "ICA: Istio hands-on. Install and upgrade it with istioctl or Helm in sidecar or ambient mode, manage traffic with Gateways, VirtualServices, DestinationRules, shifting, resilience and fault injection, secure workloads with mTLS, JWT and authorization policies, and troubleshoot the control plane and data plane with istioctl.",
  trackType: "certification",
  subcategorySlug: "cncf-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://training.linuxfoundation.org/certification/istio-certified-associate-ica/",
  sourceVerifiedAt: VERIFIED_AT,
  credential: {
    ...LF_PROVIDER,
    credentialSlug: "ica",
    credentialName: "Istio Certified Associate",
    credentialUrl: "https://training.linuxfoundation.org/certification/istio-certified-associate-ica/",
    basis: "vendor_exam",
    examCode: "ICA",
    objectivesRevision: "Curriculum, cncf/curriculum 0a8cc08",
    status: "active",
    officialObjectivesUrl: `${CURRICULUM}/ICA_Curriculum.pdf`,
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience: "No prerequisites. Intermediate level: comfortable with Kubernetes, kubectl and YAML, and with how HTTP services call each other.",
    durationMinutes: 120,
    questionFormat: "Online, proctored, performance-based and multiple-choice exam: hands-on tasks against a live Istio cluster plus multiple-choice items, 120 minutes (Linux Foundation ICA FAQ).",
    passingScorePolicy: "68% or above to pass (Linux Foundation ICA FAQ). Certification valid for 2 years; one retake included.",
  },
  units: [
    {
      title: "Installation, Upgrades, and Configuration",
      weight: 20,
      gate: "Given a cluster and requirements, install Istio in the right mode with istioctl or Helm, customise the installation, and upgrade it without breaking traffic.",
      objectives: [
        "Install and configure Istio with istioctl or Helm: profiles, IstioOperator overlays, Helm charts (base, istiod, gateway) and verifying the installation",
        "Install Istio in sidecar or ambient mode: namespace injection labels and the ztunnel/waypoint model, and when each fits",
        "Customise your Istio installation: mesh config, component settings, gateway deployments and resource tuning",
        "Plan and perform an Istio upgrade, canary (revision-based) or in-place, and move workloads between revisions safely",
      ],
    },
    {
      title: "Traffic Management",
      weight: 35,
      gate: "Given routing and resilience requirements, write the Gateway, VirtualService and DestinationRule objects that implement them, shift traffic between versions, and verify the behaviour.",
      objectives: [
        "Configure ingress and egress traffic: Istio Gateway and VirtualService for inbound traffic, egress gateways and ServiceEntry for outbound",
        "Configure routing within the service mesh: VirtualService match rules on host, path, headers and weights, and route to subsets",
        "Define traffic policies with DestinationRules: subsets by labels, load balancing, connection pools and TLS settings",
        "Configure traffic shifting between versions with weighted routes and header-based routing for canaries and dark launches",
        "Connect in-mesh workloads to external workloads and services with ServiceEntry, resolution modes and TLS origination",
        "Use resilience features: circuit breaking and outlier detection, failover and locality load balancing, timeouts and retries",
        "Use fault injection: HTTP delays and aborts in VirtualServices to test an application's resilience",
      ],
    },
    {
      title: "Securing Workloads",
      weight: 25,
      gate: "Given security requirements, enforce mutual TLS, authenticate end users with JWT, write authorization policies that allow exactly the needed calls, and terminate TLS at the edge.",
      objectives: [
        "Configure authorization with AuthorizationPolicy: ALLOW, DENY and CUSTOM actions, sources, operations and conditions, and policy evaluation order",
        "Configure authentication with PeerAuthentication (mTLS modes STRICT, PERMISSIVE, DISABLE at mesh, namespace and workload scope) and RequestAuthentication (JWT issuers and JWKS)",
        "Secure edge traffic with TLS: Gateway servers with SIMPLE, MUTUAL and PASSTHROUGH modes, certificates in Secrets, and SNI routing",
        "Understand Istio identity: SPIFFE identities from ServiceAccounts, certificate issuance by istiod, and how identity feeds authorization",
      ],
    },
    {
      title: "Troubleshooting",
      weight: 20,
      gate: "Given a request that fails or routes wrongly, use istioctl and proxy logs to find whether the configuration, the control plane or the data plane is at fault, and fix it.",
      objectives: [
        "Troubleshoot configuration with istioctl analyze, istioctl x describe and validation messages, and common conflicts between VirtualServices and DestinationRules",
        "Troubleshoot the mesh control plane: istiod health, configuration distribution status (istioctl proxy-status), revision mismatches and injection failures",
        "Troubleshoot the mesh data plane: Envoy access logs and response flags, istioctl proxy-config for listeners, routes, clusters and endpoints, and debugging mTLS and policy denials",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Kyverno Certified Associate (KCA)
// Multiple choice, 90 minutes, $250, beginner. Fundamentals of Kyverno 18%,
// Installation, Configuration, and Upgrades 18%, Kyverno CLI 12%, Applying
// Policies 10%, Writing Policies 32%, Policy Management 10%
// (KCA_Curriculum.pdf).
// ---------------------------------------------------------------------------
export const KCA_TRACK: SeedTrack = {
  code: "KCA",
  title: "Kyverno Certified Associate (KCA) Coach",
  description:
    "KCA: policy as Kubernetes resources with Kyverno. How admission control and Kyverno's rules work, installing and upgrading it with Helm, writing validate, mutate, generate, verifyImages and cleanup rules with variables, preconditions and CEL, testing with the Kyverno CLI, applying policies safely in Audit and Enforce, and reading policy reports.",
  trackType: "certification",
  subcategorySlug: "cncf-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://training.linuxfoundation.org/certification/kyverno-certified-associate-kca/",
  sourceVerifiedAt: VERIFIED_AT,
  credential: {
    ...LF_PROVIDER,
    credentialSlug: "kca",
    credentialName: "Kyverno Certified Associate",
    credentialUrl: "https://training.linuxfoundation.org/certification/kyverno-certified-associate-kca/",
    basis: "vendor_exam",
    examCode: "KCA",
    objectivesRevision: "Curriculum, cncf/curriculum 0a8cc08",
    status: "active",
    officialObjectivesUrl: `${CURRICULUM}/KCA_Curriculum.pdf`,
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience: "No prerequisites. Beginner level: for platform and security engineers who write or operate Kubernetes policy with Kyverno.",
    durationMinutes: 90,
    questionFormat: MC_FORMAT,
    passingScorePolicy: MC_PASS,
  },
  units: [
    {
      title: "Fundamentals of Kyverno",
      weight: 18,
      gate: "Given a governance need, explain how Kyverno meets it as an admission controller and background scanner, and read a policy's YAML to say what it matches and does.",
      objectives: [
        "Interpret Kyverno policies and rules: ClusterPolicy and Policy, rule types (validate, mutate, generate, verifyImages, cleanup), match and exclude blocks, and how rules are evaluated",
        "YAML manifests as the unit of policy: how Kyverno treats Kubernetes resources, the admission request it sees, and how policies are themselves Kubernetes resources",
        "Recognise how admission controllers work: validating and mutating admission webhooks, how Kyverno registers them, failure policies and the admission request lifecycle",
        "OCI images in Kyverno: image references in Pod specs, how verifyImages resolves digests and signatures, and what registry access Kyverno needs",
      ],
    },
    {
      title: "Installation, Configuration, and Upgrades",
      weight: 18,
      gate: "Given a cluster, install Kyverno with Helm in a highly available configuration, tune its controllers and RBAC, and upgrade it without breaking admission.",
      objectives: [
        "Install and configure Kyverno with Helm: chart values for the admission, background, cleanup and reports controllers, resource filters and webhook settings",
        "Kyverno Custom Resource Definitions: ClusterPolicy, Policy, PolicyException, CleanupPolicy, UpdateRequest and the report CRDs, and what each stores",
        "Configure the controllers with flags and the kyverno ConfigMap: webhook timeouts, excluded namespaces and resource filters, and generate/background behaviour",
        "Configure Kyverno RBAC, roles and permissions: what the controllers may read and write, and the extra ClusterRoles a generate rule needs",
        "Plan a highly available installation: replica counts per controller, pod disruption budgets, leader election and webhook failurePolicy",
        "Upgrade Kyverno: Helm upgrade order, CRD updates, compatibility between versions, and verifying policies still load",
      ],
    },
    {
      title: "Kyverno CLI",
      weight: 12,
      gate: "Given a set of policies and manifests, use the Kyverno CLI to apply policies offline, write tests that prove each rule's expected result, and query JSON with jp.",
      objectives: [
        "Install the Kyverno CLI (kubectl kyverno plugin or standalone binary) and understand what it can do without a cluster",
        "Apply policies offline with kyverno apply against manifests or a cluster, with variables and values files",
        "Write tests with kyverno test: the kyverno-test.yaml layout, expected results per rule and resource, and running tests in CI",
        "Query and transform JSON with kyverno jp: JMESPath expressions and the Kyverno custom functions",
      ],
    },
    {
      title: "Applying Policies",
      weight: 10,
      gate: "Given a policy and a cluster, choose the validation action, scope the policy to the right resources and namespaces, and roll it out from Audit to Enforce safely.",
      objectives: [
        "Apply policies in the cluster: Audit versus Enforce (the rule's failureAction), background scanning, and the effect on existing resources",
        "Select resources with match and exclude: kinds, names, namespaces, selectors, operations, roles and subjects, any and all blocks",
        "Configure common policy settings for Kyverno rules: failurePolicy, webhookTimeoutSeconds, admission and background flags, skipBackgroundRequests and schemaValidation",
      ],
    },
    {
      title: "Writing Policies",
      weight: 32,
      gate: "Given a governance requirement, write the Kyverno rule that enforces or implements it -- validate, mutate, generate, verifyImages or cleanup -- with the right preconditions, variables and tests.",
      objectives: [
        "Write validation rules: pattern, anyPattern, deny with conditions, CEL expressions, messages and the operators and anchors in patterns",
        "Use preconditions to control when a rule applies: any and all conditions on request and resource data",
        "Understand background scans: how validate rules run against existing resources and feed policy reports",
        "Write mutation rules: patchStrategicMerge, patchesJson6902, foreach for lists, and mutating existing resources with targets",
        "Write generation rules: creating resources from a data block or by cloning, synchronization, and triggers such as new namespaces",
        "Write verifyImage rules: Sigstore cosign and Notary signatures, attestations, required digests and mutating image references to digests",
        "Use variables and API calls in policies: request, serviceAccountName and image variables, context with configMap and apiCall, and JMESPath",
        "Write JSON patches: RFC 6902 operations and paths for precise mutations",
        "Autogen rules: how Pod rules are generated for Deployments, StatefulSets, Jobs and other controllers, and when to disable autogen",
        "Write cleanup policies: CleanupPolicy and ClusterCleanupPolicy with schedules and conditions, and TTL labels",
        "Use the Common Expression Language in Kyverno: CEL validations, variables and expressions versus pattern-based rules",
      ],
    },
    {
      title: "Policy Management",
      weight: 10,
      gate: "Given a running Kyverno installation, read its policy reports, create exceptions for legitimate violations, and monitor the controllers with metrics.",
      objectives: [
        "Policy reports: PolicyReport and ClusterPolicyReport resources, result statuses (pass, fail, warn, error, skip) and reading them with kubectl",
        "Configure PolicyExceptions: exempting specific resources from specific rules, scoping and approving exceptions",
        "Monitor Kyverno metrics: admission latency, policy results, controller health and the Prometheus endpoints",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Certified Backstage Associate (CBA)
// Multiple choice, 90 minutes, $250, beginner. Backstage Development Workflow
// 24%, Backstage Infrastructure 22%, Backstage Catalog 22%, Customizing
// Backstage 32% (CBA_Curriculum.pdf).
// ---------------------------------------------------------------------------
export const CBA_TRACK: SeedTrack = {
  code: "CBA",
  title: "Certified Backstage Associate (CBA) Coach",
  description:
    "CBA: building and running a Backstage developer portal. The local development workflow with TypeScript, Yarn and Docker, the framework and its client-server architecture and configuration, the Software Catalog and how entities are ingested, and customising the app with frontend and backend plugins, React and Material UI.",
  trackType: "certification",
  subcategorySlug: "cncf-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://training.linuxfoundation.org/certification/certified-backstage-associate-cba/",
  sourceVerifiedAt: VERIFIED_AT,
  credential: {
    ...LF_PROVIDER,
    credentialSlug: "cba",
    credentialName: "Certified Backstage Associate",
    credentialUrl: "https://training.linuxfoundation.org/certification/certified-backstage-associate-cba/",
    basis: "vendor_exam",
    examCode: "CBA",
    objectivesRevision: "Curriculum, cncf/curriculum 0a8cc08",
    status: "active",
    officialObjectivesUrl: `${CURRICULUM}/CBA_Curriculum.pdf`,
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience: "No prerequisites. Beginner level: for platform engineers and developers who build, customise or operate a Backstage portal; TypeScript and React familiarity helps.",
    durationMinutes: 90,
    questionFormat: MC_FORMAT,
    passingScorePolicy: MC_PASS,
  },
  units: [
    {
      title: "Backstage Development Workflow",
      weight: 24,
      gate: "Given a fresh checkout of a Backstage app, run it locally, compile it, manage its dependencies and build a container image of it, explaining what each tool does.",
      objectives: [
        "Build and run Backstage projects locally: create-app, yarn install, yarn start and yarn dev, and the app-config files the dev server reads",
        "Understand local development workflows: the monorepo layout (packages/app, packages/backend, plugins/), hot reload, and how frontend and backend run together",
        "Compile a Backstage project with TypeScript: yarn tsc, type checking across packages, and common type errors in plugins",
        "Download and install dependencies for a Backstage project with NPM/Yarn: Yarn workspaces, the lockfile, backstage-cli versions:bump and keeping @backstage packages aligned",
        "Use Docker to build a container image of a Backstage project: yarn build:backend, the Dockerfile the CLI generates, host versus multi-stage builds and runtime configuration",
      ],
    },
    {
      title: "Backstage Infrastructure",
      weight: 22,
      gate: "Given a Backstage deployment target, configure the app and backend for it, explain how the frontend and backend communicate, and deploy it to production with a real database.",
      objectives: [
        "Understand the Backstage framework: the new backend system, plugins and extension points, services, and the frontend app shell",
        "Configure Backstage: app-config.yaml and environment overlays (app-config.production.yaml), secrets via environment variables, and the configuration schema",
        "Plan and deploy Backstage to production: PostgreSQL instead of SQLite, the backend container behind an ingress, Helm chart or manifests, and health endpoints",
        "Understand Backstage client-server architecture: the frontend served by the backend or separately, backend plugins as HTTP APIs, authentication providers and the proxy",
      ],
    },
    {
      title: "Backstage Catalog",
      weight: 22,
      gate: "Given an organisation's software, model it as catalog entities, register and ingest them, annotate them for plugins, and fix an entity that will not appear.",
      objectives: [
        "Understand how and why to use the Backstage Catalog: entity kinds (Component, API, Resource, System, Domain, Group, User, Location, Template), ownership and relations",
        "Populate the Backstage Catalog: catalog-info.yaml files, static locations in app-config, and the entity model's apiVersion, kind, metadata and spec",
        "Use annotations on entities to connect plugins: source location, TechDocs, Kubernetes, CI and ownership annotations",
        "Work with manually registered entity locations: the register-component flow, Location entities and refresh",
        "Troubleshoot entity ingestion: processing errors, orphaned entities, schema validation failures and refresh intervals",
        "Configure automated ingestion: entity providers (GitHub discovery, LDAP and other integrations), schedules and processors",
      ],
    },
    {
      title: "Customizing Backstage",
      weight: 32,
      gate: "Given a product request for the portal, decide whether it is a frontend or backend plugin change, implement it with React and Material UI in the app, and wire the plugin into the app and backend.",
      objectives: [
        "Understand frontend versus backend plugins: what runs in the browser, what runs in Node, and how a plugin's frontend talks to its backend",
        "Customize Backstage plugins: installing community plugins, configuring them in app-config, and adding routes and tabs to the entity page",
        "Make changes to React code in the Backstage app: packages/app's App.tsx, Root sidebar, entity page layout and custom components",
        "Use Material UI components and the Backstage theme: creating and applying a custom theme, using Backstage core components, and consistent styling",
        "Create a new plugin with backstage-cli: scaffolding a frontend or backend plugin, its API client and router, and registering it with the app and backend",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Certified Cloud Native Platform Engineering Associate (CNPA)
// Multiple choice, 120 minutes (the one multiple-choice exam with a longer
// sitting, per the LF FAQ), $250, beginner. Platform Engineering Core
// Fundamentals 36%, Platform Observability, Security, and Conformance 20%,
// Continuous Delivery & Platform Engineering 16%, Platform APIs and
// Provisioning Infrastructure 12%, IDPs and Developer Experience 8%,
// Measuring your Platform 8% (CNPA_Curriculum.pdf).
// ---------------------------------------------------------------------------
export const CNPA_TRACK: SeedTrack = {
  code: "CNPA",
  title: "Certified Cloud Native Platform Engineering Associate (CNPA) Coach",
  description:
    "CNPA: what a cloud native platform is and how it is built. Declarative resource management, DevOps and CI/CD foundations, platform architecture and goals, observability, secure service communication and policy, GitOps and delivery, Kubernetes APIs and operators as the platform's interface, developer portals and self-service, and how to measure a platform with DORA and productivity metrics.",
  trackType: "certification",
  subcategorySlug: "cncf-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://training.linuxfoundation.org/certification/certified-cloud-native-platform-engineering-associate-cnpa/",
  sourceVerifiedAt: VERIFIED_AT,
  credential: {
    ...LF_PROVIDER,
    credentialSlug: "cnpa",
    credentialName: "Certified Cloud Native Platform Engineering Associate",
    credentialUrl: "https://training.linuxfoundation.org/certification/certified-cloud-native-platform-engineering-associate-cnpa/",
    basis: "vendor_exam",
    examCode: "CNPA",
    objectivesRevision: "Curriculum, cncf/curriculum 0a8cc08",
    status: "active",
    officialObjectivesUrl: `${CURRICULUM}/CNPA_Curriculum.pdf`,
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience: "No prerequisites. Beginner level: for engineers moving into platform teams and for developers and managers who work with an internal platform.",
    durationMinutes: 120,
    questionFormat: "Online, proctored, multiple-choice exam, 120 minutes (the Linux Foundation multiple-choice FAQ gives CNPA 120 minutes rather than the usual 90).",
    passingScorePolicy: MC_PASS,
  },
  units: [
    {
      title: "Platform Engineering Core Fundamentals",
      weight: 36,
      gate: "Given an organisation's delivery problems, explain what a platform is for, how declarative management, DevOps practice, environments and CI/CD fit together, and sketch the platform's architecture and capabilities.",
      objectives: [
        "Declarative resource management: describing desired state, reconciliation, idempotency, and why platforms are built from declarative APIs",
        "DevOps practices in platform engineering: shared ownership, automation, feedback loops, and how a platform team serves product teams",
        "Application environments and infrastructure concepts: dev, staging and production, ephemeral environments, environment parity and infrastructure as code",
        "Design a platform architecture and its capabilities: compute, networking, storage, identity, delivery, observability and governance as platform capabilities, and the layering from infrastructure to developer interface",
        "Platform engineering goals, objectives and approaches: reducing cognitive load, paved roads, golden paths, platform as a product, and the CNCF Platforms white paper's capabilities",
        "Continuous integration fundamentals: build, test and artifact publication, trunk-based development and pipeline design",
        "Choose continuous delivery and GitOps approaches: deployment pipelines, environments promoted through Git, and the role of reconcilers",
      ],
    },
    {
      title: "Platform Observability, Security, and Conformance",
      weight: 20,
      gate: "Given a platform, design how it observes itself and its tenants, secures service-to-service traffic and the pipeline, and enforces policy as a built-in capability.",
      objectives: [
        "Observability fundamentals for platforms: traces, metrics, logs and events, OpenTelemetry and Prometheus as platform capabilities, and dashboards per tenant",
        "Secure service communication: mTLS, service identity, service meshes and network policy as platform-provided security",
        "Apply policy engines for platform governance: Kyverno, OPA Gatekeeper and ValidatingAdmissionPolicy, policy as code and conformance reporting",
        "Kubernetes security essentials for a platform: RBAC, Pod Security Standards, Secrets management, namespaces as tenancy boundaries",
        "Secure CI/CD pipelines: supply chain controls, signed artifacts, SBOMs, least-privilege pipeline identities and secret handling",
      ],
    },
    {
      title: "Continuous Delivery & Platform Engineering",
      weight: 16,
      gate: "Given a team's pipeline and incidents, explain how CI, CD and GitOps relate, design the GitOps workflow for application environments, and describe the platform's role in incident response.",
      objectives: [
        "Continuous integration pipelines overview: stages, runners, caching, test strategy and artifact promotion",
        "Plan incident response in platform engineering: on-call for the platform, runbooks, blameless reviews and error budgets shared with tenants",
        "CI/CD relationship fundamentals: where integration ends and delivery begins, and how platforms expose both",
        "GitOps basics and workflows: desired state in Git, reconcilers (Argo CD, Flux), pull-based delivery and drift correction",
        "Design GitOps for application environments: repository structure, promotion between environments, and progressive delivery",
      ],
    },
    {
      title: "Platform APIs and Provisioning Infrastructure",
      weight: 12,
      gate: "Given a self-service need, explain the Kubernetes reconciliation model, design the custom API (CRD) a platform would offer, and describe how an operator or Crossplane provisions the infrastructure behind it.",
      objectives: [
        "The Kubernetes reconciliation loop: controllers, desired versus observed state, and why it is the platform's engine",
        "Design APIs for self-service platforms with CustomResourceDefinitions: schema, validation, status, and versioning",
        "Provision infrastructure with Kubernetes: Crossplane compositions, Cluster API and provider operators as declarative infrastructure",
        "Apply the Kubernetes operator pattern for integration: operators that reconcile custom resources into applications, databases and external systems",
      ],
    },
    {
      title: "IDPs and Developer Experience",
      weight: 8,
      gate: "Given developers who struggle to find and use platform capabilities, design the developer-facing layer: simplified access, a service catalog and a portal, and say where AI assistance fits.",
      objectives: [
        "Simplified access to platform capabilities: golden paths, templates, CLIs and abstractions that hide complexity without removing control",
        "Design API-driven service catalogs: cataloguing services, ownership and dependencies, and exposing platform services as catalog entries",
        "Developer portals for platform adoption: Backstage and alternatives, templates (scaffolder), documentation and self-service actions",
        "AI/ML in platform automation: assistants for troubleshooting, generation of configuration, and the guardrails such automation needs",
      ],
    },
    {
      title: "Measuring your Platform",
      weight: 8,
      gate: "Given a platform initiative, choose the metrics that show whether it works -- efficiency, productivity and DORA -- and explain how to collect and present them honestly.",
      objectives: [
        "Platform efficiency and team productivity: adoption, time to first deploy, support load, cost per workload and developer satisfaction surveys",
        "Measure platform initiatives with DORA metrics: deployment frequency, lead time for changes, change failure rate and time to restore, and how a platform moves them",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Certified Cloud Native Platform Engineer (CNPE)
// Performance-based, 2 hours, $445, intermediate; pass mark 64% (LF CNPE
// FAQ). Platform Architecture and Infrastructure 15%, GitOps and Continuous
// Delivery 25%, Platform APIs and Self-Service Capabilities 25%,
// Observability and Operations 20%, Security and Policy Enforcement 15%
// (CNPE_Curriculum.pdf). The curriculum lists example tools: Argo,
// Crossplane, Flagger, Flux, Gatekeeper, Grafana, Istio, Jaeger, Kyverno,
// Linkerd, OPA, OpenCost, OpenTelemetry, Prometheus, Tekton.
// ---------------------------------------------------------------------------
export const CNPE_TRACK: SeedTrack = {
  code: "CNPE",
  title: "Certified Cloud Native Platform Engineer (CNPE) Coach",
  description:
    "CNPE: the hands-on platform engineering exam. Build the platform's foundations and cost controls, implement GitOps and CI/CD with progressive delivery, design CRDs, operators and self-service workflows, run observability and incident diagnosis, and enforce security and policy -- using the CNCF tools the exam names (Argo, Flux, Crossplane, Kyverno, OPA Gatekeeper, Istio, Linkerd, Prometheus, Grafana, OpenTelemetry, Jaeger, Tekton, Flagger, OpenCost) with their documentation open.",
  trackType: "certification",
  subcategorySlug: "cncf-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://training.linuxfoundation.org/certification/certified-cloud-native-platform-engineer-cnpe/",
  sourceVerifiedAt: VERIFIED_AT,
  credential: {
    ...LF_PROVIDER,
    credentialSlug: "cnpe",
    credentialName: "Certified Cloud Native Platform Engineer",
    credentialUrl: "https://training.linuxfoundation.org/certification/certified-cloud-native-platform-engineer-cnpe/",
    basis: "vendor_exam",
    examCode: "CNPE",
    objectivesRevision: "Curriculum, cncf/curriculum 0a8cc08",
    status: "active",
    officialObjectivesUrl: `${CURRICULUM}/CNPE_Curriculum.pdf`,
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience: "No prerequisites, but intermediate level: comfortable operating Kubernetes and completing tasks with unfamiliar CNCF tools from their documentation. The curriculum lists the example tools candidates may meet.",
    durationMinutes: 120,
    questionFormat: "Online, proctored, performance-based: multiple tasks solved in a Linux-based remote desktop using the terminal and web interfaces, with the tools' documentation available; 2 hours.",
    passingScorePolicy: "64% or above to pass (Linux Foundation CNPE FAQ). Certification valid for 2 years; one retake included.",
  },
  units: [
    {
      title: "Platform Architecture and Infrastructure",
      weight: 15,
      gate: "Given a platform's workloads and bills, apply architecture best practices for networking, storage and compute, size and scale with cost data, and tune multi-tenant resource usage.",
      objectives: [
        "Apply platform architecture best practices for networking, storage and compute: node pools, storage classes, ingress and network policy as platform defaults",
        "Use cost management solutions for right-sizing and scaling: OpenCost allocation by namespace and label, requests versus usage, and autoscaling decisions",
        "Optimize multi-tenancy resource usage: namespaces, ResourceQuotas, LimitRanges, priority classes and fair sharing across tenants",
      ],
    },
    {
      title: "GitOps and Continuous Delivery",
      weight: 25,
      gate: "Given application and infrastructure repositories, implement GitOps delivery with Argo CD or Flux, build a CI pipeline integrated with the cluster, and deploy with a progressive strategy that can roll back on metrics.",
      objectives: [
        "Implement GitOps workflows for application and infrastructure deployment: Argo CD Applications or Flux Kustomizations and HelmReleases, sync and health, and drift correction",
        "Build and configure CI/CD pipelines integrated with Kubernetes: Tekton Pipelines and Tasks (or Argo Workflows), image build and push, and updating desired state in Git",
        "Implement progressive delivery strategies for applications, such as blue/green or canary with Argo Rollouts or Flagger, gated by metrics",
      ],
    },
    {
      title: "Platform APIs and Self-Service Capabilities",
      weight: 25,
      gate: "Given a self-service requirement, design and create the CRD, implement the workflow that provisions it through platform APIs, and wire operators or automation frameworks to fulfil it.",
      objectives: [
        "Design and create CustomResourceDefinitions for platform services: OpenAPI schemas, validation rules, defaults, status subresources and versions",
        "Implement workflows for self-service provisioning using platform APIs: composite resources and compositions in Crossplane, or custom resources reconciled by operators",
        "Use Kubernetes operators for platform automation and integration: installing operators, configuring their custom resources and reading their status",
        "Use automation frameworks for self-service provisioning: Crossplane providers and compositions, Argo Workflows or Tekton as provisioning engines, and templates in a developer portal",
      ],
    },
    {
      title: "Observability and Operations",
      weight: 20,
      gate: "Given a platform to run, implement monitoring, alerting, logging and tracing, measure platform efficiency, and diagnose and remediate an incident scenario from the telemetry.",
      objectives: [
        "Implement monitoring, alerting, logging and tracing solutions: Prometheus and Alertmanager rules, Grafana dashboards, log collection, and OpenTelemetry with Jaeger",
        "Measure and improve platform efficiency using deployment metrics and performance indicators: DORA metrics from pipeline and GitOps data, SLOs and cost",
        "Diagnose and remediate platform issues and incident scenarios: from alert to cause across cluster, delivery and tenant layers, and the fix with verification",
      ],
    },
    {
      title: "Security and Policy Enforcement",
      weight: 15,
      gate: "Given security requirements, configure secure service-to-service communication, apply RBAC and controls across platform resources, generate audit evidence, and enforce policy at admission and in pipelines.",
      objectives: [
        "Configure secure service-to-service communication: mesh mTLS (Istio, Linkerd) and NetworkPolicy",
        "Apply RBAC and security controls across platform resources: roles for platform and tenant personas, Pod Security Admission and Secrets handling",
        "Generate audit trails and enforce policy compliance: SBOMs, compliance reports, audit logging and policy reports",
        "Use policy engines and admission controllers for governance: Kyverno and OPA Gatekeeper policies, ValidatingAdmissionPolicy, and exceptions",
        "Integrate security scanning and compliance checks into deployment pipelines: image and manifest scanning, signature verification, and gates in Tekton or Argo",
      ],
    },
  ],
};

export const CNCF_ECOSYSTEM_TRACKS: readonly SeedTrack[] = [PCA_TRACK, OTCA_TRACK, CGOA_TRACK, CAPA_TRACK, CCA_TRACK, ICA_TRACK, KCA_TRACK, CBA_TRACK, CNPA_TRACK, CNPE_TRACK];
