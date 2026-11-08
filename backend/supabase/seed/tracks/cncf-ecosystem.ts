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

export const CNCF_ECOSYSTEM_TRACKS: readonly SeedTrack[] = [PCA_TRACK, OTCA_TRACK];
