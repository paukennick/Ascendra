import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-156: Microsoft Certified: Azure for SAP Workloads Specialty (AZ-120).
//
// Aligned to the AZ-120 study guide (skills measured as of April 17, 2026;
// re-read 2026-11-07): Migrate SAP workloads to Azure 25-30% / Design and
// implement an infrastructure to support SAP workloads 25-30% / Design and
// implement HADR 20-25% / Maintain SAP workloads on Azure 20-25%.
//   https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-120
// Density (docs/labs.md, policy "hybrid"): one lab per domain plus six
// weighted extras -> 3 / 3 / 2 / 2 = 10 labs (8 build, 2 case).
//
// Every behaviour below was read on learn.microsoft.com on 2026-11-07
// (sources[] lists the pages). Where Microsoft's guidance has changed
// recently -- proximity placement groups are now a last resort rather than
// the default for zonal SAP deployments -- the labs follow the current page,
// not older exam-prep material. The SAP Notes named (1928533 and others) are
// cited by Microsoft's own pages; their contents were not read here. Every
// lab is needs_expert_review until a person who runs SAP on Azure checks it.

export const AZ120_LABS: SeedLabSet = {
  trackCode: "AZ120",
  sources: [
    // Exam outline (checked 2026-11-07)
    source("https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-120", "exam_outline", "2026-11-07"),
    // SAPS, SAP Note 1928533 and the HANA hardware directory
    source("https://learn.microsoft.com/en-gb/Azure/sap/workloads/supported-product-on-azure", "reference", "2026-11-07"),
    // Classical (two-step) vs DMO (one-step) migration
    source("https://learn.microsoft.com/en-ca/azure/cloud-adoption-framework/scenarios/sap/migrate", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-nz/training/modules/explore-migration-options/7-explore-two-step-migration-lift-shift-followed-database-move-only", "reference", "2026-11-07"),
    // RISE with SAP connectivity
    source("https://learn.microsoft.com/en-in/azure/sap/workloads/rise-integration-network", "reference", "2026-11-07"),
    // Proximity placement groups (current guidance)
    source("https://learn.microsoft.com/azure/sap/workloads/proximity-placement-scenarios", "reference", "2026-11-07"),
    // HANA storage KPIs, Premium SSD layouts, Write Accelerator, caching
    source("https://learn.microsoft.com/azure/sap/workloads/hana-vm-operations-storage", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/sap/workloads/hana-vm-premium-ssd-v1", "reference", "2026-11-07"),
    // Pacemaker fencing options on SLES
    source("https://learn.microsoft.com/en-us/azure/sap/workloads/high-availability-guide-suse-pacemaker", "reference", "2026-11-07"),
    // HANA system replication cluster and its load balancer
    source("https://learn.microsoft.com/azure/sap/workloads/sap-hana-high-availability", "reference", "2026-11-07"),
    // Savings plan vs reservation
    source("https://learn.microsoft.com/azure/cost-management-billing/savings-plan/decide-between-savings-plan-reservation", "reference", "2026-11-07"),
    // Azure Monitor for SAP solutions
    source("https://learn.microsoft.com/azure/sap/monitor/about-azure-monitor-sap-solutions", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/sap/monitor/providers", "reference", "2026-11-07"),
  ],
  labs: [
    // ----------------------------------------------------------------------
    // Unit 1: Migrate SAP Workloads to Azure (3)
    // ----------------------------------------------------------------------
    {
      slug: "sap-target-sizing-plan",
      objective: "Estimating target sizing for SAP workloads",
      kind: "build",
      title: "Size an SAP ERP system for Azure from its on-premises footprint",
      brief:
        "Halvard Foods runs SAP ECC 6.0 on-premises: two application servers and one Oracle database server on physical hardware bought eight years ago. The infrastructure team has the system's SAP EarlyWatch Alert reports for the last 12 months, the hardware vendor's published SAPS ratings for each server, and database size (3.2 TB, growing 15% a year). Peak CPU on the database server is 35%; the application servers peak at 55%. The business wants the system moved to Azure as it is (same database, same release) this year, with HANA considered later.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the sizing approach for the Azure target: what you measure, how you translate it to Azure VMs, and what you check before committing to a VM type.",
          parts: [
            part(
              "Sizing unit and inputs",
              "Uses SAPS (SAP Application Performance Standard) as the sizing unit, derived from the existing servers' SAPS ratings scaled by measured peak utilisation (and the EarlyWatch data), rather than mapping physical cores one to one.",
              "Size in SAPS, not cores. Take each server's rated SAPS and scale by its measured peak: the database server needs roughly 35% of its rated SAPS, the application servers about 55% each, plus headroom for growth and for the measurement period not capturing year-end peaks. The EarlyWatch reports give the sustained and peak load to confirm the figures."
            ),
            part(
              "Mapping SAPS to Azure VMs",
              "Looks up the SAPS Microsoft publishes per SAP-supported Azure VM type in SAP Note 1928533 (the SAP-on-Azure support note) and picks VM sizes whose SAPS meet the requirement, choosing only VM types listed as supported for the database tier.",
              "Match the required SAPS against the per-VM SAPS values in SAP Note 1928533, which lists the Azure VM types SAP supports and their SAPS. Choose application-server VMs from that list to cover the application SAPS, and a database VM from the types the note supports for DBMS (the note's second table lists VM types that are not supported for a database)."
            ),
            part(
              "Database tier",
              "Sizes the database VM on memory and storage throughput as well as SAPS (3.2 TB growing 15% a year means roughly 4.2 TB of data in two years), and notes that supported OS/DBMS combinations come from the SAP Product Availability Matrix and SAP Notes rather than assumption.",
              "The database VM is sized on memory for the Oracle buffer cache and on disk IOPS/throughput, not SAPS alone: plan storage for about 4.2 TB in two years (3.2 TB at 15% growth) plus logs and backups. Confirm the Oracle release and Linux/Windows version are supported on Azure for SAP in the SAP Product Availability Matrix and the SAP Notes Microsoft's support page points to."
            ),
            part(
              "Checks before committing",
              "Names at least two checks: regional availability and quota of the chosen VM family, and a sizing validation such as SAP Quick Sizer or a sizing report / proof-of-concept run; leaves room for the later HANA step (HANA-certified VMs come from the SAP HANA hardware directory).",
              "Confirm the chosen VM families exist in the target region with enough vCPU quota, validate the estimate with SAP Quick Sizer or the SAP sizing report from the current system, and plan a test migration to measure real response times. Keep the later HANA move in mind: HANA-certified Azure VMs come from the SAP HANA hardware directory, not from the NetWeaver list."
            ),
          ],
        },
      ],
    },
    {
      slug: "sap-migration-strategy-choice",
      objective: "Choosing between lift and shift, lift-shift-migrate, and lift-shift-migrate to HANA",
      kind: "build",
      title: "Pick a migration path for three SAP systems",
      brief:
        "Marrowbrook Pharma is moving three SAP systems to Azure. (1) An SAP ECC system on SQL Server 2019 and Windows Server, both supported on Azure, with a 12-hour maintenance window each quarter; the business wants no functional change. (2) An SAP BW system on a database and OS version that are not supported on Azure; the team is willing to change the database but not the SAP release right now. (3) An SAP ECC system the company wants to convert to S/4HANA on SAP HANA within the year, with the smallest number of downtimes and test cycles the business will accept. Each system has one weekend of downtime available per migration event.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Choose an approach for each system, name the SAP tool or mechanism, and say what it costs in downtimes and test cycles.",
          parts: [
            part(
              "System 1: supported OS and database, no change wanted",
              "Chooses a lift and shift (homogeneous system copy): same OS and database, moved with backup/restore or database replication (for example SQL Server Always On to the Azure VM), using the quarterly window for the cutover.",
              "Lift and shift with a homogeneous system copy. Because SQL Server 2019 and Windows Server are supported on Azure and nothing changes, move the database by backup/restore to Azure (or seed it with SQL Server Always On replication to the Azure VM and fail over), reinstall or copy the application servers, and cut over in one window. One downtime, one test cycle."
            ),
            part(
              "System 2: unsupported OS/database, release unchanged",
              "Chooses a classical heterogeneous migration (SAP Software Provisioning Manager export/import, a two-step lift-shift-migrate) to change the database (and OS) to one supported on Azure without upgrading the SAP release.",
              "Lift-shift-migrate with the classical heterogeneous system copy: SAP Software Provisioning Manager exports the source database and imports it into a supported database and OS on Azure. The SAP release stays as it is. Downtime is set by export/import throughput, so run a trial migration to time it against the weekend."
            ),
            part(
              "System 3: converting to S/4HANA",
              "Chooses the SAP Software Update Manager Database Migration Option (DMO) with System Move, the one-step path that migrates to SAP HANA and upgrades/converts in a single procedure, landing directly on Azure.",
              "Lift-shift-migrate to HANA in one step: SUM with DMO and the System Move option. DMO migrates the database to SAP HANA and performs the release upgrade in one procedure, and System Move puts the target on Azure directly, so there is one downtime and one test cycle rather than migrate-then-upgrade."
            ),
            part(
              "Trade-off: one step or two",
              "Explains that a two-step route (lift and shift first, DMO to HANA later) needs two downtimes and two test cycles, while one-step DMO is a single larger event, and that downtime is reduced with a trial run and DMO's downtime-optimised options.",
              "Two steps (move first, DMO later) means two downtimes and two full test cycles, which is why system 3 goes straight to DMO. The cost is one longer event, so the team sizes the target for the import, runs at least one trial DMO to measure downtime, and uses the downtime-optimised DMO options if the weekend is not enough."
            ),
          ],
        },
      ],
    },
    {
      slug: "rise-network-integration",
      objective: "Designing networking for SAP RISE",
      kind: "build",
      title: "Connect a RISE with SAP landscape to the company's Azure network",
      brief:
        "Tessaly Logistics has signed RISE with SAP. SAP will run S/4HANA in SAP's own Azure subscription and tenant in the West Europe region. Tessaly already has a hub-and-spoke network in West Europe with an ExpressRoute gateway in the hub connecting to its data centres, and it runs its own integration VMs and an Azure Firewall in the hub. Users and interfaces on-premises and in Tessaly's spokes must reach the SAP systems by private IP. Tessaly's DNS runs on Windows DNS servers in the hub, and the company does not want SAP traffic to transit the public internet.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the network design for the RISE connection.",
          parts: [
            part(
              "Connecting the two networks",
              "Uses virtual network peering between Tessaly's hub VNet and the SAP-managed RISE VNet (cross-tenant peering that SAP approves, requested through the SAP representative), in the same region as the workload, rather than a public endpoint.",
              "Peer Tessaly's West Europe hub VNet with SAP's RISE VNet. The peering is cross-tenant: Tessaly supplies its network's resource ID and SAP approves the peering on their side (the exact steps come from the SAP representative). Keep it in the same region to avoid global-peering cost and latency; peering is SAP's preferred connectivity method."
            ),
            part(
              "On-premises reach",
              "Routes on-premises traffic to the RISE VNet through Tessaly's existing ExpressRoute gateway using the peering's remote gateway transit, and notes the RISE VNet cannot add its own gateway while using Tessaly's.",
              "Enable 'use remote gateway' on the peering so the SAP VNet uses Tessaly's hub ExpressRoute gateway as a spoke would, and on-premises routes reach the SAP address space through the hub. A VNet can have only one gateway, local or remote, so SAP does not add a gateway of its own in that VNet."
            ),
            part(
              "Name resolution",
              "Delegates a subdomain (for example rise.tessaly.example) to SAP's DNS servers in the RISE VNet and replicates it to Tessaly's Windows DNS by zone transfer (or forwards queries for that zone), noting Azure-provided DNS and Azure private DNS zones cannot accept zone transfers.",
              "Give SAP a delegated zone such as rise.tessaly.example. SAP's two DNS VMs in the RISE VNet are primary for it; Tessaly's Windows DNS servers in the hub take a zone transfer (or a conditional forwarder for that zone). Azure-provided DNS and Azure private DNS zones cannot accept zone transfers, so the Windows DNS servers stay the integration point."
            ),
            part(
              "Internet and security boundaries",
              "States that internet ingress/egress for the SAP systems is SAP's responsibility inside the RISE VNet (disabled by default, exposed through an SAP-managed Application Gateway when needed) and does not transit Tessaly's firewall, while Tessaly's own integration VMs use Tessaly's firewall; both sides keep NSGs.",
              "Internet access for the SAP systems is not enabled by default and, when needed, is handled by SAP inside the RISE VNet (SAP-managed Application Gateway with WAF, proxies); it does not pass through Tessaly's hub firewall. Tessaly's integration VMs and SAP Cloud Connector run in Tessaly's own subscription behind Tessaly's Azure Firewall. Both VNets keep their own NSGs on the peering."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Unit 2: Design and Implement Infrastructure to Support SAP Workloads (3)
    // ----------------------------------------------------------------------
    {
      slug: "hana-storage-layout-premium",
      objective: "Choosing a storage type",
      kind: "build",
      title: "Lay out storage for an SAP HANA database VM",
      brief:
        "A customer is deploying SAP HANA scale-up on an M-series Azure VM with 1 TiB of RAM for a production S/4HANA system, using Azure Premium SSD (v1) managed disks because that is what their procurement already covers. The SAP basis team asks for a storage design for /hana/data, /hana/log, /hana/shared and the OS, and whether the design will pass SAP's HANA storage KPIs, which they know require sustained throughput on data and log and low write latency on the log.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the storage design and explain each choice.",
          parts: [
            part(
              "Volumes and striping",
              "Separates /hana/data and /hana/log onto different disk sets (not one combined volume), builds each from several Premium SSD disks striped with LVM or mdadm to reach the throughput KPI (stripe size 256 KB for data, 64 KB for log), and keeps HANA file systems out of the root volume group.",
              "Separate volumes: /hana/data as a stripe set of several Premium SSD disks (256 KB stripe), /hana/log as its own stripe set (64 KB stripe), /hana/shared on one disk, OS on its own disk. Striping is what gets the combined IOPS and throughput past the KPI (at least 400 MB/s read and 250 MB/s write on data, 250 MB/s on log); the HANA volumes must not sit in the default or root volume group."
            ),
            part(
              "Write Accelerator",
              "Enables Azure Write Accelerator on the /hana/log disks only (mandatory for HANA certification with Premium SSD on M-series), with caching set to None, and not on /hana/data.",
              "Turn on Write Accelerator for the /hana/log disks and nothing else. With Premium SSD on an M-series VM it is mandatory for the log volume (SAP's certification of M-series is with Write Accelerator on /hana/log) and it only exists for M-series families and Premium SSD. Caching on those disks is None ('None + Write Accelerator' in the portal)."
            ),
            part(
              "Caching",
              "Sets /hana/data to None or ReadOnly caching, /hana/log to None, /hana/shared to ReadOnly, and leaves the OS disk's default caching alone.",
              "/hana/data: None or read caching. /hana/log: None (plus Write Accelerator). /hana/shared: read caching. OS disk: keep the default Azure set at creation."
            ),
            part(
              "Sizing and alternatives",
              "Sizes /hana/shared to min(1 TiB, 1 x RAM) for scale-up, checks each volume's provisioned throughput against the HANA KPIs and the VM's own disk throughput cap, and names Premium SSD v2, Ultra Disk or Azure NetApp Files as supported alternatives that need no Write Accelerator.",
              "/hana/shared = min(1 TiB, 1 x RAM), so 1 TiB here. Add up each stripe set's provisioned throughput and check it against both the KPI and the VM's maximum disk throughput. If procurement allows later, Premium SSD v2 or Ultra Disk for data and log (or Azure NetApp Files NFS volumes) are also supported for HANA and let IOPS and throughput be provisioned per disk, so the stripe sets shrink or disappear; Write Accelerator exists only for Premium SSD v1 on M-series, so it does not apply to them. Storage for data must be the same type on every HANA replica, and likewise for log."
            ),
          ],
        },
      ],
    },
    {
      slug: "sap-latency-placement-zones",
      objective: "Designing and configuring proximity placement groups",
      kind: "build",
      title: "Decide where proximity placement groups belong in a zonal SAP deployment",
      brief:
        "Corvane Energy is deploying a production S/4HANA system in a region with three availability zones: a HANA database pair with system replication across zones 1 and 2, ASCS/ERS clustered across the same two zones, and six application servers split between them. An architect from a previous project proposes one proximity placement group (PPG) per SAP system containing every VM, 'as we always did'. A second system, a non-production BW on HANA, will follow in a single zone. Database-to-application latency must stay within SAP's recommendation.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the placement design for both systems and the rules the team should follow.",
          parts: [
            part(
              "Should PPGs be the default",
              "States that a zonal deployment alone usually meets the latency requirement today and PPGs are reserved for the cases where measured application-to-database latency is too high; a single PPG spanning two zones is not possible anyway, because each zone needs its own PPG.",
              "No. Current Microsoft guidance is that a zonal deployment on its own normally satisfies SAP's latency requirement, and PPGs are only for the rare case where measured latency between the application layer and the database is too high. One PPG for the whole system cannot span zones 1 and 2: each zone would need its own PPG."
            ),
            part(
              "Zonal production design",
              "Deploys the HANA, ASCS/ERS and application VMs zonally (zone 1 and zone 2) without PPGs, or with a Virtual Machine Scale Set in Flexible orchestration (FD=1) per zone to scope the system, and if a PPG is still needed per zone, anchors it with the ASCS/SCS VM and keeps the database VMs out of it.",
              "Place the two HANA VMs, the ASCS/ERS pair and three application servers in zone 1 and zone 2 respectively, scoped with a Flexible-orchestration scale set (fault domain count 1) per zone, which keeps resize flexibility across all tiers. Only if measurement shows a latency problem add one PPG per zone, anchored by the ASCS/SCS VM in that zone, with the application servers in it and the HANA VMs outside it."
            ),
            part(
              "Non-production single-zone system",
              "Puts all BW components in one zone (Flexible scale set, FD=1) and does not bundle it into the production system's PPG.",
              "Deploy the whole BW system in one zone, scoped by its own Flexible-orchestration scale set with FD=1. It gets no PPG, and it is never added to the production system's group: bundling several SAP systems in one PPG raises the chance that a VM type or capacity is unavailable under that network spine."
            ),
            part(
              "Operational risks of PPGs",
              "Names at least two: a VM type may not exist under the spine where the anchor landed (deployment or resize fails), the intent option does not check real capacity, and disks of non-anchor VMs may land in a different zone than the VMs.",
              "A PPG pins the system to one network spine, so a VM type you resize to may not exist there and the deployment fails; the PPG intent option reduces but does not remove that risk because it ignores live capacity; and only the anchor VM's disks are guaranteed to be in its zone. Keep PPGs to a single system and the minimum number of VM types."
            ),
          ],
        },
      ],
    },
    {
      slug: "hana-vm-selection",
      objective: "Choosing an SAP-certified Azure virtual machine for a given SAP workload",
      kind: "build",
      title: "Choose Azure VMs for a HANA database and its application servers",
      brief:
        "Brightwater Retail is sizing a new S/4HANA system on Azure. The SAP Quick Sizer result is: HANA database 1.4 TiB of memory, 22,000 SAPS for the database tier, and 45,000 SAPS for the application tier spread over at least three application servers for availability. The team's cloud architect suggests picking 'the biggest general-purpose VM in the region' for HANA and 'whatever has the right number of cores' for the application servers. The system will run on SUSE Linux Enterprise Server for SAP applications.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Explain how to select the VMs and what rules the choice must follow.",
          parts: [
            part(
              "HANA database VM",
              "Chooses a VM type listed in the SAP HANA hardware directory as certified for HANA on Azure, with at least 1.4 TiB of memory (in practice an M-series family size), and rejects 'the biggest general-purpose VM' because HANA support is by certified type, not by size.",
              "Only VM types certified for SAP HANA in the SAP HANA hardware directory may run production HANA, and far fewer Azure VMs qualify than for NetWeaver. Pick a certified M-series size whose memory is at least the 1.4 TiB Quick Sizer asks for and whose SAPS meets 22,000; a large general-purpose VM is not supported for HANA however many cores it has."
            ),
            part(
              "Application server VMs",
              "Chooses application-server VMs from the SAP-supported list in SAP Note 1928533 by their published SAPS, dividing roughly 45,000 SAPS over three or more VMs (about 15,000 SAPS each), not by raw core count.",
              "Application servers come from SAP Note 1928533, which lists the supported Azure VM types with their SAPS. Three VMs of around 15,000 SAPS each cover 45,000 SAPS with room to lose one; four smaller ones give the same with less impact per failure. Cores alone are not a sizing unit."
            ),
            part(
              "Operating system and release checks",
              "Checks that the OS release (SLES for SAP) is supported for the chosen VM types, noting M-series families have their own minimum OS releases, and that the HANA revision is supported for the VM type per the SAP Notes.",
              "Confirm SLES for SAP applications is supported for the exact VM types: M-series and Mv2/Mv3 have different minimum OS releases than other families, and HANA support for a VM type can depend on the HANA revision, so check the SAP Notes Microsoft's support page lists before ordering."
            ),
            part(
              "Headroom and growth",
              "Leaves headroom for growth and the sizing margin (for example a VM one size above the minimum memory, or a family that can be resized within the same certified series), and confirms regional availability and quota for the M-series family.",
              "Choose a certified size with headroom above 1.4 TiB rather than exactly at it, and prefer a family with a larger certified size to resize into. Check that the M-series family is offered in the target region and that the subscription's vCPU quota for that family is high enough before the project commits."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Unit 3: Design and Implement High Availability and Disaster Recovery (2)
    // ----------------------------------------------------------------------
    {
      slug: "pacemaker-fencing-choice",
      objective: "Configuring an Azure fence agent or STONITH Block Device (SBD)",
      kind: "case",
      title: "Choose and fix fencing for a HANA Pacemaker cluster",
      brief:
        "Osprey Manufacturing runs a two-node SAP HANA system replication cluster on SUSE Linux Enterprise Server for SAP applications, deployed across two availability zones behind an internal Standard Load Balancer. The cluster VMs have no public IP addresses and the subnet's route table sends all internet-bound traffic to an on-premises firewall. The team has not yet configured STONITH (fencing) and asks for a recommendation.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The team lists its constraints: they do not want to run extra VMs, and the security team will allow outbound access to Azure management endpoints only if it is justified.",
          ask: "Recommend a fencing mechanism and justify it against the constraints.",
          parts: [
            part(
              "Recommendation",
              "Recommends SBD with an Azure shared disk (Premium SSD, Premium_ZRS because the nodes are in different zones), since it needs no extra VMs and no outbound access to Azure APIs; or justifies the Azure fence agent with managed identity if outbound access is granted.",
              "SBD on an Azure shared disk: a small Premium SSD shared disk with maxShares covering both nodes, using Premium_ZRS because the nodes sit in two zones (Premium_LRS only supports availability-set deployments). It needs no iSCSI target VMs and no path to Azure's public endpoints, which fits both constraints."
            ),
            part(
              "Why not the other options",
              "Explains that SBD over iSCSI needs three iSCSI target VMs in the region for resilience (one is a single point of failure, two cannot fence if one is down), and that the Azure fence agent needs outbound connectivity to Azure's public endpoints plus an identity with power-off/start rights.",
              "iSCSI SBD would need three target servers in the same region (Pacemaker cannot fence with two targets if one is down, and one target is a single point of failure), which breaks the 'no extra VMs' rule. The Azure fence agent calls Azure's REST APIs to power VMs off, so it needs outbound reach to public Azure endpoints, which the security team has not yet allowed."
            ),
          ],
        },
        {
          text: "Six weeks later the security team approves outbound access to Azure management endpoints, and the SAP team wants the Azure fence agent as well because another cluster uses it. They ask what the fence agent needs to work.",
          ask: "List what must be configured for the Azure fence agent.",
          parts: [
            part(
              "Identity and permissions",
              "Uses a system-assigned managed identity on each cluster VM (user-assigned is not supported for the fence agent) with a custom role allowing Microsoft.Compute/*/read, virtualMachines/powerOff/action and virtualMachines/start/action, assigned on every cluster VM including itself.",
              "Enable a system-assigned managed identity on both VMs (user-assigned identities are not supported for the fence agent). Create a custom role, for example 'Linux Fence Agent', with Microsoft.Compute/*/read, Microsoft.Compute/virtualMachines/powerOff/action and Microsoft.Compute/virtualMachines/start/action, and assign it to each VM's identity for both VMs. Role assignments can take time to become effective."
            ),
            part(
              "Network and cluster resource",
              "Provides outbound connectivity to public Azure endpoints for VMs behind the internal Standard Load Balancer (for example via Azure Firewall, NAT gateway or a public Standard Load Balancer outbound rule), and configures the stonith:fence_azure_arm primitive with msi=true, subscription, resource group and a pcmk_host_map of cluster names to Azure VM names, raising stonith-timeout as the guide shows.",
              "VMs behind an internal Standard Load Balancer have no outbound internet by default, so route to Azure's public endpoints through the firewall or a NAT gateway. Then create the fencing primitive: stonith:fence_azure_arm with msi=true, the subscription ID, the resource group and pcmk_host_map='node1:<vm1>;node2:<vm2>', with the timeouts from Microsoft's SLES Pacemaker guide (stonith-timeout 900 for the fence agent)."
            ),
          ],
        },
        {
          text: "During the failover test, the team pulls the network from node 1. Node 2 fences node 1 and takes over, but the team notices the fenced node was powered off and did not come back by itself, and they ask whether SBD would have behaved differently and how to pick between the two long term.",
          ask: "Explain the difference and give the long-term recommendation.",
          parts: [
            part(
              "Behaviour difference",
              "Explains that the Azure fence agent uses the Azure API to power the VM off (and can start it, which is why the role includes start), while SBD writes a poison pill to the shared device and the node's watchdog reboots it, and that the fence agent's monitoring and fencing are deserialised so a long monitor does not delay failover.",
              "The fence agent fences by calling Azure to power the VM off, so the node stays off until started (the role includes the start action for that); SBD fences by writing to the shared disk and the watchdog reboots the node, so it typically comes back on its own. With the fence agent, monitoring and fencing are deserialised, so a slow monitor operation does not delay the failover itself."
            ),
            part(
              "Long-term choice",
              "Recommends one mechanism per cluster chosen on operational grounds (shared-disk SBD when no API access or extra VMs are wanted; fence agent when the team already operates it and outbound access exists), never attaching one shared-disk SBD device to two clusters, and re-testing fencing after any change.",
              "Pick one per cluster and document it: shared-disk SBD where the cluster should not depend on Azure API reachability or where outbound access is restricted; the fence agent where the team already runs it and the identity, role and outbound path are in place. Never share one SBD shared disk between clusters, and repeat the fence test after any change to identities, routes or disks."
            ),
          ],
        },
      ],
    },
    {
      slug: "hana-sr-load-balancer",
      objective: "Designing and implementing load balancing for high availability",
      kind: "build",
      title: "Configure the load balancer for a HANA system replication cluster",
      brief:
        "A two-node SAP HANA system replication cluster (SID HN1, instance number 03) on SUSE is being built in Azure. Clients must always connect to whichever node is the current primary through a single virtual IP, 10.20.1.13, in the database subnet. The VMs have no public IP addresses. The team has a draft that uses a Basic load balancer, a probe on port 30315 (the SQL port) and a rule for port 30315 only.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Correct the draft: write the load balancer configuration and the cluster side of the virtual IP.",
          parts: [
            part(
              "SKU and frontend",
              "Uses a Standard (internal) load balancer, not Basic, with a frontend IP in the database subnet (10.20.1.13) and both HANA VMs in the backend pool.",
              "Standard internal load balancer with a frontend IP of 10.20.1.13 in the database subnet and a backend pool holding both HANA VMs. Basic is not the supported choice for this design."
            ),
            part(
              "Health probe",
              "Uses a TCP probe on a dedicated port in the 625<instance number> convention (62503 here), answered by a cluster resource on the primary only, with probe threshold 2 (set via CLI/PowerShell, since the portal's unhealthy threshold is not honoured), rather than probing the SQL port.",
              "Probe TCP port 62503 (625 + instance number 03), interval 5 seconds, probeThreshold 2 (set with Azure CLI or PowerShell; the portal's 'unhealthy threshold' value is not respected). The port is answered by a cluster-managed probe responder that runs only with the primary, so the probe follows the HANA primary rather than a port that is open on both nodes."
            ),
            part(
              "Load-balancing rule",
              "Creates one rule with HA ports enabled (all ports) and Floating IP enabled, idle timeout 30 minutes, instead of a single-port rule.",
              "One rule for the frontend with 'HA Ports' selected so every HANA port is forwarded, 'Floating IP' enabled so the VM sees the virtual IP, and the idle timeout raised to 30 minutes. A rule for 30315 alone would miss the other instance ports."
            ),
            part(
              "Cluster side and outbound access",
              "Defines an IPaddr2 resource for 10.20.1.13 grouped with an azure-lb probe responder on port 62503, colocated with the promoted HANA resource; disables TCP timestamps on the VMs (net.ipv4.tcp_timestamps = 0); and provides outbound internet for the VMs (NAT gateway, firewall or public load balancer outbound rules) because an internal Standard load balancer gives none by default.",
              "In Pacemaker: rsc_ip (ocf:heartbeat:IPaddr2, 10.20.1.13) and rsc_nc (azure-lb, port 62503) in one group, colocated with the promoted SAPHanaController resource so the probe only answers on the primary. Set net.ipv4.tcp_timestamps = 0, since TCP timestamps make the probes fail. VMs behind an internal Standard load balancer with no public IP have no outbound internet, so add a NAT gateway or route through the firewall if they need updates or Azure endpoints."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Unit 4: Maintain SAP Workloads on Azure (2)
    // ----------------------------------------------------------------------
    {
      slug: "sap-commitment-discounts",
      objective: "Optimizing costs using Azure Savings Plans or Reserved Instances for SAP virtual machines",
      kind: "build",
      title: "Choose commitment discounts for an SAP estate",
      brief:
        "Fennimore Group's SAP landscape on Azure has three parts. (1) Production: an M-series HANA VM and four application-server VMs that run all day, every day, and whose sizes the team expects to keep for at least three years. (2) Quality and development systems on various D- and E-series VMs that the team resizes often and shuts down at nights and weekends with Azure Center for SAP solutions. (3) A project sandbox whose VM families change every few months as consultants test options. Finance asks for the cheapest commitment plan that will not leave money on the table.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Recommend a commitment approach for each part and say what each gives up.",
          parts: [
            part(
              "Production",
              "Recommends Azure reservations (reserved instances) for the stable production VMs (a 1- or 3-year commitment to the instance family in that region), because fully used reservations give the largest discount, and notes the trade-off that the discount applies only to that instance family and region.",
              "Reservations for the production HANA and application VMs, three years if the sizes really are fixed, otherwise one. Reservations give the deepest discount when fully used, and these VMs run continuously with no planned change of family or region. The cost of that: the benefit is tied to the committed instance family and region."
            ),
            part(
              "Quality and development",
              "Recommends an Azure savings plan for compute sized to the measured hourly baseline (an hourly spend commitment that applies across VM families and regions), because these VMs change size often, and keeps the night/weekend shutdowns rather than committing to 24x7 usage.",
              "A savings plan for compute: commit to an hourly spend equal to the steady part of what these systems cost while running. The benefit applies to any eligible compute across families and regions, so resizing does not strand it. Keep stopping them at nights and weekends with Azure Center for SAP solutions; size the commitment to the hours they actually run, not to 168 hours a week."
            ),
            part(
              "Sandbox",
              "Leaves the sandbox on pay-as-you-go or covers only its small steady floor with the savings plan, since changing VM families every few months suits neither a reservation nor a large commitment.",
              "Pay-as-you-go, or let the savings plan's commitment absorb whatever steady floor it has. A reservation would be wrong for VM families that change every few months, and committing to the sandbox's peak spend would waste money."
            ),
            part(
              "Order of work",
              "Right-sizes and removes idle resources before buying any commitment, then buys reservations for the stable workload and a savings plan sized to the optimised baseline, and reviews utilisation of both regularly.",
              "First right-size: discounts reduce rates, not waste. Then buy reservations for the stable production VMs, then a savings plan sized to the clean baseline of the variable systems. Review utilisation of both each month and adjust at renewal."
            ),
          ],
        },
      ],
    },
    {
      slug: "azure-monitor-sap-design",
      objective: "Configuring Azure Monitor for SAP solutions",
      kind: "build",
      title: "Set up Azure Monitor for SAP solutions for a production landscape",
      brief:
        "Lindqvist Dairy runs two SAP systems on Azure in one virtual network: an S/4HANA system on a HANA system replication Pacemaker cluster (SUSE), and an older ECC system on SQL Server on Azure VMs. Operations wants one place to see HANA replication status, cluster health, SQL Server blocking and waits, Linux disk latency, and NetWeaver instance availability, and to get alerts when HANA backups fail or the cluster loses a node. They would rather not build their own Log Analytics collection scripts.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the Azure Monitor for SAP solutions deployment.",
          parts: [
            part(
              "Resource and what gets deployed",
              "Deploys one Azure Monitor for SAP solutions resource for the virtual network and explains that it creates a managed resource group with Azure Functions (collection logic), a Key Vault (credentials and provider info), a storage account, and a Log Analytics workspace (new, or an existing one in the same subscription).",
              "One Azure Monitor for SAP solutions resource can monitor several SIDs in the same virtual network. It deploys a managed resource group holding Azure Functions that run the collectors, a Key Vault for the database credentials and provider details, a storage account for the function triggers, and a Log Analytics workspace -- or point it at an existing workspace in the same subscription."
            ),
            part(
              "Providers to configure",
              "Adds a provider per component: SAP HANA (both systems' HANA), High-availability cluster (Pacemaker), SAP NetWeaver (each SID), Microsoft SQL Server (the ECC database), and OS (Linux) for the Linux VMs; notes that nothing is collected until at least one provider exists.",
              "Providers: SAP HANA for the S/4 database (replication, backup, host status, growth); High-availability cluster for the Pacemaker nodes, resources and SBD status; SAP NetWeaver for each SID (instance availability, work processes, enqueue, ST22/SM21/SM37 data); Microsoft SQL Server for the ECC database (waits, blocking, expensive statements); OS (Linux) for CPU, memory, swap and block-device latency. Without a provider the resource deploys but collects nothing."
            ),
            part(
              "NetWeaver provider inputs",
              "Lists what the NetWeaver provider needs: the FQDN of the application server or Web Dispatcher, SID and instance number, hosts-file entries for every application server returned by SAPControl's GetSystemInstanceList, and for RFC-based collection a client, HTTP port and an SAP user.",
              "For each SID: the application server or Web Dispatcher FQDN, the SID and instance number, and host-file entries for every server SAPControl GetSystemInstanceList returns. To collect the RFC-based data (SM37, ST22, SM21, queues) also give the client, HTTP port and an SAP user with the needed authorisations."
            ),
            part(
              "Alerts, visualisation and cost",
              "Uses Azure Monitor alert rules on the Log Analytics data (log alerts) for HANA backup failures and cluster node loss, views data in the built-in workbooks or KQL, and explains the pricing model: no licence fee, pay for the managed components and the Log Analytics data ingested and retained.",
              "Create log alert rules on the workspace for a failed HANA backup and for a cluster node or resource going down; the workbooks show replication, cluster and SQL health, and KQL runs on the raw tables. There is no licence fee for Azure Monitor for SAP solutions; the bill is the managed resource group (Functions, Key Vault, storage) plus Log Analytics ingestion, retention and alerts."
            ),
          ],
        },
      ],
    },
  ],
};
