import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-164: Istio Certified Associate (ICA).
//
// Aligned to the four ICA domains (Installation, Upgrades, and Configuration
// 20%, Traffic Management 35%, Securing Workloads 25%, Troubleshooting 20%),
// read on 2026-11-08 from github.com/cncf/curriculum (ICA_Curriculum.pdf)
// and training.linuxfoundation.org (performance-based and multiple-choice,
// 2 hours, pass mark 68% per the LF ICA FAQ). Density (docs/labs.md,
// hybrid): 2 / 3 / 3 / 2.
//
// Hands-on labs: istioctl commands and networking.istio.io/v1 and
// security.istio.io/v1 manifests against authored istioctl and Envoy output.
// Every lab is needs_expert_review.

export const ICA_LABS: SeedLabSet = {
  trackCode: "ICA",
  sources: [
    source("https://github.com/cncf/curriculum/blob/0a8cc08a502710a894e5724c2bec7b88404e5a6b/ICA_Curriculum.pdf", "exam_outline", "2026-11-08"),
    source("https://training.linuxfoundation.org/certification/istio-certified-associate-ica/", "exam_outline", "2026-11-08"),
    source("https://docs.linuxfoundation.org/tc-docs/certification/frequently-asked-questions-ica", "exam_outline", "2026-11-08"),
    source("https://istio.io/latest/docs/reference/config/networking/", "reference", "2026-11-08"),
    source("https://istio.io/latest/docs/reference/config/security/", "reference", "2026-11-08"),
  ],
  labs: [
    // ----------------------------------------------------------------- 20%
    {
      slug: "install-sidecar-vs-ambient",
      objective: "Install and configure Istio with istioctl or Helm: profiles, IstioOperator overlays, Helm charts (base, istiod, gateway) and verifying the installation",
      kind: "build",
      title: "Install Istio for a cluster with one legacy namespace and one new one",
      brief:
        "The fictional ticketing company Brindle Live wants Istio on a cluster with two application namespaces: legacy, where the team is comfortable with sidecars and needs L7 features now, and shop, a new namespace whose team wants no sidecars and only L4 mTLS to begin with. They want an ingress gateway, want to be able to verify the installation, and want the configuration reproducible from Git.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the installation commands (istioctl and the Helm equivalent), the per-namespace enrollment, and the checks that prove the install is healthy, explaining each choice.",
          parts: [
            part(
              "Profile and mode",
              "Install with the ambient profile so both data plane modes are available: istioctl install --set profile=ambient (installs istiod, ztunnel DaemonSet and the CNI node agent) -- sidecar injection still works for namespaces labeled for it; explains the default profile would give sidecar-only, and that ambient adds ztunnel for L4 and optional waypoints for L7.",
              "istioctl install --set profile=ambient -y\nThe ambient profile installs istiod, the istio-cni node agent and the ztunnel DaemonSet, and keeps sidecar injection available, so one control plane can serve both namespaces. default would give sidecar mode only. Helm equivalent:\nhelm install istio-base istio/base -n istio-system --create-namespace\nhelm install istiod istio/istiod -n istio-system --set profile=ambient\nhelm install istio-cni istio/cni -n istio-system --set profile=ambient\nhelm install ztunnel istio/ztunnel -n istio-system\nHelm values files in Git are the reproducible record; istioctl can also take an IstioOperator YAML (-f) for the same purpose."
            ),
            part(
              "Ingress gateway",
              "istioctl's profile includes an istio-ingressgateway, or with Helm install istio/gateway into its own namespace (istio-ingress) as a Deployment with a LoadBalancer Service; explains the gateway is an Envoy that Gateway/VirtualService (or Kubernetes Gateway API) resources configure.",
              "helm install istio-ingress istio/gateway -n istio-ingress --create-namespace\n(or rely on the ingress gateway the istioctl profile deploys). The gateway is an Envoy Deployment with a LoadBalancer Service; it has no routes until Gateway + VirtualService (Istio API) or Gateway + HTTPRoute (Kubernetes Gateway API, which Istio implements) objects target it. Keeping it in its own namespace separates its lifecycle from istiod's."
            ),
            part(
              "Enrolling the namespaces",
              "legacy: kubectl label ns legacy istio-injection=enabled (then restart workloads so sidecars are injected); shop: kubectl label ns shop istio.io/dataplane-mode=ambient (ztunnel captures traffic with no Pod restart needed); explains a namespace must not carry both labels, and that a waypoint can be added to shop later for L7.",
              "kubectl label namespace legacy istio-injection=enabled\nkubectl -n legacy rollout restart deployment   # Pods need recreating for the sidecar to be injected\nkubectl label namespace shop istio.io/dataplane-mode=ambient   # effective immediately, no restarts\nA namespace is one or the other; never set both labels. shop now has mTLS and L4 policy via ztunnel; when the team wants L7 (HTTP routing, retries, L7 authorization), istioctl waypoint apply -n shop --enroll-namespace adds a waypoint proxy for the namespace."
            ),
            part(
              "Verification",
              "istioctl verify-install (against the IstioOperator used), istioctl version, kubectl -n istio-system get pods, istioctl proxy-status showing SYNCED for every proxy, kubectl get pods -n legacy showing 2/2 containers, istioctl ztunnel-config workload -n shop showing workloads captured in ambient, and istioctl analyze with no errors.",
              "istioctl verify-install                       # checks every expected resource exists\nistioctl version                              # control plane and data plane versions match\nkubectl -n istio-system get pods              # istiod, istio-cni-node, ztunnel Running\nistioctl proxy-status                         # every sidecar and gateway: SYNCED for CDS/LDS/EDS/RDS\nkubectl -n legacy get pods                    # READY 2/2 -- istio-proxy injected\nistioctl ztunnel-config workload -n shop      # shop Pods listed with PROTOCOL HBONE (captured by ztunnel)\nistioctl analyze -A                           # no validation errors\nA fresh install should pass every one of these before any VirtualService is written."
            ),
          ],
        },
      ],
    },
    {
      slug: "canary-upgrade-revisions",
      objective: "Plan and perform an Istio upgrade, canary (revision-based) or in-place, and move workloads between revisions safely",
      kind: "case",
      title: "Upgrade istiod with a canary revision and move namespaces over",
      brief:
        "The fictional pharmacy chain Ashcombe Health runs Istio in sidecar mode across eight namespaces. The platform team must upgrade to the next minor version with no downtime and the ability to roll a namespace back if its sidecars misbehave.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ istioctl version --short\nclient version: 1.26.1\ncontrol plane version: 1.25.3\ndata plane version: 1.25.3 (41 proxies)\n\n$ kubectl get ns -L istio-injection -L istio.io/rev | grep -E 'enabled|rev'\npharmacy    Active   400d   enabled\nbilling     Active   380d   enabled\n... (6 more with istio-injection=enabled)\n\n$ kubectl -n istio-system get deploy\nNAME                   READY   UP-TO-DATE   AVAILABLE   AGE\nistiod                 1/1     1            1           400d\nistio-ingressgateway   2/2     2            2           400d",
          ask: "Explain why an in-place upgrade is riskier here, then write the canary (revision) upgrade steps for the control plane and for moving one namespace.",
          parts: [
            part(
              "In-place versus canary",
              "In-place (istioctl upgrade / helm upgrade of istiod) replaces the single istiod; every sidecar reconnects to the new version at once and the only rollback is another full control plane change; canary installs a second istiod with a revision label, lets namespaces opt in one at a time via istio.io/rev, and keeps the old control plane for instant rollback.",
              "In-place upgrades swap the one istiod under all 41 proxies simultaneously; if the new version has a problem, every namespace feels it and rolling back means downgrading the control plane again while proxies churn. A canary (revision-based) upgrade installs istiod 1.26 alongside 1.25 under a revision name; namespaces move to it by relabeling and restarting, so the blast radius is one namespace and rollback is a label change. The prerequisite is that the current install be addressable: the existing istiod here is the un-revisioned 'default', which is fine as the old side."
            ),
            part(
              "Install the canary control plane",
              "istioctl install --set revision=1-26-1 (same profile and values as the current install, from Git), which creates istiod-1-26-1 and a matching mutating webhook; verify both control planes with istioctl proxy-status and kubectl get mutatingwebhookconfigurations; gateways are upgraded separately or last.",
              "istioctl install --set revision=1-26-1 -f istio-values.yaml -y   # same profile/mesh config as the running install\nkubectl -n istio-system get deploy            # istiod (1.25.3) and istiod-1-26-1 (1.26.1) both Running\nkubectl get mutatingwebhookconfigurations     # istio-sidecar-injector and istio-sidecar-injector-1-26-1\nistioctl x precheck                            # pre-upgrade checks against the cluster\nBoth control planes now run; no proxy has moved yet. The gateway can stay on the old istiod until the namespaces are done, then be upgraded (it is a Deployment that is re-injected or re-deployed with the revision)."
            ),
            part(
              "Move one namespace",
              "kubectl label ns pharmacy istio-injection- istio.io/rev=1-26-1 (remove the old label, add the revision label), then kubectl -n pharmacy rollout restart deployment so Pods are re-injected by the 1.26 webhook; verify with istioctl proxy-status showing pharmacy's proxies on istiod-1-26-1 and the sidecar image version; rollback is the inverse relabel plus restart.",
              "kubectl label namespace pharmacy istio-injection- istio.io/rev=1-26-1 --overwrite\nkubectl -n pharmacy rollout restart deployment\nkubectl -n pharmacy get pods -o jsonpath='{range .items[*]}{.metadata.name} {.spec.containers[?(@.name==\"istio-proxy\")].image}{\"\\n\"}{end}'   # proxyv2:1.26.1\nistioctl proxy-status | grep pharmacy         # ISTIOD column shows istiod-1-26-1-...\nThe rollout restart is what re-injects: existing Pods keep their 1.25 sidecar until recreated. If pharmacy misbehaves: kubectl label ns pharmacy istio.io/rev=default --overwrite (or back to istio-injection=enabled) and rollout restart again -- the old istiod is still there."
            ),
          ],
        },
        {
          text: "Seven namespaces are on 1-26-1 and healthy. billing is the last; its team wants to stay on 1.25 'for a few more weeks'. The platform team wants to finish: upgrade the gateway and remove the old control plane without breaking billing.",
          ask: "Decide how to handle billing, then finish the upgrade and clean up.",
          parts: [
            part(
              "billing and version skew",
              "Istio supports a data plane one minor behind the control plane, so billing's 1.25 sidecars can be served by istiod 1.26 -- the old istiod can go once billing is pointed at the new revision even if its Pods are not restarted yet; set a deadline because two minors of skew are unsupported.",
              "billing does not need the old istiod to keep its old sidecars: Istio supports proxies one minor version older than the control plane. Relabel billing to istio.io/rev=1-26-1 now without restarting its Pods -- the 1.25 sidecars reconnect to istiod-1-26-1 and keep working -- and agree a date for the rollout restart that brings them to 1.26. Skew of two minors is unsupported, so this cannot wait past the next upgrade."
            ),
            part(
              "Gateway and clean-up",
              "Upgrade the ingress gateway to the new revision (re-install the gateway with --set revision=1-26-1 or helm upgrade istio-ingress with the matching version and revision injection template), confirm traffic, then istioctl uninstall --revision default (the old un-revisioned control plane) and remove its webhook; finally verify istioctl proxy-status shows every proxy on 1-26-1 and run istioctl analyze.",
              "Gateway: kubectl -n istio-ingress label ns istio-ingress istio.io/rev=1-26-1 --overwrite (if it is injected) and kubectl -n istio-ingress rollout restart deploy/istio-ingress, or helm upgrade istio-ingress istio/gateway --version 1.26.1 -n istio-ingress; watch kubectl -n istio-ingress get pods and run a request through it. Then remove the old control plane:\nistioctl uninstall --revision default -y     # removes istiod 1.25 and its webhook\nistioctl proxy-status                         # every proxy now served by istiod-1-26-1\nistioctl analyze -A\nOptionally make 1-26-1 the default tag (istioctl tag set default --revision 1-26-1) so namespaces labeled istio-injection=enabled map to it, which simplifies the next canary."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 35%
    {
      slug: "gateway-virtualservice-ingress",
      objective: "Configure ingress and egress traffic: Istio Gateway and VirtualService for inbound traffic, egress gateways and ServiceEntry for outbound",
      kind: "build",
      title: "Route external traffic in through the gateway and out through an egress gateway",
      brief:
        "The fictional insurer Fairholme has Istio installed with an ingress gateway (istio-ingressgateway in istio-system) and an egress gateway. The booking app in namespace quotes has Services web (port 80) and api (port 8080). Requirements: https://quotes.fairholme.example serves web, with /api/* going to api; TLS terminates at the ingress gateway from Secret quotes-cert in istio-system; and all calls from the mesh to the external rating service rates.partner.example on 443 must leave through the egress gateway so the firewall can allow a single source.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the Gateway, VirtualService, ServiceEntry and egress routing resources and explain how a request flows through each.",
          parts: [
            part(
              "Ingress Gateway resource",
              "A networking.istio.io/v1 Gateway in quotes (or istio-system) with selector istio: ingressgateway, a server on 443 HTTPS with tls mode SIMPLE and credentialName quotes-cert, hosts quotes.fairholme.example, and optionally an 80 server with httpsRedirect; explains the Gateway configures listeners on the gateway Envoy and the Secret must live in the gateway's namespace.",
              "apiVersion: networking.istio.io/v1\nkind: Gateway\nmetadata: {name: quotes-gw, namespace: quotes}\nspec:\n  selector: {istio: ingressgateway}\n  servers:\n  - port: {number: 443, name: https, protocol: HTTPS}\n    hosts: [quotes.fairholme.example]\n    tls:\n      mode: SIMPLE\n      credentialName: quotes-cert\n  - port: {number: 80, name: http, protocol: HTTP}\n    hosts: [quotes.fairholme.example]\n    tls: {httpsRedirect: true}\nThe Gateway describes listeners on the Envoy Pods matching the selector: terminate TLS on 443 with the certificate from the Secret quotes-cert (which must be in the gateway Pod's namespace, istio-system, read by istiod's SDS), and redirect 80 to HTTPS. It says nothing about where traffic goes -- that is the VirtualService."
            ),
            part(
              "VirtualService bound to the gateway",
              "A VirtualService with hosts quotes.fairholme.example, gateways [quotes/quotes-gw], and http routes: a match on uri prefix /api routing to api.quotes.svc.cluster.local port 8080, then a default route to web port 80; explains ordering (first match wins) and the gateways field binding it to the gateway rather than mesh-internal traffic.",
              "apiVersion: networking.istio.io/v1\nkind: VirtualService\nmetadata: {name: quotes, namespace: quotes}\nspec:\n  hosts: [quotes.fairholme.example]\n  gateways: [quotes/quotes-gw]\n  http:\n  - match: [{uri: {prefix: /api}}]\n    route:\n    - destination: {host: api.quotes.svc.cluster.local, port: {number: 8080}}\n  - route:\n    - destination: {host: web.quotes.svc.cluster.local, port: {number: 80}}\nRoutes are evaluated top to bottom; the /api prefix must come before the catch-all. gateways: [quotes/quotes-gw] binds these routes to the gateway listener only -- adding mesh to the list would also apply them to in-mesh calls to that host."
            ),
            part(
              "ServiceEntry for the external service",
              "A ServiceEntry for rates.partner.example on port 443 (protocol TLS or HTTPS), resolution DNS, location MESH_EXTERNAL, so the mesh knows the host and sidecars can route it; explains that with the default outbound policy ALLOW_ANY external hosts work without it but are invisible; with REGISTRY_ONLY the entry is required.",
              "apiVersion: networking.istio.io/v1\nkind: ServiceEntry\nmetadata: {name: rates-partner, namespace: istio-system}\nspec:\n  hosts: [rates.partner.example]\n  location: MESH_EXTERNAL\n  resolution: DNS\n  ports:\n  - {number: 443, name: tls, protocol: TLS}\nThe ServiceEntry adds the external host to Istio's service registry, so Envoy builds a cluster for it, telemetry names it, and routing rules can target it. With meshConfig.outboundTrafficPolicy.mode REGISTRY_ONLY (recommended with an egress gateway) any external host without a ServiceEntry is blocked, which is how 'everything must go through the egress gateway' is enforced."
            ),
            part(
              "Routing through the egress gateway",
              "Two hops: a Gateway on the egress gateway (selector istio: egressgateway) with a TLS PASSTHROUGH server for the host on 443, and a VirtualService for rates.partner.example with two tls matches -- from the mesh (gateways: [mesh]) routing to istio-egressgateway.istio-system.svc.cluster.local, and from the egress gateway (gateways: [egress-gw]) routing to the external host; a DestinationRule for the egress gateway target if subsets are used; explains sidecars send the TLS flow (SNI-matched) to the gateway, which forwards it out, so the firewall sees only the gateway's IP.",
              "apiVersion: networking.istio.io/v1\nkind: Gateway\nmetadata: {name: egress-gw, namespace: istio-system}\nspec:\n  selector: {istio: egressgateway}\n  servers:\n  - port: {number: 443, name: tls, protocol: TLS}\n    hosts: [rates.partner.example]\n    tls: {mode: PASSTHROUGH}\n---\napiVersion: networking.istio.io/v1\nkind: VirtualService\nmetadata: {name: rates-via-egress, namespace: istio-system}\nspec:\n  hosts: [rates.partner.example]\n  gateways: [mesh, egress-gw]\n  tls:\n  - match:\n    - {gateways: [mesh], port: 443, sniHosts: [rates.partner.example]}\n    route:\n    - destination: {host: istio-egressgateway.istio-system.svc.cluster.local, port: {number: 443}}\n  - match:\n    - {gateways: [egress-gw], port: 443, sniHosts: [rates.partner.example]}\n    route:\n    - destination: {host: rates.partner.example, port: {number: 443}}\nFlow: an app opens TLS to rates.partner.example; its sidecar matches the SNI and sends the (still encrypted, passthrough) stream to the egress gateway; the gateway's listener matches the same SNI and forwards to the real host. Only the egress gateway's egress IP ever reaches the firewall. istioctl proxy-config listeners on the egress gateway and the sidecar confirm the SNI routes."
            ),
          ],
        },
      ],
    },
    {
      slug: "traffic-shift-subsets",
      objective: "Configure traffic shifting between versions with weighted routes and header-based routing for canaries and dark launches",
      kind: "build",
      title: "Shift traffic to a new version by weight and by header",
      brief:
        "The fictional streaming service Marlow Play runs the catalog service in namespace media with two Deployments, catalog-v1 (labels app=catalog, version=v1) and catalog-v2 (version=v2), both behind Service catalog on port 80. Product wants: internal testers (identified by header x-tester: true) always get v2; everyone else gets 10% v2 and 90% v1; and the split must be changeable without redeploying anything.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the DestinationRule and VirtualService, explain the evaluation order, and show how you move to 50/50 and then 100% v2.",
          parts: [
            part(
              "DestinationRule with subsets",
              "A DestinationRule for host catalog with subsets v1 and v2 selected by the version label; explains subsets are named groups of a Service's endpoints that VirtualServices route to, and that traffic policies (load balancer, connection pool, TLS) can be set per subset or for the whole host.",
              "apiVersion: networking.istio.io/v1\nkind: DestinationRule\nmetadata: {name: catalog, namespace: media}\nspec:\n  host: catalog\n  subsets:\n  - name: v1\n    labels: {version: v1}\n  - name: v2\n    labels: {version: v2}\nA subset partitions the Service's endpoints by Pod labels, so Envoy builds a cluster per subset (catalog|80|v1, catalog|80|v2). Without a DestinationRule, a VirtualService route to subset v2 fails validation (istioctl analyze reports the missing subset)."
            ),
            part(
              "VirtualService: header rule first, then weights",
              "A VirtualService for host catalog with an http route matching headers x-tester exact true to subset v2 (100%), followed by a default route with two destinations weighted 90 (v1) and 10 (v2); explains first-match evaluation and that weights must total 100.",
              "apiVersion: networking.istio.io/v1\nkind: VirtualService\nmetadata: {name: catalog, namespace: media}\nspec:\n  hosts: [catalog]\n  http:\n  - match:\n    - headers:\n        x-tester: {exact: \"true\"}\n    route:\n    - destination: {host: catalog, subset: v2}\n  - route:\n    - destination: {host: catalog, subset: v1}\n      weight: 90\n    - destination: {host: catalog, subset: v2}\n      weight: 10\nRules are tried in order: a request carrying x-tester: true matches the first rule and always lands on v2 -- the dark launch for testers. Everything else falls to the weighted route. Weights are percentages of requests (not connections) and must sum to 100. hosts: [catalog] is short for catalog.media.svc.cluster.local within the namespace."
            ),
            part(
              "Moving the split",
              "Edit the weights (kubectl edit / apply a new VirtualService with 50/50, then 100/0 to v2) -- no Pod changes; the change propagates to sidecars in seconds; verify with repeated curl from a client Pod counting versions, or with istioctl proxy-config routes on a client sidecar showing the weighted clusters.",
              "kubectl -n media patch virtualservice catalog --type=json -p '[{\"op\":\"replace\",\"path\":\"/spec/http/1/route/0/weight\",\"value\":50},{\"op\":\"replace\",\"path\":\"/spec/http/1/route/1/weight\",\"value\":50}]'\nistiod pushes the new routes to every sidecar (istioctl proxy-status shows RDS SYNCED). Check: for i in $(seq 1 100); do kubectl -n media exec deploy/frontend -c frontend -- curl -s catalog/version; done | sort | uniq -c -> roughly 50/50. Final step: weight 100 to v2 (or route only to v2), then scale v1 down once the DestinationRule subset is unused. The Deployments never changed; only the VirtualService did."
            ),
            part(
              "Where the rule applies and a pitfall",
              "The VirtualService without a gateways field applies to mesh-internal calls from sidecars (and ambient waypoints); traffic entering through the ingress gateway needs the route on the gateway too (gateways: [mesh, media/gw]); and a client that calls catalog by IP or bypasses its sidecar is not shifted.",
              "With no gateways field this VirtualService defaults to gateways: [mesh]: it shapes calls that in-mesh clients make to catalog. External users coming through the ingress gateway hit the gateway's own routes, so to shift them too the VirtualService must list the gateway as well (gateways: [mesh, media/catalog-gw]) with a matching hosts entry. Routing happens in the client's sidecar (or waypoint), so a client with no sidecar, or one hitting a Pod IP directly, sees plain Kubernetes round-robin and no 90/10."
            ),
          ],
        },
      ],
    },
    {
      slug: "resilience-and-fault-injection",
      objective: "Use resilience features: circuit breaking and outlier detection, failover and locality load balancing, timeouts and retries",
      kind: "case",
      title: "Stop a slow dependency from taking the checkout down",
      brief:
        "At the fictional retailer Hartwell & Sons, the checkout service calls the inventory service inside the mesh. During a sale, one of inventory's three Pods started answering slowly and checkout's latency and error rate rose across the board. The team wants Istio to contain this next time and to prove it before the next sale.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ kubectl -n shop get pods -l app=inventory -o wide\nNAME                         READY   STATUS    RESTARTS   AGE   NODE\ninventory-6f7d8c9b5-2kq9x    2/2     Running   0          3d    node-1\ninventory-6f7d8c9b5-7lm3p    2/2     Running   0          3d    node-2\ninventory-6f7d8c9b5-9zr1t    2/2     Running   0          3d    node-3\n\n$ kubectl -n shop logs deploy/checkout -c istio-proxy --since=10m | awk '{print $9, $NF}' | sort | uniq -c | sort -rn | head -4\n  2120 200 inventory.shop.svc.cluster.local:8080\n   814 504 inventory.shop.svc.cluster.local:8080\n   402 503 inventory.shop.svc.cluster.local:8080\n\n$ kubectl -n shop logs deploy/checkout -c istio-proxy --since=10m | grep ' 504 ' | awk '{print $8}' | sort | uniq -c\n   814 UT\n\n$ kubectl -n shop get destinationrule,virtualservice\nNo resources found in shop namespace.",
          ask: "Read the Envoy access-log evidence, then write the DestinationRule and VirtualService that would have contained the problem, explaining each setting.",
          parts: [
            part(
              "What the logs say",
              "Envoy response flag UT means upstream request timeout: checkout's sidecar waited for inventory until the (default 15 s) route timeout and returned 504; 503s with no circuit breaking indicate upstream connection problems or overflow; with no DestinationRule, Istio load-balanced round-robin across all three Pods including the slow one, so a third of calls were slow and nothing ejected it.",
              "The 504s carry response flag UT -- upstream timeout: checkout's sidecar sent the request to inventory and gave up after the default 15-second timeout. With round-robin over three Pods and one slow Pod, about a third of calls hit it; each held a connection for 15 s, which is how a single slow instance degraded every checkout. The 503s are the knock-on (connections exhausted or reset). Because no DestinationRule exists, there is no outlier detection to eject the slow Pod and no connection limit to fail fast."
            ),
            part(
              "DestinationRule: outlier detection and connection pool",
              "A DestinationRule for inventory with trafficPolicy.outlierDetection (consecutive5xxErrors and consecutiveGatewayErrors small, interval 10s, baseEjectionTime 30s-1m, maxEjectionPercent 50) and connectionPool limits (tcp.maxConnections, http.http1MaxPendingRequests, http.maxRequestsPerConnection), explaining ejection removes a misbehaving endpoint from the pool temporarily and the pool limits make overflow fail fast with 503 instead of queueing.",
              "apiVersion: networking.istio.io/v1\nkind: DestinationRule\nmetadata: {name: inventory, namespace: shop}\nspec:\n  host: inventory\n  trafficPolicy:\n    connectionPool:\n      tcp: {maxConnections: 100}\n      http:\n        http1MaxPendingRequests: 50\n        maxRequestsPerConnection: 100\n    outlierDetection:\n      consecutive5xxErrors: 5\n      consecutiveGatewayErrors: 3\n      interval: 10s\n      baseEjectionTime: 60s\n      maxEjectionPercent: 50\nOutlier detection is passive health checking per client sidecar: an endpoint that returns 5 consecutive 5xx (or 3 gateway errors, which include timeouts mapped to 504) is ejected for 60 s (longer on repeat), up to half the endpoints at once -- the slow Pod would have been removed within seconds and the other two carried the load. The connection pool caps outstanding work so excess requests fail immediately (503, flag UO) instead of piling up behind the slow instance."
            ),
            part(
              "VirtualService: timeout and retries",
              "A VirtualService for inventory with a route timeout well below 15 s (e.g. 2s) and retries (attempts 2, perTryTimeout 1s, retryOn 5xx,reset,connect-failure,retriable-status-codes) so a slow endpoint costs a second, not fifteen, and a retry likely lands on a healthy Pod; warns about retry budgets and idempotency.",
              "apiVersion: networking.istio.io/v1\nkind: VirtualService\nmetadata: {name: inventory, namespace: shop}\nspec:\n  hosts: [inventory]\n  http:\n  - route:\n    - destination: {host: inventory}\n    timeout: 2s\n    retries:\n      attempts: 2\n      perTryTimeout: 1s\n      retryOn: 5xx,reset,connect-failure,retriable-status-codes\nA 1 s per-try timeout with two retries caps the worst case at about 2 s and gives a request that hit the slow Pod a second chance on another endpoint (Envoy prefers a different host on retry). Retries are safe for inventory's idempotent GETs; for non-idempotent calls limit retryOn to connect-failure/reset. Keep total retries bounded -- retrying everything during an outage multiplies load."
            ),
          ],
        },
        {
          text: "The resources are applied. Before the next sale the team wants to prove the behavior in staging without breaking a real Pod: 'Make one inventory instance slow on purpose and show checkout stays healthy.'",
          ask: "Design the test with Istio fault injection and the checks that show containment.",
          parts: [
            part(
              "Fault injection",
              "A VirtualService rule (in staging) that injects a fixed delay for a percentage of requests to inventory -- fault.delay fixedDelay 5s percentage 33 -- or targeted at a subset v-slow via DestinationRule labels so one instance is slow; explains delays and aborts (httpStatus) are injected by the client sidecar before the request leaves, so no code or Pod is harmed.",
              "apiVersion: networking.istio.io/v1\nkind: VirtualService\nmetadata: {name: inventory, namespace: shop-staging}\nspec:\n  hosts: [inventory]\n  http:\n  - fault:\n      delay:\n        percentage: {value: 33}\n        fixedDelay: 5s\n    route:\n    - destination: {host: inventory}\n    timeout: 2s\n    retries: {attempts: 2, perTryTimeout: 1s, retryOn: 5xx,reset,connect-failure,retriable-status-codes}\nThe client sidecar holds a third of requests for 5 s before forwarding -- longer than perTryTimeout, so those tries time out and are retried. To emulate exactly one slow Pod, label a Pod version=slow, define a subset, and put the fault on a route to that subset. An abort fault (fault.abort.httpStatus: 503, percentage) tests the 5xx path the same way. Nothing touches the inventory Pods themselves."
            ),
            part(
              "Checks",
              "Load-test checkout and watch: checkout's p99 stays near 2 s rather than 15 s, error rate low; Envoy stats or Kiali show retries (upstream_rq_retry) and outlier ejections (outlier_detection.ejections_active) on the checkout sidecar; access logs show URX/UT flags on individual tries but 200s on most final responses; remove the fault and confirm ejection clears.",
              "Run a load generator against checkout for ten minutes. Expect: checkout p99 at or under about 2 s (the timeout) instead of 15 s; final error rate a few percent at most (requests whose retry also failed). On checkout's sidecar: kubectl -n shop-staging exec deploy/checkout -c istio-proxy -- pilot-agent request GET stats | grep -E 'inventory.*(upstream_rq_retry|outlier_detection.ejections_active|upstream_rq_timeout)' shows retries occurring and, if a subset-targeted fault is used, that endpoint ejected. Kiali's graph shows the retry and error edges. Delete the fault VirtualService rule and confirm ejections drop to zero and p99 returns to normal -- that is the before/after evidence for the sale."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 25%
    {
      slug: "mtls-strict-rollout",
      objective:
        "Configure authentication with PeerAuthentication (mTLS modes STRICT, PERMISSIVE, DISABLE at mesh, namespace and workload scope) and RequestAuthentication (JWT issuers and JWKS)",
      kind: "case",
      title: "Move a mesh to STRICT mTLS without breaking the one legacy client",
      brief:
        "The fictional logistics company Penrose Freight runs Istio with the default PERMISSIVE mTLS. Security wants STRICT across the mesh by the end of the quarter. One legacy VM-based client outside the mesh still calls the Service tracking in namespace ops over plain HTTP and cannot be changed for two months.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ kubectl get peerauthentication -A\nNo resources found\n\n$ istioctl x describe pod -n ops tracking-7c9d8b6f5-q2x1k | grep -A2 'Effective PeerAuthentication'\nEffective PeerAuthentication:\n   Mode: PERMISSIVE (default)\n\n$ kubectl -n ops logs deploy/tracking -c istio-proxy --since=1h | awk '{print $4}' | sort | uniq -c | sort -rn | head -3\n   9410 inbound|8080||   (mTLS, source principal spiffe://cluster.local/ns/ops/sa/dispatcher)\n    612 inbound|8080||   (plaintext, source 10.60.4.21)",
          ask: "Explain what PERMISSIVE is doing today, then write the policies that make the whole mesh STRICT while keeping the legacy VM working, and say how you verify nothing else was plaintext.",
          parts: [
            part(
              "PERMISSIVE today",
              "In PERMISSIVE mode a sidecar accepts both mTLS and plaintext on its inbound port; the logs show most traffic to tracking is already mTLS (from dispatcher's SPIFFE identity) and 612 plaintext requests from 10.60.4.21, the VM; so STRICT everywhere would reject the VM's calls while changing nothing for in-mesh callers.",
              "PERMISSIVE means tracking's sidecar answers both: mesh clients negotiate mTLS automatically (the 9,410 requests from spiffe://cluster.local/ns/ops/sa/dispatcher) and non-mesh clients can still connect in clear (the 612 from 10.60.4.21). Flipping to STRICT closes the plaintext path -- the VM would get connection resets -- while every sidecar-to-sidecar call is unaffected because it is already mTLS."
            ),
            part(
              "Mesh-wide STRICT with a workload exception",
              "A PeerAuthentication named default in istio-system with mtls.mode STRICT (mesh-wide), plus a workload-scoped PeerAuthentication in ops with a selector app=tracking that keeps PERMISSIVE only on port 8080 via portLevelMtls, so the exception is as narrow as possible; explains precedence: workload-specific over namespace over mesh.",
              "apiVersion: security.istio.io/v1\nkind: PeerAuthentication\nmetadata: {name: default, namespace: istio-system}\nspec:\n  mtls: {mode: STRICT}\n---\napiVersion: security.istio.io/v1\nkind: PeerAuthentication\nmetadata: {name: tracking-legacy-client, namespace: ops}\nspec:\n  selector:\n    matchLabels: {app: tracking}\n  mtls: {mode: STRICT}\n  portLevelMtls:\n    8080: {mode: PERMISSIVE}\nThe mesh-wide policy (the one in the root namespace named default) makes every workload STRICT. The workload policy overrides it for tracking only, and only on port 8080, which stays PERMISSIVE so the VM's plaintext still works while mesh callers keep using mTLS there. Precedence is workload > namespace > mesh. Put an expiry date in a comment and a ticket: when the VM joins the mesh (or gets a sidecar via WorkloadEntry/VM onboarding), delete this exception."
            ),
            part(
              "Verifying nothing else breaks",
              "Before enforcing, use istioctl x describe and the proxy access logs (or Kiali's security badges / the istio_requests_total metric with connection_security_policy=none) to find any other plaintext inbound traffic across the mesh; after applying, check istioctl x describe shows STRICT, confirm the VM still works, and confirm a plain curl from a non-mesh Pod to another service is refused.",
              "Discovery first: sum by (destination_service, source_workload) (rate(istio_requests_total{connection_security_policy=\"none\", reporter=\"destination\"}[1h])) > 0 in Prometheus lists every plaintext inbound flow in the mesh -- each one is something STRICT will break; Kiali shows the same as missing lock icons. After applying: istioctl x describe pod -n ops tracking-... -> STRICT with port 8080 PERMISSIVE; from the VM, curl tracking still 200; from a non-mesh test Pod, curl another in-mesh service -> connection reset (expected); istioctl proxy-status all SYNCED. Keep the Prometheus query as a standing alert so new plaintext never appears unnoticed."
            ),
          ],
        },
        {
          text: "STRICT is in place. The API team now asks that end users calling the public tracking API through the ingress gateway present a JWT from the company identity provider (issuer https://login.penrose.example, JWKS at https://login.penrose.example/.well-known/jwks.json), and that requests without a valid token are rejected.",
          ask: "Write the RequestAuthentication and the AuthorizationPolicy needed, and explain why both are required.",
          parts: [
            part(
              "RequestAuthentication",
              "A RequestAuthentication in istio-system selecting the ingress gateway (or in ops selecting tracking) with jwtRules issuer and jwksUri; explains it validates any token present and rejects invalid ones, but a request with no token passes through -- it only establishes identity.",
              "apiVersion: security.istio.io/v1\nkind: RequestAuthentication\nmetadata: {name: tracking-jwt, namespace: ops}\nspec:\n  selector:\n    matchLabels: {app: tracking}\n  jwtRules:\n  - issuer: https://login.penrose.example\n    jwksUri: https://login.penrose.example/.well-known/jwks.json\n    forwardOriginalToken: true\nRequestAuthentication tells the sidecar how to validate a JWT: a token from this issuer must verify against the JWKS keys, or the request is rejected with 401. But a request carrying no token at all is still allowed through -- the policy only authenticates what is presented. Applying it at the gateway instead (namespace istio-system, selector istio: ingressgateway) validates at the edge."
            ),
            part(
              "AuthorizationPolicy to require a token",
              "An AuthorizationPolicy on tracking with action ALLOW and a rule from.source.requestPrincipals [\"*\"] (any authenticated JWT principal), optionally scoped to the public paths and to traffic from the gateway; explains that once any ALLOW policy exists, everything not matched is denied, so unauthenticated requests get 403 -- authentication plus authorization together enforce 'token required'.",
              "apiVersion: security.istio.io/v1\nkind: AuthorizationPolicy\nmetadata: {name: tracking-require-jwt, namespace: ops}\nspec:\n  selector:\n    matchLabels: {app: tracking}\n  action: ALLOW\n  rules:\n  - from:\n    - source:\n        requestPrincipals: [\"*\"]\n    to:\n    - operation:\n        paths: [\"/api/*\"]\n  - from:\n    - source:\n        principals: [\"cluster.local/ns/ops/sa/dispatcher\"]\nrequestPrincipals is populated only when a JWT was validated (as issuer/subject), so [\"*\"] means 'any valid token'. Because an ALLOW policy now selects tracking, every request not matching a rule is denied -- a request with no token has no requestPrincipal and gets 403 (an invalid token already got 401 from authentication). The second rule keeps the in-mesh dispatcher working by its mTLS identity, which has no JWT. Note the plaintext VM exception: its calls carry no peer identity, so add a rule for its path or source IP block if it must keep working."
            ),
          ],
        },
      ],
    },
    {
      slug: "authorization-policy-design",
      objective: "Configure authorization with AuthorizationPolicy: ALLOW, DENY and CUSTOM actions, sources, operations and conditions, and policy evaluation order",
      kind: "build",
      title: "Write least-privilege authorization for a three-service namespace",
      brief:
        "The fictional payroll provider Oakmoor runs namespace payroll with services web (ServiceAccount web), calc (ServiceAccount calc, port 9000) and ledger (ServiceAccount ledger, port 7000). mTLS is STRICT. Required: web may call calc on POST /compute only; calc may call ledger on GET and POST /entries; nothing else may reach calc or ledger; any request from the namespace analytics to anything in payroll must be denied even if some other rule would allow it; and the whole namespace should deny by default.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the AuthorizationPolicies and explain the evaluation order that makes them correct.",
          parts: [
            part(
              "Namespace default deny",
              "An AuthorizationPolicy in payroll with an empty spec (no selector, no rules) -- the deny-all pattern -- so every workload in the namespace denies everything unless an ALLOW rule matches; explains that a policy with action ALLOW and no rules matches nothing, which denies all.",
              "apiVersion: security.istio.io/v1\nkind: AuthorizationPolicy\nmetadata: {name: deny-all, namespace: payroll}\nspec: {}\nAn empty spec is an ALLOW policy with no rules applied to every workload in the namespace. ALLOW policies are allowlists: once any applies to a workload, requests not matched by some ALLOW rule are denied. With no rules, nothing matches -- default deny for the whole namespace. Each service then needs explicit allows."
            ),
            part(
              "ALLOW rules for calc and ledger",
              "An ALLOW policy selecting app=calc with a rule from source.principals [\"cluster.local/ns/payroll/sa/web\"] to operation methods [POST] paths [\"/compute\"]; another selecting app=ledger allowing principal calc with methods GET and POST on paths /entries*; explains principals are SPIFFE identities from mTLS certificates, which is why STRICT matters.",
              "apiVersion: security.istio.io/v1\nkind: AuthorizationPolicy\nmetadata: {name: calc-allow, namespace: payroll}\nspec:\n  selector: {matchLabels: {app: calc}}\n  action: ALLOW\n  rules:\n  - from:\n    - source:\n        principals: [\"cluster.local/ns/payroll/sa/web\"]\n    to:\n    - operation:\n        methods: [\"POST\"]\n        paths: [\"/compute\"]\n---\napiVersion: security.istio.io/v1\nkind: AuthorizationPolicy\nmetadata: {name: ledger-allow, namespace: payroll}\nspec:\n  selector: {matchLabels: {app: ledger}}\n  action: ALLOW\n  rules:\n  - from:\n    - source:\n        principals: [\"cluster.local/ns/payroll/sa/calc\"]\n    to:\n    - operation:\n        methods: [\"GET\", \"POST\"]\n        paths: [\"/entries\", \"/entries/*\"]\nsource.principals is the peer identity from the client certificate (trust domain/ns/<namespace>/sa/<serviceaccount>); it is trustworthy only because mTLS is STRICT. Each ServiceAccount is therefore the unit of authorization -- give web, calc and ledger distinct accounts."
            ),
            part(
              "DENY for the analytics namespace",
              "A DENY policy (namespace-wide, no selector) with from source.namespaces [\"analytics\"]; explains DENY policies are evaluated before ALLOW, so a matching DENY wins regardless of any ALLOW -- exactly the 'even if some other rule would allow it' requirement.",
              "apiVersion: security.istio.io/v1\nkind: AuthorizationPolicy\nmetadata: {name: deny-analytics, namespace: payroll}\nspec:\n  action: DENY\n  rules:\n  - from:\n    - source:\n        namespaces: [\"analytics\"]\nEvaluation order: CUSTOM policies first, then DENY, then ALLOW. If a DENY rule matches, the request is rejected immediately; only if no DENY matches are ALLOW policies consulted (and if none exist, the request is allowed; if some exist, one must match). source.namespaces is derived from the peer certificate too. This policy therefore blocks analytics even if someone later adds an ALLOW that would include it."
            ),
            part(
              "Conditions and CUSTOM, and verification",
              "Mentions when conditions (e.g. request.headers[x-env], source.ip, request.auth.claims[groups]) for finer rules and CUSTOM action for external authorization (OPA, an ext_authz service) via a meshConfig extension provider; verifies with istioctl x authz check on a Pod and with test requests: web -> calc POST /compute 200, GET /compute 403 (RBAC: access denied), ledger from web 403, anything from analytics 403.",
              "Finer conditions live in when: e.g. - key: request.auth.claims[groups] values: [\"payroll-admins\"] or key: request.headers[x-env] values: [\"prod\"]. CUSTOM delegates the decision to an external authorizer (OPA, an ext_authz gRPC/HTTP service) registered in meshConfig.extensionProviders and referenced by provider.name -- evaluated before DENY/ALLOW. Verify: istioctl x authz check -n payroll deploy/calc lists the effective policies and their rules; then from web's Pod curl -X POST calc:9000/compute -> 200, curl calc:9000/compute (GET) -> 403 'RBAC: access denied', curl ledger:7000/entries from web -> 403; from a Pod in analytics anything in payroll -> 403; Envoy logs show response flag UAEX for denied requests."
            ),
          ],
        },
      ],
    },
    {
      slug: "gateway-tls-modes",
      objective: "Secure edge traffic with TLS: Gateway servers with SIMPLE, MUTUAL and PASSTHROUGH modes, certificates in Secrets, and SNI routing",
      kind: "build",
      title: "Terminate, require and pass through TLS on one ingress gateway",
      brief:
        "The fictional bank Cresswell Direct exposes three hostnames through a single Istio ingress gateway: www.cresswell.example (public web, TLS terminated at the gateway), partners.cresswell.example (a B2B API where partners must present a client certificate issued by Cresswell's partner CA), and vault.cresswell.example (an internal service that must terminate TLS itself, end to end, because of a hardware-security-module requirement). Certificates are already available as Kubernetes Secrets.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the Gateway servers for the three hosts, the Secrets they need, and the VirtualServices, and explain what the gateway does with each connection.",
          parts: [
            part(
              "SIMPLE: terminate for the public site",
              "A server on 443 with hosts www.cresswell.example, tls.mode SIMPLE, credentialName www-cert (a kubernetes.io/tls Secret in istio-system holding cert and key); the gateway presents the certificate and decrypts; a VirtualService then routes HTTP paths to the web Service; explains SDS delivers the Secret to the gateway without mounting.",
              "  - port: {number: 443, name: https-www, protocol: HTTPS}\n    hosts: [www.cresswell.example]\n    tls:\n      mode: SIMPLE\n      credentialName: www-cert\nSecret www-cert (type kubernetes.io/tls, keys tls.crt and tls.key) must be in the gateway's namespace (istio-system); istiod serves it to the gateway Envoy over SDS, so no volume mount or restart is needed when the certificate rotates. The gateway completes the TLS handshake, decrypts, and applies the VirtualService for www.cresswell.example (HTTP routing to web.public.svc.cluster.local)."
            ),
            part(
              "MUTUAL: require partner client certificates",
              "A server on 443 with hosts partners.cresswell.example, tls.mode MUTUAL, credentialName partners-cert where the Secret is a generic Secret with cert, key and cacert (the partner CA bundle); the gateway requests and verifies a client certificate against cacert and rejects connections without one; routes carry the client identity in XFCC for the backend.",
              "  - port: {number: 443, name: https-partners, protocol: HTTPS}\n    hosts: [partners.cresswell.example]\n    tls:\n      mode: MUTUAL\n      credentialName: partners-cert\nkubectl -n istio-system create secret generic partners-cert --from-file=tls.key=partners.key --from-file=tls.crt=partners.crt --from-file=ca.crt=partner-ca.crt\nFor MUTUAL the Secret adds ca.crt: the gateway presents its own certificate and demands a client certificate signed by that CA, failing the handshake otherwise -- a partner without a Cresswell-issued certificate cannot even reach the application. The verified client certificate's subject is forwarded to the backend in the X-Forwarded-Client-Cert header, and AuthorizationPolicy on the gateway can match on it (e.g. request.headers[x-forwarded-client-cert] or by restricting to the host)."
            ),
            part(
              "PASSTHROUGH: end-to-end TLS by SNI",
              "A server on 443 with hosts vault.cresswell.example, tls.mode PASSTHROUGH and protocol TLS; the gateway does not terminate -- it reads the SNI from the ClientHello and forwards the encrypted stream; the VirtualService uses tls matches with sniHosts routing to the vault Service on its TLS port; explains that no HTTP routing is possible on this host because the gateway cannot see inside.",
              "  - port: {number: 443, name: tls-vault, protocol: TLS}\n    hosts: [vault.cresswell.example]\n    tls:\n      mode: PASSTHROUGH\n---\napiVersion: networking.istio.io/v1\nkind: VirtualService\nmetadata: {name: vault, namespace: secure}\nspec:\n  hosts: [vault.cresswell.example]\n  gateways: [istio-system/edge-gw]\n  tls:\n  - match:\n    - port: 443\n      sniHosts: [vault.cresswell.example]\n    route:\n    - destination: {host: vault.secure.svc.cluster.local, port: {number: 8443}}\nThe gateway inspects only the SNI in the TLS ClientHello and forwards the still-encrypted bytes to vault, which terminates TLS with its HSM-backed key. Because the gateway never decrypts, there is no path-based routing, no header injection and no gateway-side AuthorizationPolicy on HTTP attributes for this host -- only SNI and L4."
            ),
            part(
              "One gateway, three behaviors, and verification",
              "All three servers share port 443 on one Gateway resource and are distinguished by SNI (hosts), which is how Envoy selects the right TLS behavior per connection; verify with openssl s_client -servername for each host (SIMPLE: server cert returned; MUTUAL: handshake fails without a client cert and succeeds with -cert/-key; PASSTHROUGH: the certificate shown is vault's own) and istioctl proxy-config listeners/secret on the gateway Pod.",
              "Envoy multiplexes by SNI: the same 0.0.0.0:443 listener holds three filter chains, each matched on the server name the client sends, so www terminates with one certificate, partners demands a client certificate, and vault is passed through. Verify:\nopenssl s_client -connect <gw-ip>:443 -servername www.cresswell.example </dev/null | grep subject        # gateway's www cert\nopenssl s_client -connect <gw-ip>:443 -servername partners.cresswell.example </dev/null   # handshake failure: certificate required\nopenssl s_client -connect <gw-ip>:443 -servername partners.cresswell.example -cert p.crt -key p.key </dev/null   # succeeds\nopenssl s_client -connect <gw-ip>:443 -servername vault.cresswell.example </dev/null | grep subject       # vault's own certificate, not the gateway's\nistioctl proxy-config secret -n istio-system deploy/istio-ingressgateway   # www-cert and partners-cert (with ROOTCA) ACTIVE\nistioctl proxy-config listeners -n istio-system deploy/istio-ingressgateway --port 443 -o json | grep -A3 server_names"
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 20%
    {
      slug: "analyze-config-conflicts",
      objective: "Troubleshoot configuration with istioctl analyze, istioctl x describe and validation messages, and common conflicts between VirtualServices and DestinationRules",
      kind: "case",
      title: "Find why a VirtualService is silently ignored",
      brief:
        "At the fictional publisher Thornfield Press, a developer applied a VirtualService to send 20% of traffic for the reviews service to v2, but traffic is still 50/50 across the two Deployments and nothing in the cluster reported an error.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ istioctl analyze -n books\nError [IST0101] (VirtualService books/reviews) Referenced host+subset in destinationrule not found: \"reviews+v2\"\nWarning [IST0104] (VirtualService books/reviews) The VirtualService \"books/reviews\" has a host \"reviews\" that conflicts with VirtualService \"books/reviews-legacy\"\nError: Analyzers found issues when analyzing namespace: books.\nSee https://istio.io/v1.26/docs/reference/config/analysis for more information about causes and resolutions.\n\n$ kubectl -n books get virtualservice,destinationrule\nNAME                                               GATEWAYS   HOSTS         AGE\nvirtualservice.networking.istio.io/reviews                    [\"reviews\"]   10m\nvirtualservice.networking.istio.io/reviews-legacy             [\"reviews\"]   200d\n\nNAME                                                 HOST      AGE\ndestinationrule.networking.istio.io/reviews          reviews   200d\n\n$ kubectl -n books get destinationrule reviews -o jsonpath='{.spec.subsets[*].name}'\nv1",
          ask: "Explain both analyzer findings, why the API server accepted the resources, and the fixes.",
          parts: [
            part(
              "IST0101: subset not defined",
              "The new VirtualService routes to subset v2 but the DestinationRule defines only v1, so Envoy has no cluster for reviews|v2 and the route is invalid; the API server accepted the object because validation is per-object (schema), while cross-resource consistency is only checked by istioctl analyze and at config-push time; fix by adding subset v2 (labels version: v2) to the DestinationRule.",
              "IST0101 says the route references reviews subset v2, which the DestinationRule does not define (it has only v1). Each resource is valid on its own, so the admission webhook accepted it; the mismatch only exists between two objects, which is what istioctl analyze (and istiod when it computes the proxy config) sees. Fix: add\n  - name: v2\n    labels: {version: v2}\nto the DestinationRule's subsets. Until then Envoy has no cluster for the v2 destination and the route cannot work."
            ),
            part(
              "IST0104: conflicting VirtualServices",
              "Two VirtualServices in the same namespace declare the same host reviews with no gateway (mesh); Istio merges or picks unpredictably when sidecar-scoped VirtualServices overlap on a host, so the older reviews-legacy may be the one in effect -- explaining the unchanged 50/50; fix by consolidating the rules into one VirtualService per host (or using distinct hosts/gateways) and deleting the stale one.",
              "IST0104: reviews and reviews-legacy both claim host reviews for mesh traffic. Istio does not merge overlapping mesh VirtualServices for the same host in a defined way -- one wins, in practice often the older one -- so reviews-legacy (200 days old, presumably a plain route) is what the sidecars got, and the new weights were never installed. Fix: fold the needed rules into a single VirtualService for the host and delete reviews-legacy. One VirtualService per host per gateway is the rule that avoids this class of problem."
            ),
            part(
              "Confirming the effective config",
              "istioctl x describe pod on a reviews client or server Pod shows the effective VirtualService and DestinationRule applied to it, and istioctl proxy-config routes on a client sidecar shows the actual weighted clusters; re-run istioctl analyze until clean, and enable the istiod validation messages (status field) so future issues are visible in kubectl get vs -o yaml status.",
              "After the fixes: istioctl analyze -n books -> no issues. istioctl x describe pod -n books reviews-v2-... shows the effective VirtualService reviews with the 80/20 weights and DestinationRule subsets v1, v2. On a client: istioctl proxy-config routes -n books deploy/productpage --name 9080 -o json | grep -A6 weighted_clusters shows outbound|9080|v1|reviews... weight 80 and |v2| weight 20. Enabling meshConfig.defaultConfig.statusPort / istiod's --enable-analysis writes analyzer messages into each resource's status.validationMessages, so kubectl get vs reviews -o yaml would have shown IST0101 without anyone running istioctl."
            ),
          ],
        },
        {
          text: "Fixed. A week later, a different team reports that their new namespace 'orders' has sidecars but no Istio behavior at all: VirtualServices and PeerAuthentication are ignored.\n\n$ istioctl proxy-status | grep orders\norders-api-5c9d-x1.orders    Kubernetes   SYNCED   SYNCED   SYNCED   SYNCED   NOT SENT   istiod-7f8b9c6d5-k2lmn   1.26.1\n\n$ kubectl -n orders get pod orders-api-5c9d-x1 -o jsonpath='{.spec.containers[*].name}'\norders-api istio-proxy\n\n$ kubectl -n orders get pod orders-api-5c9d-x1 -o jsonpath='{.metadata.annotations}' | tr ',' '\\n' | grep -i -E 'sidecar|istio' | head -3\n\"sidecar.istio.io/inject\":\"true\"\n\"sidecar.istio.io/status\":\"{\\\"initContainers\\\":[\\\"istio-init\\\"],\\\"containers\\\":[\\\"istio-proxy\\\"]...\"\n\n$ kubectl -n orders get pod orders-api-5c9d-x1 -o jsonpath='{.spec.initContainers[0].args}' | tr ',' '\\n' | grep -E 'x|b' | head -3\n\"-b\"\n\"\"\n\"-x\"\n\"\"",
          ask: "Interpret the proxy-status line and the Pod details and explain what the team configured wrong.",
          parts: [
            part(
              "Reading the evidence",
              "proxy-status shows the sidecar is connected and SYNCED (so configuration is distributed) with ECDS NOT SENT, which is normal when no extension config exists; the Pod has istio-proxy injected; but the istio-init args show -b \"\" (inbound ports to redirect: none) and -x \"\" (CIDRs excluded) -- the traffic redirection has been configured to capture nothing, so the sidecar runs but no traffic passes through it.",
              "The sidecar exists and talks to istiod (all xDS SYNCED; NOT SENT for ECDS just means no WASM/extension config, normal). The giveaway is istio-init's arguments: -b \"\" means 'redirect no inbound ports' and the matching outbound setting is likely empty too, so iptables was programmed to send nothing through Envoy. The proxy is healthy and idle; the application's traffic never reaches it, so VirtualServices, mTLS and policy appear to do nothing."
            ),
            part(
              "The cause and the fix",
              "The Deployment (or the namespace's injection template/ProxyConfig) sets traffic.sidecar.istio.io/includeInboundPorts: \"\" and/or excludeOutboundIPRanges/includeOutboundIPRanges to values that capture nothing -- often copied from an example meant to exclude a port; fix by removing those annotations (defaults capture all inbound ports and all outbound traffic) or setting them correctly, then restart the Pods; verify with istioctl x describe pod (listeners present) and a request appearing in the sidecar's access log.",
              "Look at the Pod template: kubectl -n orders get deploy orders-api -o jsonpath='{.spec.template.metadata.annotations}'. Expect something like traffic.sidecar.istio.io/includeInboundPorts: \"\" and traffic.sidecar.istio.io/includeOutboundIPRanges: \"\" -- annotations copied from an example (the usual intent is excludeInboundPorts for a health port). An empty include list captures nothing. Remove the annotations (defaults: includeInboundPorts * and includeOutboundIPRanges *) or set them to what is meant, then kubectl -n orders rollout restart deploy/orders-api so istio-init re-runs with correct -b/-i values. Verify: istioctl x describe pod -n orders orders-api-... lists the inbound port and effective policies; kubectl logs ... -c istio-proxy shows requests flowing; istioctl proxy-config listeners shows the inbound listener for the app port."
            ),
          ],
        },
      ],
    },
    {
      slug: "data-plane-503-debug",
      objective: "Troubleshoot the mesh data plane: Envoy access logs and response flags, istioctl proxy-config for listeners, routes, clusters and endpoints, and debugging mTLS and policy denials",
      kind: "case",
      title: "Trace a 503 through the sidecars to its cause",
      brief:
        "The fictional food-delivery firm Saffron Dash reports that the courier service gets intermittent 503s calling the dispatch service after a redeploy of dispatch. Both run in namespace delivery with sidecars; mTLS is STRICT.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ kubectl -n delivery logs deploy/courier -c istio-proxy --since=5m | grep ' 503 ' | head -2\n[2026-11-08T14:02:11.004Z] \"POST /assign HTTP/1.1\" 503 UF,URX upstream_reset_before_response_started{connection_failure,TLS_error:_268435581:SSL_routines:OPENSSL_internal:CERTIFICATE_VERIFY_FAILED} - \"-\" 212 91 2 - \"-\" \"courier/3.1\" \"d2c1...\" \"dispatch:8080\" \"10.244.3.44:8080\" outbound|8080||dispatch.delivery.svc.cluster.local - 10.96.10.7:8080 10.244.1.9:50342 - default\n[2026-11-08T14:02:11.410Z] \"POST /assign HTTP/1.1\" 200 - via_upstream - \"-\" 212 48 7 6 \"-\" \"courier/3.1\" \"e9a0...\" \"dispatch:8080\" \"10.244.2.17:8080\" outbound|8080||dispatch.delivery.svc.cluster.local - 10.96.10.7:8080 10.244.1.9:50344 - default\n\n$ istioctl proxy-config endpoints -n delivery deploy/courier --cluster 'outbound|8080||dispatch.delivery.svc.cluster.local'\nENDPOINT             STATUS   OUTLIER CHECK   CLUSTER\n10.244.2.17:8080     HEALTHY  OK              outbound|8080||dispatch.delivery.svc.cluster.local\n10.244.3.44:8080     HEALTHY  OK              outbound|8080||dispatch.delivery.svc.cluster.local\n\n$ kubectl -n delivery get pod -o wide -l app=dispatch\nNAME                        READY   STATUS    RESTARTS   AGE   IP\ndispatch-8d7c6b5f4-p2q9r    2/2     Running   0          3d    10.244.2.17\ndispatch-9f8e7d6c5-t4w1x    1/1     Running   0          12m   10.244.3.44",
          ask: "Explain the 503 from the response flags and the error text, identify which endpoint is at fault and why, and fix it.",
          parts: [
            part(
              "Decoding the access log",
              "Response flags UF (upstream connection failure) and URX (upstream retry limit exceeded) with details connection_failure and TLS CERTIFICATE_VERIFY_FAILED: courier's sidecar tried to open an mTLS connection to upstream 10.244.3.44:8080 and the TLS handshake failed because the peer did not present a certificate the sidecar trusts; the successful request went to 10.244.2.17.",
              "503 with UF,URX: UF = the upstream connection could not be established, URX = Envoy's automatic retry budget was exhausted. The response_code_details say exactly why: connection_failure with a TLS error CERTIFICATE_VERIFY_FAILED -- the client sidecar expected an mTLS peer presenting an Istio certificate, and 10.244.3.44 did not provide a valid one. The 200 a moment later went to 10.244.2.17, so one endpoint works and one does not; load balancing alternates between them, hence 'intermittent'."
            ),
            part(
              "Which endpoint and why",
              "The new dispatch Pod 10.244.3.44 is 1/1 READY -- it has no sidecar -- while the old one is 2/2; the redeploy produced a Pod without injection (a different ReplicaSet hash, so likely a template change such as sidecar.istio.io/inject: \"false\" or a label/annotation removed, or the Pod was created while the webhook was down); with STRICT mTLS, courier's sidecar insists on mTLS and the plain application port cannot complete the handshake.",
              "Compare the Pods: the old dispatch Pod has 2 containers (app + istio-proxy); the new one, from a different ReplicaSet created 12 minutes ago, has 1 -- no sidecar was injected. Its endpoint is still in the Service, so courier's sidecar sends mTLS to a bare application port, which answers plain HTTP and cannot complete a TLS handshake: CERTIFICATE_VERIFY_FAILED / connection failure. Causes to check on the new ReplicaSet's template: an annotation sidecar.istio.io/inject: \"false\", a changed namespace label, or a Pod created while the injection webhook was unavailable (kubectl -n delivery describe rs dispatch-9f8e7d6c5 and kubectl get mutatingwebhookconfiguration istio-sidecar-injector)."
            ),
            part(
              "Fix and verification",
              "Remove the injection-disabling annotation (or fix the label) and roll the Deployment so every dispatch Pod has a sidecar; if the webhook was down, kubectl rollout restart after restoring it; verify with kubectl get pods showing 2/2, istioctl proxy-status listing both dispatch Pods, and courier's access log showing only 200s; as a guard, an AuthorizationPolicy/PeerAuthentication would not help -- the fix is injection; a NetworkPolicy or a check in CI that fails on 1/1 Pods in mesh namespaces prevents recurrence.",
              "kubectl -n delivery get deploy dispatch -o yaml | grep -n 'sidecar.istio.io/inject' -> remove the \"false\" annotation (or restore the label), then kubectl -n delivery rollout restart deploy/dispatch. Verify: kubectl -n delivery get pods -l app=dispatch -> all 2/2; istioctl proxy-status | grep dispatch -> every Pod SYNCED; kubectl -n delivery logs deploy/courier -c istio-proxy -f | grep assign -> 200s only. Prevention: a CI/admission check (Kyverno or a simple test) that rejects Pods in mesh-enabled namespaces without the istio-proxy container, so a bare Pod can never join a STRICT namespace again."
            ),
          ],
        },
        {
          text: "Now a second complaint from the same namespace: payments -> dispatch returns 403 'RBAC: access denied' since the fix, while courier -> dispatch works.\n\n$ kubectl -n delivery logs deploy/payments -c istio-proxy --since=2m | grep ' 403 ' | head -1\n[2026-11-08T14:31:02.118Z] \"GET /assignments HTTP/1.1\" 403 - via_upstream - \"-\" 0 19 1 1 \"-\" \"payments/2.0\" \"7fa1...\" \"dispatch:8080\" \"10.244.2.17:8080\" outbound|8080||dispatch.delivery.svc.cluster.local - 10.96.10.7:8080 10.244.1.21:40112 - default\n\n$ kubectl -n delivery logs dispatch-8d7c6b5f4-p2q9r -c istio-proxy --since=2m | grep ' 403 ' | head -1\n[2026-11-08T14:31:02.119Z] \"GET /assignments HTTP/1.1\" 403 UAEX rbac_access_denied_matched_policy[none] - \"-\" 0 19 0 - \"-\" \"payments/2.0\" \"7fa1...\" \"dispatch:8080\" \"10.244.2.17:8080\" inbound|8080|| - 10.244.2.17:8080 10.244.1.21:40112 outbound_.8080_._.dispatch.delivery.svc.cluster.local default\n\n$ istioctl x authz check -n delivery dispatch-8d7c6b5f4-p2q9r\nACTION   AuthorizationPolicy        RULES\nALLOW    dispatch-allow.delivery    1",
          ask: "Explain which side denied the request and why, and give the fix.",
          parts: [
            part(
              "Which side and why",
              "The 403 appears on dispatch's inbound sidecar with flag UAEX (unauthorized external service / RBAC) and rbac_access_denied_matched_policy[none]: an ALLOW policy (dispatch-allow) applies to dispatch and no rule matched payments' identity -- 'matched_policy[none]' means denied by the absence of a match, not by a DENY rule; courier works because the one rule allows courier's principal.",
              "The client log shows a 403 returned via_upstream, so courier-side nothing was decided; the server-side (dispatch inbound) log carries UAEX and rbac_access_denied_matched_policy[none]: Envoy's RBAC filter on dispatch denied the request because an ALLOW policy exists for the workload and no rule matched -- 'none' means no policy matched, so the default-deny of ALLOW semantics applied. istioctl x authz check confirms one ALLOW policy, dispatch-allow, with one rule, evidently permitting courier's ServiceAccount only. payments' SPIFFE identity is not in it."
            ),
            part(
              "Fix",
              "Add payments' principal (cluster.local/ns/delivery/sa/payments) to dispatch-allow with the operations it needs (GET /assignments), rather than deleting the policy or allowing the whole namespace; verify with istioctl x authz check and a test request, and read the access log's matched_policy showing dispatch-allow for allowed requests when logging is set to show it.",
              "kubectl -n delivery get authorizationpolicy dispatch-allow -o yaml shows the single rule for courier. Add a rule:\n  - from:\n    - source:\n        principals: [\"cluster.local/ns/delivery/sa/payments\"]\n    to:\n    - operation:\n        methods: [\"GET\"]\n        paths: [\"/assignments\"]\nkubectl apply, then from payments: curl dispatch:8080/assignments -> 200. istioctl x authz check -n delivery dispatch-... now lists 2 rules. Do not fix it by deleting the policy or allowing namespaces: [\"delivery\"] -- that would reopen dispatch to every workload in the namespace, which is what the policy exists to prevent."
            ),
          ],
        },
      ],
    },
  ],
};
