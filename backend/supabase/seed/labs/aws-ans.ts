import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-154: AWS Certified Advanced Networking - Specialty (ANS-C01).
//
// Aligned to the ANS-C01 exam guide's four domains (Network Design 30%,
// Network Implementation 26%, Network Management and Operation 20%, Network
// Security, Compliance, and Governance 24%; 50 scored + 15 unscored
// questions, pass 750; checked 2026-11-07):
//   https://docs.aws.amazon.com/aws-certification/latest/advanced-networking-specialty-01/advanced-networking-specialty-01.html
// Density (docs/labs.md, policy "hybrid"): one lab per domain plus six
// weighted extras -> 3 / 3 / 2 / 2 (the labs.test.ts density check).
// Specialty depth: a candidate is expected to design and operate hybrid
// networks, so the labs ask for resiliency models, BGP attribute plans,
// Transit Gateway route-table segmentation, hybrid DNS, MTU plans and flow
// log reading rather than service matching.
//
// Every figure below was read on the AWS documentation page named next to
// it on 2026-11-07; nothing is quoted from memory:
//   - Direct Connect resiliency models (maximum / high / development and
//     test; SLA 99.99% and 99.9%):
//     https://docs.aws.amazon.com/directconnect/latest/UserGuide/resiliency_toolkit.html
//   - Direct Connect routing policy and BGP communities (longest prefix,
//     then local preference communities 7224:7100 / 7200 / 7300, then
//     AS_PATH; private-ASN prepending on a public VIF is stripped):
//     https://docs.aws.amazon.com/directconnect/latest/UserGuide/routing-and-bgp.html
//   - Direct Connect virtual interface MTU (private VIF 1500 or 9001,
//     transit VIF 1500 or 8500; changing it can disrupt the connection for
//     up to 30 seconds):
//     https://docs.aws.amazon.com/directconnect/latest/UserGuide/create-vif.html
//   - Transit Gateway quotas (MTU 8500 for VPC, Direct Connect, Connect and
//     peering attachments, 1500 over VPN; 10,000 routes per transit gateway;
//     ECMP needs dynamic routing):
//     https://docs.aws.amazon.com/vpc/latest/tgw/transit-gateway-quotas.html
//   - Site-to-Site VPN quotas (up to 1.25 Gbps per standard tunnel; MTU 1446
//     / MSS 1406; no jumbo frames; no path MTU discovery; 100 BGP routes
//     from a customer gateway to a virtual private gateway):
//     https://docs.aws.amazon.com/vpn/latest/s2svpn/vpn-limits.html
//   - VPC flow log record fields and versions (tcp-flags, pkt-srcaddr,
//     flow-direction, traffic-path, action, log-status):
//     https://docs.aws.amazon.com/vpc/latest/userguide/flow-log-records.html
// ANS-C01 retires 2026-12-31 (the track records it); the labs are written
// for people finishing it and avoid anything that depends on a later version.

export const AWSANS_LABS: SeedLabSet = {
  trackCode: "AWSANS",
  sources: [
    source("https://docs.aws.amazon.com/aws-certification/latest/advanced-networking-specialty-01/advanced-networking-specialty-01.html", "exam_outline", "2026-11-07"),
    source("https://docs.aws.amazon.com/directconnect/latest/UserGuide/resiliency_toolkit.html", "reference", "2026-11-07"),
    source("https://docs.aws.amazon.com/directconnect/latest/UserGuide/routing-and-bgp.html", "reference", "2026-11-07"),
    source("https://docs.aws.amazon.com/directconnect/latest/UserGuide/create-vif.html", "reference", "2026-11-07"),
    source("https://docs.aws.amazon.com/vpc/latest/tgw/transit-gateway-quotas.html", "cloud_pricing_limits", "2026-11-07"),
    source("https://docs.aws.amazon.com/vpn/latest/s2svpn/vpn-limits.html", "cloud_pricing_limits", "2026-11-07"),
    source("https://docs.aws.amazon.com/vpc/latest/userguide/flow-log-records.html", "reference", "2026-11-07"),
  ],
  labs: [
    // ----------------------------------------------------------------------
    // Domain 1: Network Design (3)
    // ----------------------------------------------------------------------
    {
      slug: "resilient-hybrid-connectivity-design",
      objective: "Designing redundant hybrid connectivity with AWS Direct Connect and AWS Site-to-Site VPN",
      kind: "build",
      title: "Design redundant hybrid connectivity for a payments processor",
      brief:
        "Kestrel Payments runs its card-authorization system in a data centre in Frankfurt and is moving the settlement platform to AWS (eu-central-1). Settlement traffic averages 600 Mbps with bursts to 1.8 Gbps and must keep flowing through the loss of any single device, fibre path or colocation facility: the business has written a 99.99% connectivity target into its risk register. During the migration a second, non-critical analytics workload also needs a path to AWS, and the networking team wants a cheap fallback if both dedicated circuits are ever down at once. Address space is 10.20.0.0/16 on premises and 10.40.0.0/16 in AWS, with no overlap. You are the network architect writing the connectivity design.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the hybrid connectivity design: the Direct Connect resiliency model, the backup path, and how failover is controlled.",
          parts: [
            part(
              "Direct Connect resiliency model",
              "Chooses the maximum resiliency model (connections at two or more Direct Connect locations, each location with two connections terminating on separate devices) and ties it to the 99.99% target; names high resiliency (one connection at each of two locations, 99.9%) as insufficient for the stated target.",
              "Maximum resiliency: two Direct Connect locations, and at each location two dedicated connections landing on separate AWS devices, from separate customer routers. That is the model AWS documents for a 99.99% SLA (provided the SLA's other conditions are met). High resiliency -- one connection in each of two locations -- protects against a fibre cut or a device failure and is documented at 99.9%, which does not meet the register's figure."
            ),
            part(
              "Circuit sizing",
              "Sizes each connection so that the remaining capacity after a location failure still carries the 1.8 Gbps peak (for example 10 Gbps dedicated connections, or at minimum more than 1.8 Gbps per surviving location), and explains that capacity must be judged on what survives a failure, not the total.",
              "Order 10 Gbps dedicated connections (1 Gbps connections would leave a single surviving location below the 1.8 Gbps peak). Judge capacity on the worst case -- one whole location gone -- not on the sum of all four circuits."
            ),
            part(
              "Backup path",
              "Adds AWS Site-to-Site VPN over the internet as the path of last resort, notes that a standard VPN tunnel carries up to 1.25 Gbps (so a standard-tunnel fallback is degraded, below the 1.8 Gbps peak), that a Large Bandwidth Tunnel (up to 5 Gbps, transit gateway or Cloud WAN attachments only) can carry the peak, and that ECMP across tunnels on a transit gateway needs dynamic (BGP) routing, and places the analytics workload on it or on the same circuits as lower-priority traffic.",
              "A Site-to-Site VPN connection as the last-resort path. Each standard tunnel is documented at up to 1.25 Gbps, so with standard tunnels the fallback is a degraded mode that covers the 600 Mbps average but not the 1.8 Gbps peak. Two ways past that, both on a transit gateway: Large Bandwidth Tunnels (up to 5 Gbps each, available only on transit gateway or Cloud WAN attachments, with a fixed-IP customer gateway) carry the full peak on one tunnel, or BGP with ECMP aggregates several standard tunnels. The analytics workload can ride the VPN during migration or share the circuits as lower-priority traffic."
            ),
            part(
              "Failover control",
              "Uses BGP on every path and makes Direct Connect preferred over VPN (AWS prefers Direct Connect routes over VPN routes for the same prefix; or set the on-premises side to prefer the Direct Connect paths), with Bidirectional Forwarding Detection (BFD) on the Direct Connect sessions for fast failure detection, and plans a failover test rather than assuming it works.",
              "Run BGP on all paths. For equal prefixes AWS prefers a Direct Connect path over a VPN path, so the VPN only carries traffic when both Direct Connect locations are down; on the customer routers prefer the Direct Connect neighbours too. Enable BFD on the Direct Connect BGP sessions so a failed path is detected in seconds. Schedule a failover test that takes one location down and measures what the settlement platform sees."
            ),
          ],
        },
      ],
    },
    {
      slug: "bgp-traffic-shaping-plan",
      objective: "Designing BGP routing with BGP attributes to shape traffic: load sharing and active/passive",
      kind: "build",
      title: "Shape traffic across two Direct Connect paths with BGP attributes",
      brief:
        "Harrow Logistics has two 1 Gbps Direct Connect connections to the same AWS Region from two colocation facilities, each with a private virtual interface to the same virtual private gateway. The on-premises team advertises 10.50.0.0/16 from both routers. They want (1) traffic from AWS to the warehouse network 10.50.8.0/21 to prefer the connection in facility A and fail over to facility B; (2) traffic from AWS to everything else in 10.50.0.0/16 to be shared across both connections; (3) traffic from on premises to the AWS VPC 10.60.0.0/16 to prefer facility A. The routers run a public ASN on premises and a private ASN would be used if a public virtual interface were ever added. Write the BGP plan.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the BGP attribute plan for inbound (AWS to on premises) and outbound (on premises to AWS) traffic.",
          parts: [
            part(
              "AWS-to-warehouse active/passive",
              "Advertises 10.50.8.0/21 from both routers and tags it with the Direct Connect local preference communities so facility A carries a higher preference (7224:7300 high on A, 7224:7100 low -- or 7224:7200 medium -- on B), explaining that AWS evaluates local preference before AS_PATH for private virtual interfaces.",
              "Advertise 10.50.8.0/21 over both VIFs. On facility A tag it 7224:7300 (high local preference); on facility B tag it 7224:7100 (low). AWS applies these communities on private and transit VIFs and evaluates local preference before AS_PATH length, so A is active and B is only used when A's route disappears."
            ),
            part(
              "AWS-to-everything-else load sharing",
              "Advertises 10.50.0.0/16 from both routers with the same attributes (same community or none, same AS_PATH length) so AWS sees equal routes and can share load across both connections; notes that the more specific /21 still wins for the warehouse because longest prefix is evaluated first.",
              "Advertise 10.50.0.0/16 identically from both routers -- same local preference community (or none) and no prepending -- so the two paths are equal and AWS load-shares across them. Longest prefix match is evaluated first, so the /21 advertisement still steers warehouse traffic to A regardless of the /16."
            ),
            part(
              "On-premises-to-AWS preference",
              "Controls outbound preference on the customer routers (local preference set higher for routes learned over the facility A session, since AWS advertises the same VPC prefix on both VIFs), and says why MED is not the tool for this.",
              "AWS advertises 10.60.0.0/16 on both sessions. On the customer side set a higher BGP local preference on routes learned from the facility A neighbour so outbound traffic prefers A and falls back to B. Do not rely on MED: it is only compared after the other attributes and is not how you express a local policy on your own routers."
            ),
            part(
              "A common mistake to avoid",
              "Explains that AS_PATH prepending from a private ASN on a public virtual interface is stripped (AWS replaces the private ASN with 7224) so it cannot be relied on there, and that local preference communities must be standard communities (not extended) and are mutually exclusive.",
              "If a public VIF is ever added with a private ASN, AS_PATH prepending will not influence routing outside AWS because AWS replaces the private ASN with 7224 -- use a public ASN or the communities instead. On the private VIFs, apply exactly one of the 7224:7100/7200/7300 standard communities per route; they are mutually exclusive and extended communities are not supported."
            ),
          ],
        },
      ],
    },
    {
      slug: "overlapping-cidr-merger",
      objective: "Designing around overlapping IP address space with NAT, PrivateLink, and Transit Gateway routing",
      kind: "case",
      title: "Connect two companies whose VPCs overlap after a merger",
      brief:
        "Oakhurst Retail has acquired Finch Analytics. Oakhurst's production VPC is 10.0.0.0/16 and Finch's production VPC is also 10.0.0.0/16, in different AWS accounts. Both are attached to Oakhurst's Transit Gateway hub design in principle, but the Finch VPC is not yet attached. Day one, Oakhurst's order system must call a Finch forecasting API (an HTTPS service behind an internal load balancer in Finch's VPC). Within a quarter, a Finch batch job must read from an Oakhurst database over a specific port. Renumbering either VPC is not possible this year.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "You try to attach the Finch VPC to the Transit Gateway and add a route for it. The console accepts the attachment, but the route for 10.0.0.0/16 cannot be used to reach Finch, because the same prefix already points to Oakhurst's VPC in the route table.",
          ask: "Why does the Transit Gateway not solve this, and how do you deliver the day-one requirement (Oakhurst calling the Finch API)?",
          parts: [
            part(
              "Why routing cannot fix it",
              "Explains that a route table can hold only one route per prefix (the overlapping CIDRs cannot both be destinations), so neither Transit Gateway nor VPC peering can route between identical ranges; VPC peering is refused outright for overlapping CIDRs.",
              "Routing is by destination prefix and a route table holds one next hop per prefix, so 10.0.0.0/16 cannot point to two different VPCs. VPC peering will not even be created between overlapping CIDRs, and the Transit Gateway just takes the same prefix to one attachment."
            ),
            part(
              "Day-one design",
              "Exposes the Finch API through AWS PrivateLink: a Network Load Balancer in Finch's VPC fronting the service, a VPC endpoint service, and an interface endpoint in Oakhurst's VPC; explains that PrivateLink works because the consumer only addresses the endpoint's local IP, never Finch's CIDR.",
              "Put a Network Load Balancer in front of the Finch API (it can target the existing internal ALB or the targets directly), create a VPC endpoint service on it, and have Oakhurst create an interface endpoint in its own subnets. Oakhurst's order system calls the endpoint's private IP (or the endpoint's private DNS name) in its own 10.0.0.0/16; Finch's addresses are never routed, so the overlap does not matter."
            ),
          ],
        },
        {
          text: "The API integration works. Now the Finch batch job needs to connect to Oakhurst's database (a single RDS instance on port 5432) and the database team does not want to put a load balancer in front of it.",
          ask: "How do you give the Finch job a path to the database without renumbering, and what are the trade-offs?",
          parts: [
            part(
              "Reaching the database",
              "Either (a) uses PrivateLink again -- an NLB in Oakhurst's VPC with the RDS instance's IP as a target, endpoint service, interface endpoint in Finch's VPC -- and notes the trade-off that RDS failover changes the IP so the target must be kept current; or (b) uses a non-overlapping secondary CIDR added to one VPC, with resources (or a private NAT gateway) placed there, so the two VPCs can route through the Transit Gateway using the new range.",
              "Option A: PrivateLink in the other direction -- an NLB in Oakhurst's VPC targeting the RDS instance by IP (NLB IP targets), an endpoint service, and an interface endpoint in Finch's VPC. The catch: an RDS failover changes the instance IP, so the target registration has to be updated (an automation on the RDS event). Option B: add a non-overlapping secondary CIDR (for example 100.64.0.0/16) to the Finch VPC, place a private NAT gateway in it, and route Finch's traffic to the database through the Transit Gateway from that range; the database only ever sees the NAT gateway's non-overlapping address."
            ),
            part(
              "Longer-term recommendation",
              "Recommends an IP address plan (for example with Amazon VPC IP Address Manager) and a renumbering roadmap, because PrivateLink and NAT are point solutions that do not give general any-to-any connectivity.",
              "Both fixes are per-service. Put an IPAM-managed address plan in place and schedule renumbering (or migrate Finch workloads into new, non-overlapping VPCs) so the two companies can eventually route through the Transit Gateway normally."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Domain 2: Network Implementation (3)
    // ----------------------------------------------------------------------
    {
      slug: "tgw-hub-spoke-segmentation",
      objective: "Configuring a hub-and-spoke architecture with Transit Gateway or a transit VPC",
      kind: "build",
      title: "Build Transit Gateway route tables that segment production from development",
      brief:
        "Brightwater Utilities has four VPCs in one Region: prod-app (10.1.0.0/16), prod-data (10.2.0.0/16), dev (10.3.0.0/16) and shared-services (10.9.0.0/16, hosting Active Directory and a patch repository). On premises is 172.16.0.0/12 over a Direct Connect transit virtual interface. Rules: production VPCs may talk to each other, to shared services and to on premises; dev may talk to shared services and on premises but never to production; shared services may reach every VPC; on premises may reach everything. Write the Transit Gateway configuration.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the attachment and route table design.",
          parts: [
            part(
              "Route tables and associations",
              "Creates separate Transit Gateway route tables for the segments (for example prod, dev, shared/on-prem) and associates each attachment with exactly one of them, explaining that association decides which table an attachment's traffic is looked up in.",
              "Three TGW route tables: rt-prod (associated with prod-app and prod-data attachments), rt-dev (associated with the dev attachment) and rt-shared (associated with the shared-services VPC attachment and the Direct Connect gateway attachment). Each attachment is associated with exactly one table, and that table is the one its inbound traffic is routed by."
            ),
            part(
              "Propagations",
              "Propagates (or statically adds) only the allowed destinations into each table: rt-prod learns prod-app, prod-data, shared-services and on-prem; rt-dev learns shared-services and on-prem only (no production routes); rt-shared learns every VPC and on-prem.",
              "rt-prod: propagate prod-app, prod-data, shared-services and the Direct Connect gateway attachment. rt-dev: propagate shared-services and the Direct Connect gateway attachment only -- no production attachments, so there is simply no route from dev to 10.1/16 or 10.2/16. rt-shared: propagate all four VPC attachments and on-prem."
            ),
            part(
              "VPC-side routes",
              "Adds routes in each VPC's subnet route tables pointing the other ranges (for example 10.0.0.0/8 and 172.16.0.0/12) to the Transit Gateway attachment, and notes the TGW attachment needs a subnet in every AZ the VPC uses.",
              "In each VPC's route tables: 10.0.0.0/8 and 172.16.0.0/12 -> the TGW attachment (the VPC's own CIDR stays local). Create the attachment with one subnet per Availability Zone the workloads use, so traffic in every AZ has a path to the TGW."
            ),
            part(
              "Proving isolation",
              "Verifies the design with Reachability Analyzer (or Transit Gateway Route Analyzer in Network Manager) between a dev instance and a prod instance, expecting unreachable, and from prod to shared services, expecting reachable.",
              "Run a Reachability Analyzer path from a dev instance to a prod-app instance and confirm it is not reachable (the analysis should show no route in rt-dev); run prod-app to the shared-services domain controller and confirm reachable. Keep the analyses as part of change verification."
            ),
          ],
        },
      ],
    },
    {
      slug: "hybrid-dns-resolver-endpoints",
      objective: "Connecting existing on-premises name resolution to AWS: conditional forwarding, hosted zones, resolvers",
      kind: "build",
      title: "Join on-premises DNS and Route 53 private zones",
      brief:
        "Marlow Insurance has on-premises Active Directory DNS servers (192.168.10.5 and 192.168.11.5) that are authoritative for corp.marlow.internal. In AWS it has a private hosted zone aws.marlow.internal associated with a shared-services VPC (10.9.0.0/16) and six workload VPCs connected through a Transit Gateway. Requirements: EC2 instances in any VPC must resolve corp.marlow.internal names; on-premises servers must resolve aws.marlow.internal names; every other name must keep resolving through the VPC's default resolver; the team wants to see DNS query logs for the AWS side.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the hybrid DNS design.",
          parts: [
            part(
              "AWS to on premises",
              "Creates a Route 53 Resolver outbound endpoint in the shared-services VPC (two or more IPs in different AZs) and a forwarding rule for corp.marlow.internal targeting 192.168.10.5 and 192.168.11.5, then shares the rule to the workload accounts/VPCs (AWS RAM) and associates it with each VPC.",
              "An outbound Resolver endpoint in shared-services (ENIs in at least two AZs). A Resolver forwarding rule: domain corp.marlow.internal -> targets 192.168.10.5 and 192.168.11.5 through that endpoint. Share the rule with AWS RAM and associate it with every workload VPC so their instances forward only that domain on premises; everything else still goes to the VPC resolver."
            ),
            part(
              "On premises to AWS",
              "Creates an inbound Resolver endpoint in the shared-services VPC and adds a conditional forwarder on the on-premises DNS servers for aws.marlow.internal pointing at the inbound endpoint IPs; associates the private hosted zone with every VPC that needs to resolve it (or routes queries via the shared VPC).",
              "An inbound Resolver endpoint in shared-services with two ENI IPs. On the AD DNS servers add a conditional forwarder for aws.marlow.internal -> those IPs. Associate the private hosted zone aws.marlow.internal with each VPC that resolves it (cross-account association where needed), or keep it on shared-services and let the inbound endpoint answer for on-premises queries."
            ),
            part(
              "Network path and ports",
              "Opens DNS (UDP and TCP 53) between the on-premises servers and the endpoint ENIs' security groups over the hybrid link, in both directions as needed.",
              "The endpoints' security group allows UDP and TCP 53 from the on-premises DNS servers (inbound endpoint) and the outbound endpoint must be able to reach 192.168.10.5/11.5 on 53 over the Direct Connect or VPN path. Both protocols, because large answers fall back to TCP."
            ),
            part(
              "Query logging",
              "Enables Route 53 Resolver query logging for the VPCs, sending to CloudWatch Logs or S3 (or Firehose), as the way to see what instances asked and what was answered.",
              "Turn on Resolver query logging with a configuration associated with each VPC, delivering to a CloudWatch Logs group (or an S3 bucket) in the shared-services account; it records the query name, type, response code and the source instance."
            ),
          ],
        },
      ],
    },
    {
      slug: "multi-account-network-sharing",
      objective: "Multi-account networking with AWS Organizations and AWS Resource Access Manager: shared Transit Gateway, Direct Connect, VPC, Route 53",
      kind: "case",
      title: "Share one network across a growing organisation",
      brief:
        "Pell & Grange, an engineering consultancy, has moved to a multi-account AWS Organization: a network account owns the Transit Gateway, the Direct Connect gateway and a shared-services VPC; twelve workload accounts are being created under a Workloads organizational unit. The network team must give every workload account hybrid connectivity and DNS without handing over control of the shared pieces.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The first workload account creates a VPC and asks to attach it to the Transit Gateway. The attachment option does not appear in their console: the Transit Gateway is invisible to them.",
          ask: "How do you make the Transit Gateway usable from every workload account, now and for accounts created later?",
          parts: [
            part(
              "Sharing the Transit Gateway",
              "Shares the Transit Gateway from the network account with AWS Resource Access Manager to the Workloads OU (requires RAM sharing enabled with AWS Organizations), so current and future accounts in the OU can create attachments without an invitation.",
              "Enable sharing with AWS Organizations in RAM, then create a resource share in the network account containing the Transit Gateway with the Workloads OU as principal. Accounts already in the OU and any added later see the TGW and can create VPC attachments; no per-account invitations."
            ),
            part(
              "Keeping control",
              "Explains that the owner account still controls route tables, associations and propagations (and can require attachment acceptance), so workload accounts can attach but cannot change routing.",
              "Workload accounts can create an attachment, but only the network account can associate it with a route table or change propagation, and the TGW can be set to require manual acceptance of attachments. Routing policy stays with the network team."
            ),
          ],
        },
        {
          text: "A second workload account has a legacy VPC with its own virtual private gateway and wants Direct Connect access without migrating to the Transit Gateway yet.",
          ask: "How do you give that VPC a private path over the existing Direct Connect connection?",
          parts: [
            part(
              "Direct Connect gateway association across accounts",
              "Uses a Direct Connect gateway association proposal: the workload account proposes associating its virtual private gateway with the network account's Direct Connect gateway (specifying allowed prefixes), and the Direct Connect gateway owner accepts; notes that the association is cross-account and the prefixes advertised to on premises can be limited.",
              "From the workload account, create an association proposal for the network account's Direct Connect gateway with the VPC's virtual private gateway and the prefixes to advertise (its CIDR). The network account accepts the proposal, optionally trimming the allowed prefixes. The VPC now has a private path over the existing connection, no new circuit."
            ),
          ],
        },
        {
          text: "Workload teams now report they can reach on premises but cannot resolve corp names; each account is building its own Resolver endpoints.",
          ask: "How do you centralise DNS so twelve accounts do not each run forwarders?",
          parts: [
            part(
              "Shared Resolver rules",
              "Keeps one set of Resolver outbound endpoints and forwarding rules in the network account and shares the rules with RAM to the Workloads OU, so each account only associates the shared rule with its VPCs; associates the central private hosted zones with workload VPCs where needed.",
              "Build the outbound endpoint and the corp forwarding rule once in the network account, share the rule with RAM to the Workloads OU, and have each account associate it with its VPCs (no endpoints of their own). Private hosted zones stay in the network account and are associated with workload VPCs by authorisation plus association."
            ),
            part(
              "Optional: shared subnets",
              "Mentions VPC sharing (sharing subnets with RAM) as the alternative that avoids per-account VPCs entirely, with the owner keeping the network and participants launching resources into the shared subnets.",
              "Where teams do not need their own VPC, share subnets of a network-account VPC with RAM: the network account owns the VPC, route tables and TGW attachment, and workload accounts launch instances into the shared subnets and still see their own resources only."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Domain 3: Network Management and Operation (2)
    // ----------------------------------------------------------------------
    {
      slug: "unreachable-app-reachability-analyzer",
      objective: "Troubleshooting connectivity caused by misconfiguration with Reachability Analyzer",
      kind: "case",
      title: "Find why an application server is unreachable",
      brief:
        "At Tilbury Freight an internal Application Load Balancer in subnets 10.5.1.0/24 and 10.5.2.0/24 forwards HTTP to application instances on port 8080 in subnets 10.5.11.0/24 and 10.5.12.0/24. After a change window, the ALB's target group shows every target unhealthy. The application process is running and listening on 8080 on each instance. You are asked to find the fault with the least guessing.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "You run a VPC Reachability Analyzer path analysis from the ALB's network interface in 10.5.1.0/24 to an application instance on TCP 8080. The result is Not reachable, and the explanation names a network ACL on the application subnets as the component blocking the path.",
          ask: "What does that tell you, and what do you check in the ACL?",
          parts: [
            part(
              "Reading the analysis",
              "Interprets the result as a configuration block (not an application or OS problem), locating the fault at the application subnets' network ACL rather than the security group or route tables, and knows Reachability Analyzer evaluates configuration, not live packets.",
              "Reachability Analyzer models the configuration, so this is not about the process on the box: the ALB-to-instance path is denied by the NACL attached to the application subnets. Security groups and routes are not the blocker here, or they would have been named."
            ),
            part(
              "What to check in the NACL",
              "Checks the inbound rules for TCP 8080 from the ALB subnets (10.5.1.0/24, 10.5.2.0/24) and, because NACLs are stateless, the outbound rules for return traffic to those subnets on the ephemeral port range (1024-65535); checks rule numbering since the lowest matching rule wins.",
              "Inbound: an allow for TCP 8080 from 10.5.1.0/24 and 10.5.2.0/24 with a rule number lower than any deny that matches. Outbound: an allow for TCP 1024-65535 back to the ALB subnets, because the NACL is stateless and the ALB's connections come from ephemeral ports. Rules are evaluated lowest number first, so a new deny with a low number would also explain it."
            ),
          ],
        },
        {
          text: "The NACL's inbound rule 100 allows TCP 8080 from 10.5.0.0/16. Outbound, someone added rule 50: DENY TCP 1024-65535 to 0.0.0.0/0 'to stop outbound data exfiltration', above rule 100 which allows all traffic.",
          ask: "Explain the failure and fix it without removing the team's intent.",
          parts: [
            part(
              "Cause and fix",
              "Explains that the deny on ephemeral ports blocks the instances' replies to the ALB (return traffic uses the client's ephemeral port), so health checks fail; fixes it by allowing outbound TCP 1024-65535 to the ALB subnets (or the VPC CIDR) with a rule number below 50, and suggests that outbound egress control to the internet belongs in a stateful control (security group egress rules, or AWS Network Firewall) rather than a stateless NACL that cannot tell replies from new connections.",
              "The instances' responses to the ALB go back to the ALB's ephemeral source ports, which rule 50 denies before rule 100 is reached, so no health check ever completes. Add rule 40: ALLOW TCP 1024-65535 to 10.5.0.0/16 (above the deny) and re-run the analysis. For egress control, a stateless NACL cannot distinguish a reply from a new outbound connection; put that intent in security group egress rules or AWS Network Firewall, which are stateful."
            ),
            part(
              "Confirming the fix",
              "Re-runs the Reachability Analyzer path (and watches the target group turn healthy), and keeps the analysis as a regression check for future change windows.",
              "Re-run the same path analysis and confirm Reachable; then confirm the target group health. Save the analysis so it is re-run after every change to those NACLs."
            ),
          ],
        },
      ],
    },
    {
      slug: "jumbo-frame-mtu-plan",
      objective: "Configuring jumbo frame support across connection types",
      kind: "build",
      title: "Write an MTU plan for a hybrid data-replication path",
      brief:
        "Sorrel Media replicates large video files between an on-premises storage array and EC2 instances. The path is: on-premises servers -> Direct Connect private virtual interface -> a VPC in one Region; some traffic also crosses a Transit Gateway to a second VPC, and a Site-to-Site VPN exists as backup. The storage team has set 9000-byte MTU on the servers and the EC2 instances and reports that transfers over the VPN stall completely while transfers over Direct Connect sometimes stall only when they cross the Transit Gateway. Nothing is wrong with the applications.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the MTU plan for each segment of the path and explain the two stalls.",
          parts: [
            part(
              "Direct Connect segment",
              "States that a private virtual interface supports an MTU of 1500 or 9001 (jumbo frames) and must be set to 9001 for the instances' 9000-byte frames to pass; notes that enabling jumbo frames can update the underlying connection and briefly disrupt its VIFs (up to about 30 seconds), so it is a change-window action.",
              "Set the private VIF MTU to 9001 (the two supported values are 1500 and 9001). Check Jumbo Frame Capable on the connection first; switching it may update the physical connection and interrupt every VIF on it for up to 30 seconds, so do it in a window."
            ),
            part(
              "Transit Gateway segment",
              "States that a Transit Gateway supports an MTU of 8500 bytes for VPC, Direct Connect, Connect and peering attachments, so 9000-byte packets are too large there; the fix is to set the instance/server MTU to 8500 (or lower) for flows that cross the TGW, or rely on path MTU discovery (which the TGW supports for traffic entering on VPC attachments) and make sure ICMP is not blocked.",
              "The TGW's MTU is 8500 bytes for VPC, Direct Connect, Connect and peering attachments, so 9000-byte packets exceed it and the transfer stalls once the path crosses the TGW. Lower the end-host MTU to 8500 for those flows (or set it everywhere for simplicity), and allow ICMP so path MTU discovery can work for traffic entering on VPC attachments -- the TGW does not do PMTUD for Direct Connect, VPN or peering attachments, and MSS clamping is applied."
            ),
            part(
              "VPN segment",
              "States that Site-to-Site VPN supports an MTU of 1446 bytes (MSS 1406), does not support jumbo frames and does not support path MTU discovery, so 9000-byte frames over the VPN are dropped and TCP must be clamped (MSS clamping on the customer gateway, or host MTU lowered) for the backup path to work.",
              "The VPN path's MTU is 1446 bytes (MSS 1406); jumbo frames are not supported and neither is path MTU discovery, so the 9000-byte frames are silently lost and transfers stall. Clamp TCP MSS on the customer gateway for the VPN route or lower the host MTU to 1446 when the VPN is the active path."
            ),
            part(
              "Operational plan",
              "Proposes a per-path verification (ping with do-not-fragment at the chosen sizes, or a controlled transfer) after each change and documents the MTU per segment so a failover to VPN does not surprise anyone.",
              "After each change, test with don't-fragment pings at 9001/8500/1446 across the respective paths, then a timed transfer. Record the MTU of every segment (DX 9001, TGW 8500, VPN 1446) in the runbook and make the VPN failover procedure include the MSS clamp."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Domain 4: Network Security, Compliance, and Governance (2)
    // ----------------------------------------------------------------------
    {
      slug: "central-egress-inspection",
      objective: "Securing outbound traffic flows from AWS: Network Firewall, proxies, Gateway Load Balancers",
      kind: "build",
      title: "Design centralised egress inspection for twenty VPCs",
      brief:
        "Caldera Biotech has twenty workload VPCs attached to a Transit Gateway. Each has its own NAT gateway and unrestricted internet egress. Compliance now requires that all outbound traffic leave through one inspection point, that only an approved list of domains (software repositories, the company's SaaS vendors) be reachable, that attempts to reach anything else be logged and alerted, and that the design survive the loss of an Availability Zone. Write the egress design.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the central egress design.",
          parts: [
            part(
              "Topology",
              "Creates a dedicated egress/inspection VPC attached to the Transit Gateway with AWS Network Firewall endpoints and NAT gateways in at least two AZs; workload TGW route tables send 0.0.0.0/0 to the inspection VPC attachment; the inspection VPC's subnets route workload-bound traffic back through the TGW and internet-bound traffic through the firewall endpoints then NAT then the internet gateway.",
              "An egress VPC attached to the TGW with, per AZ: a TGW attachment subnet, a firewall subnet holding a Network Firewall endpoint, and a public subnet with a NAT gateway. Workload route tables on the TGW: 0.0.0.0/0 -> egress VPC attachment. In the egress VPC: TGW subnet route 0.0.0.0/0 -> the AZ's firewall endpoint; firewall subnet 0.0.0.0/0 -> the AZ's NAT gateway and 10.0.0.0/8 -> TGW; public subnet 0.0.0.0/0 -> internet gateway. Remove the per-VPC NAT gateways."
            ),
            part(
              "Keeping flows symmetric",
              "Enables appliance mode on the egress VPC's Transit Gateway attachment so both directions of a flow use the same AZ (and therefore the same firewall endpoint), explaining that stateful inspection breaks on asymmetric paths.",
              "Turn on appliance mode for the egress VPC attachment: the TGW then keeps a flow's forward and return traffic in the same AZ, so the same stateful firewall endpoint sees both directions. Without it, return traffic could land on another AZ's endpoint that has no state for the flow."
            ),
            part(
              "Rules",
              "Uses a stateful rule group with a domain allow list (HTTP host header and TLS SNI) for the approved domains and a default drop/alert for everything else (strict order with drop established, or an explicit deny), and notes that domain filtering relies on SNI/Host so it should be paired with blocking non-HTTP(S) egress unless needed.",
              "A stateful domain-list rule group allowing the approved domains for HTTP and HTTPS (matched on Host header and TLS SNI), and a default action that drops and logs everything that does not match (strict rule order with a drop-established default, or an explicit deny rule after the allows). Only ports 80/443 are allowed through unless a workload has an approved exception, because domain matching only applies to those protocols."
            ),
            part(
              "Logging, alerting and AZ failure",
              "Sends Network Firewall alert and flow logs to CloudWatch Logs or S3 (or Firehose), raises an alarm on alert-log volume or specific denied domains, and places endpoints plus NAT gateways in each AZ so the loss of one AZ leaves the others working.",
              "Enable alert logs and flow logs on the firewall to a CloudWatch Logs group (or S3), with a metric filter and alarm on denied-domain alerts. Because every AZ has its own firewall endpoint and NAT gateway and routing stays within the AZ, losing one AZ only affects that AZ's workloads, which the TGW will route via the remaining AZs' endpoints once their subnets are the only healthy ones."
            ),
          ],
        },
      ],
    },
    {
      slug: "flow-log-custom-format-analysis",
      objective: "Creating and analyzing VPC flow logs, including base and extended fields",
      kind: "build",
      title: "Define a flow log format and read what it tells you",
      brief:
        "Wrenfield Bank's security team wants VPC flow logs that can answer three questions without guesswork: (1) which flows were rejected and whether the reject happened on the way in or out of an interface; (2) for traffic through a NAT gateway, what the original client address was rather than the NAT interface's address; (3) which path egress traffic took (internet gateway, VPC peering, virtual private gateway). They also want to distinguish a half-open SYN scan from an established connection, and to know when a log record means 'no traffic' versus 'records were dropped'. Write the flow log definition and show how to read it.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the custom flow log format and the reading guide.",
          parts: [
            part(
              "Custom format",
              "Chooses a custom format (the default format has only version 2 fields) that includes at least action, flow-direction, pkt-srcaddr and pkt-dstaddr alongside srcaddr/dstaddr, traffic-path, tcp-flags and log-status, and knows the record's version is the highest version among the chosen fields (flow-direction and traffic-path are version 5 fields).",
              "Use a custom format, for example: version account-id interface-id srcaddr dstaddr pkt-srcaddr pkt-dstaddr srcport dstport protocol packets bytes start end action tcp-flags flow-direction traffic-path log-status. The default format stops at version 2 fields; pkt-srcaddr and tcp-flags are version 3, flow-direction and traffic-path are version 5, so these records are version 5."
            ),
            part(
              "Rejections and direction",
              "Reads action = REJECT as traffic not allowed by the security group or network ACL (or arriving after a connection closed) and uses flow-direction (ingress or egress) relative to the interface to tell inbound rejections from outbound ones.",
              "action REJECT means the security group or NACL did not allow the traffic (or a packet arrived after the connection closed). flow-direction tells you which way it was going with respect to the logged interface: ingress REJECT is something being blocked coming in, egress REJECT is the instance being blocked from going out."
            ),
            part(
              "NAT and original addresses",
              "Uses pkt-srcaddr / pkt-dstaddr as the packet-level original addresses versus srcaddr / dstaddr as the interface-level addresses, so a flow through a NAT gateway's interface shows the real client in pkt-srcaddr while srcaddr shows the intermediate address; also names traffic-path values (for example 2 or 8 for an internet gateway, 3 for a virtual private gateway, 4 and 5 for intra- and inter-Region peering).",
              "On the NAT gateway's interface, srcaddr/dstaddr are the interface-level addresses while pkt-srcaddr/pkt-dstaddr carry the original packet addresses, so the client that started the flow is in pkt-srcaddr. traffic-path on egress records says where it went: 8 (or 2) through an internet gateway, 3 through a virtual private gateway, 4 intra-Region peering, 5 inter-Region peering, 7 a gateway VPC endpoint."
            ),
            part(
              "TCP flags and log status",
              "Reads tcp-flags as a bitmask (SYN 2, SYN-ACK 18, FIN 1, RST 4; values can be OR-ed within an aggregation interval, so 19 = SYN-ACK plus FIN and 3 = SYN plus FIN) so a record with only 2 and few packets suggests a half-open probe; reads log-status NODATA as no traffic in the interval and SKIPDATA as records dropped by a capacity constraint or internal error.",
              "tcp-flags is a bitmask: SYN = 2, SYN-ACK = 18, FIN = 1, RST = 4, OR-ed across the interval (19 = SYN-ACK and FIN; 3 = SYN and FIN). A flow showing tcp-flags 2 with one or two packets and no SYN-ACK is a half-open probe; a completed connection shows 18 or 19 on the server side. log-status NODATA means the interface had no traffic in the interval; SKIPDATA means some records were skipped because of an internal capacity constraint or error -- the absence of a flow is not proof it did not happen."
            ),
          ],
        },
      ],
    },
  ],
};
