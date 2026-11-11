import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-155: Microsoft Certified: Azure Network Engineer Associate (AZ-700).
//
// Aligned to the AZ-700 study guide, skills measured as of July 27, 2026
// (Design and implement core networking infrastructure 25-30% / Design,
// implement, and manage connectivity services 20-25% / Design and implement
// application delivery services 15-20% / Design and implement private access
// to Azure services 10-15% / Design and implement Azure network security
// services 15-20%), re-read on 2026-11-07:
//   https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-700
// Density (docs/labs.md, policy "hybrid") for the seed's unit weights
// 28/23/18/13/18: 3 / 2 / 2 / 2 / 2. The labs produce what a network engineer
// produces: an address plan, a hybrid DNS design, a routing diagnosis, a
// site-to-site VPN HA design, an ExpressRoute design, Front Door and
// Application Gateway configurations, private endpoint DNS, a service-
// versus-private-endpoint decision, Azure Firewall rules, and a WAF rollout.
// Retired options are treated as retired: Basic Load Balancer (30 September
// 2025) and Application Gateway v1 (28 April 2026) never appear as choices,
// and Front Door (classic) is noted as retiring on 31 March 2027.
//
// Sources behind the figures (learn.microsoft.com, checked 2026-11-07):
//   IP planning: 5 reserved addresses per subnet, /29 smallest, GatewaySubnet
//   /27, AzureFirewallSubnet /26, RFC 1918 and 100.64.0.0/10 allowed:
//   /azure/networking/design-guide/ip-planning
//   AzureBastionSubnet /26 or larger for Basic/Standard/Premium; SKU features:
//   /azure/bastion/bastion-sku-comparison
//   DNS Private Resolver inbound/outbound endpoints, rulesets (up to 1,000
//   rules), dedicated delegated subnet /28-/24: /azure/dns/dns-private-resolver-overview
//   routing: system routes, longest prefix then user > BGP > system, peering
//   and service-endpoint routes preferred, IP forwarding, 0.0.0.0/0 UDR,
//   GatewaySubnet cautions, 400 UDRs per table: /azure/virtual-network/virtual-networks-udr-overview
//   VPN gateway SKUs (AZ SKUs recommended; VpnGw1-5 non-AZ slated for
//   migration; Basic not for production, no BGP/active-active, 10 tunnels,
//   100 Mbps; VpnGw2AZ Gen2 1.25 Gbps, 30 tunnels; VpnGw4AZ/5AZ 100 tunnels):
//   /azure/vpn-gateway/about-gateway-skus
//   ExpressRoute FAQ (Local/Standard/Premium reach and VNet links 10/10/20-100,
//   Local egress included, Direct 10/100 Gbps, Global Reach needs Premium
//   across geopolitical regions, FastPath bypasses the gateway, Microsoft 365
//   over Microsoft peering with Premium and authorisation, two links per
//   circuit, multi-site for resilience): /azure/expressroute/expressroute-faqs
//   Front Door tiers (Premium adds Private Link to origin, Microsoft-managed
//   WAF rule set, bot protection): /azure/frontdoor/standard-premium/tier-comparison;
//   classic retirement 2027-03-31: /azure/frontdoor/tier-migration
//   Application Gateway rules (basic / path-based; listener + backend
//   settings + backend pool; priority 1-20000 unique; redirect types):
//   /azure/application-gateway/configuration-request-routing-rules;
//   v1 retired 2026-04-28: /azure/application-gateway/v1-retirement
//   private endpoint DNS zone names and CNAME behaviour: /azure/private-link/private-endpoint-dns
//   service vs private endpoints comparison: /azure/networking/design-guide/private-platform-as-a-service
//   Firewall SKUs (Basic 250 Mbps; Standard 30 Gbps; Premium 100 Gbps, TLS
//   inspection, IDPS, URL filtering): /azure/firewall/choose-firewall-sku;
//   rule processing (threat intel first; DNAT, network, application; 100-65000;
//   network rules terminating; implicit deny): /azure/firewall/rule-processing
//   WAF on Application Gateway (Detection vs Prevention, anomaly scoring
//   threshold 5, exclusions, custom rules first, per-site/per-URI policies):
//   /azure/web-application-firewall/ag/ag-overview; rule sets (DRS 2.2
//   recommended, DRS 2.1, CRS 3.2 legacy, Bot Manager 1.1):
//   /azure/web-application-firewall/ag/application-gateway-crs-rulegroups-rules
//   Load Balancer SKUs (Basic retired 2025-09-30; Standard 99.99% SLA, zones,
//   secure by default, outbound rules; Gateway for NVAs): /azure/load-balancer/skus
//   NSG default rules and service tags: /azure/virtual-network/network-security-groups-overview

export const AZ700_LABS: SeedLabSet = {
  trackCode: "AZ700",
  sources: [
    source("https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-700", "exam_outline", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/networking/design-guide/ip-planning", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/bastion/bastion-sku-comparison", "cloud_pricing_limits", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/dns/dns-private-resolver-overview", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/vpn-gateway/about-gateway-skus", "cloud_pricing_limits", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/expressroute/expressroute-faqs", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/frontdoor/standard-premium/tier-comparison", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/frontdoor/tier-migration", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/application-gateway/configuration-request-routing-rules", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/application-gateway/v1-retirement", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/networking/design-guide/private-platform-as-a-service", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/firewall/choose-firewall-sku", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/firewall/rule-processing", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/web-application-firewall/ag/ag-overview", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/web-application-firewall/ag/application-gateway-crs-rulegroups-rules", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/load-balancer/skus", "cloud_pricing_limits", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/virtual-network/network-security-groups-overview", "reference", "2026-11-07"),
  ],
  labs: [
    // ----------------------------------------------------------------------
    // Design and Implement Core Networking Infrastructure (3)
    // ----------------------------------------------------------------------
    {
      slug: "hub-spoke-address-plan",
      objective: "Planning network segmentation and address spaces",
      kind: "build",
      title: "Write the address plan for a hub-and-spoke region",
      brief:
        "Thornfield Insurance, a fictional firm, is building its first Azure region (UK South) as a hub with three spokes. On-premises already uses 10.0.0.0/12 and 192.168.0.0/16, and a partner connected by VPN uses 172.16.0.0/16; none of these may overlap with Azure. The hub must hold: a VPN gateway now and an ExpressRoute gateway later; Azure Firewall (Standard, with the management subnet the SKU may later need); Azure Bastion (Standard SKU); an Azure DNS Private Resolver with inbound and outbound endpoints; and a shared private-endpoint subnet. The three spokes (web, data, analytics) each need about 400 usable addresses today and room to double. A second region will be added next year with the same layout. Produce the address plan: ranges for hub and spokes, the hub subnets with sizes, and the rules you applied.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the address plan with sizes and the reasoning behind them.",
          parts: [
            part(
              "Choosing the Azure range",
              "Picks a private range that does not overlap 10.0.0.0/12, 192.168.0.0/16 or 172.16.0.0/16 -- for example a block inside 10.16.0.0/12 or the remainder of 10.0.0.0/8 above 10.15.255.255 -- allocates a per-region block large enough for hub and spokes with headroom (for example a /16 per region), and reserves the next block for the second region; cites RFC 1918 (and optionally 100.64.0.0/10) as allowed space.",
              "On-premises owns 10.0.0.0-10.15.255.255 (the /12), 192.168.0.0/16 and the partner 172.16.0.0/16, so Azure takes 10.16.0.0/12 for all regions: UK South gets 10.16.0.0/16 and next year's region is reserved 10.17.0.0/16, with the rest of the /12 for future regions. All of it is RFC 1918 space (100.64.0.0/10 is also usable in Azure if private space ever runs out). Non-overlap is checked against every connected network, not just the datacenter, because a VPN-connected partner range that overlaps a spoke would route wrongly or silently drop."
            ),
            part(
              "Spoke sizing",
              "Gives each spoke a /23 or larger (a /23 has 512 addresses; after Azure's five reserved per subnet a /24 yields 251 usable, so 400 usable with room to double needs about a /22 per spoke), split into subnets with the five-address reservation accounted for.",
              "Each spoke gets a /22 (1,024 addresses): a /24 gives only 251 usable addresses after Azure reserves five per subnet, so 400 usable today already needs two /24s and doubling needs four. Web spoke 10.16.16.0/22, data spoke 10.16.20.0/22, analytics spoke 10.16.24.0/22, each divided into /24 subnets per tier with one /26 kept for the spoke's own private endpoints. Everything from 10.16.32.0 upward stays unallocated for new spokes."
            ),
            part(
              "Hub subnets",
              "Lays out the hub (for example 10.16.0.0/20) with the named dedicated subnets at or above the documented minimums: GatewaySubnet /27 or larger (one gateway subnet serves both the VPN and ExpressRoute gateways), AzureFirewallSubnet /26, AzureFirewallManagementSubnet /26 reserved, AzureBastionSubnet /26 or larger, two DNS Private Resolver subnets (dedicated, delegated, /28 to /24) for inbound and outbound endpoints, and a private-endpoint subnet.",
              "Hub 10.16.0.0/20: GatewaySubnet 10.16.0.0/27 (a /27 at minimum; one GatewaySubnet hosts both the VPN gateway and, later, the ExpressRoute gateway -- using a /26 leaves room), AzureFirewallSubnet 10.16.1.0/26, AzureFirewallManagementSubnet 10.16.1.64/26 reserved now so the firewall can be switched to forced-tunnel or Basic/management mode later without re-addressing, AzureBastionSubnet 10.16.2.0/26 (/26 or larger is required for the Standard SKU), snet-dns-inbound 10.16.3.0/28 and snet-dns-outbound 10.16.3.16/28 (each a dedicated subnet delegated to Microsoft.Network/dnsResolvers, /28 minimum, /24 maximum), snet-pe-shared 10.16.4.0/24 for shared private endpoints, snet-mgmt 10.16.5.0/24 for jump and tooling VMs. The remaining space in the /20 is spare for a future NVA or Route Server subnet (RouteServerSubnet also has its own minimum)."
            ),
            part(
              "Rules applied",
              "States the rules: no overlap with any connected network; dedicated subnets for platform services that require them (gateway, firewall, Bastion, resolver) with their exact names; subnet sizes allow for the five reserved addresses and growth; leave contiguous unallocated space per region so summarization to on-premises stays one prefix per region; keep spokes the same size for repeatability in the second region.",
              "No overlap with any network Azure will ever connect to. Platform services that require their own subnet get it, with the exact names Azure expects (GatewaySubnet, AzureFirewallSubnet, AzureFirewallManagementSubnet, AzureBastionSubnet) and at least the documented minimum size. Every subnet is sized after subtracting Azure's five reserved addresses. One contiguous /16 per region means on-premises learns a single summary route per region. The same template (hub /20, spokes /22) is stamped into the second region next year, which keeps firewall rules and route tables predictable."
            ),
          ],
        },
      ],
    },
    {
      slug: "hybrid-dns-with-private-resolver",
      objective: "Designing and implementing Azure DNS Private Resolver",
      kind: "build",
      title: "Design hybrid name resolution with Azure DNS Private Resolver",
      brief:
        "Thornfield Insurance's hub-and-spoke is connected to the datacenter over VPN. Three problems: on-premises servers cannot resolve the private endpoints in Azure (for example claims-sql.database.windows.net should resolve to its private IP 10.16.4.10, but on-premises gets the public address); Azure VMs cannot resolve on-premises names under corp.thornfield.internal, served by two domain controllers at 10.2.0.10 and 10.2.0.11; and the team currently runs two Windows DNS forwarder VMs in the hub for this, which they want to retire. Design the solution with Azure DNS Private Resolver: what is deployed where, how each direction of resolution flows, and what changes on the VNets and on the on-premises DNS servers.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the hybrid DNS design.",
          parts: [
            part(
              "Resolver deployment",
              "Deploys an Azure DNS Private Resolver in the hub VNet with an inbound endpoint in its own dedicated delegated subnet (gets a private IP, for example 10.16.3.4) and an outbound endpoint in another dedicated subnet, each subnet /28-/24, and notes the Windows forwarder VMs can be retired because the resolver is a managed, zone-resilient service.",
              "One Azure DNS Private Resolver in the hub: an inbound endpoint in snet-dns-inbound (10.16.3.0/28, delegated to Microsoft.Network/dnsResolvers) which receives a static-style private IP such as 10.16.3.4, and an outbound endpoint in snet-dns-outbound (10.16.3.16/28, also dedicated and delegated). Each subnet serves one endpoint and nothing else. Once the forwarding rules below are in place, the two Windows forwarder VMs are decommissioned -- the resolver is managed and needs no patching or HA engineering."
            ),
            part(
              "On-premises resolving Azure private endpoints",
              "Links the privatelink.database.windows.net (and other privatelink) private DNS zones to the hub VNet, and configures the on-premises DNS servers with conditional forwarders for those privatelink zone names (or the parent public zone names) pointing at the inbound endpoint IP, which reaches the VNet over the VPN; explains the inbound endpoint answers from the linked private zones.",
              "The private DNS zone privatelink.database.windows.net (with the A record claims-sql -> 10.16.4.10 created by the private endpoint's DNS zone group) is linked to the hub VNet. On the two domain controllers, add conditional forwarders for database.windows.net (and each other service's zone, such as blob.core.windows.net) to 10.16.3.4 -- the inbound endpoint -- reachable over the VPN. A query for claims-sql.database.windows.net is forwarded to the inbound endpoint, which resolves through Azure DNS against the linked private zone and returns 10.16.4.10 instead of the public address."
            ),
            part(
              "Azure resolving on-premises names",
              "Creates a DNS forwarding ruleset linked to the outbound endpoint with a rule for corp.thornfield.internal. targeting 10.2.0.10 and 10.2.0.11 on port 53, links the ruleset to the hub and spoke VNets (a VNet link per VNet), and leaves the VNets on Azure-provided DNS so everything else resolves normally; notes queries egress from the outbound endpoint's subnet over the VPN.",
              "A DNS forwarding ruleset attached to the outbound endpoint with one rule: domain corp.thornfield.internal., targets 10.2.0.10:53 and 10.2.0.11:53 (UDP). Link the ruleset to the hub VNet and to each spoke VNet. The VNets keep the default Azure-provided DNS setting, so a VM asking for fileserver.corp.thornfield.internal has the query matched by the ruleset and sent out through the outbound endpoint across the VPN to the domain controllers, while every other name still resolves through Azure DNS and the linked private zones. A ruleset can hold up to 1,000 rules if more on-premises domains appear."
            ),
            part(
              "Spoke behavior and gotchas",
              "Explains that spokes need either a ruleset VNet link (for outbound rules) and their own private zone links or must point DNS at the hub inbound endpoint; warns that a custom DNS server setting on a VNet overrides Azure-provided resolution of private zones unless that server forwards back to Azure; and that the inbound endpoint must be reachable from on-premises (routing/NSG/VPN).",
              "Spokes: link the privatelink zones to each spoke VNet (or to the hub only and set the spoke VNets' DNS servers to the inbound endpoint 10.16.3.4, which then resolves on their behalf), and link the forwarding ruleset to each spoke so the corp rule applies there too. Do not point a VNet at the old Windows forwarders or at the domain controllers directly: a custom DNS server setting means Azure private zones are no longer consulted unless that server forwards back to Azure. Finally, make sure the VPN advertises the hub range and no NSG blocks UDP/TCP 53 to snet-dns-inbound, or the on-premises conditional forwarders will time out."
            ),
          ],
        },
      ],
    },
    {
      slug: "routing-diagnosis-hub-spoke",
      objective: "Diagnosing and resolving routing issues",
      kind: "case",
      title: "Diagnose routing in a hub-and-spoke with a firewall",
      brief:
        "Thornfield Insurance's design says all traffic between spokes and all traffic to the internet must pass through Azure Firewall (private IP 10.16.1.4) in the hub. The web spoke (10.16.16.0/22) and the data spoke (10.16.20.0/22) are peered to the hub (10.16.0.0/20) but not to each other. The VPN gateway in the hub uses BGP and advertises on-premises prefixes. A route table on each spoke's subnets contains a single route: 0.0.0.0/0 -> Virtual appliance 10.16.1.4. Users report that the web tier cannot reach the data tier at all, and that on-premises can reach the spokes but the spokes' replies to on-premises seem to bypass the firewall.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "First, the web-to-data failure. A web VM at 10.16.16.10 cannot connect to a database at 10.16.20.10. Network Watcher's effective routes for the web VM show: 10.16.16.0/22 VirtualNetwork; 10.16.0.0/20 VNetPeering; 0.0.0.0/0 VirtualAppliance 10.16.1.4; and BGP routes for the on-premises prefixes via the hub's gateway (because the spoke uses the hub's gateway).",
          ask: "Why does the traffic fail, and what is the fix?",
          parts: [
            part(
              "Why it fails",
              "Explains that spokes are not peered to each other, so there is no route to 10.16.20.0/22 other than the 0.0.0.0/0 UDR; the packet does go to the firewall, so the likely cause is on the firewall or the return path: the firewall needs a network rule allowing 10.16.16.0/22 -> 10.16.20.0/22 on the port, and the data spoke's route table must also send 10.16.16.0/22 (or 0.0.0.0/0) to the firewall so the reply is symmetric; also notes peering to the hub alone does not make spokes transitively reachable.",
              "Longest prefix match finds no specific route to 10.16.20.0/22 on the web VM -- the spokes are not peered to each other and VNet peering is not transitive -- so the packet takes 0.0.0.0/0 to the firewall, which is the intended path. It fails for one of two reasons: the firewall has no network rule allowing 10.16.16.0/22 to 10.16.20.0/22 on 1433 (Azure Firewall denies by default and network rules are terminating), or the data spoke has no route back through the firewall so the database's reply follows its own 0.0.0.0/0... which also goes to the firewall, unless the data subnet's route table was never associated. Check both: a firewall rule and the data subnet's effective routes."
            ),
            part(
              "Fix",
              "Adds a network rule collection on the firewall allowing the spoke-to-spoke flow (source 10.16.16.0/22, destination 10.16.20.0/22, TCP 1433) and confirms both spoke route tables send the other spoke's prefix (or 0.0.0.0/0) to 10.16.1.4 so both directions traverse the firewall; verifies with Next hop and Connection troubleshoot.",
              "On the firewall policy, add a network rule: source 10.16.16.0/22, destination 10.16.20.0/22, protocol TCP, port 1433, Allow. Confirm the data subnets have the route table with 0.0.0.0/0 -> 10.16.1.4 associated (adding an explicit 10.16.16.0/22 -> 10.16.1.4 route on both sides makes the intent visible even if someone later adds a more specific route). Verify with Network Watcher Next hop (expect VirtualAppliance 10.16.1.4 from both VMs) and Connection troubleshoot on 1433."
            ),
          ],
        },
        {
          text: "Spoke-to-spoke works. Now the on-premises problem: a packet capture shows on-premises -> spoke traffic arriving via the VPN gateway and reaching the VM directly, while the VM's reply goes to the firewall, which drops it as a flow it never saw.",
          ask: "Explain the asymmetry and fix it so both directions pass the firewall.",
          parts: [
            part(
              "Asymmetry",
              "Explains that inbound traffic from the VPN gateway follows the GatewaySubnet's routing, which knows the spoke prefix via peering and delivers straight to the VM, while the VM's reply matches the 0.0.0.0/0 UDR to the firewall -- a stateful firewall drops the unseen flow; the fix is a route table on the GatewaySubnet sending the spoke prefixes (10.16.16.0/22, 10.16.20.0/22) to 10.16.1.4, never a 0.0.0.0/0 route there, and not disabling route propagation on the GatewaySubnet.",
              "The gateway delivers on-premises packets using the GatewaySubnet's own routes: the spoke prefixes are known through peering, so the packet goes directly to 10.16.16.10, bypassing the firewall. The reply hits the spoke's 0.0.0.0/0 UDR and goes to the firewall, which has no state for the flow and drops it. Fix the inbound side: associate a route table with the GatewaySubnet containing 10.16.16.0/22 -> VirtualAppliance 10.16.1.4 and 10.16.20.0/22 -> VirtualAppliance 10.16.1.4. Never put 0.0.0.0/0 on the GatewaySubnet (it breaks the gateway) and leave gateway route propagation enabled there. Now both directions traverse the firewall and the session is symmetric."
            ),
          ],
        },
        {
          text: "A week later a new requirement: all internet-bound traffic from the spokes must go to the on-premises proxy instead of out through Azure Firewall, while Azure-to-Azure traffic keeps using the firewall.",
          ask: "How do you implement that, and what two things does it break if done carelessly?",
          parts: [
            part(
              "Forced tunneling",
              "Implements forced tunneling either by advertising 0.0.0.0/0 from on-premises over BGP via the VPN gateway, or by changing the spoke UDR's 0.0.0.0/0 next hop to Virtual network gateway, while keeping more specific UDRs for Azure prefixes (spoke ranges, and the hub) pointing to the firewall so longest prefix match sends Azure traffic to the firewall; notes a UDR 0.0.0.0/0 beats a BGP default for the same prefix.",
              "Advertise 0.0.0.0/0 from the on-premises router over BGP through the VPN gateway, or set the spoke route tables' 0.0.0.0/0 next hop to Virtual network gateway. Keep the specific routes 10.16.0.0/12 (or each spoke and the hub prefix) -> VirtualAppliance 10.16.1.4 in the spoke tables: longest prefix match keeps Azure-to-Azure traffic at the firewall while the default route carries internet traffic down the tunnel. Remember a user-defined 0.0.0.0/0 wins over a BGP-learned default for the same prefix, so if BGP is the mechanism the spoke UDR default must be removed."
            ),
            part(
              "What it breaks",
              "Names at least two: Azure platform services reached by public IP (Windows Update, Key Vault, storage without private endpoints) now go through the on-premises proxy and may fail unless allowed or given service endpoints/private endpoints; inbound internet access to spoke public IPs becomes asymmetric and breaks; the firewall's own management traffic must not be forced down the tunnel (hence AzureFirewallManagementSubnet / forced-tunnel configuration); and applying the default route to the GatewaySubnet would stop the gateway working.",
              "Two things break if done carelessly. First, anything the spokes reach by public IP -- Azure Storage without a private endpoint, Key Vault, Windows Update, Microsoft Entra sign-in -- now rides the VPN to the on-premises proxy and fails unless the proxy allows it or those services get private or service endpoints (service-endpoint routes are more specific and keep winning). Second, any spoke resource with a public IP becomes unreachable from the internet because its replies go down the tunnel. Also: never apply the default route to the GatewaySubnet or AzureFirewallSubnet; a firewall that must forward its own internet traffic on-premises needs the forced-tunnel configuration with the AzureFirewallManagementSubnet reserved in the address plan."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Design, Implement, and Manage Connectivity Services (2)
    // ----------------------------------------------------------------------
    {
      slug: "highly-available-site-to-site-vpn",
      objective: "Designing a site-to-site VPN connection, including for high availability",
      kind: "build",
      title: "Design a highly available site-to-site VPN",
      brief:
        "Marlowe Freight, a fictional carrier, connects its two datacenters (each with its own internet link and VPN device supporting IKEv2 and BGP) to Azure. Today one VPN gateway with a single tunnel to one datacenter carries all traffic; when that datacenter's link flapped last month, Azure was unreachable for 40 minutes. Requirements: no single point of failure on the Azure side or on-premises; failover without anyone editing routes; about 800 Mbps aggregate throughput headroom; and the solution must survive a datacenter (availability zone) failure in Azure. The team asks whether the Basic gateway SKU they used for the pilot can stay. Design the gateway, the connections and the routing.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the site-to-site VPN HA design.",
          parts: [
            part(
              "Gateway SKU",
              "Chooses a zone-redundant AZ SKU (for example VpnGw2AZ Generation 2, 1.25 Gbps aggregate, up to 30 S2S tunnels, BGP) and explains the Basic SKU cannot stay: not for production, no BGP, no active-active, 100 Mbps, 10 tunnels, not zone-redundant; notes non-AZ VpnGw1-5 are slated for migration and should not be used for new gateways.",
              "VpnGw2AZ (Generation 2): zone-redundant across the region's availability zones, 1.25 Gbps aggregate benchmark (headroom over 800 Mbps), up to 30 site-to-site tunnels, BGP and active-active supported. The Basic SKU cannot stay: it is for dev-test only, supports no BGP and no active-active, is not zone-redundant, and tops out at 100 Mbps and 10 tunnels. The non-AZ VpnGw1-5 SKUs are being migrated and are not recommended for new deployments, so an AZ SKU is the only forward-looking choice."
            ),
            part(
              "Azure-side redundancy",
              "Configures the gateway active-active with two gateway instances and two public IPs, so both instances carry tunnels and the loss of one instance does not drop connectivity; combined with the AZ SKU this also survives a zone failure.",
              "Enable active-active mode: the gateway runs two instances, each with its own Standard public IP, and each builds tunnels to the on-premises devices. If one instance is lost -- or the zone it was in -- the other keeps the tunnels up. Zone redundancy comes from the AZ SKU, active-active from the gateway configuration; the requirement needs both."
            ),
            part(
              "On-premises redundancy and tunnels",
              "Builds dual redundancy: each of the two datacenter VPN devices (two local network gateways) connects to both Azure gateway instances, giving four IPsec/IKEv2 tunnels, so the loss of a datacenter, a device, a link or an Azure instance leaves at least one path.",
              "Two local network gateways, one per datacenter device, each holding that device's public IP and BGP peer address. Each device establishes tunnels to both active-active public IPs: four route-based IKEv2 tunnels in total. Any one datacenter, device, internet link or Azure gateway instance can fail and traffic continues on the remaining tunnels."
            ),
            part(
              "Routing and failover",
              "Uses BGP on every tunnel (gateway ASN and BGP peer IPs, APIPA or the device's BGP address) so prefixes are exchanged dynamically and a failed tunnel's routes are withdrawn automatically, with ECMP across live tunnels; explains that static routes in local network gateways would require manual change on failure, which the requirement forbids.",
              "BGP on all four tunnels: the Azure gateway advertises the VNet prefixes with its ASN, each datacenter device advertises its prefixes, and the local network gateways carry only the BGP peer addresses, not static address prefixes. When a tunnel drops, its routes are withdrawn in seconds and traffic shifts to the surviving tunnels with equal-cost multipath across the live ones; nobody edits anything. Static prefixes in the local network gateways would have meant hand-editing routes during last month's outage. Route-based gateway, IKEv2, and a custom IPsec/IKE policy only if the devices need specific algorithms."
            ),
          ],
        },
      ],
    },
    {
      slug: "expressroute-design-case",
      objective: "Selecting an ExpressRoute SKU and tier",
      kind: "case",
      title: "Design ExpressRoute for a growing enterprise",
      brief:
        "Marlowe Freight's VPN is saturating. The company's main datacenter is in Amsterdam; its Azure estate is in West Europe (12 VNets today, growing), with a disaster-recovery footprint planned in North Europe. It wants private, predictable connectivity of at least 2 Gbps, a path to Microsoft 365 that avoids the public internet for compliance reasons, and later a link from Amsterdam to a sister datacenter in Dublin without buying another WAN circuit. Finance wants to know what each decision costs and where the money goes.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The first order is the circuit itself for West Europe.",
          ask: "Recommend the connectivity model, SKU and billing tier, and say what would be wrong with the alternatives.",
          parts: [
            part(
              "Connectivity model and bandwidth",
              "Recommends a provider-based circuit (cloud exchange co-location or point-to-point Ethernet through an ExpressRoute partner at the Amsterdam peering location) at 2 Gbps or more, explaining ExpressRoute Direct (dual 10 or 100 Gbps ports) is for much larger or many-circuit needs, and that every circuit comes with two redundant links (primary and secondary) to the Microsoft edge.",
              "A provider circuit through an ExpressRoute partner at the Amsterdam peering location -- point-to-point Ethernet or cloud exchange co-location, whichever the partner offers -- at 2 Gbps (or 5 Gbps for headroom). Every circuit includes two physical links, primary and secondary, into the Microsoft edge, so a single link failure does not drop it. ExpressRoute Direct is dual 10 Gbps or dual 100 Gbps ports straight into Microsoft routers: right for massive or many-circuit estates, oversized and overpriced for 2 Gbps."
            ),
            part(
              "SKU and billing tier",
              "Recommends Standard SKU (reach to all regions in the geopolitical area -- Europe -- which covers West Europe and the North Europe DR site; 10 VNet links per circuit) over Local (only the region(s) near the peering location, so it could not reach North Europe) and over Premium (not needed until cross-geopolitical reach, more than 10 VNet links, or Microsoft 365 is required); chooses Metered vs Unlimited based on egress volume, noting Local includes egress.",
              "Standard SKU: it reaches every Azure region in the same geopolitical area, so one Amsterdam circuit connects both West Europe and the North Europe DR site, and it allows up to 10 virtual network links per circuit -- which, with 12 VNets, already says the hub-and-spoke must connect the hub, not every spoke. Local would be cheaper (egress included) but reaches only the regions in the peering location's metro, so North Europe would be out of reach. Premium is not needed yet: its extra reach across geopolitical areas and higher VNet-link and route limits are not required for this step. Billing: Metered if egress is modest, Unlimited once outbound data makes the flat rate cheaper -- finance models both from the expected egress."
            ),
          ],
        },
        {
          text: "Twelve months on: the North Europe DR site is live and the business wants Microsoft 365 traffic off the internet.",
          ask: "What changes for resilience across the two regions, and how do you deliver Microsoft 365 over ExpressRoute?",
          parts: [
            part(
              "Cross-region resilience",
              "Recommends a second circuit at a different peering location (for example Dublin or London) connecting to the North Europe ExpressRoute gateway, so the loss of the Amsterdam peering location does not isolate Azure; connects each region's hub to both circuits where possible (a gateway can connect to multiple circuits) and uses BGP path preference / connection weight; zone-redundant ErGwAZ gateway SKUs in each hub.",
              "Add a second circuit at a different peering location -- Dublin suits the DR site -- and connect it to the North Europe hub's ExpressRoute gateway. A single circuit's two links protect against hardware faults, not against losing the whole peering location, so Microsoft's guidance for critical workloads is multi-site: two circuits in two locations. Connect each hub gateway to both circuits (cross-connect) so either region can reach on-premises through either circuit, prefer the local one with connection weight or AS-path prepending from on-premises, and use the zone-redundant ErGw AZ gateway SKUs in both hubs."
            ),
            part(
              "Microsoft 365",
              "Enables Microsoft peering on the circuit with a route filter selecting the Microsoft 365 service communities, explains Microsoft 365 over ExpressRoute requires the Premium add-on and authorization from Microsoft 365, and that Microsoft peering uses public (NAT) addresses from the customer side; keeps private peering for the VNets.",
              "Upgrade the circuit to Premium (required for Microsoft 365 over ExpressRoute), request authorization from Microsoft 365 -- without it the service routes are not advertised -- then configure Microsoft peering alongside the existing private peering and attach a route filter that selects the Microsoft 365 BGP communities you want (Exchange, SharePoint, Teams). Microsoft peering needs public IP addresses owned by Marlowe or its provider for NAT. Private peering keeps carrying the VNet traffic; the two peerings coexist on one circuit."
            ),
          ],
        },
        {
          text: "Finally the Amsterdam-to-Dublin datacenter link, and finance's question about where the money goes.",
          ask: "How do you connect the two datacenters using what you already have, and what are the main cost lines of the whole design?",
          parts: [
            part(
              "Datacentre-to-datacentre",
              "Recommends ExpressRoute Global Reach linking the Amsterdam and Dublin circuits so the two datacenters exchange traffic over the Microsoft backbone, noting both circuits are in the same geopolitical region so Premium is not required for that, it is not transitive, bandwidth is bounded by the smaller circuit and shared with premises-to-Azure traffic, and it is a separately billed add-on.",
              "ExpressRoute Global Reach between the Amsterdam and Dublin circuits: on-premises prefixes learned on one circuit are advertised to the other, so the two datacenters talk across the Microsoft backbone with no new WAN circuit. Both peering locations are in Europe, so Premium is not needed for Global Reach itself (it would be if they were in different geopolitical regions). It is not transitive, its throughput is capped by the smaller circuit and shares that bandwidth with Azure-bound traffic, and Local circuits cannot use it. Finance should know it is billed as a separate add-on per circuit plus egress."
            ),
            part(
              "Cost lines",
              "Lists the cost components: the two circuits (monthly port fee by bandwidth and SKU, Standard vs Premium), the billing tier (metered egress per GB versus unlimited flat fee), the provider's connectivity charge (paid to the partner, not Microsoft), ExpressRoute gateways per hub (hourly by SKU), Global Reach add-on plus its egress, and Microsoft peering egress treatment (included under unlimited, but compute/storage egress still billed); notes Local would have included egress.",
              "Where the money goes: (1) each circuit's monthly fee, set by bandwidth and SKU -- Premium costs more than Standard; (2) the billing tier -- Metered pays per GB of egress, Unlimited is a flat fee; (3) the ExpressRoute partner's own charge for the last-mile connectivity, paid to them not Microsoft; (4) an ExpressRoute gateway in each hub, billed hourly by SKU; (5) the Global Reach add-on per circuit plus the egress it carries; and (6) note that with Unlimited on Microsoft peering the ExpressRoute egress charge is waived, but services such as compute and storage still bill their own egress. Local would have bundled egress, but it could not reach North Europe."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Design and Implement Application Delivery Services (2)
    // ----------------------------------------------------------------------
    {
      slug: "front-door-for-a-global-site",
      objective: "Mapping requirements to Azure Front Door features and capabilities",
      kind: "build",
      title: "Map a global web platform's requirements to Azure Front Door",
      brief:
        "Verity Learning, a fictional e-learning company, serves learn.veritylearning.example from App Service in West Europe and East US 2, with course videos in a storage account. Requirements: users anywhere must reach the nearest healthy region with automatic failover; TLS must terminate at the edge with a managed certificate for the custom domain, and traffic to the origins must also be encrypted; static assets and videos should be cached at the edge; all HTTP requests must redirect to HTTPS and legacy /courses/old/* URLs must redirect to /catalog/*; the App Service origins must not accept traffic from the internet directly, only from Front Door; and the security team wants managed OWASP-style WAF rules plus bot protection. The team asks which tier to buy and notes their old Front Door (classic) profile. Map each requirement to the Front Door feature and configuration that meets it.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the Front Door design: tier, and the feature for each requirement.",
          parts: [
            part(
              "Tier and the classic profile",
              "Recommends Azure Front Door Premium because the requirements need Private Link to origins, Microsoft-managed WAF rule sets and bot protection, all of which are Premium-only (Standard offers custom WAF rules but not managed rules, bot protection or Private Link); notes Front Door (classic) retires on 31 March 2027 and the classic profile should be migrated to Standard/Premium.",
              "Premium. Standard covers routing, caching, TLS and custom WAF rules, but three requirements are Premium-only: Private Link to the origins, the Microsoft-managed WAF rule set, and bot protection. The old Front Door (classic) profile retires on 31 March 2027 (classic endpoints stop by 31 March 2028), so migrate it with the zero-downtime migration tool rather than build beside it; a classic policy with managed WAF rules lands on Premium anyway."
            ),
            part(
              "Routing, health and failover",
              "Configures an origin group with both App Service origins, health probes (path, protocol, interval) and latency-based routing with a sensitivity so users hit the nearest healthy origin and an unhealthy origin is removed automatically; a route maps the custom domain and patterns to the origin group.",
              "One endpoint with the custom domain learn.veritylearning.example; an origin group containing the two App Service origins with a health probe on /health over HTTPS and latency-based load balancing (lowest-latency origin within the sensitivity window wins). If a region's probe fails, Front Door stops sending traffic there within the probe interval -- no DNS changes, no client-side delay."
            ),
            part(
              "TLS at the edge and to the origin",
              "Uses a Front Door managed certificate on the custom domain for TLS termination at the edge, and configures the route's forwarding protocol as HTTPS only to the origins so the second hop is encrypted; mentions minimum TLS version.",
              "Add the custom domain with a Front Door managed certificate (Azure provisions and renews it) and set the minimum TLS version to 1.2. On the route, set the forwarding protocol to HTTPS only so Front Door re-encrypts to the App Service origins -- TLS terminates at the edge and the edge-to-origin leg is encrypted too, which is end-to-end TLS in Front Door's terms."
            ),
            part(
              "Caching, redirects and rewrites",
              "Enables caching on the routes for static assets and the video storage origin (query-string behavior, compression), configures HTTP-to-HTTPS redirect on the route, and uses the rules engine (rule set) with a URL redirect action for /courses/old/* to /catalog/*; may mention URL rewrite for origin paths.",
              "A separate route for /assets/* and the video storage origin with caching enabled (ignore or include query strings as the app needs, compression on) so repeat requests are served from the edge. On the main route tick redirect all traffic to use HTTPS. Add a rule set with a rule: if request path begins with /courses/old/, URL redirect (301) to /catalog/ preserving the remainder. A URL rewrite action would change the path sent to the origin instead, which is not what this requirement asks."
            ),
            part(
              "Locking origins to Front Door, WAF and bots",
              "Enables Private Link on the App Service origins (Premium) and approves the private endpoint connections, then disables public network access on the apps so only Front Door reaches them; attaches a WAF policy in Prevention mode with the Microsoft-managed default rule set and the bot manager rule set, after a Detection-mode tuning period.",
              "Origins: enable Private Link on each App Service origin in the origin group (Premium), approve the pending private endpoint connections on the apps, then set the apps' public network access off -- the only path left is Front Door's private link. Security: a Front Door WAF policy with the Microsoft-managed default rule set and the bot manager rule set, run in Detection mode for a couple of weeks to tune exclusions, then switched to Prevention, associated with the endpoint's domain."
            ),
          ],
        },
      ],
    },
    {
      slug: "application-gateway-routing-rules",
      objective: "Configuring routing rules",
      kind: "build",
      title: "Configure Application Gateway listeners and routing rules for two sites",
      brief:
        "Verity Learning also runs an internal portal in one region behind Azure Application Gateway. Two host names share one gateway and one public IP: portal.veritylearning.example and api.veritylearning.example. Rules: portal.* requests to /images/* go to a storage-backed image pool on port 80, /api/* under the portal host go to the API VM pool on 8443, and anything else under portal.* goes to the web VM pool on 8080; all api.* traffic goes to the API pool; HTTP on either host must redirect to HTTPS; and the API pool's health is checked on /healthz where a 200 is expected. The gateway the team found in their notes is a Standard (v1) SKU. Write the listener, backend settings, probe and routing-rule configuration.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the Application Gateway configuration.",
          parts: [
            part(
              "SKU and listeners",
              "Uses Standard_v2 or WAF_v2 (v1 retired on 28 April 2026 and is no longer supported), one public frontend IP, and multi-site listeners: HTTPS 443 listeners for portal.* and api.* (each with its certificate, or a wildcard), plus HTTP 80 multi-site listeners for each host used only for redirect.",
              "The gateway must be v2 (Standard_v2 or WAF_v2): v1 retired on 28 April 2026 and has no SLA or support. One public frontend IP. Four multi-site listeners: ls-portal-https (host portal.veritylearning.example, port 443, TLS certificate from Key Vault), ls-api-https (host api.veritylearning.example, 443), and ls-portal-http and ls-api-http on port 80 for the redirects. Multi-site listeners match on host name so the two sites share the IP."
            ),
            part(
              "Backend pools, settings and probe",
              "Defines pools bp-web (web VMs), bp-api (API VMs), bp-images (storage endpoint) and backend settings bs-web (HTTP 8080), bs-api (HTTPS 8443, with a custom probe), bs-images (HTTP 80, host name override to the storage account); defines a custom health probe for the API on HTTPS /healthz expecting 200 (match condition) and associates it with bs-api.",
              "Pools: bp-web (the web VM NICs or IPs), bp-api (API VMs), bp-images (the storage account's blob endpoint FQDN). Backend settings: bs-web HTTP 8080; bs-api HTTPS 8443 with 'pick host name from backend target' as needed; bs-images HTTP 80 with host-name override to the storage FQDN. Custom probe pr-api: protocol HTTPS, path /healthz, interval 30 s, timeout 30 s, unhealthy threshold 3, match status codes 200 -- attached to bs-api so only API instances returning 200 on /healthz receive traffic."
            ),
            part(
              "Routing rules",
              "Creates a path-based rule for ls-portal-https with a URL path map: /images/* -> bp-images with bs-images, /api/* -> bp-api with bs-api, default -> bp-web with bs-web; a basic rule for ls-api-https -> bp-api with bs-api; each rule has a unique priority (1-20000) with the more specific host rules not conflicting since listeners differ.",
              "rr-portal (priority 100): path-based, listener ls-portal-https; path rules /images/* -> bp-images + bs-images, /api/* -> bp-api + bs-api; default target bp-web + bs-web. rr-api (priority 110): basic, listener ls-api-https -> bp-api + bs-api. Priorities must be unique integers from 1 to 20000 (1 highest); because the listeners match different host names, the two rules never compete for the same request, but the numbers still have to differ."
            ),
            part(
              "HTTP to HTTPS redirect",
              "Creates basic rules on the HTTP listeners whose target is a redirect configuration (type Permanent 301) to the matching HTTPS listener, including path and query string.",
              "rr-portal-redirect (priority 200): basic, listener ls-portal-http, target type Redirection, redirect type Permanent (301), target listener ls-portal-https, include path and query string. rr-api-redirect (priority 210): the same for ls-api-http -> ls-api-https. Redirecting to a listener rather than an external URL keeps the path, which an external-site redirect cannot forward."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Design and Implement Private Access to Azure Services (2)
    // ----------------------------------------------------------------------
    {
      slug: "private-endpoint-dns-integration",
      objective: "Integrating Private Link and Private Endpoint with DNS",
      kind: "build",
      title: "Make private endpoints resolve correctly from Azure and on-premises",
      brief:
        "Ashgrove Pharma, a fictional company, has created private endpoints in its hub VNet for a storage account (ashgrovedata, blob), an Azure SQL logical server (ashgrove-sql) and a key vault (ashgrove-kv). Symptoms: VMs in the spokes still connect to the storage account's public IP; an on-premises batch server gets the public IP for ashgrove-sql.database.windows.net and is refused because public access is disabled; and a developer proposes creating a private DNS zone named database.windows.net to fix it. The hub already has an Azure DNS Private Resolver inbound endpoint at 10.40.3.4 reachable from on-premises. Produce the DNS integration design, including the zone names, records, links and the on-premises change, and explain why the developer's proposal is wrong.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the private endpoint DNS design.",
          parts: [
            part(
              "How resolution is meant to work",
              "Explains the CNAME chain: the public name (ashgrovedata.blob.core.windows.net) is a CNAME to ashgrovedata.privatelink.blob.core.windows.net, which public DNS resolves to the public IP, while inside a VNet linked to the private zone privatelink.blob.core.windows.net the A record returns the private endpoint IP; the same connection string works in both places.",
              "Azure publishes a CNAME in public DNS: ashgrovedata.blob.core.windows.net -> ashgrovedata.privatelink.blob.core.windows.net. From the internet that name resolves to the service's public IP. From a VNet linked to the private DNS zone privatelink.blob.core.windows.net, Azure DNS answers the privatelink name from the zone's A record with the private endpoint IP instead. Applications keep the normal FQDN and connection string; only the answer changes."
            ),
            part(
              "Zones, records and links",
              "Creates (or reuses) the recommended zones privatelink.blob.core.windows.net, privatelink.database.windows.net and privatelink.vaultcore.azure.net, with A records for each private endpoint (created automatically by a DNS zone group on the private endpoint), and links each zone to the hub and every spoke VNet (registration off); warns against sharing one zone across different services' endpoints incorrectly.",
              "Three private DNS zones with the exact recommended names: privatelink.blob.core.windows.net (A ashgrovedata -> the storage private endpoint IP), privatelink.database.windows.net (A ashgrove-sql -> the SQL private endpoint IP) and privatelink.vaultcore.azure.net (A ashgrove-kv -> the vault private endpoint IP). Create each record through the private endpoint's DNS zone group so it is maintained automatically. Link all three zones to the hub VNet and to every spoke VNet (auto-registration off). The spokes resolve the public IP today because the zones are linked only to the hub -- a zone link is per VNet, and peering does not carry it."
            ),
            part(
              "On-premises resolution",
              "Configures conditional forwarders on the on-premises DNS servers for database.windows.net, blob.core.windows.net and vaultcore.azure.net (the public parent zones, or the privatelink zones) pointing at the inbound endpoint 10.40.3.4, which resolves against the linked private zones.",
              "On the on-premises DNS servers add conditional forwarders for database.windows.net, blob.core.windows.net and vaultcore.azure.net to 10.40.3.4, the Private Resolver inbound endpoint in the hub. The batch server's query for ashgrove-sql.database.windows.net is forwarded there, follows the CNAME to ashgrove-sql.privatelink.database.windows.net, and is answered from the linked private zone with the private endpoint IP, which is reachable over the VPN/ExpressRoute. Forwarding the privatelink.* zones alone also works if the on-premises servers can resolve the public CNAME first."
            ),
            part(
              "Why the developer's proposal is wrong",
              "Explains that a private zone named database.windows.net would override a zone actively used for public resolution, breaking every other Azure SQL name the VNet needs (and anything without a record), so the documented privatelink.database.windows.net name must be used instead; may add that public DNS fallback is not automatic.",
              "A private DNS zone called database.windows.net would make Azure DNS treat every *.database.windows.net name as belonging to that zone: ashgrove-sql would resolve, but every other Azure SQL server the VNet talks to -- partners, other subscriptions, Microsoft's own endpoints -- would get NXDOMAIN because the zone has no record for them and there is no fallback to public DNS. Microsoft's guidance is explicit: never override a zone in active public use; create the privatelink.database.windows.net zone that the CNAME chain is designed for."
            ),
          ],
        },
      ],
    },
    {
      slug: "service-endpoint-or-private-endpoint",
      objective: "Choosing when to use a service endpoint",
      kind: "build",
      title: "Choose between service endpoints and private endpoints for three cases",
      brief:
        "Ashgrove Pharma has three requests. (1) A data-ingest subnet of VMs must write to the company's 30 storage accounts over the Azure backbone rather than the internet, and the accounts must refuse traffic from anywhere else; nothing on-premises needs them; the team wants no DNS changes and no per-endpoint cost. (2) The same subnet must be prevented from sending data to any storage account outside the company's subscription (exfiltration control). (3) A research partner's lab, connected over site-to-site VPN, must reach one specific storage account privately and must never be able to reach the other 29. For each, choose a service endpoint or a private endpoint, configure it, and explain what the other option would get wrong.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Make and justify the choice for each case.",
          parts: [
            part(
              "Case 1: ingest subnet to 30 accounts",
              "Chooses a service endpoint for Microsoft.Storage on the ingest subnet plus each storage account's firewall set to allow that VNet/subnet (and deny public access by default), explaining traffic stays on the Azure backbone with the subnet's private address as source, no DNS change, no hourly cost; notes 30 private endpoints would add cost and DNS work for no gain here.",
              "Service endpoint: enable Microsoft.Storage on the ingest subnet, then on each of the 30 storage accounts set Networking to 'Enabled from selected virtual networks and IP addresses' and add that subnet. Traffic to the accounts leaves over the Azure backbone with the VNet subnet as the source the service sees, the accounts refuse everything else, DNS is untouched and service endpoints cost nothing. Thirty private endpoints would mean thirty NICs, thirty A records, hourly charges and data-processing fees to achieve the same thing for a subnet that has no on-premises callers."
            ),
            part(
              "Case 2: stop exfiltration to foreign accounts",
              "Adds a service endpoint policy on the ingest subnet that allows only the storage account resources (or the subscription's / resource group's accounts) listed, so the service endpoint carries traffic only to approved accounts and blocks other storage accounts; notes service endpoints alone apply to the whole service type (all Azure Storage), which is the gap.",
              "A service endpoint alone opens the backbone path to every Azure Storage account in the world -- it is a route, not a filter -- so add a service endpoint policy on the ingest subnet that lists the company's storage accounts (by resource, resource group or subscription). Traffic from that subnet over the endpoint is then allowed only to those accounts and dropped for any other storage account, closing the exfiltration path without private endpoints. Service endpoint policies exist for Azure Storage, which is exactly the service in question."
            ),
            part(
              "Case 3: partner over VPN to one account",
              "Chooses a private endpoint for that one storage account in a VNet the partner can reach, with DNS (privatelink zone or forwarders) so the account name resolves to the private IP from the partner lab, the account's public access disabled; explains service endpoints are not reachable from on-premises/VPN and would apply to all accounts of the type, whereas a private endpoint is scoped to a single resource instance.",
              "Private endpoint: create one for the research storage account (blob sub-resource) in a subnet the partner's VPN routes to, publish its A record in privatelink.blob.core.windows.net and give the partner DNS a conditional forwarder to the hub's inbound resolver, then disable public network access on that account. A private endpoint has a routable private IP, so it works over site-to-site VPN, and it maps to exactly one resource -- the other 29 accounts have no endpoint in that network and remain unreachable. A service endpoint could not do this: it is not usable from on-premises networks, and it would apply to every storage account, not one."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Design and Implement Azure Network Security Services (2)
    // ----------------------------------------------------------------------
    {
      slug: "azure-firewall-sku-and-rules",
      objective: "Configuring Azure Firewall rules",
      kind: "build",
      title: "Choose a firewall SKU and write its rules for a hub",
      brief:
        "Ashgrove Pharma's hub firewall must enforce: Windows VMs in the spokes may reach Windows Update and the company's package mirror pkg.ashgrove.example over HTTPS, and nothing else on the internet; the analytics spoke (10.40.24.0/22) may reach the data spoke's SQL VMs (10.40.20.0/24) on TCP 1433; the internet may reach a single admin web console on a VM at 10.40.16.20 port 8443 through the firewall's public IP on port 443; everything else is denied and logged. The security team also wants outbound traffic to known malicious IPs and domains blocked automatically, wants to inspect TLS and detect intrusion signatures for the research spoke, and expects peaks of about 6 Gbps. Choose the SKU, then write the policy's rule collection groups and rules with priorities, and explain the processing order the firewall applies to them.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the SKU choice and the firewall policy rules.",
          parts: [
            part(
              "SKU",
              "Chooses Azure Firewall Premium because TLS inspection and IDPS are Premium-only; explains Basic (up to 250 Mbps, for small environments) cannot carry 6 Gbps and Standard (up to 30 Gbps, threat intelligence, web categories) lacks TLS inspection and IDPS; notes threat intelligence filtering is set to Alert and deny.",
              "Premium. Throughput alone would allow Standard (up to 30 Gbps), and Basic is out at 250 Mbps, but TLS inspection (outbound TLS termination and re-encryption) and the managed IDPS signatures the security team asked for exist only in Premium, which scales to 100 Gbps. Set threat intelligence-based filtering to Alert and deny so traffic to Microsoft's known-malicious IPs and domains is blocked before any rule is evaluated."
            ),
            part(
              "DNAT rule",
              "Writes a DNAT rule collection (for example rcg-inbound, priority 100; collection dnat-admin, priority 100) translating the firewall public IP TCP 443 to 10.40.16.20:8443, source restricted (Any or the admin IP range), and notes DNAT also implicitly allows the translated flow.",
              "Rule collection group rcg-inbound (priority 100) > DNAT rule collection dnat-admin (priority 100, action DNAT): rule admin-console, protocol TCP, source the admin office range (or * if it must be public), destination the firewall's public IP, destination port 443, translated address 10.40.16.20, translated port 8443. A DNAT rule both translates and allows the flow, so no separate network rule is needed for it."
            ),
            part(
              "Network rules",
              "Writes a network rule collection allowing TCP 1433 from 10.40.24.0/22 to 10.40.20.0/24, and, if needed, DNS from spokes to the firewall's DNS proxy; keeps web traffic out of network rules so application rules can evaluate FQDNs; explains network rules are terminating and would bypass application rules if they allowed 443 broadly.",
              "rcg-spokes (priority 200) > network rule collection net-allow (priority 100, Allow): rule analytics-to-sql, TCP, source 10.40.24.0/22, destination 10.40.20.0/24, port 1433. Deliberately no network rule allowing TCP 443 to the internet: network rules are terminating, so a broad 'allow 443 anywhere' would match first and the FQDN-based application rules below would never be evaluated, silently allowing all HTTPS."
            ),
            part(
              "Application rules",
              "Writes an application rule collection allowing Windows Update via the WindowsUpdate FQDN tag and HTTPS to pkg.ashgrove.example for the spoke ranges, with TLS inspection enabled for the research spoke's rules and IDPS in Alert and deny mode; relies on the implicit deny for everything else and sends logs to Log Analytics.",
              "rcg-spokes > application rule collection app-allow (priority 200, Allow): rule windows-update, source 10.40.16.0/20 (all spokes), FQDN tag WindowsUpdate; rule package-mirror, source the spoke ranges, protocol Https:443, target FQDN pkg.ashgrove.example, TLS inspection enabled for the research spoke's source range with the intermediate CA certificate from Key Vault. IDPS mode Alert and deny. Nothing matches the rest, and Azure Firewall denies by default; diagnostic settings send the AZFWApplicationRule, AZFWNetworkRule, AZFWNatRule, AZFWThreatIntel and AZFWIdpsSignature logs to the Log Analytics workspace so every deny is logged."
            ),
            part(
              "Processing order",
              "States the order: threat intelligence first (if enabled); then rule collection groups by priority (100-65000, lower first), within them rule collections by priority, and across all of that DNAT rules, then network rules, then application rules; a parent policy's rules precede the child's; application rules apply only to HTTP/HTTPS/MSSQL and never to inbound; the final implicit deny.",
              "Threat intelligence is evaluated first and can block before any rule. Then rule collection groups in priority order (100 highest to 65000), rule collections within each group in priority order, but always DNAT rules before network rules before application rules regardless of the numbers; a parent policy's collections run before this child policy's. Network rules are terminating. Application rules are considered only when no network rule matched and the protocol is HTTP, HTTPS or MSSQL, and never for inbound connections. Anything unmatched hits the implicit deny -- and lands in the logs."
            ),
          ],
        },
      ],
    },
    {
      slug: "waf-rollout-detection-to-prevention",
      objective: "Configuring detection or prevention mode",
      kind: "case",
      title: "Roll out a web application firewall without breaking the application",
      brief:
        "Verity Learning's internal portal sits behind an Application Gateway WAF_v2. The security team wants OWASP-style protection on the portal's two listeners, but the portal has a rich-text editor and a search box that send unusual payloads, and the last attempt at a WAF blocked legitimate users within an hour and was switched off.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "You are asked to try again, this time without an outage.",
          ask: "How do you deploy the WAF policy initially, which rule set do you choose, and what do you look at during the first two weeks?",
          parts: [
            part(
              "Initial deployment",
              "Creates a WAF policy in Detection mode with the current recommended managed rule set (DRS 2.2, or DRS 2.1; CRS 3.2 is legacy) plus the Bot Manager rule set, associates it with the gateway (or per listener), enables diagnostic logging of the ApplicationGatewayFirewallLog to Log Analytics, and explains Detection logs would-be blocks without blocking.",
              "A WAF policy in Detection mode using the recommended managed rule set DRS 2.2 (DRS 2.1 is acceptable; CRS 3.2 and earlier are legacy and should be upgraded), with Bot Manager 1.1 enabled. Associate it with the gateway and turn on diagnostic settings sending the firewall log to Log Analytics -- Detection mode is useless without logging, since it only records what it would have blocked and lets the request through."
            ),
            part(
              "What to watch",
              "Queries the WAF logs for rules triggered against legitimate traffic (by rule ID, URI and request parameter), focusing on the rich-text editor and search paths, and distinguishes true attacks from false positives; explains anomaly scoring (Critical 5, Error 4, Warning 3, Notice 2; a request is blocked at a score of 5 or more in Prevention) so it knows which detections would have blocked.",
              "Over two weeks, query the AzureDiagnostics (ApplicationGatewayFirewallLog) records: group by ruleId, requestUri and the matched parameter, and look hardest at /editor/save and /search. Each matched rule adds its severity to an anomaly score -- Critical 5, Error 4, Warning 3, Notice 2 -- and in Prevention mode a request totaling 5 or more is blocked, so a lone Warning on the search box would pass but a Critical SQL-injection match on the editor body would not. Separate real probes (random paths, known scanner signatures) from the editor's legitimate HTML that trips the XSS rules."
            ),
          ],
        },
        {
          text: "The logs show two recurring false positives: the editor's HTML body triggers several XSS rules on /editor/save, and a search parameter q with SQL-like keywords triggers an injection rule on /search. Everything else matched is genuine scanning noise.",
          ask: "How do you tune the policy, and what do you avoid doing?",
          parts: [
            part(
              "Tuning",
              "Adds exclusions scoped as narrowly as possible: exclude the specific request body field / argument name (the editor's body parameter on /editor/save, the q argument on /search) for the specific rules or rule groups that fire, rather than disabling the rules globally; may use per-URI policy association so the exclusions apply only to those paths; keeps the rest of the rule set active.",
              "Exclusions, as narrow as the logs allow: on /editor/save exclude the editor's body field (request body post argument name equals 'content') from the specific XSS rules that fired, and exclude the request argument 'q' from the injection rule on /search. Where the gateway's path-based rule for /editor/* exists, associate a separate per-URI WAF policy carrying those exclusions so they apply only there. Everything else in DRS 2.2 stays active."
            ),
            part(
              "What to avoid",
              "Avoids disabling whole rule groups, excluding all request bodies, lowering the policy globally to accommodate two paths, or staying in Detection mode indefinitely; notes custom rules run before managed rules and an ALLOW custom rule bypasses the managed set, so allow-listing should be a last resort.",
              "Do not disable entire rule groups or exclude the request body globally -- that reopens the whole application to the attack class for two fields' sake. Do not leave the policy in Detection mode as the permanent compromise. And be careful with custom rules: they run before the managed rules and a custom ALLOW rule skips managed evaluation for matching traffic, so an 'allow anything to /editor/*' rule would turn the WAF off for the most dangerous endpoint."
            ),
          ],
        },
        {
          text: "After a further week in Detection mode with the exclusions in place, the logs show no false positives on legitimate paths.",
          ask: "How do you switch on enforcement, and what else do you add for the search endpoint, which is being hammered by one IP range?",
          parts: [
            part(
              "Switching to Prevention",
              "Switches the policy to Prevention mode (blocked requests receive a 403 and are logged), ideally per listener in stages (portal first, then API) with a rollback plan of flipping back to Detection, and keeps monitoring the logs for the first days.",
              "Change the policy mode to Prevention: matching requests now get a 403 and the connection is closed, with the block recorded in the same log. Stage it -- enforce on the portal listener first for a few days, then the API listener -- and keep the rollback simple: flip the mode back to Detection if legitimate users are blocked. Watch the block log daily for the first week."
            ),
            part(
              "Rate limiting the search endpoint",
              "Adds a custom rule with a rate-limit action (or a Geomatch/IP-based BLOCK custom rule) matching the offending IP range and the /search URI, with a priority so it runs before the managed rules, choosing a threshold above legitimate usage.",
              "Add a custom rule on the WAF policy: match condition request URI contains /search and (for the known range) remote address in that CIDR, action Block -- or a rate-limit custom rule keyed on client address with a threshold above any real user's rate -- with a low priority number so it is evaluated before the managed rules. The rest of the portal keeps the managed protection; the attacker's range loses access to the one endpoint it is abusing."
            ),
          ],
        },
      ],
    },
  ],
};
