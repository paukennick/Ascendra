import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-164: Cilium Certified Associate (CCA).
//
// Aligned to the eight CCA domains (Architecture 20%, Network Policy 18%,
// Service Mesh 16%, Network Observability 10%, Installation and
// Configuration 10%, Cluster Mesh 10%, eBPF 10%, BGP and External
// Networking 6%), read on 2026-11-08 from github.com/cncf/curriculum
// (CCA_Curriculum.pdf, image-only, read page by page) and
// training.linuxfoundation.org. Density (docs/labs.md, hybrid):
// 2 / 2 / 2 / 2 / 2 / 1 / 1 / 1.
//
// Labs write CiliumNetworkPolicy, Gateway API and Cilium CLI commands
// against authored cilium/hubble output. Resource versions are the stable
// cilium.io/v2 and gateway.networking.k8s.io/v1; every lab is
// needs_expert_review.

export const CCA_LABS: SeedLabSet = {
  trackCode: "CCA",
  sources: [
    source("https://github.com/cncf/curriculum/blob/0a8cc08a502710a894e5724c2bec7b88404e5a6b/CCA_Curriculum.pdf", "exam_outline", "2026-11-08"),
    source("https://training.linuxfoundation.org/certification/cilium-certified-associate-cca/", "exam_outline", "2026-11-08"),
    source("https://docs.cilium.io/en/stable/security/policy/", "reference", "2026-11-08"),
    source("https://docs.cilium.io/en/stable/observability/hubble/", "reference", "2026-11-08"),
    source("https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-configuration/", "reference", "2026-11-09"),
    source("https://docs.cilium.io/en/stable/network/lb-ipam/", "reference", "2026-11-09"),
    source("https://docs.cilium.io/en/stable/installation/k8s-install-helm/", "reference", "2026-11-09"),
  ],
  labs: [
    // ----------------------------------------------------------------- 20%
    {
      slug: "ipam-and-datapath-choice",
      objective: "Configure IP address management (IPAM) with Cilium: cluster-scope and Kubernetes host-scope modes, pod CIDRs per node, and cloud-native IPAM (ENI, Azure, GKE)",
      kind: "build",
      title: "Choose IPAM and datapath modes for two different clusters",
      brief:
        "The fictional logistics firm Harrowgate Freight is installing Cilium on two clusters. Cluster A is an on-premises kubeadm cluster where the network team will not change the physical routers but allows any traffic between nodes. Cluster B runs on AWS where the team wants Pods to have VPC-routable addresses and to avoid any encapsulation overhead. Both need a Pod CIDR plan that will not exhaust addresses when nodes are added.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "For each cluster choose the IPAM mode and the datapath (routing) mode with the Helm values, and explain the trade-offs and how addresses are handed to nodes.",
          parts: [
            part(
              "Cluster A: cluster-scope IPAM",
              "ipam.mode=cluster-pool with clusterPoolIPv4PodCIDRList (e.g. 10.0.0.0/8 or a /14) and clusterPoolIPv4MaskSize 24, so the operator carves a /24 per node from the pool via CiliumNode objects; explains kubernetes (host-scope) mode would instead take the node's spec.podCIDR from kubeadm's controller manager, which also works but ties the pool to kubeadm's allocation.",
              "helm install cilium cilium/cilium -n kube-system \\\n  --set ipam.mode=cluster-pool \\\n  --set ipam.operator.clusterPoolIPv4PodCIDRList={10.42.0.0/16} \\\n  --set ipam.operator.clusterPoolIPv4MaskSize=24\nThe Cilium operator allocates a /24 per node out of 10.42.0.0/16 and writes it to the node's CiliumNode resource; the agent on each node assigns Pod IPs from that /24. A /16 with /24 per node allows 256 nodes x 254 Pods -- plan the pool for the largest expected node count. ipam.mode=kubernetes would use the podCIDR kubeadm's controller manager assigns to each Node (--pod-network-cidr), fine when that pool is already sized correctly."
            ),
            part(
              "Cluster A: encapsulation",
              "routingMode=tunnel with tunnelProtocol vxlan (or geneve), because the physical network will not learn Pod routes; explains that encapsulation wraps Pod packets in node-to-node UDP so routers only see node IPs, at a small MTU and CPU cost, versus native routing which needs routes for every node's Pod CIDR.",
              "--set routingMode=tunnel --set tunnelProtocol=vxlan\nWith no cooperation from the routers, Pod packets must travel inside node-to-node packets: VXLAN (UDP 8472) or Geneve (UDP 6081). The underlay only needs node reachability. Cost: ~50 bytes of header (lower MTU for Pods) and encapsulation work per packet. Native routing would need every node's /24 to be routable in the fabric -- via BGP or static routes -- which the network team ruled out; auto-direct-node-routes works only when all nodes share one L2 segment."
            ),
            part(
              "Cluster B: ENI IPAM with native routing",
              "eni.enabled=true and ipam.mode=eni with routingMode=native, enableIPv4Masquerade false (Pods are VPC-addressable) and egressMasqueradeInterfaces as needed, so the operator attaches ENIs and secondary IPs to each node and Pods get VPC IPs; explains the limits per instance type and the pre-allocation settings.",
              "--set eni.enabled=true --set ipam.mode=eni --set routingMode=native --set enableIPv4Masquerade=false --set egressMasqueradeInterfaces=eth+\nIn ENI mode the operator manages Elastic Network Interfaces and secondary private IPs on each EC2 instance and hands them to Pods, so a Pod has a real VPC address: no encapsulation, routable from the VPC, security groups applicable. Instance types cap ENIs and IPs per ENI, so Pod density per node is bounded; the CiliumNode spec.eni fields (pre-allocate, min-allocate) tune how many IPs are kept warm. Prefix delegation raises density where supported."
            ),
            part(
              "Verifying",
              "cilium status shows IPAM mode and allocated/available addresses; kubectl get ciliumnodes -o yaml shows each node's pod CIDR or ENI allocations; cilium connectivity test proves the datapath; checks MTU on tunnel clusters.",
              "cilium status                           # IPAM: cluster-pool or eni, Routing: tunnel [vxlan] / native\nkubectl get ciliumnodes -o custom-columns=NODE:.metadata.name,CIDR:.spec.ipam.podCIDRs  # or .spec.eni for cluster B\ncilium connectivity test                # exercises pod-to-pod, pod-to-service, node and world paths\nOn cluster A also check the Pod MTU (ip link inside a Pod) is the node MTU minus the tunnel overhead, which Cilium sets automatically."
            ),
          ],
        },
      ],
    },
    {
      slug: "component-roles-outage",
      objective: "Cilium component roles: what the agent, operator and proxy each own, and how they interact with the Kubernetes API",
      kind: "case",
      title: "Work out which Cilium component is broken from the symptoms",
      brief:
        "At the fictional broadcaster Pennine Media, two problems were reported on the same morning on a Cilium cluster: new Pods on node worker-4 stay ContainerCreating, and across the whole cluster no new Pod anywhere has received an IP in the last ten minutes, although existing Pods work normally.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ kubectl -n kube-system get pods -l k8s-app=cilium -o wide | grep -E 'NAME|worker-4'\nNAME           READY   STATUS             RESTARTS      AGE   IP           NODE\ncilium-x8k2q   0/1     CrashLoopBackOff   7 (2m ago)    40d   10.20.0.24   worker-4\n\n$ kubectl -n kube-system get deploy cilium-operator\nNAME              READY   UP-TO-DATE   AVAILABLE   AGE\ncilium-operator   0/2     2            0           40d\n\n$ kubectl -n kube-system logs deploy/cilium-operator --tail=2\nlevel=error msg=\"Unable to update CiliumNode\" error=\"ciliumnodes.cilium.io is forbidden: User \\\"system:serviceaccount:kube-system:cilium-operator\\\" cannot update resource \\\"ciliumnodes\\\" in API group \\\"cilium.io\\\"\"\n\n$ kubectl describe pod -n apps web-7c9d-k2m4p | tail -2\n  Warning  FailedCreatePodSandBox  12s  kubelet  Failed to create pod sandbox: rpc error: ... plugin type=\"cilium-cni\" failed (add): unable to allocate IP via local cilium agent: [POST /ipam][502] postIpamFailure  No more IPs available",
          ask: "Attribute each symptom to the component responsible, explain the chain of cause and effect, and say what you would fix first.",
          parts: [
            part(
              "worker-4: the agent",
              "The cilium agent Pod on worker-4 is crash-looping; the agent is the CNI plugin's backend on that node (allocates IPs, programs eBPF, enforces policy), so Pods on worker-4 cannot be set up and stay ContainerCreating; existing Pods keep working because their datapath is already programmed in the kernel.",
              "On worker-4 the agent (cilium DaemonSet Pod) is in CrashLoopBackOff. The agent is what cilium-cni talks to when the kubelet creates a sandbox -- it assigns the IP and attaches the eBPF programs -- so with no agent, new Pods on that node cannot be created. Pods already running there keep working because their eBPF programs are loaded in the kernel and do not need the agent for the datapath."
            ),
            part(
              "Cluster-wide IP exhaustion: the operator",
              "The operator (0/2 available) owns cluster-wide IPAM in cluster-pool mode: it allocates pod CIDRs to CiliumNode objects; its RBAC was broken (cannot update ciliumnodes), so when nodes' local pools ran low no new CIDRs were assigned and agents report 'No more IPs available' everywhere; the agent-side error is a symptom of the operator failing.",
              "The operator is down (0/2) and its log shows the cause: its ServiceAccount lost permission to update CiliumNode resources -- someone changed RBAC. In cluster-pool IPAM the operator hands each node its pod CIDR(s) via CiliumNode; agents allocate individual IPs from those. With the operator unable to write, nodes that exhausted their allocated range cannot get more, and every new Pod on those nodes fails with 'No more IPs available' -- an agent message whose root cause is the operator. This also explains why only new Pods are affected."
            ),
            part(
              "Fix order and the proxy's role",
              "Fix the operator's RBAC first (restore the cilium-operator ClusterRole from the Helm chart, e.g. helm upgrade with the same values, or reapply the ClusterRole) so IPAM resumes cluster-wide, then investigate worker-4's agent crash (kubectl logs cilium-x8k2q --previous); notes the Envoy proxy was not involved -- it handles L7 policy and Ingress/Gateway traffic, and neither symptom is L7.",
              "1 Operator first: it affects every node. Restore its RBAC -- helm upgrade cilium cilium/cilium -n kube-system --reuse-values re-creates the cilium-operator ClusterRole and binding; confirm with kubectl -n kube-system rollout status deploy/cilium-operator and kubectl auth can-i update ciliumnodes --as=system:serviceaccount:kube-system:cilium-operator. New Pods start getting IPs within seconds. 2 Then worker-4: kubectl -n kube-system logs cilium-x8k2q --previous for the agent's crash reason (often a kernel/BPF filesystem issue or a bad config change). The Envoy proxy (per-node, or the cilium-envoy DaemonSet) owns L7 -- HTTP policy, Ingress, Gateway API -- and is irrelevant to IP allocation, so it is not a suspect here."
            ),
          ],
        },
        {
          text: "Both fixes are in. The platform lead asks for a short description of 'who talks to whom' between Cilium's components and the Kubernetes API, to put in the runbook, and whether the API server being down would take the network down.",
          ask: "Describe the interactions and answer the availability question.",
          parts: [
            part(
              "Interactions",
              "Agent: watches Pods, Services, EndpointSlices, Nodes, CiliumNetworkPolicies and CiliumIdentities/CiliumEndpoints via the API (or via a KVStore in some setups), programs eBPF maps and policy locally, creates CiliumEndpoint objects for its Pods and allocates identities; Operator: cluster-singleton duties -- IPAM pool management, identity garbage collection, CiliumEndpointSlice handling, cloud API calls (ENIs); Envoy proxy: receives L7 configuration from the agent and handles HTTP-aware policy and Gateway/Ingress traffic; Hubble relay aggregates flows from agents.",
              "Agent (per node): watches the API for Pods, Services/EndpointSlices, Nodes, policies and Cilium CRDs; computes identities from labels and publishes CiliumEndpoint/CiliumIdentity objects; programs the node's eBPF maps (policy, load balancing, routing) and answers the CNI plugin. Operator (cluster-wide, leader-elected): allocates pod CIDRs/ENIs to CiliumNodes, garbage-collects unused identities and endpoints, manages CiliumEndpointSlices and talks to cloud APIs. Envoy (per node or per namespace in the newer DaemonSet): gets listener/route config from the agent for L7 policy, Ingress and Gateway API. Hubble relay reads flows from every agent's Hubble server and serves the CLI and UI."
            ),
            part(
              "API server outage",
              "Existing traffic keeps flowing: policy, load balancing and routing live in eBPF maps on each node and need no control plane; what stops is change -- new Pods, Services and policies are not learned, identities for new label sets are not allocated, and after a while stale endpoints are not cleaned; the agent reconnects and reconciles when the API returns.",
              "The network does not go down. Every decision for existing flows -- which identity may talk to which, where a ClusterIP maps, how to reach a remote node -- is already in the node's eBPF maps, so packets keep being forwarded and policy keeps being enforced with no API server at all. What freezes is the control loop: new Pods cannot get endpoints and identities, new Services and policies are not programmed, and endpoint churn is not reflected. When the API server returns, agents re-list and reconcile. This is the design benefit of pushing state into the kernel."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 18%
    {
      slug: "l7-policy-for-api",
      objective:
        "Write policy rules using the policy rule structure: CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy, toEndpoints, toFQDNs, toEntities, toCIDR, toPorts with L7 rules",
      kind: "build",
      title: "Write identity-based L3-L7 policies for an orders service",
      brief:
        "The fictional marketplace Larkhill runs namespace shop with Pods labelled app=frontend, app=orders (port 8080) and app=payments (port 9443). Requirements: only frontend may call orders, and only GET /api/orders/* and POST /api/orders; orders may call payments on 9443 and may resolve and call api.stripe-sandbox.example on 443; orders may reach kube-dns for DNS; nothing else in or out of orders. The cluster runs Cilium with policy enforcement in default mode.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the CiliumNetworkPolicy for the orders endpoints and explain each rule construct.",
          parts: [
            part(
              "Ingress with L7 HTTP rules",
              "A CiliumNetworkPolicy with endpointSelector app=orders and an ingress rule fromEndpoints matchLabels app=frontend, toPorts port 8080 TCP with rules.http entries for GET path ^/api/orders/.*$ and POST path ^/api/orders$; explains that adding L7 rules makes the agent route the flow through Envoy, and that fromEndpoints matches by identity (labels), not IP.",
              "apiVersion: cilium.io/v2\nkind: CiliumNetworkPolicy\nmetadata: {name: orders, namespace: shop}\nspec:\n  endpointSelector:\n    matchLabels: {app: orders}\n  ingress:\n  - fromEndpoints:\n    - matchLabels: {app: frontend}\n    toPorts:\n    - ports: [{port: \"8080\", protocol: TCP}]\n      rules:\n        http:\n        - method: GET\n          path: \"^/api/orders/.*$\"\n        - method: POST\n          path: \"^/api/orders$\"\nfromEndpoints selects by security identity (the labels), so a frontend Pod anywhere in the namespace matches regardless of IP. The http rules turn on L7 enforcement: matching traffic is redirected to the per-node Envoy, which allows only those method/path pairs and returns 403 for the rest (visible in Hubble as a Policy denied L7 verdict)."
            ),
            part(
              "Egress to payments and to DNS",
              "Egress rules: toEndpoints app=payments with toPorts 9443/TCP; toEndpoints k8s:io.kubernetes.pod.namespace=kube-system and k8s-app=kube-dns on 53 UDP/TCP with rules.dns matchPattern \"*\" so DNS is both allowed and inspected (needed for toFQDNs).",
              "  egress:\n  - toEndpoints:\n    - matchLabels: {app: payments}\n    toPorts:\n    - ports: [{port: \"9443\", protocol: TCP}]\n  - toEndpoints:\n    - matchLabels:\n        k8s:io.kubernetes.pod.namespace: kube-system\n        k8s-app: kube-dns\n    toPorts:\n    - ports: [{port: \"53\", protocol: UDP}, {port: \"53\", protocol: TCP}]\n      rules:\n        dns:\n        - matchPattern: \"*\"\nSelecting kube-dns across namespaces uses the k8s:io.kubernetes.pod.namespace label. The dns rule makes the agent's DNS proxy observe lookups, which is what lets toFQDNs below learn which IPs the name resolves to."
            ),
            part(
              "Egress to an external name",
              "An egress rule with toFQDNs matchName api.stripe-sandbox.example and toPorts 443/TCP; explains Cilium learns the IPs from the DNS proxy's answers and programs them into policy, so the rule follows the name even as IPs change, and that toCIDR would be the alternative for fixed address ranges.",
              "  - toFQDNs:\n    - matchName: api.stripe-sandbox.example\n    toPorts:\n    - ports: [{port: \"443\", protocol: TCP}]\nWhen orders resolves api.stripe-sandbox.example through the DNS proxy, Cilium records the returned IPs with their TTL and allows 443 to exactly those addresses -- a policy on a name rather than on CIDRs that a cloud provider changes under you. matchPattern allows wildcards (*.stripe-sandbox.example). toCIDR/toCIDRSet remain the right tool for fixed ranges such as an on-premises database subnet."
            ),
            part(
              "Default deny and entities",
              "Explains that once a policy selects the orders endpoints, every direction that has at least one rule becomes default-deny for that endpoint (ingress and egress here), so nothing else is allowed; mentions toEntities (world, cluster, host, kube-apiserver) for coarse allowances and that enforcement mode default means unselected Pods stay open.",
              "Because the policy selects app=orders and defines both ingress and egress rules, orders is now default-deny in both directions: anything not listed -- another Pod, the internet, a different path on 8080 -- is dropped. Pods with no policy selecting them remain unrestricted under policy enforcement mode default; mode always would deny them too. toEntities offers named groups when needed: world (outside the cluster), cluster, host, remote-node, kube-apiserver -- for example an egress toEntities: [kube-apiserver] for a controller Pod."
            ),
          ],
        },
      ],
    },
    {
      slug: "read-policy-intent",
      objective: "Interpret Cilium network policies and their intent: endpointSelector, ingress and egress rules, and what a policy allows at L3, L4 and L7",
      kind: "case",
      title: "Explain why a Pod can and cannot talk, from the policies alone",
      brief:
        "A developer at the fictional analytics firm Dunmore Data says 'my batch Pod can reach the API on 8080 but curl to a different path returns 403, and it cannot reach the metrics endpoint on 9090 at all, and I don't understand why'. You have the two policies in namespace data.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "apiVersion: cilium.io/v2\nkind: CiliumNetworkPolicy\nmetadata: {name: api-ingress, namespace: data}\nspec:\n  endpointSelector:\n    matchLabels: {app: api}\n  ingress:\n  - fromEndpoints:\n    - matchLabels: {role: batch}\n    toPorts:\n    - ports: [{port: \"8080\", protocol: TCP}]\n      rules:\n        http:\n        - method: GET\n          path: \"^/v1/reports.*$\"\n---\napiVersion: cilium.io/v2\nkind: CiliumClusterwideNetworkPolicy\nmetadata: {name: metrics-scrape}\nspec:\n  endpointSelector:\n    matchExpressions:\n    - {key: io.kubernetes.pod.namespace, operator: Exists}\n  ingress:\n  - fromEndpoints:\n    - matchLabels:\n        k8s:io.kubernetes.pod.namespace: monitoring\n        app: prometheus\n    toPorts:\n    - ports: [{port: \"9090\", protocol: TCP}]\n\n$ kubectl -n data get pod batch-1 --show-labels | tail -1\nbatch-1   1/1   Running   0   3m   app=batch,role=batch\n\n$ hubble observe -n data --to-pod data/api-6d9f --last 3\nNov  8 10:02:11.410: data/batch-1:51204 (ID:21877) -> data/api-6d9f:8080 (ID:30412) http-request FORWARDED (HTTP/1.1 GET http://api/v1/reports/7)\nNov  8 10:02:15.902: data/batch-1:51210 (ID:21877) -> data/api-6d9f:8080 (ID:30412) http-request DROPPED (HTTP/1.1 GET http://api/v1/users)\nNov  8 10:02:20.117: data/batch-1:51216 (ID:21877) -> data/api-6d9f:9090 (ID:30412) Policy denied DROPPED (TCP Flags: SYN)",
          ask: "Explain each of the three Hubble lines from the policies, and state what the two policies together allow into the api Pods.",
          parts: [
            part(
              "Line 1 and 2: L7 allow and L7 deny",
              "api-ingress allows role=batch endpoints to reach api on 8080 but only GET requests whose path matches ^/v1/reports.*$; the first request matches and is FORWARDED at L7; the second (GET /v1/users) reaches Envoy because L3/L4 allow it, but no http rule matches, so the proxy drops it with 403 -- hence 'can reach the API but some paths return 403'.",
              "Line 1: batch-1 (identity 21877, labels include role=batch) -> api:8080 GET /v1/reports/7 matches the http rule, so Envoy forwards it. Line 2: same source and port, GET /v1/users: L3 (identity role=batch) and L4 (8080/TCP) allow the connection, so the request is handed to Envoy, but no http rule matches, so it is dropped at L7 -- the client sees HTTP 403 Access denied from the proxy, which is why the connection works but the path does not."
            ),
            part(
              "Line 3: L4 deny",
              "Port 9090 on api is covered only by the clusterwide metrics-scrape policy, which allows ingress on 9090 solely from Pods labelled app=prometheus in namespace monitoring; batch-1 has neither label, so the SYN is dropped at the policy layer before any connection -- 'cannot reach at all'.",
              "Line 3: batch-1 -> api:9090, SYN dropped with Policy denied. The only rule for 9090 is the CiliumClusterwideNetworkPolicy metrics-scrape, whose fromEndpoints requires identity labels app=prometheus and namespace monitoring. batch-1 is in namespace data with app=batch, so no rule allows 9090 from it and the packet is dropped at L3/L4 -- no connection, a timeout for curl."
            ),
            part(
              "Combined intent",
              "Policies are additive allowlists: api Pods accept (a) GET /v1/reports.* on 8080 from role=batch endpoints in the same namespace (fromEndpoints without a namespace label means the policy's namespace), and (b) anything on 9090 from monitoring's prometheus Pods; everything else inbound to api is denied; the clusterwide policy also applies the 9090 rule to every namespaced Pod in the cluster, and egress from api is unrestricted because no policy defines egress for it.",
              "Together the api endpoints allow exactly two inbound flows: GET /v1/reports.* on 8080/TCP from role=batch Pods in namespace data (a CiliumNetworkPolicy's fromEndpoints is scoped to its own namespace unless a namespace label is given), and any traffic on 9090/TCP from app=prometheus Pods in monitoring. Everything else inbound is denied because at least one ingress rule selects api. Note the clusterwide policy selects every Pod in any namespace (io.kubernetes.pod.namespace Exists), so it both grants Prometheus access to 9090 everywhere and makes every selected Pod default-deny on ingress -- a side effect worth knowing. Egress from api is still unrestricted: no policy defines egress for it."
            ),
          ],
        },
        {
          text: "The developer needs the batch Pod to call GET /v1/users as well, and a new team wants their Pods in namespace research to call the API too. The security lead agrees, but says: 'Do not widen anything else, and I want to see in Hubble that nothing new is allowed by accident.'",
          ask: "Make the minimal policy change and describe the Hubble verification.",
          parts: [
            part(
              "Minimal change",
              "Add a second http rule (GET ^/v1/users$) to the existing toPorts entry, and add a second fromEndpoints entry selecting Pods from namespace research with the appropriate label (k8s:io.kubernetes.pod.namespace: research plus their app label) -- or, if research Pods should have the same path limits, keep them in the same ingress rule; avoid widening the path regex or removing the http rules.",
              "  ingress:\n  - fromEndpoints:\n    - matchLabels: {role: batch}\n    - matchLabels:\n        k8s:io.kubernetes.pod.namespace: research\n        role: batch\n    toPorts:\n    - ports: [{port: \"8080\", protocol: TCP}]\n      rules:\n        http:\n        - method: GET\n          path: \"^/v1/reports.*$\"\n        - method: GET\n          path: \"^/v1/users$\"\nBoth sources share the same L7 allowlist. Each fromEndpoints entry is OR-ed, and the namespace label lets a namespaced policy accept endpoints from another namespace. Nothing about 9090 or egress changes."
            ),
            part(
              "Verification in Hubble",
              "hubble observe filtered to the api Pod with --verdict DROPPED to confirm only expected drops remain, --protocol http to see FORWARDED only for the two paths, and a negative test (curl /v1/admin from batch and curl from a Pod in another namespace without the label) that must show DROPPED; compares the flow verdicts before and after the change.",
              "hubble observe -n data --to-pod data/api-6d9f --protocol http -f   # watch: GET /v1/users now FORWARDED; GET /v1/admin still DROPPED\nhubble observe -n data --to-pod data/api-6d9f --verdict DROPPED --last 50   # every drop should be an unexpected path or an unlisted source\nNegative tests: from research/batch-pod curl api.data:8080/v1/users -> 200; from research/other-pod (no role=batch) -> timeout and a Policy denied DROPPED line; from data/batch-1 curl :9090 -> still dropped. The L7 lines show the exact method and path, which is the evidence the security lead asked for."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 16%
    {
      slug: "gateway-api-with-cilium",
      objective: "Know how to use Ingress or Gateway API for ingress routing with Cilium: the Cilium ingress controller, GatewayClass, Gateway and HTTPRoute",
      kind: "build",
      title: "Expose two services through Cilium's Gateway API with TLS",
      brief:
        "The fictional education platform Ashby Learn runs Cilium with the Gateway API enabled (gatewayAPI.enabled=true) and the Gateway API CRDs installed. They want https://learn.ashby.example routed to Service web (port 80) for all paths and to Service api (port 8080) for paths under /api, with TLS terminated at the gateway from a Secret ashby-tls, and HTTP redirected to HTTPS. The platform team owns the Gateway; the application team owns the routes.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the Gateway and HTTPRoutes, show the ownership split, and explain how Cilium realises them compared with an Ingress.",
          parts: [
            part(
              "Gateway (platform-owned)",
              "A gateway.networking.k8s.io/v1 Gateway with gatewayClassName cilium, an HTTPS listener on 443 with tls.mode Terminate and certificateRefs ashby-tls, an HTTP listener on 80, and allowedRoutes namespaces from Selector/All so application namespaces may attach routes; explains Cilium provisions a LoadBalancer Service and programs its Envoy for the gateway.",
              "apiVersion: gateway.networking.k8s.io/v1\nkind: Gateway\nmetadata: {name: public, namespace: platform}\nspec:\n  gatewayClassName: cilium\n  listeners:\n  - name: https\n    protocol: HTTPS\n    port: 443\n    hostname: learn.ashby.example\n    tls:\n      mode: Terminate\n      certificateRefs: [{kind: Secret, name: ashby-tls}]\n    allowedRoutes:\n      namespaces: {from: All}\n  - name: http\n    protocol: HTTP\n    port: 80\n    hostname: learn.ashby.example\n    allowedRoutes:\n      namespaces: {from: All}\nCilium's operator creates a LoadBalancer Service for the Gateway (cilium-gateway-public) and configures the Envoy proxy with the listeners; the Secret must be in the Gateway's namespace or referenced via a ReferenceGrant."
            ),
            part(
              "HTTPRoutes (application-owned)",
              "HTTPRoutes in the application namespace with parentRefs to platform/public (sectionName https), hostnames, and rules: a PathPrefix /api match to Service api:8080 and a default PathPrefix / match to web:80; explains the route attaches across namespaces because the Gateway's allowedRoutes permits it, and that more specific matches win.",
              "apiVersion: gateway.networking.k8s.io/v1\nkind: HTTPRoute\nmetadata: {name: learn, namespace: learn}\nspec:\n  parentRefs:\n  - {name: public, namespace: platform, sectionName: https}\n  hostnames: [learn.ashby.example]\n  rules:\n  - matches: [{path: {type: PathPrefix, value: /api}}]\n    backendRefs: [{name: api, port: 8080}]\n  - matches: [{path: {type: PathPrefix, value: /}}]\n    backendRefs: [{name: web, port: 80}]\nThe application team edits this without touching the Gateway. Gateway API ranks matches by specificity, so /api/... goes to api and the rest to web. Backends are Services in the route's namespace; cross-namespace backends need a ReferenceGrant."
            ),
            part(
              "HTTP to HTTPS redirect",
              "A second HTTPRoute attached to the http listener whose rule uses a RequestRedirect filter with scheme https and statusCode 301; explains filters are first-class in Gateway API where Ingress needed controller-specific annotations.",
              "apiVersion: gateway.networking.k8s.io/v1\nkind: HTTPRoute\nmetadata: {name: learn-redirect, namespace: learn}\nspec:\n  parentRefs:\n  - {name: public, namespace: platform, sectionName: http}\n  hostnames: [learn.ashby.example]\n  rules:\n  - filters:\n    - type: RequestRedirect\n      requestRedirect: {scheme: https, statusCode: 301}\nWith Ingress this behaviour depended on a controller annotation; in Gateway API the redirect is a portable, typed filter on the route."
            ),
            part(
              "How it compares with Ingress and how to verify",
              "Cilium can also act as an Ingress controller (ingressClassName cilium), but Ingress has one resource for both infrastructure and routing, annotation-driven extensions and no cross-namespace model; Gateway API separates roles, is expressive (header/method matches, weights, filters) and portable across implementations; verify with kubectl get gateway (Programmed condition and address), kubectl get httproute (Accepted/ResolvedRefs), curl -I http://... for the 301 and curl https://.../api for routing, and Hubble for the flows.",
              "Ingress would need an ingressClassName: cilium Ingress with TLS and path rules in one object owned by one team, and annotations for anything beyond host/path. Gateway API splits infrastructure (Gateway, platform) from routing (HTTPRoute, app teams), expresses weights, header matches and filters natively, and the same YAML works on other conformant implementations. Verify: kubectl -n platform get gateway public -o wide shows ADDRESS and PROGRAMMED True; kubectl -n learn get httproute shows Accepted and ResolvedRefs True in status.parents; curl -sI http://learn.ashby.example/ -> 301 Location https://...; curl -s https://learn.ashby.example/api/health -> api's response; hubble observe --to-service learn/api shows the proxied flows."
            ),
          ],
        },
      ],
    },
    {
      slug: "encryption-and-sidecarless",
      objective: "Configure encryption of traffic in transit with Cilium: WireGuard and IPsec transparent encryption, and node-to-node encryption",
      kind: "case",
      title: "Encrypt Pod traffic after an audit finding without adding sidecars",
      brief:
        "An audit at the fictional insurer Brampton Life found that Pod-to-Pod traffic between nodes crosses a shared data-centre network in clear text. The security team wants all inter-node Pod traffic encrypted within a month. The application teams refuse sidecars ('we tried a mesh, it doubled our memory').",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ cilium status | grep -E 'Encryption|KubeProxyReplacement|Routing'\nEncryption:              Disabled\nKubeProxyReplacement:    True\nRouting:                 Network: Native   Host: BPF\n\n$ kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name} {.status.nodeInfo.kernelVersion}{\"\\n\"}{end}'\nnode-a 6.1.0-21-amd64\nnode-b 6.1.0-21-amd64\nnode-c 6.1.0-21-amd64",
          ask: "Choose the encryption mode, give the commands to enable and verify it, and explain what is and is not encrypted.",
          parts: [
            part(
              "Mode choice",
              "WireGuard: kernel 6.1 supports it, it needs no key management beyond Cilium's automatic per-node keys (rotated on restart), and it is simpler and generally faster than IPsec; IPsec is the choice where FIPS or specific cipher requirements apply or on kernels without WireGuard; both are transparent to Pods and need no sidecar.",
              "WireGuard. The nodes' 6.1 kernels include it, Cilium generates each node's key pair and distributes public keys through CiliumNode objects automatically, and there is nothing for teams to deploy -- encryption happens in the node's datapath. IPsec remains the option when compliance dictates specific ciphers (AES-GCM) or FIPS mode, or on older kernels, at the cost of managing a shared key Secret and rotating it. Neither adds a sidecar."
            ),
            part(
              "Enable and verify",
              "helm upgrade with encryption.enabled=true and encryption.type=wireguard (rolling restart of agents), then cilium status shows Encryption: Wireguard with the number of peers, cilium encrypt status / kubectl exec into an agent and run cilium-dbg encrypt status, wg show in the agent, and a packet capture on the node showing UDP 51871 instead of plain Pod traffic.",
              "helm upgrade cilium cilium/cilium -n kube-system --reuse-values \\\n  --set encryption.enabled=true --set encryption.type=wireguard\nkubectl -n kube-system rollout status ds/cilium\ncilium status | grep Encryption        # Encryption: Wireguard [NodeEncryption: Disabled, cilium_wg0 (Pubkey: ..., Port: 51871, Peers: 2)]\nkubectl -n kube-system exec ds/cilium -- cilium-dbg encrypt status\nProof on the wire: tcpdump -ni eth0 'udp port 51871' on node-a while a Pod on node-a talks to a Pod on node-b shows WireGuard packets; tcpdump for the Pod IPs shows nothing in clear."
            ),
            part(
              "Scope: what is encrypted",
              "Pod-to-Pod traffic that leaves a node is encrypted between the nodes' cilium_wg0 interfaces; traffic between Pods on the same node is not (it never leaves the host); node-to-node traffic from host processes (kubelet to API server, for example) is covered only with encryption.nodeEncryption=true; traffic to the outside world is unaffected; L7-proxied traffic is encrypted on the node-to-node leg like any other.",
              "Encrypted: every Pod-to-Pod and Pod-to-Service flow that crosses between nodes, transparently. Not encrypted by this setting: flows between two Pods on the same node (they stay in the kernel of one host), traffic from host network processes (kubelet, API server) unless encryption.nodeEncryption=true is also set, and traffic leaving the cluster to external systems (that is the application's TLS). The audit finding -- inter-node Pod traffic in clear -- is closed by the default scope; decide separately whether host traffic should be included."
            ),
          ],
        },
        {
          text: "Encryption is on. The security team now asks whether they also need 'mutual authentication between services like a mesh gives', and the application teams ask what Cilium's sidecarless service mesh would cost them in memory compared with the sidecar mesh they removed.",
          ask: "Explain what Cilium's transparent encryption does and does not provide for identity, what mutual authentication adds, and the sidecarless resource model.",
          parts: [
            part(
              "Encryption versus authentication",
              "WireGuard/IPsec encrypt node-to-node; identity between workloads is enforced by Cilium's network policy using security identities, not by per-connection certificates; Cilium's mutual authentication feature (SPIFFE identities via SPIRE, mTLS handshake at policy level) adds cryptographic verification of the peer workload's identity on top, enabled per policy with authentication.mode: required.",
              "Transparent encryption protects confidentiality and integrity between nodes; it does not by itself prove which workload sent a packet -- that comes from Cilium's identity-based policy, which trusts the node's agent to label flows correctly. Mutual authentication closes that gap: with authentication.mode: required in a CiliumNetworkPolicy, both endpoints' identities (SPIFFE IDs issued through SPIRE) are verified with a mutual TLS handshake before the datapath allows the flow, so a compromised node cannot impersonate another identity. Enable it when the threat model includes compromised nodes; encryption alone answers the audit's clear-text finding."
            ),
            part(
              "Sidecarless resource model",
              "Cilium's mesh runs one Envoy per node (or per namespace, as the cilium-envoy DaemonSet) plus eBPF in the kernel, so cost scales with nodes, not Pods; a sidecar mesh adds a proxy container with its own memory to every Pod; trade-offs: shared proxy fault domain and per-node L7 capacity versus per-Pod isolation and finer per-workload proxy tuning; L4 features (load balancing, policy, encryption) use no proxy at all.",
              "Cilium does L3/L4 -- load balancing, policy, encryption, observability -- entirely in eBPF with no proxy. Only L7 features (HTTP policy, Gateway API, L7 visibility) use Envoy, and that Envoy is per node (the cilium-envoy DaemonSet), so a 50-Pod node runs one proxy instead of 50 sidecars: memory scales with node count, not Pod count, and Pods start faster without injection. Trade-offs: the node's Envoy is a shared component (a bug or overload affects every L7 flow on that node), per-workload proxy tuning is coarser, and some advanced L7 features of sidecar meshes are not present. For the audit requirement -- encryption and identity -- no proxy is involved at all."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 10%
    {
      slug: "hubble-troubleshoot-drop",
      objective: "Troubleshoot connectivity with Hubble from the command line or the Hubble UI: hubble observe filters, hubble status, and reading the UI's service map",
      kind: "case",
      title: "Use Hubble to find who is dropping the checkout calls",
      brief:
        "The fictional retailer Thornbury Goods reports intermittent failures from frontend to checkout in namespace store after a policy change. Nobody knows which policy. Hubble is enabled with relay and the CLI is installed.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ hubble status\nHealthcheck (via localhost:4245): Ok\nCurrent/Max Flows: 12,285/12,285 (100.00%)\nFlows/s: 83.14\nConnected Nodes: 6/6\n\n$ hubble observe -n store --to-pod store/checkout --verdict DROPPED --last 5\nNov  8 11:40:02.118: store/frontend-7c9d-x2 :44210 (ID:18822) -> store/checkout-5f8b-k9:8443 (ID:27710) Policy denied DROPPED (TCP Flags: SYN)\nNov  8 11:40:02.620: store/frontend-7c9d-x2 :44212 (ID:18822) -> store/checkout-5f8b-k9:8443 (ID:27710) Policy denied DROPPED (TCP Flags: SYN)\nNov  8 11:40:05.004: store/frontend-7c9d-m7 :51880 (ID:18822) -> store/checkout-5f8b-k9:8443 (ID:27710) Policy denied DROPPED (TCP Flags: SYN)\n\n$ hubble observe -n store --to-pod store/checkout --verdict FORWARDED --last 2\nNov  8 11:40:03.311: store/frontend-7c9d-x2 :44214 (ID:18822) -> store/checkout-5f8b-k9:8080 (ID:27710) to-endpoint FORWARDED (TCP Flags: SYN)\nNov  8 11:40:03.312: store/checkout-5f8b-k9:8080 (ID:27710) -> store/frontend-7c9d-x2 :44214 (ID:18822) to-endpoint FORWARDED (TCP Flags: SYN, ACK)",
          ask: "Interpret the Hubble output to say exactly what is failing and why it is intermittent, then find the responsible policy.",
          parts: [
            part(
              "Reading the flows",
              "Drops are frontend -> checkout on 8443 with verdict Policy denied at SYN (an L3/L4 policy drop, no connection); the same frontend identity to checkout on 8080 is FORWARDED; so a policy allows 8080 but not 8443 -- the app alternates ports (e.g. a TLS endpoint on 8443 and plain on 8080), which is the intermittency.",
              "Every drop has the same shape: identity 18822 (frontend) to identity 27710 (checkout) on port 8443, dropped at the SYN with reason Policy denied -- an L3/L4 decision, before any L7 proxy. The forwarded flows are the same pair on 8080. So frontend is allowed to reach checkout:8080 but not checkout:8443; calls that use the TLS port fail, the rest succeed, which looks intermittent from the application's point of view. Hubble's identity numbers confirm it is not a labelling mismatch: the same identity is allowed on one port and denied on another."
            ),
            part(
              "Finding the policy",
              "Hubble's drop lines do not name the policy, so list policies selecting checkout: kubectl -n store get cnp,ccnp and inspect endpointSelectors, or use cilium-dbg endpoint get on checkout's endpoint for its policy status; look for the ingress toPorts list missing 8443; hubble observe -o json shows the egress/ingress enforcement and the policy verdict details.",
              "kubectl -n store get ciliumnetworkpolicies -o yaml | grep -B3 -A12 'app: checkout' will show the policy whose endpointSelector matches checkout; its ingress toPorts lists 8080 only -- the recent change presumably removed 8443 or added the policy fresh. For precision, on the node running checkout: kubectl -n kube-system exec <cilium-agent-on-that-node> -- cilium-dbg endpoint list | grep checkout, then cilium-dbg endpoint get <id> -o jsonpath='{[0].status.policy.realized.l4.ingress}' lists the allowed L4 rules and their source policies. hubble observe -o jsonpb shows the drop_reason_desc as POLICY_DENIED, confirming it is policy and not a missing route."
            ),
          ],
        },
        {
          text: "The policy is found: checkout-ingress allows frontend on 8080 only; 8443 was added to the app last week. The team fixes it. The on-call asks how they could have found this in two minutes next time, including with the UI, and why Hubble's flow buffer shows 100%.",
          ask: "Describe the fast path with the Hubble CLI and UI, and explain the buffer figure.",
          parts: [
            part(
              "Fast path",
              "CLI: hubble observe --verdict DROPPED -n <ns> --since 10m, optionally --type drop --to-pod/--from-pod, --protocol or --port filters, and -o compact/json; UI: open the namespace's service map, where dropped flows are red edges between services with the port and verdict in the flow table; the identity numbers and port tell you which policy to inspect.",
              "CLI, two minutes: hubble observe -n store --verdict DROPPED --since 10m (optionally --to-pod store/checkout or --port 8443) -> the drop lines name source identity, destination, port and reason. Then hubble observe -n store --to-pod store/checkout --verdict FORWARDED to see what IS allowed. UI: select namespace store; the service map draws frontend -> checkout with a red edge for drops; clicking it lists flows with verdict, port and L7 info, and filtering by verdict=dropped isolates them. Either way the answer is 'policy drop on 8443 from frontend', which points straight at the policy selecting checkout."
            ),
            part(
              "The 100% buffer",
              "Each agent keeps a ring buffer of recent flows (default 4095 per node; here the relay reports 12,285 of 12,285), so Hubble shows only recent history -- at 83 flows/s this is a couple of minutes; for longer retention export flows (Hubble export to files or to a log pipeline) or use Hubble metrics in Prometheus.",
              "Current/Max Flows 12,285/12,285 means the in-memory ring buffers across the connected agents are full -- normal; new flows overwrite the oldest. At 83 flows/s the buffer covers roughly two to three minutes, so hubble observe is a window on the recent past, not a log. For incidents noticed later, enable Hubble's flow export (hubble.export.static or dynamic, writing JSON to a file picked up by the log pipeline) and the Hubble metrics (hubble.metrics.enabled with drop and flow metrics) so Prometheus keeps counts by source, destination and reason over time."
            ),
          ],
        },
      ],
    },
    {
      slug: "l7-visibility",
      objective: "Configure Layer 7 protocol visibility: visibility annotations and L7 policy rules that make HTTP, DNS and Kafka visible in Hubble",
      kind: "build",
      title: "Turn on HTTP and DNS visibility for a namespace without changing policy intent",
      brief:
        "The fictional travel company Kestrel Journeys wants Hubble to show HTTP methods, paths and status codes for its booking Pods and DNS queries for all Pods in namespace travel, for debugging. Today Hubble shows only L3/L4 flows there. The booking Pods already have a CiliumNetworkPolicy allowing ingress on 8080 from frontend with no L7 rules; the team does not want to restrict any HTTP paths yet.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Explain how L7 visibility works in Cilium, write the change that makes HTTP and DNS visible without blocking anything, and show what Hubble will display.",
          parts: [
            part(
              "How L7 visibility works",
              "L7 details appear in Hubble only when traffic passes through Cilium's L7 proxy (Envoy for HTTP/Kafka, the agent's DNS proxy for DNS); the proxy is engaged either by an L7 rule in a policy or by a visibility annotation on the Pod; the eBPF datapath alone sees L3/L4.",
              "The eBPF datapath sees packets, not requests. For Hubble to print GET /api/bookings 200 or 'DNS query api.partner.example', the flow must be redirected through a proxy that parses the protocol: Envoy for HTTP, gRPC and Kafka, Cilium's DNS proxy for DNS. Cilium engages the proxy when a policy has an L7 rule for that port, or when a Pod carries the policy.cilium.io/proxy-visibility annotation listing ports and protocols."
            ),
            part(
              "HTTP visibility with an allow-all L7 rule",
              "Add an http rule that matches everything (rules: http: [{}]) to the existing toPorts entry for 8080 in the booking policy, so traffic goes through Envoy but every request is allowed; alternatively annotate the Pods with policy.cilium.io/proxy-visibility: \"<Ingress/8080/TCP/HTTP>\"; explains the empty rule allows all while enabling parsing.",
              "In the existing CiliumNetworkPolicy for booking:\n  ingress:\n  - fromEndpoints:\n    - matchLabels: {app: frontend}\n    toPorts:\n    - ports: [{port: \"8080\", protocol: TCP}]\n      rules:\n        http:\n        - {}\nAn empty http rule matches every request: the flow now goes through Envoy (so Hubble sees method, path, status and latency) but nothing is denied -- the L3/L4 intent is unchanged. The alternative without touching policy is the Pod annotation policy.cilium.io/proxy-visibility: \"<Ingress/8080/TCP/HTTP>\" on the booking Pod template."
            ),
            part(
              "DNS visibility for the namespace",
              "A CiliumNetworkPolicy selecting all Pods in travel (endpointSelector {}) with an egress rule to kube-dns on 53 UDP/TCP carrying rules.dns matchPattern \"*\" -- which allows all queries and makes them visible; because this policy defines egress, add an egress rule allowing everything else (toEntities all or toEndpoints {} plus toEntities world) so no existing traffic is cut; or use the proxy-visibility annotation Egress/53/UDP/DNS per Pod.",
              "apiVersion: cilium.io/v2\nkind: CiliumNetworkPolicy\nmetadata: {name: dns-visibility, namespace: travel}\nspec:\n  endpointSelector: {}\n  egress:\n  - toEndpoints:\n    - matchLabels:\n        k8s:io.kubernetes.pod.namespace: kube-system\n        k8s-app: kube-dns\n    toPorts:\n    - ports: [{port: \"53\", protocol: UDP}, {port: \"53\", protocol: TCP}]\n      rules:\n        dns:\n        - matchPattern: \"*\"\n  - toEntities: [all]\nmatchPattern \"*\" allows every query while routing them through the DNS proxy, so Hubble shows each lookup and answer. Because an egress rule now selects every Pod in travel, the namespace would become egress default-deny -- the second rule (toEntities: [all]) keeps all other egress open, preserving current behaviour. Per-Pod alternative: policy.cilium.io/proxy-visibility: \"<Egress/53/UDP/DNS>\"."
            ),
            part(
              "What Hubble shows and the cost",
              "hubble observe -n travel --protocol http shows lines with method, path, status code and latency; --protocol dns shows query names, record types and answers; cost: L7 flows add proxy hops and CPU, and a visibility annotation or allow-all rule is a step toward real L7 policy later.",
              "hubble observe -n travel --protocol http -f\n  travel/frontend-x -> travel/booking-y:8080 http-request FORWARDED (HTTP/1.1 GET http://booking/api/bookings/42)\n  travel/booking-y -> travel/frontend-x http-response FORWARDED (HTTP/1.1 200 12ms)\nhubble observe -n travel --protocol dns -f\n  travel/booking-y -> kube-system/coredns-z:53 dns-request FORWARDED (DNS Query api.partner.example. A)\n  kube-system/coredns-z -> travel/booking-y dns-response FORWARDED (DNS Answer \"203.0.113.9\" TTL: 30)\nEach L7-visible flow costs a proxy traversal (microseconds of latency, some CPU per node), so enable it where debugging value justifies it. The allow-all http rule is also the natural starting point for tightening to real paths later."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 10%
    {
      slug: "install-and-connectivity-test",
      objective: "Use the Cilium CLI to install Cilium, run connectivity tests and monitor its status: cilium install, cilium connectivity test, cilium status --wait",
      kind: "build",
      title: "Install Cilium on a fresh kubeadm cluster and prove it works",
      brief:
        "The fictional engineering firm Rydal Systems has just run kubeadm init with --pod-network-cidr=10.244.0.0/16 and --skip-phases=addon/kube-proxy on a three-node cluster. Nodes are NotReady because no CNI is installed. They want Cilium installed as the CNI with kube-proxy replacement and Hubble enabled, and they want evidence it works before deploying anything.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the installation commands (CLI or Helm), the checks you run and what each proves, and the connectivity test.",
          parts: [
            part(
              "Install",
              "cilium install with --set kubeProxyReplacement=true, --set k8sServiceHost/k8sServicePort pointing at the API server (needed without kube-proxy so the agent can reach the API before Services work), IPAM mode kubernetes (to use kubeadm's podCIDR) or cluster-pool matching 10.244.0.0/16, and --set hubble.relay.enabled=true --set hubble.ui.enabled=true; or the equivalent helm install.",
              "cilium install --version <current stable> \\\n  --set kubeProxyReplacement=true \\\n  --set k8sServiceHost=10.20.0.10 --set k8sServicePort=6443 \\\n  --set ipam.mode=kubernetes \\\n  --set hubble.relay.enabled=true --set hubble.ui.enabled=true\n(Equivalent: helm install cilium cilium/cilium -n kube-system with the same --set values.) Without kube-proxy, the agent has no ClusterIP for kubernetes.default yet, so k8sServiceHost/Port must point at the real API endpoint. ipam.mode=kubernetes reuses the podCIDR kubeadm assigned per node from 10.244.0.0/16. The CLI picks sensible defaults for the detected cluster and writes the Helm values it used."
            ),
            part(
              "Status checks",
              "cilium status --wait until the agent, operator, Hubble relay and UI are OK and all nodes Ready; kubectl get nodes shows Ready; cilium config view shows the effective configuration (kube-proxy-replacement true, routing mode, IPAM); explains what each line of cilium status reports.",
              "cilium status --wait\n    /¯¯\\\\n /¯¯\\\\__/¯¯\\\\    Cilium:             OK\n \\\\__/¯¯\\\\__/    Operator:           OK\n /¯¯\\\\__/¯¯\\\\    Envoy DaemonSet:    OK\n \\\\__/¯¯\\\\__/    Hubble Relay:       OK\n    \\\\__/       ClusterMesh:        disabled\nDaemonSet  cilium  Desired: 3, Ready: 3/3, Available: 3/3\nKubeProxyReplacement: True ...\nkubectl get nodes -> all Ready once the CNI is up. cilium config view | grep -E 'kube-proxy-replacement|routing-mode|ipam' confirms the settings took effect. cilium status is the single health view: agent and operator readiness per node, Hubble, cluster mesh, and any errors or warnings the agents report."
            ),
            part(
              "Connectivity test",
              "cilium connectivity test deploys client/echo Pods in a cilium-test namespace and runs pod-to-pod (same and cross node), pod-to-service, pod-to-host, pod-to-world, policy and (if enabled) L7 and encryption checks, reporting passed/failed per test; explains the output and clean-up.",
              "cilium connectivity test\n  [cilium-test] Creating namespace cilium-test for connectivity check...\n  ... deploys echo, client, client2, host-netns Pods ...\n  [=] Test [no-policies] ... pod-to-pod, pod-to-service, pod-to-host, pod-to-world\n  [=] Test [client-ingress] ... policy enforcement\n  [=] Test [dns-only], [to-entities-world], [echo-ingress-l7] ...\n  ✅ All 45 tests (300 actions) successful, 10 tests skipped, 0 scenarios skipped.\nEach test asserts real traffic across nodes and through Services and policies, so a pass is evidence the datapath, kube-proxy replacement and policy enforcement work on this cluster. Clean up with cilium connectivity test --cleanup (or delete the cilium-test namespace)."
            ),
            part(
              "Hubble proof",
              "cilium hubble port-forward then hubble status and hubble observe showing flows from the connectivity test, and cilium hubble ui to open the service map; explains that seeing cross-node flows with FORWARDED verdicts closes the loop.",
              "cilium hubble port-forward &\nhubble status                         # nodes connected 3/3, flows flowing\nhubble observe -n cilium-test --last 10   # client -> echo flows FORWARDED across nodes\ncilium hubble ui                      # service map of cilium-test\nFlows between client and echo Pods on different nodes with FORWARDED verdicts, plus Hubble reporting all three nodes connected, are the visible proof the installation is healthy end to end."
            ),
          ],
        },
      ],
    },
    {
      slug: "config-change-with-cli",
      objective: "Know how to use the Cilium CLI to query and modify the configuration: cilium status, cilium config view and set, and Helm values",
      kind: "case",
      title: "Change a Cilium setting safely and know when the agent restarts",
      brief:
        "The fictional media firm Oakhurst Streams needs to turn on Hubble metrics and change the policy enforcement mode on a running production Cilium cluster installed with Helm. An engineer tried 'cilium config set' last week and the agents restarted during business hours, which surprised everyone.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ cilium config view | grep -E 'enable-policy|hubble-metrics|hubble-disable'\nenable-policy                 default\nhubble-disable-tls            false\n\n$ helm -n kube-system get values cilium | head -8\nUSER-SUPPLIED VALUES:\nhubble:\n  relay:\n    enabled: true\n  ui:\n    enabled: true\nipam:\n  mode: kubernetes\n\n$ kubectl -n kube-system get cm cilium-config -o jsonpath='{.metadata.annotations}' | head -c 200\n{}",
          ask: "Explain where Cilium's running configuration lives and why 'cilium config set' restarted the agents, then make the two changes the right way for a Helm-managed cluster.",
          parts: [
            part(
              "Where configuration lives",
              "The agents read the cilium-config ConfigMap in kube-system (rendered from Helm values); cilium config view prints it; cilium config set edits the ConfigMap and, by default, restarts the agent DaemonSet so the change is picked up (--restart=false avoids it but leaves agents on old values until they restart anyway); on a Helm-managed install, edits made with cilium config set drift from the Helm values and are overwritten by the next helm upgrade.",
              "Every agent reads its options from the cilium-config ConfigMap, which Helm renders from the chart values. cilium config view is a formatted dump of that ConfigMap; cilium config set KEY VALUE patches the ConfigMap and then does a rolling restart of the cilium DaemonSet because the agent reads most options only at start -- that is the business-hours restart. On a Helm-installed cluster it is also a trap: the ConfigMap now differs from the Helm values, so the next helm upgrade --reuse-values silently reverts the manual change."
            ),
            part(
              "Make the changes with Helm",
              "helm upgrade cilium cilium/cilium -n kube-system --reuse-values --set hubble.metrics.enabled='{dns,drop,tcp,flow,port-distribution,icmp,httpV2}' --set policyEnforcementMode=always, run in a maintenance window because the agents will roll; verify afterwards with cilium config view and cilium status; keep the values in Git.",
              "helm upgrade cilium cilium/cilium -n kube-system --reuse-values \\\n  --set hubble.metrics.enableOpenMetrics=true \\\n  --set 'hubble.metrics.enabled={dns,drop,tcp,flow,port-distribution,icmp,httpV2:exemplars=true;labelsContext=source_ip\\,source_namespace\\,source_workload\\,destination_ip\\,destination_namespace\\,destination_workload\\,traffic_direction}' \\\n  --set policyEnforcementMode=always\nkubectl -n kube-system rollout status ds/cilium\ncilium config view | grep -E 'enable-policy|hubble-metrics'   # enable-policy always; hubble-metrics listed\nThe upgrade rewrites cilium-config and rolls the agents -- schedule it. Commit the values file (helm get values cilium > cilium-values.yaml, edited) to Git so the configuration is reproducible and the next upgrade uses -f cilium-values.yaml instead of --reuse-values."
            ),
          ],
        },
        {
          text: "The change goes in during the window. Minutes later, Pods in namespace legacy, which has no network policies at all, lose all connectivity.",
          ask: "Explain what happened and fix it with the least disruption.",
          parts: [
            part(
              "Cause",
              "policyEnforcementMode always makes every endpoint default-deny in both directions whether or not a policy selects it; namespaces with no policies -- legacy -- go dark; default mode denies only endpoints that at least one policy selects (per direction), which is what legacy relied on.",
              "In default mode an endpoint is restricted only once a policy selects it (and only in the directions that policy defines). always flips the model: every endpoint is default-deny for ingress and egress until a policy allows traffic. legacy had no policies, so after the agents restarted with enable-policy always, nothing in that namespace could send or receive. That is the documented meaning of the mode, not a bug."
            ),
            part(
              "Least-disruptive fix",
              "Either revert policyEnforcementMode to default (another rolling restart) or, faster and without restarting agents, add an allow-all CiliumNetworkPolicy to legacy (endpointSelector {} with ingress fromEntities all and egress toEntities all) and to any other policy-less namespace, which restores traffic within seconds since policies apply live; then decide namespace by namespace what real policies should be, and consider enforcing 'always' only after every namespace has a policy.",
              "Policies take effect without restarts, so the fastest fix is a namespace allow-all:\napiVersion: cilium.io/v2\nkind: CiliumNetworkPolicy\nmetadata: {name: allow-all-legacy, namespace: legacy}\nspec:\n  endpointSelector: {}\n  ingress: [{fromEntities: [all]}]\n  egress: [{toEntities: [all]}]\nkubectl apply restores connectivity in seconds; repeat for any other namespace without policies (kubectl get cnp -A shows which have none). Then either keep always and tighten namespace by namespace, or roll back to default with Helm in the next window if the organisation is not ready. Lesson: switching to always is a cluster-wide default-deny and needs an inventory of policy-less namespaces first."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 10%
    {
      slug: "clustermesh-global-service",
      objective: "Configure service discovery and load balancing across clusters with Cluster Mesh: cilium clustermesh enable and connect, global services, and affinity annotations",
      kind: "build",
      title: "Connect two clusters with Cluster Mesh and make a service global",
      brief:
        "The fictional payments firm Wendover runs two Cilium clusters, eu-1 and eu-2, in different data centres with routable node networks and non-overlapping Pod CIDRs. They want the Service ledger (namespace fin) to be reachable from Pods in either cluster by its normal name, with requests preferring the local cluster's backends and failing over to the other cluster when local backends are gone.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the Cluster Mesh prerequisites and commands, the Service annotations, and explain how discovery and load balancing behave.",
          parts: [
            part(
              "Prerequisites",
              "Each cluster has a unique cluster.name and cluster.id (1-255) in its Cilium config, non-overlapping Pod CIDRs, node-to-node reachability on the clustermesh-apiserver port, and the same CA (the CLI handles certificates); explains why ids and CIDRs must not clash.",
              "Cilium on each cluster must be installed with distinct cluster.name (eu-1, eu-2) and cluster.id (1 and 2) -- the id is encoded into security identities so endpoints from different clusters never collide. Pod CIDRs must not overlap because Pod IPs are routed directly between clusters. Nodes must reach the other cluster's clustermesh-apiserver (exposed by a LoadBalancer or NodePort Service). The CLI shares a common CA between the clusters when connecting, so both trust each other's certificates."
            ),
            part(
              "Enable and connect",
              "cilium clustermesh enable --context eu-1 (and eu-2), optionally --service-type LoadBalancer, then cilium clustermesh connect --context eu-1 --destination-context eu-2 (which configures both sides), then cilium clustermesh status --wait on each; explains the clustermesh-apiserver exposes each cluster's state (nodes, identities, endpoints, services) for the other's agents to read.",
              "cilium clustermesh enable --context eu-1 --service-type LoadBalancer\ncilium clustermesh enable --context eu-2 --service-type LoadBalancer\ncilium clustermesh connect --context eu-1 --destination-context eu-2\ncilium clustermesh status --context eu-1 --wait\n  ✅ Service \"clustermesh-apiserver\" of type \"LoadBalancer\" found\n  ✅ All 3 nodes are connected to all clusters [min:1 / avg:1.0 / max:1]\n  🔌 Cluster Connections: eu-2: 3/3 configured, 3/3 connected\nEach cluster runs a clustermesh-apiserver backed by etcd that publishes its nodes, identities, endpoints and global services; the remote cluster's agents connect to it and learn routes and identities, so cross-cluster Pod IPs become routable and policies can reference identities from both clusters."
            ),
            part(
              "Global service with local affinity",
              "Annotate the Service ledger in both clusters with service.cilium.io/global: \"true\" (same name and namespace in each) so backends from both clusters are merged behind the ClusterIP, and service.cilium.io/affinity: \"local\" so local endpoints are preferred and remote ones used only when no local endpoint is healthy; optionally service.cilium.io/shared: \"false\" on a cluster that should consume but not contribute backends.",
              "In both clusters:\nkubectl -n fin annotate service ledger service.cilium.io/global=\"true\" service.cilium.io/affinity=\"local\"\nThe Service must exist with the same name and namespace in each cluster. global merges the endpoints of eu-1's and eu-2's ledger Pods into the load-balancing map behind each cluster's own ClusterIP, so ledger.fin.svc resolves locally as always but may be served from either cluster. affinity=local routes to local backends while any are healthy and fails over to remote ones when none are -- exactly the preference asked for (affinity=remote inverts it; no annotation balances across all). shared=\"false\" on one side would make it a consumer only."
            ),
            part(
              "Verification and policy note",
              "cilium clustermesh status shows global services synchronised; cilium-dbg service list on an agent shows the ledger frontend with backends from both clusters (remote ones flagged); scale eu-1's ledger to 0 and watch traffic from eu-1 Pods succeed via eu-2 in Hubble; mentions that network policies can select remote endpoints by labels including io.cilium.k8s.policy.cluster.",
              "kubectl -n kube-system exec ds/cilium --context eu-1 -- cilium-dbg service list | grep ledger   # backends include eu-2 Pod IPs\nkubectl --context eu-1 -n fin scale deploy/ledger --replicas=0\nhubble observe --context eu-1 -n fin --to-service fin/ledger   # flows now FORWARDED to eu-2 backends\nScale back up and traffic returns to local backends. Policies work across the mesh because identities are shared: a CiliumNetworkPolicy can restrict a global service's callers to a cluster with matchLabels io.cilium.k8s.policy.cluster: eu-1."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 10%
    {
      slug: "ebpf-vs-iptables",
      objective: "eBPF-based platforms versus iptables-based platforms: per-packet cost, rule-chain growth, kube-proxy replacement and identity-aware policy",
      kind: "build",
      title: "Explain to a network team why Cilium replaces kube-proxy and iptables",
      brief:
        "The fictional bank Halford & Co's network team has run iptables-based Kubernetes networking for years and asks why the platform team wants to adopt Cilium. They have 4,000 Services and 30,000 Pods across their clusters and have seen kube-proxy rule updates take tens of seconds. They want a plain-language, accurate explanation they can check.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the explanation: what eBPF is, how Cilium uses it, what changes versus iptables and kube-proxy, and what does not change or gets harder.",
          parts: [
            part(
              "What eBPF is and why it is safe",
              "eBPF lets small programs run inside the Linux kernel at defined hook points (network devices, sockets, tracepoints) after a verifier proves they terminate and access memory safely, and a JIT compiles them to native code; no kernel modules, no reboot, updated at runtime.",
              "eBPF is a way to run small, verified programs inside the kernel at specific hooks -- when a packet arrives on an interface, when a socket connects, when a syscall happens. Before loading, the kernel's verifier checks every path of the program terminates and touches only memory it is allowed to, then a JIT turns it into native machine code. Cilium can therefore change how the kernel handles packets at runtime, safely, without kernel modules or reboots."
            ),
            part(
              "How Cilium uses it",
              "Cilium attaches eBPF programs to Pod interfaces and the node's devices to do routing, policy and load balancing with lookups in eBPF maps (hash tables keyed by identity, service address, etc.) rather than walking rule lists; kube-proxy replacement does Service load balancing at the socket layer (connect-time translation) and in the datapath, and policy decisions use numeric identities derived from labels.",
              "Cilium loads eBPF programs on each Pod's veth and on the node interfaces. A packet triggers a program that looks up what to do in eBPF maps -- hash tables: 'is identity 18822 allowed to talk to identity 27710 on 8443?', 'which backend serves ClusterIP 10.96.4.2:80?'. Lookups are O(1) regardless of how many Services or policies exist. With kube-proxy replacement, a Pod's connect() to a ClusterIP is rewritten to a backend address at the socket layer, so the packet never carries the virtual IP at all; NodePort and LoadBalancer traffic is handled in the device-level program."
            ),
            part(
              "What changes versus iptables/kube-proxy",
              "iptables evaluates chains linearly, so cost grows with the number of rules (thousands of Services mean thousands of rules per packet) and updates rewrite large rule sets (the tens-of-seconds pain); eBPF maps give constant-time lookups and incremental updates; kube-proxy's IP-based rules cannot express identity, while Cilium's policy keys on labels; plus built-in observability (Hubble) from the same hooks.",
              "iptables is a list: every packet walks chains until a rule matches, and with 4,000 Services the KUBE-SERVICES chain alone is thousands of rules, so per-packet latency grows with cluster size and each change rewrites the whole table -- the slow updates the team has seen. eBPF maps are hash tables: one lookup per decision whatever the cluster size, and a Service change updates one map entry. Policy also changes nature: iptables matches IPs, which churn with every Pod restart; Cilium matches identities derived from labels, so 'frontend may call checkout' stays true as Pods come and go. And because the same programs see every packet, Hubble can report flows and drops with no extra agents."
            ),
            part(
              "What does not change or gets harder",
              "Kernel version requirements (recent kernels for full features), a new skill set and tooling (cilium-dbg, bpftool, eBPF maps instead of iptables -L), fewer people who can debug it, some features still proxy-based (L7), and host firewall rules on nodes still need thought (Cilium host policies or existing firewalls); honest about the learning curve.",
              "The trade-offs: full feature sets want recent kernels (the exact minimum depends on the Cilium release and feature -- check the docs for your distribution); the team's iptables -L habit becomes cilium-dbg bpf lb list, cilium-dbg policy get and Hubble, a real retraining cost; fewer engineers can debug eBPF when something is strange; L7 policy and Gateway API still run through a userspace proxy (Envoy), so those paths are not 'pure eBPF'; and node-level firewalling is now a Cilium host policy question rather than a plain iptables one. The performance and scale case is strong at 4,000 Services; the operational case depends on the team learning the new tools."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 6%
    {
      slug: "bgp-advertise-cidrs",
      objective: "Understand options to connect Cilium-managed clusters with external networks: the BGP control plane (peering policies, advertised Pod CIDRs and LoadBalancer IPs) and LB IPAM",
      kind: "build",
      title: "Advertise Pod and LoadBalancer addresses to the data-centre routers with BGP",
      brief:
        "The fictional manufacturer Brindley Steel runs an on-premises Cilium cluster in native routing mode. The network team has given them ASN 65010 for the cluster, their top-of-rack routers peer at 10.50.0.1 and 10.50.0.2 in ASN 65000, and a range 192.0.2.0/24 reserved for LoadBalancer addresses. The cluster must advertise its Pod CIDRs so external systems can reach Pods directly, and Services of type LoadBalancer must receive addresses from the reserved range and be reachable from the plant network.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the Cilium BGP control plane and LB IPAM configuration and explain how routes flow.",
          parts: [
            part(
              "Enable BGP and define the peering",
              "bgpControlPlane.enabled=true in Helm; a CiliumBGPClusterConfig selecting nodes (nodeSelector) with localASN 65010 and peers for 10.50.0.1 and 10.50.0.2 (peerASN 65000) referencing a CiliumBGPPeerConfig; explains each selected node runs a BGP speaker (GoBGP in the agent) that peers with the routers.",
              "helm upgrade cilium cilium/cilium -n kube-system --reuse-values --set bgpControlPlane.enabled=true\n---\napiVersion: cilium.io/v2\nkind: CiliumBGPClusterConfig\nmetadata: {name: plant}\nspec:\n  nodeSelector:\n    matchLabels: {rack: a}\n  bgpInstances:\n  - name: instance-65010\n    localASN: 65010\n    peers:\n    - name: tor-1\n      peerASN: 65000\n      peerAddress: 10.50.0.1\n      peerConfigRef: {name: tor-peers}\n    - name: tor-2\n      peerASN: 65000\n      peerAddress: 10.50.0.2\n      peerConfigRef: {name: tor-peers}\nEvery node matching the selector runs a BGP speaker inside the Cilium agent and opens sessions to both top-of-rack routers. (The BGP and LB IPAM resources are cilium.io/v2 in current releases, read 2026-11-09; older releases served them as v2alpha1, so check the version for the installed Cilium.)"
            ),
            part(
              "Peer config and what to advertise",
              "A CiliumBGPPeerConfig with timers, gracefulRestart and families ipv4/unicast referencing a CiliumBGPAdvertisement; the advertisement selects PodCIDR and Service advertisements for LoadBalancer IPs (service.addresses: [LoadBalancerIP]) with a selector for which Services; explains the routers then learn a /24 per node for Pods and /32s for LoadBalancer addresses.",
              "apiVersion: cilium.io/v2\nkind: CiliumBGPPeerConfig\nmetadata: {name: tor-peers}\nspec:\n  gracefulRestart: {enabled: true}\n  families:\n  - afi: ipv4\n    safi: unicast\n    advertisements:\n      matchLabels: {advertise: plant}\n---\napiVersion: cilium.io/v2\nkind: CiliumBGPAdvertisement\nmetadata:\n  name: plant\n  labels: {advertise: plant}\nspec:\n  advertisements:\n  - advertisementType: PodCIDR\n  - advertisementType: Service\n    service:\n      addresses: [LoadBalancerIP]\n    selector:\n      matchExpressions:\n      - {key: somekey, operator: NotIn, values: [never-used-value]}\nEach node advertises its own Pod CIDR (a /24), so the routers can forward to any Pod IP directly -- native routing with no encapsulation. LoadBalancer IPs are advertised as /32 host routes from the nodes that have local backends (externalTrafficPolicy Local) or from all selected nodes (Cluster). The selector with NotIn/never-used-value is the documented way to say 'all Services'."
            ),
            part(
              "LB IPAM",
              "A CiliumLoadBalancerIPPool with the 192.0.2.0/24 block (optionally a serviceSelector) so Cilium assigns LoadBalancer addresses itself (no cloud provider); explains how a Service of type LoadBalancer gets an address and how BGP then makes it reachable.",
              "apiVersion: cilium.io/v2\nkind: CiliumLoadBalancerIPPool\nmetadata: {name: plant-pool}\nspec:\n  blocks:\n  - cidr: 192.0.2.0/24\nWhen a Service of type LoadBalancer is created, Cilium's operator allocates an address from the pool into status.loadBalancer.ingress -- the role a cloud controller plays in the cloud. The BGP speakers then advertise that address to the routers, so plant systems reach 192.0.2.x and the routers forward to a node, where the eBPF load balancer sends the packet to a backend Pod."
            ),
            part(
              "Verification",
              "cilium bgp peers shows sessions Established with received/advertised prefix counts; cilium bgp routes advertised ipv4 unicast lists the Pod CIDRs and LB IPs per node; on the router, show ip bgp neighbors / routes confirms learned prefixes; a ping/curl from a plant host to a Pod IP and to a LoadBalancer address proves the path.",
              "cilium bgp peers\n  Node    Local AS  Peer AS  Peer Address  Session State  Uptime  Family        Received  Advertised\n  node-1  65010     65000    10.50.0.1     established    2m10s   ipv4/unicast  2         3\ncilium bgp routes advertised ipv4 unicast   # 10.244.1.0/24 (node-1's PodCIDR), 192.0.2.10/32 (LB IP) ...\nOn the router: the cluster's /24s and /32s appear with next-hop the node addresses. From a plant workstation: curl http://192.0.2.10/ answers from the Service and ping 10.244.1.17 reaches the Pod directly."
            ),
          ],
        },
      ],
    },
  ],
};
