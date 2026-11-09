import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-172: Google Cloud Professional Cloud Network Engineer.
//
// Aligned to the exam guide's six sections (Designing and planning a VPC
// network ~21%, Implementing a VPC network ~20%, Managed network services
// ~16%, Hybrid and multicloud interconnectivity ~16%, Network operations
// ~14%, Network security ~13%), re-read 2026-11-09 in the guide PDF
// (042426, the April 24, 2026 guide) that the certification page links.
// Density ("hybrid"): 2 / 2 / 2 / 2 / 2 / 2 = 12 labs (7 build, 5 case).
//
// Every figure a rubric relies on was read on docs.cloud.google.com on
// 2026-11-09 (sources[]):
//   - 99.99% Dedicated Interconnect: at least 4 connections, 2 in each of 2
//     metros across both edge availability domains, VLAN attachments in at
//     least 2 regions with a Cloud Router per region, and global dynamic
//     routing (the multi-region layout).
//   - HA VPN 99.99% SLA: at least one tunnel on each HA VPN interface, BGP
//     (dynamic) routing; a one-IP peer uses SINGLE_IP_INTERNALLY_REDUNDANT,
//     a two-IP peer TWO_IPS_REDUNDANCY.
//   - Cloud NAT: 64,512 ports per NAT IP (ports 0-1023 unused); default
//     minimum 64 ports per VM (static) or 32 (dynamic); VMs per IP =
//     floor(IPs x 64,512 / min ports); one connection per NAT tuple per
//     unique destination (IP, port, protocol); EIM needs static allocation.
//   - Private Google Access domains private.googleapis.com 199.36.153.8/30
//     and restricted.googleapis.com 199.36.153.4/30 (as read for the GCP
//     security labs, REQ-158, re-checked here).
// Nothing here quotes a price or a quota, which change often.

const CHECKED = "2026-11-09";
const ref = (url: string) => source(url, "reference", CHECKED);

export const GCPNET_LABS: SeedLabSet = {
  trackCode: "GCPNET",
  sources: [
    source("https://services.google.com/fh/files/misc/042426_professional_cloud_network_engineer_exam_guide_english.pdf", "exam_outline", CHECKED),
    source("https://cloud.google.com/learn/certification/guides/cloud-network-engineer", "exam_outline", CHECKED),
    ref("https://docs.cloud.google.com/network-connectivity/docs/interconnect/tutorials/dedicated-creating-9999-availability"),
    ref("https://docs.cloud.google.com/network-connectivity/docs/vpn/concepts/topologies"),
    ref("https://docs.cloud.google.com/nat/docs/ports-and-addresses"),
    ref("https://docs.cloud.google.com/vpc/docs/configure-private-google-access"),
    ref("https://docs.cloud.google.com/vpc/docs/vpc-peering"),
    ref("https://docs.cloud.google.com/network-intelligence-center/docs/connectivity-tests/concepts/overview"),
    ref("https://docs.cloud.google.com/armor/docs/rate-limiting-overview"),
    ref("https://docs.cloud.google.com/kubernetes-engine/docs/concepts/alias-ips"),
  ],
  labs: [
    // ------------------------------------------------------------------
    // Section 1: Designing and planning a VPC network (2)
    // ------------------------------------------------------------------
    {
      slug: "net-ip-plan-hybrid-gke",
      objective:
        "Planning an IP address management strategy: subnets, IPv6, bring-your-own-IP, privately used public IP, Private NAT, non-RFC 1918 addresses, managed services, IPAM automation",
      kind: "build",
      title: "Write the IP plan for a hybrid estate with GKE",
      brief:
        "Fennick Freight (fictional) is moving to Google Cloud. On premises it already uses 10.0.0.0/12 and 192.168.0.0/16, and a partner it connects to uses 10.64.0.0/16. Cloud needs: prod, test and dev environments in us-east4 and europe-west2; one GKE cluster per environment and region, each expected to grow to 200 nodes, 6,000 Pods and 1,500 Services; Cloud SQL through private services access; and room to add a third region next year. Every cloud range must be reachable from on premises over Interconnect without NAT.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the IP address plan for the cloud estate.",
          parts: [
            part(
              "Supernet and overlap check",
              "Reserves one or more cloud supernets that do not overlap 10.0.0.0/12, 192.168.0.0/16 or the partner's 10.64.0.0/16, leaves room for a third region, and says how overlap is checked going forward (a single IPAM record or tool).",
              "Cloud supernet 10.128.0.0/10 -- clear of 10.0.0.0/12 (10.0-10.15), the partner's 10.64.0.0/16 and 192.168/16. Carve it per region (10.128.0.0/13 us-east4, 10.136.0.0/13 europe-west2, 10.144.0.0/13 kept for region 3). Every allocation is recorded in one IPAM sheet/tool and checked against the on-prem and partner ranges before use."
            ),
            part(
              "GKE primary and secondary ranges",
              "Sizes a node (primary) range, a Pod secondary range and a Service secondary range per cluster that fit the stated growth, with the arithmetic (for example 200 nodes fit a /24; 6,000 Pods need more than a /20 at 4,096, so a /19 or larger; 1,500 Services fit a /21), and keeps them inside the supernet.",
              "Per cluster: nodes /24 (256 addresses, room for 200 nodes plus reserved IPs); Pods /18 (16,384) -- 6,000 Pods exceed a /20's 4,096 and with the default per-node Pod CIDR a /18 leaves headroom for 200 nodes; Services /21 (2,048) for 1,500 Services. Example prod us-east4: nodes 10.128.0.0/24, Pods 10.129.0.0/18, Services 10.128.248.0/21."
            ),
            part(
              "Managed services and conserving space",
              "Allocates a named range for private services access (Cloud SQL) inside the plan, and names at least one way to conserve RFC 1918 space if it runs short (non-RFC 1918 or privately used public ranges for Pods, which on premises must not route, or Private NAT), with its trade-off.",
              "Private services access: allocate 10.143.0.0/16 to servicenetworking, advertised to on premises. If space runs short, Pods could move to a non-RFC 1918 range such as 100.64.0.0/10 -- but only if on premises never needs to reach Pods directly; otherwise use Private NAT for the overlapping traffic. Both trade simpler routing for more NAT or exceptions."
            ),
          ],
        },
      ],
    },
    {
      slug: "net-hybrid-connectivity-choice",
      objective:
        "Designing hybrid connectivity: on-premises/branch office, bandwidth and security constraints, Dedicated Interconnect, Partner Interconnect, Cloud VPN, SD-WAN appliances",
      kind: "case",
      title: "Choose the hybrid link for a data centre and twelve branches",
      brief:
        "Halverson Health Supplies (fictional) has one data centre in a colocation facility that also hosts Google's Dedicated Interconnect, and twelve small branch offices on broadband with an existing SD-WAN. Workloads move to us-central1. The data centre will send about 6 Gbps steadily to Cloud, with nightly peaks of 15 Gbps; branches need under 50 Mbps each.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The architect asks for the connectivity design for the data centre and the branches.",
          ask: "Which connection type do you choose for the data centre and for the branches, and why?",
          parts: [
            part(
              "Data centre",
              "Chooses Dedicated Interconnect (the facility is a Google colocation point and sustained multi-Gbps traffic fits 10 Gbps circuits) over Cloud VPN, and sizes circuits for the 15 Gbps peak (two 10 Gbps or larger).",
              "Dedicated Interconnect: Google is present in the same facility and the load (6 Gbps steady, 15 Gbps peaks) is beyond what a few VPN tunnels comfortably carry. At least two 10 Gbps connections cover the peak, more for redundancy."
            ),
            part(
              "Branches",
              "Keeps the branches on internet-based connectivity (HA VPN, or the existing SD-WAN with router appliances / NCC) rather than an Interconnect per branch, citing low bandwidth and many sites.",
              "Branches: HA VPN from each branch, or terminate the existing SD-WAN on router appliances attached to Network Connectivity Center as a hybrid spoke -- 50 Mbps per site does not justify Interconnect."
            ),
          ],
        },
        {
          text: "Security now says the data centre traffic includes regulated records and must be encrypted in transit, and leadership wants the link to meet a 99.99% availability target.",
          ask: "How do you meet the encryption and the availability requirements?",
          parts: [
            part(
              "Encryption",
              "Notes that Interconnect traffic is not encrypted by Google by default and adds an encryption option: HA VPN over Cloud Interconnect, MACsec for Cloud Interconnect, or application-level TLS -- naming the trade-off of the chosen one.",
              "Interconnect is a private circuit but not encrypted by default. Use MACsec on the Dedicated Interconnect links (line-rate, layer 2) or HA VPN over Cloud Interconnect (IPsec, but each tunnel's throughput is lower). TLS in the applications is a complement, not a replacement for a blanket requirement."
            ),
            part(
              "99.99% topology",
              "States the 99.99% Dedicated Interconnect topology: at least four connections, two in each of two metros across both edge availability domains, VLAN attachments in at least two regions each with its own Cloud Router, and global dynamic routing on the VPC.",
              "Four connections minimum: two in metro A (one per edge availability domain) and two in metro B, with VLAN attachments in us-central1 and a second region (for example us-east4), a Cloud Router in each region, and the VPC's dynamic routing mode set to global."
            ),
          ],
        },
      ],
    },

    // ------------------------------------------------------------------
    // Section 2: Implementing a VPC network (2)
    // ------------------------------------------------------------------
    {
      slug: "net-private-google-access",
      objective: "Configuring access to Google APIs and Google-managed services: Private Google Access, public interfaces",
      kind: "build",
      title: "Let VMs without external IPs reach Google APIs",
      brief:
        "Opalcrest Analytics (fictional) runs batch VMs with no external IP addresses in subnet batch-euw2 (10.20.0.0/22, VPC data-vpc). They must read and write Cloud Storage and BigQuery. Security wants the API traffic to use only the VIP range that works with VPC Service Controls, and on-premises servers will later need the same access over the existing Interconnect. The VPC's default route to the internet gateway has not been deleted.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the configuration that gives the VMs (and later on premises) private access to the Google APIs.",
          parts: [
            part(
              "Enable Private Google Access",
              "Enables Private Google Access on the subnet (not the VPC) with a correct gcloud command, and states that it only affects VMs with no external IP.",
              "gcloud compute networks subnets update batch-euw2 --region=europe-west2 --enable-private-ip-google-access. It applies to VMs in that subnet that have only internal IPs."
            ),
            part(
              "DNS and VIP",
              "Chooses restricted.googleapis.com (199.36.153.4/30) because it supports VPC Service Controls, and creates a private Cloud DNS zone for googleapis.com with a CNAME *.googleapis.com to restricted.googleapis.com and A records for the four VIP addresses.",
              "Private zone googleapis.com bound to data-vpc: A restricted.googleapis.com -> 199.36.153.4, .5, .6, .7; CNAME *.googleapis.com -> restricted.googleapis.com. (private.googleapis.com, 199.36.153.8/30, would not enforce the VPC SC-only requirement.)"
            ),
            part(
              "Routes and firewall",
              "Ensures a route to 199.36.153.4/30 with next hop default internet gateway (the existing default route or a specific one) and that egress firewall rules allow 443 to that range.",
              "Keep the default route, or add gcloud compute routes create restricted-apis --network=data-vpc --destination-range=199.36.153.4/30 --next-hop-gateway=default-internet-gateway. Egress firewall: allow tcp:443 to 199.36.153.4/30 if a deny-all egress rule exists."
            ),
            part(
              "On-premises access",
              "Advertises 199.36.153.4/30 from the Cloud Router to on premises as a custom route and has on-premises DNS resolve *.googleapis.com to the restricted VIP.",
              "On the Cloud Router BGP session add a custom advertised range 199.36.153.4/30, and on premises forward or override googleapis.com so *.googleapis.com resolves to the restricted VIPs."
            ),
          ],
        },
      ],
    },
    {
      slug: "net-peering-custom-routes-case",
      objective: "Configuring custom route import/export over VPC Network Peering and Network Connectivity Center",
      kind: "case",
      title: "Why the peered VPC can't reach on premises",
      brief:
        "Brackenridge Media (fictional) has a hub VPC (hub-vpc) with HA VPN to its office (172.16.0.0/16, learned by a Cloud Router as dynamic routes). A spoke VPC (render-vpc) is peered with hub-vpc. Render VMs can reach hub VMs, but not the office.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The routing table of render-vpc shows the hub's subnet routes from peering but no 172.16.0.0/16 route. Peering was created with default settings on both sides.",
          ask: "Why is the office route missing, and what do you change?",
          parts: [
            part(
              "Cause",
              "Explains that peering exchanges subnet routes by default but custom (static and dynamic) routes only when the exporting side enables export and the importing side enables import.",
              "Peering always exchanges subnet routes, but custom routes -- including the dynamic 172.16.0.0/16 learned over the VPN -- are exchanged only with --export-custom-routes on hub-vpc's peering and --import-custom-routes on render-vpc's."
            ),
            part(
              "Fix",
              "Gives the update on both peering configurations.",
              "gcloud compute networks peerings update hub-to-render --network=hub-vpc --export-custom-routes; gcloud compute networks peerings update render-to-hub --network=render-vpc --import-custom-routes."
            ),
          ],
        },
        {
          text: "render-vpc now has the 172.16.0.0/16 route, but office hosts still cannot reach render VMs (10.50.0.0/20). The office router's table has no 10.50.0.0/20.",
          ask: "What is missing in the return direction?",
          parts: [
            part(
              "Return path",
              "Identifies that the hub's Cloud Router advertises only hub subnets by default and must advertise the peered range as a custom advertised route.",
              "By default the Cloud Router advertises only hub-vpc's own subnets. Switch it to custom advertisement: keep all subnets and add 10.50.0.0/20 (render-vpc) as a custom advertised range on the BGP session."
            ),
          ],
        },
        {
          text: "The team plans to add a third VPC (archive-vpc) peered to render-vpc and expects archive VMs to reach hub-vpc through it.",
          ask: "Will that work, and what would you propose instead?",
          parts: [
            part(
              "Transitivity",
              "States that VPC Network Peering is not transitive (archive-vpc will not reach hub-vpc through render-vpc) and proposes peering archive directly to the hub or moving to a Network Connectivity Center hub with VPC spokes.",
              "No -- peering is not transitive, so archive-vpc would only see render-vpc. Peer archive-vpc with hub-vpc directly, or move the spokes onto a Network Connectivity Center hub (VPC spokes), which provides the full mesh and carries hybrid routes via hybrid spokes."
            ),
          ],
        },
      ],
    },

    // ------------------------------------------------------------------
    // Section 3: Configuring managed network services (2)
    // ------------------------------------------------------------------
    {
      slug: "net-alb-backend-settings",
      objective:
        "Configuring load balancer and backend settings: balancing method, session affinity, serving capacity, URL maps, health checks, global access",
      kind: "build",
      title: "Configure the backend service for a global web app",
      brief:
        "Lumenfield Tickets (fictional) serves a web app through a global external Application Load Balancer. Two managed instance groups (us-east1, europe-west1) serve /, and a third MIG in us-east1 serves /api/*. The app keeps shopping-cart state in memory on each VM, so a user should keep reaching the same VM. Each VM handles about 80 requests per second before latency degrades. The app exposes /healthz on port 8080 returning 200 when ready.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the backend services, health check and URL map settings.",
          parts: [
            part(
              "Balancing mode and capacity",
              "Uses RATE balancing with max-rate-per-instance of about 80 (or a slightly lower safety value) so the load balancer spills to another region at capacity, and explains why that is better than default utilization here.",
              "Backend service web-bes: both MIGs with --balancing-mode=RATE --max-rate-per-instance=80 (capacity scaler 1.0). Requests overflow to the other region when one is full, which tracks the known per-VM limit better than CPU utilization."
            ),
            part(
              "Session affinity",
              "Chooses a cookie-based affinity (GENERATED_COOKIE or HTTP_COOKIE) and notes that affinity breaks if a backend fails or capacity forces overflow, so the in-memory cart is a risk to fix later.",
              "Session affinity GENERATED_COOKIE on web-bes. It is best effort: if a VM fails health checks or the backend overflows, users move and lose their cart -- moving the cart to Memorystore removes the dependency."
            ),
            part(
              "Health check",
              "Defines an HTTP health check on port 8080 path /healthz and notes the firewall must allow the Google health-check probe ranges to the backends.",
              "gcloud compute health-checks create http web-hc --port=8080 --request-path=/healthz; firewall rule allowing tcp:8080 from the Google Cloud health-check ranges (130.211.0.0/22 and 35.191.0.0/16) to the backend tags."
            ),
            part(
              "URL map",
              "Routes /api/* to a separate api backend service and everything else to the web backend service.",
              "URL map web-map: default service web-bes; path matcher with path rule /api/* -> api-bes (the us-east1 API MIG, own health check)."
            ),
          ],
        },
      ],
    },
    {
      slug: "net-dns-failover-routing-case",
      objective: "Configuring Cloud DNS routing policies: geolocation, failover",
      kind: "case",
      title: "Route users to the nearest healthy region with Cloud DNS",
      brief:
        "Corvel Learning (fictional) runs a regional API behind internal passthrough Network Load Balancers in us-west1 and asia-southeast1 for its private clients that connect over Interconnect. Clients resolve api.corvel.internal from a private Cloud DNS zone. Today an A record points only to the us-west1 load balancer.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Asian clients complain about latency, and the business wants each client to use its nearest region.",
          ask: "Which Cloud DNS routing policy do you configure, and how?",
          parts: [
            part(
              "Policy",
              "Replaces the plain record with a geolocation routing policy whose items map client source regions (us-west1, asia-southeast1) to the matching load balancer IPs, and notes that clients outside listed regions get the nearest item.",
              "A geolocation (GEO) routing policy on api.corvel.internal: us-west1 -> 10.10.0.10 (us-west1 ILB), asia-southeast1 -> 10.30.0.10 (asia ILB). Queries from regions without an item go to the nearest configured location."
            ),
          ],
        },
        {
          text: "During a test, the asia-southeast1 backends were stopped, but Asian clients kept getting 10.30.0.10 and failed.",
          ask: "What do you change so a failed region is skipped automatically?",
          parts: [
            part(
              "Health-checked failover",
              "Enables health checking on the routing policy by referencing the internal load balancers (forwarding rules) so unhealthy targets are excluded, or uses a failover policy with a primary and backup set.",
              "Turn on health checks for the geolocation policy by using the internal load balancers' forwarding rules as the items' targets (instead of raw IPs), so Cloud DNS drops an item whose backends are unhealthy and answers with the other region. Alternative: a failover policy with asia as primary and us-west1 as backup for Asian clients."
            ),
            part(
              "Test",
              "Describes repeating the outage test and checking the answer (dig/nslookup from an Asian client) and client error rate.",
              "Stop the asia backends again; from an Asian client run dig api.corvel.internal and expect 10.10.0.10 once health checks fail; confirm the client error rate recovers."
            ),
          ],
        },
      ],
    },

    // ------------------------------------------------------------------
    // Section 4: Hybrid and multicloud interconnectivity (2)
    // ------------------------------------------------------------------
    {
      slug: "net-interconnect-9999-design",
      objective: "Implementing 99.9% and 99.99% SLA interconnect topologies",
      kind: "build",
      title: "Turn a 99.9% Interconnect into a 99.99% one",
      brief:
        "Tamsworth Bank (fictional) has two Dedicated Interconnect connections in the Ashburn metro, one in each edge availability domain, with VLAN attachments to a Cloud Router in us-east4. The VPC uses regional dynamic routing. It has a second data centre near Chicago, where Google also offers Dedicated Interconnect, and workloads in us-east4 and us-central1. The regulator now requires a 99.99% target for the link.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the changes needed for Google's 99.99% Dedicated Interconnect topology.",
          parts: [
            part(
              "Why today is 99.9%",
              "Explains that two connections in one metro across both edge availability domains, attached to one region, is the 99.9% topology and that a metro- or region-wide failure takes it down.",
              "Two connections in one metro (one per edge availability domain) with one Cloud Router region is Google's 99.9% layout: losing the Ashburn metro or us-east4 routing removes all paths."
            ),
            part(
              "Connections and attachments",
              "Adds two connections in the Chicago metro across both edge availability domains (four total, two per metro) and VLAN attachments in a second region (us-central1).",
              "Order two more connections in Chicago, one in each edge availability domain -- four in total, two per metro. Create VLAN attachments on the Chicago connections in us-central1 (and keep Ashburn's in us-east4)."
            ),
            part(
              "Routers and routing mode",
              "Adds a Cloud Router in us-central1 and switches the VPC to global dynamic routing so routes learned in one region are usable in the other.",
              "Create a Cloud Router in us-central1 for the Chicago attachments, and set the VPC's dynamic routing mode to GLOBAL (gcloud compute networks update bank-vpc --bgp-routing-mode=global)."
            ),
            part(
              "On-premises side",
              "States that the on-premises routers must be redundant and advertise/accept routes so traffic can fail over between metros (for example with MED/AS-path preferences), and that a failover test is needed.",
              "Use separate on-premises routers per connection, advertise the same prefixes from both data centres with MED or AS-path prepending to prefer Ashburn, and run a failover test by disabling one metro's sessions."
            ),
          ],
        },
      ],
    },
    {
      slug: "net-ha-vpn-onprem-case",
      objective: "Configuring HA VPN toward on-premises VPN gateways",
      kind: "case",
      title: "Bring an HA VPN up to its SLA",
      brief:
        "Wrenford Labs (fictional) connected its office firewall (one public IP, 203.0.113.10, internally redundant) to an HA VPN gateway in europe-west4 using a single tunnel on interface 0, with static routes on the firewall and a route-based policy on the Cloud side.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Google Cloud shows the gateway as 'not configured for 99.99% SLA'. The team asks what is wrong.",
          ask: "What does the configuration need for the 99.99% SLA?",
          parts: [
            part(
              "Tunnels",
              "Adds a second tunnel so each HA VPN interface (0 and 1) has a tunnel, both to 203.0.113.10, and an external peer gateway resource with redundancy SINGLE_IP_INTERNALLY_REDUNDANT.",
              "Create the external VPN gateway resource with one interface (redundancy type SINGLE_IP_INTERNALLY_REDUNDANT, IP 203.0.113.10) and two tunnels: tunnel-0 on HA VPN interface 0 and tunnel-1 on interface 1, both to that peer."
            ),
            part(
              "Routing",
              "Replaces static routing with BGP sessions on a Cloud Router, one per tunnel, with link-local addresses and the firewall's ASN.",
              "HA VPN requires dynamic routing: a Cloud Router (for example ASN 65010) with a BGP session per tunnel over link-local /30s (169.254.10.0/30 and 169.254.11.0/30) to the firewall's ASN 65020."
            ),
          ],
        },
        {
          text: "Both tunnels are up and both BGP sessions established. Monitoring shows all traffic on tunnel-0; when tunnel-0 was taken down in a test, traffic took 90 seconds to move.",
          ask: "Is the active/passive behaviour a problem, and how do you speed up failover?",
          parts: [
            part(
              "Active/passive",
              "Explains that active/passive (via advertised route priority/MED) is a valid HA VPN design, with the caveat that throughput is that of one tunnel; active/active spreads load if both tunnels have equal priority.",
              "It is valid -- HA VPN supports active/passive by giving tunnel-1 a worse advertised route priority (MED). Throughput is limited to one tunnel; equal priorities on both sessions give active/active ECMP."
            ),
            part(
              "Faster failover",
              "Enables Bidirectional Forwarding Detection (BFD) on the BGP sessions (both sides) so failure is detected in about a second, instead of waiting for BGP hold timers.",
              "Enable BFD on both Cloud Router BGP sessions and on the firewall; failure detection drops from the BGP hold time to about a second."
            ),
          ],
        },
      ],
    },

    // ------------------------------------------------------------------
    // Section 5: Managing, monitoring, troubleshooting (2)
    // ------------------------------------------------------------------
    {
      slug: "net-bgp-peering-troubleshoot",
      objective: "Troubleshooting Cloud Router BGP peering issues",
      kind: "case",
      title: "A BGP session that won't establish",
      brief:
        "Galloway Retail (fictional) added a Partner Interconnect VLAN attachment in us-west2. The provider says the layer 2 circuit is up. The Cloud Router's BGP session to the on-premises router shows state 'Idle' / 'Connect'.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "This is a layer 2 Partner Interconnect, so Galloway configures BGP itself. The Cloud Router (ASN 16550, as Partner Interconnect requires) has local IP 169.254.40.1/29, peer IP 169.254.40.2 and peer ASN 65300. The on-premises router has interface address 169.254.40.2/30 and 'router bgp 65310', with neighbor 169.254.40.1 remote-as 16550.",
          ask: "What is wrong, and what do you change?",
          parts: [
            part(
              "Mismatches",
              "Spots both mismatches: the link-local mask (/29 on the Cloud Router vs /30 on premises) and the ASN (the Cloud Router expects peer ASN 65300 but the on-premises router speaks 65310), and fixes each so both sides agree.",
              "Two defects. The mask: set the on-prem interface to 169.254.40.2/29, exactly what the attachment assigned. The ASN: the Cloud Router expects 65300 but on premises runs 65310 -- either change the Cloud Router's peer ASN to 65310 or the on-prem router to 65300. The on-prem neighbor's remote-as 16550 is already right."
            ),
            part(
              "Verify",
              "Names how to confirm: get-status shows Established and learned/advertised routes; on premises shows the neighbor up and prefixes received.",
              "gcloud compute routers get-status <router> --region=us-west2: BGP state Established and learned prefixes listed; on premises show bgp neighbor summary with prefixes received."
            ),
          ],
        },
        {
          text: "The session is now Established, but on premises receives no cloud prefixes, and the Cloud Router learns 900 on-premises prefixes; operations says some on-prem routes are being dropped.",
          ask: "What do you check next?",
          parts: [
            part(
              "Advertisements",
              "Checks the Cloud Router's advertisement mode (default subnets vs custom with the needed ranges) and any on-premises inbound filter that rejects them.",
              "Check the router's advertised routes: if custom mode was set without including subnets, nothing useful is advertised -- add 'all subnets' or the needed ranges. Check the on-prem inbound prefix-list too."
            ),
            part(
              "Learned route limits",
              "Recognises that Cloud Router enforces a limit on learned dynamic routes per region per VPC and that excess prefixes are dropped, and fixes by summarising on premises (or checking the current limit on the quotas page).",
              "Cloud Router has a limit on the number of dynamic routes it can learn per region and VPC; beyond it, prefixes are dropped. Summarise on premises (advertise aggregates instead of 900 specifics) and check the current limit on the quotas page rather than assuming a number."
            ),
          ],
        },
      ],
    },
    {
      slug: "net-connectivity-tests",
      objective: "Using Connectivity Tests to diagnose route and firewall misconfigurations",
      kind: "build",
      title: "Plan Connectivity Tests for a broken path",
      brief:
        "Pinecrest Pharma (fictional): VM app-1 (10.1.2.5, network tag app, vpc-prod, us-central1) cannot reach the database VM db-1 (10.1.8.20, tag db) on tcp:5432. A colleague changed firewall rules yesterday; the VPC also has a custom static route 10.1.8.0/24 pointing at a third-party appliance that was deleted last week. You may not log in to the VMs.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the Connectivity Tests you would run and how you would read and act on the results.",
          parts: [
            part(
              "Test definition",
              "Defines a Connectivity Test with source app-1 (or 10.1.2.5), destination db-1 (10.1.8.20), protocol TCP and port 5432, with a correct gcloud command or console fields.",
              "gcloud network-management connectivity-tests create app-to-db --source-instance=projects/p/zones/us-central1-a/instances/app-1 --destination-instance=projects/p/zones/us-central1-a/instances/db-1 --destination-port=5432 --protocol=TCP."
            ),
            part(
              "Reading the trace",
              "Explains that the test simulates the configuration path (routes, firewall rules, appliances) and reports the drop point, e.g. 'dropped by firewall rule X' or 'route next hop instance does not exist', rather than sending live traffic (live data plane analysis aside).",
              "The result traces each hop from the configuration: matched route, matched firewall rule, next hop. Expect it to stop at either 'Packet dropped: next hop instance not found' for the static route to the deleted appliance, or 'Dropped by firewall rule <name>' for the changed rule."
            ),
            part(
              "Fixes",
              "Gives the fix for each likely finding: delete or repoint the stale higher-priority static route so the subnet route applies (or restore the appliance), and add/restore an ingress allow tcp:5432 from tag app to tag db with priority above any deny.",
              "Route: delete the static route 10.1.8.0/24 (or point it at the replacement appliance). Firewall: ingress allow tcp:5432, source tags app, target tags db, priority 900 (lower number than the deny that was added). Rerun the test and expect 'Reachable'."
            ),
          ],
        },
      ],
    },

    // ------------------------------------------------------------------
    // Section 6: Network security (2)
    // ------------------------------------------------------------------
    {
      slug: "net-cloud-nat-port-allocation",
      objective: "Configuring static and dynamic port allocation for Cloud NAT",
      kind: "build",
      title: "Size Cloud NAT for a burst of outbound connections",
      brief:
        "Driftwood Payments (fictional) has 400 VMs without external IPs in one subnet behind Public Cloud NAT with one manually assigned NAT IP and static port allocation at the default minimum. Each VM sends up to 1,500 simultaneous connections to one partner API endpoint (one IP, port 443) during settlement; Cloud NAT logs show allocation failures ('OUT_OF_RESOURCES' / dropped) at those times. The partner allowlists source IPs, so NAT IPs must stay fixed and known.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Work out the port problem and write the new Cloud NAT configuration.",
          parts: [
            part(
              "Why connections fail",
              "Explains that each VM has 64 ports by default (static) and each NAT tuple supports one connection to a unique destination (IP, port, protocol), so a VM can hold only 64 simultaneous connections to the partner endpoint.",
              "Static allocation's default minimum is 64 ports per VM; because every connection is to the same destination (partner IP, 443, TCP), each needs its own source port, so each VM caps at 64 concurrent connections -- far below 1,500."
            ),
            part(
              "Ports and IPs needed",
              "Calculates a per-VM port need of at least 1,500 (2,048 as a power of two) and the NAT IPs required: 400 x 2,048 = 819,200 ports / 64,512 per IP = 12.7, so 13 IPs (or shows the working for an equivalent choice).",
              "Need 1,500 per VM; use 2,048. Total 400 x 2,048 = 819,200 ports; one NAT IP gives 64,512, so 819,200 / 64,512 = 12.7 -> 13 static NAT IPs, all given to the partner's allowlist."
            ),
            part(
              "Allocation mode",
              "Chooses dynamic port allocation (minimum per VM low, maximum at least 2,048) to use IPs efficiently when not all VMs burst at once, or justifies static at 2,048; notes that switching to dynamic needs a maximum of 1,024 or more to avoid breaking existing connections and that endpoint-independent mapping must be off for dynamic.",
              "Enable dynamic port allocation with min 64 and max 4,096 per VM; with 13 IPs the pool covers 2,048 for every VM at once, and more for some. Disable endpoint-independent mapping (it requires static allocation). Keep max >= 1,024 so existing connections aren't broken when switching."
            ),
          ],
        },
      ],
    },
    {
      slug: "net-cloud-armor-rate-limit-case",
      objective: "Configuring rate limiting in Cloud Armor",
      kind: "case",
      title: "Throttle a credential-stuffing burst",
      brief:
        "Quayside Games (fictional) serves its login API (/api/login) behind a global external Application Load Balancer with a Cloud Armor backend security policy that currently has only the default allow rule. Normal users make at most a few login attempts a minute.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Overnight, logs show thousands of POST /api/login requests per minute from a few hundred IP addresses, each sending about 300 a minute.",
          ask: "Write the Cloud Armor rule to stop this without blocking normal users.",
          parts: [
            part(
              "Rule",
              "Adds a rate-based rule matched on request.path for /api/login (and POST), with action throttle or rate_based_ban, a threshold well above normal use (for example 20 per 60 s per client IP), exceed action deny with 429, and enforce-on-key IP.",
              "gcloud compute security-policies rules create 1000 --security-policy=game-policy --expression=\"request.path.matches('/api/login') && request.method == 'POST'\" --action=rate-based-ban --rate-limit-threshold-count=20 --rate-limit-threshold-interval-sec=60 --ban-duration-sec=600 --conform-action=allow --exceed-action=deny-429 --enforce-on-key=IP."
            ),
            part(
              "Preview first",
              "Deploys the rule in preview mode and checks the logs for would-be matches before enforcing.",
              "Add --preview, check the load balancer logs (previewSecurityPolicy) for what would have been banned, then remove preview."
            ),
          ],
        },
        {
          text: "After enforcement the attack shifts: thousands of IPs each send 5 requests a minute. Also, a large customer's office (one NAT IP, 3,000 staff) is being banned at 9 a.m.",
          ask: "How do you adjust the policy?",
          parts: [
            part(
              "Distributed attack",
              "Recognises per-IP rate limiting cannot stop a low-and-slow distributed attack and adds other controls: reCAPTCHA Enterprise / bot management, or a rate limit keyed on another value Cloud Armor supports (for example an HTTP header or cookie the client sends), plus Adaptive Protection alerts.",
              "Per-IP limits don't catch 5 requests per IP. Add bot management (a reCAPTCHA Enterprise challenge on /api/login) and a second rate limit keyed on the app's device or session cookie (enforce-on-key HTTP_COOKIE); enable Adaptive Protection to flag the pattern."
            ),
            part(
              "Customer office",
              "Adds a higher-priority rule for the customer's known IP with a higher threshold or a different key, rather than removing the limit for everyone.",
              "Add rule priority 900 matching the office IP with its own throttle at a higher threshold (or keyed on the user header), so the 3,000 staff are not treated as one client."
            ),
          ],
        },
      ],
    },
  ],
};
