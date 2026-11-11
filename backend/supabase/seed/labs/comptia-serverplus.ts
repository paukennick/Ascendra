import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-160: CompTIA Server+ (SK0-005, V5).
//
// Aligned to the four domains on CompTIA's Server+ certification page, read
// 2026-11-07: Server Hardware Installation and Management 18%, Server
// Administration 30%, Security and Disaster Recovery 24%, Troubleshooting 28%
// (exam series code SK0-005, launched 2021-05-18; the page shows no
// retirement date and no successor version, and the exam is still offered).
//   https://www.comptia.org/en-us/certifications/server/
// Density (docs/labs.md, policy "hybrid"): 2 / 3 / 2 / 3. The labs are the
// arithmetic and decisions a server administrator is tested on by doing:
// RAID usable capacity and growth, rack power and heat, static addressing with
// forward and reverse DNS, failover-cluster quorum, vCPU and RAM
// over-commitment, hardening and media sanitisation, a degraded array and a
// patch that broke a dependency, and the restore chain and RTO/RPO of a
// backup schedule. Every figure is computed from the numbers in the brief
// (1 W = 3.412 BTU/h; capacities in decimal TB as drive vendors label them).
// These labs are additional to the course's self-reported labs.

export const SERVERPLUS_LABS: SeedLabSet = {
  trackCode: "SERVERPLUS",
  sources: [source("https://www.comptia.org/en-us/certifications/server/", "exam_outline", "2026-11-07")],
  labs: [
    // -----------------------------------------------------------------------
    // Server Hardware Installation and Management (18%) -- 2 labs
    // -----------------------------------------------------------------------
    {
      slug: "raid-choice-and-capacity-plan",
      objective: "Deploying and managing storage: RAID levels, shared storage, and capacity planning",
      kind: "build",
      title: "Choose a RAID level and plan capacity for a database server",
      brief:
        "Ironwood Veterinary Group is building a database server with eight 4 TB SAS drives in a hardware RAID controller. Requirements: at least 20 TB usable; the array must survive the loss of any two drives at once; the database is write-heavy. The current data set is 14 TB and has grown 25% a year for three years, a rate the practice expects to continue. The team also wants a ninth drive bay used sensibly, and later they plan to add a second server that shares storage for a virtualization cluster, and ask whether that should be a NAS or a SAN.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the storage design: the RAID level with its usable capacity and the levels you rejected, the three-year growth projection and what it means, the ninth bay, and the shared-storage recommendation.",
          parts: [
            part(
              "RAID level and usable capacity",
              "Chooses RAID 6 with usable capacity (8-2) x 4 TB = 24 TB and shows the alternatives fail a requirement: RAID 5 gives 28 TB but survives only one drive; RAID 10 survives two drives only if they are in different mirrors and gives 8 x 4 / 2 = 16 TB, under 20 TB; notes RAID 6's write penalty and that the controller's write-back cache (battery/flash backed) mitigates it.",
              "RAID 6: usable (8 - 2) x 4 TB = 24 TB, tolerates any two simultaneous drive failures. RAID 5 would give (8 - 1) x 4 = 28 TB but loses everything on a second failure during a rebuild. RAID 10 (four mirrored pairs) gives 16 TB -- below the 20 TB floor -- and only tolerates two failures if they are in different pairs. RAID 6 costs a write penalty (two parity writes), so enable the controller's battery- or flash-backed write-back cache and consider SSD caching for the write-heavy database."
            ),
            part(
              "Growth projection",
              "Computes 25% compound growth from 14 TB: 17.5 TB after year 1, 21.875 TB after year 2, about 27.3 TB after year 3; concludes the 24 TB array lasts roughly two years and expansion (or a larger array) must be planned before year 3, with an alert threshold around 80% used.",
              "Year 1: 14 x 1.25 = 17.5 TB. Year 2: 17.5 x 1.25 = 21.875 TB. Year 3: 21.875 x 1.25 = 27.34 TB. The 24 TB array fits the first two years (about 91% full at the end of year 2) and is too small in year 3, so budget an expansion shelf or larger drives for about 18-24 months out, and alert at 80% used (19.2 TB) so growth never catches the team by surprise."
            ),
            part(
              "The ninth bay",
              "Uses it as a global hot spare so a rebuild starts automatically on a failure (shortening the exposed window), or alternatively as a ninth data drive giving 28 TB in RAID 6; prefers the hot spare for an unattended practice, and notes rebuild time scales with drive size.",
              "Make the ninth drive a global hot spare: when a member fails the controller rebuilds onto it immediately instead of waiting for someone to notice and ship a drive, which matters because a 4 TB rebuild runs for many hours and the array runs degraded the whole time. (Adding it as a data drive would give 7 x 4 = 28 TB of RAID 6 instead, buying time on capacity at the cost of the automatic rebuild.)"
            ),
            part(
              "Shared storage for the cluster",
              "Recommends a SAN (block storage over iSCSI or Fiber Channel) for a virtualization cluster's VM datastores, since both hosts need block-level access to shared LUNs for live migration and failover, and explains a NAS (file-level SMB/NFS) suits shared file data; notes NFS datastores are a valid middle ground on some hypervisors.",
              "For two hosts sharing virtual-machine storage, use a SAN: block-level LUNs presented over iSCSI (on a dedicated storage network) or Fiber Channel, which the hypervisors' clustered file system shares so a VM can migrate or fail over between hosts. A NAS presents files over SMB/NFS and is the right answer for shared documents and backups, not for a block-level cluster datastore -- though NFS datastores are supported by some hypervisors if block storage is out of budget."
            ),
          ],
        },
      ],
    },
    {
      slug: "rack-power-and-cooling-plan",
      objective: "Installing physical hardware: racking, cabling, power, and cooling management",
      kind: "build",
      title: "Plan the rack, power and airflow for a small server install",
      brief:
        "Hollis Ridge Credit Union is installing in a new 42U rack: two 2U application servers rated at a maximum of 450 W each, one 1U top-of-rack switch at 150 W, and one 2U disk shelf at 600 W. The room has hot-aisle/cold-aisle containment and two independent 208 V, 20 A feeds (A and B). Each server and the shelf have dual power supplies; the switch has one. The electrician asks for the expected load per feed, the facilities team asks for the heat output in BTU/h, and your manager wants a rack layout and a cabling plan a new technician could follow.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the install plan: rack layout and units used, the power maths for normal and failover conditions, the cooling figure and airflow rules, and the cabling and labeling standard.",
          parts: [
            part(
              "Rack layout",
              "Totals 2 + 2 + 1 + 2 = 7U used of 42U, places the heaviest equipment (disk shelf) low, servers above it, the switch high (or mid-rack) near the patch panel, leaves a 1U gap or blanking panels where needed, and keeps rails/PDUs in the rear zero-U positions.",
              "Total 7U of 42U. Bottom up: disk shelf (heaviest) at U3-U4, server 1 at U6-U7, server 2 at U9-U10, switch at U40 near the top-of-rack patch panel, with blanking panels over every empty U face so cold air cannot bypass the equipment. Two vertical PDUs (A and B) mount in the rear zero-U rails. Load the rack from the bottom so it never becomes top-heavy during the install."
            ),
            part(
              "Power",
              "Computes total load 450 + 450 + 150 + 600 = 1,650 W; at 208 V that is about 7.9 A; with dual supplies split across A and B each feed normally carries about half (roughly 4 A, the switch's single supply on one feed) but must be able to carry the full 7.9 A if the other feed fails; checks that against a 20 A circuit (with the usual 80% continuous-load derating the circuit's planning capacity is 16 A) and confirms it fits with headroom.",
              "Maximum load 1,650 W. Current at 208 V: 1,650 / 208 = 7.93 A. Normally the dual-supply devices draw about half from each PDU, so feed A carries roughly 3.6 A plus the switch (150 W / 208 = 0.72 A) and feed B about 3.6 A. On a feed failure one PDU carries the whole 7.93 A. Each 20 A circuit, planned at the usual 80% continuous rating, offers 16 A, so a single feed at 7.93 A sits at about 50% -- comfortable. Tell the electrician: 1.65 kW total, design each feed for 8 A, and never let either feed be committed past what it can carry alone."
            ),
            part(
              "Cooling and airflow",
              "Converts 1,650 W to about 5,630 BTU/h (x 3.412), mounts every device so intakes face the cold aisle and exhausts the hot aisle, uses blanking panels and brush strips to stop recirculation, and notes the switch may need a reverse-airflow model if its ports face the hot aisle.",
              "Heat: 1,650 W x 3.412 = about 5,630 BTU/h for facilities to add to the room's cooling load. Install every chassis front-to-back with intakes in the cold aisle; fill gaps with blanking panels and seal cable cut-outs so hot exhaust cannot loop back to an intake. Check the switch's airflow direction: if its ports face the rear (hot aisle), order the port-side-intake/reverse-airflow version so it does not breathe hot air. Keep inlet temperature within the vendors' specified range and monitor it with the rack's sensors."
            ),
            part(
              "Cabling and labeling",
              "Routes power on one side and data on the other (or separated), uses correct-length patch cords with hook-and-loop ties (no zip ties on fiber), labels both ends of every cable and each power cord with its PDU/outlet, color-codes by function (for example management vs. production vs. storage), and records it all in the rack diagram/asset system.",
              "Power cords to PDU A on the left rear, PDU B on the right rear, each labeled with device and outlet (e.g. SRV01-PSU1 -> PDU-A-07). Data cabling on the opposite side from power, with horizontal cable managers, patch cords cut to length, hook-and-loop ties only (zip ties crush fiber and twisted pair). Color code: blue production, yellow management/iDRAC-iLO, green storage/iSCSI. Label both ends of every cable with source and destination port, and update the rack elevation diagram and asset records before leaving the room."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Server Administration (30%) -- 3 labs
    // -----------------------------------------------------------------------
    {
      slug: "static-ip-dns-vlan-file-server",
      objective: "Configuring network services: IP addressing, DNS, DHCP, and VLANs",
      kind: "build",
      title: "Address a new file server and register it in DNS",
      brief:
        "Pinebrook Schools is adding a Windows file server, FS01, to the server VLAN 20 (10.50.20.0/24, gateway 10.50.20.1). The DNS servers are 10.50.10.5 and 10.50.10.6, domain corp.pinebrook.example. The server has two 10 GbE ports connected to two switches whose ports are configured as 802.1Q trunks carrying VLAN 20 tagged. The storage administrator also wants a second interface on the storage VLAN 30 for backups. Users will reach the shares as \\\\files.corp.pinebrook.example. Reverse lookups must work for the security team's log correlation.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the network configuration: the IP settings and why static, the NIC teaming and VLAN setup, the DNS records, and the verification commands.",
          parts: [
            part(
              "IP settings",
              "Assigns a static address in 10.50.20.0/24 outside any DHCP pool (or a DHCP reservation, defending the choice), mask 255.255.255.0, gateway 10.50.20.1, DNS 10.50.10.5 and 10.50.10.6, DNS suffix corp.pinebrook.example, and explains servers get fixed addresses because clients and firewall rules depend on them.",
              "FS01: 10.50.20.25, mask 255.255.255.0 (/24), default gateway 10.50.20.1, preferred DNS 10.50.10.5, alternate 10.50.10.6, connection-specific suffix corp.pinebrook.example, and register this connection's address in DNS. Static (documented in IPAM) rather than a dynamic lease, because firewall rules, backup jobs and clients' DNS all depend on the address never changing; a reservation would also work if the team prefers central management."
            ),
            part(
              "NIC teaming and VLANs",
              "Creates a team/bond of the two 10 GbE ports (switch-independent or LACP if the switches support multi-chassis LAG), then creates tagged VLAN interfaces on the team: VLAN 20 for the production address and VLAN 30 for the storage address (no default gateway on the storage interface), noting both switch ports must carry VLANs 20 and 30 tagged.",
              "Team the two ports (Windows: NIC Teaming, switch-independent/dynamic, or LACP if the two switches form an MLAG pair). On the team create two tagged interfaces: Team-VLAN20 with 10.50.20.25/24 and the gateway, and Team-VLAN30 with an address in 10.50.30.0/24 and no gateway (only one default gateway per server; backup traffic stays on-VLAN). Confirm the switch trunks allow VLANs 20 and 30 tagged on both ports; a native/untagged VLAN mismatch would leave one interface silent."
            ),
            part(
              "DNS records",
              "Adds an A record fs01.corp.pinebrook.example -> 10.50.20.25, a CNAME files.corp.pinebrook.example -> fs01.corp.pinebrook.example (or a second A record if SMB/Kerberos aliasing is needed), and a PTR 25.20.50.10.in-addr.arpa -> fs01.corp.pinebrook.example in the reverse zone 20.50.10.in-addr.arpa.",
              "Forward zone corp.pinebrook.example: A fs01 -> 10.50.20.25; CNAME files -> fs01.corp.pinebrook.example (if Kerberos authentication to the alias misbehaves, register an additional SPN for 'files' or use an A record instead). Reverse zone 20.50.10.in-addr.arpa: PTR 25 -> fs01.corp.pinebrook.example. The storage address gets its own A/PTR (fs01-stor) so backup logs resolve too."
            ),
            part(
              "Verification",
              "ipconfig /all (or ip addr) to confirm addresses and VLAN interfaces; ping the gateway and a DNS server; nslookup files.corp.pinebrook.example and nslookup 10.50.20.25 to prove forward and reverse; from a client open \\\\files\\share; checks the team status shows both members active.",
              "On FS01: ipconfig /all shows both VLAN interfaces with the right addresses and only one gateway; ping 10.50.20.1 and ping 10.50.10.5 succeed; Get-NetLbfoTeam (or the teaming UI) shows both adapters Active. nslookup files.corp.pinebrook.example returns the CNAME to fs01 and 10.50.20.25; nslookup 10.50.20.25 returns fs01.corp.pinebrook.example. From a client PC: \\\\files.corp.pinebrook.example\\share opens. Pull one network cable and confirm the share stays up over the remaining team member."
            ),
          ],
        },
      ],
    },
    {
      slug: "two-node-failover-cluster-design",
      objective: "High availability: clustering, load balancing, and failover processes",
      kind: "build",
      title: "Design the failover cluster and load balancing for a clinic's systems",
      brief:
        "Marigold Family Clinic runs its scheduling database on one server and its patient-portal web application on another. Both must keep working if a server dies. Budget allows two database nodes with shared storage and two web servers. The database must only ever run on one node at a time; the web application is stateless except for login sessions. Management asks for a design, a plan for how failover will actually be tested, and the one failure mode they keep hearing about: 'split brain'.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the design: the database cluster with quorum, the networks, the web tier's load balancing, and the failover test plan.",
          parts: [
            part(
              "Database cluster and quorum",
              "Designs an active/passive two-node failover cluster with shared storage and a virtual IP/name that moves with the service; adds a third vote (file-share or cloud witness, or a quorum disk) so the cluster has an odd number of votes and a surviving node can prove majority; explains split brain as both nodes believing they own the service and writing to the storage, and that quorum plus fencing/STONITH prevents it.",
              "Two database nodes in an active/passive failover cluster sharing the storage LUN; clients connect to a cluster virtual IP and name that fail over with the database role, so only one node ever mounts the data. Quorum: two nodes plus a witness (file-share witness on a third server, or a cloud witness) gives three votes; after a failure the side that can still see a majority (2 of 3) keeps running and the other stops. That is what prevents split brain -- two nodes each thinking they are primary and corrupting the shared storage -- and fencing (power or storage) of the losing node makes it certain."
            ),
            part(
              "Networks",
              "Separates a dedicated heartbeat/cluster network from the client network (and a storage network for iSCSI if used), with redundant paths, so a client-network outage is not mistaken for a node failure.",
              "Three networks: client/production (where the virtual IP lives), a dedicated heartbeat network between the nodes (direct cable or an isolated VLAN) so congestion on the client side never looks like a dead partner, and a storage network for iSCSI with multipath I/O to the array. Each with redundant links where possible; the cluster also uses the client network as a secondary heartbeat path."
            ),
            part(
              "Web tier",
              "Puts both web servers behind a load balancer (hardware/virtual appliance or a redundant pair) with health checks that pull a failed node out, chooses session persistence (sticky sessions) or, better, externalizes sessions to a shared store so any node can serve any user; terminates TLS at the balancer.",
              "A load balancer pair (active/standby with its own floating IP) in front of the two web servers, distributing requests round-robin or least-connections. Health checks hit a /health page every few seconds and remove a server that fails, so users never see it. For logins, either enable cookie-based session persistence so a user stays on one node, or -- better -- move the session state to a shared cache/database so a node failure does not log anyone out. TLS terminates on the balancer with the certificate installed there."
            ),
            part(
              "Failover test plan",
              "Tests under controlled conditions and measures: move the database role between nodes gracefully, then hard-fail the active node (power off) and time the recovery (RTO) and check for data loss; pull the heartbeat cable to prove quorum behavior; stop a web server and confirm the balancer removes it; schedules the test regularly and documents results.",
              "In a maintenance window, with a monitoring client running continuous queries: 1) planned move of the database role to node 2 -- note the client reconnect time; 2) power off the active node -- time until the virtual IP answers on the survivor (the measured RTO) and confirm the last committed transactions are present; 3) disconnect the heartbeat network only -- the cluster must keep running on the side with the witness vote, not start the service twice; 4) stop the web service on one node -- the balancer's health check should drop it within seconds and users continue. Record times and surprises; repeat after every patch cycle and at least quarterly."
            ),
          ],
        },
      ],
    },
    {
      slug: "virtualization-host-sizing",
      objective: "Virtualization: host vs. guest, resource allocation, and cloud models",
      kind: "build",
      title: "Size virtualization hosts and set resource controls for twenty VMs",
      brief:
        "Thornbury Logistics is consolidating twenty physical servers onto virtualization hosts. Each host has two 16-core processors (32 physical cores, 64 threads) and 512 GB of RAM. The twenty VMs each need 4 vCPUs and 16 GB of RAM; one of them is a latency-sensitive database that must never wait for CPU and must always have its full memory. The company wants the environment to survive the loss of one host without any VM going down for long. They also ask whether the two public-facing web VMs would be better as a cloud deployment and what that would be called.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the sizing: CPU and memory arithmetic for one host, the host count for N+1, the resource controls for the database VM and the others, and the cloud-model answer.",
          parts: [
            part(
              "CPU and memory on one host",
              "Computes 20 x 4 = 80 vCPUs against 32 physical cores for a 2.5:1 vCPU-to-core ratio (1.25:1 against 64 threads), acceptable for general workloads; 20 x 16 GB = 320 GB of guest RAM plus hypervisor overhead fits in 512 GB (about 63% used) with no memory over-commitment.",
              "CPU: 20 VMs x 4 vCPU = 80 vCPUs on 32 physical cores = 2.5 vCPUs per core (1.25 per hardware thread) -- a normal consolidation ratio for mixed server workloads, since VMs rarely need all their vCPUs at once. Memory: 20 x 16 GB = 320 GB, plus a hypervisor reservation of a few GB per host and per-VM overhead, is about 63% of 512 GB, so no memory over-commitment is needed."
            ),
            part(
              "Hosts for N+1",
              "Concludes one host could run everything, so two hosts give N+1: in normal operation each runs about ten VMs (160 GB, 40 vCPUs) and either can absorb all twenty on failure; recommends a third host or a witness only if the cluster software needs an odd vote count, and shared storage so VMs restart on the survivor.",
              "A single host fits the load, so N+1 means two identical hosts with shared storage, each normally running ten VMs (40 vCPUs, 160 GB -- about 31% of RAM) so that when one fails the other takes all twenty at 80 vCPUs and 320 GB, still within its limits. High-availability restart brings the failed host's VMs back on the survivor within minutes; live migration lets you empty a host for maintenance with no downtime. Keep per-host usage under about 50% so the failover case always fits."
            ),
            part(
              "Resource controls",
              "Gives the database VM a full memory reservation (16 GB guaranteed, no ballooning/swap) and a CPU reservation or high share/priority, and avoids over-allocating its vCPUs; leaves the other VMs on shares with no reservations; installs guest tools/agents; explains host vs. guest responsibilities (hypervisor schedules physical resources; the guest OS sees only its virtual hardware).",
              "Database VM: reserve all 16 GB so the hypervisor never balloons or swaps its memory, and set a CPU reservation (or high CPU shares) so it is scheduled first under contention; keep it at 4 vCPUs -- more vCPUs on a busy host can make a VM wait longer for all its cores to be free at once. The other nineteen: normal shares, no reservations, so spare capacity floats to whoever needs it. Install the guest tools in every VM for paravirtual drivers and clean shutdown. The host (hypervisor) owns the physical CPUs, RAM and NICs and schedules them; each guest sees only virtual hardware and runs its own OS and patches."
            ),
            part(
              "Cloud model for the web VMs",
              "Identifies that running the two web VMs on a provider's virtual machines is IaaS in a public cloud, making the overall design a hybrid cloud; mentions that re-platforming to a managed app service would be PaaS; weighs the trade-off (elastic capacity and provider-managed hardware vs. network paths back to the on-premises database).",
              "Moving the public web VMs to a provider's virtual machines is Infrastructure as a Service (IaaS) in a public cloud; with the database staying on-premises the whole becomes a hybrid cloud. If the team instead deployed the web application onto the provider's managed application platform, that is PaaS. Benefits: scale out for traffic spikes and no hardware to maintain; costs: a secure, low-latency link (VPN or private connection) back to the on-premises database and attention to egress charges."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Security and Disaster Recovery (24%) -- 2 labs
    // -----------------------------------------------------------------------
    {
      slug: "harden-new-web-server",
      objective: "Server hardening: OS updates, disabling unused services, and host security",
      kind: "build",
      title: "Harden a freshly built web server before it goes live",
      brief:
        "A new Linux web server, WEB02 at Sandpiper Travel, was built from the vendor image with default settings. It will serve the booking site on HTTPS and is managed by the operations team from the management network 10.80.99.0/24. A port scan before go-live shows TCP 21, 22, 23, 80, 111, 443, 631 and 3306 open to the whole network. The database it uses runs on a separate server. Produce the hardening plan the change board will approve, with the checks that prove each item is done.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the hardening plan: patching, services and ports, accounts and access, and the verification that the attack surface is now what you intended.",
          parts: [
            part(
              "Patching",
              "Applies all current OS and application updates before exposure, enables automatic security updates (or enrols the host in the patch-management system with a schedule), reboots if the kernel changed, and records the baseline version.",
              "Fully update the OS and the web server packages now (apt/dnf update), reboot for the new kernel, and enrol the host in the patch-management schedule (monthly window plus out-of-band for critical fixes) or enable unattended security updates. Record the patched versions in the build record so drift is visible later."
            ),
            part(
              "Services and ports",
              "Removes or disables the unneeded listeners: FTP (21), Telnet (23), rpcbind/NFS (111), CUPS printing (631), and the local MySQL/MariaDB (3306) since the database is remote; keeps 443 (and 80 only to redirect), restricts 22 to the management subnet via the host firewall; verifies with ss -tlnp and an external scan.",
              "Disable and remove: vsftpd/FTP (21), telnet (23), rpcbind (111), cups (631) and the local mysql/mariadb service (3306; the database is on another host) -- systemctl disable --now each, then uninstall the packages so they cannot come back. Keep nginx/apache on 443 with 80 only redirecting to HTTPS. Host firewall (nftables/firewalld): allow 443 and 80 from anywhere, 22 only from 10.80.99.0/24, default deny inbound. Check sudo ss -tlnp shows only 22, 80 and 443 listening."
            ),
            part(
              "Accounts and host security",
              "Removes or disables default/vendor accounts, enforces key-based SSH for the ops team with no root login, applies least privilege via sudo, sets a strong password policy for any local accounts, enables mandatory access control (SELinux enforcing/AppArmor), installs endpoint protection or file-integrity monitoring, and ships logs to the SIEM with time synced.",
              "Delete the image's default accounts (or lock them), create named accounts for the ops team in an admin group with sudo rules, disable root SSH login and password authentication, and set a password policy for any remaining local accounts. Keep SELinux in enforcing mode (or AppArmor profiles loaded) for the web server. Install the endpoint protection/file-integrity agent, enable NTP, and forward auth, web and system logs to the SIEM. Apply the organization's benchmark (for example a CIS profile) with a configuration scanner and fix the findings."
            ),
            part(
              "Verification",
              "Re-runs the port scan from outside the management network expecting only 80 and 443 (22 filtered), confirms ss locally, checks sudo sshd -T for the auth settings, getenforce for SELinux, the patch tool reports zero pending security updates, and documents the before/after for the change record.",
              "From a host outside 10.80.99.0/24: nmap -sS -p- WEB02 shows only 80 and 443 open and 22 filtered; from the management subnet 22 is open. Locally: ss -tlnp lists just sshd, and the web server on 80/443; sshd -T confirms passwordauthentication no and permitrootlogin no; getenforce prints Enforcing; the update tool reports no pending security patches; the SIEM shows WEB02's logs arriving. Attach the before/after scans to the change ticket."
            ),
          ],
        },
      ],
    },
    {
      slug: "decommission-three-servers",
      objective: "Decommissioning: media destruction, recycling, and asset management",
      kind: "build",
      title: "Decommission three servers and sanitize their media properly",
      brief:
        "Oakhaven Regional Bank is retiring three servers: a file server with six 2 TB spinning hard drives that held customer documents; a database server with four 1.9 TB SSDs that held account data and uses hardware encryption (self-encrypting drives); and a web server with two small SSDs that never held sensitive data. Regulators require proof that customer data cannot be recovered from any retired media. The hard drives of the file server will be reused inside the bank; everything else goes to an e-waste recycler. Write the decommissioning plan.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the plan: the pre-checks before power-off, the sanitization method for each kind of media and why, the records that prove it, and the infrastructure clean-up.",
          parts: [
            part(
              "Before power-off",
              "Confirms no live dependencies (monitor traffic, DNS references, scheduled jobs), takes/verifies a final backup and checks data-retention requirements (some data must be kept, elsewhere), gets written sign-off from the data owners, and records the asset tags and serial numbers of every drive.",
              "Confirm with the business owners in writing that each system is no longer needed; check for lingering dependencies (connections in the firewall and switch logs, DNS names still referenced, backup and monitoring jobs). Take a final backup and verify a restore, and confirm with compliance which data must be retained and where it now lives -- destroying the only copy of a record under a retention rule is its own violation. Record the asset tags, model and serial number of every drive, since the certificates will be matched to those serials."
            ),
            part(
              "Sanitization by media type",
              "Spinning drives to be reused: software overwrite (purge-level wipe with verification) -- degaussing would also destroy them for reuse; self-encrypting SSDs: cryptographic erase (destroy the media encryption key) plus the vendor's secure-erase command, since overwriting does not reliably reach all SSD cells and degaussing does nothing to flash; drives leaving the organization with sensitive history should also be physically destroyed (shredded) if policy requires; the non-sensitive web SSDs still get a secure erase before recycling.",
              "File server HDDs (reused internally): a verified software overwrite with a wiping tool that reports completion per drive, followed by a read-back verification; not degaussing, which would also erase the servo tracks and make the drives unusable. Database SEDs: issue the cryptographic erase (destroy the drive's media encryption key through the controller or vendor tool) and then the ATA/NVMe secure-erase command; an ordinary overwrite is unreliable on SSDs because of wear-leveling and spare blocks, and a degausser has no effect on flash. Because they held account data and leave the building, shred them physically as well, per the bank's policy. Web server SSDs: secure erase, then to the recycler -- cheap insurance even though no sensitive data was stored."
            ),
            part(
              "Records and chain of custody",
              "Produces a sanitization record per drive (serial, method, tool and version, operator, date, verification result), a certificate of destruction from the recycler/shredding vendor listing serials, and a signed chain-of-custody form for drives in transit; updates the asset register to 'disposed' with those references.",
              "For every drive: a sanitization certificate stating serial number, method (overwrite / cryptographic erase / shred), tool and version, operator name, date and verification result. Drives shipped for shredding travel in sealed, tamper-evident containers with a chain-of-custody form signed at each handover, and the vendor returns a certificate of destruction listing each serial. The asset register entries move to 'disposed' with the certificate numbers attached, and the e-waste recycler's environmental certification is kept on file."
            ),
            part(
              "Infrastructure clean-up",
              "Removes the servers from Active Directory/identity (computer accounts, service accounts), DNS and DHCP reservations, monitoring and backup jobs, firewall rules and load-balancer pools, switch port descriptions and VLAN assignments, licenses and support contracts; updates documentation and diagrams.",
              "Delete the computer objects and any service accounts used only by these servers; remove their A/PTR records and DHCP reservations; retire them in monitoring and remove their backup jobs (keeping the retained backups); delete firewall rules and load-balancer pool members that reference their addresses; shut down and clear the switch ports; reclaim OS and application licenses and cancel hardware support; update the rack elevation, network diagrams and the CMDB. Then the addresses and rack units can be safely reused."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Troubleshooting (28%) -- 3 labs
    // -----------------------------------------------------------------------
    {
      slug: "degraded-raid-array-case",
      objective: "Troubleshooting hardware: power issues, storage failures, and connectivity problems",
      kind: "case",
      title: "Handle a degraded RAID array and a failing power supply",
      brief:
        "You are on call for Ashgrove Insurance. At 06:20 the monitoring system reports a storage alert on FILE03, a server with a hardware RAID 5 array of eight 4 TB drives and a global hot spare, holding the claims document share. Users have not noticed anything yet. The server is in a locked data-center cage you can reach in 30 minutes.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text:
            "From the RAID controller's management tool:\n\nVirtual Drive 0  RAID5  Size 28.0 TB  State: DEGRADED\n  Slot 0  4.0 TB  Online\n  Slot 1  4.0 TB  Online\n  Slot 2  4.0 TB  Online\n  Slot 3  4.0 TB  FAILED   (Predictive failure count 212, media errors 48)\n  Slot 4  4.0 TB  Online\n  Slot 5  4.0 TB  Online\n  Slot 6  4.0 TB  Online\n  Slot 7  4.0 TB  Online\n  Slot 8  4.0 TB  Hot spare -> REBUILDING  (3% complete)\n\nController cache: Write-back, battery OK.",
          ask: "What is the state of the data right now, what is your exposure, and what do you do and not do in the first hour?",
          parts: [
            part(
              "State and exposure",
              "Explains the array is degraded but online: RAID 5 lost one member and the hot spare is rebuilding, so data is intact and served, but until the rebuild completes a second drive failure (or an unrecoverable read error during the rebuild) loses the whole array; the rebuild of 4 TB will take many hours under load.",
              "Users still have their data: RAID 5 survives one failure and the hot spare has already started rebuilding. But the array has no redundancy until the rebuild finishes -- a second drive failure, or an unreadable sector on any of the seven survivors while the controller reads every block to rebuild, would destroy the volume. The rebuild of a 4 TB member will run for hours (at a typical 100 MB/s, about 4,000,000 MB / 100 = 40,000 s = roughly 11 hours, longer with user load), so that is the exposure window."
            ),
            part(
              "First-hour actions",
              "Verifies last night's backup completed and is restorable (the real safety net), lets the rebuild proceed (possibly raising rebuild priority after hours), orders/collects a replacement drive for slot 3, informs stakeholders, and does not pull any drive other than the failed one, does not reboot, and does not run a consistency check mid-rebuild.",
              "1) Check that last night's backup of the claims share completed and spot-check a restore -- if the rebuild fails, this is the recovery path. 2) Let the rebuild run; consider raising rebuild priority in the controller if users can tolerate slower performance. 3) Open a vendor case and get a replacement 4 TB drive for slot 3 so the array gets its hot spare back. 4) Tell the application owner there is a risk window today. Do not: pull a drive without confirming its slot (removing a healthy member now kills the array), reboot the server, or start a patrol read/consistency check while the rebuild is in progress."
            ),
          ],
        },
        {
          text:
            "At 17:45 the rebuild completes: Virtual Drive 0 State: OPTIMAL, Slot 8 is now a member and Slot 3 shows FAILED (empty role). The replacement drive has arrived. While you are in the cage, the server's front panel shows a second amber LED and the management tool reports:\n\nPower Supply 2: FAILED (no AC input detected)\nPower Supply 1: OK, load 71%",
          ask: "Replace the failed components safely and confirm the server is back to full redundancy.",
          parts: [
            part(
              "Replacing the drive",
              "Confirms the physical slot by the controller's locate/blink LED before touching anything, hot-swaps the failed drive in slot 3, and configures the new drive as the global hot spare (or lets the controller auto-assign), then confirms the virtual drive stays OPTIMAL with a hot spare present.",
              "In the management tool, 'locate' slot 3 so its LED blinks, match it to the physical bay, and hot-swap the failed drive (the chassis supports it; the array is OPTIMAL so no data is at risk). Mark the new drive as a global hot spare -- or confirm the controller's auto-hot-spare picked it up. Verify: Virtual Drive 0 OPTIMAL, eight Online members, one Hot spare, no foreign configuration warnings."
            ),
            part(
              "The power supply",
              "Checks the cause first (the 'no AC input' points to the cord, PDU outlet or feed, not necessarily the PSU): reseats or swaps the cord/outlet, and only if input is confirmed good replaces the PSU as a hot-swap unit; notes the server is currently running on one supply at 71% so there is no immediate outage but no redundancy.",
              "'No AC input detected' means PSU 2 is not receiving power -- check its cord is seated at both ends and that its PDU outlet and the B feed are live (another device on that PDU, or the PDU's own display). If the input is good and it still reports failed, hot-swap the PSU with the spare. Meanwhile the server runs on PSU 1 at 71%, so there is no outage but any hiccup on feed A would take it down. After the fix: both supplies OK, load shared roughly evenly, and the amber LED clears."
            ),
            part(
              "Closing out",
              "Re-checks monitoring is green, confirms a scheduled patrol read/consistency check (after the rebuild), reviews why slot 3's predictive-failure count had not triggered a proactive replacement and fixes the alert threshold, and documents the incident including the risk window.",
              "Confirm the monitoring system shows FILE03 healthy and schedule a controller consistency check for the weekend. Ask why 212 predictive-failure events never raised a ticket -- set an alert on predictive failure so the next drive is replaced before it dies. Document: drive failed 06:20, hot spare rebuild complete 17:45 (about 11.5 h exposed), PSU 2 input failure found and fixed, replacement installed as hot spare, backups verified during the window."
            ),
          ],
        },
      ],
    },
    {
      slug: "patch-broke-application-dependency",
      objective: "Troubleshooting software: OS errors, application issues, and patching failures",
      kind: "case",
      title: "Recover an application that stopped after the monthly patches",
      brief:
        "APP07 at Blackwood Freight (Rocky Linux) runs the dispatch application 'routemaster' as a systemd service. The monthly patch window ran at 02:00 Sunday; at 07:00 Monday dispatchers report the application is down. The server itself is up and reachable. Work from the evidence to a fix and to the process change that stops it recurring.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text:
            "$ systemctl status routemaster\n● routemaster.service - Routemaster dispatch service\n     Loaded: loaded (/etc/systemd/system/routemaster.service; enabled)\n     Active: failed (Result: exit-code) since Sun 2026-11-01 02:41:17 UTC\n    Process: 2210 ExecStart=/opt/routemaster/bin/routemaster (code=exited, status=127)\n\n$ journalctl -u routemaster -b -p err --no-pager | tail -n 2\nNov 01 02:41:17 app07 routemaster[2210]: /opt/routemaster/bin/routemaster: error while loading shared libraries: libssl.so.1.1: cannot open shared object file: No such file or directory\nNov 01 02:41:17 app07 systemd[1]: routemaster.service: Failed with result 'exit-code'.\n\n$ sudo dnf history | head -n 3\nID | Command line              | Date and time    | Action(s)      | Altered\n48 | update -y                 | 2026-11-01 02:14 | I, U, E        |   61 EE",
          ask: "What happened, and how do you confirm which change caused it?",
          parts: [
            part(
              "Reading the failure",
              "Identifies exit status 127 plus 'error while loading shared libraries: libssl.so.1.1' as a missing shared library the application was built against; the timing (service failed at 02:41, right after dnf transaction 48 at 02:14 which installed, updated and erased packages) points to the patch run removing the old OpenSSL 1.1 compatibility library.",
              "The binary cannot start because a library it links against, libssl.so.1.1 (OpenSSL 1.1), is gone -- status 127 and the loader's message say so directly. The service died at 02:41 on the patch night, 27 minutes after dnf transaction 48 ran with Install, Update and Erase actions, so the update most likely removed or replaced the OpenSSL 1.1 compatibility package the vendor application depends on."
            ),
            part(
              "Confirming the cause",
              "Inspects the transaction (sudo dnf history info 48) for an Erased or Upgraded openssl1.1/compat-openssl11 package, checks the binary's needs with ldd /opt/routemaster/bin/routemaster (shows 'not found'), and checks what provides the library (dnf provides '*/libssl.so.1.1').",
              "sudo dnf history info 48 lists every package touched; look for compat-openssl11 (or openssl1.1) under Erased/Obsoleted. ldd /opt/routemaster/bin/routemaster shows libssl.so.1.1 => not found, confirming the dependency. dnf provides '*/libssl.so.1.1' tells you which package supplies it and whether it is still available in the repositories. Together that is the proof, not a guess."
            ),
          ],
        },
        {
          text:
            "$ sudo dnf history info 48 | grep -i openssl\n    Obsoleted  compat-openssl11-1:1.1.1k-5.el9.x86_64   @appstream\n    Install    openssl-libs-1:3.2.2-6.el9.x86_64         @baseos\n\n$ ldd /opt/routemaster/bin/routemaster | grep ssl\n        libssl.so.1.1 => not found\n\nThe application vendor's support page says routemaster 6.4 (installed) requires OpenSSL 1.1; version 7.0 supports OpenSSL 3.",
          ask: "Get the dispatchers working again this morning and decide the proper fix.",
          parts: [
            part(
              "Immediate restoration",
              "Restores the compatibility library quickly and reversibly: reinstall compat-openssl11 from the repository (dnf install compat-openssl11) if still available, or roll back only that part of the transaction (dnf history undo 48 is broader than needed and reverts 61 packages, including security fixes -- call out the trade-off); then start the service and verify with systemctl status and an application check.",
              "Reinstall just the missing compatibility package: sudo dnf install compat-openssl11 (it coexists with OpenSSL 3; the update obsoleted it rather than it being broken). If the repository no longer offers it, the alternative is sudo dnf history undo 48 -- but that reverts all 61 packages including Sunday's security fixes, so prefer the targeted install and only undo if nothing else works, then re-apply the other updates. Start it: sudo systemctl start routemaster; confirm Active: active (running), ldd shows the library resolved, and a dispatcher can log in."
            ),
            part(
              "Proper fix and prevention",
              "Plans the upgrade to routemaster 7.0 (OpenSSL 3) in a test environment first, adds the compatibility package to the patch exclusion list or the application's dependency record until then, and changes the patching process: snapshot/backup before patching, test patches on a staging server, read the update's obsoletes/removals, have a rollback plan, and run post-patch service checks before the window closes.",
              "Schedule the routemaster 7.0 upgrade, tested on a staging copy of APP07 against the current OpenSSL 3 libraries, and until it ships protect the dependency (dnf versionlock or exclude=compat-openssl11 so no update removes it again). Process changes: take a VM snapshot or backup immediately before patching; patch staging a week before production and run the application's smoke test; review the transaction summary for Obsoleted/Erased packages before confirming; and finish every window with a service-health check (systemctl --failed, application login test) so a failure is caught at 02:45, not when dispatchers arrive."
            ),
            part(
              "Documentation",
              "Records the incident: symptom, root cause (patch obsoleted compat-openssl11 required by routemaster 6.4), the interim fix, the planned permanent fix, and the process changes, with timings; updates the application's runbook with its library dependencies.",
              "Incident record: 'Routemaster down 02:41 Sun - 07:40 Mon. Cause: monthly update (dnf transaction 48) obsoleted compat-openssl11, which routemaster 6.4 requires. Interim fix: reinstalled compat-openssl11, service restored. Permanent fix: upgrade to 7.0 (OpenSSL 3) by end of month; package locked until then. Process: staging patch test, pre-patch snapshot, post-patch service checks added to the window checklist.' Add the dependency to the application runbook."
            ),
          ],
        },
      ],
    },
    {
      slug: "backup-restore-chain-rto-rpo",
      objective: "Disaster recovery: backup strategies, recovery testing, and failover validation",
      kind: "build",
      title: "Work out the restore chain, RPO and RTO of a backup schedule",
      brief:
        "Juniper Hill Accountants back up their 2 TB document server with a full backup every Sunday at 01:00 and an incremental backup at 01:00 on each of the other six nights (Monday to Saturday). Backups land on a local backup appliance that can restore at about 200 MB/s. On a Thursday at 14:00 a ransomware infection encrypts the server and it must be rebuilt from backup. Management asks: exactly which backup sets are needed, how much work is lost, how long the restore will take, and whether the plan would survive the backup appliance itself being hit. They also ask how they would know any of this works before a real disaster.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the analysis: the restore chain for Thursday 14:00 (and how a differential scheme would differ), the RPO and RTO figures, the gaps in the current design, and a recovery test plan.",
          parts: [
            part(
              "Restore chain",
              "States five sets are needed in order: Sunday's full plus the Monday, Tuesday, Wednesday and Thursday 01:00 incrementals (each incremental holds only changes since the previous backup); with differentials it would be two sets, Sunday's full plus Thursday's differential (changes since the full), at the cost of larger nightly backups.",
              "Incremental scheme: restore Sunday 01:00 full, then Monday, Tuesday, Wednesday and Thursday 01:00 incrementals, in order -- five sets, and if any one is missing or corrupt the chain breaks at that point. With differentials each night captures everything since Sunday's full, so the restore is Sunday's full plus Thursday's differential: two sets, faster and simpler, but Wednesday's and Thursday's differentials grow larger each day."
            ),
            part(
              "RPO and RTO",
              "RPO: the last good backup is Thursday 01:00, so up to 13 hours of work (01:00-14:00) is lost; RTO: 2 TB at 200 MB/s is 2,000,000 MB / 200 = 10,000 s, about 2.8 hours of data transfer, plus rebuilding the OS, scanning/cleaning, and verification -- so a realistic RTO of half a day or more; checks that against what the business can accept.",
              "RPO (data loss): everything after Thursday 01:00 -- up to 13 hours of documents -- unless the ransomware's encryption time is earlier and the 01:00 set itself is suspect, in which case Wednesday's set is the last clean one and the loss is 37 hours. RTO: data copy alone is 2,000,000 MB / 200 MB/s = 10,000 s = about 2 h 47 min; add reinstalling the OS on clean media, restoring in chain order, verifying files, and re-pointing users -- plan on 6-8 hours. Management decides whether a 13-hour RPO and roughly 8-hour RTO are acceptable; if not, the schedule changes (see gaps)."
            ),
            part(
              "Gaps in the design",
              "Names the single local appliance as a single point of failure for ransomware (it is on the same network and could be encrypted or deleted): applies the 3-2-1 rule (three copies, two media, one off-site), adds an immutable/offline or cloud copy, considers more frequent backups (hourly incrementals or snapshots) to cut RPO, and checks backup success daily; also notes a tested, clean OS image shortens RTO.",
              "One copy on one appliance on the same LAN is exactly what ransomware targets; if the appliance is encrypted, there is no restore. Fix: 3-2-1 -- keep the local appliance for fast restores, replicate nightly to an off-site or cloud copy, and make that copy immutable (object lock / write-once retention) or offline (rotated tape) so it cannot be altered from a compromised network. To shrink the RPO from 13 hours, add hourly incrementals or storage snapshots during the working day. Alert on any failed or missing backup job every morning, and keep a clean, tested OS build image so rebuilding does not start from scratch."
            ),
            part(
              "Recovery test plan",
              "Schedules regular restore tests that measure actual RTO and verify data: monthly file-level restores from a random set, quarterly full server restore to isolated hardware or a VM with a checksum/spot-check of documents and an application test, an annual failover exercise of the whole DR plan, with results and gaps recorded and the plan updated.",
              "Monthly: restore a random sample of files from a random incremental and compare checksums to the originals. Quarterly: full bare-metal (or VM) restore of the document server into an isolated network, timed end to end, with users validating a sample of documents -- that measured time becomes the documented RTO. Annually: a full exercise of the DR plan, including the off-site copy and the ransomware scenario (pretend the appliance is lost), so the team practices the real runbook. Record every test, the time it took and what failed; fix the gaps and update the plan."
            ),
          ],
        },
      ],
    },
  ],
};
