import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-158: CompTIA CloudNetX (CNX-001, V1).
//
// Aligned to the four domains on CompTIA's certification page (Network
// architecture design 31%, Network security 28%, Network operations,
// monitoring and performance 16%, Network troubleshooting 25%) and the
// expert-level performance tasks the exam describes: design hybrid
// connectivity, plan addressing for a hub-and-spoke, move a workforce to Zero
// Trust, write access-control rules, handle DDoS / BGP hijack / zero-day
// events, work availability metrics, put network changes under GitOps, and
// troubleshoot from symptoms and tool output. Vendor-neutral, as the exam is.
// Density ("hybrid"): 2 / 3 / 2 / 2.
//
// These build and case labs are in addition to the course's self-reported
// labs (objectives.lab_prompt, docs/labs.md "Three kinds of lab"), which are
// unchanged. Sources (all read 2026-11-07):
//   CompTIA CloudNetX page, exam details and V1 objectives summary
//               https://www.comptia.org/en-us/certifications/cloudnetx/
//   RFC 1918 private address space (10/8, 172.16/12, 192.168/16)
//               https://www.rfc-editor.org/rfc/rfc1918
// Availability arithmetic in the operations lab is the standard formula
// MTBF / (MTBF + MTTR); no vendor figure is quoted. Every lab is
// needs_expert_review until a person checks it.

export const CLOUDNETX_LABS: SeedLabSet = {
  trackCode: "CLOUDNETX",
  sources: [source("https://www.comptia.org/en-us/certifications/cloudnetx/", "exam_outline", "2026-11-07"), source("https://www.rfc-editor.org/rfc/rfc1918", "reference", "2026-11-07")],
  labs: [
    // ---------------- Network architecture design (2) ----------------
    {
      slug: "hybrid-connectivity-design",
      objective:
        "Hybrid connectivity solutions: MPLS, SD-WAN, cellular, satellite, dark fiber, public-cloud interconnects (ExpressRoute, Direct Connect), and site-to-site/point-to-site VPNs",
      kind: "build",
      title: "Design hybrid connectivity for a retailer",
      brief:
        "Kingsmead Retail has a head office, a data centre 30 km away, 140 stores, and is moving its core applications to a public cloud. Requirements: the data centre needs a private, high-bandwidth, predictable-latency path to the cloud for database replication (about 4 Gbps sustained) and must keep working if any single link or device fails; stores need secure access to cloud applications over cheap local internet circuits with a backup path when the circuit fails, and tills must keep working; the existing MPLS contract for stores costs five times the internet circuits and renews in six months; forty engineers work from home and need access to internal systems. Design the connectivity.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the connectivity for the data centre, the stores and the remote engineers, with the failure modes each design survives.",
          parts: [
            part(
              "Data centre to cloud",
              "Uses a dedicated or partner cloud interconnect (Direct Connect / ExpressRoute class) sized above 4 Gbps, made redundant with two circuits to two provider edge locations (or interconnect plus VPN backup), with dynamic routing (BGP) so failover is automatic.",
              "Two dedicated cloud interconnect circuits (10 Gbps each is the common step above 4 Gbps sustained) terminating at two different provider edge locations and on two customer routers, with BGP on each so a failed link or router withdraws its routes and traffic moves to the other within seconds. A site-to-site VPN over the internet stays configured as a last-resort path at reduced bandwidth."
            ),
            part(
              "Stores",
              "Replaces MPLS at renewal with SD-WAN over local broadband internet circuits, with cellular (4G/5G) as the backup path per store, encrypted tunnels to the cloud and data centre, application-aware path selection, and local survivability for tills.",
              "Let the MPLS contract lapse and deploy SD-WAN edge devices in each store: the primary WAN is the local broadband circuit, the backup is a cellular (4G/5G) connection, both carrying encrypted tunnels to the cloud and the data centre. The SD-WAN controller steers till and payment traffic over the healthier path and fails over automatically. Tills keep a local store-and-forward capability so a total WAN loss delays, rather than stops, sales."
            ),
            part(
              "Remote engineers",
              "Gives remote engineers point-to-site (client) VPN access, or preferably a Zero Trust Network Access service, with MFA and device checks, rather than exposing internal systems.",
              "Forty engineers get a point-to-site client VPN (or, better, a Zero Trust network access service) that authenticates with SSO and MFA and checks device health before granting access to specific internal applications, with split tunnelling so only internal traffic goes through the tunnel."
            ),
            part(
              "Why not the alternatives",
              "Explains a rejected option for at least one tier: dark fibre or satellite for stores (cost / latency), MPLS for cloud access (cost, no cloud-native path), or a single interconnect (single point of failure).",
              "Dark fibre is right for the 30 km data-centre-to-head-office hop if they ever need it but not for 140 stores; satellite has latency and cost that hurt payments; keeping MPLS buys predictable latency the stores no longer need at five times the price; and a single interconnect, however fast, is a single point of failure for the database replication."
            ),
          ],
        },
      ],
    },
    {
      slug: "hub-and-spoke-address-plan",
      objective:
        "Core networking concepts applied to design: the OSI model, IPv4/IPv6 addressing and subnetting, NAT, routing and DNS protocols, and container networking",
      kind: "build",
      title: "Write the address and routing plan for a hub-and-spoke cloud network",
      brief:
        "Ashdown Pharma is building a hub-and-spoke network in one cloud region: a hub virtual network for shared services (firewalls, DNS, VPN gateway) and four spoke networks (production, test, data platform, a partner-facing zone). The on-premises network already uses 10.0.0.0/12 and 192.168.0.0/16. Each spoke needs room for at least 1,000 hosts across three subnets, and the partner zone must also be reachable by a partner whose network uses 10.8.0.0/16, which overlaps with Ashdown's own on-premises range. Internal names must resolve across cloud and on-premises. Write the addressing, routing, NAT and DNS plan.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the address plan, the routing design, how you handle the partner overlap, and the DNS design.",
          parts: [
            part(
              "Address plan",
              "Allocates non-overlapping RFC 1918 space outside 10.0.0.0/12 and 192.168.0.0/16 (for example 10.64.0.0/16 for the hub and a /16 or /18 per spoke, each split into three /22 or larger subnets for 1,000+ hosts), summarisable for routing.",
              "Avoid 10.0.0.0-10.15.255.255 and 192.168.0.0/16, which on-premises owns. Carve 10.64.0.0/14 for the cloud: hub 10.64.0.0/16; spokes 10.65.0.0/16 (production), 10.66.0.0/16 (test), 10.67.0.0/16 (data), 10.68.0.0/16 (partner zone, from the next /14 if you want 10.64.0.0/14 to stay internal-only). Within each spoke, three /22 subnets (1,022 usable addresses each) leave room to grow, and the whole cloud estate summarises as a couple of routes toward on-premises."
            ),
            part(
              "Routing",
              "Peers each spoke to the hub only (no spoke-to-spoke peering), with user-defined routes sending spoke traffic to the hub firewall for inspection, and the hub advertising summarised cloud prefixes to on-premises over BGP via the VPN or interconnect gateway.",
              "Hub-and-spoke peering: each spoke peers with the hub only, and a default route (or on-premises and other-spoke prefixes) in every spoke points at the hub firewall's internal address so east-west and north-south traffic is inspected. The hub gateway speaks BGP with on-premises, advertising the cloud summary (10.64.0.0/14) and learning 10.0.0.0/12 and 192.168.0.0/16. Spokes never route directly to each other."
            ),
            part(
              "Partner overlap and NAT",
              "Resolves the 10.8.0.0/16 overlap with NAT at the partner boundary (source/destination NAT to a translation range) so partner hosts appear as non-overlapping addresses inside Ashdown, and restricts the partner zone to the translated range.",
              "The partner's 10.8.0.0/16 collides with Ashdown's on-premises 10.0.0.0/12, so terminate the partner connection in the partner zone behind a NAT device: translate partner sources into an unused range (for example 100.64.0.0/16) and present Ashdown's partner-facing services to the partner on a translated range too. Only the partner zone ever sees partner addresses, and the hub firewall allows only the translated range to the published services."
            ),
            part(
              "DNS",
              "Uses private DNS zones in the cloud for cloud names, conditional forwarding both ways (on-premises servers forward cloud zones to a cloud resolver endpoint in the hub; the cloud resolver forwards on-premises zones to on-premises servers), and places resolvers in the hub.",
              "Private DNS zones in the cloud hold cloud records (for example prod.ashdown.internal). Inbound and outbound resolver endpoints live in the hub: on-premises DNS servers conditionally forward the cloud zones to the inbound endpoint, and the cloud resolver forwards on-premises zones (corp.ashdown.internal) through the outbound endpoint to the on-premises servers. Spokes use the hub resolver, so every name resolves from both sides."
            ),
          ],
        },
      ],
    },

    // ---------------- Network security (3) ----------------
    {
      slug: "zero-trust-for-a-remote-workforce",
      objective: "Zero Trust architecture principles: microsegmentation, SASE/SSE, CASB, identity as the perimeter, device trust, and least privilege",
      kind: "build",
      title: "Move a company from VPN-everything to Zero Trust",
      brief:
        "Calloway Insurance has 3,000 staff, two-thirds remote. Today everyone connects to a full-tunnel VPN that drops them onto a flat internal network where any laptop can reach any server; SaaS traffic is backhauled through the data centre; a recent incident saw a compromised contractor laptop scan and reach the HR database over the VPN; the business has adopted 40 SaaS applications, half of them never approved by IT. Design the move to a Zero Trust architecture and explain how each principle changes what the contractor's laptop could have done.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the target architecture: identity and device trust, access model, segmentation, and SaaS control.",
          parts: [
            part(
              "Identity and device as the perimeter",
              "Makes identity the control point: SSO with MFA for every access decision, and device trust (managed device, posture checks such as disk encryption, patch level, EDR running) evaluated per request, so an unmanaged or unhealthy device gets no access.",
              "Every access request is authenticated with SSO and MFA and authorised against the user's role and the device's posture (company-managed, encrypted, patched, EDR healthy), re-evaluated continuously. The contractor's compromised laptop would have failed posture (or been unmanaged) and received nothing, regardless of where it connected from."
            ),
            part(
              "Access model",
              "Replaces the full-tunnel VPN with Zero Trust Network Access via a SASE/SSE platform: users get brokered, per-application connections to only the applications they are authorised for, never network-level access; least privilege by role.",
              "Retire the full-tunnel VPN and deliver access through an SSE/SASE service: the user's device connects to the service, which brokers a connection to each specific application (the claims portal, the HR app) after policy passes. Users never get an IP on the internal network, so there is nothing to scan; the contractor would have reached only the one application in their entitlement."
            ),
            part(
              "Microsegmentation",
              "Segments the internal network and workloads so servers can reach only what they need (identity- or tag-based policies, host or hypervisor firewalls), isolating the HR database from everything but its application tier.",
              "Inside the data centre and cloud, apply microsegmentation: policies based on workload identity or tags allow the HR application servers to reach the HR database on its port and nothing else can. A compromised host, even one already inside, cannot pivot to the database because the lateral path does not exist."
            ),
            part(
              "SaaS and internet traffic",
              "Sends SaaS and internet traffic directly through the SSE service's secure web gateway and CASB rather than backhauling: discovers the unsanctioned applications, applies policy (allow, allow read-only, block), DLP and threat inspection, with per-application controls.",
              "Stop backhauling: internet and SaaS traffic goes from the device to the SSE's secure web gateway, which inspects it and applies policy. The CASB discovers all 40 SaaS applications in use, classifies them, and enforces decisions: sanction and integrate with SSO, allow with restrictions (no uploads, DLP on sensitive data), or block. Shadow IT becomes visible and governed instead of invisible."
            ),
          ],
        },
      ],
    },
    {
      slug: "access-control-rules-three-tier",
      objective: "Access control configuration: firewall and NACL rules, security-group inbound/outbound rules, geolocation and URL filtering, and DLP",
      kind: "build",
      title: "Write the access-control rules for a three-tier cloud application",
      brief:
        "Harrowgate Travel's booking application in the cloud has three tiers in three subnets: a web tier behind a public load balancer (HTTPS from customers), an application tier (listening on TCP 8080), and a database tier (PostgreSQL, TCP 5432). Operations staff administer servers from the corporate network 203.0.113.0/24 by SSH. The company sells only in the UK and Ireland and has been hit by credential-stuffing from abroad. Servers must be able to download OS updates from the vendor's repositories but staff do not want servers browsing the internet freely. Finally, the compliance team worries about card numbers leaving via web forms or uploads. Write the rules.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the security-group rules per tier, the subnet NACL approach, the geolocation and URL filtering, and the DLP control.",
          parts: [
            part(
              "Security groups (stateful)",
              "Writes least-privilege inbound rules per tier: web SG allows 443 from the load balancer (or internet if the LB is in it); app SG allows 8080 only from the web SG; database SG allows 5432 only from the app SG; SSH (22) allowed only from 203.0.113.0/24 (or via a bastion); outbound restricted to what is needed; references SGs rather than CIDRs between tiers.",
              "sg-web: inbound TCP 443 from the load balancer's security group (or 0.0.0.0/0 if the LB fronts it directly); TCP 22 from 203.0.113.0/24. sg-app: inbound TCP 8080 from sg-web only; TCP 22 from 203.0.113.0/24. sg-db: inbound TCP 5432 from sg-app only; no SSH. Outbound: web and app allow 443 to the update repositories' addresses or through the egress proxy; database allows nothing outbound except the update path. Security groups are stateful, so return traffic needs no rule; referencing groups rather than CIDRs means rules survive instance changes."
            ),
            part(
              "Network ACLs (stateless)",
              "Uses subnet NACLs as a coarse second layer: deny-by-default with explicit allows for the tier's traffic plus the ephemeral port range (1024-65535) for return traffic because NACLs are stateless; blocks known-bad ranges at the subnet edge.",
              "NACLs are stateless, so every allowed flow needs both directions: on the database subnet, allow inbound 5432 from the app subnet range and outbound 1024-65535 to it, and deny everything else, including any inbound from the web subnet. On the web subnet, allow inbound 443 and outbound ephemeral ports to 0.0.0.0/0. Use NACLs for broad subnet-level denies (for example a known-abusive range) and leave the fine-grained work to security groups."
            ),
            part(
              "Geolocation and URL filtering",
              "Applies geolocation filtering at the edge (WAF / load balancer / CDN) to allow only UK and Ireland (with an exception path for legitimate travellers, such as step-up authentication), and URL filtering on server egress via a proxy or egress firewall allowing only the update repository domains.",
              "At the edge WAF or CDN, apply a geolocation rule that allows traffic from the UK and Ireland and challenges or blocks the rest, which cuts most credential-stuffing at the door; keep a path for customers travelling abroad, such as a challenge or step-up MFA rather than a hard block. For server egress, route outbound through an egress firewall or proxy with URL filtering that allows only the OS vendor's repository domains and the monitoring endpoints, denying general web browsing."
            ),
            part(
              "DLP",
              "Adds data loss prevention inspection on outbound web traffic and uploads (and in the web application's form handling) for payment card patterns with checksum validation, blocking or alerting, and ensures card data is tokenised rather than stored.",
              "Enable DLP inspection on the egress proxy and on the application's upload path for primary account number patterns validated with the Luhn check, blocking the transfer and alerting compliance; add the same detector to the WAF for form posts leaving to third parties. Reduce the problem at source by tokenising card numbers with the payment provider so the application never holds them."
            ),
          ],
        },
      ],
    },
    {
      slug: "ddos-bgp-hijack-zero-day",
      objective:
        "Common cloud and network threats, vulnerabilities, and mitigations: DDoS, on-path attacks, BGP hijacking, zero-days, and patch/vulnerability management programs",
      kind: "case",
      title: "Defend a public service through three attacks in a quarter",
      brief:
        "You are the network architect at Stonebridge Exchange, a ticket marketplace whose public web platform runs in the cloud behind a load balancer, with its own IP prefix announced via BGP from a cloud edge and a colocation site. It is a busy quarter.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Week 2: during a major on-sale, inbound traffic jumps from 2 Gbps to 180 Gbps of UDP packets aimed at the platform's address range, saturating the colocation site's 10 Gbps uplinks. Legitimate customers cannot reach the site.",
          ask: "What is this, what do you do now, and what should already have been in place?",
          parts: [
            part(
              "Attack and response",
              "Identifies a volumetric DDoS attack and responds by moving traffic behind a cloud DDoS-protection / scrubbing service and CDN with anycast capacity far above 180 Gbps, dropping the UDP flood at the edge (the service only needs TCP 443), and withdrawing or de-preferring the saturated colocation path.",
              "A volumetric DDoS flood: 180 Gbps of UDP has nothing to do with a web application that only needs TCP 443. Shift the public prefix behind the cloud provider's DDoS protection and CDN, whose anycast edge absorbs the volume and drops UDP toward an HTTPS-only service, and withdraw the prefix from the saturated colocation uplinks so traffic enters only through the protected edge."
            ),
            part(
              "What should have been in place",
              "Names always-on DDoS protection and CDN fronting, rate limiting and a WAF at the edge, no direct exposure of origin addresses, over-provisioned or scrubbing-backed capacity, and a rehearsed DDoS runbook with provider contacts.",
              "Always-on DDoS protection with the origin addresses hidden behind the CDN, so a flood at the public addresses never reaches a 10 Gbps uplink; edge rate limiting and a WAF for application-layer floods; and a runbook with the provider's response contacts rehearsed before the on-sale calendar, not during it."
            ),
          ],
        },
        {
          text: "Week 7: customers in another region report being served a fake copy of the site that harvests credentials. Looking-glass tools show a foreign network announcing a more specific /24 inside Stonebridge's /22 prefix, and parts of the internet are routing to it.",
          ask: "What is happening and how do you respond, immediately and permanently?",
          parts: [
            part(
              "Response",
              "Identifies a BGP prefix hijack (a more-specific announcement stealing traffic) and responds immediately by announcing equally specific /24s itself, contacting upstream providers to filter the rogue announcement, and warning customers; permanently by creating RPKI Route Origin Authorizations for its prefixes, registering IRR route objects, and monitoring announcements.",
              "A BGP hijack: the attacker announces a more-specific /24, which wins over the /22 everywhere it propagates. Immediately announce your own /24s so you are at least as specific, open tickets with your upstreams and the attacker's upstream to filter the rogue route, and alert customers about the fake site. Permanently: publish RPKI Route Origin Authorizations so networks doing route origin validation drop announcements not from your AS, keep IRR route objects current so upstream filters are built correctly, and subscribe to a BGP monitoring service that alerts on any announcement of your space."
            ),
          ],
        },
        {
          text: "Week 11: a critical zero-day is published for the exact model of edge firewall at the colocation site; exploitation is observed in the wild and the vendor says a patch is 'coming within days'. The firewall terminates the site-to-site VPNs and fronts the management network.",
          ask: "What do you do before the patch exists, and what does a patch and vulnerability management programme look like so this is routine?",
          parts: [
            part(
              "Compensating controls",
              "Applies vendor workarounds, restricts exposure of the vulnerable service (management interface off the internet, allow-list sources, disable the affected feature), increases monitoring for indicators of compromise, and prepares to fail over or isolate the device.",
              "Follow the vendor's interim guidance: disable or restrict the vulnerable feature, remove the management interface from any internet exposure and allow-list administrative sources, and if the exploit targets the VPN service, limit it to known peer addresses. Watch logs and traffic for the published indicators of compromise, take a configuration backup, and be ready to fail over the VPNs to the cloud-side gateway and isolate the device if you see signs of exploitation."
            ),
            part(
              "The programme",
              "Describes an ongoing programme: an asset inventory of network devices and versions, vulnerability feeds and scanning, risk-based SLAs for patching (for example critical within days), test and change windows, verification scans, and an emergency change path.",
              "A programme, not a scramble: a maintained inventory of every network device, model and firmware; subscriptions to vendor and national advisories plus regular authenticated scans; a risk-based policy (critical and exploited within days, high within two weeks, others on the monthly cycle); a test device or lab, standard change windows, and a pre-approved emergency change path; and a verification scan after patching. Report compliance against the SLAs monthly."
            ),
          ],
        },
      ],
    },

    // ---------------- Operations, monitoring and performance (2) ----------------
    {
      slug: "availability-math-and-dr-targets",
      objective:
        "Operating and maintaining a network environment: risk management, business-continuity metrics (MTTR, MTBF, RPO/RTO), disaster recovery, SLAs/SLOs, and network cost management",
      kind: "build",
      title: "Turn an outage history into availability targets and a DR plan",
      brief:
        "Wexford Logistics' single internet edge router failed four times in the last 12 months. From the incident records the mean time between failures (MTBF) is 2,000 hours and the mean time to repair (MTTR) is 4 hours, because a replacement is shipped from the vendor each time. The business says it loses about 20,000 for every hour the warehouse network is offline, and wants a 99.95% availability commitment from IT for the edge. Finance has 60,000 a year for improvements. Work out where they stand, what the target means, what to buy, and the recovery targets for the network.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Calculate current availability, express the target as downtime, recommend the investment, and set the network RTO/RPO and SLA/SLO wording.",
          parts: [
            part(
              "Current availability",
              "Computes availability = MTBF / (MTBF + MTTR) = 2000 / 2004, about 99.80%, equal to roughly 17.5 hours of downtime a year (4 failures x 4 hours = 16 hours observed), and costs it at about 320,000-350,000 a year.",
              "Availability = MTBF / (MTBF + MTTR) = 2,000 / (2,000 + 4) = 0.99800, about 99.80%, which is roughly 17.5 hours of downtime a year; the observed 4 failures x 4 hours = 16 hours agrees. At 20,000 an hour that is around 320,000 a year of loss from one router."
            ),
            part(
              "What 99.95% means",
              "Converts the target to allowed downtime: 0.05% of 8,760 hours is about 4.4 hours a year (about 22 minutes a month), and notes a single device with a 4-hour MTTR cannot meet it: one failure uses the whole year's budget.",
              "99.95% allows 0.0005 x 8,760 = 4.38 hours of downtime a year, about 22 minutes a month. With a 4-hour MTTR a single failure consumes the entire annual budget, so no amount of care with one router gets there; the design must either cut MTTR to minutes or remove the single point of failure."
            ),
            part(
              "Investment",
              "Recommends redundancy that turns a failure into seconds of impact (a second edge router in an active-active or active-passive pair with a first-hop redundancy protocol and dual uplinks from different carriers), plus a support contract with same-day or spare-on-site hardware, and shows it pays back against the 320,000 loss.",
              "Buy a second edge router and run the pair with a first-hop redundancy protocol (or active-active with ECMP), each with its own uplink from a different carrier, so a router or circuit failure costs seconds, not hours; add a support contract with a spare on site or four-hour replacement so the pair is restored quickly. Within the 60,000 budget this removes almost all of the 320,000 annual loss: the payback is weeks."
            ),
            part(
              "RTO/RPO and the commitment",
              "Sets a network RTO (for example 15 minutes for the edge, automatic failover in seconds) and notes RPO applies to data (the network's RPO concern is configuration backups, so configs are backed up on change), writes an internal SLO (99.95% measured monthly from outside) and distinguishes it from carrier SLAs.",
              "Network RTO: automatic failover within seconds, and a 15-minute manual recovery objective if both paths fail. RPO: the network holds no business data, so the recovery point is the device configuration, backed up on every change so a replacement can be restored in minutes. Write the internal SLO as 99.95% monthly availability of the edge measured by external probes every minute, with an error budget, and keep it separate from the carriers' SLAs, which pay credits but do not keep the warehouse running."
            ),
          ],
        },
      ],
    },
    {
      slug: "firewall-changes-under-gitops",
      objective: "Automation and scripting to administer a hybrid cloud environment: infrastructure as code, version control, CI/CD and GitOps pipelines, and desired-state configuration",
      kind: "build",
      title: "Put hybrid firewall changes under infrastructure as code and GitOps",
      brief:
        "Danvers Freight manages firewall rules on two on-premises firewalls and in three cloud virtual networks by hand. Changes are requested by email, typed in by whoever is free, and nobody can say which rules exist or why. Last month a cloud security-group rule allowing SSH from the internet appeared with no ticket. The network team wants every rule defined as code, reviewed before it applies, applied consistently to on-premises and cloud, and any manual change detected and reversed. Design the approach.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the IaC/GitOps approach for the firewall estate: repository and format, pipeline, desired state, and drift handling.",
          parts: [
            part(
              "Rules as code",
              "Defines rules declaratively in version control (a structured source of truth with owner, justification and expiry per rule) rendered to each platform's format by IaC tools or vendor APIs, with a module per platform.",
              "Keep a single repository where each rule is a declarative record: source, destination, port, action, owner, ticket, justification and expiry date. Tooling renders that intent into the cloud provider's security-group definitions through Terraform and into the on-premises firewalls through their configuration APIs (Ansible modules or the vendor's Terraform provider), so one definition drives both environments."
            ),
            part(
              "Review and pipeline",
              "Requires a pull request with automated validation (syntax, policy checks that block forbidden rules such as 0.0.0.0/0 on 22, overlap detection) and a plan output, peer review, and an automated apply on merge; emergency changes follow the same path with expedited review.",
              "A change is a pull request. The pipeline validates syntax, runs policy checks that reject any rule allowing administrative ports from the internet or any rule without an owner and expiry, detects shadowed or overlapping rules, and shows the plan of what will change on each firewall. A second engineer reviews, and merging triggers the apply. Emergency changes use the same pipeline with an expedited reviewer, never a console login."
            ),
            part(
              "Desired state",
              "Treats the repository as the desired state that is continuously reconciled to the devices (GitOps), so the system converges to what the code says rather than accumulating manual edits.",
              "GitOps: the repository is the only desired state, and a reconciliation job continuously compares each firewall's live configuration with it and converges the device to the code. The devices are no longer 'edited'; they are made to match."
            ),
            part(
              "Drift detection and response",
              "Detects out-of-band changes (scheduled plan/diff or the reconciler's comparison), alerts with the diff, and reverts automatically for security-relevant drift (like the internet SSH rule) or opens a PR to adopt it; removes manual write access except break-glass.",
              "Any difference between live and code is drift. The reconciler alerts with the exact diff; security-relevant drift such as an SSH-from-anywhere rule is reverted immediately and raises an incident, while benign drift opens a pull request so someone decides whether to adopt or remove it. Remove manual write access to firewalls and security groups except a logged break-glass account, so drift becomes rare and always visible."
            ),
          ],
        },
      ],
    },

    // ---------------- Network troubleshooting (2) ----------------
    {
      slug: "site-to-site-connectivity-case",
      objective:
        "Troubleshooting connectivity issues: DNS failures, asymmetric routing, duplicate IP/MAC addresses, DHCP issues, IPSec and BGP problems, and routing loops",
      kind: "case",
      title: "Troubleshoot a hybrid site-to-site connection",
      brief:
        "You are the senior network engineer at Oakenshaw Foods. A new IPsec site-to-site VPN connects the factory (10.20.0.0/16) to a cloud virtual network (10.120.0.0/16), running BGP over the tunnel. The cloud side also has an existing interconnect to head office (10.10.0.0/16), which has its own route to the factory over the corporate WAN.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The tunnel is up and BGP is established. From a factory server you can ping a cloud VM, but TCP connections from the cloud VM to the factory's database (10.20.5.10) hang. A packet capture on the database server shows SYNs arriving from the cloud VM and SYN-ACKs being sent. A capture on the cloud VM shows SYNs leaving but no SYN-ACK arriving.",
          ask: "What is the most likely cause and how do you confirm and fix it?",
          parts: [
            part(
              "Diagnosis",
              "Identifies asymmetric routing: the factory's return path to 10.120.0.0/16 prefers a different route (via head office over the corporate WAN), so SYN-ACKs leave by a path where a stateful firewall drops them as unsolicited; confirms with traceroute from the factory to the cloud VM and the factory routing table.",
              "Asymmetric routing. The SYN came in over the VPN, but the factory's route to 10.120.0.0/16 points toward head office over the corporate WAN (learned before the tunnel existed), so the SYN-ACK takes that path and a stateful firewall along it, which never saw the SYN, drops it. ICMP ping may have worked because that firewall allows ICMP or because ping took a consistent path. Confirm with traceroute from the database server to the cloud VM and by checking the factory router's route for 10.120.0.0/16."
            ),
            part(
              "Fix",
              "Makes the paths symmetric: prefer the VPN for cloud prefixes at the factory (BGP local preference / route metric), or stop head office advertising the cloud prefix toward the factory, and uses the WAN path only as backup with consistent preference on both sides.",
              "Make the factory prefer the tunnel for cloud prefixes: raise local preference on routes learned over the VPN BGP session (or lower the metric of the WAN-learned route), and have head office stop re-advertising 10.120.0.0/16 toward the factory except as a backup with a longer AS path. Apply matching preferences on the cloud side so both directions use the tunnel, and re-test the TCP connection."
            ),
          ],
        },
        {
          text: "Traffic flows. Two days later the BGP session over the tunnel starts flapping every few minutes: logs show hold timer expired, then the session re-establishes. The tunnel itself stays up. Pings with small packets across the tunnel succeed; pings with 1,400-byte payloads and the don't-fragment bit set fail.",
          ask: "What is causing the flapping and how do you fix it?",
          parts: [
            part(
              "Diagnosis and fix",
              "Identifies an MTU / fragmentation problem: IPsec overhead shrinks the usable MTU, path MTU discovery is failing (ICMP fragmentation-needed blocked), so large BGP UPDATE packets are dropped and the hold timer expires; fixes by lowering the tunnel interface MTU, clamping TCP MSS on the tunnel, and allowing ICMP type 3 code 4.",
              "Large packets die, small ones live: the IPsec encapsulation reduces the usable payload below 1,500 bytes, and because ICMP 'fragmentation needed' messages are being blocked, path MTU discovery cannot tell the endpoints. BGP keepalives are tiny and get through, but a large UPDATE is dropped, the peer never acknowledges and the hold timer expires. Set the tunnel interface MTU below the physical MTU to leave room for the IPsec headers, clamp TCP MSS on the tunnel so sessions negotiate a safe segment size, and permit ICMP type 3 code 4 through the firewalls so PMTUD works again."
            ),
          ],
        },
        {
          text: "Stable again. Then the factory reports that a packaging-line controller at 10.20.7.44 drops off the network intermittently; sometimes its traffic reaches a different device entirely. The switch's MAC table shows 10.20.7.44's ARP entry alternating between two MAC addresses, and a technician mentions a new label printer was 'given a spare address' last week.",
          ask: "What is the problem and how do you resolve and prevent it?",
          parts: [
            part(
              "Duplicate IP",
              "Identifies a duplicate IP address (two devices answering ARP for 10.20.7.44, so the ARP cache flips between MACs), finds the second device by its MAC and switch port, moves it to a free address or a DHCP reservation, and prevents recurrence with IP address management records and DHCP snooping / dynamic ARP inspection.",
              "Two devices hold 10.20.7.44: the controller and the new label printer. Hosts' ARP caches flip between the two MAC addresses, so traffic for the controller sometimes goes to the printer. Trace the printer's MAC to its switch port, change its address to a free one (better, a DHCP reservation), and clear ARP caches. Prevent it by recording every static address in the IPAM, moving static devices to reservations where possible, and enabling DHCP snooping with dynamic ARP inspection on the access switches so a rogue address cannot poison ARP."
            ),
          ],
        },
      ],
    },
    {
      slug: "read-the-tool-output",
      objective: "Analyzing tool and command output to resolve issues",
      kind: "build",
      title: "Diagnose four faults from tool output",
      brief:
        "Four tickets arrive at Pembridge Analytics with captures attached. (A) Users cannot reach app.pembridge.example. dig app.pembridge.example @10.1.0.53 returns 'status: SERVFAIL' with an empty answer section; dig @1.1.1.1 returns an A record. (B) A video call quality complaint. mtr from a user's office to the cloud gateway shows hops 1-3 with 0% loss, hop 4 with 60% loss, and hops 5-9 (including the destination) with 0% loss and steady latency. (C) A backup to a cloud bucket is slow. iperf3 between the backup server and a cloud VM reports 940 Mbps on a single stream with no retransmits, but the backup tool moves 40 Mbps and its server shows one TCP connection to the bucket with a high number of retransmissions and a window size that keeps collapsing. (D) A new web server cannot be reached. tcpdump on the server shows SYN packets arriving from the client on port 443 and no SYN-ACK leaving; the web service is listening on 443 per the service manager. For each, state the diagnosis and the fix.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "For each ticket, read the output, give the diagnosis and the next action.",
          parts: [
            part(
              "A: SERVFAIL from the internal resolver",
              "Reads SERVFAIL from the internal resolver (not NXDOMAIN) as the resolver failing to resolve, likely a broken forwarder, DNSSEC validation failure or unreachable upstream for that zone, since a public resolver answers; checks the resolver's logs and forwarding/validation configuration.",
              "SERVFAIL means the internal resolver tried and failed, not that the name does not exist (that would be NXDOMAIN); the public resolver answering shows the zone itself is healthy. Check 10.1.0.53: its forwarder or the delegation for pembridge.example is unreachable or misconfigured, or DNSSEC validation is failing on that zone. Look at the resolver's logs, test the forwarder directly, and temporarily disable validation for the zone to confirm, then fix the forwarder or the signing."
            ),
            part(
              "B: loss at one hop only",
              "Interprets loss at an intermediate hop that does not continue to later hops as ICMP rate limiting or de-prioritisation on that router, not real packet loss; concludes the path is healthy and looks elsewhere (Wi-Fi, QoS, codec, the far-end) for the call quality issue.",
              "If hop 4 were really dropping 60% of packets, every hop after it would show at least that loss; they show 0%. Hop 4's router is rate-limiting or de-prioritising the ICMP/TTL-expired replies it generates, which is normal and harmless. The WAN path is fine. Look at the user's local network (Wi-Fi interference, congestion), QoS marking for voice and video, and the call platform's own quality statistics instead."
            ),
            part(
              "C: fast link, slow transfer",
              "Separates link capacity (940 Mbps clean on iperf3) from the application's single connection suffering retransmissions and window collapse: a path issue specific to that flow (for example a middlebox, MTU, or a lossy path to the bucket endpoint) or an application that uses one TCP stream over a high-latency path; next steps: test to the bucket endpoint, check MTU/MSS and firewall inspection, and enable multipart/parallel streams in the backup tool.",
              "The network between the two VMs is fine at 940 Mbps, so the problem is specific to the backup flow to the bucket endpoint: a single TCP connection with retransmissions and a collapsing window points to loss or a middlebox on that path (an inspecting firewall or proxy, an MTU mismatch) or to one stream over a high-latency path never filling the pipe. Run iperf3 or a large object upload toward the bucket endpoint's path, check MTU and MSS clamping and whether the firewall inspects that traffic, and switch the backup tool to multipart uploads with several parallel streams, which also hides latency."
            ),
            part(
              "D: SYN in, nothing out",
              "Reads SYNs arriving with no SYN-ACK as a host-level block: a host firewall dropping inbound 443, or the service bound to the wrong interface/address (listening on localhost only), or a return-route problem; checks the listening socket's bind address and the host firewall rules.",
              "The packets reach the server, so the cloud network and security groups are passing them; the host is not answering. Either the host firewall is dropping inbound 443, or the web service is listening on 127.0.0.1:443 rather than the server's address, or the server has no route back to the client. Check the listening socket's bind address (ss -ltnp), the host firewall rules, and the routing table; fix the bind address or add the firewall allow, then watch tcpdump for the SYN-ACK."
            ),
          ],
        },
      ],
    },
  ],
};
