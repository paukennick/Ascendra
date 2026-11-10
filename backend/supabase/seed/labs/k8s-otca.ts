import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-164: OpenTelemetry Certified Associate (OTCA).
//
// Aligned to the four OTCA domains (Fundamentals of Observability 18%, The
// OpenTelemetry API and SDK 46%, The OpenTelemetry Collector 26%,
// Maintaining and Debugging Observability Pipelines 10%), read on 2026-11-08
// from github.com/cncf/curriculum (OTCA_Curriculum.pdf) and
// training.linuxfoundation.org. Density (docs/labs.md, hybrid): 2 / 3 / 2 / 2.
//
// Labs ask for Collector YAML, SDK configuration and code sketches against
// authored Collector output and trace fragments. Concepts are the stable
// OpenTelemetry specification (signals, propagators, processors/exporters,
// OTLP); every lab is needs_expert_review.

export const OTCA_LABS: SeedLabSet = {
  trackCode: "OTCA",
  sources: [
    source("https://github.com/cncf/curriculum/blob/0a8cc08a502710a894e5724c2bec7b88404e5a6b/OTCA_Curriculum.pdf", "exam_outline", "2026-11-08"),
    source("https://training.linuxfoundation.org/certification/opentelemetry-certified-associate-otca/", "exam_outline", "2026-11-08"),
    source("https://opentelemetry.io/docs/specs/otel/", "reference", "2026-11-08"),
    source("https://opentelemetry.io/docs/collector/configuration/", "reference", "2026-11-08"),
    source("https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/connector/spanmetricsconnector", "reference", "2026-11-09"),
  ],
  labs: [
    // ----------------------------------------------------------------- 18%
    {
      slug: "signals-for-questions",
      objective: "Choose automatic (agent and library) versus manual instrumentation for a service, and combine them",
      kind: "build",
      title: "Plan instrumentation for a three-service order flow",
      brief:
        "The fictional meal-kit company Alderley Kitchen has three services: a Java Spring Boot API gateway, a Python Flask pricing service, and a Go fulfilment worker that reads from Kafka. Nobody has written any telemetry code. Operations want distributed traces across the whole order flow, request metrics per service, and logs that can be tied to a trace, with the least code change possible -- but the pricing team also wants to see how long each pricing rule takes inside a request.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "For each service choose automatic, manual or both, name the mechanism, and explain what automatic instrumentation gives for free and where manual spans and attributes are still needed.",
          parts: [
            part(
              "Java gateway",
              "The OpenTelemetry Java agent (zero-code, -javaagent flag) which instruments Spring MVC, HTTP clients, JDBC and Kafka automatically, producing server and client spans, HTTP metrics and trace-correlated logging context; configured via OTEL_* environment variables; no code change for the baseline.",
              "Attach the Java agent: JAVA_TOOL_OPTIONS=\"-javaagent:/otel/opentelemetry-javaagent.jar\" with OTEL_SERVICE_NAME=gateway and OTEL_EXPORTER_OTLP_ENDPOINT. The agent instruments Spring MVC (server spans), HTTP and gRPC clients (client spans with propagation), JDBC and Kafka producers, emits HTTP server/client metrics following semantic conventions, and injects trace_id/span_id into the logging MDC. No source change for the baseline."
            ),
            part(
              "Python pricing service: both",
              "Auto-instrumentation via opentelemetry-instrument (or opentelemetry-distro with the Flask and requests instrumentations) for the inbound/outbound HTTP spans, plus manual spans around each pricing rule using the API (tracer.start_as_current_span) with attributes such as pricing.rule and pricing.outcome; explains auto covers framework boundaries, not business logic.",
              "Run under opentelemetry-instrument (opentelemetry-distro + opentelemetry-instrumentation-flask/-requests): the Flask server span and outgoing HTTP client spans appear with propagation. Automatic instrumentation stops at framework boundaries, so the per-rule timing the pricing team wants needs manual spans:\nfrom opentelemetry import trace\ntracer = trace.get_tracer(\"pricing\")\nwith tracer.start_as_current_span(\"pricing.rule\") as span:\n    span.set_attribute(\"pricing.rule\", rule.name)\n    ...\nThese child spans nest under the auto-created server span, so the trace shows the request and each rule inside it."
            ),
            part(
              "Go fulfilment worker: manual with libraries",
              "Go has no runtime agent; use the OpenTelemetry Go SDK with contrib instrumentation libraries (otelkafka/otelsarama or the Kafka client's instrumentation, otelhttp for any HTTP) and manual consumer spans that extract context from Kafka message headers, so the trace continues from the producer.",
              "Go cannot be instrumented by an agent; instrumentation libraries are the automatic layer. Initialise the SDK in main (TracerProvider with an OTLP exporter and BatchSpanProcessor, MeterProvider), wrap the Kafka consumer with the contrib instrumentation so each message starts a consumer span whose parent is extracted from the message headers the Java producer injected, and add manual spans for the fulfilment steps. Without header extraction the Go spans would start a new trace, breaking the order flow in two."
            ),
            part(
              "What automatic gives and what it cannot",
              "Automatic: spans at framework boundaries with semantic-convention attributes, context propagation on supported clients, standard HTTP/RPC/DB metrics and log correlation; it cannot know business operations, domain attributes (order id, rule name) or custom metrics (orders fulfilled), which need the API; and it is consistent across languages only because of semantic conventions.",
              "Automatic instrumentation gives the skeleton: a span wherever a request enters or leaves a process, propagation headers on the way out, HTTP/RPC/DB metrics named by the semantic conventions, and trace ids in logs. It cannot express what the code means -- 'pricing.rule=weekend_surcharge', 'orders_fulfilled_total' -- so those are API calls: manual spans and attributes for business steps, custom metric instruments for business counts. Because every agent and library follows the same semantic conventions, http.request.method or server.address mean the same thing from Java, Python and Go, which is what makes the cross-service trace readable."
            ),
          ],
        },
      ],
    },
    {
      slug: "semantic-conventions-review",
      objective: "Semantic conventions: standard attribute names for HTTP, databases, messaging, resources and more, and why consistency across services matters",
      kind: "case",
      title: "Fix attributes that broke a cross-service dashboard",
      brief:
        "At the fictional ticket marketplace Rook & Field, a dashboard of request latency by HTTP route across all services shows only two of five services. The telemetry team pulls sample spans from the missing services.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Span from service checkout (Java agent):\n  name: GET /api/checkout/{id}\n  kind: SERVER\n  attributes: {http.request.method: GET, http.route: /api/checkout/{id}, url.path: /api/checkout/8812, http.response.status_code: 200, server.address: checkout.svc}\n  resource: {service.name: checkout, service.version: 4.1.0, deployment.environment.name: prod}\n\nSpan from service inventory (hand-written Python):\n  name: handle_request\n  kind: INTERNAL\n  attributes: {method: GET, path: /inventory/items/8812, status: 200, Service: inventory-svc}\n  resource: {service.name: unknown_service:python}\n\nSpan from service search (hand-written Go):\n  name: /search\n  kind: SERVER\n  attributes: {http.method: GET, http.target: /search?q=rock, http.status_code: 200}\n  resource: {service.name: search, deployment.environment: prod}",
          ask: "Say why the inventory and search spans fall off the dashboard and rewrite their attributes to the current semantic conventions.",
          parts: [
            part(
              "inventory: no conventions at all",
              "The span uses invented attribute names (method, path, status, Service), kind INTERNAL instead of SERVER, a non-templated path with the id inline (high cardinality) and no service.name resource; dashboards keyed on http.route and SERVER spans cannot see it; rewrite with http.request.method, http.route (templated), url.path, http.response.status_code, kind SERVER, and OTEL_SERVICE_NAME / OTEL_RESOURCE_ATTRIBUTES for the resource.",
              "Nothing in the inventory span matches what the dashboard groups by. Fix:\n  kind: SERVER (it handles an inbound request)\n  attributes: {http.request.method: GET, http.route: /inventory/items/{id}, url.path: /inventory/items/8812, http.response.status_code: 200}\n  resource: {service.name: inventory, service.version: ..., deployment.environment.name: prod} via OTEL_SERVICE_NAME=inventory and OTEL_RESOURCE_ATTRIBUTES=service.version=2.3.0,deployment.environment.name=prod\nhttp.route must be the templated route, not the concrete path, or every item id becomes its own series. 'Service' as a span attribute is wrong twice: the convention is the resource attribute service.name. unknown_service:python is what the SDK emits when nobody set a name."
            ),
            part(
              "search: old conventions",
              "The search span uses the pre-stabilisation HTTP names (http.method, http.target, http.status_code) and the old deployment.environment; the stable HTTP semantic conventions renamed them to http.request.method, url.path/url.query (or url.full on clients), http.response.status_code, and deployment.environment.name, and it lacks http.route; rewrite accordingly and add the route.",
              "search is on the old HTTP conventions from before they were declared stable. Mapping: http.method -> http.request.method; http.target -> url.path (/search) plus url.query (q=rock); http.status_code -> http.response.status_code; deployment.environment -> deployment.environment.name. Add http.route: /search so route-level grouping works. During migration the Go SDK's instrumentation can emit both old and new names via OTEL_SEMCONV_STABILITY_OPT_IN=http/dup so dashboards can switch without a gap."
            ),
            part(
              "Why consistency matters",
              "Explains that backends, dashboards and alerts key on attribute names and span kinds; one differently named attribute silently drops a service from every cross-service view, SLO and sampling rule; conventions also carry the cardinality guidance (route templates, bounded values) that keeps metrics usable; and recommends enforcing conventions with a Collector transform processor as a safety net plus code review.",
              "A dashboard, an SLO query or a tail-sampling rule is a filter on attribute names and values. If one team writes 'status' and another 'http.response.status_code', the first team is invisible in every shared view and nobody notices until an incident. Conventions also encode hard-won rules -- templated routes, bounded enums -- that keep cardinality down. Enforce them twice: in code review (and by preferring instrumentation libraries over hand-rolled spans), and in the Collector with a transform processor that renames legacy keys (set(attributes[\"http.request.method\"], attributes[\"http.method\"]) where attributes[\"http.method\"] != nil) so stragglers still land on the dashboard."
            ),
          ],
        },
        {
          text: "After the fixes, all five services appear. A product manager asks for a panel of 'checkout latency per customer' and proposes adding customer.id as a span attribute on every span and as a metric attribute on the HTTP duration histogram.",
          ask: "Advise on where customer.id belongs in each signal and why.",
          parts: [
            part(
              "Spans and logs: yes, as an attribute",
              "customer.id (or the enduser.* / user.id convention) is fine as a span attribute on the server span and in logs, because traces and logs are per-event and searchable; recommends putting it on the entry span (and propagating via baggage only if downstream spans need it), mindful of privacy requirements.",
              "On the trace: set user.id (the semantic convention for an authenticated end user) or a domain attribute customer.id on the checkout server span -- traces are per-request, so a high-cardinality value costs nothing structurally and makes 'show me this customer's slow checkout' a one-click search. Propagate it to downstream spans with baggage only if they need it (the baggage span processor can copy it). Treat it as personal data: pseudonymise if policy requires."
            ),
            part(
              "Metrics: no",
              "A metric attribute with one value per customer multiplies the histogram's series by the customer count and overwhelms the metrics backend; the convention is to keep metric attributes low-cardinality (route, method, status class); per-customer latency comes from trace queries or exemplars, or from a dedicated aggregated metric for a handful of key accounts.",
              "Not on the HTTP duration histogram: each distinct customer.id would create a full set of histogram buckets, turning one metric into millions of time series and taking the metrics backend down. Metric attributes must be bounded -- http.route, http.request.method, http.response.status_code. For per-customer latency use the traces (filter spans by user.id and aggregate in the tracing backend), link metrics to traces with exemplars so a slow bucket jumps to example traces, or, for a dozen named key accounts, a separate metric with a bounded account.tier/account.name attribute."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 46%
    {
      slug: "sdk-pipeline-configuration",
      objective: "Build SDK pipelines: span processors (simple, batch), metric readers (periodic, pull), log record processors, and OTLP and other exporters",
      kind: "build",
      title: "Configure an SDK to export all three signals over OTLP",
      brief:
        "The fictional parcel-tracking company Marlinspike runs a Node.js service that must send traces, metrics and logs to an OpenTelemetry Collector at otel-collector.observability.svc:4317 over OTLP/gRPC. Requirements: the resource must carry service.name, service.version and the Kubernetes pod name; spans must be batched, with a 10% head-sampling rate in production but every trace kept when the parent was sampled; metrics exported every 30 seconds with delta temporality preferred by the backend; logs bridged from the existing pino logger; and all of it configurable without code changes between environments.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the SDK setup (code or declarative configuration) and the environment variables, and explain each pipeline component.",
          parts: [
            part(
              "Resource",
              "A Resource merging the default detectors with service.name/service.version and k8s.pod.name, supplied via OTEL_SERVICE_NAME and OTEL_RESOURCE_ATTRIBUTES (with the Pod name injected from the Downward API), rather than hard-coded; explains resource attributes describe the emitting entity and attach to every span, metric and log.",
              "Environment (from the Deployment, with the Downward API):\n  OTEL_SERVICE_NAME=tracking-api\n  OTEL_RESOURCE_ATTRIBUTES=service.version=7.2.0,deployment.environment.name=prod,k8s.pod.name=$(POD_NAME)\nIn code the NodeSDK merges these with its resource detectors (process, host, container). The resource is attached to every signal the SDK emits, so a trace, a metric series and a log line from this Pod all carry the same identity -- that is how a backend joins them."
            ),
            part(
              "Traces: processor, exporter, sampler",
              "A BatchSpanProcessor wrapping an OTLP gRPC trace exporter pointed at the Collector, and a ParentBased(TraceIdRatioBased(0.1)) sampler set via OTEL_TRACES_SAMPLER=parentbased_traceidratio and OTEL_TRACES_SAMPLER_ARG=0.1; explains batch versus simple processors and why parent-based keeps traces whole.",
              "OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector.observability.svc:4317\nOTEL_EXPORTER_OTLP_PROTOCOL=grpc\nOTEL_TRACES_SAMPLER=parentbased_traceidratio\nOTEL_TRACES_SAMPLER_ARG=0.1\nThe NodeSDK builds a BatchSpanProcessor -> OTLPTraceExporter chain: spans are queued and sent in batches on a timer or size threshold (a SimpleSpanProcessor exports each span synchronously -- fine for tests, costly in production). ParentBased(TraceIdRatioBased(0.1)) samples 10% of root traces by trace id, but follows the parent's decision for child spans, so a trace sampled upstream is never cut in half here."
            ),
            part(
              "Metrics: reader and temporality",
              "A PeriodicExportingMetricReader with a 30 s interval (OTEL_METRIC_EXPORT_INTERVAL=30000) over the OTLP metric exporter, with OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE=delta; explains periodic (push) versus pull readers (Prometheus exporter) and what cumulative versus delta temporality means.",
              "OTEL_METRIC_EXPORT_INTERVAL=30000\nOTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE=delta\nThe SDK's PeriodicExportingMetricReader collects from the MeterProvider every 30 s and pushes through the OTLP exporter. A pull reader (the Prometheus exporter) instead serves /metrics for a scraper. Temporality: cumulative reports totals since start (Prometheus style); delta reports the change since the last export (what some backends prefer). The preference tells the exporter which to produce for counters and histograms; gauges are unaffected."
            ),
            part(
              "Logs: bridge and processor",
              "A LoggerProvider with a BatchLogRecordProcessor over the OTLP log exporter, and the pino instrumentation (or an OpenTelemetry transport/appender) that bridges existing pino logs into LogRecords with the active trace and span ids attached; explains the logs API is a bridge for logging libraries, not a replacement.",
              "Add @opentelemetry/instrumentation-pino (or the pino OpenTelemetry transport): existing logger.info calls become LogRecords with severity, body, attributes, and trace_id/span_id taken from the active context, flowing through a BatchLogRecordProcessor -> OTLPLogExporter. Nothing in the application's logging calls changes -- the Logs Bridge API is built for exactly this: libraries keep their API, the SDK carries the records."
            ),
            part(
              "No code changes between environments",
              "Everything above is environment-driven, so staging can set OTEL_TRACES_SAMPLER_ARG=1.0 and a different endpoint; alternatively the declarative configuration file (OTEL_EXPERIMENTAL_CONFIG_FILE) holds the same settings in YAML; explains the SDK's env-var specification is standard across languages.",
              "Every knob used is an environment variable from the OpenTelemetry SDK environment specification, identical across languages: staging sets OTEL_TRACES_SAMPLER_ARG=1.0 (sample everything) and its own OTEL_EXPORTER_OTLP_ENDPOINT; a developer laptop sets OTEL_TRACES_EXPORTER=console. For richer setups the declarative configuration file (YAML, selected with OTEL_EXPERIMENTAL_CONFIG_FILE) expresses processors, exporters and samplers in one document the platform team can own. The code only calls sdk.start()."
            ),
          ],
        },
      ],
    },
    {
      slug: "manual-spans-and-metrics",
      objective: "Create tracers and spans: span kinds, attributes and events, recording exceptions and status, and sampling strategies",
      kind: "build",
      title: "Instrument a payment handler by hand",
      brief:
        "The fictional subscription service Harrow & Sons has a Go HTTP handler POST /charge that validates a request, calls a payment provider over HTTP, and writes a ledger row. Automatic instrumentation already creates the server span and the outbound HTTP client span. The team wants: the validation and ledger steps visible as spans, the provider's decline reason recorded without putting card data anywhere, a span event when a retry happens, correct status when things fail, and a counter and histogram for charges.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Sketch the instrumentation with the API (Go or pseudocode), naming span kinds, attributes, events, status handling and the metric instruments, and explain the rules you are following.",
          parts: [
            part(
              "Child spans with the right kind",
              "tracer := otel.Tracer(\"harrow/payments\"); ctx, span := tracer.Start(ctx, \"charge.validate\") and \"ledger.write\" as INTERNAL spans (default kind) that are children of the server span through ctx; the provider call keeps the auto-created CLIENT span; explains span kinds (SERVER, CLIENT, INTERNAL, PRODUCER, CONSUMER) and that a span name should be a low-cardinality operation name.",
              "tracer := otel.Tracer(\"harrow/payments\")\nctx, vspan := tracer.Start(ctx, \"charge.validate\")\n... validate ...\nvspan.End()\n// provider call: the instrumented HTTP client creates a CLIENT span named by method/route\nctx, lspan := tracer.Start(ctx, \"ledger.write\", trace.WithSpanKind(trace.SpanKindInternal))\n... write row ...\nlspan.End()\nPassing ctx makes each new span a child of the current one (the auto server span). INTERNAL is the default kind for in-process work; SERVER/CLIENT mark the two ends of a remote call, PRODUCER/CONSUMER the ends of a messaging hop. Span names are operation names, never 'charge 8812' -- ids go in attributes."
            ),
            part(
              "Attributes without sensitive data",
              "span.SetAttributes(attribute.String(\"payment.provider\", \"acmepay\"), attribute.String(\"payment.decline_reason\", resp.Code), attribute.String(\"payment.currency\", \"GBP\"), attribute.Int64(\"payment.amount_minor\", amt)); no PAN, CVV or cardholder name anywhere; explains attributes are typed key-values, bounded values preferred, and a Collector redaction processor as a backstop.",
              "span.SetAttributes(\n  attribute.String(\"payment.provider\", \"acmepay\"),\n  attribute.String(\"payment.decline_reason\", resp.DeclineCode),   // e.g. insufficient_funds\n  attribute.String(\"payment.currency\", req.Currency),\n  attribute.Int64(\"payment.amount_minor\", req.AmountMinor),\n)\nThe decline code is a bounded enum from the provider -- useful and safe. Card number, expiry, CVV and cardholder name never become attributes, events or log bodies: telemetry stores are not PCI-scoped. As a backstop the Collector runs a redaction/attributes processor that deletes any key matching card.* and hashes anything that looks like a PAN."
            ),
            part(
              "Events and exceptions",
              "span.AddEvent(\"payment.retry\", trace.WithAttributes(attribute.Int(\"retry.attempt\", n), attribute.String(\"retry.reason\", \"timeout\"))) on each retry; on failure span.RecordException(err) (an exception event with type, message, stacktrace) plus span.SetStatus(codes.Error, \"provider timeout\"); on success leave status Unset or set Ok; explains events are timestamped annotations inside a span, and that status is set only on error by convention.",
              "On each retry: span.AddEvent(\"payment.retry\", trace.WithAttributes(attribute.Int(\"retry.attempt\", attempt), attribute.String(\"retry.reason\", \"timeout\")))\nOn failure: span.RecordException(err); span.SetStatus(codes.Error, \"payment provider timeout\")\nOn success: leave the status Unset (the backend treats Unset as fine; Ok is for an explicit 'definitely fine' override).\nEvents are point-in-time annotations with their own attributes -- right for 'a retry happened at 14:02:07.311'. RecordException adds the standard exception.type/message/stacktrace event; SetStatus(Error) is what marks the span red and feeds error-rate views. Do not set Error on every 4xx-style business decline unless the operation genuinely failed from the service's point of view."
            ),
            part(
              "Metrics",
              "meter := otel.Meter(\"harrow/payments\"); a Counter payments.charges with attributes payment.provider and payment.outcome (approved|declined|error), and a Histogram payments.charge.duration (unit s) with the same bounded attributes, recorded once per request; explains instruments are created once and reused, attributes must be low-cardinality, and amount could be a histogram in minor units if needed.",
              "meter := otel.Meter(\"harrow/payments\")\ncharges, _ := meter.Int64Counter(\"payments.charges\", metric.WithDescription(\"Charge attempts\"))\ndur, _ := meter.Float64Histogram(\"payments.charge.duration\", metric.WithUnit(\"s\"))\n...\nattrs := metric.WithAttributes(attribute.String(\"payment.provider\", \"acmepay\"), attribute.String(\"payment.outcome\", outcome))\ncharges.Add(ctx, 1, attrs)\ndur.Record(ctx, time.Since(start).Seconds(), attrs)\nInstruments are created once at startup and reused; outcome is a three-value enum, provider a short list -- bounded, so the series count stays small. Passing ctx lets the SDK attach exemplars linking histogram buckets to the trace."
            ),
            part(
              "Sampling and these spans",
              "Explains that span creation checks the sampler at the root; children inherit the decision through ParentBased, and a non-recording span makes AddEvent/SetAttributes cheap no-ops, so the code stays the same under 10% sampling; events and attributes on unsampled spans are simply dropped, while metrics are unaffected by trace sampling.",
              "With ParentBased(TraceIdRatioBased(0.1)) the decision is made once at the root; child spans inherit it, so charge.validate and ledger.write are recorded exactly when the server span is. For an unsampled trace tracer.Start returns a non-recording span: SetAttributes, AddEvent and RecordException become no-ops and cost almost nothing, so the instrumentation code does not change for sampling. Metrics are counted for every request regardless of trace sampling -- which is why the error rate comes from the counter, not from counting error spans."
            ),
          ],
        },
      ],
    },
    {
      slug: "broken-propagation",
      objective:
        "Implement context propagation: the context API, baggage, the W3C Trace Context and Baggage propagators, and propagating across threads and services",
      kind: "case",
      title: "Reconnect a trace that splits between two services",
      brief:
        "The fictional travel aggregator Quillon routes requests from a Node.js gateway to a Java booking service through an in-house HTTP client wrapper. Traces always end at the gateway; the booking service's spans appear as separate root traces. Both services export to the same Collector.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Gateway outbound request as seen by the booking service's access log:\n  POST /bookings HTTP/1.1\n  host: booking.svc\n  content-type: application/json\n  x-request-id: 7f3a9c2e\n  x-b3-traceid: 80f198ee56343ba864fe8b2a57d3eff7\n  x-b3-spanid: e457b5a2e4d86bd1\n  x-b3-sampled: 1\n\nBooking service SDK configuration:\n  OTEL_PROPAGATORS=tracecontext,baggage\n\nGateway SDK configuration:\n  OTEL_PROPAGATORS=b3multi\n\nGateway code (abridged):\n  const span = tracer.startSpan('callBooking');\n  await httpClient.post(url, body);   // in-house wrapper around fetch; no instrumentation\n  span.end();",
          ask: "Explain why the trace splits (there are two independent problems in the evidence) and fix both.",
          parts: [
            part(
              "Problem 1: propagator mismatch",
              "The gateway injects B3 multi-header format (x-b3-*) while the booking service extracts only W3C Trace Context (traceparent/tracestate) and baggage, so the incoming headers are ignored and the server span becomes a new root; fix by aligning propagators -- preferably both on W3C tracecontext,baggage, or add b3multi to the booking service's extractor during migration (OTEL_PROPAGATORS=tracecontext,baggage,b3multi).",
              "The gateway speaks B3 (x-b3-traceid, x-b3-spanid, x-b3-sampled) and the booking service listens only for W3C traceparent/tracestate and baggage. No traceparent arrives, so the Java server span has no parent and starts a new trace -- hence booking spans as separate roots. Align on W3C: set OTEL_PROPAGATORS=tracecontext,baggage on the gateway too. If other B3-speaking callers exist, let the booking service accept both during migration: OTEL_PROPAGATORS=tracecontext,baggage,b3multi (a composite propagator extracts whichever is present and injects all of them)."
            ),
            part(
              "Problem 2: the span is not the current context",
              "tracer.startSpan creates a span but does not make it active in the context, and the in-house HTTP wrapper is not instrumented, so even with matching propagators nothing injects headers for callBooking (the B3 headers seen came from an outer auto-instrumented span, not this one); fix by using startActiveSpan (or context.with(trace.setSpan(...))) and by instrumenting the wrapper -- use the fetch/undici instrumentation or inject manually with propagation.inject(context.active(), headers).",
              "In Node, tracer.startSpan returns a span but leaves the active context unchanged, so any code that reads context.active() -- including an HTTP instrumentation -- would not see callBooking as the parent. And the in-house wrapper bypasses the instrumented client, so nobody injects headers for it at all. Fix:\n  await tracer.startActiveSpan('callBooking', async (span) => {\n    const headers = {};\n    propagation.inject(context.active(), headers);   // writes traceparent (and baggage)\n    await httpClient.post(url, body, { headers });\n    span.end();\n  });\nBetter still, make the wrapper use the instrumented fetch/undici client so injection happens automatically. Node's AsyncLocalStorage-based context manager carries the active span across awaits once it is set."
            ),
            part(
              "Verifying the join",
              "Checks the booking access log now shows traceparent: 00-<traceid>-<spanid>-01, that the Java server span's parent id equals the gateway client span id in the Collector's debug output, and that a trace query by that trace id shows one trace spanning both services; explains the traceparent format briefly.",
              "After the change the booking log shows traceparent: 00-80f198ee56343ba864fe8b2a57d3eff7-e457b5a2e4d86bd1-01 (version-traceid-parentspanid-flags; 01 = sampled). With the debug exporter on the Collector, the booking server span prints Parent ID equal to the gateway's callBooking span id and the same Trace ID. Searching the backend by that trace id returns one trace: gateway server -> callBooking (CLIENT) -> booking server, instead of two roots."
            ),
          ],
        },
        {
          text: "Traces are whole again. The booking team now wants the gateway's tenant identifier (tenant=acme) available as an attribute on every booking-service span and log line, without changing the HTTP API between the services.",
          ask: "Explain how baggage solves this, how to set and read it, and the risks of baggage.",
          parts: [
            part(
              "Baggage",
              "Baggage is key-value context propagated alongside the trace context in the baggage header by the baggage propagator; the gateway sets it (propagation.setBaggage / baggage.set) in the active context before the call, the booking service reads it from the incoming context (Baggage.fromContext) and copies the value onto its spans -- directly or with the Java agent's baggage span processor configuration; explains baggage is not automatically added to spans.",
              "Baggage rides with the trace context in a separate baggage: tenant=acme header, carried by the W3C Baggage propagator already enabled on both sides. Gateway:\n  const bag = propagation.createBaggage({ tenant: { value: 'acme' } });\n  await context.with(propagation.setBaggage(context.active(), bag), () => httpClient.post(...));\nBooking (Java): Baggage.current().getEntryValue(\"tenant\") inside handlers, or configure the agent to copy baggage to spans (otel.java.experimental.span-attributes.copy-from-baggage.include=tenant), and a log MDC appender picks it up too. Baggage is propagated but is not written to spans by itself -- you decide what to copy, where."
            ),
            part(
              "Risks",
              "Baggage is sent to every downstream hop, including third parties, in clear text: never put secrets or personal data in it; keep it small (header size limits) and bounded; and remember it is attached to the request, not stored, so it must be copied to spans/logs to be queryable.",
              "Baggage goes to every service the request touches -- including external HTTP calls unless the propagator is scoped -- as a plain header, so it must never carry tokens, emails or anything sensitive; tenant ids are fine, user secrets are not. Keep it to a few small keys: it adds bytes to every call and headers have size limits. And baggage is transient context, not telemetry: unless something copies tenant onto spans, metrics (bounded!) or logs, it leaves no trace in the backend."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 26%
    {
      slug: "collector-config-pipelines",
      objective: "Write a Collector configuration: receivers, processors, exporters, connectors and extensions wired into service pipelines per signal",
      kind: "build",
      title: "Write a Collector configuration for a gateway deployment",
      brief:
        "The fictional e-commerce platform Stanton Row runs an OpenTelemetry Collector as a central gateway. It must accept OTLP over gRPC and HTTP from applications, scrape its own Prometheus-style metrics from a few legacy exporters, protect itself from running out of memory, batch efficiently, add deployment.environment.name=prod to everything, drop any attribute named http.request.header.authorization, send traces to Tempo and metrics to Mimir over OTLP, send logs to Loki, and derive request-rate metrics from spans so the SRE team can alert on them even for unsampled services.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the Collector YAML and explain the ordering of processors and the role of the connector.",
          parts: [
            part(
              "Receivers",
              "otlp receiver with both grpc (4317) and http (4318) protocols, and a prometheus receiver with scrape_configs for the legacy exporters; explains receivers are the pipeline entry points and are only active when referenced in a pipeline.",
              "receivers:\n  otlp:\n    protocols:\n      grpc:\n        endpoint: 0.0.0.0:4317\n      http:\n        endpoint: 0.0.0.0:4318\n  prometheus:\n    config:\n      scrape_configs:\n      - job_name: legacy-exporters\n        scrape_interval: 30s\n        static_configs:\n        - targets: [node-exporter:9100, blackbox:9115]\nA receiver defined but not placed in a service pipeline does nothing; the prometheus receiver embeds Prometheus's own scraper and turns scraped samples into OTLP metrics."
            ),
            part(
              "Processors in order",
              "memory_limiter first (check_interval, limit_mib, spike_limit_mib), then resource (upsert deployment.environment.name), attributes (delete http.request.header.authorization), and batch last; explains memory_limiter must be first so it can refuse data before work is done, and batch last so it batches the final shape.",
              "processors:\n  memory_limiter:\n    check_interval: 1s\n    limit_mib: 1500\n    spike_limit_mib: 300\n  resource:\n    attributes:\n    - key: deployment.environment.name\n      value: prod\n      action: upsert\n  attributes/redact:\n    actions:\n    - key: http.request.header.authorization\n      action: delete\n  batch:\n    send_batch_size: 8192\n    timeout: 5s\nOrder matters: memory_limiter goes first so, when memory is high, it applies backpressure (refusing receiver data, which clients retry) before any processing cost; resource and attributes shape the data; batch goes last so exporters receive compact, final batches. Processors run in the order listed in the pipeline, not in the order defined."
            ),
            part(
              "Exporters",
              "otlp/tempo (gRPC endpoint, TLS settings) for traces, otlphttp/mimir for metrics, and the loki exporter or otlphttp to Loki's OTLP endpoint for logs; each with sending_queue and retry_on_failure; explains exporters are per-destination and can be shared across pipelines.",
              "exporters:\n  otlp/tempo:\n    endpoint: tempo.observability.svc:4317\n    tls: {insecure: true}\n    sending_queue: {enabled: true, queue_size: 5000}\n    retry_on_failure: {enabled: true, max_elapsed_time: 300s}\n  otlphttp/mimir:\n    endpoint: http://mimir.observability.svc:8080/otlp\n  otlphttp/loki:\n    endpoint: http://loki.observability.svc:3100/otlp\nQueues absorb bursts and backend hiccups; retry_on_failure resends with backoff up to max_elapsed_time, after which the batch is dropped (and counted in the Collector's own metrics). Current Loki, Mimir and Tempo all accept OTLP natively, so otlphttp replaces the older vendor-specific exporters."
            ),
            part(
              "Connector for span metrics",
              "The spanmetrics connector declared under connectors, used as an exporter at the end of the traces pipeline and as a receiver at the start of a metrics pipeline, producing calls and duration metrics per service/span name/status; explains connectors join two pipelines and that these metrics reflect the spans the Collector sees (so sampling upstream affects them -- tail sampling after the connector does not).",
              "connectors:\n  spanmetrics:\n    histogram:\n      explicit:\n        buckets: [100ms, 250ms, 500ms, 1s, 2.5s]\n    dimensions:\n    - name: http.request.method\n    - name: http.response.status_code\nA connector is both an exporter (in one pipeline) and a receiver (in another): traces flow into spanmetrics, which emits traces.span.metrics.calls and traces.span.metrics.duration (the connector's default namespace is traces.span.metrics; in Prometheus they appear as traces_span_metrics_calls_total and traces_span_metrics_duration_* series) per service.name, span.name, span.kind and status.code plus the listed dimensions, into the metrics pipeline. It counts the spans it receives, so head sampling in the SDK still thins it; if tail sampling is wanted, put the tail_sampling processor in a separate traces pipeline after the connector so metrics stay complete."
            ),
            part(
              "Service pipelines and extensions",
              "service.pipelines with traces (otlp -> processors -> otlp/tempo, spanmetrics), metrics (otlp, prometheus, spanmetrics -> processors -> otlphttp/mimir) and logs (otlp -> processors -> otlphttp/loki), plus extensions health_check and zpages and telemetry settings for the Collector's own metrics.",
              "extensions:\n  health_check: {endpoint: 0.0.0.0:13133}\n  zpages: {endpoint: 0.0.0.0:55679}\nservice:\n  extensions: [health_check, zpages]\n  telemetry:\n    metrics: {level: detailed}\n  pipelines:\n    traces:\n      receivers: [otlp]\n      processors: [memory_limiter, resource, attributes/redact, batch]\n      exporters: [otlp/tempo, spanmetrics]\n    metrics:\n      receivers: [otlp, prometheus, spanmetrics]\n      processors: [memory_limiter, resource, batch]\n      exporters: [otlphttp/mimir]\n    logs:\n      receivers: [otlp]\n      processors: [memory_limiter, resource, attributes/redact, batch]\n      exporters: [otlphttp/loki]\nEach signal has its own pipeline; components are reused by name. health_check gives Kubernetes a readiness probe; zpages shows live pipeline stats for debugging; the Collector's own metrics (otelcol_exporter_send_failed_*, otelcol_processor_dropped_*) are what you alert on."
            ),
          ],
        },
      ],
    },
    {
      slug: "collector-deployment-scaling",
      objective: "Choose a deployment pattern: agent (sidecar or DaemonSet) and gateway, the Collector distributions (core, contrib, custom builds with the builder) and the Operator",
      kind: "case",
      title: "Rescue an overloaded single Collector",
      brief:
        "The fictional ride-sharing startup Kestrel Rides runs one Collector Deployment (1 replica, contrib image) that every Pod in a 60-node cluster sends to. During the evening peak traces go missing and the Collector restarts.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ kubectl -n observability get pods -l app=otel-collector\nNAME                              READY   STATUS    RESTARTS       AGE\notel-collector-6d9f8c7b5-q2xkl    1/1     Running   9 (4m ago)     2d\n\n$ kubectl -n observability describe pod otel-collector-6d9f8c7b5-q2xkl | grep -A2 'Last State'\n    Last State:     Terminated\n      Reason:       OOMKilled\n      Exit Code:    137\n\n$ kubectl -n observability get pod otel-collector-6d9f8c7b5-q2xkl -o jsonpath='{.spec.containers[0].resources}'\n{\"limits\":{\"memory\":\"1Gi\"},\"requests\":{\"cpu\":\"500m\",\"memory\":\"1Gi\"}}\n\nCollector config (abridged):\n  processors: [batch]\n  exporters: [otlp/tempo]\n  pipelines: traces: {receivers: [otlp], processors: [batch], exporters: [otlp/tempo]}\n\n$ curl -s otel-collector:8888/metrics | grep -E 'otelcol_exporter_send_failed_spans|otelcol_receiver_refused_spans|otelcol_exporter_queue_size' | tail -3\notelcol_exporter_send_failed_spans{exporter=\"otlp/tempo\"} 1842211\notelcol_receiver_refused_spans{receiver=\"otlp\"} 0\notelcol_exporter_queue_size{exporter=\"otlp/tempo\"} 0",
          ask: "Explain the failure from the evidence and give the configuration changes that stop the crashes before any re-architecture.",
          parts: [
            part(
              "Diagnosis",
              "The Collector has no memory_limiter, so under peak load it buffers until the 1Gi limit and is OOMKilled (exit 137); the exporter has failed to send 1.8 million spans (Tempo slow or unreachable at peak) and with no sending_queue configured (queue_size 0) nothing absorbs the backlog; receiver_refused_spans is 0, confirming nothing was pushing back on clients -- the Collector accepted everything and died.",
              "Three facts line up: OOMKilled at the 1Gi limit means memory grew unbounded; otelcol_exporter_send_failed_spans in the millions means Tempo could not keep up at peak; otelcol_receiver_refused_spans = 0 means the Collector never told clients to slow down. Without a memory_limiter, backlog from a slow exporter accumulates in memory until the kernel kills the process, losing everything buffered. One replica for a 60-node cluster also means no headroom and a single point of failure."
            ),
            part(
              "Immediate configuration fixes",
              "Add memory_limiter as the first processor (limit_mib ~80% of the container limit, spike_limit_mib ~20%), enable sending_queue and retry_on_failure on the exporter, raise the memory limit modestly and give GOMEMLIMIT, and set the batch processor's size; explains memory_limiter refuses data (receivers return retryable errors so SDKs back off and retry) instead of dying.",
              "processors:\n  memory_limiter: {check_interval: 1s, limit_mib: 1600, spike_limit_mib: 400}\n  batch: {send_batch_size: 8192, timeout: 5s}\nexporters:\n  otlp/tempo:\n    endpoint: tempo:4317\n    sending_queue: {enabled: true, num_consumers: 10, queue_size: 10000}\n    retry_on_failure: {enabled: true, initial_interval: 5s, max_elapsed_time: 300s}\npipelines: traces: {processors: [memory_limiter, batch]}\nResources: limits.memory 2Gi with env GOMEMLIMIT=1800MiB. When memory nears the limit, memory_limiter makes the receivers return a retryable error; SDK batch processors retry with backoff, so data is delayed rather than lost, and the process stays alive. The queue absorbs Tempo's slow moments; retries cover brief outages."
            ),
          ],
        },
        {
          text: "The Collector stops crashing but the platform team wants a design that scales with the cluster, keeps per-node telemetry (kubelet and host metrics) and allows tail-based sampling of error traces. They ask which Collector image to run and whether to use the Operator.",
          ask: "Propose the deployment topology, the distribution/image choice and how tail sampling fits, with the trade-offs.",
          parts: [
            part(
              "Topology: agents plus gateway",
              "A DaemonSet agent Collector on every node (receives OTLP from local Pods, collects kubelet/host metrics with kubeletstats/hostmetrics receivers, adds k8s metadata with k8sattributes, batches, forwards to the gateway) and a horizontally scaled gateway Deployment behind a Service (multiple replicas, HPA) that does the heavy processing and exports to backends; explains agents keep network local and add node context, gateways centralise policy and credentials.",
              "Agent tier: a DaemonSet Collector per node. Pods send OTLP to the node-local agent (via the node IP from the Downward API), which also runs the kubeletstats and hostmetrics receivers for node telemetry, k8sattributes to stamp pod/namespace/deployment on everything, memory_limiter and batch, then exports to the gateway Service. Gateway tier: a Deployment with 3+ replicas and an HPA behind a ClusterIP Service, holding backend credentials, redaction, spanmetrics and the exporters. Agents scale with nodes automatically; the gateway scales with load; the single point of failure is gone."
            ),
            part(
              "Tail sampling and the load-balancing exporter",
              "Tail sampling needs every span of a trace on the same Collector instance; with several gateway replicas, place a loadbalancing exporter tier (routing by trace id) in front of the tail_sampling gateways, or run tail_sampling on a dedicated StatefulSet the loadbalancing exporter resolves via DNS; explains the policy (keep all error traces, 10% of the rest) and the memory/latency cost of holding traces for decision_wait.",
              "tail_sampling decides after seeing a whole trace, so all spans of a trace must reach the same instance. Two-layer design: the agents (or a first gateway layer) use the loadbalancing exporter with routing_key: traceID and a DNS resolver pointing at a headless Service of the sampling Collectors; each sampling Collector runs tail_sampling with policies -- status_code ERROR: keep; latency > 2s: keep; probabilistic: 10% of the rest -- then exports to Tempo. Cost: every sampling Collector holds traces in memory for decision_wait (e.g. 10s), so size memory accordingly, and the extra hop adds latency to trace availability. Run spanmetrics before sampling so metrics stay complete."
            ),
            part(
              "Distribution and Operator",
              "Use the contrib distribution where k8sattributes, kubeletstats, tail_sampling and loadbalancing live (core lacks them), or build a slim custom image with the OpenTelemetry Collector Builder (ocb) containing only the needed components for a smaller attack surface; the Operator manages Collector CRs (DaemonSet/Deployment/StatefulSet modes, config as a CR), auto-instrumentation injection and target allocation for the prometheus receiver.",
              "Image: the contrib distribution has everything needed (k8sattributes, kubeletstats, hostmetrics, tail_sampling, loadbalancing exporter); core does not. For production, build a custom distribution with ocb that includes only those components -- smaller image, fewer CVEs, faster start. Deploy with the OpenTelemetry Operator: an OpenTelemetryCollector CR per tier (mode: daemonset for agents, deployment for gateways, statefulset for the tail-sampling tier so the headless Service and stable names exist), config in the CR, plus the Instrumentation CR for auto-injecting language agents into Pods and the Target Allocator for sharding Prometheus scrape targets across replicas. Trade-off: one more operator to run, in exchange for upgrades, config reloads and scaling handled declaratively."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 10%
    {
      slug: "debug-missing-metrics",
      objective: "Debugging pipelines: the debug exporter, Collector internal telemetry (zpages, metrics), logging levels and checking each stage",
      kind: "case",
      title: "Find where a service's metrics disappear",
      brief:
        "At the fictional fintech Bellhaven, the risk-engine service's metrics stopped appearing in Grafana after a Collector upgrade, while its traces still arrive. The service and the Collector both report healthy.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ kubectl -n risk logs deploy/risk-engine | grep -i otel | tail -2\n[otel] metrics exporter: OTLP/http endpoint http://otel-agent:4318/v1/metrics\n[otel] export succeeded (24 metrics)\n\n$ kubectl -n observability exec ds/otel-agent -- wget -qO- localhost:8888/metrics | grep -E 'receiver_accepted_metric_points|exporter_sent_metric_points|processor_dropped_metric_points' | grep -v '^#'\notelcol_receiver_accepted_metric_points{receiver=\"otlp\",transport=\"http\"} 918220\notelcol_exporter_sent_metric_points{exporter=\"otlp/gateway\"} 918220\n\n$ kubectl -n observability exec deploy/otel-gateway -- wget -qO- localhost:8888/metrics | grep -E 'metric_points' | grep -v '^#'\notelcol_receiver_accepted_metric_points{receiver=\"otlp\",transport=\"grpc\"} 918220\notelcol_processor_filter_datapoints_filtered{filter=\"filter/drop_noise\"} 611904\notelcol_exporter_sent_metric_points{exporter=\"otlphttp/mimir\"} 306316\n\nGateway config excerpt (changed in the upgrade):\n  processors:\n    filter/drop_noise:\n      metrics:\n        metric:\n          - 'IsMatch(name, \"^risk_.*\")'\n          - 'IsMatch(name, \"^go_.*\")'",
          ask: "Walk the pipeline stage by stage, say where the metrics are lost and why, and fix it; then say how you would have found it faster.",
          parts: [
            part(
              "Stage by stage",
              "The SDK exports successfully; the agent accepts 918,220 points and sends all of them to the gateway; the gateway accepts 918,220, the filter processor drops 611,904, and only 306,316 reach Mimir -- so the loss is in the gateway's filter processor, not in the service, agent or exporter.",
              "Follow the counts. Service: export succeeded. Agent: accepted 918,220 metric points and sent 918,220 to the gateway -- nothing lost. Gateway: accepted 918,220, filter/drop_noise filtered 611,904, exporter sent 306,316 to Mimir. Accepted minus filtered equals sent, so the exporter is fine; two thirds of all points are deliberately dropped by the filter, and the missing risk-engine metrics are among them."
            ),
            part(
              "The bug and the fix",
              "The filter processor's metric conditions use OTTL where a matching condition DROPS the metric; someone added '^risk_.*' meaning to keep risk metrics but the processor filters matches out, and the regex also catches every service's risk_* series; fix by removing that condition (keep only the go_* noise drop) or using include/exclude semantics correctly, and validating with the debug exporter before and after the filter.",
              "In the filter processor, metrics.metric conditions describe what to DROP: anything matching is filtered out. The upgrade added IsMatch(name, \"^risk_.*\") -- apparently intended as 'keep risk metrics' -- and so every risk_* metric from the risk engine is discarded alongside the Go runtime noise. Fix: remove the ^risk_.* condition (keep IsMatch(name, \"^go_.*\") if dropping runtime metrics is wanted). Then add a debug exporter to the metrics pipeline temporarily (exporters: [debug, otlphttp/mimir], debug: {verbosity: basic}) and confirm risk_* points appear in the gateway log, or use processor ordering with a second debug exporter to compare before/after."
            ),
            part(
              "Finding it faster",
              "The Collector's own metrics make this a two-minute check: compare otelcol_receiver_accepted_* with otelcol_exporter_sent_* at each hop and look for otelcol_processor_*_dropped/filtered; alert on the difference; use zpages (/debug/pipelinez, /debug/tracez) to see pipeline wiring live; raise service.telemetry.logs.level to debug for exporter errors; and the debug exporter to see actual data at a stage.",
              "Instrument the pipeline with its own telemetry: at every Collector, graph receiver_accepted minus exporter_sent per signal and alert when the gap exceeds the expected filtering; the 611,904 filtered points would have paged on upgrade day. zpages (/debug/pipelinez) shows which processors sit in which pipeline -- the new filter would have been visible immediately; /debug/tracez shows recent spans through the Collector. For 'what does the data look like here', the debug exporter at a chosen point is the tool; for exporter failures, service.telemetry.logs.level: debug. Changes to Collector config belong in review with a dry run (otelcol validate --config) and a canary Collector."
            ),
          ],
        },
        {
          text: "Fixed. The team asks for a permanent safety net: 'We want to know within five minutes if any service's metrics or traces stop arriving, without hand-writing a check per service.'",
          ask: "Design the detection using Collector telemetry and backend queries, and name the failure modes each part catches.",
          parts: [
            part(
              "Collector-level alerts",
              "Alerts on the Collector's own metrics: exporter send failures and queue size (backend down), receiver refused counts (memory_limiter engaged), processor dropped/filtered deltas (misconfiguration), and up/health_check for the Collector itself; explains each catches a class of failure before anyone looks at a dashboard.",
              "From each Collector's :8888 metrics: rate(otelcol_exporter_send_failed_metric_points[5m]) > 0 and otelcol_exporter_queue_size near queue capacity -> backend unreachable or slow; rate(otelcol_receiver_refused_spans[5m]) > 0 -> memory_limiter engaged, Collector undersized; a jump in otelcol_processor_filter_*_filtered or any *_dropped -> a config change is discarding data; absent(up{job=\"otel-gateway\"}) or health_check failing -> the Collector is down. Each is one alert for every service at once."
            ),
            part(
              "Per-service liveness without per-service rules",
              "A single query over a metric every service emits (e.g. the SDK's target_info / otel_scope_info or spanmetrics' traces_span_metrics_calls_total) grouped by service.name, comparing recent presence to a longer window -- series present over 1h but absent in the last 5m -- so a service that goes silent is detected generically; plus a synthetic 'heartbeat' span from each Collector tier to prove the end-to-end path.",
              "Use a metric every instrumented service produces -- target_info (the OTLP resource metric) or spanmetrics' traces_span_metrics_calls_total -- and alert on silence generically: count by (service_name) (count_over_time(target_info[1h])) unless count by (service_name) (count_over_time(target_info[5m])) lists services seen in the past hour but not in the last five minutes; one rule covers every service, present and future. Add a heartbeat: a tiny telemetrygen CronJob sends a known span and metric through the agent tier every minute, and an alert fires if the heartbeat is missing from the backend -- the only check that proves the whole path end to end."
            ),
          ],
        },
      ],
    },
    {
      slug: "schema-and-error-handling",
      objective: "Error handling: exporter failures, retries and queue behaviour, backpressure, and what is dropped when",
      kind: "build",
      title: "Decide what happens to telemetry when the backend is down",
      brief:
        "The fictional energy retailer Dunmore Power must keep audit-relevant logs for a regulator and wants no gaps during a backend outage of up to 30 minutes, while traces may be thinned under pressure and metrics must stay accurate. Their Collector gateway runs 4 replicas with 2Gi memory each; the backends (Loki, Tempo, Mimir) all had a 20-minute outage last week and logs were lost.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Configure exporter queues, retries and backpressure per signal, add persistence where needed, and explain for each signal exactly what is dropped and when.",
          parts: [
            part(
              "Logs: persistent queue, long retry",
              "A sending_queue with storage set to a file_storage extension (persistent queue on a PersistentVolume) sized for 30 minutes of log volume, retry_on_failure with max_elapsed_time at least 30m (or 0 for unlimited within queue bounds), and memory_limiter so backpressure reaches clients rather than losing data; explains in-memory queues die with the Pod and are bounded by RAM.",
              "extensions:\n  file_storage/logs:\n    directory: /var/lib/otelcol/queue\n    timeout: 10s\nexporters:\n  otlphttp/loki:\n    sending_queue:\n      enabled: true\n      storage: file_storage/logs\n      queue_size: 200000\n    retry_on_failure:\n      enabled: true\n      initial_interval: 5s\n      max_interval: 60s\n      max_elapsed_time: 0   # retry until the queue itself is full\nWith the gateway as a StatefulSet and a PVC per replica, a 20-minute Loki outage leaves the batches on disk and they drain afterwards; a Pod restart no longer loses them. Data is dropped only when the persistent queue is full -- size it from measured log volume (e.g. 30 min x peak batches) -- at which point the exporter rejects new batches, memory_limiter and the queue-full error propagate back to the agents and SDKs, which retry. Capacity planning, not configuration, is now the limit."
            ),
            part(
              "Traces: bounded memory queue, thin under pressure",
              "An in-memory sending_queue of moderate size and retry with a finite max_elapsed_time (e.g. 5m), accepting that traces beyond that are dropped; optionally a probabilistic sampler that increases drop rate under pressure; explains traces are the most voluminous and least audit-critical, so bounded loss is the design choice.",
              "exporters:\n  otlp/tempo:\n    sending_queue: {enabled: true, queue_size: 20000}\n    retry_on_failure: {enabled: true, max_elapsed_time: 300s}\nTraces are high-volume and not an audit record: an in-memory queue holds a few minutes, retries continue for 5 minutes, and anything older is dropped with otelcol_exporter_send_failed_spans counting it. If the queue fills, the exporter returns errors, memory_limiter keeps the process alive and SDKs retry or drop per their own batch processor limits (the SDK BatchSpanProcessor drops when its own queue, default 2048 spans, is full). Deliberate, bounded, observable loss."
            ),
            part(
              "Metrics: correctness over completeness",
              "A sending_queue with retry sized for the outage, using cumulative temporality so a dropped export is self-healing (the next cumulative value is still correct), or delta temporality only if the backend handles gaps; explains that dropping delta points loses counts permanently while dropping cumulative points loses only resolution.",
              "exporters:\n  otlphttp/mimir:\n    sending_queue: {enabled: true, queue_size: 50000}\n    retry_on_failure: {enabled: true, max_elapsed_time: 1800s}\nKeep SDKs on cumulative temporality (the default) for counters and histograms: if a point is dropped, the next point still carries the true total since start, so rates computed afterwards are right and only a brief gap appears. With delta temporality each dropped point is a permanently lost increment, so totals drift. A 30-minute retry window covers the stated outage; the queue needs to hold 30 minutes of export batches (one per service every 30-60 s)."
            ),
            part(
              "Backpressure chain",
              "Explains the chain: exporter failure -> queue fills -> exporter returns error -> pipeline returns error to receiver -> receiver returns retryable (gRPC UNAVAILABLE / HTTP 503 with Retry-After) to the client -> SDK/agent retries with backoff; memory_limiter triggers the same refusal on memory pressure; and permanent errors (4xx, invalid data) are not retried but dropped and logged.",
              "Backpressure flows upstream only when each stage can say no. Backend down -> exporter retries, queue fills -> exporter returns an error for new batches -> the receiver answers the agent with a retryable status (gRPC UNAVAILABLE or RESOURCE_EXHAUSTED, HTTP 503/429 with Retry-After) -> the agent's exporter queues and retries -> and ultimately the SDK's batch processor buffers and then drops when its own bounds are hit. memory_limiter produces the same retryable refusal when memory crosses its soft limit. Permanent errors -- malformed payloads, 400/404, authentication failures -- are never retried: they are dropped immediately and counted in otelcol_exporter_send_failed_*, which is why those metrics are alerted on."
            ),
          ],
        },
      ],
    },
  ],
};
