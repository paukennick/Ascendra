import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-160: CompTIA Network+ (N10-009, V9).
//
// Aligned to the five domains on CompTIA's Network+ certification page, read
// 2026-11-07: Networking Concepts 23%, Network Implementation 20%, Network
// Operations 19%, Network Security 14%, Network Troubleshooting 24%
// (exam series code N10-009, launched 2024-06-20, retirement estimated 2027,
// no successor version announced on the page).
//   https://www.comptia.org/en-us/certifications/network/
// Density (docs/labs.md, policy "hybrid"): 2 / 1 / 2 / 2 / 3. The skills are
// the ones the exam's scenario and performance-based items ask a candidate to
// DO: carve a VLSM plan, write port and ACL rules, lay out VLANs and trunks,
// plan DHCP/DNS/NTP, pick the monitoring tool that answers the question,
// segment risky device classes, and work a fault with CompTIA's seven-step
// troubleshooting methodology against real command output.
// Every address is from the documentation ranges (RFC 5737 / RFC 1918); every
// organisation is fictional. Subnet arithmetic was computed, not recalled.
// These labs are additional to the course's self-reported labs.

export const NETWORKPLUS_LABS: SeedLabSet = {
  trackCode: "NETWORKPLUS",
  sources: [source("https://www.comptia.org/en-us/certifications/network/", "exam_outline", "2026-11-07")],
  labs: [
    // -----------------------------------------------------------------------
    // Networking Concepts (23%) -- 2 labs
    // -----------------------------------------------------------------------
    {
      slug: "vlsm-plan-branch-office",
      objective: "IPv4 addressing: public vs. private ranges, subnetting, and address classes",
      kind: "build",
      title: "Carve a /22 into right-sized subnets with VLSM",
      brief:
        "Harbor Point Logistics has been allocated 172.16.40.0/22 for its new distribution centre. The network needs: Sales and warehouse floor, 300 hosts; Engineering, 120 hosts; VoIP phones, 60 hosts; Servers, 25 hosts; and two point-to-point links between the core and two edge routers (2 addresses each). Use variable-length subnet masking so that no subnet is larger than it needs to be and the leftover space stays contiguous for growth. A technician also asks which of your subnets the address 172.16.42.140 belongs to.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the addressing plan: a subnet for each requirement with its prefix, mask, usable range and broadcast address, the leftover space, and the answer to the technician's question.",
          parts: [
            part(
              "Sales and Engineering subnets",
              "Sales gets a /23 (510 usable) and Engineering a /25 (126 usable), each the smallest prefix that fits, with correct ranges: e.g. Sales 172.16.40.0/23 (mask 255.255.254.0, usable 172.16.40.1-172.16.41.254, broadcast 172.16.41.255) and Engineering 172.16.42.0/25 (mask 255.255.255.128, usable 172.16.42.1-172.16.42.126, broadcast 172.16.42.127). Other non-overlapping placements with the same prefix lengths are fine.",
              "Sales: 172.16.40.0/23, mask 255.255.254.0, usable 172.16.40.1-172.16.41.254, broadcast 172.16.41.255 (510 usable for 300 hosts; a /24 gives only 254). Engineering: 172.16.42.0/25, mask 255.255.255.128, usable 172.16.42.1-172.16.42.126, broadcast 172.16.42.127 (126 usable for 120)."
            ),
            part(
              "VoIP and Servers subnets",
              "VoIP gets a /26 (62 usable) and Servers a /27 (30 usable), with correct ranges that do not overlap the others: e.g. 172.16.42.128/26 (mask 255.255.255.192, usable .129-.190, broadcast .191) and 172.16.42.192/27 (mask 255.255.255.224, usable .193-.222, broadcast .223).",
              "VoIP: 172.16.42.128/26, mask 255.255.255.192, usable 172.16.42.129-172.16.42.190, broadcast 172.16.42.191 (62 usable for 60). Servers: 172.16.42.192/27, mask 255.255.255.224, usable 172.16.42.193-172.16.42.222, broadcast 172.16.42.223 (30 usable for 25)."
            ),
            part(
              "Point-to-point links and leftover space",
              "Uses /30s (2 usable each; a /31 is also acceptable for point-to-point) in the next free space, e.g. 172.16.42.224/30 (.225 and .226, broadcast .227) and 172.16.42.228/30 (.229 and .230, broadcast .231), and states the contiguous leftover (172.16.42.232-172.16.42.255 within that /27 plus all of 172.16.43.0/24).",
              "Link A: 172.16.42.224/30 (mask 255.255.255.252), hosts .225 and .226, broadcast .227. Link B: 172.16.42.228/30, hosts .229 and .230, broadcast .231. (/31s per RFC 3021 would also work on router-to-router links.) Left for growth: 172.16.42.232/29 and 172.16.42.240/28 inside the last /27, and the whole of 172.16.43.0/24."
            ),
            part(
              "Where 172.16.42.140 lives, and the address class question",
              "Places 172.16.42.140 in the VoIP subnet (172.16.42.128/26 spans .128-.191) and notes the whole block is RFC 1918 private space (172.16.0.0/12), so it needs NAT to reach the internet; mentioning that 'Class B' is only the historical classful label for 172.16.x.x and the real boundaries are the prefixes is a plus.",
              "172.16.42.140 is a VoIP phone address: 172.16.42.128/26 covers 172.16.42.128-172.16.42.191 and 140 falls inside. All of 172.16.40.0/22 is private (RFC 1918's 172.16.0.0/12), so the edge router must NAT/PAT to a public address. Classful terms say 172.16.x.x is 'Class B', but that only describes the old default mask; what matters is the /22 the ISP or IPAM gave us and the prefixes we carved."
            ),
          ],
        },
      ],
    },
    {
      slug: "firewall-rules-by-port",
      objective: "Common ports and protocols: FTP, SSH, DNS, DHCP, HTTP/S, SNMP, LDAP, RDP, and SIP",
      kind: "build",
      title: "Write the port rules for a new application server",
      brief:
        "Redwood Dental Group is placing a new application server, APP01 (10.60.8.20), in its server VLAN behind a stateful firewall. The server hosts a patient-scheduling website for staff over HTTPS, must look up names on the internal DNS resolver (10.60.1.5), is managed by the IT team's management subnet (10.60.99.0/24) over SSH, authenticates users against the directory server (10.60.1.10) over LDAP, is polled by the monitoring server (10.60.1.20) with SNMP and sends it traps, and reaches the hosted phone system's SIP trunk (203.0.113.40) for click-to-call. A vendor has asked for FTP access from the internet to upload reports. Firewall rules are first-match with an implicit deny at the end.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the rule set for APP01: inbound rules, outbound rules, the vendor request, and how you will confirm it works.",
          parts: [
            part(
              "Inbound rules",
              "Allows TCP 443 from the staff networks to 10.60.8.20; allows TCP 22 only from 10.60.99.0/24; allows UDP 161 (SNMP polling) only from 10.60.1.20; optionally allows TCP 80 only to redirect to 443; everything else inbound is denied. Each rule names protocol (TCP/UDP) and port correctly.",
              "1) Allow TCP 443 from 10.60.0.0/16 staff ranges to 10.60.8.20 (HTTPS). 2) Allow TCP 80 from the same to 10.60.8.20 only if the site redirects to HTTPS; otherwise omit. 3) Allow TCP 22 from 10.60.99.0/24 to 10.60.8.20 (SSH management). 4) Allow UDP 161 from 10.60.1.20 to 10.60.8.20 (SNMP get/walk). 5) Deny any to 10.60.8.20 (explicit, logged)."
            ),
            part(
              "Outbound rules",
              "Allows DNS to 10.60.1.5 on UDP 53 (and TCP 53 for large responses/zone data), LDAP to 10.60.1.10 on TCP 389 -- or, better, LDAPS on TCP 636 -- SNMP traps to 10.60.1.20 on UDP 162, and SIP to 203.0.113.40 on UDP/TCP 5060 (or TLS 5061), noting that the stateful firewall allows return traffic automatically.",
              "Allow UDP/TCP 53 from 10.60.8.20 to 10.60.1.5 (DNS). Allow TCP 636 (LDAPS; TCP 389 only if the directory cannot do TLS) from 10.60.8.20 to 10.60.1.10. Allow UDP 162 from 10.60.8.20 to 10.60.1.20 (SNMP traps go server-to-NMS). Allow UDP 5060 and TCP 5061 from 10.60.8.20 to 203.0.113.40 (SIP, prefer SIP over TLS); the RTP media ports the phone system uses are handled by the PBX, not APP01. Replies to all of these come back through the stateful table without extra rules."
            ),
            part(
              "The vendor's FTP request",
              "Declines plain FTP from the internet (TCP 21 control plus TCP 20/passive data, cleartext credentials, awkward through NAT) and offers SFTP over TCP 22 restricted to the vendor's source address, or a managed transfer service, with the account scoped to one directory.",
              "No inbound FTP from the internet: TCP 21 (plus TCP 20 or a passive port range) carries credentials and files in cleartext and opens the server to the whole internet. Offer SFTP on TCP 22 from the vendor's fixed public address only, with a dedicated account chrooted to an upload directory -- or an outbound push from APP01 to a managed transfer service, so nothing inbound is needed at all."
            ),
            part(
              "Verifying the rule set",
              "Tests each allowed and denied path from the right source (e.g. a browser to https://, ssh from the management subnet and from a staff PC to prove the deny, a DNS lookup, an SNMP poll from the NMS) and reviews the firewall's deny log for anything legitimate that was blocked.",
              "From a staff PC: open https://app01 works; ssh app01 is refused (good). From the management subnet: ssh works. On APP01: dig @10.60.1.5 works, ldapsearch over 636 binds, a test trap appears on the NMS, and the NMS can snmpwalk APP01. Watch the firewall's deny log for a day for legitimate traffic that was missed (for example NTP, which should be added explicitly if the server syncs time)."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Network Implementation (20%) -- 1 lab
    // -----------------------------------------------------------------------
    {
      slug: "vlan-trunk-plan-office",
      objective: "Switching technologies: VLANs, spanning tree, MTU, and jumbo frames",
      kind: "build",
      title: "Lay out VLANs, a trunk and spanning tree for a three-department office",
      brief:
        "Meridian Architects is moving into a two-floor office with one 48-port access switch per floor uplinked to a core switch, which connects to the router on one link. There are three departments (Finance, Design, Admin), desk phones that share a cable with the PC on each desk, a storage array that the Design team's workstations hit hard with large files, and the switches themselves need a management address. Finance must be kept separate from the other departments at layer 2 while still being routed to shared servers. A junior technician has proposed putting everything in VLAN 1 'to keep it simple'.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the switching design: the VLAN plan, the access and trunk port configuration, the spanning-tree settings, and the MTU decision for the storage traffic.",
          parts: [
            part(
              "VLAN plan",
              "Assigns separate VLANs (any sensible numbers) to Finance, Design, Admin, Voice and Management, each with its own subnet, keeps user traffic out of VLAN 1, and explains that inter-VLAN traffic is routed (router-on-a-stick with 802.1Q subinterfaces, or a layer-3 core) so Finance stays separate at layer 2 but can reach servers through routing/ACLs.",
              "VLAN 10 Finance, 20 Design, 30 Admin, 40 Voice, 99 Management; nothing in VLAN 1 and its default use for the native VLAN changed. Each VLAN gets a /24. Routing between them happens at the core (SVIs) or on the router via 802.1Q subinterfaces, with an ACL so Finance reaches the shared servers but not the other user VLANs."
            ),
            part(
              "Access ports and the phone-plus-PC desks",
              "Configures desk ports as access ports in the department's data VLAN with the voice VLAN assigned on the same port (the phone tags its frames with the voice VLAN; the PC behind it is untagged in the data VLAN), and sets the management VLAN on the switch's SVI for its own address.",
              "Each desk port: switchport mode access, access VLAN = the department's data VLAN, voice VLAN 40. The phone tags its own traffic with VLAN 40 and passes the PC's untagged frames through into the data VLAN. The switch's management IP sits on an SVI in VLAN 99, not in a user VLAN."
            ),
            part(
              "Trunks and the native VLAN",
              "Makes the uplinks (access-to-core, core-to-router) 802.1Q trunks carrying only the VLANs needed (allowed-VLAN list), with the native VLAN set to an unused VLAN rather than VLAN 1 to reduce VLAN-hopping risk, and no DTP negotiation.",
              "Uplinks: switchport mode trunk, 802.1Q, allowed VLANs 10,20,30,40,99 only, native VLAN set to an unused VLAN (e.g. 999) and matching on both ends, negotiation (DTP) off. The core-to-router link is a trunk if the router does router-on-a-stick; if the core routes, it is a routed link."
            ),
            part(
              "Spanning tree and MTU",
              "Sets the core as the spanning-tree root bridge (lowest priority), uses a rapid STP variant, enables PortFast (edge) and BPDU guard on access ports, and for the storage traffic either keeps the default 1500-byte MTU or enables jumbo frames (e.g. 9000) end to end on every switch, port and host in that path, since a mismatch causes drops or fragmentation.",
              "Run Rapid PVST+/RSTP; make the core the root (priority 4096) so a floor switch never becomes root; set access ports as edge ports (PortFast) with BPDU guard so a plugged-in rogue switch shuts the port rather than reshaping the tree. For Design-to-storage traffic, jumbo frames (MTU 9000) help only if every device in the path -- workstation NICs, both switches, the array -- is set to 9000; a single 1500 hop fragments or drops the frames. Otherwise leave 1500 everywhere."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Network Operations (19%) -- 2 labs
    // -----------------------------------------------------------------------
    {
      slug: "dhcp-dns-ntp-branch-services",
      objective: "Network services: DHCP, SLAAC, DNS, NTP, PTP, and NTS",
      kind: "build",
      title: "Plan DHCP, DNS and time for a branch network",
      brief:
        "Cedar Valley Credit Union is opening a branch on 192.168.50.0/24. The router is 192.168.50.1. Static addresses .2-.20 are reserved for the switch, a local file server (FS-BR01, .10) and the Wi-Fi controller. Three network printers must always get the same address. Up to 180 staff laptops come and go during the day. Head office runs the authoritative DNS for corp.cedarvalley.example and two internal NTP servers that sync to GPS. The branch also hosts a guest Wi-Fi SSID that must never receive corporate addresses. A new intranet alias 'branch-files' should point at the file server, and the security team wants reverse lookups to work for the server.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the service plan: the DHCP scope and its options, how the printers and guests are handled, the DNS records, and the time design.",
          parts: [
            part(
              "DHCP scope",
              "Defines a pool that avoids the static range (e.g. 192.168.50.21-192.168.50.254, 234 addresses, or .50-.250, 201 addresses), states that it covers 180 laptops with headroom, sets a lease appropriate to a daytime population (hours, not days), and supplies options: router 192.168.50.1, DNS servers, domain name.",
              "Scope 192.168.50.21-192.168.50.254 (234 addresses) or 192.168.50.50-192.168.50.250 (201) -- both clear the .2-.20 statics and cover 180 laptops with room. Lease 8 hours so addresses recycle between days (a 7-day lease with staff coming and going would exhaust the pool). Options: default gateway 192.168.50.1, DNS = head office resolvers, domain corp.cedarvalley.example. Use a DHCP relay (ip helper) on the router if the server is at head office."
            ),
            part(
              "Printers and the guest network",
              "Gives the printers DHCP reservations keyed on MAC address (or excludes a small range and sets them statically) and puts guest Wi-Fi on its own VLAN and subnet with its own scope so guests never pull corporate addresses.",
              "Printers: reservations tied to their MAC addresses inside the scope (for example .30-.32), so they always get the same address but stay centrally managed; alternatively exclude .21-.40 and set them static. Guests: separate VLAN and subnet (e.g. 192.168.150.0/24) with its own DHCP scope and DNS, isolated from 192.168.50.0/24 by ACL."
            ),
            part(
              "DNS records",
              "Creates an A record fs-br01.corp.cedarvalley.example -> 192.168.50.10, a CNAME branch-files -> fs-br01, and a PTR record 10.50.168.192.in-addr.arpa -> fs-br01.corp.cedarvalley.example in the reverse zone.",
              "Forward zone corp.cedarvalley.example: A fs-br01 -> 192.168.50.10; CNAME branch-files -> fs-br01.corp.cedarvalley.example. Reverse zone 50.168.192.in-addr.arpa: PTR 10 -> fs-br01.corp.cedarvalley.example. (The branch router could also get an A and PTR for log readability.)"
            ),
            part(
              "Time",
              "Points every branch device at the internal NTP servers (via DHCP option or configuration), gives the file server/router an authenticated or internal source rather than random internet pools, notes NTS (NTP over TLS) when syncing across the internet, and explains that PTP is for sub-microsecond needs (trading, telecom) and is unnecessary here.",
              "Set the router and file server to sync with head office's two GPS-disciplined NTP servers (stratum 1 upstream), and hand laptops those servers via DHCP option 42 or the domain's time policy; the branch router can act as the local NTP server. If any device must sync over the internet, use NTS so the time source is authenticated. PTP is not needed: it is for microsecond-accurate timing with hardware timestamping, not for logs and Kerberos, which need only seconds."
            ),
          ],
        },
      ],
    },
    {
      slug: "monitoring-tool-for-each-question",
      objective: "Network monitoring: SNMP, flow data, packet capture, and log aggregation",
      kind: "build",
      title: "Pick the monitoring data that answers each question",
      brief:
        "Northgate Community College's network team has four open questions this week. (1) The library uplink graphs show 95% utilisation every afternoon; who or what is using it? (2) A core switch port is suspected of dropping frames; the team wants error and discard counts over time and an alert when the port goes down. (3) The student portal intermittently returns a blank page; the web team says 'the network is slow' and the network team says 'the server is slow'. (4) After a suspected phishing incident, security wants to see every login failure, firewall deny and VPN connection for one user across all devices, correlated by time. The team has an SNMP-capable network management system, switches that can export NetFlow/sFlow, a laptop with a protocol analyser, and a syslog collector that is not yet used.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "For each question, name the monitoring data source you would use, how you would set it up, and what in its output answers the question.",
          parts: [
            part(
              "Who is using the uplink",
              "Chooses flow data (NetFlow/sFlow/IPFIX) exported from the library switch or router to a collector, because flows show top talkers, conversations and applications by port, which utilisation graphs cannot; names top-talker/top-conversation reports as the answer.",
              "Enable NetFlow (or sFlow) on the library uplink interface and export it to a flow collector. Flow records give source, destination, ports and byte counts per conversation, so the 'top talkers' and 'top applications' reports for 14:00-16:00 show exactly which hosts and which service (for example a video-streaming CDN or a backup job) fill the link. SNMP only says the link is full; it cannot say who."
            ),
            part(
              "Port errors and a down alert",
              "Chooses SNMP polling of the interface counters (ifInErrors, ifOutDiscards, CRC errors) plotted over time, plus SNMP traps (or syslog) for link-down, with SNMPv3 authentication/privacy, and a baseline/threshold to alert on.",
              "Poll the switch with SNMPv3 (authPriv) every minute for the port's error and discard counters and graph them; rising CRC/input errors point to cabling or duplex problems, discards to congestion. Configure the switch to send a linkDown trap (or a syslog message) to the NMS so a port failure alerts immediately rather than at the next poll. Set thresholds against the normal baseline, not absolute numbers."
            ),
            part(
              "Blank-page portal argument",
              "Chooses a packet capture (SPAN/mirror port or tap near the server, or on the client) with a protocol analyser, because it shows timing per layer: TCP handshake and retransmissions versus server response time (time between request and first byte), which settles whether the delay is network or application.",
              "Mirror the portal server's switch port (SPAN) to the laptop and capture during a failure, or capture on an affected client. In the analyser, filter the client's conversation: if the TCP handshake and ACKs are prompt but the HTTP response takes seconds or the server closes the connection, it is the application; if there are retransmissions, resets or a slow handshake, it is the network path. The capture's timestamps are the evidence both teams accept."
            ),
            part(
              "Correlating one user's activity",
              "Chooses log aggregation (syslog/SIEM): sends firewall, VPN, directory/authentication and switch logs to the collector with synchronised time (NTP), then searches/correlates by username and time window; notes retention and access control for the logs.",
              "Point every device -- firewall denies, VPN concentrator, the directory's authentication logs, Wi-Fi controller -- at the syslog collector (or a SIEM on top of it). With all clocks on NTP, one search for the username across the incident window lays out the sequence: failed logins, the successful VPN connection, the firewall denies that followed. Keep the logs long enough for investigations and restrict who can read them."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Network Security (14%) -- 2 labs
    // -----------------------------------------------------------------------
    {
      slug: "screened-subnet-acl",
      objective: "Security features: NAC, ACLs, content filtering, and screened subnets",
      kind: "build",
      title: "Write the ACL for a screened subnet web server",
      brief:
        "Lakeshore Realty runs a three-interface firewall: outside (internet), a screened subnet 203.0.113.0/28 holding the public web server WEB1 (203.0.113.10), and inside 10.20.0.0/16. WEB1 must be reachable from the internet over HTTPS (with HTTP redirecting to HTTPS), must talk to the database server DB1 (10.20.30.15) on TCP 5432, and is administered over SSH only from the IT subnet 10.20.5.0/24. Nothing else from the screened subnet may reach the inside network. Separately, the office manager wants visitors in the two conference rooms to be able to plug into the wall jacks for internet only, and HR has asked that gambling and adult sites be blocked for staff. The firewall processes rules top to bottom, first match wins, with an implicit deny at the end.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the ACL rules in order with the interface and direction they apply to, explain why the order matters, and say how you would handle the conference rooms and the web-filtering request.",
          parts: [
            part(
              "Rules into the screened subnet from outside",
              "Permits TCP 443 and TCP 80 from any to 203.0.113.10 only, denies everything else inbound to the screened subnet, and applies the list inbound on the outside interface.",
              "Outside interface, inbound: 1) permit tcp any host 203.0.113.10 eq 443; 2) permit tcp any host 203.0.113.10 eq 80 (the web server redirects to 443); 3) deny ip any 203.0.113.0/28 (log). Nothing from the internet reaches the inside network directly."
            ),
            part(
              "Rules from the screened subnet toward inside",
              "Permits TCP 5432 from 203.0.113.10 to 10.20.30.15 and then denies 203.0.113.0/28 to 10.20.0.0/16, with the deny placed after the specific permit; SSH is permitted inbound to WEB1 only from 10.20.5.0/24 (an inside-to-DMZ rule), not from the DMZ outward.",
              "Screened-subnet interface, inbound (traffic leaving the DMZ): 1) permit tcp host 203.0.113.10 host 10.20.30.15 eq 5432; 2) deny ip 203.0.113.0/28 10.20.0.0/16 (log); 3) permit ip 203.0.113.0/28 any for updates/DNS out to the internet if required. Inside interface, inbound (traffic leaving the LAN): permit tcp 10.20.5.0/24 host 203.0.113.10 eq 22, then the normal outbound rules; the stateful firewall allows the SSH replies back."
            ),
            part(
              "Why the order matters",
              "Explains first-match: the specific DB permit must sit above the broad DMZ-to-inside deny or it never matches; the implicit deny catches everything unlisted; and logging the explicit deny shows attempted lateral movement from a compromised web server.",
              "Rules are evaluated top down and the first match wins. If 'deny 203.0.113.0/28 -> 10.20.0.0/16' came before 'permit WEB1 -> DB1 5432', the database connection would be dropped by the deny. Anything not permitted falls to the implicit deny, which is the point of a screened subnet: a compromised WEB1 can reach only DB1 on one port, and the logged deny line shows any attempt to go further."
            ),
            part(
              "Conference rooms and web filtering",
              "Uses NAC (802.1X with a guest/unauthenticated VLAN, or MAC-based fallback) so conference-room jacks land visitors in an internet-only guest VLAN, and a content filter (web proxy/DNS filtering by category) with HTTPS inspection or SNI/DNS-based categorisation for the gambling/adult block, applied to staff VLANs.",
              "Conference-room ports: enable 802.1X; devices that cannot authenticate are placed in a guest VLAN that the firewall allows to the internet only, with no route to 10.20.0.0/16 (dynamic VLAN assignment from the RADIUS/NAC server for staff who do authenticate). HR's request: a category-based content filter -- DNS filtering or a web proxy -- blocking the gambling and adult categories for staff VLANs, with the policy and exceptions documented."
            ),
          ],
        },
      ],
    },
    {
      slug: "segment-clinic-iot-ics-guest",
      objective: "Network segmentation: IoT, SCADA, ICS, guest, and BYOD networks",
      kind: "build",
      title: "Segment a hospital campus with IoT, building controls, guests and BYOD",
      brief:
        "St. Brigid Regional Hospital has one flat network today. On it are: clinical workstations and the electronic health record servers; 240 IP cameras and smart TVs in patient rooms (IoT); the building management system's PLCs and HVAC controllers (ICS/SCADA) managed by an outside contractor who connects over the internet; a public guest Wi-Fi; and nurses' personal phones (BYOD) that run the hospital's secure messaging app. Last month a smart TV was found scanning the EHR servers. The CIO wants a segmentation design that limits what each class of device can reach, with the least disruption to clinicians.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the segmentation design: the segments and their rules, the ICS/SCADA handling, the guest design, and how BYOD gets to the one app it needs.",
          parts: [
            part(
              "Segments and inter-segment rules",
              "Creates separate VLANs/subnets (or zones) for clinical, servers, IoT, ICS, guest and BYOD; places a firewall/ACL between them with default deny; IoT (cameras, TVs) can reach only their management/recording servers and update sources, never the EHR; states that the TV incident would have been contained by the IoT segment's rules.",
              "Zones: Clinical workstations; EHR/servers; IoT (cameras and TVs); ICS/building controls; Guest; BYOD; Management. Every inter-zone path goes through the firewall with default deny. IoT -> camera recorder and TV content server only, plus vendor update URLs by proxy; IoT -> EHR denied and logged. Clinical -> EHR permitted on the application ports. With that in place the scanning TV would have hit a deny and an alert, not the EHR servers."
            ),
            part(
              "ICS/SCADA and the contractor",
              "Isolates the ICS segment with no direct internet or user-LAN access; the contractor connects through a VPN to a jump host (bastion) in a management zone with MFA and logging, and only the jump host can reach the PLCs on their specific protocols; monitoring traffic flows one way out of the ICS zone where possible.",
              "ICS zone: PLCs and HVAC controllers only, no internet, no path from user or IoT VLANs. The contractor uses the hospital's VPN with MFA to reach a hardened jump host in a management zone; only that jump host may open sessions to the controllers on the control protocol's ports, and every session is logged. Alarms and telemetry flow outward from the ICS zone to a historian/monitoring server; nothing initiates inward except from the jump host. Changes to controllers follow change control."
            ),
            part(
              "Guest network",
              "Puts guest Wi-Fi on its own VLAN/subnet with client isolation, internet-only access (no route to any internal zone), a captive portal/acceptable-use page, bandwidth limits and its own DHCP/DNS.",
              "Guest SSID -> guest VLAN with its own subnet, DHCP and DNS; firewall policy: guest -> internet only, deny all RFC 1918 destinations; wireless client isolation so guests cannot see each other; captive portal with terms; rate limiting so visitors cannot starve clinical Wi-Fi."
            ),
            part(
              "BYOD",
              "Onboards personal phones through NAC/802.1X (or a dedicated BYOD SSID with device registration/MDM posture check) into a BYOD VLAN that can reach only the secure-messaging service (and internet), not the EHR or clinical VLANs; data stays in the managed app.",
              "BYOD SSID with 802.1X (user credentials, device registered through the mobile-device-management enrolment) landing in a BYOD VLAN. Firewall: BYOD -> the secure-messaging servers on their ports, and internet; everything else denied. The MDM enforces screen lock and app-level encryption, and devices that fail the posture check are placed in a remediation VLAN."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Network Troubleshooting (24%) -- 3 labs
    // -----------------------------------------------------------------------
    {
      slug: "methodology-one-user-cannot-reach-server",
      objective: "Applying a consistent troubleshooting methodology from problem identification through documentation",
      kind: "case",
      title: "Work one user's file-server outage through the methodology",
      brief:
        "You are the network technician at Pinecrest Accounting. At 09:10 Marta in Accounts Payable reports she cannot open the shared drive on the file server FS01 (10.20.30.15). Her colleagues at the next desks can. Her PC is wired, on the Accounting VLAN 10.20.5.0/24, whose gateway is 10.20.5.1. Nothing on the network has changed overnight according to the change calendar. Use CompTIA's troubleshooting methodology: identify the problem, establish a theory of probable cause, test the theory, plan and implement, verify full functionality, document.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "You sit down with Marta. Before touching anything, you have a few minutes to gather information and decide what to check first.",
          ask: "What do you ask and gather to identify the problem, and what would you check on her PC first?",
          parts: [
            part(
              "Identify the problem",
              "Gathers information: questions the user (what exactly fails, since when, error text, what changed on her side), identifies symptoms and scope (one user, wired, neighbours fine), tries to duplicate the problem, and treats it as a single problem rather than assuming a server fault.",
              "Ask Marta: what does 'cannot open' look like (error message), when did it last work, did anything change on her PC (updates, a setting she changed), does anything else fail (web, email). Confirm scope: her neighbours on the same VLAN can reach FS01, so the server and the VLAN's routing are probably fine; this is likely local to her PC or port. Try to reproduce: open \\\\FS01 and ping it from her PC."
            ),
            part(
              "First checks",
              "Checks the PC's IP configuration (address, mask, gateway, DNS) and connectivity in order: link light, ip addr / ipconfig, ping the gateway, ping FS01 by IP then by name -- bottom-up or divide-and-conquer, stated as such.",
              "Check the link light, then the configuration: ip addr (or ipconfig /all) for address, mask, gateway and DNS; ip route for the default route. Then ping 10.20.5.1 (gateway) and ping 10.20.30.15 (FS01 by address), then by name to separate DNS from reachability. That is a bottom-up/divide-and-conquer approach: find the lowest layer that fails."
            ),
          ],
        },
        {
          text:
            "Marta mentions that last week the printer mapping kept breaking, so a friend set her PC to a fixed address 'so it stops changing'. Your checks show:\n\n$ ip -4 addr show eth0\n    inet 10.20.5.37/16 brd 10.20.255.255 scope global eth0\n\n$ ip route\ndefault via 10.20.5.1 dev eth0\n10.20.0.0/16 dev eth0 proto kernel scope link src 10.20.5.37\n\n$ ping -c 3 10.20.5.1\n3 packets transmitted, 3 received, 0% packet loss\n\n$ ping -c 3 10.20.30.15\nFrom 10.20.5.37 icmp_seq=1 Destination Host Unreachable\nFrom 10.20.5.37 icmp_seq=2 Destination Host Unreachable\nFrom 10.20.5.37 icmp_seq=3 Destination Host Unreachable\n\n$ ip neigh show 10.20.30.15\n10.20.30.15 dev eth0 FAILED",
          ask: "State your theory of probable cause from this output and how you will test it.",
          parts: [
            part(
              "Theory of probable cause",
              "Identifies the wrong subnet mask: the PC has /16 (255.255.0.0) instead of the VLAN's /24, so it believes 10.20.30.15 is on its own subnet, ARPs for it directly (the FAILED neighbour entry and 'Destination Host Unreachable' from its own address) instead of sending to the gateway; the gateway ping works because .1 is local under either mask.",
              "The static configuration used mask /16 instead of /24. Under /16 the PC thinks the whole of 10.20.0.0/16 -- including FS01 at 10.20.30.15 -- is on its local segment, so it ARPs for FS01 instead of sending the packet to 10.20.5.1. No one on the Accounting VLAN answers that ARP (ip neigh shows FAILED), hence 'Destination Host Unreachable' from 10.20.5.37 itself. Pinging the gateway works because 10.20.5.1 is on the local wire under either mask. The question-the-obvious clue was 'what changed': the static address."
            ),
            part(
              "Testing the theory",
              "Proposes a reversible test: temporarily set the mask to /24 (or switch back to DHCP) and ping FS01 again; or ping another host outside 10.20.5.0/24 to confirm everything off-subnet fails the same way; if the test fails, re-establish a new theory or escalate.",
              "Test without committing: ip addr add 10.20.5.37/24 dev eth0, then ip addr del 10.20.5.37/16 dev eth0 -- in that order, because deleting the /16 first removes the default route with it (or set the adapter back to DHCP) and ping 10.20.30.15 again. A reply confirms the theory. A cross-check: ping any other off-subnet host (e.g. the DNS server) -- under /16 it should fail the same way. If FS01 still does not answer after the fix, the theory is wrong: look at the switch port's VLAN or escalate."
            ),
          ],
        },
        {
          text: "With the mask corrected to /24, ping 10.20.30.15 gets replies and the shared drive opens. Marta asks whether her printer mapping will break again.",
          ask: "Write the plan of action you implement, how you verify full functionality, and what you document.",
          parts: [
            part(
              "Plan and implementation",
              "Returns the PC to DHCP (the supported configuration) rather than leaving a hand-typed static address, and addresses the original printer complaint properly (for example a DHCP reservation for the printer or mapping the printer by hostname) so the workaround is not reinvented.",
              "Set the adapter back to DHCP so it gets the correct /24 and options automatically; identify the potential effects (brief renewal, nothing else). For the printer problem that started this, give the printer a DHCP reservation (or map it by DNS name) so its address stops changing, and explain to Marta why fixed addresses on PCs are set by IT only."
            ),
            part(
              "Verification and prevention",
              "Verifies full system functionality: shared drive, printing, web and email, DNS lookups by name, not just the one ping; and implements a preventive measure such as DHCP snooping/IP source guard or a desktop policy preventing users from changing adapter settings.",
              "Verify end to end: open the shared drive and a file, print a test page, browse an intranet site, nslookup FS01 -- the whole workflow, not only ping. Preventive: restrict adapter settings to administrators by policy, and consider DHCP snooping with IP source guard on access ports so a hand-set address cannot pass traffic."
            ),
            part(
              "Documentation",
              "Records in the ticket the symptom, scope, root cause (static /16 mask set by a non-IT person), the fix, verification, the preventive change and the time; notes lessons learned for the knowledge base.",
              "Ticket: 'One user unable to reach FS01 and all off-subnet hosts; neighbours unaffected. Cause: PC manually configured 10.20.5.37/16 (should be /24 via DHCP), set to work around a printer address change. Fix: adapter returned to DHCP; printer given a reservation. Verified file share, print, web, DNS at 09:40. Preventive: adapter settings locked by policy; DHCP snooping proposed.' Add a knowledge-base note: 'Destination Host Unreachable from own address plus a FAILED neighbour entry = wrong mask or VLAN'."
            ),
          ],
        },
      ],
    },
    {
      slug: "dhcp-pool-exhaustion-branch",
      objective: "Diagnosing network service issues: switching, routing, and address pool exhaustion",
      kind: "case",
      title: "Diagnose why half a branch has no network on Monday morning",
      brief:
        "You support the Elm Street branch of Granite Peak Insurance. The branch LAN is 192.168.50.0/24 with the router at .1, a DHCP scope served by the branch server, and about 180 staff laptops. On Monday at 08:30 the help desk logs a dozen tickets: some laptops 'have no internet', others are fine. Wi-Fi shows connected. Over the weekend the branch hosted a two-day vendor training with about 90 visitors who were given the corporate Wi-Fi password 'to make things easier'.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text:
            "An affected laptop shows:\n\nC:\\> ipconfig\nWireless LAN adapter Wi-Fi:\n   Connection-specific DNS Suffix  . :\n   Autoconfiguration IPv4 Address. . : 169.254.117.42\n   Subnet Mask . . . . . . . . . . . : 255.255.0.0\n   Default Gateway . . . . . . . . . :\n\nA working laptop next to it has 192.168.50.173, mask 255.255.255.0, gateway 192.168.50.1.",
          ask: "What does the affected laptop's configuration tell you, what service is implicated, and what will you look at next?",
          parts: [
            part(
              "Reading the symptom",
              "Recognises 169.254.x.x as an APIPA/link-local self-assigned address with no gateway, meaning the client got no DHCP lease -- a DHCP service problem, not a Wi-Fi association or routing problem (the working neighbour has a valid lease and gateway).",
              "169.254.117.42 with no default gateway is an APIPA (link-local) address: the laptop associated to Wi-Fi fine but no DHCP server answered its DISCOVER, so it made up an address and cannot reach anything beyond the local segment. Wi-Fi and routing are not the fault -- the neighbour with 192.168.50.173 proves the path works for anyone who has a lease. The DHCP service is the suspect."
            ),
            part(
              "Next checks",
              "Checks the DHCP server: service running, scope statistics (addresses in use vs. available, leases), lease duration, and the lease table for unfamiliar devices; also tries ipconfig /release and /renew on the client to see whether a lease is offered now.",
              "On the branch DHCP server: is the service running; what does the scope 192.168.50.0 show for addresses in use versus free; how long is the lease; who holds the leases (look for 90 unfamiliar hostnames from the weekend). On the laptop: ipconfig /release then /renew to see whether an offer arrives at all. Also check the server's event log for 'scope full' messages."
            ),
          ],
        },
        {
          text:
            "On the DHCP server:\n\nScope 192.168.50.0 (Elm Street staff)\n  Address pool:      192.168.50.50 - 192.168.50.250\n  Lease duration:    8 days\n  Addresses in use:  201 (100%)\n  Addresses free:    0\n  Leases: 112 corporate laptops, 89 hostnames such as 'Galaxy-S24', 'iPhone', 'DESKTOP-7Q2M', all first seen Sat 08:40-Sun 16:10.\n\nEvent log: 'Scope 192.168.50.0 is 100% full' repeating since Sun 11:52.",
          ask: "State the root cause and what you do right now to get staff working.",
          parts: [
            part(
              "Root cause",
              "States address pool exhaustion: the pool is 201 addresses (.50-.250); 89 visitor devices took leases over the weekend and the 8-day lease means they are still held on Monday, leaving nothing for staff laptops arriving; 112 + 89 = 201.",
              "The scope is exhausted. The pool 192.168.50.50-192.168.50.250 holds 201 addresses. Weekend visitors on the corporate SSID took 89 leases, and with an 8-day lease those addresses stay reserved for devices that have gone home. 112 staff + 89 visitors = 201 = every address, so each laptop that powered on this morning got no offer and fell back to APIPA."
            ),
            part(
              "Immediate fix",
              "Frees addresses now: deletes the visitors' leases (and/or shortens the lease time so they age out), optionally widens the pool temporarily (.21-.250 or so, avoiding statics), then has affected clients renew; confirms with scope statistics.",
              "Delete the 89 visitor leases from the scope (they are identifiable by hostname and first-seen time), and shorten the lease duration to 8 hours so stale leases expire the same day. If more headroom is needed immediately, extend the pool down toward the static range (for example .21-.250, if .21-.49 are unused), avoiding any static addresses. Have staff run ipconfig /renew (or toggle Wi-Fi) and watch the scope's in-use count come back under 100%."
            ),
          ],
        },
        {
          text: "By 09:15 every staff laptop has a lease. The branch manager asks how to stop this happening at the next event.",
          ask: "What do you change so a crowd of visitors can never exhaust the staff pool again, and how do you verify it?",
          parts: [
            part(
              "Preventive changes",
              "Separates visitors onto a guest SSID/VLAN with its own scope (and internet-only access), stops sharing the corporate Wi-Fi password (or moves staff to 802.1X), keeps a short lease on the staff scope, and sizes/monitors the pool (alert at e.g. 80% utilisation); may also consider a /23 or a second scope if staff count grows.",
              "Create a guest SSID on its own VLAN and subnet with its own DHCP scope and internet-only firewall policy, and rotate the corporate pre-shared key (better: move staff Wi-Fi to 802.1X so there is no shared password to hand out). Keep the staff lease at 8 hours. Add monitoring on the scope with an alert at 80% in use. If staff headcount is heading past 180, plan a /23 for the staff VLAN rather than squeezing the pool."
            ),
            part(
              "Verification and documentation",
              "Verifies by joining a test device to the guest SSID (gets a guest-range address, internet only, cannot reach 192.168.50.0/24) and checking the staff scope utilisation after the change; documents cause, fix and the new policy for events.",
              "Join a phone to the new guest SSID: it should receive a guest-subnet address, browse the internet and fail to ping 192.168.50.1. Check the staff scope shows well under 80% with leases only from corporate hostnames. Document: 'Monday outage caused by DHCP scope exhaustion after 89 visitor devices used the corporate SSID over an 8-day lease; fixed by lease cleanup and 8-hour lease; guest SSID and 80% alert added; events must use the guest network.'"
            ),
          ],
        },
      ],
    },
    {
      slug: "voip-quality-afternoon-wan-congestion",
      objective: "Diagnosing performance issues: congestion, latency, packet loss, and wireless interference",
      kind: "case",
      title: "Find why calls break up every afternoon",
      brief:
        "Bluewater Marine Supply's branch connects to head office and its hosted phone system over a 100 Mbps WAN link. Staff report that between about 14:00 and 16:00 calls sound robotic and drop words; mornings are fine. Phones are wired on a voice VLAN; the hosted PBX's SIP server is 198.51.100.20. You have a laptop on the branch LAN and access to the branch router's interface statistics and NetFlow collector.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text:
            "At 14:40 you run tests from the branch LAN:\n\n$ ping -c 20 10.20.5.1\n20 packets transmitted, 20 received, 0% packet loss\nrtt min/avg/max/mdev = 0.3/0.4/0.9/0.1 ms\n\n$ ping -c 20 198.51.100.20\n20 packets transmitted, 18 received, 10% packet loss, time 19031ms\nrtt min/avg/max/mdev = 4.1/96.7/212.4/71.3 ms\n\n$ traceroute -n 198.51.100.20\n 1  10.20.5.1      0.4 ms   0.3 ms   0.4 ms\n 2  10.20.0.1      1.1 ms   1.0 ms   1.2 ms     (branch WAN router, LAN side)\n 3  203.0.113.1  187.2 ms 164.9 ms 201.3 ms     (provider edge, far end of our WAN link)\n 4  198.51.100.1 189.0 ms 171.4 ms 203.8 ms\n 5  198.51.100.20 190.1 ms 170.2 ms 205.6 ms\n\nThe same ping and traceroute at 08:30 showed 0% loss and 4-6 ms at every hop beyond the router.",
          ask: "Where in the path is the problem, what kind of performance problem is it, and why do you rule out the LAN and Wi-Fi?",
          parts: [
            part(
              "Locating the problem",
              "Places the fault on the WAN link between hop 2 (branch WAN router) and hop 3 (provider edge): latency jumps from about 1 ms to about 190 ms there and stays, and loss appears only on paths that cross it; the LAN is clean (0 ms-range, 0% loss to the gateway) and the phones are wired, so wireless interference is not a factor.",
              "Hops 1 and 2 are fast and lossless, so the LAN and the router's inside interface are fine. The jump to roughly 190 ms happens at hop 3, the far end of our WAN circuit, and every hop after inherits it -- the delay is being added on our WAN link, not at head office or the provider's core. The 10% loss to the PBX and not to the gateway points the same way. The phones are wired on the voice VLAN, so Wi-Fi interference is not in play."
            ),
            part(
              "Kind of problem",
              "Identifies congestion (queueing on a saturated link) rather than a physical fault: high, variable latency (mdev 71 ms = jitter) plus loss that appears only at busy hours; voice is especially sensitive to jitter and loss.",
              "This is congestion: the 100 Mbps link is filling in the afternoon, packets queue (latency up to 212 ms, jitter of about 71 ms) and the queue overflows (10% loss). A cable or interface fault would show errors all day, not only 14:00-16:00. Voice falls apart first because RTP needs steady low jitter and tolerates little loss, and the audio turns robotic when packets arrive late or not at all."
            ),
          ],
        },
        {
          text:
            "The WAN router's interface shows the outbound side at 97-99% utilisation from 14:00 to 16:05 with output drops climbing, and almost no input errors or CRCs. NetFlow for 14:00-16:00 lists the top conversation as 10.20.30.40 (the branch file server) -> 10.100.8.12 (head-office backup target) on TCP 443, 71 GB; the backup team confirms the daily offsite job was moved to 14:00 last month.",
          ask: "What do you do about it, both immediately and properly?",
          parts: [
            part(
              "Immediate action",
              "Stops the saturation now: reschedules or rate-limits the backup job (move to overnight or cap its bandwidth), and confirms the change with the backup team rather than just killing it.",
              "Ask the backup team to move the offsite job back to the overnight window (or pause today's run) and, if it must run in the day, cap its throughput so it cannot fill the link. Confirm with interface utilisation dropping below saturation and a ping to 198.51.100.20 returning to single-digit milliseconds with no loss."
            ),
            part(
              "Proper fix",
              "Implements QoS: classify and mark voice (DSCP EF for RTP, CS3/AF31 for SIP signalling) at the phones/voice VLAN, trust the marking at the router, and give voice a strict-priority (low-latency) queue on the WAN interface with bandwidth policed/guaranteed for it, so bulk traffic cannot starve it; considers more WAN bandwidth or traffic shaping to the circuit rate if the link is undersized.",
              "Configure QoS end to end: mark voice media EF (DSCP 46) and SIP signalling CS3 on the voice VLAN, trust those markings on the router, and apply an outbound policy on the WAN interface with a low-latency (priority) queue for EF sized for the number of concurrent calls, a guaranteed class for signalling, and the backup/bulk class best-effort or shaped. Shape to the circuit's real rate so the queue lives on our router, where the policy applies, not on the provider's. Also forecast whether 100 Mbps is still enough for the branch and plan an upgrade if afternoon demand is legitimate."
            ),
          ],
        },
        {
          text: "The following afternoon the backup runs overnight and QoS is in place. The branch manager wants proof it is fixed and a way to know before users complain next time.",
          ask: "How do you verify and what do you put in place to catch it early?",
          parts: [
            part(
              "Verification",
              "Repeats the same tests at the same time window (ping/traceroute to the PBX showing low, steady latency and 0% loss), checks interface utilisation and output drops, and confirms with users or the PBX's call-quality metrics (MOS/jitter reports) that calls are clear even while a bulk transfer is forced through.",
              "At 14:30: ping -c 100 198.51.100.20 -> 0% loss, ~5 ms average, mdev under a few ms; traceroute with no jump at hop 3; interface output drops no longer climbing. Then deliberately start a large transfer and repeat the ping -- with QoS the voice class should stay clean while the bulk traffic takes the hit. Check the PBX's call-quality report (jitter, loss, MOS) for the afternoon's calls."
            ),
            part(
              "Early warning",
              "Sets monitoring: SNMP utilisation and output-drop thresholds on the WAN interface (alert at e.g. 80% for 5 minutes), ongoing flow data to spot new top talkers, and a baseline so afternoon changes stand out; documents the incident and the QoS policy.",
              "Alert from the NMS when WAN output utilisation exceeds 80% for five minutes or output drops increase, and keep NetFlow so the next unexpected top talker is visible in a minute. Record the baseline (morning and afternoon utilisation, normal RTT to the PBX) to compare against. Document: 'Afternoon voice quality loss caused by WAN congestion from a rescheduled 71 GB backup; fixed by moving the job overnight and adding a priority queue for EF-marked voice; alerts added at 80% utilisation.'"
            ),
          ],
        },
      ],
    },
  ],
};
