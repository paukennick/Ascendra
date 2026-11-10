import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-164: Prometheus Certified Associate (PCA).
//
// Aligned to the five PCA domains (PromQL 28%, Prometheus Fundamentals 20%,
// Observability Concepts 18%, Alerting & Dashboarding 18%, Instrumentation
// and Exporters 16%), read on 2026-11-08 from github.com/cncf/curriculum
// (PCA_Curriculum.pdf) and training.linuxfoundation.org. Density
// (docs/labs.md, hybrid): 3 / 2 / 2 / 2 / 2.
//
// Labs ask for real PromQL, prometheus.yml and alerting rules against
// authored metric listings and query results. Facts are long-stable
// Prometheus semantics (counter resets, rate windows, histogram_quantile,
// relabelling, Alertmanager routing); every lab is needs_expert_review.

export const PCA_LABS: SeedLabSet = {
  trackCode: "PCA",
  sources: [
    source("https://github.com/cncf/curriculum/blob/0a8cc08a502710a894e5724c2bec7b88404e5a6b/PCA_Curriculum.pdf", "exam_outline", "2026-11-08"),
    source("https://training.linuxfoundation.org/certification/prometheus-certified-associate/", "exam_outline", "2026-11-08"),
    source("https://prometheus.io/docs/prometheus/latest/querying/basics/", "reference", "2026-11-08"),
    source("https://prometheus.io/docs/alerting/latest/configuration/", "reference", "2026-11-08"),
  ],
  labs: [
    // ----------------------------------------------------------------- 28%
    {
      slug: "promql-red-queries",
      objective: "Rates and derivatives: rate, irate and increase on counters, deriv and delta on gauges, and why the range window matters relative to the scrape interval",
      kind: "build",
      title: "Write the RED queries for a checkout API",
      brief:
        "The fictional furniture retailer Fenwick & Vale instruments its checkout API with http_requests_total{method, route, status} (a counter), http_request_duration_seconds (a histogram with _bucket, _sum and _count, labelled by route) and in_flight_requests (a gauge), scraped every 15 seconds by Prometheus. Product wants a dashboard showing, per route: requests per second, the error ratio (5xx over all), the 95th-percentile latency, and how fast the in-flight count is changing.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the four PromQL expressions and explain each choice of function and range window.",
          parts: [
            part(
              "Requests per second by route",
              "sum by (route) (rate(http_requests_total[5m])) (or a window of at least 4x the scrape interval); explains rate is per-second, handles counter resets, needs at least two samples in the window, and that sum by collapses method and status.",
              "sum by (route) (rate(http_requests_total[5m]))\nrate() takes the per-second increase of a counter over the range, correcting for counter resets on restart. The window should hold several scrapes -- 5m over a 15s interval gives ~20 samples; a 1m window would hold 4 and turn spiky, and [15s] would often have only one sample and return nothing. sum by (route) adds up all methods and statuses into one series per route."
            ),
            part(
              "Error ratio",
              "sum by (route) (rate(http_requests_total{status=~\"5..\"}[5m])) / sum by (route) (rate(http_requests_total[5m])); explains the two sides must have matching label sets (both reduced to route) for the vector division to match one-to-one, and that a route with no 5xx yields no series on the left (optionally or vector(0) handling).",
              "sum by (route) (rate(http_requests_total{status=~\"5..\"}[5m]))\n  /\nsum by (route) (rate(http_requests_total[5m]))\nBoth sides are aggregated to the same label set {route} so the division matches series one-to-one. status=~\"5..\" is a regex matcher for any 5xx. A route with zero errors has no left-hand series, so it drops out of the result -- fine for a ratio panel; for an alert you might wrap in (... or 0 * sum by (route) (rate(http_requests_total[5m]))) to get an explicit 0."
            ),
            part(
              "95th-percentile latency",
              "histogram_quantile(0.95, sum by (route, le) (rate(http_request_duration_seconds_bucket[5m]))); explains the le label must be kept in the aggregation, that rate must be applied to the buckets first, and that the result is an estimate interpolated within the bucket boundaries.",
              "histogram_quantile(0.95, sum by (route, le) (rate(http_request_duration_seconds_bucket[5m])))\nBuckets are cumulative counters, so rate() them first; then aggregate across instances with sum by (route, le) -- le must survive or the quantile function has nothing to work with. The result is an estimate: Prometheus interpolates linearly inside the bucket where the 95th percentile falls, so precision is bounded by bucket boundaries. Never average percentiles from different instances; aggregate the buckets instead."
            ),
            part(
              "Change in in-flight requests",
              "deriv(in_flight_requests[5m]) (per-second slope of a gauge) or delta(in_flight_requests[5m]) for the absolute change; explains rate/increase are for counters only and would give nonsense on a gauge that goes up and down.",
              "deriv(in_flight_requests[5m]) gives the per-second slope of the gauge via linear regression over the window; delta(in_flight_requests[5m]) gives the absolute change between the window's ends. Neither should be rate(): rate and increase assume a monotonically increasing counter and treat any decrease as a reset, so on a gauge they produce meaningless values."
            ),
          ],
        },
      ],
    },
    {
      slug: "promql-join-labels",
      objective:
        "Binary operators: arithmetic and comparison between vectors, one-to-one and many-to-one matching with on, ignoring and group_left/group_right, and set operators and, or, unless",
      kind: "build",
      title: "Join metrics with different labels to answer a capacity question",
      brief:
        "The fictional video platform Orrin Media exports container_memory_working_set_bytes{namespace, pod, container} from the kubelet, kube_pod_container_resource_limits{namespace, pod, container, resource=\"memory\", unit=\"byte\"} from kube-state-metrics, and kube_pod_labels{namespace, pod, label_team} also from kube-state-metrics. The platform team wants, for every container, memory usage as a percentage of its limit, with the owning team attached, and a list of containers that have no memory limit at all.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the three queries and explain the vector matching in each.",
          parts: [
            part(
              "Usage as a percentage of limit",
              "container_memory_working_set_bytes / on (namespace, pod, container) kube_pod_container_resource_limits{resource=\"memory\"} * 100; explains that on() restricts matching to the shared labels because the right side carries extra labels (resource, unit) that would otherwise prevent a match, and that the division is one-to-one.",
              "100 * container_memory_working_set_bytes\n  / on (namespace, pod, container)\n  kube_pod_container_resource_limits{resource=\"memory\"}\nThe two metrics have different label sets (the limit has resource and unit, the usage may have id/image labels), so a plain division finds no matches. on (namespace, pod, container) tells Prometheus to match only on those labels; ignoring (resource, unit, ...) would be the complementary form. Each left series matches exactly one right series, so this is one-to-one."
            ),
            part(
              "Attach the team label",
              "Multiply by kube_pod_labels (value 1) with group_left(label_team): e.g. (usage query) * on (namespace, pod) group_left(label_team) kube_pod_labels; explains many-to-one matching -- many containers per pod -- requires group_left on the side with more series, and group_left(label_team) copies that label from the one side.",
              "(\n  100 * container_memory_working_set_bytes\n    / on (namespace, pod, container) kube_pod_container_resource_limits{resource=\"memory\"}\n)\n* on (namespace, pod) group_left(label_team) kube_pod_labels\nkube_pod_labels is an info-style metric whose value is always 1, so multiplying leaves the percentage unchanged. Several containers share one pod, so the left side has many series per (namespace, pod) and the right has one: that is many-to-one, which needs group_left. The label name in group_left(label_team) is copied from the right-hand (one) side onto each result."
            ),
            part(
              "Containers without a limit",
              "container_memory_working_set_bytes unless on (namespace, pod, container) kube_pod_container_resource_limits{resource=\"memory\"}; explains unless is a set operator returning left-hand series that have no match on the right, and that on() is again needed because of differing labels.",
              "container_memory_working_set_bytes{container!=\"\"}\n  unless on (namespace, pod, container)\n  kube_pod_container_resource_limits{resource=\"memory\"}\nunless keeps left-hand series for which no right-hand series matches on the given labels -- here, containers with usage but no memory limit. (container!=\"\" drops the pod-level cgroup series the kubelet also exports.) and would give the intersection and or the union with left preference; all three are set operators and never do arithmetic on values."
            ),
            part(
              "A matching mistake to avoid",
              "Explains the error 'many-to-many matching not allowed' arises when neither side is unique on the matching labels (e.g. forgetting container in on() while multiple containers exist), and that group_left/group_right only fix many-to-one, never many-to-many; fix by adding labels to on() or aggregating one side first.",
              "If you wrote ... / on (namespace, pod) kube_pod_container_resource_limits{resource=\"memory\"}, Prometheus returns 'many-to-many matching not allowed: matching labels must be unique on one side', because both sides have several containers per pod. group_left/group_right only allow many-to-ONE. Fix: include container in on(), or aggregate one side (sum by (namespace, pod) (...)) so it is unique."
            ),
          ],
        },
      ],
    },
    {
      slug: "promql-histogram-slo",
      objective: "Histograms: _bucket, _sum and _count series, histogram_quantile over rate of buckets, and what a quantile estimate can and cannot tell you",
      kind: "case",
      title: "Explain a latency SLO result that looks wrong",
      brief:
        "The fictional ticketing API team at Saltire Events has an SLO: 99% of requests complete within 300 ms. Their dashboard panel for p99 latency shows 250 ms, yet a colleague's query says 2.4% of requests are slower than 300 ms, which would be an SLO breach. Both cannot be right -- or can they? The histogram http_request_duration_seconds has buckets le = 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, +Inf.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Dashboard panel query:\n  histogram_quantile(0.99, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))\n  -> 0.25\n\nColleague's query:\n  1 - (\n    sum(rate(http_request_duration_seconds_bucket{le=\"0.5\"}[5m]))\n    /\n    sum(rate(http_request_duration_seconds_count[5m]))\n  )\n  -> 0.024\n\n$ curl -s localhost:9090/api/v1/query --data-urlencode 'query=sum by (le) (rate(http_request_duration_seconds_bucket[5m]))' | jq -r '.data.result[] | \"\\(.metric.le) \\(.value[1])\"' | sort -g\n0.05 310.2\n0.1 402.7\n0.25 418.9\n0.5 419.4\n1 421.0\n2.5 421.3\n5 421.4\n+Inf 421.4",
          ask: "Reconcile the two numbers from the bucket data, then say which one the SLO should actually use and why.",
          parts: [
            part(
              "What the bucket data says",
              "Reads cumulative buckets: 418.9 of 421.4 req/s are under 250 ms (99.4%), 419.4 under 500 ms (99.5%); so the true 99th percentile lies in the 0.1-0.25 bucket and histogram_quantile interpolates to ~0.25 at the top of it, and 1 - 419.4/421.4 = 0.47%, not 2.4% -- so the colleague's number cannot come from this data as shown unless it was computed over a different window or a different metric.",
              "Buckets are cumulative counts per second: 418.9 of 421.4 requests/s fall at or under 0.25 s (99.4%), 419.4 at or under 0.5 s (99.5%). The 99th percentile therefore sits inside the 0.1-0.25 bucket, and histogram_quantile interpolates linearly within it, landing near the top: 0.25 is consistent. From these numbers the share slower than 500 ms is 1 - 419.4/421.4 = 0.47%, so 2.4% does not follow from this data; the colleague's query uses le=\"0.5\", not 0.3, and must have run against another window, instance set or a cached result -- rerun both at the same evaluation time."
            ),
            part(
              "The bucket boundary problem",
              "Points out there is no bucket at 0.3 s, so the SLO threshold 300 ms cannot be measured exactly: le=\"0.25\" undercounts good requests and le=\"0.5\" overcounts them; histogram_quantile's 250 ms is also an interpolation whose precision is the bucket width; recommends adding a 0.3 bucket (or using native histograms) so the SLO is measurable.",
              "The SLO says 300 ms and the histogram has buckets at 0.25 and 0.5. Neither query can measure 300 ms: le=\"0.25\" treats 260-300 ms requests as bad, le=\"0.5\" treats 300-500 ms as good. histogram_quantile's answer is bounded by the same boundaries -- any p99 between 0.1 and 0.25 is reported with interpolation inside that bucket. Fix at the source: add a bucket boundary at the SLO threshold (0.3) so 'good requests' is an exact bucket count, or adopt native histograms with their finer, exponential buckets."
            ),
            part(
              "Which form the SLO should use",
              "The SLO should be expressed as a ratio of good events (bucket count at the threshold over total count) rather than a quantile, because the ratio is exact at a bucket boundary, aggregates correctly across instances and time, and directly yields an error budget; quantiles are for dashboards, not for SLO arithmetic.",
              "Use the ratio: sum(rate(http_request_duration_seconds_bucket{le=\"0.3\"}[5m])) / sum(rate(http_request_duration_seconds_count[5m])) >= 0.99, once the 0.3 bucket exists. A good/total ratio is exact at the boundary, can be summed over instances and over long windows (30-day error budget), and feeds burn-rate alerts. A quantile is an estimate that cannot be averaged or summed across series or time; keep it for the dashboard's 'how slow is slow' panel."
            ),
          ],
        },
        {
          text: "The team adds a 0.3 bucket. A week later the on-call sees the p99 panel jump between 0.25 and 0.3 every few minutes with no change in traffic, and asks whether the service is flapping.",
          ask: "Explain the jumping panel and what you would change so the panel and the SLO are stable.",
          parts: [
            part(
              "Why it jumps",
              "Explains that histogram_quantile snaps to bucket boundaries when the quantile's rank sits near a boundary and few samples separate adjacent buckets: with a new boundary at 0.3 close to 0.25, small fluctuations move the interpolated value between the two; it is estimation noise, not the service flapping.",
              "With buckets at 0.25 and 0.3, the 99th percentile's rank falls near those boundaries; a handful of requests moving between the two buckets shifts the interpolated estimate from one boundary to the other. That is quantile-estimation noise from the bucket layout and a 5-minute window, not a real latency oscillation -- the ratio query will show the good-request share barely changing."
            ),
            part(
              "Stabilising",
              "Lengthen the rate window for the panel (e.g. [15m] or [30m]) to smooth, show the SLO ratio and error budget as the primary panel, label the quantile panel as an estimate, and consider native histograms for finer resolution; alert on the ratio/burn rate, never on a quantile crossing a threshold.",
              "Make the SLO ratio the headline panel (good/total at le=\"0.3\" plus remaining error budget over 30 days) and demote p99 to an 'estimate' panel with a longer window ([30m]) so bucket noise averages out. Alerts must come from the ratio's burn rate, not from p99 crossing 0.3, which would page on this noise. Native histograms would give finer, data-driven buckets and far less boundary snapping."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 20%
    {
      slug: "scrape-config-relabel",
      objective: "Configuration and scraping: prometheus.yml global settings, scrape_configs, scrape_interval and timeout, relabel_configs and metric_relabel_configs, and target health",
      kind: "build",
      title: "Write a scrape configuration with relabelling for a Kubernetes cluster",
      brief:
        "The fictional logistics company Brae Freight runs Prometheus inside a Kubernetes cluster. Requirements: scrape every Pod that carries the annotation prometheus.io/scrape=\"true\", on the port given in prometheus.io/port and the path in prometheus.io/path (default /metrics); keep the namespace and pod name as labels; drop any Pod in namespace kube-system; and drop the metric go_gc_duration_seconds, which nobody uses, before it is stored. Scrapes should happen every 30 seconds with a 10-second timeout.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the scrape_config and explain each relabelling step and how you would verify targets are healthy.",
          parts: [
            part(
              "Global and job settings",
              "global: scrape_interval 30s (and scrape_timeout 10s either globally or on the job), a job_name, and kubernetes_sd_configs with role: pod; explains the timeout may not exceed the interval.",
              "global:\n  scrape_interval: 30s\n  scrape_timeout: 10s\nscrape_configs:\n- job_name: kubernetes-pods\n  kubernetes_sd_configs:\n  - role: pod\nThe pod role discovers one target per Pod port (or per Pod when no ports are declared) with __meta_kubernetes_* labels describing namespace, annotations, labels and the Pod's IP. scrape_timeout may not be greater than scrape_interval (equal is allowed) or the configuration is rejected; 10s leaves headroom."
            ),
            part(
              "Keep only annotated Pods, drop kube-system",
              "relabel_configs with action keep on __meta_kubernetes_pod_annotation_prometheus_io_scrape regex true, and action drop on __meta_kubernetes_namespace regex kube-system; explains keep/drop decide whether the target is scraped at all and are evaluated in order.",
              "  relabel_configs:\n  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]\n    action: keep\n    regex: \"true\"\n  - source_labels: [__meta_kubernetes_namespace]\n    action: drop\n    regex: kube-system\nAnnotation keys are sanitised into label names (dots and slashes become underscores). keep discards targets that do not match; drop discards those that do. Rules run top to bottom on every discovered target."
            ),
            part(
              "Path and port from annotations",
              "Set __metrics_path__ from the path annotation when present (replace with regex (.+)), and build __address__ from the Pod IP plus the port annotation using a two-source regex such as ([^:]+)(?::\\d+)?;(\\d+) with replacement $1:$2; explains __address__ and __metrics_path__ are the special labels the scraper uses.",
              "  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]\n    action: replace\n    regex: (.+)\n    target_label: __metrics_path__\n  - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]\n    action: replace\n    regex: ([^:]+)(?::\\d+)?;(\\d+)\n    replacement: $1:$2\n    target_label: __address__\nThe scraper reads __address__ (host:port) and __metrics_path__ (default /metrics) after relabelling. The path rule only fires when the annotation is non-empty, leaving the default otherwise. The address rule joins the two source labels with ; (the default separator), captures the IP and the annotated port, and rewrites the target address."
            ),
            part(
              "Namespace and pod labels, metric drop",
              "labelmap or explicit replace rules copying __meta_kubernetes_namespace to namespace and __meta_kubernetes_pod_name to pod; and metric_relabel_configs with action drop on __name__ regex go_gc_duration_seconds; explains metric_relabel_configs run after the scrape on each sample and are the place to drop series before storage.",
              "  - source_labels: [__meta_kubernetes_namespace]\n    target_label: namespace\n  - source_labels: [__meta_kubernetes_pod_name]\n    target_label: pod\n  metric_relabel_configs:\n  - source_labels: [__name__]\n    action: drop\n    regex: go_gc_duration_seconds.*\n__meta_* labels are discarded after relabelling, so anything you want to keep must be copied to a real label. relabel_configs act on targets before scraping; metric_relabel_configs act on every scraped sample before it is written, so dropping here saves storage and cardinality (the regex includes the _sum/_count companions)."
            ),
            part(
              "Verifying",
              "Check promtool check config prometheus.yml, then the Targets page or /api/v1/targets for health UP and last error, the up metric (up == 0 for failing targets) and scrape_duration_seconds against the timeout; service discovery page shows discovered vs dropped targets with their labels before and after relabelling.",
              "promtool check config prometheus.yml before reloading (kill -HUP or POST /-/reload). Then: the Status -> Targets page (or curl /api/v1/targets) shows each target's health, last scrape and error text; up{job=\"kubernetes-pods\"} == 0 lists failing targets; scrape_duration_seconds near 10 s warns of timeouts. Status -> Service Discovery shows every discovered target with its __meta_ labels and whether it was dropped -- the fastest way to debug a relabel rule that keeps too little or too much."
            ),
          ],
        },
      ],
    },
    {
      slug: "prometheus-limits-design",
      objective:
        "Understanding Prometheus limitations: single-node storage, no long-term durability by default, cardinality, no cross-server queries without federation or remote write, and what remote write and Thanos/Cortex-style systems add",
      kind: "case",
      title: "Diagnose a Prometheus that is slow, full and losing data",
      brief:
        "The fictional online bank Haldane Direct runs one Prometheus server for 40 clusters' worth of metrics. It has started to crash, queries time out, and compliance has asked for 13 months of retention. You are asked to explain what is happening and propose a design.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ curl -s localhost:9090/api/v1/status/tsdb | jq '.data.headStats, (.data.seriesCountByMetricName[:3])'\n{\n  \"numSeries\": 14820311,\n  \"numLabelPairs\": 2210404,\n  \"chunkCount\": 29640622,\n  \"minTime\": 1762560000000,\n  \"maxTime\": 1762567215000\n}\n[\n  {\"name\": \"http_request_duration_seconds_bucket\", \"value\": 6120482},\n  {\"name\": \"session_events_total\", \"value\": 3904118},\n  {\"name\": \"container_memory_working_set_bytes\", \"value\": 611203}\n]\n\n$ curl -s localhost:9090/api/v1/query --data-urlencode 'query=topk(3, count by (__name__, label) (label_replace(session_events_total, \"label\", \"user_id\", \"user_id\", \"(.*)\")))' | jq -c '.data.result[0].metric'\n{\"__name__\":\"session_events_total\",\"label\":\"user_id\"}\n\n$ grep -E 'retention|storage' /etc/prometheus/prometheus.service\nExecStart=/usr/local/bin/prometheus --storage.tsdb.retention.time=400d --storage.tsdb.path=/data\n\n$ journalctl -u prometheus | tail -1\nprometheus[2210]: fatal error: runtime: out of memory",
          ask: "Explain what the numbers show and why the server crashes, and name the limitation of Prometheus behind each symptom.",
          parts: [
            part(
              "Cardinality",
              "Reads 14.8 million active series and sees that session_events_total carries a user_id label, so one metric alone produces millions of series; explains each series costs memory in the head block regardless of sample rate, which is why the server runs out of memory -- Prometheus's practical ceiling is active series, and unbounded labels break it.",
              "14.8 million active series in the head block is far beyond what a single server comfortably holds; memory scales with series, not with samples. session_events_total has a user_id label (3.9 million series) -- a classic cardinality explosion where a label takes a value per user. The histogram with 6.1 million bucket series across 40 clusters is the second offender. Prometheus's core limit is the number of active time series; labels with unbounded values are the usual cause, and the fix is at the instrumentation or metric_relabel level, not more RAM."
            ),
            part(
              "Retention and durability",
              "400 days of retention on local disk means one node holds everything, with no replication and a single disk; explains Prometheus's local TSDB is not meant as long-term durable storage, that retention this long multiplies block storage and compaction work, and that the 13-month requirement needs remote write to an object-storage-backed system.",
              "--storage.tsdb.retention.time=400d keeps over a year on a single node's local disk: no replication, one failure domain, large blocks to compact and index, and slow queries over long ranges. Prometheus's own storage is designed for recent data on one node; durability and long retention are explicitly out of scope. The compliance requirement should be met by remote_write into Thanos, Cortex/Mimir or a managed equivalent that stores blocks in object storage with replication."
            ),
            part(
              "Single node, no cross-server queries",
              "Explains that 40 clusters feeding one server concentrates all series and all query load in one process, and that Prometheus has no clustering: scaling means sharding by cluster/team with one Prometheus each, then federation (limited) or a global query layer (Thanos Query, Cortex/Mimir) to query across them.",
              "One Prometheus for 40 clusters is a single point of scale and failure. Prometheus does not cluster or shard itself, and a server cannot query another's data. The scalable shape is one Prometheus per cluster (or per team) scraping locally -- short retention, fewer series each -- with a global view provided by Thanos Query over sidecars/store gateways or by remote write into Cortex/Mimir. Federation can pull a few aggregated series between servers but is not a way to centralise raw metrics."
            ),
          ],
        },
        {
          text: "The platform director accepts that the single server must go and asks for a target design: per-cluster scraping, 13 months of retention, one place to query and alert, and an immediate stop to the memory crashes while the rebuild happens.",
          ask: "Give the immediate mitigations and the target architecture, naming what each component adds.",
          parts: [
            part(
              "Immediate mitigations",
              "metric_relabel_configs dropping the user_id label (or the whole metric) and reducing histogram bucket counts, --storage.tsdb.retention.time cut to days or weeks, a sample_limit/label_limits per scrape job to catch the next explosion, and fixing the instrumentation that emits user_id; explains these restore stability within one restart.",
              "Now: add metric_relabel_configs on the offending jobs -- action: labeldrop regex user_id (or drop session_events_total entirely until it is fixed) -- and reduce retention to 15d so the head and blocks shrink; set sample_limit and label_value_length_limit / label_limit per scrape_config so a new high-cardinality metric fails the scrape instead of the server. Then fix the exporter: a user id belongs in logs or traces, never as a metric label. Expect memory to drop sharply within the next head compaction (2 hours)."
            ),
            part(
              "Target architecture",
              "One Prometheus per cluster (short local retention, scraping and rule evaluation local, Alertmanager HA pair cluster-wide or central), remote_write from each to Thanos Receive or Cortex/Mimir backed by object storage for 13-month retention and global queries, or Thanos Sidecar + Store Gateway + Query if preferring upload-based; Grafana and alerting against the global query layer; explains what each adds.",
              "Per cluster: a Prometheus (ideally an HA pair) scraping only its own cluster with ~15d retention and local recording/alerting rules -- scrape locality and failure isolation. Long-term and global: remote_write from every Prometheus into Mimir/Cortex (or Thanos Receive) which writes compacted blocks to object storage with replication, deduplicates HA pairs and serves one PromQL endpoint across all clusters and 13 months -- durability, retention and cross-cluster queries, none of which a single Prometheus provides. Alternatively Thanos Sidecars upload each Prometheus's blocks and Thanos Query fans out. Alertmanager runs as a clustered pair receiving alerts from every Prometheus. Grafana points at the global query layer."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 18%
    {
      slug: "define-sli-slo",
      objective: "Basics of SLIs, SLOs and SLAs: choosing indicators, setting objectives, error budgets and burn rate",
      kind: "build",
      title: "Define SLIs, SLOs and an error budget for a payments API",
      brief:
        "The fictional payment processor Caldwell Pay promises its merchants in a contract that the authorisation API will be 'available 99.9% of the time, measured monthly, with credits if not'. Internally there is no definition of 'available'. The API exposes http_requests_total{code} and a latency histogram http_request_duration_seconds; the team wants to know how to turn the contract into measurable indicators, an internal objective, and an error budget they can spend on releases.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Define the SLIs with their PromQL, propose SLOs and explain how they relate to the SLA, compute the monthly error budget, and show the burn-rate idea.",
          parts: [
            part(
              "SLIs",
              "Availability SLI = successful requests / total requests, with success defined (e.g. not 5xx), as sum(rate(http_requests_total{code!~\"5..\"}[window])) / sum(rate(http_requests_total[window])); latency SLI = requests under a threshold / total using a histogram bucket; explains an SLI is a ratio of good events to valid events measured where users experience the service.",
              "Availability SLI: sum(rate(http_requests_total{code!~\"5..\"}[5m])) / sum(rate(http_requests_total[5m])) -- the share of requests that did not fail server-side. Latency SLI: sum(rate(http_request_duration_seconds_bucket{le=\"1\"}[5m])) / sum(rate(http_request_duration_seconds_count[5m])) -- the share answered within 1 s. An SLI is always good events over valid events, measured as close to the merchant as possible (the edge or load balancer is better than the Pod if available), and 'good' must be written down: 5xx is bad, 4xx is the client's problem."
            ),
            part(
              "SLOs versus the SLA",
              "Sets internal SLOs stricter than the contract (e.g. 99.95% availability and 99% under 1 s over 30 days) so the SLA is not breached when the SLO is; explains SLA = external promise with consequences, SLO = internal target that drives engineering, SLI = the measurement.",
              "SLA (contract): 99.9% monthly availability, with credits. SLOs (internal): 99.95% availability and 99% of requests under 1 s, both over a rolling 30 days. The SLO sits inside the SLA so an SLO miss is a warning long before a contractual breach. SLI is the measurement, SLO the target on it, SLA the promise with penalties -- never set the SLO equal to the SLA or the first breach is also a legal one."
            ),
            part(
              "Error budget",
              "Computes the budget: 1 - 0.9995 = 0.05% of requests may fail in 30 days; at e.g. 20 million requests a month that is 10,000 failed requests, or about 21.6 minutes of total outage if all traffic fails; explains the budget is what releases and experiments may consume, and that exhausting it freezes risky changes.",
              "Error budget = 1 - SLO = 0.05% of requests over 30 days. With 20 million monthly requests that is 10,000 failures to 'spend'. Expressed in time at full failure: 0.0005 x 30 x 24 x 60 = 21.6 minutes of complete outage per month. The budget is the team's permission to take risk -- deploys, migrations, chaos tests. When it is spent, the policy says: no risky changes until it recovers."
            ),
            part(
              "Burn rate",
              "Burn rate = observed error ratio / allowed error ratio; a rate of 1 spends the budget exactly in 30 days, 14.4 spends it in about 2 days; shows a multi-window alert: page when the 1h and 5m error ratios both exceed 14.4 x (1 - SLO), ticket at a slow burn (e.g. 6h/30m at 6x); explains why this beats a fixed threshold.",
              "Burn rate = current error ratio / (1 - SLO). At 1x the 30-day budget lasts exactly 30 days; at 14.4x it is gone in 2 days. Page: (error_ratio_1h > 14.4 * 0.0005) and (error_ratio_5m > 14.4 * 0.0005) -- the short window confirms it is still happening. Ticket: 6x over 6h and 30m. Burn-rate alerts scale with the SLO, fire only when users are being hurt at a rate that matters, and stay quiet for brief blips that the budget can absorb -- unlike 'error rate > 1%' which is either too noisy or too late."
            ),
          ],
        },
      ],
    },
    {
      slug: "pushgateway-misuse",
      objective: "Push versus pull: why Prometheus pulls, when the Pushgateway is appropriate (batch jobs) and when it is misused",
      kind: "case",
      title: "Untangle a Pushgateway that became a metrics proxy",
      brief:
        "At the fictional analytics firm Wexcombe Data, a team could not get Prometheus to scrape their containers through a firewall, so they pointed every service at a Pushgateway. Months later the on-call notices that metrics for a decommissioned service are still present and that the 'up' panel is green for services that are down.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ curl -s pushgateway:9091/api/v1/metrics | jq -r '.data[] | \"\\(.labels.job) \\(.labels.instance) last_push=\\(.push_time_seconds.metrics[0].value|tonumber|todate)\"' | sort | head -5\nfeature-store fs-01 last_push=2026-11-07T23:58:11Z\ningest-api api-03 last_push=2026-09-14T02:10:44Z\ningest-api api-04 last_push=2026-11-07T23:58:09Z\nreport-builder rb-02 last_push=2026-08-02T17:31:02Z\nsession-svc sess-01 last_push=2026-11-07T23:58:12Z\n\n$ curl -s 'localhost:9090/api/v1/query' --data-urlencode 'query=up{job=\"pushgateway\"}' | jq -r '.data.result[0].value[1]'\n1\n\nprometheus.yml excerpt:\n- job_name: pushgateway\n  honor_labels: true\n  static_configs:\n  - targets: ['pushgateway:9091']",
          ask: "Explain why stale metrics persist and why 'up' lies, and say what the Pushgateway is actually for.",
          parts: [
            part(
              "Why stale series persist",
              "The Pushgateway stores the last pushed value for each job/instance group forever until it is explicitly deleted; report-builder's rb-02 last pushed in August and ingest-api api-03 in September, yet Prometheus keeps scraping those values as if current -- the gateway is not a cache that expires, it is a metrics store.",
              "The Pushgateway keeps every pushed group (keyed by job and the grouping labels such as instance) until something deletes it -- there is no TTL. rb-02 stopped pushing on 2 August and api-03 on 14 September, but their last values are still served and Prometheus scrapes them every interval with a fresh timestamp. They look alive and current because the gateway never forgets."
            ),
            part(
              "Why up is green",
              "up reflects whether Prometheus could scrape the target -- the Pushgateway itself -- not whether the services pushing to it are alive; with pull-based scraping each service would be its own target and up would drop to 0 when it died; here every service hides behind one always-up target.",
              "up is set per scrape target: 1 if Prometheus reached pushgateway:9091 and parsed the response. It says nothing about session-svc or ingest-api, which are not targets at all. Pulling directly from each service turns liveness into a free signal (a dead instance's up goes to 0 within one interval); routing everything through a gateway throws that signal away. push_time_seconds is the only hint, and nobody was alerting on it."
            ),
            part(
              "What the Pushgateway is for",
              "Short-lived batch jobs that exist for less time than a scrape interval and have no endpoint to scrape, which push their final result (e.g. last run time, rows processed) once; explains the metrics should be job-level, not per-instance, and that the service-level pull model is the design assumption of Prometheus.",
              "The Pushgateway exists for service-level batch jobs -- a nightly export, a cron -- that finish before Prometheus could ever scrape them. Such a job pushes its summary (my_job_last_success_timestamp_seconds, my_job_rows_processed) once at the end, grouped by job only, and the gateway keeps that until the next run replaces it. Long-running services should be scraped: the pull model gives per-instance health, centralised control over scrape intervals and no single aggregation point. The firewall problem has pull-friendly answers (a Prometheus inside the segment with remote_write out, or an agent)."
            ),
          ],
        },
        {
          text: "The team agrees to move back to pull. Two constraints: the services run in a network segment that cannot accept inbound connections from the central Prometheus, and one genuine nightly batch job (report-builder) must still be monitored, including an alert if it has not succeeded in 26 hours.",
          ask: "Design the fix for both constraints and the alert for the batch job.",
          parts: [
            part(
              "Services behind the firewall",
              "Run a Prometheus (or Prometheus in agent mode) inside the segment that scrapes the services directly and remote_writes to the central system, so connections are outbound only; the services expose /metrics; the Pushgateway is removed from the service path and stale groups are deleted.",
              "Deploy a small Prometheus in the restricted segment -- agent mode (--agent) is ideal: it scrapes local targets and forwards samples with remote_write over a single outbound HTTPS connection to the central Prometheus/Mimir. Each service exposes /metrics as before; up now exists per instance again. Then delete the stale groups from the Pushgateway (curl -X DELETE pushgateway:9091/metrics/job/ingest-api/instance/api-03, etc.) and keep the gateway only for batch jobs."
            ),
            part(
              "The batch job and its alert",
              "report-builder pushes report_builder_last_success_timestamp_seconds (set to time() at a successful finish) grouped by job only; alert: time() - report_builder_last_success_timestamp_seconds > 26*3600, plus an absent() alert in case the metric vanishes; explains why a timestamp metric beats a counter for 'did it run'.",
              "At the end of a successful run: push report_builder_last_success_timestamp_seconds with the current Unix time to /metrics/job/report-builder (no instance label, so the group is the job). Alert:\n- alert: ReportBuilderStale\n  expr: time() - report_builder_last_success_timestamp_seconds > 26 * 3600\n  for: 10m\n- alert: ReportBuilderMetricMissing\n  expr: absent(report_builder_last_success_timestamp_seconds)\nA timestamp metric answers 'when did it last succeed' directly and keeps working across Prometheus restarts; a counter of runs would need rate windows and cannot tell a stale success from a recent one."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 18%
    {
      slug: "alerting-rules-and-routing",
      objective: "Configure Alertmanager: routing trees, matchers, grouping, inhibition, silences, receivers and repeat intervals",
      kind: "build",
      title: "Route alerts so the right team is paged once",
      brief:
        "The fictional airline Skerry Air runs one Alertmanager for three teams. Alerts carry labels team (payments, booking, platform) and severity (page, ticket). Requirements: severity=page goes to the owning team's on-call via PagerDuty, severity=ticket goes to that team's Slack channel; alerts for the same team and alertname are grouped into one notification, sent quickly the first time and then at most every 4 hours; when the platform team's NodeDown alert fires for a node, the per-service alerts from that node should be suppressed; and payments is doing a planned database migration on Saturday 02:00-04:00 UTC during which their database alerts must not page.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the alertmanager.yml route tree, inhibition rule and the silence, and explain the timing fields.",
          parts: [
            part(
              "Route tree",
              "A root route with group_by [team, alertname], group_wait ~30s, group_interval ~5m, repeat_interval 4h and a fallback receiver, with child routes matching severity and team to the right receivers (matchers: severity=\"page\" / team=\"payments\" -> payments-pagerduty, etc.), using nested routes or matchers on both labels; explains routing is depth-first and the first matching leaf wins unless continue: true.",
              "route:\n  receiver: platform-slack\n  group_by: [team, alertname]\n  group_wait: 30s\n  group_interval: 5m\n  repeat_interval: 4h\n  routes:\n  - matchers: [team=\"payments\"]\n    routes:\n    - matchers: [severity=\"page\"]\n      receiver: payments-pagerduty\n    - matchers: [severity=\"ticket\"]\n      receiver: payments-slack\n  - matchers: [team=\"booking\"]\n    routes:\n    - matchers: [severity=\"page\"]\n      receiver: booking-pagerduty\n    - matchers: [severity=\"ticket\"]\n      receiver: booking-slack\n  - matchers: [team=\"platform\"]\n    routes:\n    - matchers: [severity=\"page\"]\n      receiver: platform-pagerduty\n    - matchers: [severity=\"ticket\"]\n      receiver: platform-slack\nAn alert walks the tree depth-first and stops at the first matching route without continue: true; anything unmatched falls back to the root receiver. Child routes inherit group_by and timings unless they override them."
            ),
            part(
              "Timing fields",
              "Explains group_wait (how long to wait for more alerts of the same group before the first notification), group_interval (how long to wait before sending a notification about new alerts added to an existing group) and repeat_interval (how often to re-send an unchanged firing group); maps them to 'quick first notification, grouped, at most every 4h'.",
              "group_wait: 30s -- when the first alert of a new group arrives, wait 30 s to collect siblings (ten Pods failing at once become one page). group_interval: 5m -- once a group has been notified, a newly added alert in that group waits up to 5 m before an updated notification. repeat_interval: 4h -- an unchanged group that keeps firing is re-sent every 4 h, not every evaluation. Together: fast first page, batched updates, no spam."
            ),
            part(
              "Inhibition",
              "An inhibit_rules entry with source_matchers [alertname=\"NodeDown\"], target_matchers [severity=~\"page|ticket\"] (excluding NodeDown itself) and equal: [node] (or instance), so service alerts carrying the same node label are muted while NodeDown fires; explains inhibition needs a shared label and does not resolve the targets, only hides them.",
              "inhibit_rules:\n- source_matchers: [alertname=\"NodeDown\"]\n  target_matchers: [alertname!=\"NodeDown\"]\n  equal: [node]\nWhile a NodeDown alert with node=worker-7 is firing, every other alert that also carries node=worker-7 is inhibited -- not resolved, just not notified -- so the on-call gets one page about the node, not twenty about the services on it. The per-service alerts must therefore carry the node label (via the alerting rule's labels or relabelling), or equal: cannot match."
            ),
            part(
              "The planned silence",
              "A silence created ahead of time (amtool silence add or the UI) with matchers team=payments and alertname=~\"Database.*\" (or a database component label), startsAt Saturday 02:00 UTC, endsAt 04:00 UTC, a comment and author; explains silences match labels, have start/end times, and are preferable to editing routes for a one-off window.",
              "amtool silence add --alertmanager.url=http://alertmanager:9093 \\\n  --start=\"2026-11-14T02:00:00Z\" --end=\"2026-11-14T04:00:00Z\" \\\n  --author=\"payments-oncall\" --comment=\"CHG-4412 planned DB migration\" \\\n  team=payments alertname=~\"Database.*\"\nA silence suppresses notifications for alerts matching its matchers between its start and end; alerts still fire and show as silenced in the UI, and the silence expires on its own. Scoping it to team and alertname keeps payments' other pages live and never touches booking or platform. Editing the route tree for a two-hour window would be the wrong tool."
            ),
          ],
        },
      ],
    },
    {
      slug: "alerting-rule-review",
      objective: "Configuring alerting rules: alert, expr, for, labels and annotations with templating, rule groups and evaluation interval",
      kind: "case",
      title: "Fix an alerting rule that pages at 3 a.m. for nothing",
      brief:
        "The on-call at the fictional publishing house Glenmore Press was paged four times last night by HighCPU, each resolving within a minute, while a real outage -- the search service returning errors for 25 minutes -- produced no alert at all. You are asked to review the rules file.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "groups:\n- name: glenmore\n  interval: 1m\n  rules:\n  - alert: HighCPU\n    expr: rate(process_cpu_seconds_total[1m]) > 0.8\n    labels:\n      severity: page\n    annotations:\n      summary: \"CPU high\"\n\n  - alert: SearchErrors\n    expr: rate(http_requests_total{job=\"search\", code=~\"5..\"}[5m]) > 0.05\n    for: 30m\n    labels:\n      severity: page\n    annotations:\n      summary: \"search errors\"\n\n$ curl -s localhost:9090/api/v1/query --data-urlencode 'query=sum(rate(http_requests_total{job=\"search\"}[5m]))' | jq -r '.data.result[0].value[1]'\n0.42",
          ask: "Explain why HighCPU paged for nothing and why SearchErrors never fired during a 25-minute outage, then rewrite both rules.",
          parts: [
            part(
              "HighCPU",
              "A cause-based alert on a 1-minute rate with no for clause: any brief burst above 80% CPU pages instantly; CPU usage is not user impact; rewrite to a symptom (latency/error SLO) or, if kept, make it a ticket with for: 15m over a longer window; also the expression lacks aggregation so every process pages separately.",
              "HighCPU fires the moment a single 1-minute sample exceeds 0.8 cores, with no for: duration, so a 40-second burst pages the on-call and resolves before they open the laptop. It alerts on a cause (CPU) rather than an impact (slow or failing requests) and has no label to say whose process it is. Rewrite:\n- alert: HighCPUSustained\n  expr: avg by (job, instance) (rate(process_cpu_seconds_total[5m])) > 0.9\n  for: 15m\n  labels: {severity: ticket}\n  annotations:\n    summary: \"{{ $labels.job }} on {{ $labels.instance }} above 90% CPU for 15m\"\nAs a ticket, not a page: nobody should be woken by CPU alone."
            ),
            part(
              "SearchErrors",
              "Two faults: the expression compares an absolute error rate (errors per second) to 0.05, which is meaningless when total traffic is 0.42 req/s overnight -- 25 minutes of 100% errors is 0.42 err/s, above 0.05, so the threshold would be crossed... but for: 30m requires the condition to hold for 30 minutes and the outage lasted 25, so it never fired; rewrite as a ratio with a shorter for.",
              "The expr measures errors per second, not a ratio: at 0.42 req/s overnight, a total failure is only 0.42 err/s -- above 0.05 here, but at quieter hours a complete outage could sit under 0.05 and never alert, while daytime could exceed 0.05 at a harmless 0.5% error rate. And for: 30m means a 25-minute outage ends before the alert is ever sent. Rewrite as a ratio with a realistic hold time:\n- alert: SearchErrorRatioHigh\n  expr: |\n    sum(rate(http_requests_total{job=\"search\", code=~\"5..\"}[5m]))\n      / sum(rate(http_requests_total{job=\"search\"}[5m])) > 0.05\n  for: 5m\n  labels: {severity: page}\n  annotations:\n    summary: \"Search error ratio {{ $value | humanizePercentage }} for 5m\"\n    runbook_url: https://runbooks.glenmore.example/search-errors\nA ratio is traffic-independent; 5 minutes filters blips without missing a real outage."
            ),
            part(
              "Rule group hygiene",
              "Explains the group's interval (1m) is the evaluation cadence and that for: is measured in evaluations; annotations should use templating ($labels, $value with humanize functions) and link a runbook; recording rules should precompute the ratio if dashboards use it too; and promtool check rules / promtool test rules validate before reload.",
              "The group evaluates every minute (interval: 1m); for: 5m means five consecutive true evaluations. Put reusable expressions in recording rules (job:http_requests:error_ratio5m) so the alert and the dashboard agree. Annotations are templates: {{ $labels.instance }}, {{ $value | humanizePercentage }}, and a runbook_url so the page tells the on-call what to do. Validate with promtool check rules rules.yml and write promtool test rules unit tests that feed synthetic series and assert the alert fires (and does not fire) when expected."
            ),
          ],
        },
        {
          text: "The rewritten SearchErrorRatioHigh works. A week later it fires at 04:10 on a Sunday and the on-call finds the search service healthy; the error ratio shows 100% for three minutes, then returns to 0. Total traffic in that window was 2 requests, both from a synthetic checker that was misconfigured.",
          ask: "Explain the low-traffic problem and adjust the rule so it does not page on two requests.",
          parts: [
            part(
              "The low-traffic problem",
              "At 2 requests in 5 minutes, one failing request is a 50% error ratio, so a ratio alert becomes noise when the denominator is tiny; explains that ratios need a minimum traffic guard or a longer window at night.",
              "A ratio has no idea how many requests it is built from: 1 error out of 2 is 50%, identical to 5,000 out of 10,000. Overnight the search service sees almost no traffic, so a single misconfigured check produced a 100% ratio and a page. The alert is statistically meaningless below some request volume."
            ),
            part(
              "Guarding the rule",
              "Adds a traffic condition with and: the ratio alert fires only when sum(rate(http_requests_total{job=\"search\"}[5m])) exceeds a minimum (e.g. > 1 req/s), or uses a longer window such as [30m] so the sample is larger, or a multi-window burn-rate form; and excludes the synthetic checker by label if it is not real traffic.",
              "- alert: SearchErrorRatioHigh\n  expr: |\n    (\n      sum(rate(http_requests_total{job=\"search\", code=~\"5..\"}[5m]))\n        / sum(rate(http_requests_total{job=\"search\"}[5m])) > 0.05\n    )\n    and sum(rate(http_requests_total{job=\"search\"}[5m])) > 1\n  for: 5m\nThe and keeps the alert only when traffic exceeds 1 req/s (300 requests in the window), so a handful of requests cannot page. Alternatives: a [30m] window for a bigger sample, or a multi-window burn-rate alert tied to the SLO. If the synthetic checker is not real traffic, exclude it (client!=\"synthetic\") or give it its own alert."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 16%
    {
      slug: "instrument-worker-service",
      objective: "Instrumentation: what to measure (RED and USE methods), choosing counters and histograms, label choices and bucket boundaries",
      kind: "build",
      title: "Instrument a queue worker from scratch",
      brief:
        "The fictional insurer Pendle Mutual has a Python worker that pulls claims from a queue, calls a fraud-scoring API, and writes results to a database. It currently exposes no metrics. The team wants to know how long jobs take, how many fail and why, how deep the queue is, and how the fraud API behaves -- and they want queries later to be able to break results down by claim type (motor, home, travel) but not by customer.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the metrics (names, types, labels, buckets) with client-library code sketches, and explain the choices against the RED and USE methods.",
          parts: [
            part(
              "Throughput and errors: counters",
              "claims_processed_total{claim_type, result} as a Counter incremented once per job with result=success|failure (and optionally a separate claims_failures_total{claim_type, reason} with a bounded reason set); explains counters only go up, names end in _total, and that result/reason labels must come from a small fixed set.",
              "from prometheus_client import Counter\nCLAIMS = Counter('claims_processed_total', 'Claims processed by the worker', ['claim_type', 'result'])\n...\nCLAIMS.labels(claim_type=claim.type, result='success').inc()\nA counter for every completed job, labelled by claim_type (3 values) and result (success|failure). Rate and error-rate queries follow: rate(claims_processed_total[5m]) and the failure share. If reasons matter, claims_failures_total{claim_type, reason} with reason drawn from a fixed enum (timeout, validation, db_error) -- never the raw exception message, which is unbounded."
            ),
            part(
              "Duration: histogram with chosen buckets",
              "claims_processing_duration_seconds as a Histogram labelled by claim_type with buckets chosen around the expected range and the SLO (e.g. 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30), observed per job; explains why a histogram beats a summary (aggregatable across instances, quantiles computed server-side) and why bucket boundaries must include any SLO threshold.",
              "from prometheus_client import Histogram\nDURATION = Histogram('claims_processing_duration_seconds', 'Time to process one claim', ['claim_type'],\n                     buckets=(0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30))\nwith DURATION.labels(claim_type=claim.type).time():\n    process(claim)\nA histogram's buckets are counters, so they sum across workers and histogram_quantile works on the aggregate; a client-side summary's quantiles cannot be combined. Buckets span the realistic range (most jobs 0.5-5 s) and include the SLO point (say 10 s) so 'share of jobs under 10 s' is exact. Base unit is seconds, hence the suffix."
            ),
            part(
              "Saturation: gauges for queue depth and in-flight work",
              "claims_queue_depth as a Gauge set from the queue's reported length (or exported by the queue system itself) and claims_in_progress as a Gauge inc/dec around each job; explains USE (utilisation, saturation, errors) is the resource view that complements RED's request view.",
              "QUEUE_DEPTH = Gauge('claims_queue_depth', 'Claims waiting in the queue')\nIN_PROGRESS = Gauge('claims_in_progress', 'Claims being processed right now')\nQUEUE_DEPTH.set(queue.length())   # on each poll\nIN_PROGRESS.inc(); ... IN_PROGRESS.dec()\nRED (rate, errors, duration) describes the work; USE (utilisation, saturation, errors) describes the resource. Queue depth is the worker pool's saturation signal: rising depth with flat throughput means the pool is undersized. Gauges go up and down and are read with plain selectors, deriv or max_over_time."
            ),
            part(
              "The dependency: fraud API as a client-side RED set",
              "fraud_api_requests_total{status} and fraud_api_request_duration_seconds histogram measured around the outbound call, so the team can tell their own slowness from the dependency's; keeps labels bounded (status class, not full URL).",
              "FRAUD_REQS = Counter('fraud_api_requests_total', 'Calls to the fraud-scoring API', ['status_class'])\nFRAUD_DUR = Histogram('fraud_api_request_duration_seconds', 'Fraud API latency', buckets=(0.05, 0.1, 0.25, 0.5, 1, 2.5, 5))\nMeasuring the outbound call separately answers 'is it us or them' during an incident: if claims duration rises and fraud API duration rises with it, the dependency is the cause. status_class takes values like 2xx/4xx/5xx/timeout -- bounded -- rather than URLs or request ids."
            ),
            part(
              "What not to label, and exposing",
              "No customer_id, claim_id or free-text labels (unbounded cardinality); claim_type is fine (3 values); expose with start_http_server(8000) or the WSGI app on /metrics and scrape it; note the default process_* and python_* metrics come free and are useful for USE.",
              "Labels are the cardinality budget: claim_type with three values multiplies each metric by 3; customer_id would multiply it by every customer and is forbidden -- that detail belongs in logs or trace attributes. Expose with prometheus_client.start_http_server(8000) (or mount the ASGI/WSGI app) and add the worker to the scrape config. The client library also exports process_cpu_seconds_total, process_resident_memory_bytes and Python GC metrics, which cover utilisation for free."
            ),
          ],
        },
      ],
    },
    {
      slug: "exporter-blackbox-node",
      objective: "Exporters: node_exporter, blackbox_exporter and third-party exporters, how they translate another system's state into the exposition format, and when to write your own",
      kind: "case",
      title: "Choose and configure exporters for systems you cannot change",
      brief:
        "The fictional regional hospital group Thurlow Health runs Prometheus and needs to monitor three things it cannot instrument directly: the Linux hosts running its appointment system, an external patient-portal URL that must return HTTP 200 with valid TLS, and a proprietary HL7 interface engine that only offers a status JSON over HTTP. A junior engineer proposes writing one custom exporter for all three.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Status endpoint of the interface engine:\n$ curl -s http://hl7-engine:8181/status\n{\"queues\":[{\"name\":\"adt-in\",\"depth\":42,\"errors_total\":7},{\"name\":\"orm-out\",\"depth\":0,\"errors_total\":0}],\"uptime_seconds\":884201,\"version\":\"4.2.1\"}",
          ask: "For each of the three systems say which exporter you would use and how it works, and give the Prometheus or exporter configuration for the portal check and the metrics you would emit for the HL7 engine.",
          parts: [
            part(
              "Hosts: node_exporter",
              "Run node_exporter on each host (port 9100) and scrape it; it reads /proc and /sys and exposes node_cpu_seconds_total, node_memory_MemAvailable_bytes, node_filesystem_avail_bytes, node_network_* and more; explains an exporter translates another system's state into the exposition format at scrape time, and that there is no reason to write this yourself.",
              "node_exporter, one per host as a systemd service (or a DaemonSet on Kubernetes), scraped on :9100. It reads the kernel's counters from /proc and /sys on every scrape and renders them as node_* metrics -- CPU per mode, memory, disk I/O, filesystem usage, network, load. USE queries fall out: 1 - avg by (instance) (rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) for utilisation, node_filesystem_avail_bytes / node_filesystem_size_bytes for disk. Writing a custom host exporter would reproduce years of edge cases for nothing."
            ),
            part(
              "Portal URL: blackbox_exporter",
              "blackbox_exporter with an http_2xx module (fail_if_not_ssl, valid_status_codes, maybe fail_if_body_not_matches_regexp), scraped via a job that passes the target URL as a parameter and relabels __param_target/instance/__address__; explains probe_success, probe_http_status_code, probe_ssl_earliest_cert_expiry and probe_duration_seconds, and that the exporter probes from the outside like a user would.",
              "blackbox.yml module:\nmodules:\n  http_2xx_tls:\n    prober: http\n    http:\n      valid_status_codes: [200]\n      fail_if_not_ssl: true\n      method: GET\nprometheus.yml:\n- job_name: blackbox-portal\n  metrics_path: /probe\n  params: {module: [http_2xx_tls]}\n  static_configs:\n  - targets: [https://portal.thurlow.example/login]\n  relabel_configs:\n  - source_labels: [__address__]\n    target_label: __param_target\n  - source_labels: [__param_target]\n    target_label: instance\n  - target_label: __address__\n    replacement: blackbox-exporter:9115\nThe relabelling turns the URL into the ?target= parameter and points the scrape at the exporter. Alert on probe_success == 0 and on probe_ssl_earliest_cert_expiry - time() < 14*24*3600 for the certificate."
            ),
            part(
              "HL7 engine: a small custom exporter (or json_exporter)",
              "Either the community json_exporter configured to map the status JSON fields to metrics, or a small custom exporter using a client library that fetches /status on each scrape and exposes hl7_queue_depth{queue} (gauge), hl7_queue_errors_total{queue} (counter, mirroring the engine's monotonically increasing value), hl7_uptime_seconds (gauge), and hl7_engine_info{version} (gauge 1); explains metric types and naming and that the exporter must not cache stale data or push.",
              "This is the one place a custom exporter is justified, because the engine speaks its own format. Option A: json_exporter with a module mapping $.queues[*].depth to hl7_queue_depth{queue=$.name} and errors_total to hl7_queue_errors_total. Option B: 40 lines of Python with prometheus_client's custom collector that GETs /status on each scrape and yields:\n  hl7_queue_depth{queue=\"adt-in\"} 42        # gauge\n  hl7_queue_errors_total{queue=\"adt-in\"} 7  # counter: the engine's value only increases\n  hl7_uptime_seconds 884201                  # gauge\n  hl7_engine_info{version=\"4.2.1\"} 1         # info-style gauge\nCollect on scrape (no background caching), expose on :9282, and scrape it like any target. The errors value is a counter because the engine reports a monotonically increasing total; rate() then gives errors per second."
            ),
          ],
        },
        {
          text: "The three exporters are deployed. A month later the HL7 exporter is reported to 'show wrong numbers': hl7_queue_errors_total is sometimes lower than a minute earlier, and rate(hl7_queue_errors_total[5m]) shows huge spikes.\n\n$ curl -s hl7-engine:8181/status | jq '.uptime_seconds, .queues[0].errors_total'\n312\n0\n$ curl -s localhost:9090/api/v1/query --data-urlencode 'query=changes(hl7_uptime_seconds[1h]) ' | jq -r '.data.result[0].value[1]'\n7",
          ask: "Explain the spikes and decide whether the metric type is right, then fix the exporter or the queries.",
          parts: [
            part(
              "Diagnosis",
              "The engine restarts often (uptime 312 s, 7 restarts in the hour) and its errors_total resets to 0 at each restart; Prometheus treats a counter decrease as a reset and extrapolates, which is correct, but if the decrease is not a clean reset to 0 -- or the exporter caches values -- rate shows artefacts; here the spikes come from rate() seeing the reset plus the engine re-counting quickly, and from the exporter possibly exposing the value as a gauge-like metric.",
              "The engine restarted seven times in an hour (hl7_uptime_seconds keeps dropping); each restart zeroes errors_total. rate() handles a reset by assuming the counter went to zero and continuing, which is right when the drop is a true reset. Huge spikes appear when the value after a 'reset' is not zero but some re-accumulated number within one scrape interval, or when scrapes straddle the restart so one sample is from the old process and the next from the new one -- the increase is then over-estimated. Also check the exporter: if it was declared as a gauge (# TYPE ... gauge), rate() is still computed, but a counter should be declared as one."
            ),
            part(
              "Fix",
              "Keep the counter type but make the exporter robust: declare # TYPE hl7_queue_errors_total counter, and consider adding a created timestamp or exposing the engine's restart as hl7_engine_start_time_seconds so queries can be gated; for the query, use increase() over a longer window or alert on the engine restarting itself (changes(hl7_uptime_seconds[1h]) > 0 or resets(hl7_queue_errors_total[1h])); and fix the real problem -- an engine restarting seven times an hour.",
              "The metric type is right: it is a counter. Make sure the exporter declares it as one (# TYPE hl7_queue_errors_total counter) so tooling and the new native handling behave. Expose hl7_engine_start_time_seconds (from uptime) so the restarts are a first-class signal: alert on changes(hl7_engine_start_time_seconds[1h]) > 2 -- the engine flapping is the actual incident. Smooth the error-rate panel with increase(hl7_queue_errors_total[30m]) and read resets(hl7_queue_errors_total[1h]) to see how many resets the window contains. No amount of query tuning substitutes for stopping the restarts."
            ),
          ],
        },
      ],
    },
  ],
};
